"""Stage 2.2 — Dual-Page (2-up) Split.

Some scanned exams place two logical pages side-by-side on one physical sheet
(e.g. 2015: 729×1032, 15 sheets = 30 logical pages). Treating the sheet as one
page corrupts column anchors, so choice markers near the sheet centre get
attributed to the wrong side.

This stage detects a 2-up sheet from GEOMETRY ONLY (no year/page hardcoding) and
splits it into logical pages, each with its own left-origin coordinate frame.
Original coordinates are preserved on `span.source_bbox`; the physical page
number and logical index are preserved on the Page.

Detection signal (all must hold):
    - a near-empty vertical gutter exists in the middle third of the page
    - few spans cross that gutter x           (crossing_frac low)
    - many text rows have content on BOTH sides (both_frac high)
    - left/right span counts are reasonably balanced
"""
from __future__ import annotations

import statistics

from config import DEFAULT_CONFIG, ParserConfig
from context import ParseContext
from model import BBox, Page, Span

SEARCH_LO, SEARCH_HI = 0.35, 0.65     # gutter must sit in the middle third-ish
STEP = 3.0
MAX_CROSSING_FRAC = 0.06
MIN_BOTH_FRAC = 0.45
MIN_SIDE_FRAC = 0.30
MIN_SPANS = 24
# A 2-up sheet is a DOCUMENT-level format: the central gutter repeats on most
# pages. Normal single-page exams show an occasional 2-column gutter on only a
# minority of pages, so this fraction gate cleanly separates the two cases.
DOC_SPLIT_FRACTION = 0.60


def _cluster_rows(spans: list[Span]) -> list[list[Span]]:
    ordered = sorted(spans, key=lambda s: (s.bbox[1] + s.bbox[3]) / 2.0)
    heights = [s.bbox[3] - s.bbox[1] for s in ordered] or [12.0]
    tol = max(statistics.median(heights) * 0.8, 4.0)
    rows: list[list[Span]] = [[ordered[0]]]
    last_c = (ordered[0].bbox[1] + ordered[0].bbox[3]) / 2.0
    for s in ordered[1:]:
        c = (s.bbox[1] + s.bbox[3]) / 2.0
        if abs(c - last_c) <= tol:
            rows[-1].append(s)
        else:
            rows.append([s])
        last_c = c
    return rows


def detect_split_x(page: Page) -> float | None:
    """Per-page gutter candidate. Returns the split x if this page alone looks
    2-up; the document-level gate in DualPageSplitter decides whether to act."""
    spans = [s for s in page.spans if s.text.strip()]
    if len(spans) < MIN_SPANS:
        return None
    width = page.width
    rows = _cluster_rows(spans)
    total_rows = len(rows)
    if total_rows < 6:
        return None

    lo, hi = width * SEARCH_LO, width * SEARCH_HI
    best_x = None
    best_crossing = None
    x = lo
    while x <= hi:
        crossing = sum(1 for s in spans if s.bbox[0] < x < s.bbox[2])
        if best_crossing is None or crossing < best_crossing:
            best_crossing = crossing
            best_x = x
        x += STEP

    if best_x is None:
        return None

    crossing_frac = best_crossing / len(spans)
    left_spans = sum(1 for s in spans if (s.bbox[0] + s.bbox[2]) / 2.0 < best_x)
    right_spans = len(spans) - left_spans
    if left_spans == 0 or right_spans == 0:
        return None
    side_frac = min(left_spans, right_spans) / max(left_spans, right_spans)

    both_rows = 0
    for row in rows:
        has_left = any(s.bbox[2] <= best_x for s in row)
        has_right = any(s.bbox[0] >= best_x for s in row)
        if has_left and has_right:
            both_rows += 1
    both_frac = both_rows / total_rows

    if (crossing_frac <= MAX_CROSSING_FRAC
            and both_frac >= MIN_BOTH_FRAC
            and side_frac >= MIN_SIDE_FRAC):
        return best_x
    return None


