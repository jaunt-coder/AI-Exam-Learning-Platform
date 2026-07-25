"""Stage 5 — Choice Boundary Detector.

Splits each QuestionCandidate into ①~⑤ choices using CHOICE_MARKER tokens and
coordinates only (never string regex). Supports:

    형태 1 (normal)      : ① … / ② … stacked vertically (single column)
    형태 2 (inline)      : ①…②…③…④…⑤… on one line
    형태 3 (two-column)  : ①②③ left column, ④⑤ right column

The layout kind is inferred from marker geometry (y-spread + x-clustering), then
tokens are attributed to the nearest preceding marker in reading order
(column, y, x). Tokens before the first marker form the stem.
"""
from __future__ import annotations

from bisect import bisect_right

from config import DEFAULT_CONFIG, ParserConfig
from context import ParseContext
from model import ChoiceCandidate, QuestionCandidate, Span, Token, TokenType, union_bbox
from question_boundary import _column_of, _page_anchors

CHOICE_GLYPHS = "①②③④⑤⑥⑦⑧⑨⑩"


def _glyph_index(glyph: str) -> int | None:
    pos = CHOICE_GLYPHS.find(glyph)
    return pos + 1 if pos >= 0 else None


class ChoiceBoundaryDetector:
    """Stage 5."""

    name = "ChoiceBoundaryDetector"

    def __init__(self, config: ParserConfig | None = None):
        self.config = config or DEFAULT_CONFIG

    def _anchors_and_kind(self, markers: list[Token], q_width: float) -> tuple[list[float], str]:
        ys = [m.y0 for m in markers]
        heights = [m.bbox[3] - m.bbox[1] for m in markers] or [12.0]
        line_h = max(heights)
        inline = (max(ys) - min(ys)) <= 0.6 * line_h
        if inline:
            return [sum(m.x0 for m in markers) / len(markers)], "inline"
        anchors = _page_anchors([m.x0 for m in markers], q_width or 595.0)
        kind = "two-column" if len(anchors) == 2 else "single"
        return anchors, kind

    def detect_for_question(
        self, cand: QuestionCandidate, span_lookup: dict
    ) -> list[ChoiceCandidate]:
        markers = [t for t in cand.tokens if t.type == TokenType.CHOICE_MARKER
                   and _glyph_index(t.text) is not None]
        if not markers:
            cand.stem_tokens = list(cand.tokens)
            return []

        q_width = (cand.bbox[2] - cand.bbox[0]) if cand.bbox else 595.0
        anchors, kind = self._anchors_and_kind(markers, q_width)

        def rk(tok: Token) -> tuple[int, float, float]:
            return (_column_of(tok.x0, anchors), round(tok.y0, 1), round(tok.x0, 1))

        # order markers by reading key, dedupe by glyph index (keep first)
        markers.sort(key=rk)
        ordered: list[Token] = []
        seen: set[int] = set()
        for m in markers:
            idx = _glyph_index(m.text)
            if idx in seen:
                continue
            seen.add(idx)
            ordered.append(m)
        marker_keys = [rk(m) for m in ordered]

        choices = [
            ChoiceCandidate(marker=m.text, index=_glyph_index(m.text), column=_column_of(m.x0, anchors),
                            layout_kind=kind, bbox=m.bbox)
            for m in ordered
        ]

        stem: list[Token] = []
        for tok in cand.tokens:
            pos = bisect_right(marker_keys, rk(tok)) - 1
            if pos < 0:
                stem.append(tok)
            else:
                choices[pos].tokens.append(tok)

        for ch in choices:
            ch.spans = [span_lookup[k] for t in ch.tokens
                        for k in [(t.page_number, t.block_index, t.line_index, t.span_index)]
                        if k in span_lookup]
            merged = union_bbox([ch.bbox] + [t.bbox for t in ch.tokens])
            if merged:
                ch.bbox = merged

        cand.stem_tokens = stem
        cand.choices = choices
        return choices

    def run(self, ctx: ParseContext) -> ParseContext:
        if not ctx.questions:
            ctx.add(self.name, "warn", "no questions to split")
            return ctx

        span_lookup: dict = {}
        if ctx.layout is not None:
            for span in ctx.layout.iter_spans():
                span_lookup[(span.page_number, span.block_index, span.line_index, span.span_index)] = span

        expected = 0
        found = 0
        count5 = 0
        with_text = 0
        contaminated = 0
        kinds: dict[str, int] = {}
        for cand in ctx.questions:
            expected += 5
            choices = self.detect_for_question(cand, span_lookup)
            found += len({c.index for c in choices if c.index and 1 <= c.index <= 5})
            if len([c for c in choices if c.index and 1 <= c.index <= 5]) == 5:
                count5 += 1
            for c in choices:
                if c.text():
                    with_text += 1
                # contamination: a choice must not swallow a later CHOICE_MARKER
                # or a QUESTION_NUMBER token
                extra_markers = sum(1 for t in c.tokens
                                    if t.type == TokenType.CHOICE_MARKER
                                    and _glyph_index(t.text) != c.index)
                has_qnum = any(t.type == TokenType.QUESTION_NUMBER for t in c.tokens)
                if extra_markers or has_qnum:
                    contaminated += 1
                if c.layout_kind:
                    kinds[c.layout_kind] = kinds.get(c.layout_kind, 0) + 1

        ctx.meta_choice = {
            "expectedMarkers": expected,
            "foundMarkers": found,
            "count5Questions": count5,
            "questions": len(ctx.questions),
            "choicesWithText": with_text,
            "contaminated": contaminated,
            "layoutKinds": kinds,
        }
        level = "info" if (found == expected and contaminated == 0) else "warn"
        ctx.add(self.name, level,
                f"markers {found}/{expected} · 5-choice {count5}/{len(ctx.questions)} · "
                f"contaminated={contaminated} · kinds={kinds}")
        return ctx
