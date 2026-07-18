#!/usr/bin/env python3
"""Phase 7.2 Learning Event Tracking validation."""
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def test_files():
    for rel in [
        "js/learning-event.js",
        "js/storage.js",
        "js/question-engine.js",
        "js/question.js",
        "js/exam.js",
        "js/analytics-engine.js",
        "scripts/validate-phase7-2-learning-events.py",
    ]:
        assert (ROOT / rel).exists(), rel
    print("  PASS: Phase 7.2 files exist")


def test_storage_key():
    storage = (ROOT / "js/storage.js").read_text(encoding="utf-8")
    assert "LEARNING_EVENTS: 'learningEvents'" in storage
    assert "RECENT_STUDY: 'recentStudy'" in storage
    print("  PASS: storage keys include learningEvents")


def test_learning_event_api():
    eng = (ROOT / "js/learning-event.js").read_text(encoding="utf-8")
    for sym in [
        "EVENT_TYPES",
        "loadLearningEvents",
        "saveLearningEvents",
        "buildLearningEvent",
        "appendLearningEvent",
        "trackQuestionStart",
        "trackQuestionAnswer",
        "trackTutorView",
        "trackExamComplete",
        "syncRecentStudyFromEvent",
        "computeTotalDurationSeconds",
        "computeTotalDurationMinutes",
        "buildDailyStudyMinutes",
    ]:
        assert sym in eng, sym
    for evt in [
        "question_start",
        "question_answer",
        "tutor_view",
        "exam_complete",
    ]:
        assert evt in eng, evt
    for field in [
        "eventId",
        "timestamp",
        "questionId",
        "patternId",
        "duration",
        "correct",
        "usedTutor",
    ]:
        assert field in eng, field
    print("  PASS: learning event API")


def test_question_integration():
    q = (ROOT / "js/question.js").read_text(encoding="utf-8")
    assert "trackQuestionStart" in q
    assert "trackTutorView" in q
    assert "trackLearningEvent: true" in q
    assert "learning-event.js" in q
    print("  PASS: question page event hooks")


def test_question_engine_integration():
    eng = (ROOT / "js/question-engine.js").read_text(encoding="utf-8")
    assert "trackLearningEvent" in eng
    assert "trackQuestionAnswer" in eng
    assert "learning-event.js" in eng
    print("  PASS: question engine optional event tracking")


def test_exam_integration():
    exam = (ROOT / "js/exam.js").read_text(encoding="utf-8")
    assert "trackExamComplete" in exam
    assert "learning-event.js" in exam
    print("  PASS: exam complete event hook")


def test_analytics_integration():
    eng = (ROOT / "js/analytics-engine.js").read_text(encoding="utf-8")
    assert "loadLearningEvents" in eng
    assert "computeTotalDurationMinutes" in eng
    assert "learningEventsStore" in eng or "learningEvents" in eng
    assert "learning-event.js" in eng
    print("  PASS: analytics uses learning events for study time")


def test_minimal_engine_change():
    """exam-engine 등 핵심 엔진에 learning event 코드가 침투하지 않았는지 확인."""
    forbidden = ["learning-event.js", "trackQuestionStart", "trackExamComplete"]
    for rel in [
        "js/exam-engine.js",
        "js/pattern-engine.js",
        "js/recommendation-engine.js",
        "js/data-loader.js",
    ]:
        text = (ROOT / rel).read_text(encoding="utf-8")
        for token in forbidden:
            assert token not in text, f"{rel} contains {token}"
    print("  PASS: core engines unchanged")


def test_no_data_json_modification():
    """data/*.json 직접 수정 금지 — manifest 해시만 검증."""
    manifest = json.loads(
        (ROOT / "data/phase1-freeze-manifest.json").read_text(encoding="utf-8")
    )
    for name, meta in manifest["files"].items():
        digest = hashlib.sha256((ROOT / "data" / name).read_bytes()).hexdigest()
        assert digest == meta["sha256"], name
    print("  PASS: Phase 1 freeze unchanged")


def test_event_schema_fields():
    eng = (ROOT / "js/learning-event.js").read_text(encoding="utf-8")
    assert "STORAGE_KEYS.LEARNING_EVENTS" in eng
    assert "MAX_EVENTS" in eng
    assert "syncRecentStudyFromEvent" in eng
    print("  PASS: event storage schema")


def main():
    print("\n=== Phase 7.2 Learning Event Tracking Validation ===\n")
    failed = 0
    for fn in [
        test_files,
        test_storage_key,
        test_learning_event_api,
        test_question_integration,
        test_question_engine_integration,
        test_exam_integration,
        test_analytics_integration,
        test_minimal_engine_change,
        test_no_data_json_modification,
        test_event_schema_fields,
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
