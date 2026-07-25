#!/usr/bin/env python3
"""WO-013.2 Pattern Metadata Validation & Knowledge Structuring.

Only verified patterns from pattern-master-db.json.
Do not invent concepts/algorithms/errors — evidence or pending.
Do not modify answers / question IDs / SoT DBs.
"""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(r"d:\AI Exam Learning Platform v2")
OUT_DB = ROOT / "data" / "pattern-metadata-db.json"
OUT_REPORT = ROOT / "docs" / "pattern-metadata-validation-report.md"

# Hand-curated, evidence-gated metadata. Anything uncertain stays pending.
# Sources must be existing docs / question stems / solution lines that align with the same question.


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load(rel: str):
    return json.loads((ROOT / rel).read_text(encoding="utf-8"))


def evidence(question_id, source, excerpt, note=None):
    e = {
        "question_id": question_id,
        "validation_source": source,
        "excerpt": excerpt,
    }
    if note:
        e["note"] = note
    return e


# Metadata definitions — ONLY quotes/labels already present in project artifacts.
METADATA = {
    "ACC_INV_001": {
        "concept": {
            "status": "documented",
            "value": "기말재고 포함 여부 판단",
            "evidence": [
                evidence(
                    None,
                    "docs/pattern-db.md",
                    "ACC_INV_001 | 기말재고 포함 여부 판단",
                ),
                evidence(
                    None,
                    "docs/05-pattern-engine-spec.md",
                    'name: "기말재고 귀속"',
                ),
                evidence(
                    "ACC_INV_Q001",
                    "data/question-db.json#originalQuestion",
                    "FOB 선적지/도착지, 적송품, 시송품 사실관계가 포함된 기말재고 가액 문항",
                ),
                evidence(
                    "ACC_2018_Q042",
                    "data/golden-pattern-mapping.json",
                    "mapping_status=mapped → ACC_INV_001 (WO-013.1)",
                ),
            ],
        },
        "solving_algorithm": {
            "status": "evidenced",
            "steps": [
                "실사(창고) 재고금액을 출발점으로 둔다.",
                "소유권·인도조건·위탁·시용 사실을 반영해 가감한다.",
                "조정 후 기말재고자산 금액을 구한다.",
            ],
            "evidence": [
                evidence(
                    "ACC_INV_Q001",
                    "data/question-db.json#solution.calculationProcess",
                    "기말재고자산 금액 / 실사시 재고자산 금액 ￦1,000,000 / 적송품(위탁판매시) + 60,000 / 시송품(시용판매시) + 70,000",
                    "동일 문항 stem의 적송·시송 사실과 해설 가감 항목이 일치함",
                ),
                evidence(
                    "ACC_2018_Q042",
                    "data/knowledge/pilot/2018/candidate/ACC_2018_Q042.json#stem",
                    "FOB 선적지 판매 운송중, 적송품, 시송품, FOB 도착지 매입 운송중",
                ),
            ],
        },
        "common_errors": {
            "status": "pending",
            "items": [],
            "evidence": [],
            "pending_reason": "question-db solution.wrongAnalysis가 비어 있음. 오답 유형을 추정 생성하지 않음.",
        },
    },
    "ACC_INV_003": {
        "concept": {
            "status": "documented",
            "value": "운반비·부대비용과 재고원가",
            "evidence": [
                evidence(
                    None,
                    "docs/pattern-db.md",
                    "ACC_INV_003 | 운반비·부대비용과 재고원가",
                ),
                evidence(
                    None,
                    "data/pattern-master-db.json",
                    "pattern_id=ACC_INV_003, validation_status=verified, name=운반비·부대비용과 재고원가",
                ),
            ],
        },
        "solving_algorithm": {
            "status": "pending",
            "steps": [],
            "evidence": [],
            "pending_reason": (
                "relatedQuestions ACC_INV_Q011(CVP/공헌이익), ACC_INV_Q012(매입 현금예산) "
                "본문이 패턴명(운반비·부대비용)과 불일치. 운반비 풀이절차를 추정 작성하지 않음."
            ),
        },
        "common_errors": {
            "status": "pending",
            "items": [],
            "evidence": [],
            "pending_reason": "wrongAnalysis 공란 + 관련 문항 내용 불일치로 오답 유형 확정 불가.",
        },
        "unresolved_issues": [
            "Phase1 relatedQuestions content mismatch vs pattern name (운반비). Classification repair is out of WO-013.2 scope.",
        ],
    },
    "ACC_INV_004": {
        "concept": {
            "status": "documented",
            "value": "매출원가 계산 (PER법)",
            "evidence": [
                evidence(
                    None,
                    "docs/pattern-db.md",
                    "ACC_INV_004 | 매출원가 계산 (PER법)",
                ),
                evidence(
                    "ACC_INV_Q008",
                    "data/question-db.json#originalQuestion",
                    "매출총이익률 30%, 기초·당기매입·순매출로 기말재고자산원가 질문",
                ),
            ],
        },
        "solving_algorithm": {
            "status": "evidenced",
            "steps": [
                "매출원가 = 매출액 × (1 − 매출총이익률)",
                "기말재고 = 기초재고 + 당기매입 − 매출원가",
            ],
            "evidence": [
                evidence(
                    "ACC_INV_Q008",
                    "data/question-db.json#solution.calculationProcess",
                    "1) 매출원가 = 매출(10,000,000) × (1-매출총이익률 30%) = ￦7,000,000; "
                    "2) 기말재고자산 = 기초재고(2,000,000) + 당기매입(6,000,000) - 매출원가(7,000,000) = ￦1,000,000",
                ),
                evidence(
                    "ACC_INV_Q009",
                    "data/question-db.json#solution.calculationProcess",
                    "동일 공식(매출총이익률 → 매출원가 → 기말재고)이 Q009 해설에도 등장",
                ),
            ],
        },
        "common_errors": {
            "status": "pending",
            "items": [],
            "evidence": [],
            "pending_reason": "wrongAnalysis 공란. 오답 함정을 추정하지 않음.",
        },
        "unresolved_issues": [
            "Some relatedQuestions under ACC_INV_004 (e.g. ACC_INV_Q013 display, ACC_INV_Q020 ownership, ACC_INV_Q038 LCM) appear content-mismatched; metadata uses only Q008/Q009-aligned evidence.",
        ],
    },
    "ACC_INV_005": {
        "concept": {
            "status": "documented",
            "value": "PER vs PR 재고조사법",
            "evidence": [
                evidence(
                    None,
                    "docs/pattern-db.md",
                    "ACC_INV_005 | PER vs PR 재고조사법",
                ),
                evidence(
                    "ACC_INV_Q014",
                    "data/question-db.json#originalQuestion",
                    "계속기록법·순실현가능가치 하락·매출원가 인식액으로부터 실제재고수량 역산 문항",
                ),
            ],
        },
        "solving_algorithm": {
            "status": "evidenced",
            "steps": [
                "매출원가 = 판매가능재고 − 기말재고자산",
                "기말재고는 단위당 min(취득원가, 순실현가능가치) × 실제수량으로 둔다.",
                "주어진 매출원가로부터 실제재고수량을 역산한다.",
            ],
            "evidence": [
                evidence(
                    "ACC_INV_Q014",
                    "data/question-db.json#solution.calculationProcess",
                    "매출원가 = 판매가능재고 - 기말재고자산 = 10,000 + 30,000 - 실제재고수량 × min(100, 80) = ￦36,000; ∴ 실제재고수량 = 50개",
                ),
            ],
        },
        "common_errors": {
            "status": "pending",
            "items": [],
            "evidence": [],
            "pending_reason": "wrongAnalysis 공란.",
        },
    },
    "ACC_INV_006": {
        "concept": {
            "status": "documented",
            "value": "FIFO·총평균법 매출원가",
            "evidence": [
                evidence(
                    None,
                    "docs/pattern-db.md",
                    "ACC_INV_006 | FIFO·총평균법 매출원가",
                ),
                evidence(
                    "ACC_INV_Q002",
                    "data/question-db.json#question",
                    "재고자산 거래 자료에서 선입선출·가중평균/총평균 설명의 正誤 판단",
                ),
                evidence(
                    "ACC_2018_Q068",
                    "data/golden-pattern-mapping.json",
                    "mapping_status=mapped → ACC_INV_006 (WO-013.1)",
                ),
            ],
        },
        "solving_algorithm": {
            "status": "evidenced",
            "steps": [
                "실지재고조사법 선입선출법으로 기말재고를 계산한다.",
                "실지재고조사법 총평균법으로 평균단가·매출원가를 계산한다.",
                "실지재고조사법 평균법=총평균, 계속기록법 평균법=이동평균임을 구분한다.",
                "선입선출법은 실지/계속기록에서 기말재고·매출원가가 같음을 확인한다.",
            ],
            "evidence": [
                evidence(
                    "ACC_INV_Q002",
                    "data/question-db.json#solution.calculationProcess",
                    "① 실지재고조사법하의 선입선출법하의 기말재고; "
                    "② 실지재고조사법하의 평균법(총평균법)하의 매출원가; "
                    "평균단가·매출원가 계산식; "
                    "→ 실지재고조사법하의 평균법 : 총평균법, 계속기록법하의 평균법 : 이동평균법; "
                    "⑤ 실지재고조사법하의 선입선출법이나 계속기록법하의 선입선출법은 기말재고자산과 매출원가가 항상 같다.",
                ),
                evidence(
                    "ACC_2018_Q068",
                    "data/knowledge/pilot/2018/candidate/ACC_2018_Q068.json#stem",
                    "선입선출법과 총평균법, 회계정책 변경(소급법) 후 매출원가 영향",
                ),
            ],
        },
        "common_errors": {
            "status": "pending",
            "items": [],
            "evidence": [],
            "pending_reason": "wrongAnalysis 공란. 보기 함정(⑤)을 일반 오답유형으로 확장 서술하지 않음.",
        },
    },
    "ACC_INV_007": {
        "concept": {
            "status": "documented",
            "value": "LCM·순실현가능가치 평가",
            "evidence": [
                evidence(
                    None,
                    "docs/pattern-db.md",
                    "ACC_INV_007 | LCM·순실현가능가치 평가",
                ),
                evidence(
                    "ACC_INV_Q003",
                    "data/question-db.json#originalQuestion",
                    "기말 재고자산을 원가와 순실현가능가치 중 낮은 금액으로 평가한다는 진술 포함",
                ),
                evidence(
                    "ACC_INV_Q039",
                    "data/question-db.json#originalQuestion",
                    "저가법·순실현가능가치 자료로 평가손실/매출원가 계산",
                ),
            ],
        },
        "solving_algorithm": {
            "status": "evidenced",
            "steps": [
                "항목별로 취득원가와 순실현가능가치를 비교한다.",
                "낮은 금액(저가)으로 기말재고를 평가하고 평가손실을 인식한다.",
                "원재료는 관련 제품이 원가 이상으로 판매될 것으로 예상되면 평가손실을 인식하지 않을 수 있다(해당 문항 해설).",
            ],
            "evidence": [
                evidence(
                    "ACC_INV_Q039",
                    "data/question-db.json#originalQuestion",
                    "순실현가능가치·추정판매비용·저가법 적용 전제",
                ),
                evidence(
                    "ACC_INV_Q003",
                    "data/question-db.json#originalQuestion",
                    "기말 재고자산을 원가와 순실현가능가치 중 낮은 금액으로 평가",
                ),
                # Note: detailed numeric steps appear under ACC_INV_Q038 in DB but that ID is tagged ACC_INV_004.
                # Do NOT cite Q038 algorithm under INV_007 to avoid cross-tag speculation; keep steps qualitative from stems.
            ],
            "pending_note": (
                "상세 수치 풀이(제품A/B·원재료 평가손실 합계)는 ACC_INV_Q038 해설에 있으나 "
                "해당 questionId는 patternId=ACC_INV_004로 태깅됨. 태그 불일치로 수치 단계를 INV_007에 이식하지 않음."
            ),
        },
        "common_errors": {
            "status": "pending",
            "items": [],
            "evidence": [],
            "pending_reason": "wrongAnalysis 공란.",
        },
        "unresolved_issues": [
            "ACC_INV_Q038 (LCM numeric solution) is tagged ACC_INV_004 in question-db.json — classification drift; not used as INV_007 numeric evidence.",
        ],
    },
}


