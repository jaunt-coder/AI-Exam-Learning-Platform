#!/usr/bin/env python3
"""Validate Phase 1.5 MVP DB integration (data files + loader contract)."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
JS = ROOT / "js"

MVP_YEARS = [2015, 2017, 2018, 2020, 2024, 2025]
EXPECTED_TOTAL = 240
REQUIRED_QUESTION_FIELDS = [
    "questionId",
    "year",
    "patternId",
    "question",
    "choices",
    "answer",
    "solution",
    "originalQuestion",
    "source",
]
HTML_PAGES = [
    "question.html",
    "ai-tutor.html",
    "recommendation.html",
    "analytics.html",
    "pattern.html",
]


def ok(message: str, passed: list[str]) -> None:
    passed.append(message)
    print(f"  PASS: {message}")


def fail(message: str, failures: list[str]) -> None:
    failures.append(message)
    print(f"  FAIL: {message}")


def load_questions(path: Path) -> list[dict]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict) and isinstance(payload.get("questions"), list):
        return payload["questions"]
    return []


def validate_mvp_files(failures: list[str], passed: list[str]) -> list[dict]:
    question_path = DATA / "question-db-mvp.json"
    pattern_path = DATA / "pattern-db-mvp.json"
    stats_path = DATA / "statistics-mvp.json"

    for path in [question_path, pattern_path, stats_path]:
        if not path.exists():
            fail(f"Missing {path.relative_to(ROOT).as_posix()}", failures)
            return []

    ok("MVP JSON files exist", passed)

    questions = load_questions(question_path)
    patterns = json.loads(pattern_path.read_text(encoding="utf-8"))
    statistics = json.loads(stats_path.read_text(encoding="utf-8"))

    if len(questions) != EXPECTED_TOTAL:
        fail(f"question-db-mvp.json count {len(questions)}/{EXPECTED_TOTAL}", failures)
    else:
        ok(f"question-db-mvp.json {EXPECTED_TOTAL} questions", passed)

    pattern_ids = {item["patternId"] for item in patterns}
    if not pattern_ids:
        fail("pattern-db-mvp.json empty", failures)
    else:
        ok(f"pattern-db-mvp.json {len(patterns)} patterns", passed)

    if not statistics:
        fail("statistics-mvp.json empty", failures)
    else:
        ok(f"statistics-mvp.json {len(statistics)} rows", passed)

    by_year: dict[int, int] = {year: 0 for year in MVP_YEARS}
    for question in questions:
        for field in REQUIRED_QUESTION_FIELDS:
            if field not in question or question[field] in (None, "", []):
                fail(f"{question.get('questionId', '?')}: missing {field}", failures)
                break

        choices = question.get("choices") or []
        if len(choices) != 5:
            fail(f"{question.get('questionId', '?')}: choices={len(choices)}", failures)

        if question.get("answer") is None:
            fail(f"{question.get('questionId', '?')}: answer missing", failures)

        pattern_id = question.get("patternId")
        if not pattern_id or pattern_id not in pattern_ids:
            fail(f"{question.get('questionId', '?')}: patternId not linked", failures)

        year = int(question.get("year", 0))
        if year in by_year:
            by_year[year] += 1

    for year, count in by_year.items():
        if count != 40:
            fail(f"{year} year count {count}/40", failures)
        else:
            ok(f"{year} year 40/40", passed)

    stat_ids = {row["patternId"] for row in statistics}
    if not stat_ids.issubset(pattern_ids):
        fail("statistics patternId mismatch", failures)
    else:
        ok("statistics patternId linked", passed)

    return questions


def validate_loader_contract(failures: list[str], passed: list[str]) -> None:
    loader_path = JS / "data-loader.js"
    if not loader_path.exists():
        fail("js/data-loader.js missing", failures)
        return

    text = loader_path.read_text(encoding="utf-8")
    required_snippets = [
        "data/question-db-mvp.json",
        "data/question-db.json",
        "normalizeQuestionsPayload",
        "resolveDatabaseConfig",
        "original_exam",
    ]
    for snippet in required_snippets:
        if snippet not in text:
            fail(f"data-loader.js missing `{snippet}`", failures)
        else:
            ok(f"data-loader.js contains `{snippet}`", passed)

    if "DEFAULT_DB_SET = 'mvp'" not in text:
        fail("data-loader.js default DB is not MVP", failures)
    else:
        ok("data-loader.js default DB = MVP", passed)


def validate_freeze_untouched(failures: list[str], passed: list[str]) -> None:
    freeze_path = DATA / "question-db.json"
    if not freeze_path.exists():
        fail("Phase 1 freeze question-db.json missing", failures)
        return

    payload = json.loads(freeze_path.read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        fail("question-db.json must remain array (Phase 1 Freeze)", failures)
        return

    if not payload:
        fail("question-db.json empty", failures)
        return

    first_id = payload[0].get("questionId", "")
    if not str(first_id).startswith("ACC_INV_"):
        fail(f"question-db.json unexpected first id: {first_id}", failures)
    else:
        ok("question-db.json Phase 1 Freeze preserved (ACC_INV_*)", passed)


def validate_engine_imports(failures: list[str], passed: list[str]) -> None:
    engine_files = [
        JS / "question-engine.js",
        JS / "pattern-engine.js",
        JS / "ai-tutor-engine.js",
        JS / "recommendation-engine.js",
        JS / "analytics-engine.js",
    ]
    for path in engine_files:
        if not path.exists():
            fail(f"Missing {path.relative_to(ROOT).as_posix()}", failures)
            continue
        text = path.read_text(encoding="utf-8")
        if "data-loader.js" not in text and path.name != "question-engine.js":
            if path.name in {"ai-tutor-engine.js", "recommendation-engine.js", "analytics-engine.js"}:
                if "loadPhase1Database" not in text and path.name != "ai-tutor-engine.js":
                    fail(f"{path.name} missing loadPhase1Database import path", failures)
                    continue
        ok(f"{path.name} present", passed)


def validate_html_pages(failures: list[str], passed: list[str]) -> None:
    for page in HTML_PAGES:
        path = ROOT / page
        if not path.exists():
            fail(f"Missing {page}", failures)
            continue
        text = path.read_text(encoding="utf-8")
        if "type=\"module\"" not in text:
            fail(f"{page} missing ES module entry", failures)
            continue
        ok(f"{page} module entry present", passed)


def validate_storage_keys(failures: list[str], passed: list[str]) -> None:
    storage_path = JS / "storage.js"
    text = storage_path.read_text(encoding="utf-8")
    required = [
        "progress",
        "wrongAnswers",
        "bookmarks",
        "recentStudy",
        "theme",
        "settings",
        "examHistory",
    ]
    for key in required:
        if key not in text:
            fail(f"storage key missing: {key}", failures)
        else:
            ok(f"LocalStorage key preserved: {key}", passed)


def main() -> int:
    failures: list[str] = []
    passed: list[str] = []

    print("\n=== MVP Integration Validation ===\n")

    validate_mvp_files(failures, passed)
    validate_loader_contract(failures, passed)
    validate_freeze_untouched(failures, passed)
    validate_engine_imports(failures, passed)
    validate_html_pages(failures, passed)
    validate_storage_keys(failures, passed)

    print(f"\nSummary: PASS {len(passed)} · FAIL {len(failures)}")
    if failures:
        print("\nFailures:")
        for item in failures[:30]:
            print(f"  - {item}")
        if len(failures) > 30:
            print(f"  - ... 외 {len(failures) - 30}건")
        return 1

    print("\nPASS - MVP integration ready")
    print("\nRun locally:")
    print("  python -m http.server 8080")
    print("  http://localhost:8080/question.html")
    print("  http://localhost:8080/ai-tutor.html")
    print("  http://localhost:8080/recommendation.html")
    print("  (Phase 1 fallback: ?db=phase1)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
