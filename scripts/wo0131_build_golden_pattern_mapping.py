#!/usr/bin/env python3
"""WO-013.1 Golden Pilot Pattern Integration.

Rules:
- Do not modify pilot answers / question IDs / pattern-db SoT.
- Map only when an existing Pattern Master pattern with validation_status=verified
  is supported by concrete evidence (MVP link + content/Phase1 crosswalk).
- Otherwise status=pending_review with candidate evidence recorded (no new pattern IDs).
"""
from __future__ import annotations

import hashlib
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(r"d:\AI Exam Learning Platform v2")
PILOT_DIR = ROOT / "data/knowledge/pilot/2018/candidate"
OUT_MAP = ROOT / "data/golden-pattern-mapping.json"
OUT_REPORT = ROOT / "docs/golden-pattern-validation-report.md"

# Content-gated verified mappings only.
# Keys: questionId → (pattern_id, evidence bullets)
# Speculative MVP-only labels without content fit are NOT listed here.
VERIFIED_CONTENT_MAP = {
    "ACC_2018_Q042": {
        "pattern_id": "ACC_INV_001",
        "evidence": [
            "Pattern Master validation_status=verified for ACC_INV_001 (기말재고 포함 여부 판단).",
            "Stem contains FOB 선적지/도착지, 적송품, 시송품 — ownership/inclusion classic facts.",
            "Phase1 crosswalk: data/question-db.json ACC_INV_Q001 uses same fact pattern, patternId=ACC_INV_001, answer=3 (matches pilot answer).",
            "Existing Product mapping: data/question-db-mvp.json ACC_2018_Q042.patternId=ACC_INV_001.",
        ],
    },
    "ACC_2018_Q068": {
        "pattern_id": "ACC_INV_006",
        "evidence": [
            "Pattern Master validation_status=verified for ACC_INV_006 (FIFO·총평균법 매출원가).",
            "Stem explicitly contrasts 선입선출법 vs 총평균법 and asks 매출원가 impact under retrospective change.",
            "Existing Product mapping: data/question-db-mvp.json ACC_2018_Q068.patternId=ACC_INV_006.",
        ],
    },
}

# MVP labels that must NOT auto-map to verified INV despite MVP patternId
# (content mismatch vs verified pattern definition).
CONTENT_MISMATCH_NOTES = {
    "ACC_2018_Q066": (
        "MVP patternId=ACC_INV_006 but stem is 선입선출 vs 후입선출 (LIFO). "
        "Verified ACC_INV_006 definition is FIFO·총평균 — content fit insufficient for auto-map."
    ),
    "ACC_2018_Q079": (
        "MVP patternId=ACC_INV_006 but stem is 종합원가계산 / 완성품환산량 (process costing). "
        "Not merchandise FIFO·총평균 — content fit insufficient for auto-map."
    ),
}


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load(rel: str):
    return json.loads((ROOT / rel).read_text(encoding="utf-8"))


