#!/usr/bin/env python3
"""Unit tests for Stage 3 (Tokenizer) and Stage 4 (Question Boundary).

These use synthetic Span layouts (no PDFs), so they are fast and offline. They
lock in the coordinate-based merge + lexer behaviour and the layout-based
boundary detection, including the special-token immutability guarantees.

Run:
    py -3 tests/parser/test_stage3_4.py
    (or) py -3 -m pytest tests/parser/test_stage3_4.py
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PARSER_DIR = ROOT / "scripts" / "parser"
for p in (str(PARSER_DIR), str(ROOT)):
    if p not in sys.path:
        sys.path.insert(0, p)

from config import ParserConfig           # noqa: E402
from model import (                        # noqa: E402
    LayoutDocument,
    Page,
    Span,
    TokenType,
)
from question_boundary import QuestionBoundaryDetector  # noqa: E402
from tokenizer import _lex, _reconstruct_line, tokenize_layout  # noqa: E402


# --- helpers ---------------------------------------------------------------
def span(text, x0, y0, *, w=None, size=12.0, block=0, line=0, idx=0, page=1) -> Span:
    width = (len(text) * 7.0) if w is None else w
    return Span(
        text=text, bbox=(x0, y0, x0 + width, y0 + 14.0), font="T1", size=size,
        flags=0, color=0, page_number=page, block_index=block, line_index=line, span_index=idx,
    )


def frag(chars_with_x, y0, **kw) -> list[Span]:
    """Build glyph-fragmented adjacent spans: [(char, x0, x1), ...]."""
    out = []
    for i, (ch, x0, x1) in enumerate(chars_with_x):
        s = Span(text=ch, bbox=(x0, y0, x1, y0 + 14.0), font="T1", size=12.0, flags=0,
                 color=0, page_number=1, block_index=0, line_index=0, span_index=i, **kw)
        out.append(s)
    return out


def types(tokens):
    return [(t.type, t.text) for t in tokens]


# --- lexer ------------------------------------------------------------------
def test_lex_amount_splits_number_and_currency():
    segs = _lex("450,000원")
    kinds = [(k, "450,000원"[a:b]) for k, a, b in segs]
    assert (TokenType.NUMBER, "450,000") in kinds
    assert (TokenType.CURRENCY, "원") in kinds


def test_lex_year():
    segs = _lex("20x2년")
    assert segs[0][0] == TokenType.YEAR
    assert "20x2년"[segs[0][1]:segs[0][2]] == "20x2년"


def test_lex_percent_vs_number():
    assert _lex("20%")[0][0] == TokenType.PERCENT
    assert _lex("20")[0][0] == TokenType.NUMBER


def test_lex_date_month_day():
    segs = _lex("8월 31일")
    assert segs[0][0] == TokenType.DATE


def test_lex_decimal_is_single_number():
    segs = _lex("0.9524")
    assert len(segs) == 1 and segs[0][0] == TokenType.NUMBER


def test_lex_choice_marker():
    segs = _lex("①")
    assert segs[0][0] == TokenType.CHOICE_MARKER


def test_lex_is_total_no_char_dropped():
    surface = "취득원가 1,080,000원 20x1년 8월 ① 400주"
    segs = _lex(surface)
    covered = "".join(surface[a:b] for _, a, b in segs)
    assert covered == surface  # every character accounted for


# --- span merge -------------------------------------------------------------
def test_reconstruct_glues_fragmented_number():
    spans = frag([("4", 100, 107), ("5", 107, 114), ("0", 114, 121),
                  (",", 121, 124), ("000", 124, 145)], y0=50)
    chars = _reconstruct_line(spans)
    surface = "".join(c.ch for c in chars)
    assert surface == "450,000"


def test_reconstruct_inserts_space_on_gap():
    spans = [span("100", 100, 50, w=21), span("200", 260, 50, w=21)]
    surface = "".join(c.ch for c in _reconstruct_line(spans))
    assert surface == "100 200"


# --- tokenize_layout end to end --------------------------------------------
def _layout(pages: list[Page]) -> LayoutDocument:
    return LayoutDocument(source_path="synthetic", source_kind="pdf", used_ocr=False,
                          page_count=len(pages), pages=pages)


def test_tokenize_reassembles_amount_and_preserves_text():
    spans = frag([("4", 100, 107), ("5", 107, 114), ("0", 114, 121),
                  (",", 121, 124), ("000", 124, 145), ("원", 145, 159)], y0=50)
    page = Page(number=1, width=595.0, height=842.0, spans=spans)
    tokens = tokenize_layout(_layout([page]))
    num = next(t for t in tokens if t.type == TokenType.NUMBER)
    cur = next(t for t in tokens if t.type == TokenType.CURRENCY)
    assert num.text == "450,000"        # original text preserved (commas kept)
    assert num.normalized == "450000"   # non-inventive normalization
    assert num.immutable is True
    assert cur.text == "원" and cur.immutable is True


def test_special_tokens_are_immutable():
    spans = [span("20x1년", 60, 50, idx=0), span("12%", 200, 50, idx=1)]
    page = Page(number=1, width=595.0, height=842.0, spans=spans)
    tokens = tokenize_layout(_layout([page]))
    year = next(t for t in tokens if t.type == TokenType.YEAR)
    pct = next(t for t in tokens if t.type == TokenType.PERCENT)
    assert year.text == "20x1년" and year.normalized == "20×1" and year.immutable
    assert pct.text == "12%" and pct.immutable


def test_question_number_promotion():
    # line: "41.  (주)감평은 ..."
    spans = [span("41", 60, 50, w=16, idx=0), span(".", 76, 50, w=6, idx=1),
             span("(주)감평은", 90, 50, idx=2)]
    page = Page(number=1, width=595.0, height=842.0, spans=spans)
    tokens = tokenize_layout(_layout([page]))
    assert tokens[0].type == TokenType.QUESTION_NUMBER
    assert tokens[0].normalized == "41"


# --- Stage 4 boundary -------------------------------------------------------
def _q_line(number, x0, y0, page=1, block=0):
    """A question-number line plus a bit of stem, as spans."""
    return [
        span(str(number), x0, y0, w=16, idx=0, page=page, block=block, line=0),
        span(".", x0 + 16, y0, w=6, idx=1, page=page, block=block, line=0),
        span("문제본문", x0 + 30, y0, idx=2, page=page, block=block, line=0),
    ]


def test_boundary_single_column_sequence():
    cfg = ParserConfig(acc_start=41, acc_end=43)
    spans = []
    for i, num in enumerate((41, 42, 43)):
        spans += _q_line(num, 60, 100 + i * 60, block=i)
    page = Page(number=1, width=595.0, height=842.0, spans=spans)
    layout = _layout([page])
    tokens = tokenize_layout(layout)
    cands, stats = QuestionBoundaryDetector(cfg).detect(tokens, layout)
    assert stats["count"] == 3
    assert stats["missing"] == []
    assert stats["duplicates"] == {}
    assert stats["foreign"] == []
    assert [c.number for c in cands] == [41, 42, 43]


def test_boundary_two_column_reading_order():
    cfg = ParserConfig(acc_start=41, acc_end=43)
    spans = []
    # left column: 41, 42 ; right column: 43
    spans += _q_line(41, 60, 100, block=0)
    spans += _q_line(42, 60, 200, block=1)
    spans += _q_line(43, 320, 100, block=2)
    page = Page(number=1, width=600.0, height=842.0, spans=spans)
    layout = _layout([page])
    tokens = tokenize_layout(layout)
    cands, stats = QuestionBoundaryDetector(cfg).detect(tokens, layout)
    assert [c.number for c in cands] == [41, 42, 43]   # reading order L->R
    assert cands[0].column == 0 and cands[2].column == 1


def test_boundary_ignores_inline_number():
    cfg = ParserConfig(acc_start=41, acc_end=42)
    spans = []
    spans += _q_line(41, 60, 100, block=0)
    # an indented inline "1." inside the stem (not at column margin)
    spans += [span("1", 180, 130, w=8, idx=0, block=1, line=0),
              span(".", 188, 130, w=6, idx=1, block=1, line=0),
              span("항목", 200, 130, idx=2, block=1, line=0)]
    spans += _q_line(42, 60, 200, block=2)
    page = Page(number=1, width=595.0, height=842.0, spans=spans)
    layout = _layout([page])
    tokens = tokenize_layout(layout)
    _, stats = QuestionBoundaryDetector(cfg).detect(tokens, layout)
    assert stats["count"] == 2
    assert stats["foreign"] == []       # inline "1." is not flagged as boundary


def _run_all() -> int:
    tests = [obj for name, obj in sorted(globals().items()) if name.startswith("test_")]
    failed = 0
    for test in tests:
        try:
            test()
            print(f"PASS {test.__name__}")
        except AssertionError as exc:
            failed += 1
            print(f"FAIL {test.__name__}: {exc}")
        except Exception as exc:  # noqa: BLE001
            failed += 1
            print(f"ERROR {test.__name__}: {exc!r}")
    print(f"\n{len(tests) - failed}/{len(tests)} passed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(_run_all())
