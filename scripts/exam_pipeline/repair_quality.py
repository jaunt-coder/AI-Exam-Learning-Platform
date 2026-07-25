"""Repair queue, layer analysis, and regression metrics for parser quality."""
from __future__ import annotations

import json
import re
from collections import Counter
from dataclasses import asdict, dataclass, field
from datetime import date
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any

from .constants import ACC_END, ACC_START, CACHE_DIR, CHOICE_SYMBOLS
from .question_parser import (
    find_first_choice_index,
    parse_accounting_questions,
    prepare_exam_text,
    strip_question_prefix,
)
from .source_loader import load_exam_document
from .source_truth import (
    QuestionRepairDiff,
    RepairIssue,
    clean_source_body,
    compare_question_to_source,
    db_question_text,
    extract_numbers,
    extract_units,
    load_year_raw_slices,
    longest_glued_hangul,
    normalize_compare,
    stem_coverage,
)
from .text_postprocess import remove_footer_noise

MVP_YEARS = [2015, 2017, 2018, 2020, 2024, 2025]
EXPECTED_TOTAL = 240
REPAIR_COVERAGE_THRESHOLD = 0.95

MERGED_W_CHOICE = re.compile(r"^W[\d,]+\s+W[\d,]+$", re.I)
GRID_HEADER_IN_STEM = re.compile(
    r"\?\s*(?:년\s+)?(?:20[×xX]\d{1,2}\s*년\s*){1,4}20[×xX]\d{1,2}"
)
EMPTY_PAREN = re.compile(r"\(\s*\)")


@dataclass
class LayerSnapshot:
    layer: str
    label: str
    text: str
    char_count: int


@dataclass
class LayerAnalysis:
    question_id: str
    layers: list[LayerSnapshot] = field(default_factory=list)
    issue_codes: list[str] = field(default_factory=list)
    failure_layer: str | None = None
    source_fidelity: float = 0.0
    stem_coverage: float = 0.0


@dataclass
class RegressionMetrics:
    stem_truncated: int = 0
    missing_numbers: int = 0
    missing_units: int = 0
    choice_split: int = 0
    duplicate_context: int = 0
    table_parse: int = 0
    ocr_glued_hangul: int = 0
    source_fidelity_avg: float = 0.0
    source_fidelity_below_99: int = 0
    repair_queue_size: int = 0
    issue_counts: dict[str, int] = field(default_factory=dict)


def source_fidelity(db_question: dict, raw_body: str) -> float:
    """Weighted recall: numbers, units, and stem similarity (no AI inference)."""
    source_clean = clean_source_body(raw_body, 0)
    db_text = db_question_text(db_question)

    source_nums = extract_numbers(source_clean)
    db_nums = extract_numbers(db_text)
    num_recall = len(source_nums & db_nums) / len(source_nums) if source_nums else 1.0

    source_units = extract_units(source_clean)
    db_units = extract_units(db_text)
    unit_recall = len(source_units & db_units) / len(source_units) if source_units else 1.0

    stem_source = source_clean.split("①")[0] if "①" in source_clean else source_clean
    stem_db = db_question.get("question") or ""
    char_sim = SequenceMatcher(
        None, normalize_compare(stem_source), normalize_compare(stem_db)
    ).ratio()

    choice_source = source_clean[source_clean.find("①") :] if "①" in source_clean else ""
    choice_db = " ".join(db_question.get("choices") or [])
    choice_sim = (
        SequenceMatcher(None, normalize_compare(choice_source), normalize_compare(choice_db)).ratio()
        if choice_source and choice_db
        else 1.0
    )

    return 0.45 * num_recall + 0.15 * unit_recall + 0.25 * char_sim + 0.15 * choice_sim


def has_duplicate_context(question: dict) -> bool:
    """Browser would show overlapping stem + context (see getContextText rules)."""
    stem = (question.get("question") or "").strip()
    original = (question.get("originalQuestion") or "").strip()
    if not stem or not original:
        return False
    if stem == original:
        return False
    table = (question.get("table") or "").strip()
    if table:
        original_no_table = original.replace(table, "").strip()
        if normalize_compare(original_no_table) == normalize_compare(stem):
            return False
    if question.get("hasTable") and normalize_compare(stem) == normalize_compare(original):
        return True
    ctx = original.replace(stem, "", 1).strip()
    if table:
        ctx = ctx.replace(table, "").strip()
    if len(ctx) < 20:
        return False
    ctx_norm = normalize_compare(ctx)
    stem_norm = normalize_compare(stem)
    if stem_norm in ctx_norm or ctx_norm in stem_norm:
        return True
    return SequenceMatcher(None, stem_norm, ctx_norm).ratio() > 0.65


