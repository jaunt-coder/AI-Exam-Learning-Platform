#!/usr/bin/env python3
"""
Build question-db-v2.json from source/original-exams only.

- Text PDFs: pypdf text layer (no OCR)
- 2019.hwp: pyhwp (distribution docs may fail)
- Image-only PDFs (2021-2023): reported as unsupported
- Answers: optional source/original-exams/answers/{year}.json
"""
from __future__ import annotations

import json
import re
import sys
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Any

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = ROOT / "source" / "original-exams"
ANSWERS_DIR = SOURCE_DIR / "answers"
DATA_DIR = ROOT / "data"
OUTPUT_DB = DATA_DIR / "question-db-v2.json"
VALIDATION_REPORT = ROOT / "validation-report.md"

YEARS = list(range(2017, 2027))
EXAM_ROUND = {
    2017: 28,
    2018: 29,
    2019: 30,
    2020: 31,
    2021: 32,
    2022: 33,
    2023: 34,
    2024: 35,
    2025: 36,
    2026: 37,
}

CHOICE_SYMBOLS = ["①", "②", "③", "④", "⑤"]
SUBJECT_LAW = "감정평가관계법규"
SUBJECT_ACC = "회계학"
ACC_START = 41
ACC_END = 80
EXPECTED_ACC_COUNT = ACC_END - ACC_START + 1

QNUM_PATTERN = re.compile(r"(4[1-9]|[1-6]\d|7[0-9]|80)\.")


@dataclass
class PageChunk:
    page: int
    start: int
    text: str


@dataclass
class ExtractedQuestion:
    question_number: int
    question: str
    choices: list[str]
    answer: int | None
    year: int
    page: int
    subject: str
    source_file: str
    raw_body: str = field(repr=False)


@dataclass
class YearReport:
    year: int
    source_file: str
    source_type: str
    text_layer: bool
    status: str
    expected: int = EXPECTED_ACC_COUNT
    extracted: int = 0
    with_choices: int = 0
    five_choices: int = 0
    with_answer: int = 0
    missing_numbers: list[int] = field(default_factory=list)
    issues: list[str] = field(default_factory=list)


def load_pdf_pages(path: Path) -> tuple[str, list[PageChunk], bool]:
    reader = PdfReader(str(path))
    chunks: list[PageChunk] = []
    full_parts: list[str] = []
    offset = 0
    has_text = False
    for index, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        if text.strip():
            has_text = True
        chunks.append(PageChunk(page=index + 1, start=offset, text=text))
        full_parts.append(text)
        full_parts.append("\n")
        offset += len(text) + 1
    return "".join(full_parts), chunks, has_text


def page_for_offset(chunks: list[PageChunk], offset: int) -> int:
    current = chunks[0].page if chunks else 1
    for chunk in chunks:
        if chunk.start <= offset:
            current = chunk.page
        else:
            break
    return current


def find_accounting_start(text: str) -> int:
    marker = text.find(SUBJECT_ACC)
    if marker >= 0:
        return marker
    match = re.search(r"41\.", text)
    return match.start() if match else 0


def find_law_start(text: str) -> int:
    marker = text.find(SUBJECT_LAW)
    return marker if marker >= 0 else 0


def collect_question_markers(text: str, start_num: int, end_num: int) -> dict[int, int]:
    first = re.search(rf"{start_num}\.", text)
    if not first:
        return {}
    scoped = text[first.start() :]
    base = first.start()
    markers: dict[int, int] = {}
    for match in QNUM_PATTERN.finditer(scoped):
        number = int(match.group(1))
        if start_num <= number <= end_num and number not in markers:
            markers[number] = base + match.start()
    return markers


def normalize_whitespace(value: str) -> str:
    return re.sub(r"[ \t]+", " ", value.replace("\u0000", " ").strip())


def extract_hangul_item_choices(body: str) -> list[str]:
    flat = normalize_whitespace(body.replace("\n", " "))
    match = re.search(
        r"[?？]\s*(?:\(.*?\))?\s*(.+)$",
        flat,
        re.DOTALL,
    )
    if not match:
        return []
    tail = match.group(1)
    items = re.findall(r"[①②③④⑤]\s*([ㄱ-ㅎㅁ][^①②③④⑤]{0,80})", tail)
    if len(items) >= 4:
        return [normalize_whitespace(item) for item in items[:5]]
    return []


