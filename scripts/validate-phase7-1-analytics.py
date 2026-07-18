#!/usr/bin/env python3
"""Phase 7.1 Analytics Dashboard validation."""
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def test_files():
    for rel in [
        "analytics.html",
        "css/analytics.css",
        "js/analytics-engine.js",
        "js/chart-engine.js",
    ]:
        assert (ROOT / rel).exists(), rel
    print("  PASS: Phase 7.1 files exist")


def test_html():
    html = (ROOT / "analytics.html").read_text(encoding="utf-8")
    for fid in [
        "analytics-section",
        "analytics-summary",
        "analytics-meta",
        "growth-chart",
        "weakness-chart",
        "weak-top-list",
        "recommend-quick-list",
        "pattern-table-body",
        "loading-state",
        "error-state",
        "empty-state",
    ]:
        assert fid in html, fid
    assert "initAnalyticsPage" in html
    assert "학습 Analytics Dashboard" in html
    assert "오늘 추천 학습" in html
    assert "Pattern 분석" in html
    print("  PASS: analytics HTML sections")


def test_analytics_engine():
    eng = (ROOT / "js/analytics-engine.js").read_text(encoding="utf-8")
    for sym in [
        "buildAnalyticsReport",
        "buildOverallStats",
        "buildPatternAnalytics",
        "buildDailyTrend",
        "buildWeakPatternsTop",
        "loadRecentStudy",
        "computeStudyTimeMinutes",
        "formatStudyTime",
        "initAnalyticsPage",
    ]:
        assert sym in eng, sym
    print("  PASS: analytics engine API")


def test_chart_engine():
    chart = (ROOT / "js/chart-engine.js").read_text(encoding="utf-8")
    for sym in [
        "renderGrowthChart",
        "renderWeaknessChart",
        "observeChartResize",
    ]:
        assert sym in chart, sym
    assert "canvas" in chart.lower()
    print("  PASS: chart engine API")


def test_input_sources():
    eng = (ROOT / "js/analytics-engine.js").read_text(encoding="utf-8")
    for src in [
        "loadProgress",
        "loadWrongAnswers",
        "STORAGE_KEYS.RECENT_STUDY",
        "loadExamHistory",
        "buildFullRecommendationReport",
        "getWeaknessScore",
        "aggregateWrongByPattern",
        "getPatternProgress",
    ]:
        assert src in eng, src
    print("  PASS: LocalStorage + recommendation input sources")


def test_analytics_features():
    eng = (ROOT / "js/analytics-engine.js").read_text(encoding="utf-8")
    html = (ROOT / "analytics.html").read_text(encoding="utf-8")
    assert "accuracyPercent" in eng or "correctPercent" in eng
    assert "weaknessScore" in eng
    assert "dailyTrend" in eng
    assert "recommendation" in eng
    assert "학습 성장 그래프" in html
    assert "취약점 분석" in html
    assert "recommendation.html" in html
    print("  PASS: required analytics features")


def test_no_engine_modification():
    """기존 엔진 파일에 Phase 7.1 analytics 코드가 추가되지 않았는지 확인."""
    forbidden = [
        "analytics-engine",
        "chart-engine",
        "initAnalyticsPage",
        "buildAnalyticsReport",
    ]
    engine_files = [
        "js/question-engine.js",
        "js/pattern-engine.js",
        "js/recommendation-engine.js",
        "js/recommendation-rules.js",
        "js/exam-engine.js",
    ]
    for rel in engine_files:
        text = (ROOT / rel).read_text(encoding="utf-8")
        for token in forbidden:
            assert token not in text, f"{rel} contains {token}"
    print("  PASS: existing engines unchanged by analytics layer")


def test_nav_integration():
    index = (ROOT / "index.html").read_text(encoding="utf-8")
    assert "analytics.html" in index
    for page in [
        "pattern.html",
        "question.html",
        "wrong-note.html",
        "ai-tutor.html",
        "exam.html",
        "recommendation.html",
    ]:
        nav = (ROOT / page).read_text(encoding="utf-8")
        assert "analytics.html" in nav, page
    print("  PASS: nav links include analytics")


def test_freeze():
    manifest = json.loads(
        (ROOT / "data/phase1-freeze-manifest.json").read_text(encoding="utf-8")
    )
    for name, meta in manifest["files"].items():
        digest = hashlib.sha256((ROOT / "data" / name).read_bytes()).hexdigest()
        assert digest == meta["sha256"], name
    print("  PASS: Phase 1 freeze unchanged")


def main():
    print("\n=== Phase 7.1 Analytics Dashboard Validation ===\n")
    failed = 0
    for fn in [
        test_files,
        test_html,
        test_analytics_engine,
        test_chart_engine,
        test_input_sources,
        test_analytics_features,
        test_no_engine_modification,
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
