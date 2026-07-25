# -*- coding: utf-8 -*-
"""Sprint-09L weakness detection tests (mirrors js/weakness-service.js rules)."""
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parents[1]
js = (root / "js/weakness-service.js").read_text(encoding="utf-8")
assert "export function detectWeakness" in js
assert "learning.weakness.v1" in js
assert "LOW_ACCURACY" in js
loop = (root / "runtime/learning-loop.js").read_text(encoding="utf-8")
assert "recordWeaknessDiagnosis" in loop
loader = (root / "js/data-loader.js").read_text(encoding="utf-8")
assert "weaknessRuntime" in loader
storage = (root / "js/storage.js").read_text(encoding="utf-8")
assert "learning.weakness.v1" in storage


def resolve_domain(pattern_id):
    return "cost" if str(pattern_id).startswith("COST_") else "concept"


def detect_weakness(mastery, context=None):
    context = context or {}
    pattern_id = mastery.get("patternId") or ""
    attempts = int(mastery.get("attempts") or 0)
    incorrect = int(mastery.get("incorrectCount") or 0)
    accuracy = mastery.get("accuracy")
    signals = []

    if attempts >= 3 and accuracy is not None and accuracy < 0.6:
        signals.append({"type": "LOW_ACCURACY", "count": max(1, incorrect), "severity": "medium"})
    if incorrect >= 3:
        signals.append({"type": "REPEATED_MISS", "count": incorrect, "severity": "medium"})
    if context.get("lastCorrect") is False and pattern_id:
        t = "CALCULATION_ERROR" if resolve_domain(pattern_id) == "cost" else "CONCEPT_ERROR"
        signals.append({"type": t, "count": 1, "severity": "medium"})
    duration = context.get("durationMs")
    if duration is not None and duration >= 120000:
        signals.append({"type": "SLOW_RESPONSE", "count": 1, "severity": "medium"})
    return {"patternId": pattern_id, "weaknessSignals": signals}


# LOW_ACCURACY + REPEATED_MISS
m = {
    "patternId": "ACC_INV_001",
    "attempts": 5,
    "correctCount": 1,
    "incorrectCount": 4,
    "accuracy": 0.2,
}
d = detect_weakness(m, {"lastCorrect": False})
types = {s["type"] for s in d["weaknessSignals"]}
assert "LOW_ACCURACY" in types
assert "REPEATED_MISS" in types
assert "CONCEPT_ERROR" in types
assert "CALCULATION_ERROR" not in types

# COST domain → CALCULATION_ERROR
m2 = {
    "patternId": "COST_CVP_001",
    "attempts": 2,
    "correctCount": 0,
    "incorrectCount": 2,
    "accuracy": 0.0,
}
d2 = detect_weakness(m2, {"lastCorrect": False})
types2 = {s["type"] for s in d2["weaknessSignals"]}
assert "CALCULATION_ERROR" in types2
assert "CONCEPT_ERROR" not in types2

# SLOW_RESPONSE only with duration
d3 = detect_weakness(m2, {"lastCorrect": True, "durationMs": 130000})
assert any(s["type"] == "SLOW_RESPONSE" for s in d3["weaknessSignals"])

# question-db untouched
qsha_expected = "66c92f0b416a03cb0c58e942d8812dfd42f8fefc42c53fea54d7c4be4e8b3a20"
import hashlib

h = hashlib.sha256((root / "data/question-db-mvp.json").read_bytes()).hexdigest()
assert h == qsha_expected
qs = json.loads((root / "data/question-db-mvp.json").read_text(encoding="utf-8"))["questions"]
assert len(qs) == 240

print("Sprint-09L weakness runtime tests: PASS")
