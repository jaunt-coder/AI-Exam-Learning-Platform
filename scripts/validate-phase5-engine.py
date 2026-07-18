#!/usr/bin/env python3
"""Phase 5 AI Tutor v2 validation."""
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def test_files():
    for rel in [
        "js/ai-tutor-engine.js",
        "js/ai-tutor-render.js",
        "js/ai-tutor.js",
        "js/ai-tutor-content/pattern-profiles.js",
        "js/ai-tutor-content/question-overrides.js",
        "js/ai-tutor-content/calculation-templates.js",
        "ai-tutor.html",
        "css/ai-tutor.css",
    ]:
        assert (ROOT / rel).exists(), rel
    print("  PASS: Phase 5 v2 files exist")


def test_no_pdf_solution_in_tutor():
    eng = (ROOT / "js/ai-tutor-engine.js").read_text(encoding="utf-8")
    assert "getSolutionDisplay" not in eng
    qjs = (ROOT / "js/question.js").read_text(encoding="utf-8")
    assert "getSolutionDisplay" not in qjs
    html = (ROOT / "question.html").read_text(encoding="utf-8")
    assert "solution-panel" not in html
    assert "solution-text" not in html
    print("  PASS: PDF 해설 UI 미노출")


def test_tutor_content_fields():
    eng = (ROOT / "js/ai-tutor-engine.js").read_text(encoding="utf-8")
    for field in [
        "generateQuestionTutorContent",
        "explanation",
        "solvingAlgorithm",
        "wrongAnswerAnalysis",
        "examinerIntent",
        "memoryTip",
        "similarTrap",
        "frequentlyConfusedWith",
    ]:
        assert field in eng, field
    print("  PASS: Question Tutor content fields")


def test_eight_sections():
    eng = (ROOT / "js/ai-tutor-engine.js").read_text(encoding="utf-8")
    sections = [
        "why-wrong",
        "solving-order",
        "exam-thinking",
        "memory-tip",
        "examiner-trap",
        "related-pattern",
        "similar-problems",
        "next-learning",
    ]
    for sid in sections:
        assert sid in eng, sid
    for title in [
        "① 왜 틀렸는가",
        "② 올바른 풀이순서",
        "③ 시험장에서 생각하는 순서",
        "④ 암기법",
        "⑤ 출제자의 함정",
        "⑥ 관련 Pattern",
        "⑦ 비슷한 문제",
        "⑧ 다음 추천학습",
    ]:
        assert title in eng, title
    print("  PASS: 8-step universal tutor structure")


def test_memory_tip_quality():
    profiles = (ROOT / "js/ai-tutor-content/pattern-profiles.js").read_text(encoding="utf-8")
    assert "두문자" in profiles or "암기법" in profiles
    assert "시험장" in profiles
    print("  PASS: memoryTip includes mnemonic/exam recall")


def test_wrong_answer_per_choice():
    eng = (ROOT / "js/ai-tutor-engine.js").read_text(encoding="utf-8")
    assert "buildWrongAnswerAnalysis" in eng or "formatOverrideWrongAnalysis" in eng
    assert "wrongAnswerAnalysis" in eng
    assert "getQuestionOverride" in eng
    print("  PASS: per-choice wrong answer analysis (override-aware)")


def test_renderer():
    rjs = (ROOT / "js/ai-tutor-render.js").read_text(encoding="utf-8")
    assert "renderTutorLesson" in rjs
    assert "tutor-section-nav" in rjs
    qjs = (ROOT / "js/question.js").read_text(encoding="utf-8")
    assert "renderTutorLesson" in qjs
    assert "generateTutorLesson" in qjs
    print("  PASS: shared tutor renderer")


def test_freeze():
    manifest = json.loads((ROOT / "data/phase1-freeze-manifest.json").read_text(encoding="utf-8"))
    for name, meta in manifest["files"].items():
        d = hashlib.sha256((ROOT / "data" / name).read_bytes()).hexdigest()
        assert d == meta["sha256"], name
    print("  PASS: Phase 1 freeze unchanged")


def main():
    print("\n=== Phase 5 AI Tutor v2 Validation ===\n")
    failed = 0
    for fn in [
        test_files,
        test_no_pdf_solution_in_tutor,
        test_tutor_content_fields,
        test_eight_sections,
        test_memory_tip_quality,
        test_wrong_answer_per_choice,
        test_renderer,
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