def has_choice_split_issue(question: dict, source_marker_count: int) -> bool:
    choices = question.get("choices") or []
    if len(choices) != 5:
        return True
    if source_marker_count < 5:
        return True
    for choice in choices:
        text = str(choice).strip()
        if MERGED_W_CHOICE.match(text):
            return True
        if len(text) < 2:
            return True
    return False


def has_table_parse_issue(question: dict) -> bool:
    if not question.get("hasTable"):
        return False
    table = (question.get("table") or "").strip()
    if not table:
        return True
    lines = [line.strip() for line in table.splitlines() if line.strip()]
    has_md = "| ---" in table or "|---" in table.replace(" ", "")
    has_grid = len(lines) >= 2 and any("\t" in line or "  " in line for line in lines)
    return not has_md and not has_grid


def classify_extended_issues(
    db_question: dict,
    source,
    diff: QuestionRepairDiff,
) -> list[RepairIssue]:
    issues = list(diff.issues)
    codes = {issue.code for issue in issues}

    if diff.missing_numbers and "missing_numbers" not in codes:
        issues.append(
            RepairIssue(
                "missing_numbers",
                "critical" if diff.missing_numbers else "warning",
                f"원본 숫자 {len(diff.missing_numbers)}개 DB 미포함",
            )
        )

    if diff.stem_coverage < REPAIR_COVERAGE_THRESHOLD and "stem_truncated" not in codes:
        issues.append(
            RepairIssue(
                "stem_truncated",
                "critical",
                f"stem coverage {diff.stem_coverage:.0%} (<{REPAIR_COVERAGE_THRESHOLD:.0%})",
            )
        )

    if has_choice_split_issue(db_question, source.choice_marker_count):
        issues.append(RepairIssue("choice_split", "critical", "보기 분리/병합 오류"))

    if has_duplicate_context(db_question):
        issues.append(RepairIssue("duplicate_context", "critical", "stem/context 중복"))

    if has_table_parse_issue(db_question) and not any(
        i.code in {"table_empty", "table_markdown"} for i in issues
    ):
        issues.append(RepairIssue("table_parse", "critical", "표 구조 파싱 실패"))

    stem = db_question.get("question") or ""
    if EMPTY_PAREN.search(stem):
        issues.append(RepairIssue("number_missing", "critical", "stem 빈 괄호 ()"))

    if GRID_HEADER_IN_STEM.search(stem):
        issues.append(RepairIssue("choice_split", "warning", "stem에 보기 그리드 헤더 유입"))

    fidelity = source_fidelity(db_question, source.raw_body)
    if fidelity < 0.99:
        issues.append(
            RepairIssue(
                "source_fidelity",
                "critical" if fidelity < REPAIR_COVERAGE_THRESHOLD else "warning",
                f"source fidelity {fidelity:.1%}",
            )
        )

    return issues


def parser_raw_text(year: int, question_number: int, cache_dir: Path | None = None) -> str:
    cache = cache_dir or CACHE_DIR
    doc = load_exam_document(year, cache)
    parsed_list = parse_accounting_questions(doc.text, doc.pages)
    parsed = next(item for item in parsed_list if item.question_number == question_number)
    parts = [parsed.question, parsed.original_question, "\n".join(parsed.choices)]
    if parsed.table_markdown:
        parts.append(parsed.table_markdown)
    return "\n---\n".join(part for part in parts if part)


def browser_render_text(db_question: dict) -> str:
    """Lightweight L4 simulation (spacing cleanup only, no overrides)."""
    try:
        import display_cleanup_py as display  # type: ignore

        cleaned = display.clean_question_for_display(db_question)
    except Exception:
        cleaned = db_question

    stem = cleaned.get("question") or ""
    original = cleaned.get("originalQuestion") or ""
    table = cleaned.get("table") or ""
    ctx = ""
    if original and original != stem:
        ctx = original.replace(stem, "").replace(table, "").strip()
    parts = [
        "[stem]",
        stem,
        "[context]",
        ctx or "(hidden)",
        "[table]",
        table or "(none)",
        "[choices]",
        "\n".join(f"{i + 1}. {c}" for i, c in enumerate(cleaned.get("choices") or [])),
    ]
    return "\n".join(parts)


