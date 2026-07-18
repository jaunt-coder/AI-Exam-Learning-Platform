#!/usr/bin/env python3
"""Analyze all source/original-exams years for extraction feasibility."""
from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

from exam_pipeline.constants import (
    ACC_END,
    ACC_START,
    CACHE_DIR,
    EXPECTED_ACC_COUNT,
    SOURCE_DIR,
)
from exam_pipeline.question_parser import (
    collect_question_markers,
    find_accounting_start,
    parse_accounting_questions,
)
from exam_pipeline.source_loader import load_exam_document
from exam_pipeline.year_discovery import (
    discover_all_years,
    find_ocr_cache_file,
    hwp_extract_status,
    pdf_has_text_layer,
    resolve_answer_sources_for_year,
    resolve_exam_source_for_year,
)

OUTPUT_REPORT = ROOT / "validation-report-all-years.md"
ANALYSIS_CACHE = CACHE_DIR / "all-years-analysis.json"


@dataclass
class YearReport:
    year: int
    exam_file: str = ""
    exam_format: str = ""
    answer_file: str = ""
    answer_format: str = ""
    exam_present: bool = False
    answer_present: bool = False
    text_pdf: str = "N/A"
    ocr_required: str = "N/A"
    ocr_cache: str = "N/A"
    hwp_status: str = "N/A"
    markers: int = 0
    extracted: int = 0
    stem_ok: int = 0
    five_choices: int = 0
    choice_rate: float = 0.0
    answer_json: int = 0
    answer_source: str = "none"
    answer_linkable: str = "no"
    build_ready: str = "no"
    grade: str = "F"
    notes: list[str] = field(default_factory=list)


def grade_year(report: YearReport) -> str:
    if not report.exam_present:
        return "F"
    if report.extracted == EXPECTED_ACC_COUNT and report.five_choices == EXPECTED_ACC_COUNT:
        if report.answer_json == EXPECTED_ACC_COUNT:
            return "A"
        if report.answer_json >= 30 or report.answer_source != "none":
            return "B"
        return "C"
    if report.extracted >= 30 and report.choice_rate >= 90:
        return "C"
    if report.extracted > 0:
        return "D"
    if report.ocr_required == "Y" and report.exam_present:
        return "D"
    return "F"


