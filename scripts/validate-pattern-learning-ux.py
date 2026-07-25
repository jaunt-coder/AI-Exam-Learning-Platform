#!/usr/bin/env python3
"""WO-20260722-003 Pattern Learning UX — read-only checks."""
from __future__ import annotations

import hashlib
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RC1_PRODUCT = "0cfcaa317bc25c811cebb48e3b53218556b2320f9c3538b2d4583ba9d16a9629"
RC1_PATTERN = "0a97e796cefba51381ae3721e5d50bbb0e6c04714e5cdf861eeabe0fc18699fd"

MARKERS = {
    "pattern.html": [
        "detail-trigger-keywords",
        "detail-judgment-criteria",
        "detail-algorithm",
        "related-question-list",
    ],
    "js/pattern.js": [
        "getPatternTriggerKeywords",
        "getPatternJudgmentCriteria",
        "Step ${idx + 1}",
        "relatedQuestions",
    ],
    "js/pattern-engine.js": [
        "PATTERN_TRIGGER_KEYWORDS",
        "PATTERN_JUDGMENT_CRITERIA",
        "FOB 선적지",
        "위탁판매",
    ],
    "css/pattern.css": [
        "trigger-keyword-list",
        "judgment-criteria-list",
    ],
}


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> int:
    fails: list[str] = []
    print("=== WO-20260722-003 Pattern Learning UX Validate ===")

    if sha(ROOT / "data/question-db-mvp.json") != RC1_PRODUCT:
        fails.append("D3 SHA changed")
    else:
        print("PASS D3 unchanged")
    if sha(ROOT / "data/pattern-db-mvp.json") != RC1_PATTERN:
        fails.append("D4 SHA changed")
    else:
        print("PASS D4 unchanged")

    coach_new = [
        p for p in (ROOT / "js/coach").rglob("*") if p.is_file() and p.suffix in {".js", ".md"}
    ]
    print(f"INFO coach files present={len(coach_new)} (new file creation not checked via git)")

    for rel, needles in MARKERS.items():
        text = (ROOT / rel).read_text(encoding="utf-8")
        for n in needles:
            if n not in text:
                fails.append(f"{rel}: missing `{n}`")

    # Algorithm Step structure still driven by learning points (not redesigned)
    engine = (ROOT / "js/pattern-engine.js").read_text(encoding="utf-8")
    if "PATTERN_LEARNING_POINTS" not in engine:
        fails.append("PATTERN_LEARNING_POINTS removed (algorithm source broken)")

    pattern_js = (ROOT / "js/pattern.js").read_text(encoding="utf-8")
    if "getPatternLearningPoints(patternId)" not in pattern_js:
        fails.append("algorithm no longer uses getPatternLearningPoints")

    if fails:
        print("RESULT: FAIL")
        for f in fails:
            print(" -", f)
        return 1
    print("RESULT: PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
