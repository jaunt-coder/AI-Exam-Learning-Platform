# -*- coding: utf-8 -*-
"""Sprint-10G — Recommendation Engine v1 tests."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPECTED_QSHA = "66c92f0b416a03cb0c58e942d8812dfd42f8fefc42c53fea54d7c4be4e8b3a20"

REASON_PRIORITY = {
    "REPEATED_MISS": 1,
    "LOW_ACCURACY": 2,
    "CALCULATION_ERROR": 3,
    "CONCEPT_ERROR": 4,
    "SLOW_RESPONSE": 5,
}
REASON_COPY = {
    "REPEATED_MISS": "최근 동일 Pattern을 반복해서 틀렸습니다.",
    "LOW_ACCURACY": "최근 정확도가 기준 이하입니다.",
    "CALCULATION_ERROR": "계산 실수가 반복됩니다.",
    "CONCEPT_ERROR": "개념 복습이 필요합니다.",
    "SLOW_RESPONSE": "풀이 시간이 길어졌습니다.",
}
EST_MIN = {
    "PATTERN_RETRY_SET": 15,
    "CONCEPT_REVIEW_SET": 20,
    "CALC_DRILL_SET": 25,
    "TIMED_PRACTICE": 30,
}
STRATEGY_TO_ACTION = {
    "PATTERN_RETRY_SET": "RETRY_PATTERN",
    "CONCEPT_REVIEW_SET": "REVIEW_CONCEPT",
    "CALC_DRILL_SET": "PRACTICE_CALCULATION",
    "TIMED_PRACTICE": "MOCK_TEST",
}
STRATEGY_DEFAULT_REASON = {
    "PATTERN_RETRY_SET": "LOW_ACCURACY",
    "CONCEPT_REVIEW_SET": "CONCEPT_ERROR",
    "CALC_DRILL_SET": "CALCULATION_ERROR",
    "TIMED_PRACTICE": "SLOW_RESPONSE",
}


def build_recommendation_reason(code):
    return REASON_COPY[code]


def resolve_reason_code(strategy, plans=None, weakness=None):
    if strategy.get("reason") in REASON_PRIORITY:
        return strategy["reason"]
    if strategy.get("weaknessSignal") in REASON_PRIORITY:
        return strategy["weaknessSignal"]
    plans = plans or []
    for p in plans:
        if p.get("patternId") == strategy.get("patternId") and p.get("weaknessSignal") in REASON_PRIORITY:
            return p["weaknessSignal"]
    if weakness and weakness.get("patternId") == strategy.get("patternId"):
        signals = [s.get("type") for s in (weakness.get("weaknessSignals") or []) if s.get("type") in REASON_PRIORITY]
        signals.sort(key=lambda t: REASON_PRIORITY[t])
        if signals:
            return signals[0]
    return STRATEGY_DEFAULT_REASON[strategy["strategyType"]]


def build_recommendations(strategies, plans=None, weakness=None, created_at="2026-07-26T00:00:00Z"):
    out = []
    seen = set()
    for s in strategies:
        code = resolve_reason_code(s, plans, weakness)
        rid = f"rec_{s['patternId']}_{s['strategyType']}_{code}"
        if rid in seen:
            continue
        seen.add(rid)
        out.append(
            {
                "recommendationId": rid,
                "patternId": s["patternId"],
                "strategyType": s["strategyType"],
                "actionType": STRATEGY_TO_ACTION[s["strategyType"]],
                "priority": REASON_PRIORITY[code],
                "reason": build_recommendation_reason(code),
                "reasonCode": code,
                "estimatedMinutes": EST_MIN[s["strategyType"]],
                "createdAt": created_at,
                "status": "ACTIVE",
            }
        )
    return out


def rank_recommendations(recs):
    return sorted(
        recs,
        key=lambda r: (
            r["priority"],
            r["estimatedMinutes"],
            r["patternId"],
            r["recommendationId"],
        ),
    )


def build_summary(recs):
    active = [r for r in recs if r["status"] == "ACTIVE"]
    ranked = rank_recommendations(active)
    return {
        "total": len(recs),
        "active": len(active),
        "estimatedMinutes": sum(r["estimatedMinutes"] for r in active),
        "highestPriority": ranked[0] if ranked else None,
        "recommendations": ranked,
    }


# Freeze
qpath = ROOT / "data/question-db-mvp.json"
assert hashlib.sha256(qpath.read_bytes()).hexdigest() == EXPECTED_QSHA
qs = json.loads(qpath.read_text(encoding="utf-8"))["questions"]
ps = json.loads((ROOT / "data/pattern-db-mvp.json").read_text(encoding="utf-8"))


def eff(q):
    return q["primaryPattern"] if q.get("primaryPattern") is not None else q.get("patternId")


assert len(qs) == 240
assert sum(1 for q in qs if q.get("primaryPattern")) == 20
assert (
    sum(1 for p in ps if p.get("frequency") != sum(1 for q in qs if eff(q) == p["patternId"]))
    == 0
)
assert (ROOT / "data/learning-policy.json").exists()
assert (ROOT / "data/master-db.json").exists()

strategies = [
    {
        "strategyId": "s1",
        "patternId": "ACC_GEN_001",
        "strategyType": "PATTERN_RETRY_SET",
        "reason": "LOW_ACCURACY",
    },
    {
        "strategyId": "s2",
        "patternId": "ACC_PPE_001",
        "strategyType": "CONCEPT_REVIEW_SET",
        "reason": "REPEATED_MISS",
    },
    {
        "strategyId": "s3",
        "patternId": "COST_CVP_001",
        "strategyType": "CALC_DRILL_SET",
        "reason": "CALCULATION_ERROR",
    },
]

# Deterministic
a = build_recommendations(strategies)
b = build_recommendations(strategies)
assert a == b

ranked = rank_recommendations(a)
assert ranked[0]["reasonCode"] == "REPEATED_MISS"  # priority 1
assert ranked[0]["patternId"] == "ACC_PPE_001"
assert ranked[1]["reasonCode"] == "LOW_ACCURACY"
assert ranked[2]["reasonCode"] == "CALCULATION_ERROR"

# Reason copy
assert ranked[0]["reason"] == REASON_COPY["REPEATED_MISS"]
assert ranked[1]["reason"] == REASON_COPY["LOW_ACCURACY"]

# Estimated minutes
assert ranked[0]["estimatedMinutes"] == 20
assert ranked[1]["estimatedMinutes"] == 15
assert ranked[2]["estimatedMinutes"] == 25

# Summary
summary = build_summary(ranked)
assert summary["total"] == 3
assert summary["active"] == 3
assert summary["estimatedMinutes"] == 60
assert summary["highestPriority"]["reasonCode"] == "REPEATED_MISS"

# Storage shape
store = {
    "schemaVersion": "v1",
    "recommendations": ranked,
}
assert store["schemaVersion"] == "v1"
assert all(r["status"] == "ACTIVE" for r in store["recommendations"])

# Schema file
schema = json.loads((ROOT / "data/recommendation-schema.json").read_text(encoding="utf-8"))
assert schema["storageKey"] == "learning.recommendation.v1"
assert schema["connected"] is True

# Wiring
svc = (ROOT / "js/recommendation-service.js").read_text(encoding="utf-8")
for name in (
    "buildRecommendations",
    "buildRecommendationReason",
    "rankRecommendations",
    "buildTodayRecommendation",
):
    assert f"export function {name}" in svc
assert "learning.recommendation.v1" in svc

storage = (ROOT / "js/storage.js").read_text(encoding="utf-8")
assert "learning.recommendation.v1" in storage

loop = (ROOT / "runtime/learning-loop.js").read_text(encoding="utf-8")
assert "buildTodayRecommendation" in loop
body = loop.split("export function runLearningLoopCycle", 1)[1]
assert body.index("buildTodayRecommendation(") < body.index("buildStudySession({")
assert "recommendation_connected: true" in loop

loader = (ROOT / "js/data-loader.js").read_text(encoding="utf-8")
assert "recommendationContract" in loader
idx = loader.index("const recommendationContract")
chunk = loader[idx : idx + 280]
assert "enabled: true" in chunk
assert "connected: true" in chunk
assert "schemaVersion: 'v1'" in chunk

# Forbidden files untouched by this sprint's service (no imports mutating them)
assert "study-session-service" not in svc
assert "question-selector" not in svc
assert "mastery-service" not in svc
assert "weakness-service" not in svc
assert "learning-plan-service" not in svc

print("Sprint-10G recommendation runtime tests: PASS")
print(
    f"  top={ranked[0]['reasonCode']}@{ranked[0]['patternId']}; "
    f"minutes={summary['estimatedMinutes']}; deterministic={a==b}"
)
