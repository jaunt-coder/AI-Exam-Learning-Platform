#!/usr/bin/env python3
"""WO-013.1: Extract Golden Pilot vs MVP mapping evidence (read-only)."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(r"d:\AI Exam Learning Platform v2")


def load(rel: str):
    return json.loads((ROOT / rel).read_text(encoding="utf-8"))


def main():
    mvp = load("data/question-db-mvp.json")
    qs = mvp["questions"] if isinstance(mvp, dict) else mvp
    mvp_by_id = {q["questionId"]: q for q in qs}

    master = load("data/pattern-master-db.json")
    patterns = {p["pattern_id"]: p for p in master["patterns"]}

    pilot_dir = ROOT / "data/knowledge/pilot/2018/candidate"
    rows = []
    for f in sorted(pilot_dir.glob("ACC_2018_Q*.json")):
        p = json.loads(f.read_text(encoding="utf-8"))
        qid = p["questionId"]
        mq = mvp_by_id.get(qid)
        stem = (p.get("stem") or "")[:200].replace("\n", " ")
        row = {
            "questionId": qid,
            "number": p.get("number"),
            "pilot_answer": p.get("answer"),
            "mvp_answer": None if not mq else mq.get("answer"),
            "mvp_patternId": None if not mq else mq.get("patternId"),
            "mvp_chapterId": None if not mq else mq.get("chapterId"),
            "pattern_in_master": None,
            "pattern_validation_status": None,
            "stem_preview": stem,
        }
        if mq and mq.get("patternId"):
            pid = mq["patternId"]
            row["pattern_in_master"] = pid in patterns
            if pid in patterns:
                row["pattern_validation_status"] = patterns[pid]["validation_status"]
                row["pattern_name"] = patterns[pid]["name"]
                row["pattern_grade"] = patterns[pid]["grade"]
        rows.append(row)

    out = ROOT / "data/analysis/wo0131-pilot-mvp-bridge.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    # console summary
    print("rows", len(rows))
    ans_mismatch = [r for r in rows if r["mvp_answer"] is not None and r["pilot_answer"] != r["mvp_answer"]]
    missing_mvp = [r for r in rows if r["mvp_patternId"] is None]
    print("answer_mismatch_vs_mvp", len(ans_mismatch), [r["questionId"] for r in ans_mismatch])
    print("missing_mvp_pattern", len(missing_mvp))
    from collections import Counter
    c = Counter(r["mvp_patternId"] for r in rows)
    print("pattern_dist", dict(c))
    for r in rows:
        print(
            f"{r['questionId']}\tansP={r['pilot_answer']}\tansM={r['mvp_answer']}\t"
            f"pat={r['mvp_patternId']}\tstatus={r['pattern_validation_status']}\t"
            f"ch={r['mvp_chapterId']}"
        )


if __name__ == "__main__":
    main()
