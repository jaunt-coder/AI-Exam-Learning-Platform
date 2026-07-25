"""Regression metrics (8 indicators) for parser quality.

All metrics compare a parsed question record against its source-truth slice.
No AI inference, no per-question logic. Every metric is deterministic.

Indicators:
    stem_coverage        recall of source stem text captured in db.question
    choice_coverage      recall of source choice text captured in db.choices
    table_fidelity       structural integrity of tables (expected -> well-formed)
    number_fidelity      recall of source numbers present in the record
    unit_fidelity        recall of source units (currency/percent/date)
    source_fidelity      weighted composite recall (numbers/units/stem/choices)
    duplicate            stem/context duplication flag
    completeness         stem + 5 choices + non-empty choices + answer present
"""
from __future__ import annotations

from dataclasses import dataclass, field
from difflib import SequenceMatcher

from .tokens import (
    choice_marker_count,
    extract_numbers,
    extract_units,
    normalize_compare,
    split_stem_and_choices,
)

TABLE_KEYWORDS = (
    "일자", "적요", "수량", "단가", "구분", "기간", "액면가치", "시장이자율",
    "상환가치", "연금현재가치", "차변", "대변", "단일금액", "정상연금",
)

STEM_COVERAGE_TARGET = 0.95
SOURCE_FIDELITY_TARGET = 0.99


def _recall(source_norm: str, db_norm: str) -> float:
    """Fraction of source characters recovered as contiguous matches in db."""
    if not source_norm:
        return 1.0
    matcher = SequenceMatcher(None, source_norm, db_norm, autojunk=False)
    matched = sum(block.size for block in matcher.get_matching_blocks())
    return min(1.0, matched / len(source_norm))


def _similarity(a: str, b: str) -> float:
    if not a and not b:
        return 1.0
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a, b, autojunk=False).ratio()


def db_full_text(record: dict) -> str:
    parts = [
        record.get("question") or "",
        record.get("originalQuestion") or "",
        " ".join(record.get("choices") or []),
        record.get("table") or "",
    ]
    return "\n".join(part for part in parts if part)


@dataclass
class QuestionMetrics:
    key: str
    year: int
    number: int
    present: bool
    stem_coverage: float = 0.0
    choice_coverage: float = 0.0
    table_expected: bool = False
    table_fidelity: float | None = None
    number_fidelity: float = 0.0
    unit_fidelity: float = 0.0
    source_fidelity: float = 0.0
    duplicate: bool = False
    completeness: float = 0.0
    five_choices: bool = False
    missing_numbers: list[str] = field(default_factory=list)
    missing_units: list[str] = field(default_factory=list)


def _table_expected(record: dict, source_body: str) -> bool:
    if record.get("hasTable"):
        return True
    return sum(1 for kw in TABLE_KEYWORDS if kw in source_body) >= 2


def _table_well_formed(record: dict) -> bool:
    table = (record.get("table") or "").strip()
    if not table:
        return False
    flat = table.replace(" ", "")
    if "|---" in flat or "|-" in flat:
        return True
    lines = [line for line in table.splitlines() if line.strip()]
    grid_rows = sum(1 for line in lines if "\t" in line or "  " in line)
    return grid_rows >= 2


def _is_duplicate(record: dict) -> bool:
    stem = (record.get("question") or "").strip()
    original = (record.get("originalQuestion") or "").strip()
    if not stem or not original or stem == original:
        return False
    table = (record.get("table") or "").strip()
    if table:
        original_no_table = original.replace(table, "").strip()
        if normalize_compare(original_no_table) == normalize_compare(stem):
            return False
    ctx = original.replace(stem, "", 1).strip()
    if table:
        ctx = ctx.replace(table, "").strip()
    if len(ctx) < 20:
        return False
    ctx_norm = normalize_compare(ctx)
    stem_norm = normalize_compare(stem)
    if not ctx_norm or not stem_norm:
        return False
    if stem_norm in ctx_norm or ctx_norm in stem_norm:
        return True
    return _similarity(stem_norm, ctx_norm) > 0.65


