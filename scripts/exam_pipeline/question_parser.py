from __future__ import annotations

import re
from dataclasses import dataclass, field

from .constants import (
    ACC_END,
    ACC_START,
    CALC_KEYWORDS,
    CHOICE_SYMBOLS,
    SUBJECT_ACC,
    TABLE_KEYWORDS,
)


@dataclass
class ParsedQuestion:
    question_number: int
    question: str
    original_question: str
    choices: list[str]
    page: int
    table_markdown: str | None = None
    has_table: bool = False
    has_calculation: bool = False
    has_figure: bool = False
    question_type: str = "standard"
    issues: list[str] = field(default_factory=list)


OCR_QNUM_FIXES = {
    "AA.": "44.",
    "4A.": "44.",
    "A4.": "44.",
}


def prepare_exam_text(text: str) -> str:
    prepared = text
    for old, new in OCR_QNUM_FIXES.items():
        prepared = prepared.replace(old, new)
    prepared = prepared.replace("￦", "W").replace("₩", "W")
    prepared = re.sub(r"(?<=[\?？\s])#(?=\s*[0-9W])", "①", prepared)
    prepared = re.sub(r"(?<=[\s])#(?=[0-9W])", "②", prepared)  # weak fallback
    return prepared


def normalize_whitespace(value: str) -> str:
    return re.sub(r"[ \t]+", " ", value.replace("\u0000", " ").strip())


def find_accounting_start(text: str) -> int:
    marker = text.find(SUBJECT_ACC)
    if marker >= 0:
        return marker
    match = re.search(r"(?<![\d.])41\.(?!\d)", text)
    return match.start() if match else 0


def collect_question_markers(text: str, start_num: int, end_num: int) -> dict[int, int]:
    first = re.search(rf"(?<![\d.]){start_num}\.(?!\d)", text)
    if not first:
        return {}
    scoped = text[first.start() :]
    base = first.start()
    markers: dict[int, int] = {}
    for match in re.finditer(r"(?<![\d.])(4[1-9]|[1-6]\d|7[0-9]|80)\.(?!\d)", scoped):
        number = int(match.group(1))
        if start_num <= number <= end_num and number not in markers:
            markers[number] = base + match.start()
    return markers


def split_question_bodies(text: str, markers: dict[int, int]) -> dict[int, str]:
    ordered = sorted(markers.items(), key=lambda item: item[1])
    bodies: dict[int, str] = {}
    for index, (number, start) in enumerate(ordered):
        end = ordered[index + 1][1] if index + 1 < len(ordered) else len(text)
        bodies[number] = text[start:end].strip()
    return bodies


def page_for_offset(page_offsets: list[tuple[int, int]], offset: int) -> int:
    page = 1
    for page_num, start in page_offsets:
        if start <= offset:
            page = page_num
    return page


def build_page_offsets(pages: list[str]) -> list[tuple[int, int]]:
    offsets: list[tuple[int, int]] = []
    pos = 0
    for index, page in enumerate(pages, 1):
        offsets.append((index, pos))
        pos += len(page) + 1
    return offsets


def detect_table_block(body: str) -> tuple[str | None, str]:
    lines = body.splitlines()
    table_lines: list[str] = []
    other_lines: list[str] = []
    in_table = False
    table_header_seen = False

    for line in lines:
        stripped = line.strip()
        if not stripped:
            if in_table:
                table_lines.append("")
            else:
                other_lines.append("")
            continue

        header_line = any(keyword in stripped for keyword in ("기간", "단일금액", "정상연금", "차변", "대변", "구분", "일자", "적요"))
        numeric_grid = bool(re.search(r"\d+\.\d{3,4}", stripped))
        is_table_line = (
            stripped == "[TABLE]"
            or (header_line and not stripped.startswith("①"))
            or (in_table and numeric_grid and not stripped.startswith("①"))
            or (
                table_header_seen
                and not stripped.startswith("①")
                and any(keyword in stripped for keyword in TABLE_KEYWORDS)
                and re.search(r"\d", stripped)
            )
        )

        if header_line and not stripped.startswith("①"):
            table_header_seen = True

        if is_table_line:
            in_table = True
            if stripped != "[TABLE]":
                table_lines.append(stripped)
        elif in_table and re.match(r"^[①②③④⑤]", stripped):
            in_table = False
            other_lines.append(stripped)
        elif in_table and header_line:
            table_lines.append(stripped)
        elif in_table and numeric_grid:
            table_lines.append(stripped)
        elif in_table and table_header_seen:
            in_table = False
            other_lines.append(stripped)
        else:
            other_lines.append(stripped)

    if len(table_lines) < 2 or not table_header_seen:
        return None, body

    rows: list[list[str]] = []
    for line in table_lines:
        if not line.strip():
            continue
        cells = re.split(r"\s{2,}|\t|(?<=\d)\s+(?=\D)|(?<=\D)\s+(?=\d)", line.strip())
        cells = [cell.strip() for cell in cells if cell.strip()]
        if len(cells) >= 2:
            rows.append(cells)
        elif len(cells) == 1 and rows:
            rows[-1].append(cells[0])

    if len(rows) < 2:
        return None, body

    header = rows[0]
    markdown = "| " + " | ".join(header) + " |\n"
    markdown += "| " + " | ".join("---" for _ in header) + " |\n"
    for row in rows[1:]:
        padded = row + [""] * (len(header) - len(row))
        markdown += "| " + " | ".join(padded[: len(header)]) + " |\n"

    cleaned_body = "\n".join(other_lines).strip()
    return markdown, cleaned_body


