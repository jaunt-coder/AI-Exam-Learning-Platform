#!/usr/bin/env python3
"""Validate Coach Phase C1 mock JSON against schema rules.

Run:
    py -3 scripts/validate-coach-phase1.py
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COACH = ROOT / "data" / "coach"
PATTERN_RE = re.compile(r"^ACC_[A-Z]+_\d{3}$")
SEVERITIES = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}


def load(name: str):
    path = COACH / name
    return json.loads(path.read_text(encoding="utf-8")), path


def main() -> int:
    errors: list[str] = []

    profile, ppath = load("mock-user-profile.json")
    for field in ("userId", "examTarget", "currentScore", "targetScore", "weakPatterns"):
        if field not in profile:
            errors.append(f"{ppath.name}: missing {field}")
    if not (0 <= float(profile.get("accuracyRate", -1)) <= 1):
        errors.append(f"{ppath.name}: accuracyRate out of range")
    for pid in profile.get("weakPatterns", []):
        if not PATTERN_RE.match(pid):
            errors.append(f"{ppath.name}: non-canonical weakPattern {pid}")
    for pid in profile.get("strongPatterns", []):
        if not PATTERN_RE.match(pid):
            errors.append(f"{ppath.name}: non-canonical strongPattern {pid}")

    attempts, apath = load("mock-question-attempts.json")
    if not isinstance(attempts, list) or not attempts:
        errors.append(f"{apath.name}: must be non-empty array")
    for att in attempts:
        if not PATTERN_RE.match(att.get("patternId", "")):
            errors.append(f"{apath.name}: bad patternId {att.get('patternId')}")
        if "correct" not in att or "questionId" not in att:
            errors.append(f"{apath.name}: attempt missing correct/questionId")

    reports, rpath = load("mock-weakness-reports.json")
    if not isinstance(reports, list) or not reports:
        errors.append(f"{rpath.name}: must be non-empty array")
    for rep in reports:
        if not PATTERN_RE.match(rep.get("patternId", "")):
            errors.append(f"{rpath.name}: bad patternId {rep.get('patternId')}")
        if rep.get("severity") not in SEVERITIES:
            errors.append(f"{rpath.name}: bad severity {rep.get('severity')}")
        fr = float(rep.get("failureRate", -1))
        if not (0 <= fr <= 1):
            errors.append(f"{rpath.name}: failureRate out of range")

    # Module files exist
    coach_js = ROOT / "js" / "coach"
    for name in (
        "models.js",
        "profile-store.js",
        "attempt-store.js",
        "weakness-store.js",
        "ai-provider.js",
        "index.js",
        "README.md",
    ):
        if not (coach_js / name).exists():
            errors.append(f"missing js/coach/{name}")

    storage = (ROOT / "js" / "storage.js").read_text(encoding="utf-8")
    for key in ("userProfile", "questionAttempts", "weaknessReports"):
        if key not in storage:
            errors.append(f"storage.js missing key {key}")

    # IR core must still exist (protection smoke)
    for rel in (
        "scripts/parser/table_cell_reconstructor.py",
        "scripts/parser/semantic_repair.py",
        "scripts/parser/semantic_validator.py",
        "scripts/parser/ir_integrity.py",
        "scripts/parser/question_builder.py",
    ):
        if not (ROOT / rel).exists():
            errors.append(f"IR core missing: {rel}")

    if errors:
        print("FAIL Coach Phase C1 validation")
        for e in errors:
            print(f"  - {e}")
        return 1

    print("PASS Coach Phase C1")
    print(f"  profile weakPatterns={profile['weakPatterns']}")
    print(f"  attempts={len(attempts)} reports={len(reports)}")
    print("  IR core files present")
    print("  LocalStorage keys registered")
    return 0


if __name__ == "__main__":
    sys.exit(main())