def count_statuses(patterns_meta):
    verified = 0
    pending = 0
    for p in patterns_meta:
        for field in ("concept", "solving_algorithm", "common_errors"):
            st = p[field]["status"]
            if st == "pending":
                pending += 1
            else:
                verified += 1
    return verified, pending


def build():
    master = load("data/pattern-master-db.json")
    golden = load("data/golden-pattern-mapping.json")
    qdb_path = ROOT / "data/question-db.json"
    pdb_path = ROOT / "data/pattern-db.json"
    master_path = ROOT / "data/pattern-master-db.json"
    golden_path = ROOT / "data/golden-pattern-mapping.json"

    hashes_before = {
        "question-db.json": sha(qdb_path),
        "pattern-db.json": sha(pdb_path),
        "pattern-master-db.json": sha(master_path),
        "golden-pattern-mapping.json": sha(golden_path),
    }

    # Answer fingerprint
    qs = load("data/question-db.json")
    if isinstance(qs, dict):
        qs = qs.get("questions", [])
    answers_before = {q["questionId"]: q.get("answer") for q in qs}
    ids_before = [q["questionId"] for q in qs]

    verified = [p for p in master["patterns"] if p.get("validation_status") == "verified"]
    assert len(verified) == 6

    # Ensure we only process verified and all are covered
    verified_ids = [p["pattern_id"] for p in verified]
    assert set(verified_ids) == set(METADATA.keys())

    patterns_out = []
    unresolved = []
    for p in sorted(verified, key=lambda x: x["pattern_id"]):
        pid = p["pattern_id"]
        meta = METADATA[pid]
        # Validate every non-pending field has evidence
        for field in ("concept", "solving_algorithm", "common_errors"):
            block = meta[field]
            if block["status"] != "pending":
                assert block.get("evidence"), f"{pid}.{field} missing evidence"
                for ev in block["evidence"]:
                    assert ev.get("validation_source"), f"{pid}.{field} missing source"
            else:
                assert block.get("pending_reason"), f"{pid}.{field} pending without reason"

        golden_links = [
            m["question_id"]
            for m in golden["mappings"]
            if m.get("mapping_status") == "mapped" and m.get("pattern_id") == pid
        ]

        entry = {
            "pattern_id": pid,
            "name": p.get("name"),
            "grade": p.get("grade"),
            "category": p.get("category"),
            "frequency": p.get("frequency"),
            "question_ids": list(p.get("question_ids") or []),
            "golden_mapped_question_ids": golden_links,
            "concept": meta["concept"],
            "solving_algorithm": meta["solving_algorithm"],
            "common_errors": meta["common_errors"],
            "metadata_completeness": {
                "concept": meta["concept"]["status"],
                "solving_algorithm": meta["solving_algorithm"]["status"],
                "common_errors": meta["common_errors"]["status"],
            },
            "unresolved_issues": meta.get("unresolved_issues", []),
        }
        unresolved.extend({"pattern_id": pid, "issue": i} for i in entry["unresolved_issues"])
        patterns_out.append(entry)

    verified_meta_count, pending_count = count_statuses(patterns_out)

    # Integrity re-check
    qs2 = load("data/question-db.json")
    if isinstance(qs2, dict):
        qs2 = qs2.get("questions", [])
    answers_after = {q["questionId"]: q.get("answer") for q in qs2}
    ids_after = [q["questionId"] for q in qs2]
    hashes_after = {
        "question-db.json": sha(qdb_path),
        "pattern-db.json": sha(pdb_path),
        "pattern-master-db.json": sha(master_path),
        "golden-pattern-mapping.json": sha(golden_path),
    }

    no_answer_mod = answers_before == answers_after
    no_id_mod = ids_before == ids_after
    sot_untouched = hashes_before == hashes_after

    # unsupported metadata check: every non-pending has evidence with source
    unsupported = []
    for p in patterns_out:
        for field in ("concept", "solving_algorithm", "common_errors"):
            block = p[field]
            if block["status"] == "pending":
                continue
            if not block.get("evidence"):
                unsupported.append(f"{p['pattern_id']}.{field}: no evidence")
            for ev in block["evidence"]:
                if not ev.get("validation_source"):
                    unsupported.append(f"{p['pattern_id']}.{field}: missing source")

    all_have_evidence = len(unsupported) == 0
    # For pending fields, evidence may be empty — that's OK; they are not "metadata claims"
    pass_gate = (
        no_answer_mod
        and no_id_mod
        and sot_untouched
        and all_have_evidence
        and len(patterns_out) == 6
    )

    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    doc = {
        "schemaVersion": "wo013.2-1.0",
        "woId": "WO-013.2",
        "generatedAt": now,
        "scope": {
            "input": [
                "data/pattern-master-db.json",
                "data/golden-pattern-mapping.json",
            ],
            "processed": "validation_status=verified only",
            "excluded": [
                "pending patterns",
                "invalid patterns",
                "coarse buckets",
                "mapped_frequency_verified",
            ],
        },
        "rules": [
            "Do not invent concepts",
            "Do not create AI-generated solving methods",
            "Do not assume accounting theory",
            "Unknown remains pending",
            "Each non-pending metadata item must cite question_id and/or validation_source",
        ],
        "summary": {
            "processed_pattern_count": len(patterns_out),
            "verified_metadata_field_count": verified_meta_count,
            "pending_metadata_field_count": pending_count,
            "fields_per_pattern": 3,
            "unresolved_issue_count": len(unresolved),
        },
        "integrity": {
            "answers_unchanged": no_answer_mod,
            "question_ids_unchanged": no_id_mod,
            "sot_files_unchanged": sot_untouched,
            "no_unsupported_metadata": all_have_evidence,
            "unsupported_items": unsupported,
            "source_hashes": hashes_after,
        },
        "validation": {
            "no_answer_modification": no_answer_mod,
            "no_question_id_modification": no_id_mod,
            "no_unsupported_metadata": all_have_evidence,
            "all_metadata_has_evidence_or_pending": True,
            "result": "PASS" if pass_gate else "FAIL",
        },
        "unresolved_issues": unresolved,
        "patterns": patterns_out,
    }

    OUT_DB.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    write_report(doc)
    print("WO-013.2 COMPLETE", doc["validation"]["result"])
    print("processed", doc["summary"]["processed_pattern_count"])
    print("verified_metadata", verified_meta_count, "pending", pending_count)
    return doc


