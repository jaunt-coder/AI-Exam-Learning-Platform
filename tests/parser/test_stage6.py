#!/usr/bin/env python3
"""Unit tests for Stage 6 TableParser (scripts/parser/table_parser.py).

Synthetic layouts only — offline and fast.

Run:
    py -3 tests/parser/test_stage6.py
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PARSER_DIR = ROOT / "scripts" / "parser"
for p in (str(PARSER_DIR), str(ROOT)):
    if p not in sys.path:
        sys.path.insert(0, p)

from model import QuestionCandidate, Token, TokenType  # noqa: E402
from table_parser import TableParser  # noqa: E402


def tok(text, typ, x0, y0, x1=None, page=1) -> Token:
    x1 = x1 if x1 is not None else x0 + max(8.0, 7.0 * len(text))
    return Token(
        text=text, type=typ, bbox=(x0, y0, x1, y0 + 12.0),
        page_number=page, block_index=0, line_index=0,
        immutable=typ in {TokenType.NUMBER, TokenType.YEAR, TokenType.PERCENT, TokenType.CURRENCY},
    )


def q_with_stem(tokens: list[Token]) -> QuestionCandidate:
    return QuestionCandidate(number=1, page_number=1, tokens=list(tokens), stem_tokens=list(tokens))


def test_pv_factor_grid():
    """현가계수표: 기간 / 12% / 숫자 3행 → 3열 grid AST."""
    stem = [
        tok("단일금액", TokenType.TEXT, 200, 100),
        tok("￦", TokenType.CURRENCY, 250, 100),
        tok("1", TokenType.NUMBER, 262, 100, 270),
        tok("의현재가치", TokenType.TEXT, 272, 100),
        tok("정상연금", TokenType.TEXT, 400, 100),
        tok("￦", TokenType.CURRENCY, 450, 100),
        tok("1", TokenType.NUMBER, 462, 100, 470),
        tok("의현재가치", TokenType.TEXT, 472, 100),
        tok("기간", TokenType.TEXT, 120, 120, 150),
        tok("12%", TokenType.PERCENT, 255, 140),
        tok("12%", TokenType.PERCENT, 430, 140),
        tok("1", TokenType.NUMBER, 130, 160, 140),
        tok("0.8929", TokenType.NUMBER, 250, 160),
        tok("0.8929", TokenType.NUMBER, 425, 160),
        tok("2", TokenType.NUMBER, 130, 180, 140),
        tok("0.7972", TokenType.NUMBER, 250, 180),
        tok("1.6901", TokenType.NUMBER, 425, 180),
        tok("3", TokenType.NUMBER, 130, 200, 140),
        tok("0.7118", TokenType.NUMBER, 250, 200),
        tok("2.4018", TokenType.NUMBER, 425, 200),
    ]
    tables = TableParser().detect_for_question(q_with_stem(stem))
    assert len(tables) == 1
    t = tables[0]
    d = t.as_dict()
    assert d["type"] == "grid"
    assert t.n_cols == 3
    assert t.n_rows >= 4
    # data rows preserved
    flat = [c for row in d["rows"] for c in row]
    assert "0.8929" in flat and "2.4018" in flat and "12%" in flat
    # primary store is grid, markdown is secondary
    md = t.as_markdown()
    assert "|" in md and "---" in md


def test_journal_two_column():
    stem = [
        tok("(차변) 건물", TokenType.TEXT, 160, 100),
        tok("1,000,000", TokenType.NUMBER, 220, 100),
        tok("(대변) 현금", TokenType.TEXT, 340, 100),
        tok("1,000,000", TokenType.NUMBER, 400, 100),
    ]
    tables = TableParser().detect_for_question(q_with_stem(stem))
    assert len(tables) == 1
    assert tables[0].kind == "journal"
    assert tables[0].n_cols == 2
    assert tables[0].n_rows == 1
    row = tables[0].rows[0]
    assert "차변" in row[0] and "대변" in row[1]


def test_year_comparison_grid():
    stem = [
        tok("20x1년", TokenType.YEAR, 200, 100),
        tok("20x2년", TokenType.YEAR, 320, 100),
        tok("20x3년", TokenType.YEAR, 440, 100),
        tok("매출", TokenType.TEXT, 80, 120, 120),
        tok("100", TokenType.NUMBER, 200, 120),
        tok("120", TokenType.NUMBER, 320, 120),
        tok("140", TokenType.NUMBER, 440, 120),
        tok("매출원가", TokenType.TEXT, 80, 140, 140),
        tok("60", TokenType.NUMBER, 200, 140),
        tok("70", TokenType.NUMBER, 320, 140),
        tok("80", TokenType.NUMBER, 440, 140),
    ]
    tables = TableParser().detect_for_question(q_with_stem(stem))
    assert len(tables) == 1
    assert tables[0].n_cols >= 3
    assert tables[0].n_rows >= 2
    flat = [c for row in tables[0].rows for c in row]
    assert "100" in flat and "140" in flat


def test_prose_not_table():
    stem = [
        tok("주식회사감평은유형자산을취득하고감가상각을인식하였다", TokenType.TEXT, 80, 100, 500),
        tok("당기순이익은", TokenType.TEXT, 80, 120, 200),
        tok("￦", TokenType.CURRENCY, 210, 120),
        tok("100,000", TokenType.NUMBER, 222, 120),
        tok("이다", TokenType.TEXT, 280, 120),
    ]
    tables = TableParser().detect_for_question(q_with_stem(stem))
    assert tables == []


def test_as_dict_not_markdown_primary():
    stem = [
        tok("A", TokenType.TEXT, 80, 100, 100),
        tok("10", TokenType.NUMBER, 200, 100),
        tok("20", TokenType.NUMBER, 320, 100),
        tok("B", TokenType.TEXT, 80, 120, 100),
        tok("30", TokenType.NUMBER, 200, 120),
        tok("40", TokenType.NUMBER, 320, 120),
    ]
    t = TableParser().detect_for_question(q_with_stem(stem))[0]
    d = t.as_dict()
    assert isinstance(d["rows"], list)
    assert isinstance(d["rows"][0], list)
    assert "---" not in str(d)


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
