#!/usr/bin/env python3
"""Unit tests for Phase 2 보완(QUANTITY) + Stage 5 (Footer Rule, Choice Boundary).

Synthetic layouts only — fast and offline.

Run:
    py -3 tests/parser/test_stage5.py
    (or) py -3 -m pytest tests/parser/test_stage5.py
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PARSER_DIR = ROOT / "scripts" / "parser"
for p in (str(PARSER_DIR), str(ROOT)):
    if p not in sys.path:
        sys.path.insert(0, p)

from choice_boundary import ChoiceBoundaryDetector       # noqa: E402
from context import ParseContext                          # noqa: E402
from footer_rule import FooterRule                        # noqa: E402
from model import (                                        # noqa: E402
    LayoutDocument,
    Page,
    QuestionCandidate,
    Span,
    Token,
    TokenType,
)
from tokenizer import _lex, tokenize_layout               # noqa: E402


def span(text, x0, y0, *, w=None, size=12.0, block=0, line=0, idx=0, page=1) -> Span:
    width = (len(text) * 7.0) if w is None else w
    return Span(text=text, bbox=(x0, y0, x0 + width, y0 + 14.0), font="T1", size=size,
                flags=0, color=0, page_number=page, block_index=block, line_index=line, span_index=idx)


def _layout(pages):
    return LayoutDocument(source_path="synthetic", source_kind="pdf", used_ocr=False,
                          page_count=len(pages), pages=pages)


def tok(ttype, text, x0, y0, page=1, block=0, line=0, idx=0) -> Token:
    return Token(text=text, type=ttype, bbox=(x0, y0, x0 + len(text) * 7.0, y0 + 14.0),
                 page_number=page, block_index=block, line_index=line, span_index=idx)


# --- QUANTITY ---------------------------------------------------------------
def test_lex_quantity_shares():
    segs = _lex("400주")
    assert len(segs) == 1 and segs[0][0] == TokenType.QUANTITY


def test_tokenize_quantity_value_and_unit():
    page = Page(number=1, width=595.0, height=842.0, spans=[span("400주", 60, 50, w=32)])
    tokens = tokenize_layout(_layout([page]))
    q = next(t for t in tokens if t.type == TokenType.QUANTITY)
    assert q.text == "400주"
    assert q.normalized == "400"
    assert q.unit == "주"
    assert q.immutable is True


def test_currency_not_absorbed_into_quantity():
    # 원/W stay CURRENCY (NUMBER + CURRENCY), not QUANTITY
    page = Page(number=1, width=595.0, height=842.0, spans=[span("1,000원", 60, 50, w=48)])
    tokens = tokenize_layout(_layout([page]))
    assert any(t.type == TokenType.NUMBER and t.text == "1,000" for t in tokens)
    assert any(t.type == TokenType.CURRENCY and t.text == "원" for t in tokens)
    assert not any(t.type == TokenType.QUANTITY for t in tokens)


# --- Footer Rule ------------------------------------------------------------
def test_footer_removes_repeated_boilerplate_keeps_content():
    bodies = ["매출채권평가", "재고자산감모", "유형자산손상", "리스부채측정"]  # distinct per page
    pages = []
    for pi, body in enumerate(bodies):
        spans = [
            span(f"{41+pi}.", 60, 71, page=pi + 1, block=0),      # top: question no. (varies)
            span(body, 90, 71, page=pi + 1, block=0, idx=1),      # top: real content (varies)
            span(f"제29회감정평가사A-{pi+1}", 130, 800, page=pi + 1, block=9),  # bottom boilerplate
        ]
        pages.append(Page(number=pi + 1, width=595.0, height=842.0, spans=spans))
    ctx = ParseContext(year=2099)
    ctx.layout = _layout(pages)
    FooterRule().run(ctx)
    remaining = [s.text for s in ctx.layout.iter_spans()]
    assert any("매출채권평가" in t for t in remaining)           # content kept
    assert all("감정평가사A-" not in t for t in remaining)       # footer removed
    assert len(ctx.removed_spans) == 4                           # one per page


def test_footer_does_not_remove_bare_top_numbers():
    # different question numbers at the top on each page must survive
    pages = []
    for pi, num in enumerate((41, 42, 43, 44)):
        spans = [span(f"{num}.", 60, 71, page=pi + 1)]
        pages.append(Page(number=pi + 1, width=595.0, height=842.0, spans=spans))
    ctx = ParseContext(year=2099)
    ctx.layout = _layout(pages)
    FooterRule().run(ctx)
    assert len(ctx.removed_spans) == 0


# --- Choice Boundary --------------------------------------------------------
def _question_single_column() -> QuestionCandidate:
    toks = [tok(TokenType.QUESTION_NUMBER, "41", 60, 60)]
    toks += [tok(TokenType.TEXT, "질문", 90, 60, idx=1)]
    for i, glyph in enumerate("①②③④⑤"):
        y = 100 + i * 20
        toks.append(tok(TokenType.CHOICE_MARKER, glyph, 60, y, block=i + 1))
        toks.append(tok(TokenType.TEXT, f"보기{i+1}", 75, y, block=i + 1, idx=1))
    return QuestionCandidate(number=41, page_number=1, tokens=toks, bbox=(60, 60, 340, 200))


def test_choice_single_column():
    cand = _question_single_column()
    choices = ChoiceBoundaryDetector().detect_for_question(cand, {})
    assert [c.index for c in choices] == [1, 2, 3, 4, 5]
    assert all(c.text() for c in choices)
    assert choices[0].layout_kind == "single"
    assert "질문" in "".join(t.text for t in cand.stem_tokens)


def test_choice_inline():
    toks = [tok(TokenType.TEXT, "질문", 60, 60)]
    x = 60
    for i, glyph in enumerate("①②③④⑤"):
        toks.append(tok(TokenType.CHOICE_MARKER, glyph, x, 100, block=1))
        toks.append(tok(TokenType.TEXT, f"보기{i+1}", x + 12, 100, block=1, idx=i + 1))
        x += 90
    cand = QuestionCandidate(number=42, page_number=1, tokens=toks, bbox=(60, 60, 520, 120))
    choices = ChoiceBoundaryDetector().detect_for_question(cand, {})
    assert [c.index for c in choices] == [1, 2, 3, 4, 5]
    assert all(c.layout_kind == "inline" for c in choices)


def test_choice_two_column():
    toks = [tok(TokenType.TEXT, "질문", 60, 60)]
    layout_positions = [("①", 60, 100), ("②", 60, 120), ("③", 60, 140),
                        ("④", 320, 100), ("⑤", 320, 120)]
    for i, (glyph, x, y) in enumerate(layout_positions):
        toks.append(tok(TokenType.CHOICE_MARKER, glyph, x, y, block=i + 1))
        toks.append(tok(TokenType.TEXT, f"보기{i+1}", x + 15, y, block=i + 1, idx=1))
    cand = QuestionCandidate(number=43, page_number=1, tokens=toks, bbox=(60, 60, 400, 160))
    choices = ChoiceBoundaryDetector().detect_for_question(cand, {})
    assert [c.index for c in choices] == [1, 2, 3, 4, 5]
    assert all(c.layout_kind == "two-column" for c in choices)
    assert choices[0].column == 0 and choices[3].column == 1


def test_choice_no_contamination_across_choices():
    cand = _question_single_column()
    detector = ChoiceBoundaryDetector()
    choices = detector.detect_for_question(cand, {})
    for c in choices:
        others = [t for t in c.tokens if t.type == TokenType.CHOICE_MARKER and t.text != c.marker]
        assert others == []


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
