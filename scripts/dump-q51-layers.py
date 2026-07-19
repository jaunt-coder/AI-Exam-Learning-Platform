#!/usr/bin/env python3
"""Dump ACC_2015_Q051 pipeline layers for diff analysis."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from exam_pipeline.question_parser import (
    collect_question_markers,
    detect_table_block,
    extract_choice_grid_won,
    extract_circled_choices,
    extract_stem,
    fill_missing_markers,
    find_accounting_start,
    parse_accounting_questions,
    prepare_exam_text,
    resolve_choices_and_table,
    split_question_bodies,
    strip_question_prefix,
)
from exam_pipeline.source_loader import load_exam_document
from exam_pipeline.constants import ACC_END, ACC_START, CACHE_DIR
from exam_pipeline.text_postprocess import format_question_text

OUT = ROOT / "data" / "analysis" / "q51-layer-dump.txt"
YEAR = 2015
NUM = 51


def section(title: str, content: str) -> str:
    bar = "=" * 72
    return f"\n{bar}\n{title}\n{bar}\n{content.rstrip()}\n"


def main() -> None:
    doc = load_exam_document(YEAR, CACHE_DIR)
    full = prepare_exam_text(doc.text)
    acc_start = find_accounting_start(full)
    scoped = full[acc_start:]
    markers = collect_question_markers(scoped, ACC_START, ACC_END)
    markers = fill_missing_markers(markers, ACC_START, ACC_END)
    bodies = split_question_bodies(scoped, markers)
    body = bodies.get(NUM, "")

    stem_pre = strip_question_prefix(body)
    choice_idx = body.find("①")
    stem_raw_before_fmt = body[:choice_idx] if choice_idx >= 0 else body
    stem_raw_before_fmt = strip_question_prefix(stem_raw_before_fmt)

    table_extract, cleaned_body = detect_table_block(body)
    choices, table_final = resolve_choices_and_table(body, table_extract)
    stem = extract_stem(cleaned_body if table_final else body, table_final)
    grid_choices, grid_table = extract_choice_grid_won(body)
    circled = extract_circled_choices(body)

    parsed = next(
        q for q in parse_accounting_questions(doc.text, doc.pages) if q.question_number == NUM
    )

    db_path = ROOT / "data" / "question-db-mvp.json"
    payload = json.loads(db_path.read_text(encoding="utf-8"))
    questions = payload if isinstance(payload, list) else payload["questions"]
    db_q = next(q for q in questions if q["questionId"] == "ACC_2015_Q051")

    parts = [
        section(
            "LAYER 1 — Source body (split_question_bodies raw, lines)",
            "\n".join(f"{i+1:3}| {line}" for i, line in enumerate(body.splitlines())),
        ),
        section(
            "LAYER 2a — Parser: stem_raw BEFORE format_question_text",
            stem_raw_before_fmt,
        ),
        section(
            "LAYER 2b — Parser: stem AFTER format_question_text (extract_stem output)",
            stem,
        ),
        section(
            "LAYER 2c — Parser: extract_circled_choices (fallback path)",
            "\n".join(f"{i+1}. {c}" for i, c in enumerate(circled)),
        ),
        section(
            "LAYER 2d — Parser: extract_choice_grid_won (grid path)",
            "\n".join(f"{i+1}. {c}" for i, c in enumerate(grid_choices))
            + "\n\nTABLE:\n"
            + (grid_table.grid_text if grid_table else "(none)"),
        ),
        section(
            "LAYER 2e — Parser: resolve_choices_and_table FINAL choices",
            "\n".join(f"{i+1}. {c}" for i, c in enumerate(choices)),
        ),
        section(
            "LAYER 2f — Parser: ParsedQuestion.original_question",
            parsed.original_question,
        ),
        section("LAYER 3 — JSON question field", db_q["question"]),
        section("LAYER 3 — JSON originalQuestion field", db_q["originalQuestion"]),
        section("LAYER 3 — JSON choices", "\n".join(f"{i+1}. {c}" for i, c in enumerate(db_q["choices"]))),
        section("LAYER 3 — JSON table", db_q.get("table") or "(null)"),
    ]
    OUT.write_text("".join(parts), encoding="utf-8")
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
