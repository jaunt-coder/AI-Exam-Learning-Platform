"""Phase 3 harness extension — choice & footer metrics.

Parser-independent metric math (no import from scripts/parser). The runner adapts
both Before (DB) and After (new engine) into the simple shapes used here, so the
comparison stays apples-to-apples.
"""
from __future__ import annotations

import re

EXPECTED_PER_Q = 5

# Footer/header signatures — used ONLY to measure false negatives (missed
# boilerplate), never to drive deletion in the engine.
_FOOTER_PATS = [
    re.compile(r"교시"),
    re.compile(r"A-\s*\d"),
    re.compile(r"제\s*\d+\s*회"),
    re.compile(r"^\s*-?\s*\d{1,3}\s*-?\s*$"),
    re.compile(r"감정평가사"),
]
_HANGUL = re.compile(r"[가-힣]")
_CHOICE_GLYPHS = "①②③④⑤⑥⑦⑧⑨⑩"


def aggregate_choice_metrics(per_question: list[list[str]]) -> dict:
    """`per_question[i]` = ordered choice CONTENT strings for question i
    (one entry per detected/stored choice). Works for Before and After."""
    n = len(per_question)
    expected = EXPECTED_PER_Q * n
    found = 0
    count5 = 0
    non_empty = 0
    for choices in per_question:
        capped = min(len(choices), EXPECTED_PER_Q)
        found += capped
        if len([c for c in choices if c is not None]) == EXPECTED_PER_Q:
            count5 += 1
        non_empty += sum(1 for c in choices[:EXPECTED_PER_Q] if c and c.strip())

    def r(a, b):
        return round(a / b, 4) if b else 1.0

    return {
        "questions": n,
        "expectedMarkers": expected,
        "foundMarkers": found,
        "markerRecall": r(found, expected),
        "count5Questions": count5,
        "countAccuracy": r(count5, n),
        "textCoverage": r(non_empty, expected),
    }


def _is_boilerplate(text: str) -> bool:
    return any(p.search(text) for p in _FOOTER_PATS)


def footer_proxies(removed_texts: list[str], surviving_margin_texts: list[str]) -> dict:
    """false positive: content wrongly removed; false negative: boilerplate missed.

    A removal is a FALSE POSITIVE only if the removed line does NOT match any known
    boilerplate signature yet still carries content (a choice glyph, or a real text
    run). Legitimate exam-code / 교시 / page-number footers match a signature and are
    therefore not counted as false positives even though they contain Hangul.
    """
    false_pos = 0
    for t in removed_texts:
        s = t.strip()
        if _is_boilerplate(s):
            continue
        if any(g in s for g in _CHOICE_GLYPHS) or len(_HANGUL.findall(s)) >= 4:
            false_pos += 1
    false_neg = 0
    for t in surviving_margin_texts:
        s = t.strip()
        if s and _is_boilerplate(s):
            false_neg += 1
    return {
        "removed": len(removed_texts),
        "falsePositive": false_pos,
        "survivingMarginBoilerplate": false_neg,
    }
