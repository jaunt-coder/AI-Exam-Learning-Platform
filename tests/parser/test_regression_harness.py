#!/usr/bin/env python3
"""Determinism & correctness tests for the Phase 0 regression harness.

The harness is a measuring stick; it must be deterministic and its metric math
must behave predictably on controlled fixtures. These tests do not require the
source PDFs (they use synthetic fixtures), so they run fast and offline.

Run:
    py -3 tests/parser/test_regression_harness.py
    (or) py -3 -m pytest tests/parser/test_regression_harness.py
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from tests.parser.harness import metrics as M
from tests.parser.harness import tokens as T


def _source(body: str, number: int = 41, year: int = 2015) -> dict:
    return {
        "key": f"{year}:{number}",
        "year": year,
        "number": number,
        "body": body,
        "numbers": sorted(T.extract_numbers(body)),
        "units": sorted(T.extract_units(body)),
    }


def test_tokens_number_extraction():
    nums = T.extract_numbers("매입액 1,234,000원과 이자율 5.5% 및 코드 987")
    assert "1,234,000" in nums
    assert "5.5" in nums
    assert "987" in nums


def test_tokens_unit_extraction_currency_and_year():
    units = T.extract_units("취득원가 W1,000,000, 20×1년 1월 1일, 상각률 10%")
    assert any("W1,000,000" == u for u in units)
    assert "20×1년" in units or "20×1년 1월 1일" in units
    assert "10%" in units


def test_normalize_symbols_canonicalizes_currency_and_year():
    assert T.normalize_symbols("￦500,000") == "W500,000"
    assert T.normalize_symbols("20x1년") == "20×1년"


def test_perfect_recovery_scores_full():
    body = "다음 자료로 매출원가를 계산하면? 기초재고 1,000,000원 당기매입 2,000,000원 ① 100 ② 200 ③ 300 ④ 400 ⑤ 500"
    record = {
        "question": "다음 자료로 매출원가를 계산하면? 기초재고 1,000,000원 당기매입 2,000,000원",
        "originalQuestion": body,
        "choices": ["100", "200", "300", "400", "500"],
        "table": "",
        "hasTable": False,
        "answer": 3,
    }
    m = M.compute_question_metrics(record, _source(body))
    assert m.present
    assert m.number_fidelity == 1.0
    assert m.unit_fidelity == 1.0
    assert m.five_choices
    assert m.completeness == 1.0
    assert m.stem_coverage >= 0.9
    assert not m.duplicate


def test_missing_number_detected():
    body = "취득원가 1,234,000원과 잔존가치 50,000원 ① 가 ② 나 ③ 다 ④ 라 ⑤ 마"
    record = {
        "question": "취득원가 1,234,000원",
        "originalQuestion": "취득원가 1,234,000원 ① 가 ② 나 ③ 다 ④ 라 ⑤ 마",
        "choices": ["가", "나", "다", "라", "마"],
        "table": "",
        "hasTable": False,
        "answer": 1,
    }
    m = M.compute_question_metrics(record, _source(body))
    assert "50,000" in m.missing_numbers
    assert m.number_fidelity < 1.0


def test_choice_count_incomplete():
    body = "질문? ① 가 ② 나 ③ 다 ④ 라 ⑤ 마"
    record = {
        "question": "질문?",
        "originalQuestion": body,
        "choices": ["가", "나", "다"],
        "table": "",
        "hasTable": False,
        "answer": None,
    }
    m = M.compute_question_metrics(record, _source(body))
    assert not m.five_choices
    assert m.completeness < 1.0


def test_missing_question_record():
    m = M.compute_question_metrics(None, _source("무언가 ① 가", number=77))
    assert not m.present
    assert m.completeness == 0.0


def test_duplicate_context_flagged():
    stem = "㈜감평의 20×1년 당기순이익을 구하면 얼마인가?"
    record = {
        "question": stem,
        "originalQuestion": stem + " " + stem + " 추가 설명 문장이 충분히 길게 이어진다.",
        "choices": ["1", "2", "3", "4", "5"],
        "table": "",
        "hasTable": False,
        "answer": 1,
    }
    m = M.compute_question_metrics(record, _source(stem + " ① 1 ② 2 ③ 3 ④ 4 ⑤ 5"))
    assert m.duplicate


def test_table_fidelity_broken_when_expected_but_missing():
    body = "구분 차변 대변 자료 ① 가 ② 나 ③ 다 ④ 라 ⑤ 마"
    record = {
        "question": "구분 차변 대변 자료",
        "originalQuestion": body,
        "choices": ["가", "나", "다", "라", "마"],
        "table": "",
        "hasTable": True,
        "answer": 1,
    }
    m = M.compute_question_metrics(record, _source(body))
    assert m.table_expected
    assert m.table_fidelity == 0.0


def test_table_fidelity_ok_with_markdown():
    body = "구분 차변 대변 자료 ① 가 ② 나 ③ 다 ④ 라 ⑤ 마"
    record = {
        "question": "구분 차변 대변 자료",
        "originalQuestion": body,
        "choices": ["가", "나", "다", "라", "마"],
        "table": "| 구분 | 차변 | 대변 |\n| --- | --- | --- |\n| 현금 | 100 | 0 |",
        "hasTable": True,
        "answer": 1,
    }
    m = M.compute_question_metrics(record, _source(body))
    assert m.table_fidelity == 1.0


def test_deterministic_repeat():
    body = "취득원가 1,000,000원 20×1년 ① 가 ② 나 ③ 다 ④ 라 ⑤ 마"
    record = {
        "question": "취득원가 1,000,000원 20×1년",
        "originalQuestion": body,
        "choices": ["가", "나", "다", "라", "마"],
        "table": "",
        "hasTable": False,
        "answer": 2,
    }
    a = M.compute_question_metrics(record, _source(body))
    b = M.compute_question_metrics(record, _source(body))
    assert a == b


def test_aggregate_shape():
    body = "질문 1,000원 ① 가 ② 나 ③ 다 ④ 라 ⑤ 마"
    record = {
        "question": "질문 1,000원",
        "originalQuestion": body,
        "choices": ["가", "나", "다", "라", "마"],
        "table": "",
        "hasTable": False,
        "answer": 1,
    }
    m = M.compute_question_metrics(record, _source(body))
    agg = M.aggregate([m])
    assert agg["present"] == 1
    assert set(agg["means"]) == {
        "stemCoverage", "choiceCoverage", "tableFidelity", "numberFidelity",
        "unitFidelity", "sourceFidelity", "completeness",
    }
    assert set(agg["counts"]) >= {
        "not5Choices", "numbersMissing", "unitsMissing", "duplicates", "incomplete",
    }


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
