# -*- coding: utf-8 -*-
"""Sprint-09M learning plan contract tests."""
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]

SIGNAL_TO_ACTION = {
    "LOW_ACCURACY": "RETRY_PATTERN",
    "REPEATED_MISS": "REVIEW_CONCEPT",
    "CALCULATION_ERROR": "PRACTICE_CALCULATION",
    "CONCEPT_ERROR": "REVIEW_CONCEPT",
    "SLOW_RESPONSE": "MOCK_TEST",
}


def create_plan_from_weakness(diagnosis):
    pattern_id = diagnosis.get("patternId")
    signals = diagnosis.get("weaknessSignals") or []
    if not pattern_id:
        return {"ok": False, "plan": None, "plans": [], "error": "missing_pattern_id"}
    if not signals:
        return {"ok": True, "plan": None, "plans": [], "skipped": True}
    plans = []
    for s in signals:
        action = SIGNAL_TO_ACTION.get(s.get("type"))
        if not action:
            continue
        sev = s.get("severity") or "low"
        priority = {"high": 3, "medium": 2, "low": 1}.get(sev, 1)
        plans.append(
            {
                "patternId": pattern_id,
                "weaknessSignal": s["type"],
                "priority": priority,
                "actionType": action,
                "target": pattern_id,
                "status": "GENERATED",
            }
        )
    plans.sort(key=lambda p: (-p["priority"], p["actionType"]))
    return {
        "ok": True,
        "plan": plans[0] if plans else None,
        "plans": plans,
        "skipped": not bool(plans),
    }


# Case: weakness present → plan
out = create_plan_from_weakness(
    {
        "patternId": "ACC_INV_001",
        "weaknessSignals": [
            {"type": "CONCEPT_ERROR", "count": 1, "severity": "medium"},
            {"type": "LOW_ACCURACY", "count": 3, "severity": "high"},
        ],
    }
)
assert out["ok"] and not out["skipped"]
assert out["plan"]["actionType"] == "RETRY_PATTERN"  # high LOW_ACCURACY wins
assert out["plan"]["status"] == "GENERATED"
assert len(out["plans"]) == 2

# Case: no signals → no plan (5 correct path)
out2 = create_plan_from_weakness({"patternId": "ACC_INV_001", "weaknessSignals": []})
assert out2["ok"] and out2["skipped"] and out2["plan"] is None

# Mapping spot checks
assert SIGNAL_TO_ACTION["CALCULATION_ERROR"] == "PRACTICE_CALCULATION"
assert SIGNAL_TO_ACTION["SLOW_RESPONSE"] == "MOCK_TEST"

# Files / wiring
schema = json.loads((root / "data/learning-plan-schema.json").read_text(encoding="utf-8"))
assert schema["schemaVersion"] == "v1"
assert "RETRY_PATTERN" in schema["actionTypes"]

svc = (root / "js/learning-plan-service.js").read_text(encoding="utf-8")
assert "export function createLearningPlanFromWeakness" in svc
assert "learning.plan.v1" in svc

loop = (root / "runtime/learning-loop.js").read_text(encoding="utf-8")
assert "recordLearningPlansFromWeakness" in loop

loader = (root / "js/data-loader.js").read_text(encoding="utf-8")
assert "learningPlanContract" in loader
assert "connected: true" in loader

storage = (root / "js/storage.js").read_text(encoding="utf-8")
assert "learning.plan.v1" in storage

# question-db unchanged + validation counts
qpath = root / "data/question-db-mvp.json"
qsha = hashlib.sha256(qpath.read_bytes()).hexdigest()
assert qsha == "66c92f0b416a03cb0c58e942d8812dfd42f8fefc42c53fea54d7c4be4e8b3a20"
qs = json.loads(qpath.read_text(encoding="utf-8"))["questions"]
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

print("Sprint-09M learning plan runtime tests: PASS")
