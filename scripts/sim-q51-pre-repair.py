#!/usr/bin/env python3
"""Simulate PRE-REPAIR parser path for ACC_2015_Q051 (bug reproduction)."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from exam_pipeline.question_parser import (
    collect_question_markers,
    extract_circled_choices,
    fill_missing_markers,
    find_accounting_start,
    find_first_choice_index,
    prepare_exam_text,
    split_question_bodies,
    strip_question_prefix,
)
from exam_pipeline.source_loader import load_exam_document
from exam_pipeline.constants import ACC_END, ACC_START, CACHE_DIR
from exam_pipeline.text_postprocess import (
    collapse_soft_breaks,
    fix_glued_hangul_spacing,
    remove_footer_noise,
)

doc = load_exam_document(2015, CACHE_DIR)
full = prepare_exam_text(doc.text)
scoped = full[find_accounting_start(full) :]
markers = fill_missing_markers(collect_question_markers(scoped, ACC_START, ACC_END), ACC_START, ACC_END)
body = split_question_bodies(scoped, markers)[51]
body = remove_footer_noise(body)
choice_idx = find_first_choice_index(body)
stem_raw = strip_question_prefix(body[:choice_idx])

# OLD path: collapse + glued spacing ONLY (no rejoin / fix_scattered / trim)
old_stem = fix_glued_hangul_spacing(collapse_soft_breaks(stem_raw))
old_choices = extract_circled_choices(body)
old_original = old_stem  # no separate table; question == originalQuestion

out = ROOT / "data/analysis/q51-pre-repair-sim.txt"
out.write_text(
    "\n".join(
        [
            "PRE-REPAIR SIMULATION (collapse_soft_breaks + fix_glued_hangul_spacing only)",
            "=" * 72,
            "",
            "[stem / question / originalQuestion — all identical]",
            old_stem,
            "",
            "[choices via extract_circled_choices only]",
            *[f"{i+1}. {c}" for i, c in enumerate(old_choices)],
        ]
    ),
    encoding="utf-8",
)
print(f"Wrote {out}")
