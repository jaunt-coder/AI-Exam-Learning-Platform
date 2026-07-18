from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

import fitz

from .constants import ACC_END, ACC_START, ANSWERS_DIR, CACHE_DIR, EXPECTED_ACC_COUNT, SOURCE_DIR

EXAM_SUFFIXES = {".pdf", ".hwp"}
ANSWER_SUFFIXES = {".json", ".pdf", ".hwp"}
YEAR_PATTERN = re.compile(r"^(19|20)\d{2}$")


@dataclass
class ExamSourceInfo:
    year: int
    path: Path | None
    kind: str | None
    exists: bool


@dataclass
class AnswerSourceInfo:
    year: int
    json_path: Path | None
    source_path: Path | None
    source_kind: str | None
    json_count: int


def _parse_year_from_stem(stem: str) -> int | None:
    if YEAR_PATTERN.match(stem):
        return int(stem)
    match = re.search(r"(19|20)\d{2}", stem)
    return int(match.group(0)) if match else None


def discover_exam_years(source_dir: Path | None = None) -> list[int]:
    source_dir = source_dir or SOURCE_DIR
    years: set[int] = set()
    if not source_dir.exists():
        return []
    for path in source_dir.iterdir():
        if not path.is_file() or path.suffix.lower() not in EXAM_SUFFIXES:
            continue
        year = _parse_year_from_stem(path.stem)
        if year is not None:
            years.add(year)
    return sorted(years)


def discover_answer_years(answers_dir: Path | None = None) -> list[int]:
    answers_dir = answers_dir or ANSWERS_DIR
    years: set[int] = set()
    if not answers_dir.exists():
        return []
    for path in answers_dir.iterdir():
        if not path.is_file() or path.suffix.lower() not in ANSWER_SUFFIXES:
            continue
        year = _parse_year_from_stem(path.stem)
        if year is None:
            year = next((int(token) for token in re.findall(r"(19|20)\d{2}", path.stem)), None)
        if year is not None:
            years.add(year)
    return sorted(years)


def discover_all_years(
    source_dir: Path | None = None,
    answers_dir: Path | None = None,
    min_year: int = 2010,
) -> list[int]:
    exam_years = set(discover_exam_years(source_dir))
    answer_years = set(discover_answer_years(answers_dir))
    return sorted(year for year in (exam_years | answer_years) if year >= min_year)


def resolve_exam_source_for_year(year: int, source_dir: Path | None = None) -> ExamSourceInfo:
    source_dir = source_dir or SOURCE_DIR
    hwp = source_dir / f"{year}.hwp"
    pdf = source_dir / f"{year}.pdf"
    if hwp.exists():
        return ExamSourceInfo(year=year, path=hwp, kind="hwp", exists=True)
    if pdf.exists():
        return ExamSourceInfo(year=year, path=pdf, kind="pdf", exists=True)
    return ExamSourceInfo(year=year, path=None, kind=None, exists=False)


def resolve_answer_sources_for_year(year: int, answers_dir: Path | None = None) -> AnswerSourceInfo:
    answers_dir = answers_dir or ANSWERS_DIR
    json_path = answers_dir / f"{year}.json"
    json_count = 0
    if json_path.exists():
        try:
            import json

            payload = json.loads(json_path.read_text(encoding="utf-8"))
            json_count = sum(
                1
                for key, value in payload.items()
                if not str(key).startswith("_")
                and ACC_START <= int(key) <= ACC_END
                and value is not None
            )
        except (OSError, ValueError, json.JSONDecodeError):
            json_count = 0

    candidates: list[Path] = []
    for path in answers_dir.iterdir():
        if not path.is_file():
            continue
        if path.suffix.lower() not in {".pdf", ".hwp"}:
            continue
        if str(year) in path.name:
            candidates.append(path)

    source_path = candidates[0] if candidates else None
    source_kind = source_path.suffix.lower().lstrip(".") if source_path else None
    return AnswerSourceInfo(
        year=year,
        json_path=json_path if json_path.exists() else None,
        source_path=source_path,
        source_kind=source_kind,
        json_count=json_count,
    )


def pdf_has_text_layer(path: Path, min_chars: int = 800) -> bool:
    doc = fitz.open(str(path))
    text = "".join((page.get_text() or "") for page in doc)
    doc.close()
    return len(text.strip()) >= min_chars


def hwp_extract_status(path: Path) -> tuple[str, str | None]:
    try:
        from hwp5.filestructure import Hwp5File

        hwp = Hwp5File(str(path))
        distributable = bool(getattr(hwp.header.flags, "distributable", 0))
        if distributable:
            preview = ""
            try:
                preview = hwp.preview_text.open().read().decode("utf-16le", errors="replace")
            except OSError:
                preview = ""
            if "회계학" in preview or re.search(r"(?<![\d.])41\.(?!\d)", preview):
                return "preview", None
            return "blocked", "배포용 HWP — 본문 추출 불가"
        return "text", None
    except Exception as exc:
        return "error", str(exc)


def find_ocr_cache_file(path: Path, cache_dir: Path | None = None) -> Path | None:
    cache_dir = cache_dir or CACHE_DIR
    if not cache_dir.exists():
        return None
    stem = path.stem
    matches = sorted(cache_dir.glob(f"{stem}-*.txt"))
    return matches[0] if matches else None
