#!/usr/bin/env python3
"""Phase 6 Exam Simulation Mode validation."""
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def test_files():
    for rel in [
        "exam.html",
        "css/exam.css",
        "js/exam.js",
        "js/exam-engine.js",
    ]:
        assert (ROOT / rel).exists(), rel
    print("  PASS: Phase 6 files exist")


def test_html():
    html = (ROOT / "exam.html").read_text(encoding="utf-8")
    for fid in [
        "setup-section",
        "exam-section",
        "result-section",
        "exam-nav-grid",
        "timer-display",
        "submit-exam-btn",
        "pattern-result-list",
        "weak-pattern-list",
        "recommend-list",
    ]:
        assert fid in html, fid
    print("  PASS: exam HTML sections")


def test_exam_engine():
    eng = (ROOT / "js/exam-engine.js").read_text(encoding="utf-8")
    for sym in [
        "EXAM_CONFIG",
        "selectRandomQuestions",
        "createExamSession",
        "gradeExamSession",
        "submitExamSession",
        "loadExamHistory",
        "formatExamTime",
        "buildExamRecommendations",
    ]:
        assert sym in eng, sym
    js = (ROOT / "js/exam.js").read_text(encoding="utf-8")
    assert "startTimer" in js
    assert "finalizeExam" in js
    assert "renderResult" in js
    print("  PASS: exam engine API")


def test_exam_features():
    eng = (ROOT / "js/exam-engine.js").read_text(encoding="utf-8")
    assert "shuffleArray" in eng
    assert "saveExamAnswer" in eng
    assert "patternStats" in eng
    assert "weakPatterns" in eng
    assert "recommendations" in eng
    assert "STORAGE_KEYS.EXAM_HISTORY" in eng
    print("  PASS: required exam features")


def test_analysis_fields():
    eng = (ROOT / "js/exam-engine.js").read_text(encoding="utf-8")
    for field in ["totalScore", "accuracy", "patternStats", "weakPatterns"]:
        assert field in eng, field
    print("  PASS: result analysis fields")


def test_nav_integration():
    index = (ROOT / "index.html").read_text(encoding="utf-8")
    assert "exam.html" in index
    print("  PASS: index nav link")


def test_freeze():
    manifest = json.loads((ROOT / "data/phase1-freeze-manifest.json").read_text(encoding="utf-8"))
    for name, meta in manifest["files"].items():
        d = hashlib.sha256((ROOT / "data" / name).read_bytes()).hexdigest()
        assert d == meta["sha256"], name
    print("  PASS: Phase 1 freeze unchanged")


def main():
    print("\n=== Phase 6 Exam Simulation Validation ===\n")
    failed = 0
    for fn in [
        test_files,
        test_html,
        test_exam_engine,
        test_exam_features,
        test_analysis_fields,
        test_nav_integration,
        test_freeze,
    ]:
        try:
            fn()
        except Exception as e:
            print(f"  FAIL: {fn.__name__}: {e}")
            failed += 1
    print(f"\n=== Result: {'PASS' if failed == 0 else f'{failed} failed'} ===\n")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
