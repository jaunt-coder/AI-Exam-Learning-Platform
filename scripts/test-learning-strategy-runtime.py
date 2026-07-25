# -*- coding: utf-8 -*-
"""Sprint-09N Learning Strategy resolver tests."""
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]

ACTION_TO_STRATEGY = {
    "RETRY_PATTERN": {
        "strategyType": "PATTERN_RETRY_SET",
        "nextAction": "SOLVE_PATTERN_SET",
        "questionCount": 5,
        "reviewAfterDays": 3,
    },
    "REVIEW_CONCEPT": {
        "strategyType": "CONCEPT_REVIEW_SET",
        "nextAction": "REVIEW_CONCEPT_CARD",
        "questionCount": 3,
        "reviewAfterDays": 2,
    },
    "PRACTICE_CALCULATION": {
        "strategyType": "CALC_DRILL_SET",
        "nextAction": "SOLVE_CALCULATION_DRILL",
        "questionCount": 5,
        "reviewAfterDays": 3,
    },
    "MOCK_TEST": {
        "strategyType": "TIMED_PRACTICE",
        "nextAction": "MINI_TEST",
        "questionCount": 10,
        "reviewAfterDays": 7,
    },
}


def resolve_strategy_from_plan(plan):
    mapping = ACTION_TO_STRATEGY.get(plan.get("actionType"))
    if not mapping:
        return None
    pattern_id = plan.get("patternId") or plan.get("target")
    if not pattern_id:
        return None
    return {
        "patternId": pattern_id,
        "sourcePlanId": plan.get("planId"),
        **mapping,
    }


# Test 1
s1 = resolve_strategy_from_plan(
    {"actionType": "RETRY_PATTERN", "patternId": "COST_CVP_001"}
)
assert s1["strategyType"] == "PATTERN_RETRY_SET"
assert s1["nextAction"] == "SOLVE_PATTERN_SET"
assert s1["questionCount"] == 5

# Test 2
s2 = resolve_strategy_from_plan(
    {"actionType": "PRACTICE_CALCULATION", "patternId": "COST_STD_001"}
)
assert s2["strategyType"] == "CALC_DRILL_SET"

# Test 3
s3 = resolve_strategy_from_plan({"actionType": "REVIEW_CONCEPT", "patternId": "ACC_INV_001"})
assert s3["strategyType"] == "CONCEPT_REVIEW_SET"

# File / wiring checks
js = (root / "js/learning-strategy-service.js").read_text(encoding="utf-8")
assert "export function resolveStrategyFromPlan" in js
assert "learning.strategy.v1" in js
assert "PATTERN_RETRY_SET" in js
loop = (root / "runtime/learning-loop.js").read_text(encoding="utf-8")
assert "recordStrategiesFromPlans" in loop
loader = (root / "js/data-loader.js").read_text(encoding="utf-8")
assert "strategyContract" in loader
assert "connected: true" in loader
storage = (root / "js/storage.js").read_text(encoding="utf-8")
assert "learning.strategy.v1" in storage
schema = json.loads((root / "data/learning-strategy-schema.json").read_text(encoding="utf-8"))
assert schema["schemaVersion"] == "v1"

# Dataset freeze
qsha = hashlib.sha256((root / "data/question-db-mvp.json").read_bytes()).hexdigest()
assert qsha == "66c92f0b416a03cb0c58e942d8812dfd42f8fefc42c53fea54d7c4be4e8b3a20"
qs = json.loads((root / "data/question-db-mvp.json").read_text(encoding="utf-8"))["questions"]
ps = json.loads((root / "data/pattern-db-mvp.json").read_text(encoding="utf-8"))


def eff(q):
    return q["primaryPattern"] if q.get("primaryPattern") is not None else q.get("patternId")


assert len(qs) == 240
assert sum(1 for q in qs if q.get("primaryPattern")) == 20
mism = sum(
    1
    for p in ps
    if p.get("frequency") != sum(1 for q in qs if eff(q) == p["patternId"])
)
assert mism == 0

print("Sprint-09N learning strategy runtime tests: PASS")
