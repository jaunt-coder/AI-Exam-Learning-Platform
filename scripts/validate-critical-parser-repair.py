#!/usr/bin/env python3
"""Validate Critical Parser Repair — detect numeric loss, duplicate stems, merged choices."""
from __future__ import annotations

import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
QUESTION_DB = ROOT / "data" / "question-db-mvp.json"
REPORT = ROOT / "docs" / "critical-parser-repair-report.md"

EXPECTED_TOTAL = 240
Q51_ID = "ACC_2015_Q051"

NUMERIC_LOSS_PATTERNS = [
    (re.compile(r"\(\s*\)\s*년"), "empty_paren_year"),
    (re.compile(r"년\s*과\s*년\s*에"), "missing_year_pair"),
    (re.compile(r"년\s*과\s*년\s*의"), "missing_year_pair_genitive"),
    (re.compile(r"년\s*월\s*일"), "missing_date_parts"),
]
MERGED_CHOICE = re.compile(r"^W[\d,]+ W[\d,]+$")
GRID_HEADER_IN_STEM = re.compile(
    r"\?\s*년\s+(20[×xX]\d{1,2})\s+년\s+(20[×xX]\d{1,2})"
)
VALID_DATE = re.compile(r"20[×xX]\d{1,2}\s*년\s*\d{1,2}\s*월\s*\d{1,2}\s*일")


def has_orphan_date_parts(stem: str) -> bool:
    if not re.search(r"년\s*월\s*일", stem):
        return False
    cleaned = VALID_DATE.sub("", stem)
    return bool(re.search(r"년\s*월\s*일", cleaned))


def load_questions() -> list[dict]:
    payload = json.loads(QUESTION_DB.read_text(encoding="utf-8"))
    return payload if isinstance(payload, list) else payload.get("questions") or []


def inspect_question(question: dict) -> list[str]:
    issues: list[str] = []
    qid = question.get("questionId", "?")
    stem = question.get("question") or ""
    original = question.get("originalQuestion") or ""
    choices = question.get("choices") or []

    for pattern, label in NUMERIC_LOSS_PATTERNS:
        if label == "missing_date_parts":
            if has_orphan_date_parts(stem):
                issues.append(label)
            continue
        if pattern.search(stem):
            issues.append(label)

    if GRID_HEADER_IN_STEM.search(stem):
        issues.append("choice_grid_header_in_stem")

    for choice in choices:
        if MERGED_CHOICE.match(str(choice).strip()):
            issues.append("merged_w_choice")

    if question.get("table") and stem.strip() == original.strip():
        issues.append("stem_equals_original_with_table")

    if stem and original and stem.strip() == original.strip() and len(stem) > 200:
        if re.search(r"[①②③④⑤]", original):
            issues.append("possible_duplicate_stem_context")

    return [f"{qid}:{item}" for item in issues]


def inspect_q51(question: dict) -> list[str]:
    failures: list[str] = []
    stem = question.get("question") or ""
    choices = question.get("choices") or []

    if "(20×2)" not in stem and "(20×2)" not in stem.replace("x", "×"):
        failures.append("Q51 missing 20×2 in stem")
    if "(20×3)" not in stem and "(20×3)" not in stem.replace("x", "×"):
        failures.append("Q51 missing 20×3 in stem")
    if re.search(r"\(\s*\)\s*년", stem):
        failures.append("Q51 still has empty ()년")
    if GRID_HEADER_IN_STEM.search(stem):
        failures.append("Q51 stem still contains choice grid header")
    if any(MERGED_CHOICE.match(str(choice).strip()) for choice in choices):
        failures.append("Q51 choices still merged W values")
    if len(choices) != 5:
        failures.append(f"Q51 choices count {len(choices)}")
    if not question.get("table"):
        failures.append("Q51 missing table")
    if stem.strip() == (question.get("originalQuestion") or "").strip():
        failures.append("Q51 stem equals originalQuestion (duplicate render risk)")
    return failures


def _load_structural_tail() -> str:
    if not REPORT.exists():
        return ""
    text = REPORT.read_text(encoding="utf-8")
    marker = "\n---\n\n## 1."
    index = text.find(marker)
    return text[index:] if index >= 0 else ""


def write_report(
    all_issues: list[str],
    issue_counts: Counter,
    q51_failures: list[str],
    passed: bool,
) -> None:
    affected = len({item.split(":")[0] for item in all_issues})
    lines = [
        "# Critical Parser Repair Report",
        "",
        "- 생성일: 2026-07-19",
        "- 대상: `scripts/exam_pipeline/question_parser.py`, `scripts/exam_pipeline/text_postprocess.py`",
        "- 산출물: `data/question-db-mvp.json` (240문항)",
        "",
        "## Validation Summary",
        "",
        f"- Validation: **{'PASS' if passed else 'FAIL'}**",
        f"- Total flagged issues: **{len(all_issues)}**",
        f"- Affected questions: **{affected}**",
        f"- Question count: **240/240**",
        "",
        "## Issue Types",
        "",
    ]
    if issue_counts:
        for label, count in issue_counts.most_common():
            lines.append(f"- `{label}`: {count}")
    else:
        lines.append("- (없음 — 전수 검증 통과)")
    lines.extend(["", "## ACC_2015_Q051", ""])
    if q51_failures:
        for item in q51_failures:
            lines.append(f"- FAIL: {item}")
    else:
        lines.append("- PASS: stem, choices, and table checks OK")
    lines.extend(["", "## Flagged Question IDs", ""])
    if all_issues:
        grouped: dict[str, list[str]] = {}
        for item in all_issues:
            qid, label = item.split(":", 1)
            grouped.setdefault(qid, []).append(label)
        for qid in sorted(grouped):
            labels = ", ".join(sorted(set(grouped[qid])))
            lines.append(f"- `{qid}`: {labels}")
    else:
        lines.append("- none")

    structural_tail = _load_structural_tail()
    body = "\n".join(lines) + "\n"
    if structural_tail:
        body += structural_tail if structural_tail.endswith("\n") else structural_tail + "\n"
    REPORT.write_text(body, encoding="utf-8")


def main() -> int:
    if not QUESTION_DB.exists():
        print(f"FAIL: missing {QUESTION_DB}")
        return 1

    questions = load_questions()
    if len(questions) != EXPECTED_TOTAL:
        print(f"FAIL: expected {EXPECTED_TOTAL} questions, got {len(questions)}")
        return 1

    all_issues: list[str] = []
    for question in questions:
        all_issues.extend(inspect_question(question))

    issue_counts = Counter(item.split(":", 1)[1] for item in all_issues)
    q51 = next((q for q in questions if q.get("questionId") == Q51_ID), None)
    q51_failures = inspect_q51(q51) if q51 else [f"missing {Q51_ID}"]

    passed = not all_issues and not q51_failures
    write_report(all_issues, issue_counts, q51_failures, passed)

    print(f"questions={len(questions)} issues={len(all_issues)} q51={'PASS' if not q51_failures else 'FAIL'}")
    print(f"report={REPORT}")
    print("PASS" if passed else "FAIL")
    return 0 if passed else 1


if __name__ == "__main__":
    sys.exit(main())
