"""Stage 2 — TextExtractor.

Produces a LayoutDocument that PRESERVES coordinates. For PDFs it uses
`fitz.Page.get_text("dict")`, keeping block/line/span hierarchy with bbox,
font, size, flags, and color. OCR and HWP backends emit the same Span model
so downstream stages are backend-agnostic.

Stage 2 performs NO question parsing, NO tokenization, NO normalization.
"""
from __future__ import annotations

from pathlib import Path

import fitz  # PyMuPDF

from config import DEFAULT_CONFIG, ParserConfig
from context import ParseContext
from model import BBox, LayoutDocument, Page, RawDocument, Span


class TextExtractor:
    """Stage 2: RawDocument -> LayoutDocument (coordinate-preserving)."""

    name = "TextExtractor"

    def __init__(self, config: ParserConfig | None = None):
        self.config = config or DEFAULT_CONFIG

    # -- PDF text layer ----------------------------------------------------
    def _extract_pdf_text(self, path: Path) -> list[Page]:
        doc = fitz.open(str(path))
        pages: list[Page] = []
        try:
            for page_index, page in enumerate(doc, start=1):
                data = page.get_text("dict")
                spans: list[Span] = []
                image_bboxes: list[BBox] = []
                for block_index, block in enumerate(data.get("blocks", [])):
                    if block.get("type") == 1:  # image block
                        image_bboxes.append(tuple(block.get("bbox", (0, 0, 0, 0))))
                        continue
                    block_bbox = tuple(block.get("bbox", (0, 0, 0, 0)))
                    for line_index, line in enumerate(block.get("lines", [])):
                        line_bbox = tuple(line.get("bbox", (0, 0, 0, 0)))
                        for span_index, span in enumerate(line.get("spans", [])):
                            text = span.get("text", "")
                            if text == "":
                                continue
                            origin = span.get("origin")
                            spans.append(
                                Span(
                                    text=text,
                                    bbox=tuple(span.get("bbox", (0, 0, 0, 0))),
                                    font=span.get("font", ""),
                                    size=float(span.get("size", 0.0)),
                                    flags=int(span.get("flags", 0)),
                                    color=int(span.get("color", 0)),
                                    page_number=page_index,
                                    block_index=block_index,
                                    line_index=line_index,
                                    span_index=span_index,
                                    line_bbox=line_bbox,
                                    block_bbox=block_bbox,
                                    origin=tuple(origin) if origin else None,
                                )
                            )
                rect = page.rect
                pages.append(
                    Page(
                        number=page_index,
                        width=float(rect.width),
                        height=float(rect.height),
                        spans=spans,
                        image_bboxes=image_bboxes,
                    )
                )
        finally:
            doc.close()
        return pages

    # -- PDF OCR fallback --------------------------------------------------
    def _extract_pdf_ocr(self, path: Path) -> list[Page]:
        import easyocr  # heavy; imported only when needed

        reader = easyocr.Reader(list(self.config.ocr_langs), gpu=False, verbose=False)
        scale = 72.0 / float(self.config.ocr_dpi)
        doc = fitz.open(str(path))
        pages: list[Page] = []
        try:
            for page_index, page in enumerate(doc, start=1):
                pix = page.get_pixmap(dpi=self.config.ocr_dpi)
                results = reader.readtext(pix.tobytes("png"), detail=1, paragraph=False)
                spans: list[Span] = []
                for block_index, (box, text, _conf) in enumerate(results):
                    if not text:
                        continue
                    xs = [pt[0] * scale for pt in box]
                    ys = [pt[1] * scale for pt in box]
                    bbox = (min(xs), min(ys), max(xs), max(ys))
                    spans.append(
                        Span(
                            text=text,
                            bbox=bbox,
                            font="OCR",
                            size=round(bbox[3] - bbox[1], 2),
                            flags=0,
                            color=0,
                            page_number=page_index,
                            block_index=block_index,
                            line_index=0,
                            span_index=0,
                            line_bbox=bbox,
                            block_bbox=bbox,
                        )
                    )
                rect = page.rect
                pages.append(
                    Page(
                        number=page_index,
                        width=float(rect.width),
                        height=float(rect.height),
                        spans=spans,
                    )
                )
        finally:
            doc.close()
        return pages

    # -- HWP text ----------------------------------------------------------
    def _extract_hwp(self, path: Path) -> list[Page]:
        import io

        from hwp5.filestructure import Hwp5File
        from hwp5.hwp5txt import TextTransform

        hwp = Hwp5File(str(path))
        buffer = io.BytesIO()
        TextTransform().transform_hwp5_to_text(hwp, buffer)
        text = buffer.getvalue().decode("utf-8", errors="replace")
        text = text.replace("<표>", "\n[TABLE]\n").replace("<그림>", "\n[FIGURE]\n")

        # HWP has no coordinates; assign monotonic pseudo-bboxes so downstream
        # ordering/line-grouping still works. Real geometry is unavailable.
        line_height = 14.0
        left = 40.0
        char_w = 6.0
        spans: list[Span] = []
        for line_index, raw_line in enumerate(text.splitlines()):
            line = raw_line.strip()
            if not line:
                continue
            y0 = 40.0 + line_index * line_height
            bbox = (left, y0, left + len(line) * char_w, y0 + line_height)
            spans.append(
                Span(
                    text=line,
                    bbox=bbox,
                    font="HWP",
                    size=line_height,
                    flags=0,
                    color=0,
                    page_number=1,
                    block_index=line_index,
                    line_index=0,
                    span_index=0,
                    line_bbox=bbox,
                    block_bbox=bbox,
                )
            )
        return [Page(number=1, width=595.0, height=842.0, spans=spans)]

    # -- entry -------------------------------------------------------------
    def extract(self, raw: RawDocument) -> LayoutDocument:
        if not raw.exists or not raw.path or not raw.kind:
            return LayoutDocument(source_path="", source_kind="", used_ocr=False, page_count=0, pages=[])

        used_ocr = False
        if raw.kind == "pdf":
            if raw.needs_ocr:
                pages = self._extract_pdf_ocr(raw.path)
                used_ocr = True
            else:
                pages = self._extract_pdf_text(raw.path)
        elif raw.kind == "hwp":
            # Distributable (locked) HWP has no readable body; OCR of embedded
            # images is a later-phase concern. MVP sources are PDFs.
            pages = self._extract_hwp(raw.path)
        else:
            pages = []

        return LayoutDocument(
            source_path=str(raw.path),
            source_kind=raw.kind,
            used_ocr=used_ocr,
            page_count=len(pages),
            pages=pages,
        )

    def run(self, ctx: ParseContext) -> ParseContext:
        if ctx.raw is None or not ctx.raw.exists:
            ctx.add(self.name, "error", "no RawDocument to extract")
            return ctx
        ctx.layout = self.extract(ctx.raw)
        ctx.add(
            self.name, "info",
            f"pages={ctx.layout.page_count} spans={ctx.layout.span_count} "
            f"ocr={ctx.layout.used_ocr}",
        )
        return ctx