def _shift_bbox(bbox: BBox | None, dx: float) -> BBox | None:
    if bbox is None:
        return None
    return (bbox[0] - dx, bbox[1], bbox[2] - dx, bbox[3])


def _shift_span(span: Span, dx: float, page_number: int) -> Span:
    origin = None
    if span.origin is not None:
        origin = (span.origin[0] - dx, span.origin[1])
    return Span(
        text=span.text,
        bbox=_shift_bbox(span.bbox, dx),
        font=span.font,
        size=span.size,
        flags=span.flags,
        color=span.color,
        page_number=page_number,
        block_index=span.block_index,
        line_index=span.line_index,
        span_index=span.span_index,
        line_bbox=_shift_bbox(span.line_bbox, dx),
        block_bbox=_shift_bbox(span.block_bbox, dx),
        origin=origin,
        source_bbox=span.source_bbox or span.bbox,   # keep the pre-split coordinates
    )


class DualPageSplitter:
    """Stage 2.2 pipeline adapter."""

    name = "DualPageSplitter"

    def __init__(self, config: ParserConfig | None = None):
        self.config = config or DEFAULT_CONFIG

    def _keep_page(self, page: Page, seq: int) -> Page:
        page.number = seq
        page.physical_number = page.physical_number or seq
        page.logical_index = 0
        for s in page.spans:
            if s.source_bbox is None:
                s.source_bbox = s.bbox
            s.page_number = seq
        return page

    def _split_page(self, page: Page, split_x: float, physical: int, start_seq: int) -> list[Page]:
        out: list[Page] = []
        for logical_index, (dx, w, keep_left) in enumerate((
            (0.0, split_x, True),
            (split_x, page.width - split_x, False),
        )):
            seq = start_seq + logical_index + 1
            side_spans = [s for s in page.spans
                          if ((s.bbox[0] + s.bbox[2]) / 2.0 < split_x) == keep_left]
            shifted = [_shift_span(s, dx, seq) for s in side_spans]
            out.append(Page(
                number=seq, width=w, height=page.height, spans=shifted,
                image_bboxes=[_shift_bbox(b, dx) for b in page.image_bboxes],
                physical_number=physical, logical_index=logical_index, x_offset=dx,
            ))
        return out

    def run(self, ctx: ParseContext) -> ParseContext:
        layout = ctx.layout
        if layout is None or layout.page_count == 0:
            ctx.add(self.name, "warn", "no LayoutDocument")
            return ctx

        # --- Pass 1: document-level 2-up decision (geometry, no hardcoding) ---
        candidates: list[float | None] = [detect_split_x(p) for p in layout.pages]
        content_pages = [p for p in layout.pages if len([s for s in p.spans if s.text.strip()]) >= MIN_SPANS]
        passed_ratios = [c / p.width for c, p in zip(candidates, layout.pages) if c is not None]
        denom = max(len(content_pages), 1)
        is_two_up = len(passed_ratios) / denom >= DOC_SPLIT_FRACTION and len(passed_ratios) >= 3

        # --- Pass 2: apply uniform split (or keep pages as-is) ---
        new_pages: list[Page] = []
        seq = 0
        split_count = 0
        ratio = statistics.median(passed_ratios) if passed_ratios else 0.5
        for page in layout.pages:
            physical = page.number
            if is_two_up:
                split_x = page.width * ratio
                new_pages.extend(self._split_page(page, split_x, physical, seq))
                seq += 2
                split_count += 1
            else:
                seq += 1
                new_pages.append(self._keep_page(page, seq))

        layout.pages = new_pages
        layout.page_count = len(new_pages)
        if is_two_up:
            ctx.add(self.name, "info",
                    f"2-up document (gutter ratio~{ratio:.3f}); split {split_count} sheets "
                    f"-> {len(new_pages)} logical pages")
        else:
            ctx.add(self.name, "info",
                    f"single-page layout (only {len(passed_ratios)}/{denom} pages showed a gutter)")
        return ctx