def build():
    master = load("data/pattern-master-db.json")
    patterns = {p["pattern_id"]: p for p in master["patterns"]}
    verified_ids = {
        pid for pid, p in patterns.items() if p.get("validation_status") == "verified"
    }

    mvp = load("data/question-db-mvp.json")
    mvp_qs = mvp["questions"] if isinstance(mvp, dict) else mvp
    mvp_by_id = {q["questionId"]: q for q in mvp_qs}

    # Answer fingerprints before (pilot files must remain unchanged)
    pilot_files = sorted(PILOT_DIR.glob("ACC_2018_Q*.json"))
    answers_before = {}
    ids_before = []
    for f in pilot_files:
        d = json.loads(f.read_text(encoding="utf-8"))
        answers_before[d["questionId"]] = d.get("answer")
        ids_before.append(d["questionId"])
        # file hash for integrity
    file_hashes_before = {f.name: sha256_file(f) for f in pilot_files}

    mappings = []
    for f in pilot_files:
        p = json.loads(f.read_text(encoding="utf-8"))
        qid = p["questionId"]
        mq = mvp_by_id.get(qid)
        mvp_pid = None if not mq else mq.get("patternId")
        mvp_ans = None if not mq else mq.get("answer")
        stem = p.get("stem") or ""
        stem_preview = " ".join(stem.split())[:180]

        entry = {
            "question_id": qid,
            "question_number": p.get("number"),
            "year": p.get("year"),
            "answer_snapshot": p.get("answer"),
            "answer_label_snapshot": p.get("answerLabel"),
            "mapping_status": "pending_review",
            "pattern_id": None,
            "candidate_pattern_id": mvp_pid if mvp_pid in patterns else None,
            "pattern_name": None,
            "pattern_validation_status": None,
            "evidence": [],
            "notes": [],
            "stem_preview": stem_preview,
            "cross_checks": {
                "mvp_question_id": qid if mq else None,
                "mvp_pattern_id": mvp_pid,
                "mvp_answer": mvp_ans,
                "pilot_vs_mvp_answer_match": (
                    None if mq is None else (p.get("answer") == mvp_ans)
                ),
                "candidate_in_pattern_master": bool(mvp_pid and mvp_pid in patterns),
                "candidate_is_verified": bool(mvp_pid and mvp_pid in verified_ids),
            },
        }

        if mvp_pid and mvp_pid not in patterns:
            entry["notes"].append(
                f"MVP patternId={mvp_pid} not present in pattern-master-db.json — not used."
            )

        # Known ADR / gap notes for cost-accounting cluster
        if qid in {
            "ACC_2018_Q072",
            "ACC_2018_Q073",
            "ACC_2018_Q077",
            "ACC_2018_Q078",
        }:
            entry["notes"].append(
                "pattern-gap-analysis.md lists emit ACC_COST_001 for this/near cluster; "
                "ACC_COST_001 Persist=0 (ADR-001) — no new pattern created."
            )

        if qid in CONTENT_MISMATCH_NOTES:
            entry["notes"].append(CONTENT_MISMATCH_NOTES[qid])
            entry["evidence"].append(
                f"MVP existing label recorded as candidate only: {mvp_pid}."
            )
            if mvp_pid in patterns:
                entry["candidate_pattern_id"] = mvp_pid
                entry["pattern_name"] = patterns[mvp_pid]["name"]
                entry["pattern_validation_status"] = patterns[mvp_pid]["validation_status"]

        elif qid in VERIFIED_CONTENT_MAP:
            spec = VERIFIED_CONTENT_MAP[qid]
            pid = spec["pattern_id"]
            assert pid in verified_ids, f"{pid} must be verified"
            # require MVP agreement when MVP has mapping (evidence consistency)
            if mvp_pid and mvp_pid != pid:
                entry["mapping_status"] = "pending_review"
                entry["notes"].append(
                    f"Content suggests {pid} but MVP has {mvp_pid} — held for review."
                )
                entry["candidate_pattern_id"] = pid
                entry["evidence"] = list(spec["evidence"])
            else:
                entry["mapping_status"] = "mapped"
                entry["pattern_id"] = pid
                entry["candidate_pattern_id"] = pid
                entry["pattern_name"] = patterns[pid]["name"]
                entry["pattern_validation_status"] = "verified"
                entry["evidence"] = list(spec["evidence"])
        else:
            # pending_review — record MVP candidate if registered in Master
            if mvp_pid and mvp_pid in patterns:
                entry["candidate_pattern_id"] = mvp_pid
                entry["pattern_name"] = patterns[mvp_pid]["name"]
                entry["pattern_validation_status"] = patterns[mvp_pid]["validation_status"]
                entry["evidence"].append(
                    "Existing Product mapping in data/question-db-mvp.json "
                    f"(patternId={mvp_pid}, validation_status={patterns[mvp_pid]['validation_status']})."
                )
                if patterns[mvp_pid]["validation_status"] != "verified":
                    entry["evidence"].append(
                        "Candidate is NOT validation_status=verified in Pattern Master — "
                        "WO-013.1 does not auto-map; Human review required."
                    )
                else:
                    # verified in Master but not content-gated in VERIFIED_CONTENT_MAP
                    entry["evidence"].append(
                        "Pattern is verified in Master, but this question lacks "
                        "WO-013.1 content/crosswalk gate — pending_review (no speculation)."
                    )
            else:
                entry["evidence"].append(
                    "No registered Pattern Master candidate with sufficient evidence."
                )
            entry["mapping_status"] = "pending_review"

        if entry["cross_checks"]["pilot_vs_mvp_answer_match"] is False:
            entry["notes"].append(
                f"Pilot answer ({entry['answer_snapshot']}) differs from MVP answer "
                f"({mvp_ans}). Pilot Human SoT retained; answers not modified."
            )

        mappings.append(entry)

    # Integrity: re-read pilot files — must be unchanged
    answers_after = {}
    ids_after = []
    for f in sorted(PILOT_DIR.glob("ACC_2018_Q*.json")):
        d = json.loads(f.read_text(encoding="utf-8"))
        answers_after[d["questionId"]] = d.get("answer")
        ids_after.append(d["questionId"])
    file_hashes_after = {
        f.name: sha256_file(f) for f in sorted(PILOT_DIR.glob("ACC_2018_Q*.json"))
    }

    answers_unchanged = answers_before == answers_after
    ids_unchanged = ids_before == ids_after
    files_unchanged = file_hashes_before == file_hashes_after

    mapped = [m for m in mappings if m["mapping_status"] == "mapped"]
    pending = [m for m in mappings if m["mapping_status"] == "pending_review"]
    # Ensure no speculative new pattern ids
    used_pids = {m["pattern_id"] for m in mapped if m["pattern_id"]}
    speculative = [pid for pid in used_pids if pid not in verified_ids]

    reviewed_all = len(mappings) == 40
    evidence_all = all(len(m["evidence"]) > 0 for m in mappings)
    no_speculative = len(speculative) == 0

    pass_gate = (
        reviewed_all
        and answers_unchanged
        and ids_unchanged
        and files_unchanged
        and evidence_all
        and no_speculative
    )

    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    doc = {
        "schemaVersion": "wo013.1-1.0",
        "woId": "WO-013.1",
        "generatedAt": now,
        "scope": {
            "pilot": "data/knowledge/pilot/2018/candidate/ACC_2018_Q041–Q080",
            "pattern_master": "data/pattern-master-db.json",
            "product_bridge": "data/question-db-mvp.json",
        },
        "rules": [
            "Do not infer pattern without evidence",
            "Do not create new pattern IDs",
            "Do not modify answers",
            "Do not modify question IDs",
            "Auto-map only validation_status=verified + content/crosswalk gate",
        ],
        "summary": {
            "total_questions": len(mappings),
            "reviewed": len(mappings),
            "mapped": len(mapped),
            "pending_review": len(pending),
            "mapped_pattern_ids": sorted(used_pids),
            "pending_candidate_dist": dict(
                Counter(m["candidate_pattern_id"] for m in pending)
            ),
            "answer_mismatches_vs_mvp": [
                m["question_id"]
                for m in mappings
                if m["cross_checks"]["pilot_vs_mvp_answer_match"] is False
            ],
        },
        "integrity": {
            "answers_unchanged": answers_unchanged,
            "question_ids_unchanged": ids_unchanged,
            "pilot_files_unchanged": files_unchanged,
            "no_speculative_pattern_created": no_speculative,
            "evidence_recorded_for_all": evidence_all,
        },
        "completion": {
            "all_40_reviewed": reviewed_all,
            "answer_unchanged": answers_unchanged,
            "mapping_evidence_recorded": evidence_all,
            "no_speculative_pattern_created": no_speculative,
            "result": "PASS" if pass_gate else "FAIL",
        },
        "mappings": mappings,
    }

    OUT_MAP.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    write_report(doc)
    print("WO-013.1 COMPLETE", doc["completion"]["result"])
    print("mapped", len(mapped), "pending", len(pending))
    print("wrote", OUT_MAP)
    print("wrote", OUT_REPORT)
    return doc


