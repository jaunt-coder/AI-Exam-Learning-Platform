"""Stage 1 — DocumentLoader.

Resolves the source file for a year and decides how it must be extracted
(text layer vs OCR). It does NOT read content into structured form; that is
Stage 2 (TextExtractor). This module is independent of scripts/exam_pipeline.
"""
from __future__ import annotations

from pathlib import Path

import fitz  # PyMuPDF

from config import DEFAULT_CONFIG, ParserConfig
from context import ParseContext
from model import RawDocument


class DocumentLoader:
    """Stage 1: resolve source + routing decision -> RawDocument."""

    name = "DocumentLoader"

    def __init__(self, config: ParserConfig | None = None):
        self.config = config or DEFAULT_CONFIG

    def resolve(self, year: int) -> tuple[Path | None, str | None]:
        for candidate in self.config.source_candidates(year):
            if candidate.exists():
                return candidate, candidate.suffix.lstrip(".").lower()
        return None, None

    def _pdf_routing(self, path: Path) -> tuple[bool, int, str]:
        """Return (needs_ocr, page_count, note) for a PDF."""
        doc = fitz.open(str(path))
        try:
            page_count = doc.page_count
            text_len = sum(len(page.get_text("text") or "") for page in doc)
        finally:
            doc.close()
        needs_ocr = text_len < self.config.pdf_text_layer_min_chars
        note = f"text_layer_chars={text_len}"
        return needs_ocr, page_count, note

    def _hwp_routing(self, path: Path) -> tuple[bool, int, str]:
        """Return (needs_ocr, page_count, note) for an HWP.

        HWP has no page model; text extraction is attempted by Stage 2. If the
        file is a distributable (locked) HWP without readable body, Stage 2 will
        fall back to OCR of embedded images.
        """
        try:
            from hwp5.filestructure import Hwp5File

            hwp = Hwp5File(str(path))
            distributable = bool(getattr(hwp.header.flags, "distributable", 0))
            if distributable:
                return True, 0, "hwp_distributable"
            return False, 0, "hwp_text"
        except Exception as exc:  # noqa: BLE001 - loader must never crash
            return False, 0, f"hwp_probe_failed:{exc!r}"

    def load(self, year: int) -> RawDocument:
        path, kind = self.resolve(year)
        if not path or not kind:
            return RawDocument(
                year=year, path=None, kind=None, exists=False,
                note="source not found",
            )

        if kind == "pdf":
            needs_ocr, page_count, note = self._pdf_routing(path)
        elif kind == "hwp":
            needs_ocr, page_count, note = self._hwp_routing(path)
        else:
            needs_ocr, page_count, note = False, 0, f"unknown_kind:{kind}"

        return RawDocument(
            year=year,
            path=path,
            kind=kind,
            exists=True,
            needs_ocr=needs_ocr,
            page_count=page_count,
            note=note,
        )

    def run(self, ctx: ParseContext) -> ParseContext:
        if ctx.year is None:
            ctx.add(self.name, "error", "ParseContext.year is not set")
            return ctx
        ctx.raw = self.load(ctx.year)
        if not ctx.raw.exists:
            ctx.add(self.name, "error", f"{ctx.year}: source not found")
        else:
            ctx.add(
                self.name, "info",
                f"{ctx.year}: {ctx.raw.kind} pages={ctx.raw.page_count} "
                f"ocr={ctx.raw.needs_ocr} ({ctx.raw.note})",
            )
        return ctx