def analyze_layers(db_question: dict, source, year: int) -> LayerAnalysis:
    diff = compare_question_to_source(db_question, source)
    issues = classify_extended_issues(db_question, source, diff)
    issue_codes = sorted({issue.code for issue in issues})

    l1 = clean_source_body(
        source.raw_body.split("①")[0] if "①" in source.raw_body else source.raw_body,
        source.question_number,
    )
    l2 = parser_raw_text(year, source.question_number)
    l3 = "\n".join(
        part
        for part in [
            db_question.get("question") or "",
            db_question.get("originalQuestion") or "",
            " | ".join(db_question.get("choices") or []),
            db_question.get("table") or "",
        ]
        if part
    )
    l4 = browser_render_text(db_question)

    fidelity = source_fidelity(db_question, source.raw_body)
    coverage = stem_coverage(db_question, source.raw_body)

    failure_layer = None
    if issue_codes:
        parser_norm = normalize_compare(l2)
        db_norm = normalize_compare(l3)
        if SequenceMatcher(None, normalize_compare(l1), parser_norm).ratio() < 0.9:
            failure_layer = "L1→L2 Parser"
        elif parser_norm != db_norm:
            failure_layer = "L2→L3 Builder"
        elif normalize_compare(l3) != normalize_compare(l4):
            failure_layer = "L3→L4 Browser"
        else:
            failure_layer = "L3 JSON"

    return LayerAnalysis(
        question_id=db_question["questionId"],
        layers=[
            LayerSnapshot("L1", "Source PDF/HWP", l1, len(l1)),
            LayerSnapshot("L2", "Parser Raw", l2, len(l2)),
            LayerSnapshot("L3", "question-db-mvp.json", l3, len(l3)),
            LayerSnapshot("L4", "Browser Rendering", l4, len(l4)),
        ],
        issue_codes=issue_codes,
        failure_layer=failure_layer,
        source_fidelity=round(fidelity, 4),
        stem_coverage=round(coverage, 4),
    )


def is_repair_candidate(
    db_question: dict,
    source,
    diff: QuestionRepairDiff | None = None,
) -> bool:
    diff = diff or compare_question_to_source(db_question, source)
    coverage = stem_coverage(db_question, source.raw_body)

    if coverage < REPAIR_COVERAGE_THRESHOLD:
        return True
    if diff.missing_numbers:
        return True
    if diff.missing_units:
        return True
    if has_choice_split_issue(db_question, source.choice_marker_count):
        return True
    if has_duplicate_context(db_question):
        return True
    if has_table_parse_issue(db_question):
        return True
    if EMPTY_PAREN.search(db_question.get("question") or ""):
        return True
    if source_fidelity(db_question, source.raw_body) < 0.99:
        return True
    return False


def build_repair_queue(questions: list[dict], cache_dir: Path | None = None) -> list[dict]:
    by_key = {(q["year"], q["source"]["questionNumber"]): q for q in questions}
    queue: list[dict] = []

    for year in MVP_YEARS:
        slices = load_year_raw_slices(year, cache_dir)
        for number, source in slices.items():
            db_q = by_key.get((year, number))
            if not db_q:
                continue
            diff = compare_question_to_source(db_q, source)
            if not is_repair_candidate(db_q, source, diff):
                continue
            analysis = analyze_layers(db_q, source, year)
            queue.append(
                {
                    "questionId": db_q["questionId"],
                    "year": year,
                    "questionNumber": number,
                    "sourcePage": source.page,
                    "sourceFile": source.source_file,
                    "stemCoverage": analysis.stem_coverage,
                    "sourceFidelity": analysis.source_fidelity,
                    "issueCodes": analysis.issue_codes,
                    "failureLayer": analysis.failure_layer,
                    "missingNumbers": diff.missing_numbers[:10],
                    "missingUnits": diff.missing_units[:10],
                }
            )

    queue.sort(key=lambda item: (item["sourceFidelity"], item["stemCoverage"]))
    return queue


