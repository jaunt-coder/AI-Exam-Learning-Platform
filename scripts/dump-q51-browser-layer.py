#!/usr/bin/env python3
"""Simulate browser Display Layer for ACC_2015_Q051 using Python port of key rules."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
payload = json.loads((ROOT / "data/question-db-mvp.json").read_text(encoding="utf-8"))
questions = payload if isinstance(payload, list) else payload["questions"]
q = next(x for x in questions if x["questionId"] == "ACC_2015_Q051")

# Minimal simulation: fixOcrSpacing-like (preserveParagraphs=False for question field)
def fix_spacing(text: str) -> str:
    value = re.sub(r"\s*\n+\s*", " ", text or "")
    value = re.sub(r"\s{2,}", " ", value)
    value = re.sub(r"([가-힣])(\d)", r"\1 \2", value)
    value = re.sub(r"(\d)([가-힣])", lambda m: m.group(0) if m.group(2) in "년월일원주" else f"{m.group(1)} {m.group(2)}", value)
    return value.strip()


def normalize_compare(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def get_context_text(question: dict) -> str:
    stem = normalize_compare(question.get("question"))
    original = normalize_compare(question.get("originalQuestion"))
    table = normalize_compare(question.get("table") or "")
    if table and table in original:
        original = original.replace(table, "").strip()
    if not original or original == stem:
        return ""
    ctx = original.replace(stem, "").strip() if stem in original else original
    if not ctx or len(ctx) < 20:
        return ""
    return ctx


cleaned_q = fix_spacing(q["question"])
cleaned_orig = fix_spacing(q["originalQuestion"])
cleaned = {**q, "question": cleaned_q, "originalQuestion": cleaned_orig}
ctx = get_context_text(cleaned)

out = ROOT / "data/analysis/q51-browser-layer.txt"
out.write_text(
    "\n".join(
        [
            "LAYER 4 — Browser render simulation (question.js + data-cleaner spacing rules)",
            "=" * 72,
            "",
            "[#question-stem]",
            cleaned_q,
            "",
            "[#question-context — getContextText()]",
            ctx or "(hidden)",
            "",
            "[#question-table markdown source]",
            q.get("table") or "(none)",
            "",
            "[#choices-list]",
            *[f"{i+1}. {c}" for i, c in enumerate(q["choices"])],
        ]
    ),
    encoding="utf-8",
)
print(f"Wrote {out}")
