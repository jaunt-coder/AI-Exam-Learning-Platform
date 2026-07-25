# -*- coding: utf-8 -*-
"""Sprint-09K mastery policy tests (mirrors js/mastery-service.js rules)."""
import json
from pathlib import Path


def compute_mastery_level(attempts, accuracy):
    n = int(attempts or 0)
    if n == 0:
        return "UNKNOWN"
    if n < 3:
        return "LEARNING"
    acc = float(accuracy) if accuracy is not None else 0.0
    if acc < 0.5:
        return "RETRY_REQUIRED"
    if n >= 5 and acc >= 0.8:
        return "MASTERED"
    if acc < 0.8:
        return "DEVELOPING"
    return "DEVELOPING"


def update_pattern_mastery(entry, correct):
    next_e = dict(entry)
    next_e["attempts"] = int(next_e.get("attempts") or 0) + 1
    if correct:
        next_e["correctCount"] = int(next_e.get("correctCount") or 0) + 1
    else:
        next_e["incorrectCount"] = int(next_e.get("incorrectCount") or 0) + 1
    next_e["correctCount"] = int(next_e.get("correctCount") or 0)
    next_e["incorrectCount"] = int(next_e.get("incorrectCount") or 0)
    next_e["accuracy"] = next_e["correctCount"] / next_e["attempts"]
    next_e["masteryLevel"] = compute_mastery_level(next_e["attempts"], next_e["accuracy"])
    return next_e


def empty(pattern_id):
    return {
        "patternId": pattern_id,
        "studentId": "test",
        "attempts": 0,
        "correctCount": 0,
        "incorrectCount": 0,
        "accuracy": None,
        "masteryLevel": "UNKNOWN",
        "lastAttemptAt": None,
        "weaknessSignals": [],
    }


assert compute_mastery_level(0, None) == "UNKNOWN"
assert compute_mastery_level(1, 1) == "LEARNING"
assert compute_mastery_level(5, 0.8) == "MASTERED"
assert compute_mastery_level(5, 0.4) == "RETRY_REQUIRED"

# Case 1: Attempt 1 UNKNOWN → LEARNING
e = empty("ACC_INV_001")
assert e["masteryLevel"] == "UNKNOWN"
e = update_pattern_mastery(e, True)
assert e["masteryLevel"] == "LEARNING"
assert e["attempts"] == 1

# Case 2: 5 attempts / 4 correct → MASTERED
e = empty("COST_CVP_001")
for correct in [True, True, True, True, False]:
    e = update_pattern_mastery(e, correct)
assert e["attempts"] == 5 and e["correctCount"] == 4 and e["accuracy"] == 0.8
assert e["masteryLevel"] == "MASTERED"

# Case 3: 5 attempts / 2 correct → RETRY_REQUIRED
e = empty("ACC_GEN_001")
for correct in [True, True, False, False, False]:
    e = update_pattern_mastery(e, correct)
assert e["attempts"] == 5 and e["correctCount"] == 2 and e["accuracy"] == 0.4
assert e["masteryLevel"] == "RETRY_REQUIRED"

root = Path(__file__).resolve().parents[1]
qdb = json.loads((root / "data/question-db-mvp.json").read_text(encoding="utf-8"))
assert len(qdb["questions"]) == 240
js = (root / "js/mastery-service.js").read_text(encoding="utf-8")
assert "export function recordAttempt" in js
assert "learning.mastery.v1" in js
assert "export function updatePatternMastery" in js
loader = (root / "js/data-loader.js").read_text(encoding="utf-8")
assert "masteryRuntime" in loader
assert "connected: true" in loader or "connected:true" in loader.replace(" ", "")
loop = (root / "runtime/learning-loop.js").read_text(encoding="utf-8")
assert "recordAttempt" in loop

print("Sprint-09K mastery runtime tests: PASS")
