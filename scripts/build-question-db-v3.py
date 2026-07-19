#!/usr/bin/env python3
"""Build Question DB v3 from source/original-exams (HWP > PDF > OCR)."""
from __future__ import annotations

import json
import sys
from collections import defaultdict
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

from exam_pipeline.answer_loader import load_accounting_answers
from exam_pipeline.constants import (
    ACC_END,
    ACC_START,
    CACHE_DIR,
    DATA_DIR,
    EXAM_ROUND,
    EXPECTED_ACC_COUNT,
)

MVP_YEARS = [2015, 2017, 2018, 2020, 2024, 2025]
YEARS = MVP_YEARS
from exam_pipeline.pattern_classifier import PATTERN_NAMES, classify_pattern, pattern_grade
from exam_pipeline.question_parser import ParsedQuestion, parse_accounting_questions
from exam_pipeline.source_loader import load_exam_document

OUTPUT_QUESTION_DB = DATA_DIR / "question-db-mvp.json"
OUTPUT_PATTERN_DB = DATA_DIR / "pattern-db-mvp.json"
OUTPUT_STATISTICS = DATA_DIR / "statistics-mvp.json"
OUTPUT_REPORT = ROOT / "validation-report-mvp.md"


def build_question_record(
    parsed: ParsedQuestion,
    year: int,
    source_file: str,
    source_kind: str,
    used_ocr: bool,
    answer: int | None,
    pattern_id: str,
    chapter_id: str,
    seq: int,
) -> dict:
    qid = f"ACC_{year}_Q{parsed.question_number:03d}"
    record = {
        "questionId": qid,
        "year": year,
        "subjectId": "ACC",
        "chapterId": chapter_id,
        "patternId": pattern_id,
        "difficulty": "medium",
        "originalQuestion": parsed.original_question,
        "question": parsed.question,
        "choices": parsed.choices,
        "answer": answer,
        "answerIndex": answer,
        "questionType": parsed.question_type,
        "hasTable": parsed.has_table,
        "hasCalculation": parsed.has_calculation,
        "figure": parsed.has_figure,
        "table": parsed.table_markdown or parsed.table_grid,
        "formula": None,
        "source": {
            "type": "original_exam",
            "examId": "APPRAISER",
            "year": year,
            "round": 1,
            "examRound": EXAM_ROUND.get(year),
            "questionNumber": parsed.question_number,
            "sourceFile": source_file,
            "sourceKind": source_kind,
            "page": parsed.page,
            "usedOcr": used_ocr,
        },
        "solution": {
            "summary": "",
            "algorithm": "",
            "calculationProcess": "",
            "explanation": "",
            "steps": [],
            "wrongAnalysis": [],
            "memoryPoint": "",
        },
    }
    return record


def build_pattern_db(questions: list[dict]) -> list[dict]:
    grouped: dict[str, list[dict]] = defaultdict(list)
    for question in questions:
        grouped[question["patternId"]].append(question)

    patterns = []
    for pattern_id in sorted(grouped):
        items = grouped[pattern_id]
        years = sorted({q["year"] for q in items})
        chapter_id = items[0]["chapterId"]
        patterns.append(
            {
                "patternId": pattern_id,
                "subjectId": "ACC",
                "chapterId": chapter_id,
                "name": PATTERN_NAMES.get(pattern_id, pattern_id),
                "grade": pattern_grade(len(items)),
                "frequency": len(items),
                "years": years,
                "importance": min(95, 55 + len(items) * 3),
                "relatedQuestions": [q["questionId"] for q in items],
            }
        )
    return patterns


def build_statistics(patterns: list[dict]) -> list[dict]:
    stats = []
    for pattern in patterns:
        recent = [year for year in pattern["years"] if year >= 2022]
        stats.append(
            {
                "patternId": pattern["patternId"],
                "chapterId": pattern["chapterId"],
                "totalCount": pattern["frequency"],
                "years": pattern["years"],
                "recentYears": recent,
                "priority": "HIGH" if pattern["grade"] == "S" else "MEDIUM" if pattern["grade"] == "A" else "LOW",
                "grade": pattern["grade"],
            }
        )
    return stats


