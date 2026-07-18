#!/usr/bin/env python3
"""Validate data/question-db-mvp.json against MVP rebuild rules."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
QUESTION_DB = DATA / "question-db-mvp.json"
PATTERN_DB = DATA / "pattern-db-mvp.json"
STATISTICS_DB = DATA / "statistics-mvp.json"

REQUIRED_QUESTION_FIELDS = [
    "questionId",
    "year",
    "subjectId",
    "chapterId",
    "patternId",
    "originalQuestion",
    "question",
    "choices",
    "answer",
    "answerIndex",
    "source",
]
REQUIRED_SOURCE_FIELDS = ["sourceFile", "page", "questionNumber"]
EXPECTED_PER_YEAR = 40
MVP_YEARS = [2015, 2017, 2018, 2020, 2024, 2025]


def fail(message: str, failures: list[str]) -> None:
    failures.append(message)


def main() -> int:
    failures: list[str] = []
    if not QUESTION_DB.exists():
        print("FAIL: question-db-mvp.json 없음")
        return 1

    payload = json.loads(QUESTION_DB.read_text(encoding="utf-8"))
    questions = payload.get("questions") or []
    patterns = json.loads(PATTERN_DB.read_text(encoding="utf-8")) if PATTERN_DB.exists() else []
    statistics = json.loads(STATISTICS_DB.read_text(encoding="utf-8")) if STATISTICS_DB.exists() else []

    pattern_ids = {p["patternId"] for p in patterns}
    by_year: dict[int, list[dict]] = {year: [] for year in MVP_YEARS}
    for question in questions:
        for field in REQUIRED_QUESTION_FIELDS:
            if field not in question or question[field] in (None, "", []):
                fail(f"{question.get('questionId', '?')}: `{field}` 누락", failures)
        source = question.get("source") or {}
        for field in REQUIRED_SOURCE_FIELDS:
            if field not in source or source[field] in (None, ""):
                fail(f"{question.get('questionId', '?')}: source.{field} 누락", failures)
        choices = question.get("choices") or []
        if len(choices) != 5:
            fail(f"{question.get('questionId', '?')}: 보기 {len(choices)}개", failures)
        if question.get("answer") != question.get("answerIndex"):
            fail(f"{question.get('questionId', '?')}: answer/answerIndex 불일치", failures)
        if question.get("patternId") not in pattern_ids:
            fail(f"{question.get('questionId', '?')}: pattern 미연결 ({question.get('patternId')})", failures)
        year = int(question.get("year", 0))
        if year in by_year:
            by_year[year].append(question)

    for year in MVP_YEARS:
        count = len(by_year[year])
        if count != EXPECTED_PER_YEAR:
            fail(f"{year}년 문항 {count}/{EXPECTED_PER_YEAR}", failures)

    if len(patterns) == 0:
        fail("pattern-db-mvp.json 비어 있음", failures)
    if len(statistics) == 0:
        fail("statistics-mvp.json 비어 있음", failures)

    expected_total = len(MVP_YEARS) * EXPECTED_PER_YEAR
    question_rate = round(len(questions) / expected_total * 100, 2)
    choice_rate = round(sum(1 for q in questions if len(q.get("choices") or []) == 5) / len(questions) * 100, 2) if questions else 0
    answer_rate = round(sum(1 for q in questions if q.get("answer") is not None) / len(questions) * 100, 2) if questions else 0
    pattern_rate = round(sum(1 for q in questions if q.get("patternId") in pattern_ids) / len(questions) * 100, 2) if questions else 0

    print("Question DB MVP Validation")
    print(f"- questions: {len(questions)}/{expected_total} ({question_rate}%)")
    print(f"- choices(5): {choice_rate}%")
    print(f"- answers: {answer_rate}%")
    print(f"- patterns: {pattern_rate}%")
    print(f"- failures: {len(failures)}")

    if failures:
        print("\nFAIL details:")
        for item in failures[:40]:
            print(f"  - {item}")
        if len(failures) > 40:
            print(f"  - ... 외 {len(failures) - 40}건")
        return 1

    print("PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
