"""Source truth extraction and DB comparison for Question Quality Repair."""
from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass, field
from pathlib import Path

from .constants import ACC_END, ACC_START, CACHE_DIR, CHOICE_SYMBOLS
from .question_parser import (
    build_page_offsets,
    collect_question_markers,
    fill_missing_markers,
    find_accounting_start,
    page_for_offset,
    prepare_exam_text,
    split_question_bodies,
)
from .source_loader import load_exam_document

FOOTER_PATTERNS = [
    re.compile(r"A-\d{2}-\d{1,2}(?:-\[\d교시\])?", re.I),
    re.compile(r"교시\s*-\[\s*\d\s*\]", re.I),
    re.compile(r"한국산업", re.I),
    re.compile(r"청렴한감정평가", re.I),
]
from .text_postprocess import extract_numbers as pp_extract_numbers
from .text_postprocess import extract_units as pp_extract_units
from .text_postprocess import remove_footer_noise

GLUED_HANGUL = re.compile(r"[가-힣]{12,}")
QUESTION_PREFIX = re.compile(r"^\d{1,2}\.")


@dataclass
class SourceQuestionSlice:
    year: int
    question_number: int
    raw_body: str
    page: int
    source_file: str
    source_kind: str
    used_ocr: bool
    raw_body_hash: str
    choice_marker_count: int
    numbers: set[str] = field(default_factory=set)
    units: set[str] = field(default_factory=set)


@dataclass
class RepairIssue:
    code: str
    severity: str  # critical | warning | info
    detail: str


@dataclass
class QuestionRepairDiff:
    question_id: str
    year: int
    question_number: int
    source_page: int
    source_file: str
    raw_body_hash: str
    issues: list[RepairIssue] = field(default_factory=list)
    stem_coverage: float = 0.0
    missing_numbers: list[str] = field(default_factory=list)
    missing_units: list[str] = field(default_factory=list)


def hash_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]


def normalize_compare(text: str) -> str:
    value = prepare_exam_text(text or "")
    value = re.sub(r"\s+", "", value)
    return value.lower()


def clean_source_body(raw_body: str, question_number: int) -> str:
    value = remove_footer_noise(raw_body or "")
    value = QUESTION_PREFIX.sub("", value.strip(), count=1)
    return value.strip()


def extract_numbers(text: str) -> set[str]:
    return pp_extract_numbers(text)


def extract_units(text: str) -> set[str]:
    return pp_extract_units(text)


def longest_glued_hangul(text: str) -> int:
    runs = GLUED_HANGUL.findall((text or "").replace(" ", ""))
    return max((len(run) for run in runs), default=0)


def count_choice_markers(text: str) -> int:
    return sum(text.count(symbol) for symbol in CHOICE_SYMBOLS)


def load_year_raw_slices(year: int, cache_dir: Path | None = None) -> dict[int, SourceQuestionSlice]:
    cache = cache_dir or CACHE_DIR
    doc = load_exam_document(year, cache)
    text = prepare_exam_text(doc.text)
    acc_start = find_accounting_start(text)
    scoped = text[acc_start:]
    markers = fill_missing_markers(
        collect_question_markers(scoped, ACC_START, ACC_END),
        ACC_START,
        ACC_END,
    )
    bodies = split_question_bodies(scoped, markers)
    page_offsets = build_page_offsets(doc.pages)

    rel_source = f"source/original-exams/{doc.source_path.name}"
    slices: dict[int, SourceQuestionSlice] = {}

    for number in range(ACC_START, ACC_END + 1):
        raw_body = bodies.get(number, "")
        cleaned_body = clean_source_body(raw_body, number)
        offset = markers.get(number, 0)
        page = page_for_offset(page_offsets, acc_start + offset)
        slices[number] = SourceQuestionSlice(
            year=year,
            question_number=number,
            raw_body=raw_body,
            page=page,
            source_file=rel_source,
            source_kind=doc.source_kind,
            used_ocr=doc.used_ocr,
            raw_body_hash=hash_text(raw_body),
            choice_marker_count=count_choice_markers(raw_body),
            numbers=extract_numbers(cleaned_body),
            units=extract_units(cleaned_body),
        )
    return slices


def db_question_text(question: dict) -> str:
    parts = [
        question.get("question") or "",
        question.get("originalQuestion") or "",
        " ".join(question.get("choices") or []),
        question.get("table") or "",
    ]
    return "\n".join(part for part in parts if part)