def analyze_exam_year(year: int, with_ocr: bool) -> tuple[YearReport, dict | None]:
    report = YearReport(year=year)
    exam = resolve_exam_source_for_year(year)
    answer = resolve_answer_sources_for_year(year)

    report.exam_present = exam.exists
    report.answer_present = bool(answer.json_path or answer.source_path)
    report.exam_file = exam.path.name if exam.path else ""
    report.exam_format = exam.kind or ""
    report.answer_json = answer.json_count

    if answer.json_path:
        report.answer_file = answer.json_path.name
        report.answer_format = "json"
        report.answer_source = "json"
    elif answer.source_path:
        report.answer_file = answer.source_path.name
        report.answer_format = answer.source_kind or ""
        report.answer_source = answer.source_kind or "file"

    if not exam.exists:
        report.notes.append("시험지 원본 없음")
        if answer.source_path and not answer.json_path:
            report.notes.append("정답 원본만 존재 (2016 등)")
            report.answer_linkable = "partial"
        report.grade = grade_year(report)
        return report, None

    parsed_payload: dict | None = None

    if exam.kind == "pdf":
        has_text = pdf_has_text_layer(exam.path)
        cache = find_ocr_cache_file(exam.path, CACHE_DIR)
        report.text_pdf = "Y" if has_text else "N"
        report.ocr_required = "N" if has_text else "Y"
        report.ocr_cache = "Y" if cache else "N"
        if not has_text and not cache and not with_ocr:
            report.notes.append("스캔 PDF — OCR 캐시 없음 (추출 미검증)")
    elif exam.kind == "hwp":
        status, error = hwp_extract_status(exam.path)
        report.hwp_status = status
        report.text_pdf = "N/A"
        report.ocr_required = "N" if status == "text" else "Y"
        if error:
            report.notes.append(error)
        if status == "blocked":
            report.notes.append("HWP 본문 추출 불가 — PDF 대체 필요")

    can_load = exam.exists and (
        (exam.kind == "pdf" and (report.text_pdf == "Y" or report.ocr_cache == "Y" or with_ocr))
        or (exam.kind == "hwp" and report.hwp_status == "text")
    )

    if can_load:
        try:
            doc = load_exam_document(year, CACHE_DIR)
            scoped = doc.text[find_accounting_start(doc.text) :]
            markers = collect_question_markers(scoped, ACC_START, ACC_END)
            parsed = parse_accounting_questions(doc.text, doc.pages)

            report.markers = len(markers)
            report.extracted = sum(1 for item in parsed if item.question)
            report.stem_ok = sum(1 for item in parsed if item.question)
            report.five_choices = sum(1 for item in parsed if len(item.choices) == 5)
            report.choice_rate = round(
                report.five_choices / EXPECTED_ACC_COUNT * 100, 1
            ) if EXPECTED_ACC_COUNT else 0.0
            if doc.used_ocr:
                report.ocr_required = "Y"
                report.notes.append("OCR 텍스트 사용")
            if report.markers < EXPECTED_ACC_COUNT:
                missing = EXPECTED_ACC_COUNT - report.markers
                report.notes.append(f"문항 마커 {report.markers}/40 ({missing}개 누락)")
            if report.five_choices < EXPECTED_ACC_COUNT:
                report.notes.append(
                    f"5지 보기 {report.five_choices}/40 ({report.choice_rate}%)"
                )

            parsed_payload = {
                "markers": report.markers,
                "extracted": report.extracted,
                "five_choices": report.five_choices,
                "used_ocr": doc.used_ocr,
            }
        except Exception as exc:
            report.notes.append(f"추출 오류: {exc}")
    elif exam.kind == "hwp" and report.hwp_status == "preview":
        report.notes.append("PrvText 미리보기만 확인 — 본문 파싱 미실행")

    if report.answer_json == EXPECTED_ACC_COUNT:
        report.answer_linkable = "yes"
    elif report.answer_json > 0:
        report.answer_linkable = "partial"
        report.notes.append(f"정답 JSON {report.answer_json}/40")
    elif report.answer_source != "none":
        report.answer_linkable = "partial"
        report.notes.append("정답 원본 있음 — JSON/OCR 변환 필요")
    else:
        report.answer_linkable = "no"
        report.notes.append("정답 파일 없음")

    if (
        report.extracted == EXPECTED_ACC_COUNT
        and report.five_choices == EXPECTED_ACC_COUNT
        and report.answer_json == EXPECTED_ACC_COUNT
    ):
        report.build_ready = "yes"
    elif report.extracted >= 30 and report.answer_json >= 30:
        report.build_ready = "partial"
    else:
        report.build_ready = "no"

    report.grade = grade_year(report)
    return report, parsed_payload


def summarize_reports(reports: list[YearReport]) -> dict:
    exam_years = [r for r in reports if r.exam_present]
    text_pdf_years = [r for r in exam_years if r.text_pdf == "Y"]
    ocr_years = [r for r in exam_years if r.ocr_required == "Y"]
    full_extract = [r for r in reports if r.extracted == EXPECTED_ACC_COUNT]
    full_choices = [r for r in reports if r.five_choices == EXPECTED_ACC_COUNT]
    full_answers = [r for r in reports if r.answer_json == EXPECTED_ACC_COUNT]
    build_ready = [r for r in reports if r.build_ready == "yes"]
    grade_a = [r.year for r in reports if r.grade == "A"]
    grade_b = [r.year for r in reports if r.grade == "B"]
    last_10 = [r for r in reports if r.year >= 2017]
    last_10_ready = [r for r in last_10 if r.build_ready == "yes"]

    return {
        "total_years": len(reports),
        "exam_present": len(exam_years),
        "text_pdf": len(text_pdf_years),
        "ocr_required": len(ocr_years),
        "full_extract": len(full_extract),
        "full_choices": len(full_choices),
        "full_answers": len(full_answers),
        "build_ready": len(build_ready),
        "grade_a": grade_a,
        "grade_b": grade_b,
        "last_10_ready": len(last_10_ready),
    }


