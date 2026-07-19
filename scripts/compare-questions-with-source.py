#!/usr/bin/env python3
"""Compare MVP question-db against original PDF/HWP source (Question Quality Repair)."""
from __future__ import annotations

import json
import sys
from collections import Counter
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
REPAIR_DIR = DATA / "repair"
BASELINE_JSON = REPAIR_DIR / "source-baseline.json"
REPORT_MD = ROOT / "docs" / "question-repair-baseline.md"
QUESTION_DB = DATA / "question-db-mvp.json"
VERIFIED_DIR = REPAIR_DIR / "verified"

MVP_YEARS = [2015, 2017, 2018, 2020, 2024, 2025]
EXPECTED_TOTAL = 240

sys.path.insert(0, str(ROOT / "scripts"))
from exam_pipeline.source_truth import compare_question_to_source, load_year_raw_slices  # noqa: E402


def load_questions() -> list[dict]:
    payload = json.loads(QUESTION_DB.read_text(encoding="utf-8"))
    if isinstance(payload, list):
        return payload
    return payload.get("questions") or []


def load_verified_ids() -> set[str]:
    if not VERIFIED_DIR.exists():
        return set()
    return {path.stem for path in VERIFIED_DIR.glob("ACC_*.json")}


def build_markdown_report(summary: dict, worst: list[dict], verified: set[str]) -> str:
    lines = [
        "# Question Repair Baseline",
        "",
        f"- 생성일: {date.today().isoformat()}",
        "- 기준: `source/original-exams/` 원본 PDF/HWP raw segment",
        "- 원칙: AI 추론 금지 · 원본 1:1 대조",
        "",
        "## Summary",
        "",
        "| 항목 | 값 |",
        "|------|-----|",
        f"| 총 문항 | {summary['total']} |",
        f"| Critical 이슈 문항 | {summary['critical_questions']} |",
        f"| Warning 이슈 문항 | {summary['warning_questions']} |",
        f"| stem_truncated | {summary['issue_counts'].get('stem_truncated', 0)} |",
        f"| ocr_glued_hangul | {summary['issue_counts'].get('ocr_glued_hangul', 0)} |",
        f"| ocr_footer | {summary['issue_counts'].get('ocr_footer', 0)} |",
        f"| missing_numbers | {summary['issue_counts'].get('missing_numbers', 0)} |",
        f"| missing_units | {summary['issue_counts'].get('missing_units', 0)} |",
        f"| table issues | {summary['issue_counts'].get('table_empty', 0) + summary['issue_counts'].get('table_markdown', 0)} |",
        f"| verified (manual) | {len(verified)}/{EXPECTED_TOTAL} |",
        "",
        f"**Repair 진행률**: {len(verified)}/{EXPECTED_TOTAL} ({len(verified)/EXPECTED_TOTAL*100:.1f}%)",
        "",
        "## 연도별 Critical 문항",
        "",
        "| 연도 | Critical |",
        "|------|----------|",
    ]
    for year in MVP_YEARS:
        lines.append(f"| {year} | {summary['critical_by_year'].get(year, 0)} |")

    lines.extend(
        [
            "",
            "## Worst 25 (stem coverage 낮음)",
            "",
            "| ID | Page | Coverage | Top Issues |",
            "|----|------|----------|------------|",
        ]
    )
    for item in worst:
        issues = ", ".join(item["issue_codes"][:3])
        lines.append(
            f"| `{item['questionId']}` | p.{item['sourcePage']} | {item['stemCoverage']:.0%} | {issues} |"
        )

    lines.extend(
        [
            "",
            "## Repair Workflow",
            "",
            "1. `docs/30-question-quality-repair-spec.md` 확인",
            "2. PDF/HWP 원본과 Worst 문항부터 대조",
            "3. `data/repair/verified/{questionId}.json` 작성",
            "4. `py -3 scripts/validate-question-repair.py` 로 진행률 확인",
            "5. (후속) `apply-question-repair.py` 로 DB 반영",
            "",
            "## 산출물",
            "",
            f"- JSON: `{BASELINE_JSON.relative_to(ROOT).as_posix()}`",
            f"- Spec: `docs/30-question-quality-repair-spec.md`",
            "",
        ]
    )
    return "\n".join(lines)


def main() -> int:
    if not QUESTION_DB.exists():
        print("FAIL: question-db-mvp.json missing")
        return 1

    questions = load_questions()
    if len(questions) != EXPECTED_TOTAL:
        print(f"FAIL: expected {EXPECTED_TOTAL} questions, got {len(questions)}")
        return 1

    verified = load_verified_ids()
    by_key = {(q["year"], q["source"]["questionNumber"]): q for q in questions}

    all_diffs: list[dict] = []
    issue_counts: Counter = Counter()
    critical_by_year: Counter = Counter()
    warning_by_year: Counter = Counter()

    for year in MVP_YEARS:
        slices = load_year_raw_slices(year)
        for number, source in slices.items():
            db_q = by_key.get((year, number))
            if not db_q:
                continue
            diff = compare_question_to_source(db_q, source)
            issue_codes = [issue.code for issue in diff.issues]
            for issue in diff.issues:
                issue_counts[issue.code] += 1

            has_critical = any(i.severity == "critical" for i in diff.issues)
            has_warning = any(i.severity == "warning" for i in diff.issues)
            if has_critical:
                critical_by_year[year] += 1
            if has_warning:
                warning_by_year[year] += 1

            all_diffs.append(
                {
                    "questionId": diff.question_id,
                    "year": diff.year,
                    "questionNumber": diff.question_number,
                    "sourceFile": diff.source_file,
                    "sourcePage": diff.source_page,
                    "rawBodyHash": diff.raw_body_hash,
                    "stemCoverage": round(diff.stem_coverage, 4),
                    "missingNumbers": diff.missing_numbers,
                    "missingUnits": diff.missing_units,
                    "verified": diff.question_id in verified,
                    "issues": [
                        {"code": i.code, "severity": i.severity, "detail": i.detail}
                        for i in diff.issues
                    ],
                    "issueCodes": issue_codes,
                }
            )

    critical_questions = sum(1 for d in all_diffs if any(i["severity"] == "critical" for i in d["issues"]))
    warning_questions = sum(1 for d in all_diffs if any(i["severity"] == "warning" for i in d["issues"]))

    summary = {
        "generatedAt": date.today().isoformat(),
        "total": len(all_diffs),
        "critical_questions": critical_questions,
        "warning_questions": warning_questions,
        "verified_count": len(verified),
        "issue_counts": dict(issue_counts),
        "critical_by_year": dict(critical_by_year),
        "warning_by_year": dict(warning_by_year),
    }

    worst = sorted(all_diffs, key=lambda item: item["stemCoverage"])[:25]
    for item in worst:
        item["issue_codes"] = item.pop("issueCodes")

    REPAIR_DIR.mkdir(parents=True, exist_ok=True)
    BASELINE_JSON.write_text(
        json.dumps({"summary": summary, "questions": all_diffs}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    REPORT_MD.write_text(build_markdown_report(summary, worst, verified), encoding="utf-8")

    print("Question Source Comparison")
    print(f"- total: {summary['total']}")
    print(f"- critical questions: {critical_questions}")
    print(f"- warning questions: {warning_questions}")
    print(f"- verified: {len(verified)}/{EXPECTED_TOTAL}")
    print(f"- baseline json: {BASELINE_JSON}")
    print(f"- report: {REPORT_MD}")
    print("- top issues:")
    for code, count in issue_counts.most_common(8):
        print(f"  - {code}: {count}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
