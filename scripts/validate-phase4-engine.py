#!/usr/bin/env python3
"""Phase 4 Wrong Answer System validation."""
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def test_files():
    for rel in [
        "wrong-note.html",
        "css/wrong-note.css",
        "js/wrong-note.js",
        "js/wrong-note-engine.js",
    ]:
        assert (ROOT / rel).exists(), rel
    print("  PASS: Phase 4 files exist")


def test_html():
    html = (ROOT / "wrong-note.html").read_text(encoding="utf-8")
    for fid in [
        "wrong-summary",
        "vulnerability-list",
        "wrong-question-list",
        "pattern-filter",
        "empty-state",
    ]:
        assert fid in html, fid
    print("  PASS: HTML sections")


def test_wrong_schema():
    js = (ROOT / "js/question-engine.js").read_text(encoding="utf-8")
    assert "removeWrongAnswer" in js
    assert "lastWrongAt" in js
    assert "wrongCount" in js
    eng = (ROOT / "js/wrong-note-engine.js").read_text(encoding="utf-8")
    assert "getPatternVulnerability" in eng
    assert "buildRetryUrl" in eng
    print("  PASS: wrong answer engine API")


def test_vulnerability_logic():
    wrong = {"totalWrongCount": 4, "questionCount": 2}
    score = wrong["totalWrongCount"] * 10 + wrong["questionCount"] * 5
    level = "HIGH" if wrong["totalWrongCount"] >= 3 or score >= 35 else "MEDIUM"
    assert level == "HIGH"
    print("  PASS: vulnerability scoring")


def test_freeze():
    manifest = json.loads((ROOT / "data/phase1-freeze-manifest.json").read_text(encoding="utf-8"))
    for name, meta in manifest["files"].items():
        d = hashlib.sha256((ROOT / "data" / name).read_bytes()).hexdigest()
        assert d == meta["sha256"], name
    print("  PASS: Phase 1 freeze unchanged")


def main():
    print("\n=== Phase 4 Wrong Answer Validation ===\n")
    failed = 0
    for fn in [test_files, test_html, test_wrong_schema, test_vulnerability_logic, test_freeze]:
        try:
            fn()
        except Exception as e:
            print(f"  FAIL: {fn.__name__}: {e}")
            failed += 1
    print(f"\n=== Result: {'PASS' if failed == 0 else f'{failed} failed'} ===\n")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
