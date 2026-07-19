from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scripts.exam_pipeline.question_parser import (
    build_original_question,
    extract_choice_grid_won,
    strip_question_prefix,
    trim_stem_before_choice_grid,
)
from scripts.exam_pipeline.text_postprocess import (
    collapse_soft_breaks,
    fix_scattered_year_pairs,
    format_question_text,
    rejoin_exam_line_fragments,
    remove_footer_noise,
)

raw = Path("data/analysis/q51-2015-raw.txt").read_text(encoding="utf-8")
body = strip_question_prefix(raw)
choice_idx = body.find("①")
stem_raw = body[:choice_idx] if choice_idx >= 0 else body
step1 = remove_footer_noise(stem_raw)
step2 = rejoin_exam_line_fragments(step1)
step3 = collapse_soft_breaks(step2)
step4 = fix_scattered_year_pairs(step3)
formatted = format_question_text(stem_raw)
stem = trim_stem_before_choice_grid(formatted)
choices, table = extract_choice_grid_won(body)
original = build_original_question(stem, table)

out = Path("data/analysis/q51-repair-test.txt")
out.write_text(
    "\n".join(
        [
            "=== STEP rejoin ===",
            step2,
            "",
            "=== STEP collapse ===",
            step3,
            "",
            "=== STEP fix_years ===",
            step4,
            "",
            "=== STEM ===",
            stem,
            "",
            "=== CHOICES ===",
            *choices,
            "",
            "=== TABLE ===",
            table.grid_text if table else "(none)",
            "",
            "=== ORIGINAL ===",
            original,
        ]
    ),
    encoding="utf-8",
)
print(f"Wrote {out}")
