#!/usr/bin/env python3
"""Validate Question Quality Repair progress and verified records."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
QUESTION_DB = DATA / "question-db-mvp.json"
BASELINE_JSON = DATA / "repair" / "source-baseline.json"
VERIFIED_DIR = DATA / "repair" / "verified"

MVP_YEARS = [2015, 2017, 2018, 2020, 2024, 2025]
EXPECTED_TOTAL = 240
REQUIRED_VERIFIED_FIELDS = [
    "questionId",
    "verifiedAt",
    "sourceFile",
    "sourcePage",
    "rawBodyHash",
    "question",
    "originalQuestion",
    "choices",
    "reviewerNote",
]


def load_questions() -> list[dict]:
    payload = json.loads(QUESTION_DB.read_text(encoding="utf-8"))
    if isinstance(payload, list):
        return payload
    return payload.get("questions") or []


def validate_verified_record(path: Path, db_by_id: dict[str, dict]) -> list[str]:
    errors: list[str] = []
    try:
        record = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        return [f"{path.name}: invalid JSON ({exc})"]

    qid = record.get("questionId") or path.stem
    for field in REQUIRED_VERIFIED_FIELDS:
        if field not in record or record[field] in (None, ""):
            errors.append(f"{qid}: missing `{field}`")

    choices = record.get("choices") or []
    if len(choices) != 5:
        errors.append(f"{qid}: choices must be 5, got {len(choices)}")

    db_q = db_by_id.get(qid)
    if not db_q:
        errors.append(f"{qid}: not in question-db-mvp.json")
        return errors

    if db_q.get("answer") != record.get("answer", db_q.get("answer")):
        if "answer" in record and record["answer"] != db_q.get("answer"):
            errors.append(f"{qid}: verified answer differs from DB (forbidden)")

    if record.get("patternId") and record["patternId"] != db_q.get("patternId"):
        errors.append(f"{qid}: verified patternId differs from DB (forbidden)")

    return errors


def main() -> int:
    failures: list[str] = []
    passed: list[str] = []

    if not QUESTION_DB.exists():
        print("FAIL: question-db-mvp.json missing")
        return 1

    questions = load_questions()
    if len(questions) != EXPECTED_TOTAL:
        failures.append(f"question count {len(questions)}/{EXPECTED_TOTAL}")
    else:
        passed.append(f"{EXPECTED_TOTAL} questions in MVP DB")

    if not BASELINE_JSON.exists():
        failures.append("source-baseline.json missing — run compare-questions-with-source.py first")
    else:
        passed.append("source-baseline.json exists")
        baseline = json.loads(BASELINE_JSON.read_text(encoding="utf-8"))
        summary = baseline.get("summary", {})
        passed.append(
            f"baseline critical={summary.get('critical_questions', '?')} "
            f"warning={summary.get('warning_questions', '?')}"
        )

    VERIFIED_DIR.mkdir(parents=True, exist_ok=True)
    db_by_id = {q["questionId"]: q for q in questions}
    verified_files = sorted(VERIFIED_DIR.glob("ACC_*.json"))
    verified_ids = {path.stem for path in verified_files}

    for path in verified_files:
        errors = validate_verified_record(path, db_by_id)
        if errors:
            failures.extend(errors)
        else:
            passed.append(f"verified OK: {path.stem}")

    repair_pct = len(verified_ids) / EXPECTED_TOTAL * 100
    passed.append(f"repair progress: {len(verified_ids)}/{EXPECTED_TOTAL} ({repair_pct:.1f}%)")

    if len(verified_ids) == EXPECTED_TOTAL:
        passed.append("ALL 240 verified — ready for apply-question-repair.py")
    else:
        passed.append(f"remaining: {EXPECTED_TOTAL - len(verified_ids)} questions need verified JSON")

    print("Question Repair Validation")
    for item in passed:
        print(f"  PASS: {item}")
    for item in failures:
        print(f"  FAIL: {item}")

    # Gate: infrastructure PASS; full repair PASS only when 240 verified
    if failures:
        print("\nFAIL - fix validation errors")
        return 1

    if len(verified_ids) < EXPECTED_TOTAL:
        print(f"\nIN PROGRESS - {len(verified_ids)}/{EXPECTED_TOTAL} verified (infrastructure OK)")
        return 0

    print("\nPASS - Question Quality Repair complete")
    return 0


if __name__ == "__main__":
    sys.exit(main())