def extract_table_row_choices(body: str) -> list[str]:
    """Bond/table-style choices where PDF text layer drops circled numbers."""
    if not any(key in body for key in ("액면가치", "시장이자율", "상환가치", "연금현재가치", "기간")):
        return []
    numeric_chunks = re.findall(r"\d+\.\d{3,4}", body)
    if len(numeric_chunks) < 8:
        return []
    rows: list[str] = []
    step = max(2, len(numeric_chunks) // 5)
    for index in range(0, min(len(numeric_chunks), step * 5), step):
        chunk = numeric_chunks[index : index + step]
        if chunk:
            rows.append(", ".join(chunk))
    return rows[:5] if len(rows) >= 4 else []


def extract_choices(body: str) -> list[str]:
    flat = normalize_whitespace(body.replace("\n", " "))
    choices: list[str] = []
    for index, symbol in enumerate(CHOICE_SYMBOLS):
        next_symbols = "".join(re.escape(item) for item in CHOICE_SYMBOLS[index + 1 :])
        tail = rf"(?=\s*[{next_symbols}]|\?|$)" if next_symbols else "$"
        pattern = rf"{re.escape(symbol)}\s*(.+?){tail}"
        match = re.search(pattern, flat, re.DOTALL)
        if not match:
            continue
        value = normalize_whitespace(match.group(1))
        if value and len(value) <= 500:
            choices.append(value)
    if len(choices) >= 4:
        return choices[:5]

    for line in body.splitlines():
        line = line.strip()
        match = re.match(r"^[①②③④⑤]\s*(.+)", line)
        if match:
            choices.append(normalize_whitespace(match.group(1)))
    if len(choices) >= 4:
        return choices[:5]

    hangul = extract_hangul_item_choices(body)
    if len(hangul) >= 4:
        return hangul[:5]

    table_rows = extract_table_row_choices(body)
    if len(table_rows) >= 4:
        return table_rows[:5]

    return choices[:5]


def extract_question_text(body: str) -> str:
    cleaned = re.sub(r"^\d{1,2}\.", "", body.strip(), count=1)
    match = re.search(rf"^(.+?)(?=[{''.join(re.escape(s) for s in CHOICE_SYMBOLS)}])", cleaned, re.DOTALL)
    stem = match.group(1).strip() if match else cleaned
    stem = normalize_whitespace(stem)
    if len(stem) > 4000:
        stem = stem[:4000]
    return stem


def split_questions(
    text: str,
    markers: dict[int, int],
    start_num: int,
    end_num: int,
) -> dict[int, str]:
    ordered = sorted(markers.items(), key=lambda item: item[1])
    bodies: dict[int, str] = {}
    for index, (number, start) in enumerate(ordered):
        end = ordered[index + 1][1] if index + 1 < len(ordered) else len(text)
        bodies[number] = text[start:end].strip()
    for number in range(start_num, end_num + 1):
        bodies.setdefault(number, "")
    return bodies


def load_answer_map(year: int) -> dict[int, int]:
    path = ANSWERS_DIR / f"{year}.json"
    if not path.exists():
        return {}
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"Invalid answer file: {path} ({exc})") from exc
    answers: dict[int, int] = {}
    for key, value in payload.items():
        number = int(key)
        if ACC_START <= number <= ACC_END:
            answers[number] = int(value)
    return answers


def parse_hwp_preview_text(path: Path) -> str:
    from hwp5.filestructure import Hwp5File

    hwp = Hwp5File(str(path))
    preview = hwp.preview_text.open().read()
    text = preview.decode("utf-16le", errors="replace")
    text = text.replace("><", ">\n<")
    text = re.sub(r"<(\d{1,2})\.>", lambda m: f"\n{m.group(1)}.", text)
    text = re.sub(r"<[^>]+>", "", text)
    return normalize_whitespace(text)


def extract_hwp_text(path: Path) -> tuple[str, list[str]]:
    issues: list[str] = []
    try:
        from hwp5.filestructure import Hwp5File
        from hwp5.hwp5txt import TextTransform
        import io

        hwp = Hwp5File(str(path))
        distributable = bool(getattr(hwp.header.flags, "distributable", 0))
        if distributable:
            issues.append("배포용 문서(distributable): ViewText 전체 본문 추출 불가")
            preview = parse_hwp_preview_text(path)
            if preview and SUBJECT_ACC in preview:
                issues.append("PrvText 미리보기에서 회계학 구간 확인")
                return preview, issues
            if preview:
                issues.append("PrvText 미리보기만 존재 (회계학 구간 없음)")
            return "", issues

        transform = TextTransform().transform_hwp5_to_text
        buffer = io.BytesIO()
        transform(hwp, buffer)
        text = buffer.getvalue().decode("utf-8", errors="replace")
        return text, issues
    except Exception as exc:  # pragma: no cover - runtime dependency
        issues.append(f"HWP 파싱 실패: {exc}")
        return "", issues