def write_validation_report(
    year_reports: list[dict],
    questions: list[dict],
    validation: dict,
) -> None:
    lines = [
        "# Question DB MVP Validation Report",
        "",
        f"- 생성일: {date.today().isoformat()}",
        "- 데이터 소스: `source/original-exams/` (HWP > PDF > OCR)",
        "- 출력: `data/question-db-mvp.json`, `pattern-db-mvp.json`, `statistics-mvp.json`",
        "- Phase 1 Freeze (`data/question-db.json` 등) 미수정",
        "- MVP 범위: 2015, 2017, 2018, 2020, 2024, 2025 (240문항)",
        "",
        "## 요약",
        "",
        "| 항목 | 값 |",
        "|------|-----|",
        f"| 대상 연도 | {', '.join(str(year) for year in YEARS)} |",
        f"| 기대 문항 | {len(YEARS) * EXPECTED_ACC_COUNT} |",
        f"| 추출 문항 | {validation['questionCount']} |",
        f"| Question 인식률 | {validation['questionRate']}% |",
        f"| 보기 인식률 (5지) | {validation['choiceRate']}% |",
        f"| 정답 연결률 | {validation['answerRate']}% |",
        f"| Pattern 연결률 | {validation['patternRate']}% |",
        f"| 표 문제 | {validation['tableCount']} |",
        f"| 계산 문제 | {validation['calcCount']} |",
        f"| Phase 1 MVP | {validation['phaseResult']} |",
        "",
        "## 연도별 추출 결과",
        "",
        "| 연도 | 원본 | 방식 | OCR | 문항 | 5지 보기 | 정답 | 상태 |",
        "|------|------|------|-----|------|----------|------|------|",
    ]
    for report in year_reports:
        lines.append(
            f"| {report['year']} | `{report['sourceFile']}` | {report['sourceKind']} | "
            f"{'Y' if report['usedOcr'] else 'N'} | {report['extracted']}/{EXPECTED_ACC_COUNT} | "
            f"{report['fiveChoices']} | {report['answers']} | {report['status']} |"
        )

    lines.extend(["", "## Validation 결과", ""])
    for item in validation["checks"]:
        mark = "PASS" if item["passed"] else "FAIL"
        lines.append(f"- [{mark}] {item['name']}: {item['detail']}")

    if validation["failures"]:
        lines.extend(["", "## 실패 상세", ""])
        for failure in validation["failures"][:80]:
            lines.append(f"- {failure}")
        if len(validation["failures"]) > 80:
            lines.append(f"- ... 외 {len(validation['failures']) - 80}건")

    lines.extend(
        [
            "",
            "## 기존 DB 대비 개선",
            "",
            "- StudyPiter 2단 합본 PDF 대신 `source/original-exams` 원본(HWP 우선) 사용",
            "- 회계학 41~80번 전체 40문항 추출 구조",
            "- 표 문제 Markdown/grid 보존, 계산 문제 줄바꿈·수식 유지",
            "- `answers/{year}.json` 및 원본 정답 HWP/PDF 자동 연결",
            "",
        ]
    )
    OUTPUT_REPORT.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    all_questions: list[dict] = []
    year_reports: list[dict] = []
    failures: list[str] = []
    seq = 0

    print("Building Question DB MVP ...")
    for year in YEARS:
        report = {
            "year": year,
            "sourceFile": "",
            "sourceKind": "",
            "usedOcr": False,
            "extracted": 0,
            "fiveChoices": 0,
            "answers": 0,
            "status": "failed",
            "issues": [],
        }
        try:
            doc = load_exam_document(year, CACHE_DIR)
            answers = load_accounting_answers(year, CACHE_DIR)
            parsed_list = parse_accounting_questions(doc.text, doc.pages)
            report["sourceFile"] = str(doc.source_path.relative_to(ROOT)).replace("\\", "/")
            report["sourceKind"] = doc.source_kind
            report["usedOcr"] = doc.used_ocr

            for parsed in parsed_list:
                if not parsed.question or len(parsed.choices) != 5:
                    failures.extend(f"{year}년 {issue}" for issue in parsed.issues)
                    continue
                answer = answers.get(parsed.question_number)
                if answer is None:
                    failures.append(f"{year}년 {parsed.question_number}번 정답 없음")
                    continue
                pattern_id, chapter_id = classify_pattern(parsed.original_question)
                seq += 1
                record = build_question_record(
                    parsed,
                    year,
                    report["sourceFile"],
                    doc.source_kind,
                    doc.used_ocr,
                    answer,
                    pattern_id,
                    chapter_id,
                    seq,
                )
                all_questions.append(record)
                report["extracted"] += 1
                if len(parsed.choices) == 5:
                    report["fiveChoices"] += 1
                if answer is not None:
                    report["answers"] += 1

            if report["extracted"] == EXPECTED_ACC_COUNT and report["fiveChoices"] == EXPECTED_ACC_COUNT and report["answers"] == EXPECTED_ACC_COUNT:
                report["status"] = "ok"
            elif report["extracted"] > 0:
                report["status"] = "partial"
        except Exception as exc:
            report["issues"].append(str(exc))
            failures.append(f"{year}년: {exc}")

        year_reports.append(report)
        print(
            f"  {year}: {report['status']} "
            f"{report['extracted']}/{EXPECTED_ACC_COUNT} "
            f"answers={report['answers']} "
            f"ocr={'Y' if report['usedOcr'] else 'N'}"
        )

    all_questions.sort(key=lambda item: (item["year"], item["source"]["questionNumber"]))
    patterns = build_pattern_db(all_questions)
    statistics = build_statistics(patterns)

    expected_total = len(YEARS) * EXPECTED_ACC_COUNT
    question_count = len(all_questions)
    five_choice_count = sum(1 for q in all_questions if len(q.get("choices") or []) == 5)
    answer_count = sum(1 for q in all_questions if q.get("answer") is not None)
    pattern_count = sum(1 for q in all_questions if q.get("patternId"))
    table_count = sum(1 for q in all_questions if q.get("hasTable"))
    calc_count = sum(1 for q in all_questions if q.get("hasCalculation"))

    question_rate = round(question_count / expected_total * 100, 2) if expected_total else 0
    choice_rate = round(five_choice_count / question_count * 100, 2) if question_count else 0
    answer_rate = round(answer_count / question_count * 100, 2) if question_count else 0
    pattern_rate = round(pattern_count / question_count * 100, 2) if question_count else 0

    checks = [
        {"name": "40문항/연도", "passed": all(r["extracted"] == EXPECTED_ACC_COUNT for r in year_reports), "detail": f"{question_count}/{expected_total}"},
        {"name": "보기 5개", "passed": choice_rate == 100.0, "detail": f"{five_choice_count}/{question_count}"},
        {"name": "question 존재", "passed": all(q.get("question") for q in all_questions), "detail": f"{question_count}건"},
        {"name": "answer 존재", "passed": answer_rate == 100.0, "detail": f"{answer_count}/{question_count}"},
        {"name": "Pattern 연결", "passed": pattern_rate == 100.0, "detail": f"{pattern_count}/{question_count}"},
    ]
    phase_pass = (
        question_count == expected_total
        and choice_rate == 100
        and answer_rate == 100
        and pattern_rate == 100
        and all(r["extracted"] == EXPECTED_ACC_COUNT for r in year_reports)
    )
    validation = {
        "questionCount": question_count,
        "questionRate": question_rate,
        "choiceRate": choice_rate,
        "answerRate": answer_rate,
        "patternRate": pattern_rate,
        "tableCount": table_count,
        "calcCount": calc_count,
        "checks": checks,
        "failures": failures,
        "phaseResult": "PASS" if phase_pass else "FAIL",
    }

    payload = {
        "version": "mvp-1.0",
        "generatedAt": date.today().isoformat(),
        "sourceRoot": "source/original-exams",
        "subject": "회계학",
        "questionRange": {"start": ACC_START, "end": ACC_END},
        "metadata": {
            "pipeline": "MVP Rebuild v3",
            "mvpYears": YEARS,
            "priority": ["hwp", "pdf", "ocr"],
            "legacySourceDeprecated": "source/past-exams (StudyPiter)",
        },
        "questions": all_questions,
    }

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_QUESTION_DB.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    OUTPUT_PATTERN_DB.write_text(json.dumps(patterns, ensure_ascii=False, indent=2), encoding="utf-8")
    OUTPUT_STATISTICS.write_text(json.dumps(statistics, ensure_ascii=False, indent=2), encoding="utf-8")
    write_validation_report(year_reports, all_questions, validation)

    print(
        f"Done. questions={question_count} "
        f"qRate={question_rate}% choice={choice_rate}% answer={answer_rate}% pattern={pattern_rate}%"
    )
    print(f"  -> {OUTPUT_QUESTION_DB}")
    print(f"  -> {OUTPUT_REPORT}")
    return 0 if phase_pass else 1


if __name__ == "__main__":
    sys.exit(main())
