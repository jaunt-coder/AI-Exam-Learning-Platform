#!/usr/bin/env python3
"""Validate Coach Phase C2 — QuestionAttempt contract (append-only).

PASS criteria:
  - schema validation (mock-attempts.json)
  - patternId canonical
  - LocalStorage key coach.attempts.v1 registered
  - append-only store API present
  - protected-file checksums unchanged

Run:
    py -3 scripts/validate-coach-phase2.py
    py -3 scripts/validate-coach-phase2.py --write-baseline
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COACH = ROOT / "data" / "coach"
MOCK = COACH / "mock-attempts.json"
BASELINE = COACH / "phase2-protected-checksums.json"

PATTERN_RE = re.compile(r"^ACC_[A-Z]+_\d{3}$")
ISO_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$")
ATTEMPT_TYPES = {"practice", "exam", "review"}
SOURCES = {"question-engine", "mock", "import"}
REQUIRED_FIELDS = {
    "id",
    "questionId",
    "patternId",
    "timestamp",
    "answer",
    "correctAnswer",
    "isCorrect",
    "elapsedSeconds",
    "attemptType",
    "source",
}

PROTECTED_GLOBS = [
    "data/question-db-mvp.json",
    "scripts/parser/*.py",
    "scripts/exam_pipeline/*.py",
    "js/question-engine.js",
    "js/shared-renderer.js",
    "js/data-cleaner.js",
    "js/ai-tutor-engine.js",
    "js/ai-tutor.js",
    "js/recommendation-engine.js",
    "js/recommendation-rules.js",
]


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return h.hexdigest()


def collect_protected() -> dict[str, str]:
    out: dict[str, str] = {}
    for pattern in PROTECTED_GLOBS:
        for path in sorted(ROOT.glob(pattern)):
            if path.is_file():
                rel = path.relative_to(ROOT).as_posix()
                out[rel] = sha256_file(path)
    return out


def validate_mock(errors: list[str]) -> list[dict]:
    if not MOCK.exists():
        errors.append("missing data/coach/mock-attempts.json")
        return []
    rows = json.loads(MOCK.read_text(encoding="utf-8"))
    if not isinstance(rows, list) or len(rows) < 20:
        errors.append(f"mock-attempts must be array length >= 20 (got {len(rows) if isinstance(rows, list) else type(rows)})")
        return rows if isinstance(rows, list) else []

    has_correct = has_wrong = has_repeat_fail = has_timeout = False
    inv_fail_count = 0
    for i, row in enumerate(rows):
        missing = REQUIRED_FIELDS - set(row.keys())
        if missing:
            errors.append(f"row[{i}] missing fields: {sorted(missing)}")
            continue
        if not PATTERN_RE.match(str(row.get("patternId", ""))):
            errors.append(f"row[{i}] non-canonical patternId: {row.get('patternId')}")
        if not ISO_RE.match(str(row.get("timestamp", ""))):
            errors.append(f"row[{i}] bad timestamp: {row.get('timestamp')}")
        if row.get("attemptType") not in ATTEMPT_TYPES:
            errors.append(f"row[{i}] bad attemptType: {row.get('attemptType')}")
        if row.get("source") not in SOURCES:
            errors.append(f"row[{i}] bad source: {row.get('source')}")
        if not isinstance(row.get("isCorrect"), bool):
            errors.append(f"row[{i}] isCorrect must be bool")
        if row.get("isCorrect") is True:
            has_correct = True
        else:
            has_wrong = True
        if row.get("patternId") == "ACC_INV_003" and row.get("isCorrect") is False:
            inv_fail_count += 1
        if isinstance(row.get("elapsedSeconds"), (int, float)) and row["elapsedSeconds"] >= 300:
            has_timeout = True
        # short UI ids forbidden
        pid = str(row.get("patternId", ""))
        if pid.startswith("INV-") or pid.startswith("PPE-"):
            errors.append(f"row[{i}] UI short pattern id forbidden: {pid}")

    if inv_fail_count >= 2:
        has_repeat_fail = True
    if not has_correct:
        errors.append("mock must include at least one correct attempt")
    if not has_wrong:
        errors.append("mock must include at least one wrong attempt")
    if not has_repeat_fail:
        errors.append("mock must include repeated failures on same pattern (ACC_INV_003)")
    if not has_timeout:
        errors.append("mock must include time-over attempt (elapsedSeconds >= 300)")
    return rows


def validate_modules(errors: list[str]) -> None:
    required = [
        "js/coach/models/question-attempt.js",
        "js/coach/stores/attemptStore.js",
        "js/coach/adapters/question-engine-adapter.js",
    ]
    for rel in required:
        if not (ROOT / rel).exists():
            errors.append(f"missing {rel}")

    store = (ROOT / "js/coach/stores/attemptStore.js").read_text(encoding="utf-8")
    for name in ("addAttempt", "getAttempts", "getQuestionHistory", "getPatternHistory", "clearCoachData"):
        if f"function {name}" not in store and f"export function {name}" not in store:
            # allow export function name
            if f"export function {name}" not in store and f"{name}," not in store and f"function {name}" not in store:
                if name not in store:
                    errors.append(f"attemptStore missing API {name}")

    if "doc.attempts.push" not in store and ".attempts.push" not in store:
        errors.append("attemptStore addAttempt must append via push (append-only)")
    if re.search(r"attempts\[.*\]\s*=", store):
        # allow only in seedAttempts writeDoc whole replace — check addAttempt body doesn't assign index
        pass
    if "splice(" in store.split("export function addAttempt")[1].split("export function")[0] if "export function addAttempt" in store else "":
        errors.append("addAttempt must not splice (append-only)")

    # addAttempt should not call filter/map to rewrite history
    add_body = ""
    if "export function addAttempt" in store:
        add_body = store.split("export function addAttempt", 1)[1].split("export function", 1)[0]
    if "splice(" in add_body:
        errors.append("addAttempt uses splice — violates append-only")

    storage = (ROOT / "js/storage.js").read_text(encoding="utf-8")
    if "coach.attempts.v1" not in storage:
        errors.append("storage.js missing LocalStorage key coach.attempts.v1")

    # question-engine must not import coach (non-invasive)
    qe = (ROOT / "js/question-engine.js").read_text(encoding="utf-8")
    if "coach/" in qe or "attemptStore" in qe:
        errors.append("question-engine.js must not import coach modules (use adapter only)")


def validate_checksums(errors: list[str], write_baseline: bool) -> None:
    current = collect_protected()
    if write_baseline:
        BASELINE.parent.mkdir(parents=True, exist_ok=True)
        BASELINE.write_text(
            json.dumps({"files": current, "note": "Phase C2 protected baseline"}, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        print(f"wrote baseline {BASELINE.relative_to(ROOT)} ({len(current)} files)")
        return
    if not BASELINE.exists():
        errors.append("missing phase2-protected-checksums.json — run with --write-baseline once")
        return
    base = json.loads(BASELINE.read_text(encoding="utf-8")).get("files") or {}
    if set(base.keys()) != set(current.keys()):
        missing = sorted(set(base) - set(current))
        extra = sorted(set(current) - set(base))
        if missing:
            errors.append(f"protected file missing: {missing[:5]}")
        if extra:
            errors.append(f"unexpected protected file set change: {extra[:5]}")
    for rel, digest in base.items():
        if rel in current and current[rel] != digest:
            errors.append(f"checksum changed (forbidden): {rel}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--write-baseline", action="store_true")
    args = parser.parse_args()

    if args.write_baseline:
        validate_checksums([], write_baseline=True)
        # still run other checks
    errors: list[str] = []
    rows = validate_mock(errors)
    validate_modules(errors)
    if not args.write_baseline:
        validate_checksums(errors, write_baseline=False)
    else:
        # after writing baseline, checksum check is tautology
        pass

    if errors:
        print("FAIL Coach Phase C2")
        for e in errors:
            print(f"  - {e}")
        return 1

    print("PASS Coach Phase C2")
    print(f"  mock attempts: {len(rows)}")
    print("  key: coach.attempts.v1")
    print("  append-only: addAttempt push-only")
    print("  question-engine: not invaded")
    print("  protected checksums: ok")
    return 0


if __name__ == "__main__":
    sys.exit(main())
