#!/usr/bin/env python3
"""Phase 3 Pattern Learning System validation."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def test_files():
    required = [
        "pattern.html",
        "css/pattern.css",
        "js/pattern.js",
        "js/pattern-engine.js",
        "data/pattern-db.json",
        "data/question-db.json",
        "data/statistics.json",
    ]
    for rel in required:
        assert (ROOT / rel).exists(), f"missing {rel}"
    print("  PASS: Phase 3 files exist")


def test_html_sections():
    html = (ROOT / "pattern.html").read_text(encoding="utf-8")
    for fid in [
        "dashboard-section",
        "pattern-dashboard-list",
        "wrong-note-summary",
        "detail-section",
        "detail-description",
        "detail-learning-points",
        "related-question-list",
        "start-solving-btn",
    ]:
        assert fid in html, f"missing #{fid}"
    print("  PASS: HTML required sections")


def test_data_readonly():
    patterns = json.loads((ROOT / "data/pattern-db.json").read_text(encoding="utf-8"))
    stats = json.loads((ROOT / "data/statistics.json").read_text(encoding="utf-8"))
    qs = json.loads((ROOT / "data/question-db.json").read_text(encoding="utf-8"))
    assert len(patterns) == len(stats), "patterns vs statistics count"
    for p in patterns:
        cnt = sum(1 for q in qs if q["patternId"] == p["patternId"])
        assert cnt == p["frequency"], f"{p['patternId']} frequency"
        s = next(x for x in stats if x["patternId"] == p["patternId"])
        assert s["totalCount"] == p["frequency"]
    print("  PASS: data integrity (read-only)")


def test_pattern_engine_logic():
    # Mirror aggregateWrongByPattern
    wrong = {
        "items": {
            "Q1": {"questionId": "Q1", "patternId": "ACC_INV_001", "wrongCount": 2},
            "Q2": {"questionId": "Q2", "patternId": "ACC_INV_001", "wrongCount": 1},
            "Q3": {"questionId": "Q3", "patternId": "ACC_INV_004", "wrongCount": 1},
        }
    }
    by = {}
    for item in wrong["items"].values():
        pid = item["patternId"]
        by.setdefault(pid, {"questionCount": 0, "totalWrongCount": 0})
        by[pid]["questionCount"] += 1
        by[pid]["totalWrongCount"] += item["wrongCount"]
    assert by["ACC_INV_001"]["questionCount"] == 2
    assert by["ACC_INV_001"]["totalWrongCount"] == 3
    assert by["ACC_INV_004"]["questionCount"] == 1
    print("  PASS: wrong note aggregation logic")


def test_freeze_unchanged():
    manifest = json.loads((ROOT / "data/phase1-freeze-manifest.json").read_text(encoding="utf-8"))
    import hashlib
    for name, meta in manifest["files"].items():
        digest = hashlib.sha256((ROOT / "data" / name).read_bytes()).hexdigest()
        assert digest == meta["sha256"], f"freeze modified: {name}"
    print("  PASS: Phase 1 freeze unchanged")


def main():
    print("\n=== Phase 3 Pattern Learning Validation ===\n")
    failed = 0
    for fn in [test_files, test_html_sections, test_data_readonly, test_pattern_engine_logic, test_freeze_unchanged]:
        try:
            fn()
        except Exception as e:
            print(f"  FAIL: {fn.__name__}: {e}")
            failed += 1
    print(f"\n=== Result: {'PASS' if failed == 0 else f'{failed} failed'} ===\n")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
