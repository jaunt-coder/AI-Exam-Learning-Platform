# -*- coding: utf-8 -*-
"""Sprint-10D — Study Session Runtime tests."""
from __future__ import annotations

import hashlib
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPECTED_QSHA = "66c92f0b416a03cb0c58e942d8812dfd42f8fefc42c53fea54d7c4be4e8b3a20"

DEFAULT_COUNTS = {
    "PATTERN_RETRY_SET": 5,
    "CONCEPT_REVIEW_SET": 3,
    "CALC_DRILL_SET": 5,
    "TIMED_PRACTICE": 10,
}


def effective_pattern(q):
    return q["primaryPattern"] if q.get("primaryPattern") is not None else q.get("patternId")


def qid(q):
    return str(q.get("questionId") or q.get("id") or "")


def select_ids(strategy, questions, exclude=None):
    exclude = set(exclude or [])
    pattern_id = strategy.get("patternId") or ""
    count = int(strategy.get("questionCount") or DEFAULT_COUNTS[strategy["strategyType"]])
    typ = strategy["strategyType"]
    cands = [q for q in questions if qid(q) and qid(q) not in exclude]
    if typ == "CALC_DRILL_SET":
        calc = [q for q in cands if q.get("hasCalculation") is True]
        same = [q for q in calc if effective_pattern(q) == pattern_id]
        cands = same or calc or [q for q in cands if effective_pattern(q) == pattern_id]
    elif typ != "TIMED_PRACTICE":
        cands = [q for q in cands if effective_pattern(q) == pattern_id]
    cands = sorted(cands, key=lambda q: qid(q))
    out = []
    for q in cands:
        i = qid(q)
        if i in out:
            continue
        out.append(i)
        if len(out) >= count:
            break
    return out


def build_question_queue(strategies, questions):
    exclude = set()
    by_pat = {}
    for s in strategies:
        ids = select_ids(s, questions, exclude)
        pid = s.get("patternId") or "MIXED"
        by_pat.setdefault(pid, [])
        for i in ids:
            if i in exclude:
                continue
            exclude.add(i)
            by_pat[pid].append(i)
    queue = [{"patternId": k, "questionIds": v} for k, v in by_pat.items() if v]
    flat = [i for g in queue for i in g["questionIds"]]
    return {"queue": queue, "questionIds": flat, "patternIds": [g["patternId"] for g in queue]}


def build_study_session(strategies, questions):
    built = build_question_queue(strategies, questions)
    return {
        "sessionId": "study_test_10d",
        "createdAt": "2026-07-26T00:00:00Z",
        "status": "ACTIVE",
        "strategyType": strategies[0]["strategyType"],
        "patternIds": built["patternIds"],
        "questionIds": built["questionIds"],
        "queue": built["queue"],
        "estimatedMinutes": len(built["questionIds"]) * 3,
        "completedQuestions": [],
        "remainingQuestions": built["questionIds"][:],
    }


def record_progress(session, question_id):
    done = session["completedQuestions"] + [question_id]
    rem = [i for i in session["questionIds"] if i not in done]
    session = dict(session)
    session["completedQuestions"] = done
    session["remainingQuestions"] = rem
    if not rem:
        session["status"] = "COMPLETED"
    return session


# --- Freeze ---
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
assert (ROOT / "data/master-db.json").exists()

# --- Schema ---
schema = json.loads((ROOT / "data/study-session-schema.json").read_text(encoding="utf-8"))
assert schema["schemaVersion"] == "v1"
assert schema["storageKey"] == "learning.session.v1"
assert schema["connected"] is True

# --- Strategy → Session → Queue ---
counts = Counter(effective_pattern(q) for q in qs)
pattern_id = counts.most_common(1)[0][0]

strategies = [
    {
        "strategyId": "s_retry",
        "patternId": pattern_id,
        "strategyType": "PATTERN_RETRY_SET",
        "questionCount": 5,
        "priority": 3,
    },
    {
        "strategyId": "s_concept",
        "patternId": pattern_id,
        "strategyType": "CONCEPT_REVIEW_SET",
        "questionCount": 3,
        "priority": 2,
    },
]

session = build_study_session(strategies, qs)
assert session["status"] == "ACTIVE"
assert session["strategyType"] == "PATTERN_RETRY_SET"
assert len(session["questionIds"]) >= 5
assert len(session["questionIds"]) == len(set(session["questionIds"]))
assert session["queue"] and all("patternId" in g and "questionIds" in g for g in session["queue"])
assert session["remainingQuestions"] == session["questionIds"]
assert session["estimatedMinutes"] == len(session["questionIds"]) * 3

# progress
first = session["questionIds"][0]
session = record_progress(session, first)
assert first in session["completedQuestions"]
assert first not in session["remainingQuestions"]

# TIMED_PRACTICE fills 10
timed = select_ids(
    {
        "strategyType": "TIMED_PRACTICE",
        "patternId": pattern_id,
        "questionCount": 10,
    },
    qs,
)
assert len(timed) == 10

# CALC_DRILL — calculation or pattern fallback
calc_pat = next(
    (
        effective_pattern(q)
        for q in qs
        if q.get("hasCalculation") is True
    ),
    pattern_id,
)
calc_ids = select_ids(
    {
        "strategyType": "CALC_DRILL_SET",
        "patternId": calc_pat,
        "questionCount": 5,
    },
    qs,
)
assert len(calc_ids) >= 1

# --- Wiring ---
svc = (ROOT / "js/study-session-service.js").read_text(encoding="utf-8")
for name in (
    "buildStudySession",
    "buildQuestionQueue",
    "recordSessionProgress",
    "finishStudySession",
):
    assert f"export function {name}" in svc
assert "learning.session.v1" in svc

storage = (ROOT / "js/storage.js").read_text(encoding="utf-8")
assert "learning.session.v1" in storage

loop = (ROOT / "runtime/learning-loop.js").read_text(encoding="utf-8")
assert "recordStrategiesFromPlans" in loop
assert "buildStudySession" in loop
assert "study_session_connected" in loop
# pipeline order markers
assert loop.index("recordAttempt") < loop.index("recordWeaknessDiagnosis")
assert loop.index("recordWeaknessDiagnosis") < loop.index("recordLearningPlansFromWeakness")
assert loop.index("recordLearningPlansFromWeakness") < loop.index("recordStrategiesFromPlans")
assert loop.index("recordStrategiesFromPlans") < loop.index("buildStudySession")

loader = (ROOT / "js/data-loader.js").read_text(encoding="utf-8")
assert "studySessionContract" in loader
assert "learning.session.v1" in loader
assert "data/study-session-schema.json" in loader
idx = loader.index("const studySessionContract")
chunk = loader[idx : idx + 280]
assert "enabled: true" in chunk
assert "connected: true" in chunk
assert "schemaVersion: 'v1'" in chunk

print("Sprint-10D study session runtime tests: PASS")
print(
    f"  session questions={len(session['questionIds'])} "
    f"queueGroups={len(session['queue'])} strategy={session['strategyType']}"
)
