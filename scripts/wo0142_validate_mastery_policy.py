#!/usr/bin/env python3
"""WO-014.2 validation: mastery policy documented, not executed; SoT untouched."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(r"d:\AI Exam Learning Platform v2")

REQUIRED_STATUS = [
    "unknown",
    "insufficient_data",
    "learning",
    "developing",
    "mastered",
    "review_required",
]
REQUIRED_CONFIDENCE = ["unknown", "low", "medium", "high"]
REQUIRED_METRICS = [
    "attempt_count",
    "correct_count",
    "wrong_count",
    "accuracy",
    "recent_performance",
]

SOT_MUST_EXIST = [
    "data/question-db.json",
    "data/pattern-master-db.json",
    "data/pattern-metadata-db.json",
    "data/student-learning-state-schema.json",
    "data/attempt-event-schema.json",
]


def main() -> int:
    checks: list[tuple[str, bool, str]] = []

    def ok(name: str, cond: bool, detail: str = "") -> None:
        checks.append((name, bool(cond), detail))

    policy_path = ROOT / "data/mastery-policy-schema.json"
    doc_path = ROOT / "docs/mastery-calculation-policy.md"
    ok("policy schema exists", policy_path.exists())
    ok("policy doc exists", doc_path.exists())

    schema = json.loads(policy_path.read_text(encoding="utf-8"))
    example = schema["examples"][0]

    ok("schemaVersion wo014.2-1.0", schema.get("schemaVersion") == "wo014.2-1.0")
    ok("woId WO-014.2", schema.get("woId") == "WO-014.2")
    ok("policy_status documented", example.get("policy_status") == "documented")
    ok("policy_execution not_executed", example.get("policy_execution") == "not_executed")

    statuses = [x["value"] for x in example["mastery_status_enum"]]
    ok("mastery enum complete", statuses == REQUIRED_STATUS, str(statuses))
    ok(
        "accuracy alone never sufficient",
        all(x.get("accuracy_alone_sufficient") is False for x in example["mastery_status_enum"]),
    )

    conf = [x["value"] for x in example["mastery_confidence_enum"]]
    ok("confidence enum complete", conf == REQUIRED_CONFIDENCE, str(conf))
    ok(
        "confidence increase conditions documented",
        all("increase_conditions" in x for x in example["mastery_confidence_enum"]),
    )

    metrics = [x["metric_id"] for x in example["input_metrics"]]
    ok("input metrics complete", metrics == REQUIRED_METRICS, str(metrics))

    mdr = example["minimum_data_requirements"]
    ok("minimum_data auto_apply false", mdr.get("auto_apply") is False)
    tf = example["transition_framework"]
    ok("transition mode conceptual_only", tf.get("mode") == "conceptual_only")
    ok(
        "transition has eligibility concepts",
        len(tf.get("eligibility_concepts", [])) >= 6,
    )

    forb = example.get("forbidden_rules", [])
    ok(
        "forbids accuracy-only mastery",
        any("accuracy only" in r.lower() or "accuracy만" in r for r in forb)
        or any("accuracy only" in r for r in forb),
        str(forb[:2]),
    )
    ok(
        "forbids recommendations",
        any("recommend" in r.lower() for r in forb),
    )
    ok(
        "forbids real mastery calculation",
        any("real student mastery" in r.lower() or "calculate" in r.lower() for r in forb),
    )

    locks = example["downstream_locks"]
    ok("learning state mastery still unknown_only", locks.get("student_learning_state_mastery_enum_wo014") == "unknown_only")
    ok("next_action unknown_only", locks.get("recommendation_next_action") == "unknown_only")

    integ = example["integrity"]
    for k in [
        "no_student_mastery_assumption",
        "no_recommendation_logic",
        "no_question_modification",
        "no_answer_modification",
        "no_pattern_modification",
        "no_real_mastery_calculation",
    ]:
        ok(f"integrity.{k}", integ.get(k) is True)

    ok("validation.result PASS", example.get("validation", {}).get("result") == "PASS")

    # WO-014 Learning State must still lock mastery to unknown only
    sls = json.loads((ROOT / "data/student-learning-state-schema.json").read_text(encoding="utf-8"))
    mastery_enum = sls["$defs"]["pattern_state"]["properties"]["mastery_status"]["enum"]
    ok("SLS mastery enum unchanged unknown-only", mastery_enum == ["unknown"], str(mastery_enum))
    next_enum = sls["$defs"]["recommendation_state"]["properties"]["next_action"]["enum"]
    ok("SLS next_action unchanged unknown-only", next_enum == ["unknown"], str(next_enum))

    # No student mastery result artifact invented by this WO
    banned_outputs = [
        "data/student-mastery-results.json",
        "data/mastery-calculations.json",
        "data/student-learning-state.json",
    ]
    for rel in banned_outputs:
        ok(f"no executed output {rel}", not (ROOT / rel).exists())

    for rel in SOT_MUST_EXIST:
        ok(f"input readable {rel}", (ROOT / rel).exists())

    # pattern-metadata readable; policy must not claim it as mastery calculator
    meta = json.loads((ROOT / "data/pattern-metadata-db.json").read_text(encoding="utf-8"))
    ok("pattern-metadata present", len(meta.get("patterns", [])) >= 1)
    ok(
        "candidate params pending_human",
        example.get("candidate_parameters", {}).get("approval_status") == "pending_human",
    )

    fail = [c for c in checks if not c[1]]
    print("WO-014.2 MASTERY POLICY VALIDATION", "PASS" if not fail else "FAIL")
    for name, passed, detail in checks:
        print(("PASS" if passed else "FAIL"), name, detail)
    print("fail_count", len(fail))
    return 0 if not fail else 1


if __name__ == "__main__":
    raise SystemExit(main())
