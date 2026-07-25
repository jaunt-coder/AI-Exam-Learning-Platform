"""Snapshot builders for the regression harness.

- build_source_snapshot: segments source/original-exams/ into per-question raw
  bodies (frozen, parser-independent segmentation). Only load_exam_document is
  reused (raw extraction of PDF/HWP/OCR).
- load_parser_snapshot: reads the current parser output (question-db-mvp.json).
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "scripts"))

from exam_pipeline.source_loader import load_exam_document  # noqa: E402

from .tokens import (  # noqa: E402
    choice_marker_count,
    extract_numbers,
    extract_units,
    normalize_symbols,
)

CACHE_DIR = ROOT / "data" / "analysis" / "ocr-cache"
QUESTION_DB = ROOT / "data" / "question-db-mvp.json"

ACC_START = 41
ACC_END = 80
MVP_YEARS = [2015, 2017, 2018, 2020, 2024, 2025]

_MARKER_RE = re.compile(r"(?<![\d.])(4[1-9]|[1-6]\d|7[0-9]|80)\.(?!\d)")
_FIRST_41 = re.compile(r"(?<![\d.])41\.(?!\d)")
_FOOTER_RES = [
    re.compile(r"\n?\s*A-\d{2}-\d{1,2}(?:-\[\d교시\])?\s*", re.I),
    re.compile(r"\n?\s*교시\s*-\[\s*\d\s*\]\s*", re.I),
    re.compile(r"\n?\s*한국산업[^\n]*", re.I),
    re.compile(r"\n?\s*page\s*\(\s*\d+\s*\)\s*", re.I),
    re.compile(r"\n?\s*제\d+회[^\n]*A-\d{2}-\d{1,2}\s*", re.I),
    re.compile(r"\n?\s*청렴한감정평가[^\n]*", re.I),
]
_QNUM_PREFIX = re.compile(r"^\d{1,2}\.")


def _find_accounting_start(text: str) -> int:
    marker = text.find("회계학")
    if marker >= 0:
        return marker
    match = _FIRST_41.search(text)
    return match.start() if match else 0


def _collect_markers(text: str) -> dict[int, int]:
    first = _FIRST_41.search(text)
    if not first:
        return {}
    scoped = text[first.start():]
    base = first.start()
    markers: dict[int, int] = {}
    for match in _MARKER_RE.finditer(scoped):
        number = int(match.group(1))
        if ACC_START <= number <= ACC_END and number not in markers:
            markers[number] = base + match.start()
    return markers


def _fill_missing(markers: dict[int, int]) -> dict[int, int]:
    if not markers:
        return markers
    filled = dict(markers)
    ordered = sorted(filled)
    for number in range(ACC_START, ACC_END + 1):
        if number in filled:
            continue
        prev_nums = [n for n in ordered if n < number]
        next_nums = [n for n in ordered if n > number]
        if not prev_nums or not next_nums:
            continue
        prev_num, next_num = prev_nums[-1], next_nums[0]
        if next_num - prev_num <= 3:
            prev_pos, next_pos = filled[prev_num], filled[next_num]
            filled[number] = prev_pos + int(
                (next_pos - prev_pos) * (number - prev_num) / (next_num - prev_num)
            )
    return filled


def _split_bodies(text: str, markers: dict[int, int]) -> dict[int, str]:
    ordered = sorted(markers.items(), key=lambda item: item[1])
    bodies: dict[int, str] = {}
    for index, (number, start) in enumerate(ordered):
        end = ordered[index + 1][1] if index + 1 < len(ordered) else len(text)
        bodies[number] = text[start:end].strip()
    return bodies


def _page_offsets(pages: list[str]) -> list[tuple[int, int]]:
    offsets: list[tuple[int, int]] = []
    pos = 0
    for index, page in enumerate(pages, 1):
        offsets.append((index, pos))
        pos += len(page) + 1
    return offsets


def _page_for_offset(offsets: list[tuple[int, int]], offset: int) -> int:
    page = 1
    for page_num, start in offsets:
        if start <= offset:
            page = page_num
    return page


def _clean_body(raw: str) -> str:
    value = normalize_symbols(raw or "")
    for pattern in _FOOTER_RES:
        value = pattern.sub("", value)
    value = _QNUM_PREFIX.sub("", value.strip(), count=1)
    return value.strip()


def build_source_snapshot(years: list[int] | None = None) -> dict:
    years = years or MVP_YEARS
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    snapshot: dict = {"years": {}, "questions": {}}

    for year in years:
        doc = load_exam_document(year, CACHE_DIR)
        text = normalize_symbols(doc.text)
        pages = [normalize_symbols(page) for page in doc.pages]
        acc_start = _find_accounting_start(text)
        scoped = text[acc_start:]
        markers = _fill_missing(_collect_markers(scoped))
        bodies = _split_bodies(scoped, markers)
        offsets = _page_offsets(pages)
        rel_source = f"source/original-exams/{doc.source_path.name}"

        snapshot["years"][str(year)] = {
            "sourceFile": rel_source,
            "sourceKind": doc.source_kind,
            "usedOcr": doc.used_ocr,
            "markersFound": len(markers),
        }

        for number in range(ACC_START, ACC_END + 1):
            raw_body = bodies.get(number, "")
            clean = _clean_body(raw_body)
            offset = markers.get(number, 0)
            key = f"{year}:{number}"
            snapshot["questions"][key] = {
                "key": key,
                "year": year,
                "number": number,
                "body": clean,
                "page": _page_for_offset(offsets, acc_start + offset),
                "sourceFile": rel_source,
                "sourceKind": doc.source_kind,
                "usedOcr": doc.used_ocr,
                "markerCount": choice_marker_count(raw_body),
                "numbers": sorted(extract_numbers(clean)),
                "units": sorted(extract_units(clean)),
            }
    return snapshot


def load_parser_snapshot(years: list[int] | None = None) -> dict:
    years = set(years or MVP_YEARS)
    payload = json.loads(QUESTION_DB.read_text(encoding="utf-8"))
    records: dict = {}
    for question in payload.get("questions", []):
        year = question.get("year")
        number = (question.get("source") or {}).get("questionNumber")
        if year not in years or number is None:
            continue
        key = f"{year}:{number}"
        records[key] = {
            "key": key,
            "questionId": question.get("questionId"),
            "year": year,
            "number": number,
            "question": question.get("question") or "",
            "originalQuestion": question.get("originalQuestion") or "",
            "choices": question.get("choices") or [],
            "table": question.get("table") or "",
            "hasTable": bool(question.get("hasTable")),
            "answer": question.get("answer"),
            "questionType": question.get("questionType"),
        }
    return {
        "source": "data/question-db-mvp.json",
        "version": payload.get("version"),
        "generatedAt": payload.get("generatedAt"),
        "questions": records,
    }
