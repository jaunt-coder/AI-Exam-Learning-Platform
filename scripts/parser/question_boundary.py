"""Stage 4 — Question Boundary Detector.

Builds QuestionCandidate boundaries from Stage 3 tokens using LAYOUT signals
only (no string regex over the raw page):

    1. QUESTION_NUMBER tokens (promoted by the tokenizer)
    2. page coordinates
    3. x position (column membership)
    4. y order (reading order within a column)

Reading order = (page, column, y). Question numbers 41..80 (accounting section)
are collected in reading order; each question owns the contiguous slice of spans
that follow its marker up to the next marker.

Choice separation and table reconstruction are intentionally NOT done here —
they belong to later phases.
"""
from __future__ import annotations

from bisect import bisect_right

from config import DEFAULT_CONFIG, ParserConfig
from context import ParseContext
from model import (
    LayoutDocument,
    QuestionCandidate,
    Span,
    Token,
    TokenType,
    union_bbox,
)


def _marker_number(token: Token) -> int | None:
    if token.type != TokenType.QUESTION_NUMBER or not token.normalized:
        return None
    if not token.normalized.isdigit():
        return None
    return int(token.normalized)


def _page_anchors(xs: list[float], page_width: float) -> list[float]:
    """Cluster marker x0 values into column anchors using the largest gap."""
    xs = sorted(xs)
    if not xs:
        return []
    if len(xs) == 1:
        return [xs[0]]
    max_gap, idx = max((xs[i + 1] - xs[i], i) for i in range(len(xs) - 1))
    if max_gap < page_width * 0.15:
        return [sum(xs) / len(xs)]
    left, right = xs[: idx + 1], xs[idx + 1:]
    return [sum(left) / len(left), sum(right) / len(right)]


def _column_of(x0: float, anchors: list[float]) -> int:
    if not anchors:
        return 0
    return min(range(len(anchors)), key=lambda i: abs(x0 - anchors[i]))


class QuestionBoundaryDetector:
    """Stage 4."""

    name = "QuestionBoundaryDetector"

    def __init__(self, config: ParserConfig | None = None):
        self.config = config or DEFAULT_CONFIG

    # -- core ---------------------------------------------------------------
    def detect(
        self, tokens: list[Token], layout: LayoutDocument
    ) -> tuple[list[QuestionCandidate], dict]:
        lo, hi = self.config.acc_start, self.config.acc_end

        page_width = {p.number: p.width for p in layout.pages}
        all_markers = [t for t in tokens if _marker_number(t) is not None]

        # column anchors are derived from ACC-range markers per page
        anchor_src: dict[int, list[float]] = {}
        for t in all_markers:
            num = _marker_number(t)
            if num is not None and lo <= num <= hi:
                anchor_src.setdefault(t.page_number, []).append(t.x0)
        anchors: dict[int, list[float]] = {
            pg: _page_anchors(xs, page_width.get(pg, 595.0)) for pg, xs in anchor_src.items()
        }

        def reading_key(page: int, x0: float, y0: float) -> tuple[int, int, float]:
            col = _column_of(x0, anchors.get(page, []))
            return (page, col, round(y0, 1))

        # ACC markers in reading order
        acc_markers = [t for t in all_markers if lo <= (_marker_number(t) or -1) <= hi]
        acc_markers.sort(key=lambda t: reading_key(t.page_number, t.x0, t.y0))

        # dedupe by number → keep first occurrence in reading order
        accepted: dict[int, Token] = {}
        duplicates: dict[int, int] = {}
        for t in acc_markers:
            num = _marker_number(t)
            if num in accepted:
                duplicates[num] = duplicates.get(num, 1) + 1
                continue
            accepted[num] = t

        ordered_nums = sorted(accepted)
        ordered_markers = sorted(
            accepted.values(), key=lambda t: reading_key(t.page_number, t.x0, t.y0)
        )
        marker_keys = [reading_key(t.page_number, t.x0, t.y0) for t in ordered_markers]

        # Foreign question-markers landing inside the ACC region. Only count
        # markers that sit at a true column-left margin (x0 within tolerance of a
        # column anchor); indented inline enumerations ("1." inside a stem) are
        # not boundary contamination and are ignored.
        foreign: list[int] = []
        if ordered_markers:
            first_key = marker_keys[0]
            last_key = marker_keys[-1]
            for t in all_markers:
                num = _marker_number(t)
                if num is None or lo <= num <= hi:
                    continue
                page_anchors = anchors.get(t.page_number, [])
                if page_anchors and min(abs(t.x0 - a) for a in page_anchors) > 6.0:
                    continue  # indented → inline enumeration, not a boundary
                k = reading_key(t.page_number, t.x0, t.y0)
                if first_key <= k <= last_key:
                    foreign.append(num)

        candidates = self._build_candidates(
            ordered_markers, marker_keys, tokens, layout, anchors
        )

        stats = {
            "found": sorted(accepted.keys()),
            "missing": [n for n in range(lo, hi + 1) if n not in accepted],
            "duplicates": duplicates,
            "foreign": sorted(foreign),
            "count": len(accepted),
            "ordered_numbers": ordered_nums,
        }
        return candidates, stats

    # -- span/token ownership ----------------------------------------------
    def _build_candidates(
        self,
        ordered_markers: list[Token],
        marker_keys: list[tuple[int, int, float]],
        tokens: list[Token],
        layout: LayoutDocument,
        anchors: dict[int, list[float]],
    ) -> list[QuestionCandidate]:
        span_lookup: dict[tuple[int, int, int, int], Span] = {}
        for span in layout.iter_spans():
            span_lookup[(span.page_number, span.block_index, span.line_index, span.span_index)] = span

        candidates = [
            QuestionCandidate(
                number=_marker_number(m),
                page_number=m.page_number,
                marker_span=span_lookup.get((m.page_number, m.block_index, m.line_index, m.span_index)),
                column=_column_of(m.x0, anchors.get(m.page_number, [])),
                bbox=m.bbox,
            )
            for m in ordered_markers
        ]

        def owner_index(page: int, x0: float, y0: float) -> int:
            col = _column_of(x0, anchors.get(page, []))
            key = (page, col, round(y0, 1))
            return bisect_right(marker_keys, key) - 1

        # assign spans
        for span in layout.iter_spans():
            idx = owner_index(span.page_number, span.x0, span.y0)
            if 0 <= idx < len(candidates):
                candidates[idx].spans.append(span)

        # assign tokens
        for token in tokens:
            idx = owner_index(token.page_number, token.x0, token.y0)
            if 0 <= idx < len(candidates):
                candidates[idx].tokens.append(token)

        for cand in candidates:
            boxes = [cand.bbox] + [s.bbox for s in cand.spans]
            merged = union_bbox([b for b in boxes if b])
            if merged:
                cand.bbox = merged
        return candidates

    # -- pipeline adapter ---------------------------------------------------
    def run(self, ctx: ParseContext) -> ParseContext:
        if ctx.layout is None:
            ctx.add(self.name, "error", "no LayoutDocument")
            return ctx
        candidates, stats = self.detect(ctx.tokens, ctx.layout)
        ctx.questions = candidates
        ctx.meta_boundary = stats  # attached for the regression runner
        level = "info"
        if stats["missing"] or stats["duplicates"] or stats["foreign"]:
            level = "warn"
        ctx.add(
            self.name,
            level,
            f"questions={stats['count']} missing={stats['missing']} "
            f"dup={stats['duplicates']} foreign={stats['foreign']}",
        )
        return ctx
