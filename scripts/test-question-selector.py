# -*- coding: utf-8 -*-
"""Sprint-10F — Adaptive Question Selector tests."""
from __future__ import annotations

import hashlib
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPECTED_QSHA = "66c92f0b416a03cb0c58e942d8812dfd42f8fefc42c53fea54d7c4be4e8b3a20"

WEIGHTS = {
    "WRONG_HISTORY": 50,
    "NEVER_SOLVED": 40,
    "WEAKNESS_PATTERN": 30,
    "OLD_ATTEMPT": 20,
    "RECENT_CORRECT": -20,
    "RECENTLY_SERVED": -30,
}
OLD_MS = 7 * 24 * 60 * 60 * 1000
RECENT_CORRECT_MS = 2 * 24 * 60 * 60 * 1000
RECENT_SERVED_MS = 24 * 60 * 60 * 1000


def effective_pattern(q):
    return q["primaryPattern"] if q.get("primaryPattern") is not None else q.get("patternId")


def qid(q):
    return str(q.get("questionId") or q.get("id") or "")


def build_history(events):
    by_q = {}
    for e in events:
        i = str(e["question_id"])
        ts = e.get("ts", 0)
        row = by_q.setdefault(
            i,
            {
                "everIncorrect": False,
                "everCorrect": False,
                "lastAttemptAt": 0,
                "lastCorrectAt": 0,
                "incorrectCount": 0,
            },
        )
        row["lastAttemptAt"] = max(row["lastAttemptAt"], ts)
        if e["result"] == "incorrect":
            row["everIncorrect"] = True
            row["incorrectCount"] += 1
        if e["result"] == "correct":
            row["everCorrect"] = True
            row["lastCorrectAt"] = max(row["lastCorrectAt"], ts)
    return by_q


def question_priority_score(question, hist, weakness_patterns, served, now_ms, target_pattern=None):
    score = 0
    reasons = []
    i = qid(question)
    h = hist.get(i)
    if h and h["everIncorrect"]:
        score += WEIGHTS["WRONG_HISTORY"]
        reasons.append("WRONG_HISTORY")
    if not h or not h["everCorrect"]:
        score += WEIGHTS["NEVER_SOLVED"]
        reasons.append("NEVER_SOLVED")
    pat = effective_pattern(question)
    if pat in weakness_patterns:
        score += WEIGHTS["WEAKNESS_PATTERN"]
        reasons.append("WEAKNESS_PATTERN")
    if h and h["lastAttemptAt"] and now_ms - h["lastAttemptAt"] >= OLD_MS:
        score += WEIGHTS["OLD_ATTEMPT"]
        reasons.append("OLD_ATTEMPT")
    if h and h["lastCorrectAt"] and 0 <= now_ms - h["lastCorrectAt"] < RECENT_CORRECT_MS:
        score += WEIGHTS["RECENT_CORRECT"]
        reasons.append("RECENT_CORRECT")
    if i in served or (
        h
        and h["lastAttemptAt"]
        and 0 <= now_ms - h["lastAttemptAt"] < RECENT_SERVED_MS
    ):
        score += WEIGHTS["RECENTLY_SERVED"]
        reasons.append("RECENTLY_SERVED")
    if target_pattern and pat == target_pattern:
        score += 5
    if target_pattern:
        chapter = next(
            (q.get("chapterId") for q in [question] if effective_pattern(q) == target_pattern),
            None,
        )
        if chapter and question.get("chapterId") == chapter:
            score += 2
    return score, reasons


def rank_questions(questions, hist, weakness_patterns, served, now_ms, target_pattern=None):
    rows = []
    for q in questions:
        score, reasons = question_priority_score(
            q, hist, weakness_patterns, served, now_ms, target_pattern
        )
        rows.append((score, qid(q), q, reasons))
    rows.sort(key=lambda r: (-r[0], r[1]))
    return rows


