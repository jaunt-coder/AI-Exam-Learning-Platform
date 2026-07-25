#!/usr/bin/env python3
"""WO-013 Pattern DB initial audit + master build helpers."""
from __future__ import annotations

import json
import os
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(r"d:\AI Exam Learning Platform v2")


def load(rel: str):
    path = ROOT / rel
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def as_list(obj, key: str | None = None):
    if obj is None:
        return []
    if isinstance(obj, list):
        return obj
    if key and isinstance(obj, dict) and key in obj:
        return obj[key]
    return [obj]


def audit_pair(q_rel: str, p_rel: str, label: str):
    raw_q = load(q_rel)
    raw_p = load(p_rel)
    qs = as_list(raw_q, "questions")
    ps = as_list(raw_p, "patterns")
    qfreq = Counter(x.get("patternId") or x.get("pattern_id") for x in qs)
    pids = [x.get("patternId") or x.get("pattern_id") for x in ps]
    pid_set = set(pids)
    q_pids = {x.get("patternId") or x.get("pattern_id") for x in qs}

    print(f"==== {label} ====")
    print(f"questions={len(qs)} patterns={len(ps)} unique_pids={len(set(pids))}")
    print(f"dup_pids={[k for k,v in Counter(pids).items() if v>1]}")
    print(f"missing_pattern_on_q={sum(1 for x in qs if not (x.get('patternId') or x.get('pattern_id')))}")
    print(f"with_answer={sum(1 for x in qs if x.get('answer') not in (None, ''))}")
    print(f"orphan_q_patterns={sorted(q_pids - pid_set - {None})}")
    print(f"unused_patterns={sorted(pid_set - q_pids)}")

    for p in ps:
        pid = p.get("patternId") or p.get("pattern_id")
        before = p.get("frequency")
        after = qfreq.get(pid, 0)
        related = list(p.get("relatedQuestions") or p.get("question_ids") or [])
        actual = sorted(
            x.get("questionId") or x.get("question_id")
            for x in qs
            if (x.get("patternId") or x.get("pattern_id")) == pid
        )
        mismatch = set(related) != set(actual)
        flag = "OK" if before == after and not mismatch else "DRIFT"
        print(
            f"  {pid} grade={p.get('grade')} freq {before}->{after} "
            f"related={len(related)} actual={len(actual)} mismatch={mismatch} [{flag}]"
        )
        if mismatch:
            print(f"    only_related={sorted(set(related)-set(actual))[:8]}")
            print(f"    only_actual={sorted(set(actual)-set(related))[:8]}")


def main():
    audit_pair("data/question-db.json", "data/pattern-db.json", "INV32")
    audit_pair("data/question-db-mvp.json", "data/pattern-db-mvp.json", "MVP240")

    # duplicate question->pattern in either direction (multi-map)
    for q_rel, label in [
        ("data/question-db.json", "INV32"),
        ("data/question-db-mvp.json", "MVP240"),
    ]:
        qs = as_list(load(q_rel), "questions")
        by_q = defaultdict(list)
        for x in qs:
            qid = x.get("questionId") or x.get("question_id")
            pid = x.get("patternId") or x.get("pattern_id")
            by_q[qid].append(pid)
        multi = {k: v for k, v in by_q.items() if len(v) > 1}
        print(f"==== multi-map {label} ====", len(multi))

    # pattern field richness
    for p_rel in ["data/pattern-db.json", "data/pattern-db-mvp.json"]:
        ps = as_list(load(p_rel), "patterns")
        print(f"==== fields {p_rel} ====")
        print(sorted(ps[0].keys()) if ps else None)
        print("names:", [(p.get("patternId"), p.get("name"), p.get("grade"), p.get("frequency")) for p in ps])

    # docs consistency vs INV32
    print("==== INV005 present in mvp? ====")
    pms = as_list(load("data/pattern-db-mvp.json"), "patterns")
    print("ACC_INV_005" in [p.get("patternId") for p in pms])

    # master-db summary
    m = load("data/master-db.json")
    print("==== master-db ====")
    print("version", m.get("version"))
    print("summary", m.get("summary"))
    chapters = m.get("chapters") or []
    print("chapters", len(chapters))
    for c in chapters[:20]:
        print(" ", c.get("chapterId") or c.get("id"), c.get("name") or c.get("title"))


if __name__ == "__main__":
    main()