def compute_question_metrics(record: dict | None, source: dict) -> QuestionMetrics:
    year = source["year"]
    number = source["number"]
    key = source["key"]

    if record is None:
        return QuestionMetrics(key=key, year=year, number=number, present=False)

    source_body = source["body"]
    src_stem, src_choices = split_stem_and_choices(source_body)
    db_stem = record.get("question") or ""
    db_choices_text = " ".join(record.get("choices") or [])

    src_stem_norm = normalize_compare(src_stem)
    db_stem_norm = normalize_compare(db_stem)
    src_choices_norm = normalize_compare(src_choices)
    db_choices_norm = normalize_compare(db_choices_text)

    stem_cov = _recall(src_stem_norm, db_stem_norm)
    choice_cov = _recall(src_choices_norm, db_choices_norm) if src_choices_norm else 1.0

    src_numbers = set(source["numbers"]) - {str(number)}
    db_numbers = extract_numbers(db_full_text(record))
    number_fid = len(src_numbers & db_numbers) / len(src_numbers) if src_numbers else 1.0
    missing_numbers = sorted(src_numbers - db_numbers, key=lambda x: (-len(x), x))

    src_units = set(source["units"])
    db_units = extract_units(db_full_text(record))
    unit_fid = len(src_units & db_units) / len(src_units) if src_units else 1.0
    missing_units = sorted(src_units - db_units)

    stem_sim = _similarity(src_stem_norm, db_stem_norm)
    choice_sim = _similarity(src_choices_norm, db_choices_norm) if src_choices_norm and db_choices_norm else 1.0
    source_fid = 0.45 * number_fid + 0.15 * unit_fid + 0.25 * stem_sim + 0.15 * choice_sim

    table_expected = _table_expected(record, source_body)
    table_fid: float | None = None
    if table_expected:
        table_fid = 1.0 if _table_well_formed(record) else 0.0

    choices = record.get("choices") or []
    five = len(choices) == 5
    all_nonempty = five and all(str(c).strip() for c in choices)
    has_stem = bool(db_stem.strip())
    has_answer = record.get("answer") is not None
    completeness = sum([has_stem, five, all_nonempty, has_answer]) / 4.0

    return QuestionMetrics(
        key=key,
        year=year,
        number=number,
        present=True,
        stem_coverage=round(stem_cov, 4),
        choice_coverage=round(choice_cov, 4),
        table_expected=table_expected,
        table_fidelity=None if table_fid is None else round(table_fid, 4),
        number_fidelity=round(number_fid, 4),
        unit_fidelity=round(unit_fid, 4),
        source_fidelity=round(source_fid, 4),
        duplicate=_is_duplicate(record),
        completeness=round(completeness, 4),
        five_choices=five,
        missing_numbers=missing_numbers[:15],
        missing_units=missing_units[:15],
    )


def _mean(values: list[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def aggregate(metrics: list[QuestionMetrics]) -> dict:
    total = len(metrics)
    present = [m for m in metrics if m.present]
    table_metrics = [m for m in present if m.table_expected and m.table_fidelity is not None]

    return {
        "totalExpected": total,
        "present": len(present),
        "missingQuestions": total - len(present),
        "means": {
            "stemCoverage": round(_mean([m.stem_coverage for m in present]), 4),
            "choiceCoverage": round(_mean([m.choice_coverage for m in present]), 4),
            "tableFidelity": round(_mean([m.table_fidelity for m in table_metrics]), 4) if table_metrics else None,
            "numberFidelity": round(_mean([m.number_fidelity for m in present]), 4),
            "unitFidelity": round(_mean([m.unit_fidelity for m in present]), 4),
            "sourceFidelity": round(_mean([m.source_fidelity for m in present]), 4),
            "completeness": round(_mean([m.completeness for m in present]), 4),
        },
        "counts": {
            "stemCoverageBelowTarget": sum(1 for m in present if m.stem_coverage < STEM_COVERAGE_TARGET),
            "not5Choices": sum(1 for m in present if not m.five_choices),
            "tableExpected": len(table_metrics),
            "tableBroken": sum(1 for m in table_metrics if m.table_fidelity == 0.0),
            "numbersMissing": sum(1 for m in present if m.number_fidelity < 1.0),
            "unitsMissing": sum(1 for m in present if m.unit_fidelity < 1.0),
            "sourceFidelityBelowTarget": sum(1 for m in present if m.source_fidelity < SOURCE_FIDELITY_TARGET),
            "duplicates": sum(1 for m in present if m.duplicate),
            "incomplete": sum(1 for m in present if m.completeness < 1.0),
        },
        "rates": {
            "duplicateRate": round(sum(1 for m in present if m.duplicate) / len(present), 4) if present else 0.0,
            "completeRate": round(sum(1 for m in present if m.completeness >= 1.0) / len(present), 4) if present else 0.0,
        },
    }