def compute_regression_metrics(questions: list[dict], cache_dir: Path | None = None) -> RegressionMetrics:
    by_key = {(q["year"], q["source"]["questionNumber"]): q for q in questions}
    metrics = RegressionMetrics()
    fidelity_scores: list[float] = []
    issue_counter: Counter = Counter()

    for year in MVP_YEARS:
        slices = load_year_raw_slices(year, cache_dir)
        for number, source in slices.items():
            db_q = by_key.get((year, number))
            if not db_q:
                continue
            diff = compare_question_to_source(db_q, source)
            issues = classify_extended_issues(db_q, source, diff)
            codes = {issue.code for issue in issues}
            for code in codes:
                issue_counter[code] += 1

            if diff.stem_coverage < REPAIR_COVERAGE_THRESHOLD:
                metrics.stem_truncated += 1
            elif "stem_truncated" in codes:
                metrics.stem_truncated += 1
            if diff.missing_numbers:
                metrics.missing_numbers += 1
            if diff.missing_units:
                metrics.missing_units += 1
            if "choice_split" in codes:
                metrics.choice_split += 1
            if "duplicate_context" in codes:
                metrics.duplicate_context += 1
            if "table_parse" in codes or "table_empty" in codes or "table_markdown" in codes:
                metrics.table_parse += 1
            if "ocr_glued_hangul" in codes:
                metrics.ocr_glued_hangul += 1

            fidelity = source_fidelity(db_q, source.raw_body)
            fidelity_scores.append(fidelity)
            if fidelity < 0.99:
                metrics.source_fidelity_below_99 += 1

            if is_repair_candidate(db_q, source, diff):
                metrics.repair_queue_size += 1

    metrics.source_fidelity_avg = (
        sum(fidelity_scores) / len(fidelity_scores) if fidelity_scores else 0.0
    )
    metrics.issue_counts = dict(issue_counter)
    return metrics


def metrics_to_dict(metrics: RegressionMetrics) -> dict[str, Any]:
    return asdict(metrics)


def write_repair_queue(path: Path, queue: list[dict], summary: dict | None = None) -> None:
    payload = {
        "generatedAt": date.today().isoformat(),
        "threshold": REPAIR_COVERAGE_THRESHOLD,
        "count": len(queue),
        "summary": summary or {},
        "questions": queue,
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def write_layer_reports(queue: list[dict], questions_by_id: dict[str, dict], out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    for item in queue:
        qid = item["questionId"]
        db_q = questions_by_id[qid]
        source = load_year_raw_slices(item["year"])[item["questionNumber"]]
        analysis = analyze_layers(db_q, source, item["year"])
        lines = [
            f"# Layer Analysis — {qid}",
            "",
            f"- failure_layer: {analysis.failure_layer}",
            f"- source_fidelity: {analysis.source_fidelity:.1%}",
            f"- stem_coverage: {analysis.stem_coverage:.1%}",
            f"- issues: {', '.join(analysis.issue_codes) or '(none)'}",
            "",
        ]
        for layer in analysis.layers:
            lines.extend(
                [
                    f"## {layer.layer} — {layer.label} ({layer.char_count} chars)",
                    "",
                    layer.text[:4000],
                    "",
                ]
            )
        (out_dir / f"{qid}.md").write_text("\n".join(lines), encoding="utf-8")


def write_regression_report(
    path: Path,
    before: RegressionMetrics,
    after: RegressionMetrics,
) -> None:
    def row(name: str, b: int | float, a: int | float) -> str:
        if isinstance(b, float):
            delta = a - b
            sign = "+" if delta >= 0 else ""
            return f"| {name} | {b:.2%} | {a:.2%} | {sign}{delta:.2%} |"
        delta = int(a) - int(b)
        sign = "+" if delta >= 0 else ""
        return f"| {name} | {b} | {a} | {sign}{delta} |"

    lines = [
        "# Parser Quality Regression Report",
        "",
        f"- 생성일: {date.today().isoformat()}",
        "- 기준: `source/original-exams/` (AI 추론 금지)",
        "",
        "## Before → After",
        "",
        "| Metric | Before | After | Delta |",
        "|--------|--------|-------|-------|",
        row("stem_truncated", before.stem_truncated, after.stem_truncated),
        row("missing_numbers", before.missing_numbers, after.missing_numbers),
        row("missing_units", before.missing_units, after.missing_units),
        row("choice_split", before.choice_split, after.choice_split),
        row("duplicate_context", before.duplicate_context, after.duplicate_context),
        row("table_parse", before.table_parse, after.table_parse),
        row("ocr_glued_hangul", before.ocr_glued_hangul, after.ocr_glued_hangul),
        row("Source Fidelity (avg)", before.source_fidelity_avg, after.source_fidelity_avg),
        row("repair_queue_size", before.repair_queue_size, after.repair_queue_size),
        "",
        "## Target Gate",
        "",
        "| Gate | Target | After |",
        "|------|--------|-------|",
        f"| missing_numbers | 0 | {after.missing_numbers} |",
        f"| missing_units | 0 | {after.missing_units} |",
        f"| duplicate_context | 0 | {after.duplicate_context} |",
        f"| choice_split | 0 | {after.choice_split} |",
        f"| stem_truncated | 0 | {after.stem_truncated} |",
        f"| Source Fidelity ≥99% | 240/240 | {EXPECTED_TOTAL - after.source_fidelity_below_99}/{EXPECTED_TOTAL} |",
        "",
    ]
    path.write_text("\n".join(lines), encoding="utf-8")