def stem_coverage(db_question: dict, raw_body: str) -> float:
    stem = normalize_compare(db_question.get("question") or "")
    if not stem:
        return 0.0
    before_choices = raw_body.split("①")[0] if "①" in raw_body else raw_body
    raw_norm = normalize_compare(before_choices)
    if not raw_norm:
        return 1.0 if stem else 0.0
    # longest common substring ratio approximation via stem in raw
    if stem in raw_norm:
        return min(1.0, len(stem) / len(raw_norm))
    overlap = 0
    for size in range(min(len(stem), len(raw_norm)), 20, -1):
        for start in range(0, len(stem) - size + 1):
            chunk = stem[start : start + size]
            if chunk in raw_norm:
                overlap = max(overlap, size)
                break
        if overlap:
            break
    return overlap / len(raw_norm) if raw_norm else 0.0


def compare_question_to_source(db_question: dict, source: SourceQuestionSlice) -> QuestionRepairDiff:
    diff = QuestionRepairDiff(
        question_id=db_question["questionId"],
        year=source.year,
        question_number=source.question_number,
        source_page=source.page,
        source_file=source.source_file,
        raw_body_hash=source.raw_body_hash,
    )

    db_text = db_question_text(db_question)
    db_numbers = extract_numbers(db_text)
    db_units = extract_units(db_text)

    diff.stem_coverage = stem_coverage(db_question, source.raw_body)
    diff.missing_numbers = sorted(
        (
            num
            for num in (source.numbers - db_numbers)
            if num != str(source.question_number)
        ),
        key=len,
        reverse=True,
    )[:20]
    diff.missing_units = sorted(source.units - db_units)

    if not source.raw_body.strip():
        diff.issues.append(RepairIssue("source_missing", "critical", "원본 segment 없음"))
        return diff

    if source.choice_marker_count < 5:
        diff.issues.append(
            RepairIssue(
                "choice_markers_source",
                "critical",
                f"원본 보기 마커 {source.choice_marker_count}/5",
            )
        )

    choices = db_question.get("choices") or []
    if len(choices) != 5:
        diff.issues.append(
            RepairIssue("choice_count", "critical", f"DB 보기 {len(choices)}개")
        )

    if diff.stem_coverage < 0.55:
        diff.issues.append(
            RepairIssue(
                "stem_truncated",
                "critical",
                f"stem coverage {diff.stem_coverage:.0%} (<55%)",
            )
        )

    if len(diff.missing_numbers) >= 3:
        diff.issues.append(
            RepairIssue(
                "missing_numbers",
                "warning",
                f"원본 숫자 {len(diff.missing_numbers)}개 DB 미포함",
            )
        )

    if diff.missing_units:
        diff.issues.append(
            RepairIssue(
                "missing_units",
                "warning",
                f"원본 단위 {len(diff.missing_units)}개 DB 미포함: {', '.join(diff.missing_units[:5])}",
            )
        )

    stem = db_question.get("question") or ""
    source_stem = clean_source_body(source.raw_body.split("①")[0] if "①" in source.raw_body else source.raw_body, source.question_number)
    db_glued = longest_glued_hangul(stem)
    source_glued = longest_glued_hangul(source_stem)
    if db_glued >= 12 and db_glued > source_glued + 2:
        diff.issues.append(
            RepairIssue(
                "ocr_glued_hangul",
                "warning",
                f"stem 연속 한글 {db_glued}자 (원본 {source_glued}자)",
            )
        )

    if any(pattern.search(db_text) for pattern in FOOTER_PATTERNS):
        diff.issues.append(RepairIssue("ocr_footer", "warning", "페이지 footer 잡음"))

    if db_question.get("hasTable"):
        table = db_question.get("table") or ""
        if not table.strip():
            diff.issues.append(RepairIssue("table_empty", "critical", "hasTable but table empty"))
        else:
            lines = [line.strip() for line in table.splitlines() if line.strip()]
            has_md = "| ---" in table or "|---" in table.replace(" ", "")
            has_grid = len(lines) >= 2 and sum(
                1 for line in lines if len(re.split(r"\s{2,}|\t", line)) >= 2 or "\t" in line
            ) >= 2
            if not has_md and not has_grid:
                diff.issues.append(RepairIssue("table_markdown", "warning", "표 구조 손상"))

    return diff
