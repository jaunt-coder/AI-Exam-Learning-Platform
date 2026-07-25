"""Parser engine configuration (Phase 1).

Independent of scripts/exam_pipeline/*. The new engine does not import the
legacy parser; shared paths are re-derived here so the engines stay decoupled.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

# scripts/parser/config.py -> parents[2] == project root
ROOT = Path(__file__).resolve().parents[2]
SOURCE_DIR = ROOT / "source" / "original-exams"
ANSWERS_DIR = SOURCE_DIR / "answers"
CACHE_DIR = ROOT / "data" / "analysis" / "ocr-cache"

# Accounting subject question range (41~80) — same domain as the legacy engine.
ACC_START = 41
ACC_END = 80
EXPECTED_ACC_COUNT = ACC_END - ACC_START + 1

# MVP scope years (source PDFs with text layer). Others are supported too.
MVP_YEARS = [2015, 2017, 2018, 2020, 2024, 2025]

# Source file resolution priority per year: HWP first, then PDF.
EXAM_SUFFIX_PRIORITY = (".hwp", ".pdf")

# A PDF whose extracted text layer is shorter than this is treated as scanned
# (image-only) and routed to OCR by Stage 2.
PDF_TEXT_LAYER_MIN_CHARS = 800

# OCR rendering DPI (used only when needs_ocr is True).
OCR_DPI = 180


@dataclass(frozen=True)
class ParserConfig:
    """Runtime knobs passed through the pipeline via ParseContext."""

    source_dir: Path = SOURCE_DIR
    cache_dir: Path = CACHE_DIR
    acc_start: int = ACC_START
    acc_end: int = ACC_END
    exam_suffix_priority: tuple[str, ...] = EXAM_SUFFIX_PRIORITY
    pdf_text_layer_min_chars: int = PDF_TEXT_LAYER_MIN_CHARS
    ocr_dpi: int = OCR_DPI
    ocr_langs: tuple[str, ...] = ("ko", "en")

    def source_candidates(self, year: int) -> list[Path]:
        """Candidate source files for a year, in resolution priority order."""
        return [self.source_dir / f"{year}{suffix}" for suffix in self.exam_suffix_priority]


DEFAULT_CONFIG = ParserConfig()