def parse_document(year: int) -> tuple[str, list[PageChunk], str, list[str], bool]:
    pdf_path = SOURCE_DIR / f"{year}.pdf"
    hwp_path = SOURCE_DIR / f"{year}.hwp"

    if pdf_path.exists():
        text, chunks, has_text = load_pdf_pages(pdf_path)
        return text, chunks, str(pdf_path.relative_to(ROOT)).replace("\\", "/"), [], has_text

    if hwp_path.exists():
        text, issues = extract_hwp_text(hwp_path)
        chunks = [PageChunk(page=1, start=0, text=text)] if text else []
        return text, chunks, str(hwp_path.relative_to(ROOT)).replace("\\", "/"), issues, bool(text.strip())

    return "", [], "", [f"원본 파일 없음: {year}"], False


def build_question_objects(year: int) -> tuple[list[dict[str, Any]], YearReport]:
    text, chunks, source_file, pre_issues, has_text = parse_document(year)
    report = YearReport(
        year=year,
        source_file=source_file or f"source/original-exams/{year}.pdf",
        source_type="pdf" if (SOURCE_DIR / f"{year}.pdf").exists() else "hwp",
        text_layer=has_text,
        status="pending",
    )
    report.issues.extend(pre_issues)

    if not text.strip():
        report.status = "failed"
        if not has_text and report.source_type == "pdf":
            report.issues.append("텍스트 레이어 없음 (스캔 PDF)")
        report.missing_numbers = list(range(ACC_START, ACC_END + 1))
        return [], report

    answers = load_answer_map(year)
    acc_start = find_accounting_start(text)
    acc_markers = collect_question_markers(text[acc_start:], ACC_START, ACC_END)
    acc_bodies = split_questions(text, {k: acc_start + v for k, v in acc_markers.items()}, ACC_START, ACC_END)

    questions: list[dict[str, Any]] = []
    for number in range(ACC_START, ACC_END + 1):
        body = acc_bodies.get(number, "")
        if not body:
            report.missing_numbers.append(number)
            continue

        choices = extract_choices(body)
        question_text = extract_question_text(body)
        if not question_text:
            report.issues.append(f"{number}번 본문 추출 실패")
            continue
        if len(choices) < 4:
            report.issues.append(f"{number}번 보기 부족 ({len(choices)}개)")

        offset = acc_markers.get(number, 0)
        page = page_for_offset(chunks, acc_start + offset) if chunks else 1
        answer = answers.get(number)

        item = {
            "id": f"Q_{year}_{number:02d}",
            "questionNumber": number,
            "question": question_text,
            "choices": choices,
            "answer": answer,
            "year": year,
            "page": page,
            "subject": SUBJECT_ACC,
            "examRound": EXAM_ROUND.get(year),
            "source": {
                "type": "original_exam",
                "sourceFile": source_file,
                "page": page,
                "subject": SUBJECT_ACC,
            },
        }
        questions.append(item)

        report.extracted += 1
        if choices:
            report.with_choices += 1
        if len(choices) == 5:
            report.five_choices += 1
        if answer is not None:
            report.with_answer += 1

    if report.extracted == 0:
        report.status = "failed"
    elif report.extracted == EXPECTED_ACC_COUNT and report.five_choices >= EXPECTED_ACC_COUNT - 2:
        report.status = "ok"
    elif report.extracted == EXPECTED_ACC_COUNT:
        report.status = "partial"
    else:
        report.status = "partial"

    return questions, report


def compute_recognition_rate(reports: list[YearReport]) -> float:
    expected_total = len(YEARS) * EXPECTED_ACC_COUNT
    extracted_total = sum(report.extracted for report in reports)
    if expected_total == 0:
        return 0.0
    return round(extracted_total / expected_total * 100, 2)


def compute_text_layer_recognition(reports: list[YearReport]) -> float:
    text_reports = [report for report in reports if report.text_layer]
    if not text_reports:
        return 0.0
    expected = len(text_reports) * EXPECTED_ACC_COUNT
    extracted = sum(report.extracted for report in text_reports)
    return round(extracted / expected * 100, 2)


def compute_choice_recognition(questions: list[dict[str, Any]]) -> float:
    if not questions:
        return 0.0
    ok = sum(1 for question in questions if len(question.get("choices") or []) >= 4)
    return round(ok / len(questions) * 100, 2)


