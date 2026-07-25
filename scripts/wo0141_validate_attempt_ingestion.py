#!/usr/bin/env python3
"""WO-014.1 validation: attempt schema + SoT untouched + no mastery assumptions."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(r"d:\AI Exam Learning Platform v2")

SOT_FILES = [
    "data/question-db.json",
    "data/question-db-mvp.json",
    "data/pattern-db.json",
    "data/pattern-db-mvp.json",
    "data/pattern-master-db.json",
    "data/pattern-metadata-db.json",
    "data/error-taxonomy-db.json",
    "data/student-learning-state-schema.json",
]


def sha16(rel: str) -> str:
    return hashlib.sha256((ROOT / rel).read_bytes()).hexdigest()[:16]


def main() -> int:
    checks = []

    def ok(name: str, cond: bool, detail: str = ""):
        checks.append((name, bool(cond), detail))

    schema_path = ROOT / "data/attempt-event-schema.json"
    doc_path = ROOT / "docs/attempt-ingestion-design.md"
    ok("attempt schema exists", schema_path.exists())
    ok("ingestion design exists", doc_path.exists())

    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    required = set(schema.get("required", []))
    expect = {
        "event_id",
        "student_id",
        "question_id",
        "pattern_id",
        "selected_answer",
        "correct_answer_reference",
        "result",
        "timestamp",
    }
    ok("required fields cover WO-014.1 list", expect.issubset(required), str(sorted(required)))

    props = schema.get("properties", {})
    ok("result enum correct/wrong", props.get("result", {}).get("enum") == ["correct", "wrong"])
    ref = props.get("correct_answer_reference", {})
    ok(
        "correct_answer_reference is object pointer",
        ref.get("type") == "object"
        and set(ref.get("required", [])) >= {"source", "question_id", "field"},
    )
    ok("field const is answer", ref.get("properties", {}).get("field", {}).get("const") == "answer")

    # No mastery / recommendation / error-cause in attempt event required set
    forbidden_required = {"mastery_status", "weakness", "next_action", "error_id", "error_type"}
    ok("no mastery/reco/error required on event", forbidden_required.isdisjoint(required))

    example = (schema.get("examples") or [None])[0]
    ok("example present", isinstance(example, dict))
    if example:
        ok("example result in enum", example.get("result") in ("correct", "wrong"))
        ok("example has pattern_id", bool(example.get("pattern_id")))

    # Pattern Master readable; example pattern should exist if provided
    master = json.loads((ROOT / "data/pattern-master-db.json").read_text(encoding="utf-8"))
    pids = {p["pattern_id"] for p in master["patterns"]}
    if example and example.get("pattern_id"):
        ok("example pattern_id in Pattern Master", example["pattern_id"] in pids)

    # Design doc must state no mastery calculation
    design = doc_path.read_text(encoding="utf-8")
    ok("design forbids mastery calc", "mastery_status = unknown" in design or "NO mastery" in design)
    ok("design has counter rules", "correct_count += 1" in design and "wrong_count += 1" in design)
    ok("design forbids error auto-assign", "never auto-assign" in design or "error_id: null" in design)

    # SoT files readable (not deleted); this WO must not rewrite them
    for rel in SOT_FILES:
        ok(f"sot readable {rel}", (ROOT / rel).exists(), sha16(rel))

    sls = json.loads((ROOT / "data/student-learning-state-schema.json").read_text(encoding="utf-8"))
    mastery_enum = (
        sls.get("$defs", {})
        .get("pattern_state", {})
        .get("properties", {})
        .get("mastery_status", {})
        .get("enum")
    )
    ok("SLS mastery still unknown-only", mastery_enum == ["unknown"])

    fail = [c for c in checks if not c[1]]
    print("WO-014.1 VALIDATION", "PASS" if not fail else "FAIL")
    for name, passed, detail in checks:
        print(("PASS" if passed else "FAIL"), name, detail)
    print("fail_count", len(fail))
    return 0 if not fail else 1


if __name__ == "__main__":
    raise SystemExit(main())
