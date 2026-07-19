#!/usr/bin/env python3
"""Analyze parser output across 2010-2026 original exams and classify stem issues."""
from __future__ import annotations

import json
import sys
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

from exam_pipeline.constants import ACC_END, ACC_START, CACHE_DIR, EXPECTED_ACC_COUNT
from exam_pipeline.question_parser import parse_accounting_questions
from exam_pipeline.source_loader import load_exam_document
from exam_pipeline.source_truth import compare_question_to_source, load_year_raw_slices, stem_coverage
from exam_pipeline.text_postprocess import extract_numbers, extract_units
from exam_pipeline.year_discovery import discover_all_years, resolve_exam_source_for_year

OUTPUT_JSON = ROOT / "data" / "analysis" / "parser-upgrade-analysis.json"
OUTPUT_MD = ROOT / "docs" / "parser-upgrade-analysis.md"


def analyze_year(year: int) -> dict:
    info = resolve_exam_source_for_year(year)
    report = {
        "year": year,
        "sourceFile": info.path.name if info.path else "",
        "sourceKind": info.kind or "",
        "examPresent": info.exists,
        "parsed": 0,
        "fiveChoices": 0,
        "stemOk": 0,
        "truncated": 0,
        "truncationCauses": {},
        "issues": [],
    }
    if not info.exists or not info.path:
        report["issues"].append("exam missing")
        return report

    try:
        doc = load_exam_document(year, CACHE_DIR)
        parsed_list = parse_accounting_questions(doc.text, doc.pages)
        slices = load_year_raw_slices(year, CACHE_DIR)
    except Exception as exc:
        report["issues"].append(str(exc))
        return report

    cause_counter: Counter = Counter()
    for parsed in parsed_list:
        if parsed.question:
            report["parsed"] += 1
        if len(parsed.choices) == 5:
            report["fiveChoices"] += 1
        if parsed.truncation_cause:
            report["truncated"] += 1
            cause_counter[parsed.truncation_cause] += 1
        else:
            report["stemOk"] += 1

        source = slices.get(parsed.question_number)
        if source and parsed.question:
            fake_db = {
                "questionId": f"ACC_{year}_Q{parsed.question_number:03d}",
                "question": parsed.question,
                "originalQuestion": parsed.original_question,
                "choices": parsed.choices,
                "table": parsed.table_markdown or parsed.table_grid,
                "hasTable": parsed.has_table,
            }
            diff = compare_question_to_source(fake_db, source)
            if diff.stem_coverage < 0.75:
                report["truncated"] = max(report["truncated"], 0)  # already counted

    report["truncationCauses"] = dict(cause_counter)
    report["usedOcr"] = doc.used_ocr
    return report


def main() -> int:
    years = discover_all_years(min_year=2010)
    reports = [analyze_year(year) for year in years]

    totals = Counter()
    cause_totals: Counter = Counter()
    by_kind: dict[str, Counter] = defaultdict(Counter)

    for report in reports:
        if not report["examPresent"]:
            continue
        totals["years"] += 1
        totals["parsed"] += report["parsed"]
        totals["fiveChoices"] += report["fiveChoices"]
        totals["stemOk"] += report["stemOk"]
        totals["truncated"] += report["truncated"]
        for cause, count in report.get("truncationCauses", {}).items():
            cause_totals[cause] += count
            by_kind[report.get("sourceKind", "?")][cause] += count

    lines = [
        "# Parser Upgrade Analysis (2010-2026)",
        "",
        f"- 생성일: {date.today().isoformat()}",
        "- 범위: `source/original-exams/` 전 연도 parser 출력",
        "",
        "## Summary",
        "",
        f"| 항목 | 값 |",
        f"|------|-----|",
        f"| 분석 연도 | {totals['years']} |",
        f"| 추출 question | {totals['parsed']} |",
        f"| 5지 보기 | {totals['fiveChoices']} |",
        f"| stem OK | {totals['stemOk']} |",
        f"| stem truncated | {totals['truncated']} |",
        "",
        "## Truncation Cause Classification",
        "",
        "| Cause | Count | 설명 |",
        "|-------|-------|------|",
    ]
    cause_desc = {
        "question_end_fail": "문항 종료 인식 실패 (마지막 ? 문장만 취함 등)",
        "choice_start_fail": "보기 시작 ① 인식 실패",
        "linebreak_handling": "PDF 줄바꿈 처리 문제",
        "table_handling": "표 블록 분리/복원 문제",
    }
    for cause, count in cause_totals.most_common():
        lines.append(f"| `{cause}` | {count} | {cause_desc.get(cause, '-')} |")

    lines.extend(["", "## 연도별", "", "| Year | Kind | Parsed | 5-choice | Truncated |", "|------|------|--------|----------|-----------|"])
    for report in reports:
        if not report["examPresent"]:
            lines.append(f"| {report['year']} | - | - | - | missing |")
            continue
        lines.append(
            f"| {report['year']} | {report.get('sourceKind','?')} | "
            f"{report['parsed']}/{EXPECTED_ACC_COUNT} | {report['fiveChoices']} | {report['truncated']} |"
        )

    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_JSON.write_text(
        json.dumps({"summary": dict(totals), "causes": dict(cause_totals), "years": reports}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    OUTPUT_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print("Parser Upgrade Analysis")
    print(f"- years: {totals['years']}")
    print(f"- stem OK: {totals['stemOk']}")
    print(f"- truncated: {totals['truncated']}")
    print(f"- report: {OUTPUT_MD}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
