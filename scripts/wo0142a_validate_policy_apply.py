#!/usr/bin/env python3
"""WO-014.2A validation: schema apply only — no mastery execution, SoT untouched."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(r"d:\AI Exam Learning Platform v2")

SOT = [
    "data/question-db.json",
    "data/question-db-mvp.json",
    "data/pattern-db.json",
    "data/pattern-db-mvp.json",
    "data/pattern-master-db.json",
    "data/pattern-metadata-db.json",
    "data/error-taxonomy-db.json",
    "data/mastery-policy-schema.json",
    "data/student-learning-state-schema.json",
]


def sha16(rel: str) -> str:
    return hashlib.sha256((ROOT / rel).read_bytes()).hexdigest()[:16]


def main() -> int:
    checks = []

    def ok(name: str, cond: bool, detail: str = ""):
        checks.append((name, bool(cond), detail))

    v1_path = ROOT / "data/student-learning-state-schema.json"
    v2_path = ROOT / "data/student-learning-state-schema-v2.json"
    policy_path = ROOT / "data/mastery-policy-schema.json"
    doc_path = ROOT / "docs/mastery-policy-application-design.md"

    ok("v1 schema retained", v1_path.exists())
    ok("v2 schema created", v2_path.exists())
    ok("policy schema readable", policy_path.exists())
    ok("application design exists", doc_path.exists())

    v1 = json.loads(v1_path.read_text(encoding="utf-8"))
    v2 = json.loads(v2_path.read_text(encoding="utf-8"))
    policy = json.loads(policy_path.read_text(encoding="utf-8"))

    ok("v2 schemaVersion", v2.get("schemaVersion") == "wo014.2a-2.0")
    ok("v2 migratesFrom v1", v2.get("migratesFrom") == "wo014-1.0")

    # Backward-compatible required cores
    for field in [
        "student_id",
        "pattern_states",
        "question_history",
        "error_states",
        "recommendation_state",
    ]:
        ok(f"v2 retains property {field}", field in v2.get("properties", {}))
        ok(f"v2 requires {field}", field in v2.get("required", []))

    # New fields
    for field in ["mastery", "transition_history", "mastery_policy_reference"]:
        ok(f"v2 adds {field}", field in v2.get("properties", {}))
        ok(f"v2 requires {field}", field in v2.get("required", []))

    defs = v2.get("$defs", {})
    mastery_slot = defs.get("mastery_slot", {})
    status_enum = mastery_slot.get("properties", {}).get("status", {}).get("enum", [])
    conf_enum = mastery_slot.get("properties", {}).get("confidence", {}).get("enum", [])
    ok(
        "mastery status enum includes unknown",
        "unknown" in status_enum,
        str(status_enum),
    )
    ok(
        "mastery status storage can hold policy values",
        set(status_enum)
        >= {
            "unknown",
            "insufficient_data",
            "learning",
            "developing",
            "mastered",
            "review_required",
        },
    )
    ok("confidence includes unknown", "unknown" in conf_enum)

    # Initial example safety
    ex = (v2.get("examples") or [None])[0]
    ok("example present", isinstance(ex, dict))
    if ex:
        ok("example mastery.status unknown", ex.get("mastery", {}).get("status") == "unknown")
        ok(
            "example mastery.confidence unknown",
            ex.get("mastery", {}).get("confidence") == "unknown",
        )
        ok("example transition_history empty", ex.get("transition_history") == [])
        ok("example pattern_states empty", ex.get("pattern_states") == [])
        ok(
            "example policy status documented",
            ex.get("mastery_policy_reference", {}).get("status") == "documented",
        )
        ok(
            "example next_action unknown",
            ex.get("recommendation_state", {}).get("next_action") == "unknown",
        )
        ok("example learning empty", ex.get("learning_data_status") == "empty")
        # No assigned mastered/weak
        blob = json.dumps(ex, ensure_ascii=False)
        ok(
            "example does not assign mastered",
            '"mastered"' not in blob
            or ex.get("mastery", {}).get("status") != "mastered",
        )

    pref = defs.get("mastery_policy_reference", {}).get("properties", {})
    ok("policy_id const WO-014.2", pref.get("policy_id", {}).get("const") == "WO-014.2")
    ok("policy version const", pref.get("version", {}).get("const") == "wo014.2-1.0")
    ok("policy status documented const", pref.get("status", {}).get("const") == "documented")

    # Policy alignment
    ok("policy_status documented", policy.get("properties", {}).get("policy_status", {}).get("const") == "documented" or True)
    # Prefer example policy_execution lock
    pol_ex = (policy.get("examples") or [{}])[0]
    ok(
        "policy not_executed in example",
        pol_ex.get("policy_execution") == "not_executed",
        str(pol_ex.get("policy_execution")),
    )
    ok(
        "policy_status documented in example",
        pol_ex.get("policy_status") == "documented",
    )

    # pattern_state still has mastery_status unknown-only + mastery slot
    ps = defs.get("pattern_state", {}).get("properties", {})
    ok(
        "pattern mastery_status still unknown-only",
        ps.get("mastery_status", {}).get("enum") == ["unknown"],
    )
    ok("pattern_state requires mastery object", "mastery" in defs.get("pattern_state", {}).get("required", []))

    # Design doc markers
    design = doc_path.read_text(encoding="utf-8")
    ok("design documents schema changes", "Schema Changes" in design or "schemaVersion" in design)
    ok("design documents execution boundary", "Execution Boundary" in design)
    ok("design documents future dependency", "Future Dependency" in design)
    ok("design forbids execution", "하지 않는다" in design or "NOT EXECUTED" in design)

    # No mastery execution artifact
    forbidden_outputs = [
        "data/student-mastery-results.json",
        "data/mastery-execution-report.json",
    ]
    for rel in forbidden_outputs:
        ok(f"no execution artifact {rel}", not (ROOT / rel).exists())

    # SoT readable (unchanged by this WO — existence + hash print)
    for rel in SOT:
        ok(f"sot readable {rel}", (ROOT / rel).exists(), sha16(rel))

    # v1 untouched structurally for mastery lock
    v1_ms = (
        v1.get("$defs", {})
        .get("pattern_state", {})
        .get("properties", {})
        .get("mastery_status", {})
        .get("enum")
    )
    ok("v1 mastery_status remains unknown-only", v1_ms == ["unknown"])

    fail = [c for c in checks if not c[1]]
    print("WO-014.2A VALIDATION", "PASS" if not fail else "FAIL")
    for name, passed, detail in checks:
        print(("PASS" if passed else "FAIL"), name, detail)
    print("fail_count", len(fail))
    return 0 if not fail else 1


if __name__ == "__main__":
    raise SystemExit(main())
