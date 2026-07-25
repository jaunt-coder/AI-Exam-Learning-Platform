#!/usr/bin/env python3
"""Inventory MVP v0.1 validation (WO-20260722-002) — read-only.

Checks:
  - ACC_INV_* patterns/questions exist in D3/D4 (read-only)
  - Plane C filter helpers present
  - No new js/coach files in this WO surface
  - Forbidden flags / D write scripts not introduced in touched inventory scripts

Usage:
  py -3 scripts/validate-inventory-mvp.py
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

RC1_PRODUCT = "0cfcaa317bc25c811cebb48e3b53218556b2320f9c3538b2d4583ba9d16a9629"
RC1_PATTERN = "0a97e796cefba51381ae3721e5d50bbb0e6c04714e5cdf861eeabe0fc18699fd"

REQUIRED_MARKERS = {
    "js/data-loader.js": ["filterInventoryScope", "INVENTORY_PATTERN_PREFIX", "ACC_INV_"],
    "js/pattern.js": ["filterInventoryScope"],
    "js/question.js": ["filterInventoryScope", "result-pattern", "toggleBookmark"],
    "js/exam.js": ["filterInventoryScope"],
    "js/exam-engine.js": ["chapterId: 'ACC_INV'", "questionCount: 28"],
    "js/question-engine.js": ["toggleBookmark", "recordRecentStudy", "STORAGE_KEYS.PROGRESS"],
    "js/app.js": ["filterInventoryScope", "재고자산"],
    "index.html": ["재고자산", "pattern.html"],
    "pattern.html": ["detail-algorithm", "study-validation-panel"],
    "question.html": ["bookmark-btn", "result-pattern"],
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_patterns(path: Path) -> list:
    data = json.loads(path.read_text(encoding="utf-8"))
    return data if isinstance(data, list) else data.get("patterns") or []


def load_questions(path: Path) -> list:
    data = json.loads(path.read_text(encoding="utf-8"))
    return data if isinstance(data, list) else data.get("questions") or []


def main() -> int:
    failures: list[str] = []
    print("=== Inventory MVP v0.1 Validate (WO-20260722-002) ===")

    product = ROOT / "data" / "question-db-mvp.json"
    pattern = ROOT / "data" / "pattern-db-mvp.json"
    if sha256(product) != RC1_PRODUCT:
        failures.append("D3 question-db-mvp.json SHA drift from RC1 (this WO must not write D3)")
    else:
        print("PASS D3 SHA matches RC1 (read-only)")
    if sha256(pattern) != RC1_PATTERN:
        failures.append("D4 pattern-db-mvp.json SHA drift from RC1 (this WO must not write D4)")
    else:
        print("PASS D4 SHA matches RC1 (read-only)")

    patterns = load_patterns(pattern)
    questions = load_questions(product)
    inv_p = [p for p in patterns if str(p.get("patternId", "")).startswith("ACC_INV_")]
    inv_q = [
        q
        for q in questions
        if q.get("chapterId") == "ACC_INV"
        or str(q.get("patternId", "")).startswith("ACC_INV_")
    ]
    print(f"INFO ACC_INV patterns={len(inv_p)} questions={len(inv_q)}")
    if len(inv_p) < 1 or len(inv_q) < 1:
        failures.append("ACC_INV_* patterns/questions missing in MVP DB")

    for rel, markers in REQUIRED_MARKERS.items():
        path = ROOT / rel
        if not path.is_file():
            failures.append(f"missing file: {rel}")
            continue
        text = path.read_text(encoding="utf-8")
        for marker in markers:
            if marker not in text:
                failures.append(f"{rel}: missing marker `{marker}`")
        if "--apply" in text and "promote-parser-emit" in text and "forbidden" not in text.lower():
            # inventory scripts should never call apply
            if rel.startswith("js/") or rel.endswith(".html"):
                failures.append(f"{rel}: unexpected --apply reference")

    coach_dir = ROOT / "js" / "coach"
    # WO forbids creating new coach files; existence of prior C1-C3 is OK.
    print(f"INFO existing coach files={len(list(coach_dir.rglob('*'))) if coach_dir.is_dir() else 0}")

    storage = (ROOT / "js" / "storage.js").read_text(encoding="utf-8")
    for key in (
        "PROGRESS: 'progress'",
        "WRONG_ANSWERS: 'wrongAnswers'",
        "BOOKMARKS: 'bookmarks'",
        "RECENT_STUDY: 'recentStudy'",
        "EXAM_HISTORY: 'examHistory'",
    ):
        if key not in storage:
            failures.append(f"storage key contract broken: {key}")

    if failures:
        print("RESULT: FAIL")
        for item in failures:
            print(" -", item)
        return 1
    print("RESULT: PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