def extract_circled_choices(body: str) -> list[str]:
    flat = body.replace("\n", " ")
    choices: list[str] = []
    for index, symbol in enumerate(CHOICE_SYMBOLS):
        next_symbols = "".join(re.escape(item) for item in CHOICE_SYMBOLS[index + 1 :])
        tail = rf"(?=\s*[{next_symbols}]|\?|$)" if next_symbols else "$"
        pattern = rf"{re.escape(symbol)}\s*(.+?){tail}"
        match = re.search(pattern, flat, re.DOTALL)
        if not match:
            continue
        value = normalize_whitespace(match.group(1))
        if value and len(value) <= 600:
            choices.append(value)
    if len(choices) >= 5:
        return choices[:5]

    for line in body.splitlines():
        match = re.match(r"^\s*([①②③④⑤])\s*(.+)", line.strip())
        if match:
            choices.append(normalize_whitespace(match.group(2)))
    return choices[:5]


def fill_missing_markers(markers: dict[int, int], start_num: int, end_num: int) -> dict[int, int]:
    if not markers:
        return markers
    filled = dict(markers)
    ordered = sorted(filled)
    for number in range(start_num, end_num + 1):
        if number in filled:
            continue
        prev_nums = [n for n in ordered if n < number]
        next_nums = [n for n in ordered if n > number]
        if not prev_nums or not next_nums:
            continue
        prev_num = prev_nums[-1]
        next_num = next_nums[0]
        if next_num - prev_num <= 3 and prev_num in filled and next_num in filled:
            prev_pos = filled[prev_num]
            next_pos = filled[next_num]
            filled[number] = prev_pos + int((next_pos - prev_pos) * (number - prev_num) / (next_num - prev_num))
    return filled


def extract_hash_choices(body: str) -> list[str]:
    items = re.findall(r"#\s*([^#]{1,220}?)(?=\s*#|$)", body.replace("\n", " "))
    choices = [normalize_whitespace(item.strip(" .")) for item in items if item.strip()]
    return choices[:5]


def extract_statement_choices(body: str) -> list[str]:
    match = re.search(r"[?？]\s*(.+)$", body, re.DOTALL)
    if not match:
        return []
    tail = match.group(1)
    parts = re.split(r"(?<=[.:])\s+", tail)
    choices = [normalize_whitespace(part.strip(" .:")) for part in parts if len(part.strip(" .:")) >= 8]
    if len(choices) >= 5:
        return choices[:5]
    return []


def extract_ocr_combo_choices(body: str) -> list[str]:
    flat = normalize_whitespace(body)
    match = re.search(r"[?？]\s*(?:\([^)]*\))?\s*(.+)$", flat)
    if not match:
        return []
    tail = match.group(1)
    combo_match = re.search(
        r"([①②③④⑤\s]*(?:[ㄱ-ㅎㅁ]|그|L|드|근|I|II|H)[^①②③④⑤]{0,120}){3,}",
        tail,
    )
    if not combo_match:
        return []
    items = re.findall(r"[①②③④⑤]?\s*([ㄱ-ㅎㅁ]|그|L|드|근|I|II|H)[^①②③④⑤]{0,120}", tail)
    return [normalize_whitespace(item) for item in items[:5]]


def extract_hangul_combo_choices(body: str) -> list[str]:
    ocr = extract_ocr_combo_choices(body)
    if len(ocr) == 5:
        return ocr
    flat = normalize_whitespace(body)
    match = re.search(r"[?？]\s*(?:\([^)]*\))?\s*(.+)$", flat)
    if not match:
        return []
    tail = match.group(1)
    items = re.findall(r"[①②③④⑤]\s*([ㄱ-ㅎㅁ][^①②③④⑤]{0,120})", tail)
    return [normalize_whitespace(item) for item in items[:5]]


