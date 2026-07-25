#!/usr/bin/env python3
"""WO-014 schema validation (no SoT writes)."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(r"d:\AI Exam Learning Platform v2")


def main():
    schema = json.loads(
        (ROOT / "data/student-learning-state-schema.json").read_text(encoding="utf-8")
    )
    example = schema["examples"][0]
    defs = schema["$defs"]
    checks = []

    def ok(name: str, cond: bool, detail: str = ""):
        checks.append((name, bool(cond), detail))

    props = schema.get("properties", {})
    ok(
        "schema has required root props",
        all(
            k in props
            for k in [
                "student_id",
                "pattern_states",
                "question_history",
                "error_states",
                "recommendation_state",
            ]
        ),
    )
    ok(
        "mastery enum unknown only",
        defs["pattern_state"]["properties"]["mastery_status"]["enum"] == ["unknown"],
    )
    ok(
        "confidence enum unknown only",
        defs["error_state"]["properties"]["confidence"]["enum"] == ["unknown"],
    )
    ok(
        "next_action unknown only",
        defs["recommendation_state"]["properties"]["next_action"]["enum"] == ["unknown"],
    )
    ok(
        "learning_data_status empty only",
        props["learning_data_status"]["enum"] == ["empty"],
    )
    ok(
        "example arrays empty",
        example["pattern_states"] == []
        and example["question_history"] == []
        and example["error_states"] == [],
    )
    ok("example next_action unknown", example["recommendation_state"]["next_action"] == "unknown")
    ok("example learning empty", example["learning_data_status"] == "empty")
    for k in schema["required"]:
        ok(f"example has {k}", k in example)

    ok("schema file exists", (ROOT / "data/student-learning-state-schema.json").exists())
    ok("design doc exists", (ROOT / "docs/student-learning-state-design.md").exists())

    for rel in [
        "data/pattern-master-db.json",
        "data/pattern-metadata-db.json",
        "data/error-taxonomy-db.json",
    ]:
        ok(f"kb readable {rel}", (ROOT / rel).exists())

    master = json.loads((ROOT / "data/pattern-master-db.json").read_text(encoding="utf-8"))
    verified = [
        p["pattern_id"] for p in master["patterns"] if p.get("validation_status") == "verified"
    ]
    err = json.loads((ROOT / "data/error-taxonomy-db.json").read_text(encoding="utf-8"))
    ok("verified patterns available", len(verified) == 6, str(verified))
    ok("error taxonomy candidates present", len(err.get("errors", [])) >= 1)

    # No assumed student state: example must not invent mastery/weakness rows
    ok("no preseeded pattern_states", len(example["pattern_states"]) == 0)
    ok("no preseeded error_states", len(example["error_states"]) == 0)

    fail = [c for c in checks if not c[1]]
    print("WO-014 SCHEMA VALIDATION", "PASS" if not fail else "FAIL")
    for name, passed, detail in checks:
        print(("PASS" if passed else "FAIL"), name, detail)
    print("fail_count", len(fail))
    return 0 if not fail else 1


if __name__ == "__main__":
    raise SystemExit(main())
