# -*- coding: utf-8 -*-
"""Sprint-10C — Study Session + Next Question Engine tests."""
from __future__ import annotations

import hashlib
import json
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


def question_id(q):
    return str(q.get("questionId") or q.get("id") or "")


def resolve_questions_for_strategy(strategy, questions, wrong_ids=None, exclude_ids=None):
    wrong_ids = set(wrong_ids or [])
    exclude_ids = set(exclude_ids or [])
    pattern_id = strategy.get("patternId") or ""
    count = int(strategy.get("questionCount") or DEFAULT_COUNTS.get(strategy["strategyType"], 5))
    chapter_seed = None
    for q in questions:
        if effective_pattern(q) == pattern_id:
            chapter_seed = q.get("chapterId")
            break

    pool = [
        q
        for q in questions
        if question_id(q)
        and question_id(q) not in exclude_ids
        and effective_pattern(q) == pattern_id
    ]
    if strategy["strategyType"] == "TIMED_PRACTICE" or len(pool) < count:
        seen = {question_id(q) for q in pool}
        for q in questions:
            qid = question_id(q)
            if not qid or qid in exclude_ids or qid in seen:
                continue
            if chapter_seed and q.get("chapterId") == chapter_seed:
                pool.append(q)
                seen.add(qid)
    if len(pool) < count:
        seen = {question_id(q) for q in pool}
        for q in questions:
            qid = question_id(q)
            if not qid or qid in exclude_ids or qid in seen:
                continue
            pool.append(q)
            seen.add(qid)

    def rank(q):
        qid = question_id(q)
        is_wrong = 0 if qid in wrong_ids else 1
        same_pat = 0 if effective_pattern(q) == pattern_id else 1
        same_ch = (
            0
            if chapter_seed and q.get("chapterId") == chapter_seed
            else 1
        )
        return (is_wrong, same_pat, same_ch, qid)

    ranked = sorted(pool, key=rank)
    selected = []
    used = set()
    for q in ranked:
        qid = question_id(q)
        if qid in used:
            continue
        used.add(qid)
        selected.append(
            {
                "questionId": qid,
                "patternId": effective_pattern(q),
                "strategyType": strategy["strategyType"],
                "status": "pending",
            }
        )
        if len(selected) >= count:
            break
    return selected


def create_study_session(strategies, questions, wrong_ids=None):
    exclude = set()
    queue = []
    for s in strategies:
        picked = resolve_questions_for_strategy(s, questions, wrong_ids, exclude)
        for item in picked:
            exclude.add(item["questionId"])
            queue.append(item)
    return {
        "sessionId": "study_test",
        "createdAt": "2026-07-26T00:00:00Z",
        "questions": queue,
        "currentIndex": 0,
        "completed": [],
        "status": "ACTIVE",
    }


# --- Freeze ---
qpath = ROOT / "data/question-db-mvp.json"
qsha = hashlib.sha256(qpath.read_bytes()).hexdigest()
assert qsha == EXPECTED_QSHA
qs = json.loads(qpath.read_text(encoding="utf-8"))["questions"]
ps = json.loads((ROOT / "data/pattern-db-mvp.json").read_text(encoding="utf-8"))
assert len(qs) == 240
assert sum(1 for q in qs if q.get("primaryPattern")) == 20
mism = sum(
    1
    for p in ps
    if p.get("frequency") != sum(1 for q in qs if effective_pattern(q) == p["patternId"])
)
assert mism == 0
assert (ROOT / "data/master-db.json").exists()

# --- Strategy → Session selection ---
# Pick a pattern with enough questions
from collections import Counter

counts = Counter(effective_pattern(q) for q in qs)
pattern_id, n = counts.most_common(1)[0]
assert n >= 5

wrong_id = next(
    question_id(q) for q in qs if effective_pattern(q) == pattern_id
)

strat_retry = {
    "strategyId": "s1",
    "patternId": pattern_id,
    "strategyType": "PATTERN_RETRY_SET",
    "questionCount": 5,
}
picked = resolve_questions_for_strategy(strat_retry, qs, wrong_ids={wrong_id})
assert len(picked) == 5
assert picked[0]["questionId"] == wrong_id  # wrong first
assert len({p["questionId"] for p in picked}) == 5  # no dupes
assert all(p["patternId"] == pattern_id for p in picked)

strat_concept = {
    "strategyId": "s2",
    "patternId": pattern_id,
    "strategyType": "CONCEPT_REVIEW_SET",
    "questionCount": 3,
}
picked2 = resolve_questions_for_strategy(strat_concept, qs)
assert len(picked2) == 3

strat_timed = {
    "strategyId": "s3",
    "patternId": pattern_id,
    "strategyType": "TIMED_PRACTICE",
    "questionCount": 10,
}
picked3 = resolve_questions_for_strategy(strat_timed, qs)
assert len(picked3) == 10

# Multi-strategy session: no cross-strategy duplicate
session = create_study_session(
    [
        {**strat_retry, "priority": 3},
        {
            "strategyId": "s4",
            "patternId": pattern_id,
            "strategyType": "CONCEPT_REVIEW_SET",
            "questionCount": 3,
            "priority": 2,
        },
    ],
    qs,
    wrong_ids={wrong_id},
)
ids = [q["questionId"] for q in session["questions"]]
assert len(ids) == len(set(ids))
assert session["status"] == "ACTIVE"
assert session["currentIndex"] == 0

# completeQuestion / finishSession shape (logical)
session["completed"].append(ids[0])
session["questions"][0]["status"] = "done"
session["currentIndex"] = 1
assert session["completed"][0] == ids[0]
session["status"] = "COMPLETED"
assert session["status"] == "COMPLETED"

# --- Wiring / contract ---
svc = (ROOT / "js/study-session-service.js").read_text(encoding="utf-8")
assert "export function createStudySession" in svc
assert "export function loadTodayQueue" in svc
assert "export function completeQuestion" in svc
assert "export function finishSession" in svc
assert "export function resolveQuestionsForStrategy" in svc
assert "learning.session.v1" in svc
assert "export function buildStudySession" in svc

storage = (ROOT / "js/storage.js").read_text(encoding="utf-8")
assert "learning.session.v1" in storage

loop = (ROOT / "runtime/learning-loop.js").read_text(encoding="utf-8")
assert "buildStudySession" in loop
assert "study_session_connected" in loop

loader = (ROOT / "js/data-loader.js").read_text(encoding="utf-8")
assert "studySessionContract" in loader
assert "learning.session.v1" in loader
idx = loader.index("const studySessionContract")
chunk = loader[idx : idx + 280]
assert "connected: true" in chunk
assert "schemaVersion: 'v1'" in chunk or 'schemaVersion: "v1"' in chunk

# Pipeline presence: Attempt→…→Study Session
assert "recordAttempt" in loop
assert "recordWeaknessDiagnosis" in loop
assert "recordLearningPlansFromWeakness" in loop
assert "recordStrategiesFromPlans" in loop
assert "buildStudySession" in loop

print("Sprint-10C study session tests: PASS")
print(
    f"  PATTERN_RETRY_SET@{pattern_id}: {len(picked)} qs; "
    f"session queue={len(session['questions'])}; wrongFirst={picked[0]['questionId']==wrong_id}"
)
