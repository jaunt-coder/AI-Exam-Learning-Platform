# -*- coding: utf-8 -*-
"""Sprint-10E — Learning Dashboard tests."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPECTED_QSHA = "66c92f0b416a03cb0c58e942d8812dfd42f8fefc42c53fea54d7c4be4e8b3a20"


def effective_pattern(q):
    return q["primaryPattern"] if q.get("primaryPattern") is not None else q.get("patternId")


def map_mastery_bucket(entry):
    level = entry.get("masteryLevel") or "UNKNOWN"
    if level == "MASTERED":
        return "MASTERED"
    if level == "RETRY_REQUIRED":
        return "RETRY_REQUIRED"
    if level in ("LEARNING", "UNKNOWN"):
        return "LEARNING"
    if level == "DEVELOPING":
        acc = entry.get("accuracy") if isinstance(entry.get("accuracy"), (int, float)) else 0
        return "PROFICIENT" if acc >= 0.8 else "PRACTICING"
    return "LEARNING"


def calculate_study_progress(session):
    if not session:
        return {"completed": 0, "total": 0, "remaining": 0, "percent": 0, "label": "0 / 0"}
    qids = session.get("questionIds") or []
    done = session.get("completedQuestions") or []
    rem = session.get("remainingQuestions")
    if rem is None:
        rem = [i for i in qids if i not in done]
    total = len(qids)
    completed = len(done)
    remaining = len(rem)
    percent = round(completed / total * 100) if total else 0
    return {
        "completed": completed,
        "total": total,
        "remaining": remaining,
        "percent": percent,
        "label": f"{completed} / {total}",
        "estimatedMinutes": session.get("estimatedMinutes") or total * 3,
        "estimatedMinutesRemaining": remaining * 3,
        "strategyType": session.get("strategyType"),
        "active": session.get("status") == "ACTIVE",
    }


def build_dashboard_summary(stores):
    mastery_counts = {
        "MASTERED": 0,
        "PROFICIENT": 0,
        "PRACTICING": 0,
        "LEARNING": 0,
        "RETRY_REQUIRED": 0,
    }
    for e in (stores.get("mastery") or {}).get("patterns") or []:
        mastery_counts[map_mastery_bucket(e)] += 1

    weakness_counts = {
        "LOW_ACCURACY": 0,
        "REPEATED_MISS": 0,
        "CALCULATION_ERROR": 0,
        "CONCEPT_ERROR": 0,
        "SLOW_RESPONSE": 0,
    }
    for e in (stores.get("weakness") or {}).get("patterns") or []:
        for s in e.get("activeSignals") or e.get("signals") or []:
            t = s.get("type")
            if t in weakness_counts:
                weakness_counts[t] += 1

    plans = [
        p
        for p in (stores.get("plans") or {}).get("plans") or []
        if p.get("status") in ("GENERATED", "ACTIVE", None)
    ]
    plans.sort(key=lambda p: (-(p.get("priority") or 0), p.get("actionType") or ""))
    strategies = (stores.get("strategies") or {}).get("strategies") or []
    session = stores.get("session")
    progress = calculate_study_progress(session)
    return {
        "masterySummary": mastery_counts,
        "weaknessSummary": weakness_counts,
        "todaysPlans": plans,
        "todaysStrategies": strategies,
        "todayStudy": {
            "activeSession": progress["active"],
            "remainingQuestions": progress["remaining"],
            "completedQuestions": progress["completed"],
            "estimatedMinutes": progress["estimatedMinutes"],
            "strategyType": progress.get("strategyType"),
        },
        "studySession": {"progress": progress},
        "storageKeys": [
            "learning.mastery.v1",
            "learning.weakness.v1",
            "learning.plan.v1",
            "learning.strategy.v1",
            "learning.session.v1",
        ],
    }


# Freeze
qpath = ROOT / "data/question-db-mvp.json"
assert hashlib.sha256(qpath.read_bytes()).hexdigest() == EXPECTED_QSHA
qs = json.loads(qpath.read_text(encoding="utf-8"))["questions"]
ps = json.loads((ROOT / "data/pattern-db-mvp.json").read_text(encoding="utf-8"))
assert len(qs) == 240
assert sum(1 for q in qs if q.get("primaryPattern")) == 20
assert (
    sum(
        1
        for p in ps
        if p.get("frequency")
        != sum(1 for q in qs if effective_pattern(q) == p["patternId"])
    )
    == 0
)

# Progress 12/30 = 40%
progress = calculate_study_progress(
    {
        "questionIds": [f"Q{i:02d}" for i in range(30)],
        "completedQuestions": [f"Q{i:02d}" for i in range(12)],
        "remainingQuestions": [f"Q{i:02d}" for i in range(12, 30)],
        "estimatedMinutes": 90,
        "strategyType": "PATTERN_RETRY_SET",
        "status": "ACTIVE",
    }
)
assert progress["label"] == "12 / 30"
assert progress["percent"] == 40
assert progress["remaining"] == 18
assert progress["active"] is True

# Mastery buckets
summary = build_dashboard_summary(
    {
        "mastery": {
            "patterns": [
                {"masteryLevel": "MASTERED", "accuracy": 0.9},
                {"masteryLevel": "DEVELOPING", "accuracy": 0.85},
                {"masteryLevel": "DEVELOPING", "accuracy": 0.5},
                {"masteryLevel": "LEARNING", "accuracy": 1.0},
                {"masteryLevel": "RETRY_REQUIRED", "accuracy": 0.2},
            ]
        },
        "weakness": {
            "patterns": [
                {
                    "signals": [
                        {"type": "LOW_ACCURACY"},
                        {"type": "CONCEPT_ERROR"},
                    ]
                }
            ]
        },
        "plans": {
            "plans": [
                {
                    "patternId": "A",
                    "actionType": "RETRY_PATTERN",
                    "priority": 1,
                    "status": "GENERATED",
                    "attemptCount": 2,
                },
                {
                    "patternId": "B",
                    "actionType": "REVIEW_CONCEPT",
                    "priority": 3,
                    "status": "ACTIVE",
                    "attemptCount": 1,
                },
                {
                    "patternId": "C",
                    "actionType": "MOCK_TEST",
                    "priority": 9,
                    "status": "COMPLETED",
                },
            ]
        },
        "strategies": {
            "strategies": [
                {
                    "patternId": "A",
                    "strategyType": "PATTERN_RETRY_SET",
                    "status": "READY",
                }
            ]
        },
        "session": {
            "questionIds": [f"Q{i:02d}" for i in range(30)],
            "completedQuestions": [f"Q{i:02d}" for i in range(12)],
            "remainingQuestions": [f"Q{i:02d}" for i in range(12, 30)],
            "estimatedMinutes": 90,
            "strategyType": "PATTERN_RETRY_SET",
            "status": "ACTIVE",
        },
    }
)
assert summary["masterySummary"]["MASTERED"] == 1
assert summary["masterySummary"]["PROFICIENT"] == 1
assert summary["masterySummary"]["PRACTICING"] == 1
assert summary["masterySummary"]["LEARNING"] == 1
assert summary["masterySummary"]["RETRY_REQUIRED"] == 1
assert summary["weaknessSummary"]["LOW_ACCURACY"] == 1
assert summary["weaknessSummary"]["CONCEPT_ERROR"] == 1
assert len(summary["todaysPlans"]) == 2
assert summary["todaysPlans"][0]["patternId"] == "B"  # higher priority
assert len(summary["todaysStrategies"]) == 1
assert summary["studySession"]["progress"]["percent"] == 40
assert len(summary["storageKeys"]) == 5

# Files / wiring
svc = (ROOT / "js/dashboard-service.js").read_text(encoding="utf-8")
assert "export function loadDashboard" in svc
assert "export function buildDashboardSummary" in svc
assert "export function calculateStudyProgress" in svc

page = (ROOT / "js/learning-dashboard-page.js").read_text(encoding="utf-8")
assert "loadDashboard" in page

html = (ROOT / "dashboard.html").read_text(encoding="utf-8")
for card in (
    "card-today-study",
    "card-mastery",
    "card-weakness",
    "card-plans",
    "card-strategies",
    "card-session",
):
    assert card in html

loader = (ROOT / "js/data-loader.js").read_text(encoding="utf-8")
assert "dashboardContract" in loader
idx = loader.index("const dashboardContract")
chunk = loader[idx : idx + 220]
assert "enabled: true" in chunk
assert "connected: true" in chunk
assert "schemaVersion: 'v1'" in chunk

# Runtime not heavily touched this sprint — learning-loop should still have study session
loop = (ROOT / "runtime/learning-loop.js").read_text(encoding="utf-8")
assert "buildStudySession" in loop

index = (ROOT / "index.html").read_text(encoding="utf-8")
assert "dashboard.html" in index

print("Sprint-10E learning dashboard tests: PASS")
print(f"  progress={progress['label']} ({progress['percent']}%); plans={len(summary['todaysPlans'])}")
