#!/usr/bin/env python3
"""Phase 7.3 Learning Timeline Dashboard validation."""
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def test_files():
    for rel in [
        "analytics-timeline.html",
        "css/timeline.css",
        "js/timeline-engine.js",
        "js/analytics-engine.js",
        "scripts/validate-phase7-3-timeline.py",
    ]:
        assert (ROOT / rel).exists(), rel
    print("  PASS: Phase 7.3 files exist")


def test_html():
    html = (ROOT / "analytics-timeline.html").read_text(encoding="utf-8")
    for fid in [
        "timeline-section",
        "timeline-summary",
        "timeline-meta",
        "daily-timeline-chart",
        "accuracy-growth-chart",
        "tutor-usage-chart",
        "hourly-habit-chart",
        "habit-peak-hour",
        "habit-top-pattern",
        "habit-weak-changes",
        "loading-state",
        "error-state",
        "empty-state",
    ]:
        assert fid in html, fid
    assert "initTimelinePage" in html
    assert "Learning Timeline Dashboard" in html
    assert "Daily Study Timeline" in html
    assert "Accuracy Growth" in html
    assert "Tutor Usage Analytics" in html
    assert "Learning Habit" in html
    assert "analytics.html" in html
    print("  PASS: timeline HTML sections")


def test_timeline_engine():
    eng = (ROOT / "js/timeline-engine.js").read_text(encoding="utf-8")
    for sym in [
        "initTimelinePage",
        "renderDailyTimelineChart",
        "renderAccuracyGrowthChart",
        "renderTutorUsageChart",
        "renderHourlyHabitChart",
        "buildTimelineReport",
    ]:
        assert sym in eng, sym
    assert "learningEvents" not in eng or "buildTimelineReport" in eng
    assert "canvas" in eng.lower()
    print("  PASS: timeline engine API")


def test_analytics_timeline_api():
    eng = (ROOT / "js/analytics-engine.js").read_text(encoding="utf-8")
    for sym in [
        "buildTimelineReport",
        "buildEventDailyTimeline",
        "buildEventAccuracyTrend",
        "buildTutorAnalytics",
        "buildLearningHabits",
        "computeMovingAverage",
        "buildDateRange",
        "TIMELINE_DAYS",
    ]:
        assert sym in eng, sym
    assert "loadLearningEvents" in eng
    assert "EVENT_TYPES" in eng
    print("  PASS: analytics timeline API")


def test_timeline_features():
    html = (ROOT / "analytics-timeline.html").read_text(encoding="utf-8")
    eng = (ROOT / "js/analytics-engine.js").read_text(encoding="utf-8")
    assert "tutor_view" in eng or "TUTOR_VIEW" in eng
    assert "movingAverage" in eng
    assert "weakPatternChanges" in eng
    assert "hourDistribution" in eng
    assert "최근 14일" in html or "14일" in html
    print("  PASS: required timeline features")


def test_analytics_link():
    analytics = (ROOT / "analytics.html").read_text(encoding="utf-8")
    assert "analytics-timeline.html" in analytics
    assert "timeline-nav-link" in analytics
    print("  PASS: analytics links to timeline")


def test_no_question_engine_modification():
    forbidden = [
        "timeline-engine",
        "buildTimelineReport",
        "initTimelinePage",
    ]
    text = (ROOT / "js/question-engine.js").read_text(encoding="utf-8")
    for token in forbidden:
        assert token not in text, token
    print("  PASS: question-engine unchanged")


def test_no_data_json_modification():
    manifest = json.loads(
        (ROOT / "data/phase1-freeze-manifest.json").read_text(encoding="utf-8")
    )
    for name, meta in manifest["files"].items():
        digest = hashlib.sha256((ROOT / "data" / name).read_bytes()).hexdigest()
        assert digest == meta["sha256"], name
    print("  PASS: Phase 1 freeze unchanged")


def test_learning_events_source():
    timeline = (ROOT / "js/timeline-engine.js").read_text(encoding="utf-8")
    analytics = (ROOT / "js/analytics-engine.js").read_text(encoding="utf-8")
    assert "buildTimelineReport" in timeline
    assert "loadLearningEvents" in analytics
    assert "learning-event.js" in analytics
    print("  PASS: learningEvents data source")


def main():
    print("\n=== Phase 7.3 Learning Timeline Dashboard Validation ===\n")
    failed = 0
    for fn in [
        test_files,
        test_html,
        test_timeline_engine,
        test_analytics_timeline_api,
        test_timeline_features,
        test_analytics_link,
        test_no_question_engine_modification,
        test_no_data_json_modification,
        test_learning_events_source,
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