def extract_won_choices(body: str) -> list[str]:
    choices: list[str] = []
    for line in body.splitlines():
        match = re.match(r"^\s*([①②③④⑤])\s*(.+)", line.strip())
        if not match:
            continue
        value = normalize_whitespace(match.group(2))
        if "￦" in value or re.search(r"\d{1,3}(?:,\d{3})+", value):
            choices.append(value)
    if len(choices) >= 5:
        return choices[:5]

    inline = re.findall(
        r"[①②③④⑤]\s*(￦[\d,]+(?:\.\d+)?|[\d,]+(?:\.\d+)?)",
        body.replace("\n", " "),
    )
    if len(inline) >= 5:
        return [normalize_whitespace(item) for item in inline[:5]]
    return []


def extract_bond_table_choices(body: str) -> list[str]:
    won_choices = extract_won_choices(body)
    if len(won_choices) == 5:
        return won_choices

    if not any(key in body for key in ("액면가치", "시장이자율", "상환가치", "연금현재가치", "내재이자율", "단일금액")):
        return []
    percents = re.findall(r"\d+(?:\.\d+)?%", body)
    decimals = re.findall(r"\d+\.\d{2,4}", body)
    if len(percents) >= 8 and len(decimals) >= 4:
        rows = []
        chunk = max(1, len(decimals) // 5)
        for index in range(0, min(len(decimals), chunk * 5), chunk):
            part = decimals[index : index + chunk]
            if part:
                rows.append(" / ".join(part))
        if len(rows) >= 5:
            return rows[:5]
    return []


def extract_choices(body: str) -> list[str]:
    for extractor in (
        extract_circled_choices,
        extract_won_choices,
        extract_hash_choices,
        extract_hangul_combo_choices,
        extract_statement_choices,
        extract_bond_table_choices,
    ):
        choices = extractor(body)
        if len(choices) == 5:
            return choices
    return extract_circled_choices(body)


def extract_stem(body: str, table_md: str | None) -> str:
    cleaned = re.sub(r"^\d{1,2}\.", "", body.strip(), count=1)
    cleaned = cleaned.replace("[TABLE]", "").replace("[FIGURE]", "")
    if table_md:
        for line in table_md.splitlines():
            cleaned = cleaned.replace(line, "")
    match = re.search(rf"^(.+?)(?=[{''.join(re.escape(s) for s in CHOICE_SYMBOLS)}])", cleaned, re.DOTALL)
    stem = match.group(1).strip() if match else cleaned
    stems = re.findall(r"[^?\n]+\?", stem)
    if stems:
        stem = stems[-1].strip()
    elif not stem.strip():
        before_choices = re.split(r"[①②③④⑤]", cleaned, maxsplit=1)[0]
        stem = before_choices.strip()
    return normalize_whitespace(stem)


def classify_question_type(body: str, table_md: str | None, choices: list[str]) -> str:
    if table_md and any(key in body for key in ("액면가치", "시장이자율", "상환가치")):
        return "table-bond"
    if table_md:
        return "table"
    if any("ㄱ" in choice or "ㄴ" in choice for choice in choices):
        return "hangul-combo"
    if any(keyword in body for keyword in CALC_KEYWORDS):
        return "calculation"
    return "standard"


def parse_accounting_questions(full_text: str, pages: list[str]) -> list[ParsedQuestion]:
    full_text = prepare_exam_text(full_text)
    pages = [prepare_exam_text(page) for page in pages]
    acc_start = find_accounting_start(full_text)
    scoped = full_text[acc_start:]
    markers = collect_question_markers(scoped, ACC_START, ACC_END)
    markers = fill_missing_markers(markers, ACC_START, ACC_END)
    bodies = split_question_bodies(scoped, markers)
    page_offsets = build_page_offsets(pages)
    results: list[ParsedQuestion] = []

    for number in range(ACC_START, ACC_END + 1):
        body = bodies.get(number, "")
        if not body:
            results.append(
                ParsedQuestion(
                    question_number=number,
                    question="",
                    original_question="",
                    choices=[],
                    page=1,
                    issues=[f"{number}번 본문 누락"],
                )
            )
            continue

        table_md, cleaned_body = detect_table_block(body)
        choices = extract_choices(body)
        stem = extract_stem(cleaned_body, table_md)
        original_parts = [body.strip()]
        if table_md:
            original_parts = [stem, "", table_md.strip()]
        original_question = "\n".join(part for part in original_parts if part).strip()
        offset = markers.get(number, 0)
        page = page_for_offset(page_offsets, acc_start + offset)

        issues: list[str] = []
        if not stem:
            issues.append(f"{number}번 question 누락")
        if len(choices) != 5:
            issues.append(f"{number}번 보기 {len(choices)}개")

        qtype = classify_question_type(body, table_md, choices)
        results.append(
            ParsedQuestion(
                question_number=number,
                question=stem,
                original_question=original_question,
                choices=choices,
                page=page,
                table_markdown=table_md,
                has_table=bool(table_md),
                has_calculation=any(k in body for k in CALC_KEYWORDS),
                has_figure="[FIGURE]" in body,
                question_type=qtype,
                issues=issues,
            )
        )
    return results