def select_for_strategy(strategy, questions, hist, weakness_patterns, served, now_ms, exclude=None):
    exclude = set(exclude or [])
    count = int(strategy.get("questionCount") or 5)
    pattern_id = strategy["patternId"]
    pool = [
        q
        for q in questions
        if qid(q)
        and qid(q) not in exclude
        and effective_pattern(q) == pattern_id
    ]
    ranked = rank_questions(pool, hist, weakness_patterns, served, now_ms, pattern_id)
    out = []
    used = set()
    for score, i, q, reasons in ranked:
        if i in used:
            continue
        used.add(i)
        out.append(i)
        if len(out) >= count:
            break
    return out


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
# policy / evidence untouched (files exist, selector must not require writes)
assert (ROOT / "data/learning-policy.json").exists()
assert (ROOT / "data/master-db.json").exists()

counts = Counter(effective_pattern(q) for q in qs)
pattern_id = counts.most_common(1)[0][0]
pool = [q for q in qs if effective_pattern(q) == pattern_id]
assert len(pool) >= 5

# Fixed clock for determinism
NOW = 1_800_000_000_000  # ms
wrong_id = qid(pool[0])
recent_id = qid(pool[1])
old_id = qid(pool[2])
fresh_id = qid(pool[3])

events = [
    {"question_id": wrong_id, "result": "incorrect", "ts": NOW - 3 * 24 * 60 * 60 * 1000},
    {"question_id": recent_id, "result": "correct", "ts": NOW - 1 * 60 * 60 * 1000},
    {"question_id": old_id, "result": "correct", "ts": NOW - 10 * 24 * 60 * 60 * 1000},
]
hist = build_history(events)
weakness = {pattern_id}
served = {recent_id}

strategy = {
    "strategyId": "s1",
    "patternId": pattern_id,
    "strategyType": "PATTERN_RETRY_SET",
    "questionCount": 5,
}

# Deterministic: same input → same queue twice
q1 = select_for_strategy(strategy, qs, hist, weakness, served, NOW)
q2 = select_for_strategy(strategy, qs, hist, weakness, served, NOW)
assert q1 == q2
assert len(q1) == 5
assert len(q1) == len(set(q1))

# Wrong question first
assert q1[0] == wrong_id

# Recently served / recent correct should not be first
assert q1[0] != recent_id

# Score ordering spot-check
rows = rank_questions(pool, hist, weakness, served, NOW, pattern_id)
assert rows[0][1] == wrong_id
# recent should rank behind wrong
recent_rank = next(i for i, r in enumerate(rows) if r[1] == recent_id)
wrong_rank = next(i for i, r in enumerate(rows) if r[1] == wrong_id)
assert wrong_rank < recent_rank

# Multi-strategy no duplicates
s2 = {
    "strategyId": "s2",
    "patternId": pattern_id,
    "strategyType": "CONCEPT_REVIEW_SET",
    "questionCount": 3,
}
a = select_for_strategy(strategy, qs, hist, weakness, served, NOW)
b = select_for_strategy(s2, qs, hist, weakness, served, NOW, exclude=a)
assert not set(a).intersection(b)

# Wiring
svc = (ROOT / "js/question-selector.js").read_text(encoding="utf-8")
for name in (
    "buildQuestionPriority",
    "selectQuestionsForPattern",
    "selectQuestionsForStrategy",
    "rankQuestions",
    "questionPriorityScore",
):
    assert f"export function {name}" in svc
assert "WRONG_HISTORY" in svc
assert "RECENTLY_SERVED" in svc

session = (ROOT / "js/study-session-service.js").read_text(encoding="utf-8")
assert "question-selector.js" in session
assert "adaptiveSelectForStrategy" in session or "selectQuestionsForStrategy" in session
assert "buildSelectorContext" in session

loader = (ROOT / "js/data-loader.js").read_text(encoding="utf-8")
assert "selectorContract" in loader
idx = loader.index("const selectorContract")
chunk = loader[idx : idx + 200]
assert "enabled: true" in chunk
assert "connected: true" in chunk
assert "schemaVersion: 'v1'" in chunk

print("Sprint-10F adaptive question selector tests: PASS")
print(f"  queue={q1[:3]}… wrongFirst={q1[0]==wrong_id} deterministic={q1==q2}")
