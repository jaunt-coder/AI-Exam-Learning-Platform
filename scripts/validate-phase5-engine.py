#!/usr/bin/env python3
"""Phase 5 AI Explanation validation."""
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def test_files():
    for rel in [
        "js/ai-tutor-engine.js",
        "js/ai-tutor.js",
        "ai-tutor.html",
        "css/ai-tutor.css",
    ]:
        assert (ROOT / rel).exists(), rel
    print("  PASS: Phase 5 files exist")


def test_question_integration():
    html = (ROOT / "question.html").read_text(encoding="utf-8")
    for fid in ["ai-tutor-panel", "ai-generate-btn", "ai-explanation-output"]:
        assert fid in html, fid

    js = (ROOT / "js/question.js").read_text(encoding="utf-8")
    assert "generateAiExplanation" in js
    assert "bindAiTutorEvents" in js
    assert "runAiExplanation" in js

    css = (ROOT / "css/question.css").read_text(encoding="utf-8")
    assert ".ai-tutor-panel" in css
    print("  PASS: question page AI integration")


def test_ai_engine():
    eng = (ROOT / "js/ai-tutor-engine.js").read_text(encoding="utf-8")
    for sym in [
        "generateAiExplanation",
        "buildWhyWrong",
        "buildKeyConcept",
        "buildMemoryMethod",
        "PATTERN_COMMON_MISTAKES",
    ]:
        assert sym in eng, sym
    print("  PASS: AI tutor engine API")


def test_ai_tutor_page():
    html = (ROOT / "ai-tutor.html").read_text(encoding="utf-8")
    for fid in ["ai-wrong-list", "ai-workspace", "ai-generate-btn", "ai-explanation-output"]:
        assert fid in html, fid
    js = (ROOT / "js/ai-tutor.js").read_text(encoding="utf-8")
    assert "getWrongAnswerEntries" in js
    assert "generateAiExplanation" in js
    print("  PASS: standalone AI tutor page")


def test_explanation_sections():
    eng = (ROOT / "js/ai-tutor-engine.js").read_text(encoding="utf-8")
    for title in ["왜 틀렸는지", "핵심 개념", "암기 방법"]:
        assert title in eng, title
    print("  PASS: explanation output sections")


def test_freeze():
    manifest = json.loads((ROOT / "data/phase1-freeze-manifest.json").read_text(encoding="utf-8"))
    for name, meta in manifest["files"].items():
        d = hashlib.sha256((ROOT / "data" / name).read_bytes()).hexdigest()
        assert d == meta["sha256"], name
    print("  PASS: Phase 1 freeze unchanged")


def main():
    print("\n=== Phase 5 AI Explanation Validation ===\n")
    failed = 0
    for fn in [
        test_files,
        test_question_integration,
        test_ai_engine,
        test_ai_tutor_page,
        test_explanation_sections,
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
