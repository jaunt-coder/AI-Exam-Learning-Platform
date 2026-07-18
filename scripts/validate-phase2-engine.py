#!/usr/bin/env python3
"""Phase 2 Question Solving Engine logic smoke tests (no browser)."""
import json
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Inline test of engine rules (mirrors js/question-engine.js)
PATTERN_MEMORY_HINTS = {
    "ACC_INV_001": "소유권",
    "ACC_INV_004": "PER",
}


def grade(question, selected):
    return selected == int(question["answer"])


def test_grade():
    q = {"answer": 3}
    assert grade(q, 3) is True
    assert grade(q, 2) is False
    print("  PASS: gradeAnswer logic")


def test_pattern_filter():
    qs = json.loads((ROOT / "data/question-db.json").read_text(encoding="utf-8"))
    pats = json.loads((ROOT / "data/pattern-db.json").read_text(encoding="utf-8"))
    for p in pats:
        cnt = sum(1 for q in qs if q["patternId"] == p["patternId"])
        assert cnt == p["frequency"], f"{p['patternId']} freq mismatch"
    print("  PASS: pattern filter / frequency")


def test_required_files():
    required = [
        "question.html",
        "css/question.css",
        "js/question.js",
        "js/question-engine.js",
        "js/data-loader.js",
        "data/question-db.json",
        "data/pattern-db.json",
        "data/master-db.json",
    ]
    for rel in required:
        assert (ROOT / rel).exists(), f"missing {rel}"
    print("  PASS: Phase 2 files exist")


def test_html_features():
    html = (ROOT / "question.html").read_text(encoding="utf-8")
    for fid in [
        "pattern-section",
        "pattern-list",
        "question-solve-section",
        "choices-list",
        "result-panel",
        "solution-panel",
        "memory-panel",
        "wrong-saved-notice",
    ]:
        assert fid in html, f"missing #{fid}"
    print("  PASS: HTML required sections")


def test_question_schema_readonly():
    qs = json.loads((ROOT / "data/question-db.json").read_text(encoding="utf-8"))
    sample = qs[0]
    for field in ["questionId", "patternId", "question", "choices", "answer", "solution", "originalQuestion", "source"]:
        assert field in sample, f"missing field {field}"
    print("  PASS: question-db schema (read-only)")


def main():
    print("\n=== Phase 2 Engine Validation ===\n")
    failed = 0
    tests = [
        test_required_files,
        test_html_features,
        test_question_schema_readonly,
        test_grade,
        test_pattern_filter,
    ]
    for t in tests:
        try:
            t()
        except Exception as e:
            print(f"  FAIL: {t.__name__}: {e}")
            failed += 1

    print(f"\n=== Result: {'PASS' if failed == 0 else f'{failed} failed'} ===\n")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