def write_validation_report(reports: list[YearReport], questions: list[dict[str, Any]]) -> None:
    total = len(questions)
    choice_counts: dict[int, int] = {}
    for question in questions:
        count = len(question.get("choices") or [])
        choice_counts[count] = choice_counts.get(count, 0) + 1

    missing_all: list[str] = []
    for report in reports:
        if report.missing_numbers:
            nums = ", ".join(str(n) for n in report.missing_numbers)
            missing_all.append(f"- {report.year}년: {nums}")

    recognition = compute_recognition_rate(reports)
    text_layer_rate = compute_text_layer_recognition(reports)
    choice_rate = compute_choice_recognition(questions)
    answer_count = sum(1 for q in questions if q.get("answer") is not None)

    lines = [
        "# Question DB v2 Validation Report",
        "",
        f"- 생성일: {date.today().isoformat()}",
        f"- 데이터 소스: `source/original-exams/`",
        f"- 출력 파일: `data/question-db-v2.json`",
        f"- 기존 `data/question-db.json` 수정: 없음",
        "",
        "## 요약",
        "",
        f"| 항목 | 값 |",
        f"|------|-----|",
        f"| 대상 연도 | 2017 ~ 2026 |",
        f"| 회계학 기대 문항 | {len(YEARS) * EXPECTED_ACC_COUNT} |",
        f"| 추출 문항 | {total} |",
        f"| 전체 인식률 (2017~2026) | {recognition}% |",
        f"| 텍스트 레이어 인식률 | {text_layer_rate}% |",
        f"| 보기 인식률 (4개 이상) | {choice_rate}% |",
        f"| 정답 매핑 | {answer_count} / {total} |",
        "",
        "## 연도별 결과",
        "",
        "| 연도 | 원본 | 텍스트 레이어 | 상태 | 문항 | 5지 보기 | 정답 | 누락 |",
        "|------|------|---------------|------|------|----------|------|------|",
    ]

    for report in reports:
        missing = len(report.missing_numbers)
        lines.append(
            f"| {report.year} | `{report.source_file}` | "
            f"{'O' if report.text_layer else 'X'} | {report.status} | "
            f"{report.extracted}/{EXPECTED_ACC_COUNT} | {report.five_choices} | "
            f"{report.with_answer} | {missing} |"
        )

    lines.extend(["", "## 보기 개수 분포", ""])
    for count in sorted(choice_counts):
        lines.append(f"- {count}개: {choice_counts[count]}문항")

    lines.extend(["", "## 누락 문항", ""])
    if missing_all:
        lines.extend(missing_all)
    else:
        lines.append("- 없음")

    lines.extend(["", "## 이슈", ""])
    issue_lines = []
    for report in reports:
        for issue in report.issues:
            issue_lines.append(f"- {report.year}년: {issue}")
    if issue_lines:
        lines.extend(issue_lines)
    else:
        lines.append("- 없음")

    lines.extend(
        [
            "",
            "## 데이터 소스 제한",
            "",
            "- `2019.hwp`: 배포용 문서(distributable)인 경우 본문 텍스트 추출이 불가할 수 있음",
            "- `2021~2023.pdf`: 텍스트 레이어 없음 (OCR 미사용 정책에 따라 추출 불가)",
            "- 원본 시험지 PDF에는 정답이 포함되지 않음 → `source/original-exams/answers/{year}.json` 필요",
            "",
            "## 인식률 기준",
            "",
            f"- 목표: 99% 이상",
            f"- 전체 인식률: {recognition}%",
            f"- 텍스트 레이어 대상 인식률: {text_layer_rate}%",
            f"- 보기 인식률(4개 이상): {choice_rate}%",
            f"- 판정(텍스트 레이어 기준): {'PASS' if text_layer_rate >= 99 else 'FAIL'}",
            "",
        ]
    )

    VALIDATION_REPORT.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    all_questions: list[dict[str, Any]] = []
    reports: list[YearReport] = []

    print("Building question-db-v2.json from source/original-exams ...")
    for year in YEARS:
        questions, report = build_question_objects(year)
        reports.append(report)
        all_questions.extend(questions)
        print(
            f"  {year}: {report.status} "
            f"{report.extracted}/{EXPECTED_ACC_COUNT} "
            f"(text={'Y' if report.text_layer else 'N'})"
        )

    all_questions.sort(key=lambda item: (item["year"], item["questionNumber"]))

    payload = {
        "version": "2.0",
        "generatedAt": date.today().isoformat(),
        "sourceRoot": "source/original-exams",
        "subject": SUBJECT_ACC,
        "questionRange": {"start": ACC_START, "end": ACC_END},
        "metadata": {
            "ocrUsed": False,
            "legacySourceDeprecated": "source/past-exams (StudyPiter)",
            "notes": [
                "원본 시험지 PDF/HWP에서 회계학(41~80번)만 추출",
                "정답은 source/original-exams/answers/{year}.json 제공 시 매핑",
            ],
        },
        "questions": all_questions,
    }

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_DB.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    write_validation_report(reports, all_questions)

    recognition = compute_recognition_rate(reports)
    text_layer_rate = compute_text_layer_recognition(reports)
    choice_rate = compute_choice_recognition(all_questions)
    print(
        f"Done. questions={len(all_questions)} "
        f"overall={recognition}% text_layer={text_layer_rate}% choices={choice_rate}%"
    )
    print(f"  -> {OUTPUT_DB}")
    print(f"  -> {VALIDATION_REPORT}")
    return 0 if text_layer_rate >= 99 and choice_rate >= 99 else 1


if __name__ == "__main__":
    sys.exit(main())
