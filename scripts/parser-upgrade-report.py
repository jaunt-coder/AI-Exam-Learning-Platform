#!/usr/bin/env python3
"""Compare pre/post parser upgrade MVP DB quality metrics."""
from __future__ import annotations

import json
import re
import shutil
import sys
from collections import Counter
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
REPAIR = DATA / "repair"
QUESTION_DB = DATA / "question-db-mvp.json"
BACKUP_DB = REPAIR / "question-db-mvp.pre-parser-upgrade.json"
REPORT_MD = ROOT / "docs" / "parser-upgrade-report.md"
BASELINE_JSON = REPAIR / "parser-upgrade-metrics.json"

MVP_YEARS = [2015, 2017, 2018, 2020, 2024, 2025]
EXPECTED_TOTAL = 240

sys.path.insert(0, str(ROOT / "scripts"))
from exam_pipeline.source_truth import compare_question_to_source, load_year_raw_slices  # noqa: E402


def is_valid_table(table: str) -> bool:
    value = (table or "").strip()
    if not value:
        return False
    if "| ---" in value or "|---" in value.replace(" ", ""):
        return True
    lines = [line.strip() for line in value.splitlines() if line.strip()]
    if len(lines) < 2:
        return False
    multi_cell = sum(
        1 for line in lines if len(re.split(r"\s{2,}|\t", line)) >= 2 or "\t" in line
    )
    return multi_cell >= 2


def load_questions(path: Path) -> list[dict]:
    if not path.exists():
        return []
    payload = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(payload, list):
        return payload
    return payload.get("questions") or []


def measure_questions(questions: list[dict]) -> dict:
    by_key = {(q["year"], q["source"]["questionNumber"]): q for q in questions}
    issue_counts: Counter = Counter()
    truncated = 0
    footer = 0
    glued = 0
    missing_numbers = 0
    missing_units = 0
    table_total = 0
    table_ok = 0

    for year in MVP_YEARS:
        slices = load_year_raw_slices(year)
        for number, source in slices.items():
            db_q = by_key.get((year, number))
            if not db_q:
                continue
            diff = compare_question_to_source(db_q, source)
            if diff.stem_coverage < 0.75:
                truncated += 1
                issue_counts["stem_truncated"] += 1
            for issue in diff.issues:
                issue_counts[issue.code] += 1
                if issue.code == "ocr_footer":
                    footer += 1
                if issue.code == "ocr_glued_hangul":
                    glued += 1
                if issue.code == "missing_numbers":
                    missing_numbers += 1
                if issue.code == "missing_units":
                    missing_units += 1
            if db_q.get("hasTable"):
                table_total += 1
                table = db_q.get("table") or ""
                if is_valid_table(table):
                    table_ok += 1

    return {
        "total": len(questions),
        "stem_truncated": truncated,
        "ocr_footer": footer,
        "ocr_glued_hangul": glued,
        "missing_numbers": missing_numbers,
        "missing_units": missing_units,
        "table_total": table_total,
        "table_ok": table_ok,
        "table_restore_rate": round(table_ok / table_total * 100, 1) if table_total else 100.0,
        "issue_counts": dict(issue_counts),
    }


def pct_change(before: int, after: int) -> str:
    if before == 0:
        return "0%" if after == 0 else f"+{after}"
    delta = (before - after) / before * 100
    return f"{delta:.1f}%"


def build_report(before: dict, after: dict) -> str:
    lines = [
        "# Parser Upgrade Report",
        "",
        f"- 생성일: {date.today().isoformat()}",
        "- 비교: parser upgrade 전후 `question-db-mvp.json`",
        f"- 백업: `{BACKUP_DB.relative_to(ROOT).as_posix()}`",
        "",
        "## Quality Metrics",
        "",
        "| Metric | Before | After | Reduction |",
        "|--------|--------|-------|-----------|",
        f"| stem_truncated | {before['stem_truncated']} | {after['stem_truncated']} | {pct_change(before['stem_truncated'], after['stem_truncated'])} |",
        f"| ocr_footer | {before['ocr_footer']} | {after['ocr_footer']} | {pct_change(before['ocr_footer'], after['ocr_footer'])} |",
        f"| ocr_glued_hangul | {before['ocr_glued_hangul']} | {after['ocr_glued_hangul']} | {pct_change(before['ocr_glued_hangul'], after['ocr_glued_hangul'])} |",
        f"| missing_numbers | {before['missing_numbers']} | {after['missing_numbers']} | {pct_change(before['missing_numbers'], after['missing_numbers'])} |",
        f"| missing_units | {before['missing_units']} | {after['missing_units']} | {pct_change(before['missing_units'], after['missing_units'])} |",
        f"| table_restore_rate | {before['table_restore_rate']}% | {after['table_restore_rate']}% | - |",
        "",
        "## Notes",
        "",
        "- stem_truncated: raw source segment 대비 stem coverage < 75%",
        "- table_restore_rate: hasTable 문항 중 valid markdown/grid 비율",
        "- verified JSON 수작업 없이 parser 규칙 개선만 적용",
        "",
    ]
    return "\n".join(lines)


def main() -> int:
    if not BACKUP_DB.exists():
        if QUESTION_DB.exists():
            REPAIR.mkdir(parents=True, exist_ok=True)
            shutil.copy2(QUESTION_DB, BACKUP_DB)
            print(f"Backup created: {BACKUP_DB}")
        else:
            print("FAIL: no question-db-mvp.json to compare")
            return 1

    before_q = load_questions(BACKUP_DB)
    after_q = load_questions(QUESTION_DB)
    if len(after_q) != EXPECTED_TOTAL:
        print(f"WARN: new DB has {len(after_q)}/{EXPECTED_TOTAL} questions")

    before = measure_questions(before_q)
    after = measure_questions(after_q)

    REPAIR.mkdir(parents=True, exist_ok=True)
    BASELINE_JSON.write_text(json.dumps({"before": before, "after": after}, ensure_ascii=False, indent=2), encoding="utf-8")
    REPORT_MD.write_text(build_report(before, after), encoding="utf-8")

    print("Parser Upgrade Metrics")
    print(f"- stem_truncated: {before['stem_truncated']} -> {after['stem_truncated']}")
    print(f"- ocr_footer: {before['ocr_footer']} -> {after['ocr_footer']}")
    print(f"- ocr_glued_hangul: {before['ocr_glued_hangul']} -> {after['ocr_glued_hangul']}")
    print(f"- missing_numbers: {before['missing_numbers']} -> {after['missing_numbers']}")
    print(f"- missing_units: {before['missing_units']} -> {after['missing_units']}")
    print(f"- table_restore_rate: {before['table_restore_rate']}% -> {after['table_restore_rate']}%")
    print(f"- report: {REPORT_MD}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
