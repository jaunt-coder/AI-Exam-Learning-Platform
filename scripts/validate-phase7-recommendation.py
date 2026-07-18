#!/usr/bin/env python3
"""Phase 7 Recommendation Engine validation."""
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def test_files():
    for rel in [
        "recommendation.html",
        "css/recommendation.css",
        "js/recommendation-engine.js",
        "js/recommendation-rules.js",
    ]:
        assert (ROOT / rel).exists(), rel
    print("  PASS: Phase 7 files exist")


def test_html():
    html = (ROOT / "recommendation.html").read_text(encoding="utf-8")
    for fid in [
        "recommendation-section",
        "recommend-summary",
        "recommend-meta",
        "daily-list",
        "weak-pattern-list",
        "review-list",
        "loading-state",
        "error-state",
        "empty-state",
    ]:
        assert fid in html, fid
    assert "initRecommendationPage" in html
    print("  PASS: recommendation HTML sections")


def test_recommendation_rules():
    rules = (ROOT / "js/recommendation-rules.js").read_text(encoding="utf-8")
    for sym in [
        "SCORE_WEIGHTS",
        "calculateRecommendationScore",
        "getImportanceScore",
        "getWeaknessScore",
        "getRecencyScore",
        "getExamProbabilityScore",
        "getQuestionTypeFactor",
        "calculateWrongPriority",
        "isReviewDue",
        "REVIEW_INTERVALS",
        "sortByScoreDeterministic",
        "buildPatternReasons",
        "buildQuestionReasons",
    ]:
        assert sym in rules, sym
    assert "importance: 0.4" in rules
    assert "weakness: 0.3" in rules
    assert "recency: 0.2" in rules
    assert "examProbability: 0.1" in rules
    print("  PASS: recommendation rules API")


def test_recommendation_engine():
    eng = (ROOT / "js/recommendation-engine.js").read_text(encoding="utf-8")
    for sym in [
        "buildRecommendationContext",
        "buildFullRecommendationReport",
        "buildDailyRecommendations",
        "buildWeakPatternRecommendations",
        "buildReviewRecommendations",
        "buildPatternUrl",
        "buildQuestionUrl",
        "buildTutorUrl",
        "initRecommendationPage",
    ]:
        assert sym in eng, sym
    print("  PASS: recommendation engine API")


def test_input_sources():
    eng = (ROOT / "js/recommendation-engine.js").read_text(encoding="utf-8")
    rules = (ROOT / "js/recommendation-rules.js").read_text(encoding="utf-8")
    for src in [
        "loadProgress",
        "loadWrongAnswers",
        "getQuestionOverride",
        "PATTERN_NAMES",
        "getStatisticsForPattern",
        "aggregateWrongByPattern",
    ]:
        assert src in eng, src
    assert "questionType" in rules
    assert "question-overrides" in eng
    assert "pattern-profiles" in eng
    print("  PASS: input data sources wired")


def test_recommendation_features():
    eng = (ROOT / "js/recommendation-engine.js").read_text(encoding="utf-8")
    html = (ROOT / "recommendation.html").read_text(encoding="utf-8")
    assert "reasons" in eng
    assert "buildTutorUrl" in eng
    assert "ai-tutor.html" in eng
    assert "오늘의 추천 학습" in html
    assert "취약 Pattern 추천" in html
    assert "복습 필요 문제" in html
    assert "sortByScoreDeterministic" in eng or "sortByScoreDeterministic" in (
        ROOT / "js/recommendation-rules.js"
    ).read_text(encoding="utf-8")
    print("  PASS: required recommendation features")


def test_nav_integration():
    index = (ROOT / "index.html").read_text(encoding="utf-8")
    assert "recommendation.html" in index
    for page in ["pattern.html", "question.html", "wrong-note.html", "ai-tutor.html", "exam.html"]:
        nav = (ROOT / page).read_text(encoding="utf-8")
        assert "recommendation.html" in nav, page
    print("  PASS: nav links include recommendation")


def test_freeze():
    manifest = json.loads((ROOT / "data/phase1-freeze-manifest.json").read_text(encoding="utf-8"))
    for name, meta in manifest["files"].items():
        d = hashlib.sha256((ROOT / "data" / name).read_bytes()).hexdigest()
        assert d == meta["sha256"], name
    print("  PASS: Phase 1 freeze unchanged")


def main():
    print("\n=== Phase 7 Recommendation Engine Validation ===\n")
    failed = 0
    for fn in [
        test_files,
        test_html,
        test_recommendation_rules,
        test_recommendation_engine,
        test_input_sources,
        test_recommendation_features,
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
