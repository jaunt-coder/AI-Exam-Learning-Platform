#!/usr/bin/env python3
"""Unit tests for Stage 6.8 Semantic Validation Engine."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PARSER_DIR = ROOT / "scripts" / "parser"
for p in (str(PARSER_DIR), str(ROOT)):
    if p not in sys.path:
        sys.path.insert(0, p)

from model import ChoiceCandidate, QuestionCandidate, TableCandidate, Token, TokenType  # noqa: E402
from semantic_repair import repair_orphan_units  # noqa: E402
from semantic_validator import (  # noqa: E402
    ChoiceCountRule,
    DebitCreditRule,
    OrphanUnitRule,
    PresentValueTableRule,
    TotalHeaderRule,
    YearHeaderRule,
    score_question,
)


def T(text, typ=TokenType.TEXT, x=0.0) -> Token:
    return Token(
        text=text, type=typ, bbox=(x, 0, x + 10, 10),
        page_number=1, block_index=0, line_index=0,
    )


def q_with_table(rows, choices=None, markers=0) -> QuestionCandidate:
    table = TableCandidate(rows=[list(r) for r in rows], kind="grid")
    table.cell_tokens = [[[] for _ in row] for row in table.rows]
    tokens = []
    for i in range(markers):
        tokens.append(T(chr(0x2460 + i), TokenType.CHOICE_MARKER, i * 20))
    cand = QuestionCandidate(
        number=1, page_number=1, tokens=tokens,
        table=table, tables=[table],
        choices=choices or [],
    )
    return cand


def test_year_header_requires_numbers():
    bad = q_with_table([["20×1년", "20×2년"], ["매출", "매출원가"]])
    v = YearHeaderRule().check(bad)
    assert v, "should flag year headers without numbers"
    good = q_with_table([["20×1년", "20×2년"], ["100", "120"]])
    assert YearHeaderRule().check(good) == []


def test_pv_table_requires_numbers():
    bad = q_with_table([["기간", "단일금액의현재가치", "정상연금"]])
    assert PresentValueTableRule().check(bad)
    good = q_with_table([
        ["기간", "단일금액의현재가치", "정상연금"],
        ["1", "0.8929", "0.8929"],
    ])
    assert PresentValueTableRule().check(good) == []


def test_debit_credit_two_columns():
    bad = TableCandidate(rows=[["(차변) 건물 (대변) 현금"]], kind="journal")
    bad.n_cols  # property
    cand = QuestionCandidate(number=1, page_number=1, table=bad, tables=[bad])
    # force 1-col by single-cell rows
    assert DebitCreditRule().check(cand)
    good = q_with_table([["(차변) 건물1,000", "(대변) 현금1,000"]])
    assert DebitCreditRule().check(good) == []


def test_choice_count_five():
    markers = [T(chr(0x2460 + i), TokenType.CHOICE_MARKER, i * 10) for i in range(5)]
    choices = [ChoiceCandidate(marker=chr(0x2460 + i), index=i + 1) for i in range(4)]
    cand = QuestionCandidate(number=1, page_number=1, tokens=markers, choices=choices)
    assert ChoiceCountRule().check(cand)
    cand.choices = [ChoiceCandidate(marker=chr(0x2460 + i), index=i + 1) for i in range(5)]
    assert ChoiceCountRule().check(cand) == []


def test_total_header_not_false_positive_on_compound():
    # '과소계상' must NOT trigger TotalHeaderRule
    cand = q_with_table([["과소계상", "과대계상"], ["설명", "설명"]])
    assert TotalHeaderRule().check(cand) == []
    # bare 합계 without numbers should flag
    cand2 = q_with_table([["합계", ""], ["라벨", "텍스트"]])
    assert TotalHeaderRule().check(cand2)


def test_orphan_unit_repair_and_rule():
    table = TableCandidate(rows=[["￦", "100,000"], ["￦", "200,000"]], kind="grid")
    table.cell_tokens = [[[], []], [[], []]]
    n = repair_orphan_units(table)
    assert n == 2
    assert table.rows[0][0] == "" and table.rows[0][1].startswith("￦")
    cand = QuestionCandidate(number=1, page_number=1, table=table, tables=[table])
    assert OrphanUnitRule().check(cand) == []


def test_score_perfect_pv_table():
    cand = q_with_table([
        ["", "단일금액의현재가치", "정상연금의현재가치"],
        ["기간", "12%", "12%"],
        ["1", "0.8929", "0.8929"],
        ["2", "0.7972", "1.6901"],
    ])
    cand.tokens = [T(chr(0x2460 + i), TokenType.CHOICE_MARKER, i * 10) for i in range(5)]
    cand.choices = [ChoiceCandidate(marker=chr(0x2460 + i), index=i + 1) for i in range(5)]
    report = score_question(cand)
    assert report.score == 100.0
    assert report.violations == []
    assert report.choice_ok


def test_no_question_id_hardcoding_in_module():
    """Executable code must not branch on questionId / ACC_* / year literals."""
    src = (PARSER_DIR / "semantic_validator.py").read_text(encoding="utf-8")
    src = re.sub(r'""".*?"""', "", src, flags=re.S)
    src = re.sub(r"'''.*?'''", "", src, flags=re.S)
    code = "\n".join(
        ln for ln in src.splitlines() if not ln.strip().startswith("#")
    )
    assert "ACC_" not in code
    assert "questionId ==" not in code and "questionId==" not in code
    assert "cand.number ==" not in code and "cand.number==" not in code
    assert not re.search(r"\byear\s*==\s*\d{4}", code)


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