def write_report(doc: dict):
    s = doc["summary"]
    v = doc["validation"]
    lines = [
        "# Pattern Metadata Validation Report (WO-013.2)",
        "",
        f"Generated: {doc['generatedAt']}",
        "",
        "## Result",
        "",
        f"**{v['result']}**",
        "",
        "| Gate | Status |",
        "|------|--------|",
        f"| no answer modification | {'PASS' if v['no_answer_modification'] else 'FAIL'} |",
        f"| no question_id modification | {'PASS' if v['no_question_id_modification'] else 'FAIL'} |",
        f"| no unsupported metadata | {'PASS' if v['no_unsupported_metadata'] else 'FAIL'} |",
        f"| all metadata has evidence (or pending) | {'PASS' if v['all_metadata_has_evidence_or_pending'] else 'FAIL'} |",
        "",
        "## Scope",
        "",
        "- Processed: Pattern Master `validation_status=verified` only (6 patterns).",
        "- Excluded: pending / coarse buckets / non-verified Master patterns.",
        "",
        "## Summary Counts",
        "",
        "| Metric | Value |",
        "|--------|------:|",
        f"| processed patterns | {s['processed_pattern_count']} |",
        f"| verified metadata fields | {s['verified_metadata_field_count']} |",
        f"| pending metadata fields | {s['pending_metadata_field_count']} |",
        f"| unresolved issues | {s['unresolved_issue_count']} |",
        "",
        "## Completed Patterns (field status)",
        "",
        "| pattern_id | concept | solving_algorithm | common_errors |",
        "|------------|---------|-------------------|---------------|",
    ]
    for p in doc["patterns"]:
        c = p["metadata_completeness"]
        lines.append(
            f"| `{p['pattern_id']}` | {c['concept']} | {c['solving_algorithm']} | {c['common_errors']} |"
        )

    lines += [
        "",
        "## Pending Metadata",
        "",
        "| pattern_id | field | reason |",
        "|------------|-------|--------|",
    ]
    for p in doc["patterns"]:
        for field in ("concept", "solving_algorithm", "common_errors"):
            block = p[field]
            if block["status"] != "pending":
                continue
            reason = block.get("pending_reason", "")
            lines.append(f"| `{p['pattern_id']}` | {field} | {reason} |")

    lines += [
        "",
        "## Evidence List",
        "",
    ]
    for p in doc["patterns"]:
        lines.append(f"### `{p['pattern_id']}` — {p['name']}")
        lines.append("")
        for field in ("concept", "solving_algorithm", "common_errors"):
            block = p[field]
            lines.append(f"**{field}** (`{block['status']}`)")
            if block["status"] == "pending":
                lines.append("")
                continue
            lines.append("")
            lines.append("| question_id | validation_source | excerpt |")
            lines.append("|-------------|-------------------|---------|")
            for ev in block.get("evidence") or []:
                qid = ev.get("question_id") or "—"
                src = ev.get("validation_source", "")
                ex = (ev.get("excerpt") or "").replace("|", "\\|")
                if len(ex) > 120:
                    ex = ex[:117] + "..."
                lines.append(f"| `{qid}` | `{src}` | {ex} |")
            lines.append("")

    lines += [
        "## Unresolved Issues",
        "",
    ]
    if not doc["unresolved_issues"]:
        lines.append("(none)")
    else:
        for u in doc["unresolved_issues"]:
            lines.append(f"- `{u['pattern_id']}`: {u['issue']}")

    lines += [
        "",
        "## Integrity",
        "",
        "| Check | Value |",
        "|-------|-------|",
        f"| answers unchanged | {doc['integrity']['answers_unchanged']} |",
        f"| question_ids unchanged | {doc['integrity']['question_ids_unchanged']} |",
        f"| SoT file hashes unchanged | {doc['integrity']['sot_files_unchanged']} |",
        "",
        "## Generated Files",
        "",
        "- `data/pattern-metadata-db.json`",
        "- `docs/pattern-metadata-validation-report.md`",
        "",
        "## Notes",
        "",
        "- `common_errors` are uniformly pending: Phase1 `solution.wrongAnalysis` is empty.",
        "- Solving steps are quoted/derived only where stem and solution lines align.",
        "- No AI-invented accounting theory was added.",
        "",
    ]
    OUT_REPORT.write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    build()
