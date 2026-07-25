#!/usr/bin/env python3
"""Unit tests for Phase 4-1 Dual-Page (2-up) Split (scripts/parser/dual_page.py).

Synthetic layouts only — fast and offline. Verifies:
    - a 2-up document (repeated central gutter) splits into logical pages
    - a normal single-page document is NOT split
    - original coordinates are preserved on span.source_bbox and pages carry
      physical_number / logical_index

Run:
    py -3 tests/parser/test_dual_page.py
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PARSER_DIR = ROOT / "scripts" / "parser"
for p in (str(PARSER_DIR), str(ROOT)):
    if p not in sys.path:
        sys.path.insert(0, p)

from context import ParseContext          # noqa: E402
from dual_page import DualPageSplitter    # noqa: E402
from model import LayoutDocument, Page, Span  # noqa: E402


def span(text, x0, y0, x1, page=1, block=0, line=0, idx=0) -> Span:
    return Span(text=text, bbox=(x0, y0, x1, y0 + 14.0), font="T1", size=12.0, flags=0,
                color=0, page_number=page, block_index=block, line_index=line, span_index=idx)


def _two_up_page(number: int, width=720.0, height=1000.0) -> Page:
    spans = []
    for r in range(8):
        y = 80 + r * 90
        # left cluster (x 50..300), right cluster (x 400..670), empty gutter ~300..400
        spans.append(span("좌", 50, y, 120, page=number, block=0, line=r, idx=0))
        spans.append(span("측", 150, y, 300, page=number, block=0, line=r, idx=1))
        spans.append(span("우", 400, y, 470, page=number, block=1, line=r, idx=0))
        spans.append(span("측", 520, y, 670, page=number, block=1, line=r, idx=1))
    return Page(number=number, width=width, height=height, spans=spans)


def _single_page(number: int, width=595.0, height=841.0) -> Page:
    spans = []
    for r in range(8):
        y = 80 + r * 90
        # one full-width run per row -> center always occupied, no gutter
        spans.append(span("한줄로가득찬본문내용", 60, y, 535, page=number, block=0, line=r, idx=0))
        spans.append(span("추가", 60, y + 20, 300, page=number, block=0, line=r, idx=1))
    return Page(number=number, width=width, height=height, spans=spans)


def _layout(pages):
    return LayoutDocument(source_path="synthetic", source_kind="pdf", used_ocr=False,
                          page_count=len(pages), pages=pages)


def _run(pages):
    ctx = ParseContext(year=2099)
    ctx.layout = _layout(pages)
    DualPageSplitter().run(ctx)
    return ctx


def test_two_up_document_splits():
    ctx = _run([_two_up_page(i + 1) for i in range(5)])
    assert ctx.layout.page_count == 10                      # 5 sheets -> 10 logical pages
    assert {p.logical_index for p in ctx.layout.pages} == {0, 1}
    assert all(p.physical_number is not None for p in ctx.layout.pages)


def test_two_up_preserves_original_bbox():
    ctx = _run([_two_up_page(i + 1) for i in range(5)])
    right_pages = [p for p in ctx.layout.pages if p.logical_index == 1]
    assert right_pages
    for rp in right_pages:
        for s in rp.spans:
            assert s.source_bbox is not None
            assert s.source_bbox[0] > s.bbox[0]             # translated left, original preserved
            assert abs((s.source_bbox[0] - s.bbox[0]) - rp.x_offset) < 0.01


def test_single_page_not_split():
    ctx = _run([_single_page(i + 1) for i in range(6)])
    assert ctx.layout.page_count == 6                       # unchanged
    assert all(p.logical_index == 0 for p in ctx.layout.pages)


def test_minority_gutter_not_split():
    # 1 two-up-looking page among 5 single pages -> below document fraction gate
    pages = [_single_page(i + 1) for i in range(5)] + [_two_up_page(6)]
    ctx = _run(pages)
    assert ctx.layout.page_count == 6                       # not treated as 2-up doc


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