def write_report(reports: list[YearReport], summary: dict, with_ocr: bool) -> None:
    lines = [
        "# Original Exams — 전체 연도 추출 가능성 분석",
        "",
        f"- 생성일: {date.today().isoformat()}",
        f"- 데이터 소스: `source/original-exams/` (자동 연도 탐색)",
        f"- 분석 범위: 2010년 이후 탐지된 모든 연도",
        f"- OCR 실행: {'Y (캐시 우선 + --with-ocr)' if with_ocr else 'N (캐시 있는 경우만)'}",
        "- **Phase 1 Freeze / question-db-v3.json 교체 없음**",
        "",
        "## Executive Summary",
        "",
        "| 항목 | 값 |",
        "|------|-----|",
        f"| 탐지 연도 | {summary['total_years']}개 ({reports[0].year}~{reports[-1].year}) |" if reports else "| 탐지 연도 | 0 |",
        f"| 시험지 존재 | {summary['exam_present']}개 연도 |",
        f"| 텍스트 PDF | {summary['text_pdf']}개 연도 |",
        f"| OCR 필요 | {summary['ocr_required']}개 연도 |",
        f"| 회계학 40문항 추출 | {summary['full_extract']}개 연도 |",
        f"| 5지 보기 40/40 | {summary['full_choices']}개 연도 |",
        f"| 정답 JSON 40/40 | {summary['full_answers']}개 연도 |",
        f"| 즉시 빌드 가능 (A등급) | {len(summary['grade_a'])}개 — {', '.join(map(str, summary['grade_a'])) or '없음'} |",
        f"| 빌드 준비 (40/40/40) | {summary['build_ready']}개 연도 |",
        f"| 최근 10개년(2017~) 빌드 준비 | {summary['last_10_ready']}/10 |",
        "",
        "## 연도별 상세",
        "",
        "| 연도 | 시험지 | 형식 | 텍스트PDF | OCR | 마커 | 추출 | 5지보기 | 보기율 | 정답JSON | 정답원본 | 연결 | 등급 | 빌드 |",
        "|------|--------|------|-----------|-----|------|------|---------|--------|----------|----------|------|------|------|",
    ]

    for report in reports:
        exam_label = report.exam_file or "—"
        lines.append(
            f"| {report.year} | `{exam_label}` | {report.exam_format or '—'} | "
            f"{report.text_pdf} | {report.ocr_required} | "
            f"{report.markers if report.markers else '—'} | "
            f"{report.extracted if report.extracted else '—'} | "
            f"{report.five_choices if report.five_choices else '—'} | "
            f"{f'{report.choice_rate}%' if report.five_choices else '—'} | "
            f"{report.answer_json if report.answer_json else '—'} | "
            f"{report.answer_format or '—'} | "
            f"{report.answer_linkable} | **{report.grade}** | {report.build_ready} |"
        )

    lines.extend(["", "## 등급 기준", ""])
    lines.extend(
        [
            "| 등급 | 조건 |",
            "|------|------|",
            "| **A** | 40문항 + 5지 40 + 정답 JSON 40 |",
            "| **B** | 40문항 + 5지 40 + 정답 원본/JSON 30+ |",
            "| **C** | 30+ 문항 추출 또는 정답 부분 연결 |",
            "| **D** | OCR 필요·부분 추출 |",
            "| **F** | 원본 없음 / 추출 불가 |",
            "",
            "## 시나리오별 권장",
            "",
            "### A. 최근 10개년만 사용 (2017~2026)",
            "",
        ]
    )

    last_10 = [r for r in reports if r.year >= 2017]
    a_last = [r.year for r in last_10 if r.grade == "A"]
    partial_last = [r.year for r in last_10 if r.build_ready in {"yes", "partial"}]
    lines.append(f"- A등급 즉시 사용 가능: **{', '.join(map(str, a_last)) or '없음'}** ({len(a_last)}개)")
    lines.append(f"- 부분 빌드 가능: {', '.join(map(str, partial_last)) or '없음'}")
    lines.append("- 2019(배포용 HWP), 2021~2023(스캔 PDF), 2026(정답 없음) 등 보완 필요")
    lines.append("")

    lines.extend(["### B. 2010년 이후 전체 사용", ""])
    all_a = summary["grade_a"]
    lines.append(f"- 즉시 사용(A): **{', '.join(map(str, all_a)) or '없음'}** ({len(all_a)}개)")
    lines.append("- 2010~2015: HWP 위주 — 비배포용 HWP 또는 PDF 변환 필요")
    lines.append("- 2016: 시험지 원본 없음, 정답 PDF만 존재")
    lines.append("")

    lines.extend(["### C. 품질 우선 — A등급 연도만 선택", ""])
    lines.append(f"- 권장 연도: **{', '.join(map(str, all_a)) or '없음'}**")
    lines.append(f"- 총 {len(all_a) * EXPECTED_ACC_COUNT}문항 ({len(all_a)}년 × 40)")
    lines.append("")

    lines.extend(["## 연도별 메모", ""])
    for report in reports:
        if report.notes:
            note_text = "; ".join(report.notes)
            lines.append(f"- **{report.year}**: {note_text}")

    missing_exams = [r.year for r in reports if not r.exam_present and r.answer_present]
    if missing_exams:
        lines.extend(["", "## 원본 누락", ""])
        for year in missing_exams:
            lines.append(f"- {year}년: 시험지 없음, 정답 파일만 존재")

    lines.extend(
        [
            "",
            "## 다음 단계",
            "",
            "1. A등급 연도로 MVP DB 범위 확정",
            "2. B/C/D 등급 연도 — PDF/HWP 원본 교체 또는 OCR 캐시 구축",
            "3. `scripts/build-question-db-v3.py`의 `YEARS` 상수를 확정 범위로 업데이트",
            "4. 검증 PASS 후 `question-db-v3.json` 교체 검토",
            "",
        ]
    )

    OUTPUT_REPORT.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Analyze all original-exams years")
    parser.add_argument(
        "--with-ocr",
        action="store_true",
        help="Run OCR for scan PDFs without cache (slow)",
    )
    parser.add_argument(
        "--min-year",
        type=int,
        default=2010,
        help="Minimum year to include (default: 2010)",
    )
    args = parser.parse_args()

    years = discover_all_years(min_year=args.min_year)
    if not years:
        print("FAIL: source/original-exams 에서 연도를 찾지 못했습니다.")
        return 1

    print(f"Analyzing {len(years)} years ({years[0]}~{years[-1]}) ...")
    reports: list[YearReport] = []
    cache_payload: dict[str, object] = {"generatedAt": date.today().isoformat(), "years": {}}

    for year in years:
        report, detail = analyze_exam_year(year, with_ocr=args.with_ocr)
        reports.append(report)
        cache_payload["years"][str(year)] = {
            "exam_file": report.exam_file,
            "exam_format": report.exam_format,
            "text_pdf": report.text_pdf,
            "ocr_required": report.ocr_required,
            "markers": report.markers,
            "extracted": report.extracted,
            "five_choices": report.five_choices,
            "choice_rate": report.choice_rate,
            "answer_json": report.answer_json,
            "answer_linkable": report.answer_linkable,
            "grade": report.grade,
            "build_ready": report.build_ready,
            "notes": report.notes,
            "detail": detail,
        }
        print(
            f"  {year}: grade={report.grade} "
            f"exam={'Y' if report.exam_present else 'N'} "
            f"extract={report.extracted}/{EXPECTED_ACC_COUNT} "
            f"choices={report.five_choices} "
            f"answers={report.answer_json} "
            f"ocr={report.ocr_required}"
        )

    summary = summarize_reports(reports)
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    ANALYSIS_CACHE.write_text(json.dumps(cache_payload, ensure_ascii=False, indent=2), encoding="utf-8")
    write_report(reports, summary, args.with_ocr)

    print(f"\nDone -> {OUTPUT_REPORT}")
    print(f"Cache -> {ANALYSIS_CACHE}")
    print(f"A-grade years: {summary['grade_a']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
