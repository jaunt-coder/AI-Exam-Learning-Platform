#!/usr/bin/env python3
"""Unit tests for Stage 6.5 TableCellReconstructor."""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PARSER_DIR = ROOT / "scripts" / "parser"
for p in (str(PARSER_DIR), str(ROOT)):
    if p not in sys.path:
        sys.path.insert(0, p)

from model import Token, TokenType  # noqa: E402
from table_cell_reconstructor import (  # noqa: E402
    cell_surface,
    cleanup_cell_surface,
    collapse_hangul_spaces,
    reconstruct_cell_tokens,
)


def T(text, typ, x0, w=None) -> Token:
    w = w if w is not None else max(8.0, 7.0 * len(text))
    return Token(
        text=text, type=typ, bbox=(x0, 10.0, x0 + w, 22.0),
        page_number=1, block_index=0, line_index=0,
        immutable=typ in {
            TokenType.NUMBER, TokenType.YEAR, TokenType.DATE,
            TokenType.PERCENT, TokenType.CURRENCY, TokenType.QUANTITY,
        },
    )


def surf(tokens) -> str:
    return cell_surface(reconstruct_cell_tokens(tokens))


def test_number_comma_fragments():
    assert surf([T("390", TokenType.NUMBER, 0), T(",", TokenType.TEXT, 30, 5), T("000", TokenType.NUMBER, 40)]) == "390,000"


def test_currency_number():
    assert surf([T("￦", TokenType.CURRENCY, 0, 10), T("390,000", TokenType.NUMBER, 12)]) == "￦390,000"


def test_year_fragments():
    assert surf([
        T("20", TokenType.NUMBER, 0), T("X", TokenType.TEXT, 20, 8), T("3", TokenType.NUMBER, 30, 8),
    ]) == "20X3"


def test_percent_fragments():
    assert surf([T("20", TokenType.NUMBER, 0), T("%", TokenType.TEXT, 20, 8)]) == "20%"


def test_quantity_fragments():
    assert surf([T("1", TokenType.NUMBER, 0, 8), T("주", TokenType.TEXT, 10, 12)]) == "1주"


def test_decimal_percent():
    assert surf([
        T("12", TokenType.NUMBER, 0), T(".", TokenType.TEXT, 20, 4),
        T("5", TokenType.NUMBER, 26, 8), T("%", TokenType.TEXT, 36, 8),
    ]) == "12.5%"


def test_hangul_glue():
    assert surf([T("현재", TokenType.TEXT, 0), T("가치", TokenType.TEXT, 40)]) == "현재가치"
    assert collapse_hangul_spaces("의 현재가치") == "의현재가치"


def test_hangul_then_currency_keeps_space():
    assert surf([
        T("단일", TokenType.TEXT, 0), T("금액", TokenType.TEXT, 30),
        T("￦", TokenType.CURRENCY, 70, 10), T("1", TokenType.NUMBER, 82, 8),
    ]) == "단일금액 ￦1"


def test_won_syllable_in_compound():
    assert surf([
        T("실제발생공사", TokenType.TEXT, 0),
        T("원", TokenType.CURRENCY, 80, 12),
        T("가", TokenType.TEXT, 95),
    ]) == "실제발생공사원가"
    assert surf([T("원", TokenType.CURRENCY, 0, 12), T("가", TokenType.TEXT, 14)]) == "원가"
    assert cleanup_cell_surface("원 재료 A") == "원재료 A"


def test_year_mal_suffix():
    assert surf([T("20x1년", TokenType.YEAR, 0), T("말", TokenType.TEXT, 50)]) == "20x1년말"
    assert cleanup_cell_surface("20×1년 도") == "20×1년도"


def test_no_cross_reorder():
    """Tokens stay in x-order; nothing invented."""
    out = reconstruct_cell_tokens([
        T("￦", TokenType.CURRENCY, 0, 10), T("40,000", TokenType.NUMBER, 12),
        T("미지급이자증가액", TokenType.TEXT, 60),
    ])
    assert cell_surface(out) == "￦40,000 미지급이자증가액"
    assert all(t.text for t in out)  # originals only


def test_immutable_types_preserved():
    out = reconstruct_cell_tokens([T("￦", TokenType.CURRENCY, 0, 10), T("100", TokenType.NUMBER, 12)])
    assert len(out) == 1
    assert out[0].immutable is True
    assert out[0].text == "￦100"


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