def write_report(doc: dict):
    s = doc["summary"]
    c = doc["completion"]
    lines = [
        "# Golden Pattern Validation Report (WO-013.1)",
        "",
        f"Generated: {doc['generatedAt']}",
        "",
        "## Objective",
        "",
        "Integrate Golden Pilot ACC 2018 Q41–Q80 into Pattern Knowledge Base "
        "using **existing verified patterns only**, with evidence. "
        "No speculative pattern creation.",
        "",
        "## Completion Gate",
        "",
        f"**Result: {c['result']}**",
        "",
        "| Criterion | Status |",
        "|-----------|--------|",
        f"| all 40 questions reviewed | {'PASS' if c['all_40_reviewed'] else 'FAIL'} |",
        f"| answer unchanged | {'PASS' if c['answer_unchanged'] else 'FAIL'} |",
        f"| mapping evidence recorded | {'PASS' if c['mapping_evidence_recorded'] else 'FAIL'} |",
        f"| no speculative pattern created | {'PASS' if c['no_speculative_pattern_created'] else 'FAIL'} |",
        "",
        "## Summary",
        "",
        "| Metric | Value |",
        "|--------|------:|",
        f"| total questions | {s['total_questions']} |",
        f"| mapped (verified + evidence) | {s['mapped']} |",
        f"| pending_review | {s['pending_review']} |",
        "",
        f"Mapped pattern IDs: {', '.join(f'`{x}`' for x in s['mapped_pattern_ids']) or '(none)'}",
        "",
        "### Pending candidate distribution (from existing Product/Master only)",
        "",
        "| candidate_pattern_id | count |",
        "|----------------------|------:|",
    ]
    for pid, n in sorted(
        (s["pending_candidate_dist"] or {}).items(), key=lambda x: (-x[1], str(x[0]))
    ):
        lines.append(f"| `{pid}` | {n} |")

    lines += [
        "",
        "## Mapping Policy",
        "",
        "1. Candidate source = existing `question-db-mvp.json` patternId ∩ Pattern Master.",
        "2. **Auto-map** only if Pattern Master `validation_status=verified` **and** "
        "content/Phase1 crosswalk evidence is recorded in WO-013.1 gate list.",
        "3. Otherwise `pending_review` — candidate retained, **no new pattern_id**.",
        "4. `ACC_COST_001` not registered (ADR-001 Persist=0) — never created here.",
        "",
        "## Mapped Questions",
        "",
        "| question_id | pattern_id | answer | evidence (short) |",
        "|-------------|------------|-------:|------------------|",
    ]
    for m in doc["mappings"]:
        if m["mapping_status"] != "mapped":
            continue
        ev0 = m["evidence"][0] if m["evidence"] else ""
        lines.append(
            f"| `{m['question_id']}` | `{m['pattern_id']}` | {m['answer_snapshot']} | {ev0} |"
        )

    lines += [
        "",
        "## Pending Review (excerpt rules applied)",
        "",
        "All non-mapped rows are `pending_review`. Notable holds:",
        "",
        "| question_id | MVP candidate | reason |",
        "|-------------|---------------|--------|",
    ]
    for m in doc["mappings"]:
        if m["mapping_status"] != "pending_review":
            continue
        if not m["notes"]:
            continue
        # only show rows with special notes to keep report readable; full list in JSON
        note = m["notes"][0]
        lines.append(
            f"| `{m['question_id']}` | `{m['candidate_pattern_id']}` | {note} |"
        )

    lines += [
        "",
        "> Full per-question evidence is in `data/golden-pattern-mapping.json`.",
        "",
        "## Answer Integrity",
        "",
        "| Check | Result |",
        "|-------|--------|",
        f"| pilot answers unchanged | {doc['integrity']['answers_unchanged']} |",
        f"| question IDs unchanged | {doc['integrity']['question_ids_unchanged']} |",
        f"| pilot file hashes unchanged | {doc['integrity']['pilot_files_unchanged']} |",
        "",
        "Pilot vs MVP answer mismatches (informational; pilot SoT kept):",
        "",
    ]
    mismatches = s["answer_mismatches_vs_mvp"]
    if mismatches:
        lines.append(", ".join(f"`{x}`" for x in mismatches))
    else:
        lines.append("(none)")

    lines += [
        "",
        "## Files Touched",
        "",
        "| Path | Action |",
        "|------|--------|",
        "| `data/golden-pattern-mapping.json` | **created** |",
        "| `docs/golden-pattern-validation-report.md` | **created** |",
        "| pilot candidate JSON | **not modified** |",
        "| answer / pattern-db SoT | **not modified** |",
        "",
        "## Remaining Work",
        "",
        "1. Human review of `pending_review` rows (especially coarse buckets `ACC_GEN_001`, `ACC_PPE_001`).",
        "2. Resolve MVP-vs-content conflicts for `ACC_2018_Q066`, `ACC_2018_Q079`.",
        "3. ADR-001 `ACC_COST_001` Persist WO (separate) before cost-accounting fine mapping.",
        "4. After Human approve, optionally append mapped golden IDs into Pattern Master `question_ids` (D4).",
        "",
    ]
    OUT_REPORT.write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    build()
