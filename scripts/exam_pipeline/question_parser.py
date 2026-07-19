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
from .text_postprocess import (
    format_question_text,
    normalize_exam_body,
    normalize_exam_symbols,
    remove_footer_noise,
)


@dataclass
class TableExtract:
    raw_lines: list[str]
    grid_text: str
    markdown: str


@dataclass
class ParsedQuestion:
    question_number: int
    question: str
    original_question: str
    choices: list[str]
    page: int
    table_markdown: str | None = None
    table_grid: str | None = None
    has_table: bool = False
    has_calculation: bool = False
    has_figure: bool = False
    question_type: str = "standard"
    issues: list[str] = field(default_factory=list)
    truncation_cause: str | None = None


def prepare_exam_text(text: str) -> str:
    return normalize_exam_symbols(text or "")


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


def _split_table_cells(line: str) -> list[str]:
    stripped = line.strip()
    if not stripped:
        return []
    if "\t" in stripped:
        return [cell.strip() for cell in stripped.split("\t") if cell.strip()]
    cells = re.split(r"\s{2,}|\t|(?<=\d)\s+(?=\D)|(?<=\D)\s+(?=\d)", stripped)
    cells = [cell.strip() for cell in cells if cell.strip()]
    if len(cells) >= 2:
        return cells
    if "|" in stripped:
        return [cell.strip() for cell in stripped.strip("|").split("|") if cell.strip()]
    return cells


def _rows_to_markdown(rows: list[list[str]]) -> str:
    if len(rows) < 2:
        return ""
    header = rows[0]
    lines = [
        "| " + " | ".join(header) + " |",
        "| " + " | ".join("---" for _ in header) + " |",
    ]
    for row in rows[1:]:
        padded = row + [""] * (len(header) - len(row))
        lines.append("| " + " | ".join(padded[: len(header)]) + " |")
    return "\n".join(lines)


def _rows_to_grid(rows: list[list[str]]) -> str:
    if not rows:
        return ""
    return "\n".join("\t".join(row) for row in rows)


QUESTION_PREFIX = re.compile(r"^\d{1,2}\.")
CHOICE_PREFIX = re.compile(r"^[①②③④⑤]")
WON_CELL = re.compile(r"^W[\d,]+(?:\.\d+)?$", re.I)
YEAR_TOKEN = re.compile(r"20[×xX]\d{1,2}")
BARE_W_PAIR = re.compile(r"^W[\d,]+,?\s*W[\d,]+$")
CHOICE_GRID_HEADER_LINE = re.compile(
    r"^(?:년\s*)?(?:20[×xX]\d{1,2}\s*년\s*){1,4}20[×xX]\d{1,2}\s*$"
)
TABLE_HEADER_KEYWORDS = (
    "차변",
    "대변",
    "구분",
    "일자",
    "적요",
    "예산",
    "실제",
    "단일금액",
    "정상연금",
    "액면가치",
    "시장이자율",
    "상환가치",
    "연금현재가치",
)


def _is_question_or_choice_line(line: str) -> bool:
    stripped = line.strip()
    return bool(QUESTION_PREFIX.match(stripped) or CHOICE_PREFIX.match(stripped))


def _is_table_header_line(line: str) -> bool:
    stripped = line.strip()
    if not stripped or stripped == "[TABLE]":
        return stripped == "[TABLE]"
    if _is_question_or_choice_line(stripped):
        return False
    if "?" in stripped or "？" in stripped:
        return False
    if CHOICE_GRID_HEADER_LINE.match(stripped.replace(" ", "")):
        return False
    if len(stripped) > 140 and not stripped.startswith("(차변)"):
        return False
    if stripped.startswith("(차변)") or stripped.startswith("(대변)"):
        return True
    cells = _split_table_cells(stripped)
    has_header_word = any(keyword in stripped for keyword in TABLE_HEADER_KEYWORDS)
    has_digits = bool(re.search(r"\d", stripped))
    numeric_grid = bool(re.search(r"\d+\.\d{3,4}", stripped))
    return (has_header_word and len(cells) >= 2) or (len(cells) >= 3 and has_digits) or numeric_grid


def _is_table_data_line(line: str, header_seen: bool) -> bool:
    stripped = line.strip()
    if not stripped or _is_question_or_choice_line(stripped):
        return False
    if stripped.startswith("(차변)") or stripped.startswith("(대변)"):
        return True
    cells = _split_table_cells(stripped)
    numeric_grid = bool(re.search(r"\d+\.\d{3,4}", stripped))
    if header_seen and numeric_grid:
        return True
    if header_seen and len(cells) >= 2 and re.search(r"\d", stripped):
        return True
    if header_seen and any(keyword in stripped for keyword in TABLE_KEYWORDS) and re.search(r"\d", stripped):
        return len(cells) >= 2
    return False


def detect_table_block(body: str) -> tuple[TableExtract | None, str]:
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

        if _is_question_or_choice_line(stripped):
            in_table = False
            other_lines.append(stripped)
            continue

        header_line = _is_table_header_line(stripped)
        is_table_line = (
            stripped == "[TABLE]"
            or header_line
            or (in_table and _is_table_data_line(stripped, table_header_seen))
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
        elif in_table and _is_table_data_line(stripped, table_header_seen):
            table_lines.append(stripped)
        elif in_table and table_header_seen:
            in_table = False
            other_lines.append(stripped)
        else:
            other_lines.append(stripped)

    if len(table_lines) < 1 or not table_header_seen:
        return None, body

    rows: list[list[str]] = []
    for line in table_lines:
        if not line.strip():
            continue
        cells = _split_table_cells(line)
        if len(cells) >= 2:
            rows.append(cells)
        elif len(cells) == 1 and rows:
            rows[-1].append(cells[0])

    if len(rows) < 2:
        raw_only = [line for line in table_lines if line.strip()]
        if len(raw_only) >= 2:
            extract = TableExtract(
                raw_lines=raw_only,
                grid_text="\n".join(raw_only),
                markdown=_rows_to_markdown([_split_table_cells(line) for line in raw_only if _split_table_cells(line)]),
            )
            cleaned_body = "\n".join(other_lines).strip()
            return extract, cleaned_body
        return None, body

    extract = TableExtract(
        raw_lines=[line for line in table_lines if line.strip()],
        grid_text=_rows_to_grid(rows),
        markdown=_rows_to_markdown(rows),
    )
    cleaned_body = "\n".join(other_lines).strip()
    return extract, cleaned_body


def strip_question_prefix(body: str) -> str:
    return re.sub(r"^\d{1,2}\.", "", body.strip(), count=1)


def find_first_choice_index(text: str) -> int | None:
    match = re.search(r"[①②③④⑤]", text)
    return match.start() if match else None


def trim_stem_before_choice_grid(stem: str) -> str:
    stem = stem.strip()
    if "?" in stem:
        qpos = stem.rfind("?")
        tail = stem[qpos + 1 :].strip()
        if tail and (YEAR_TOKEN.search(tail) or CHOICE_GRID_HEADER_LINE.match(tail.replace(" ", ""))):
            stem = stem[: qpos + 1].strip()
    stem = re.sub(
        r"(\?)\s*(?:년\s+(?:20[×xX]\d{1,2}\s*년\s*){2,4}20[×xX]\d{1,2}\s*)$",
        r"\1",
        stem,
        flags=re.I,
    )
    return stem.strip()


def _normalize_year_headers(source: str) -> str:
    return re.sub(
        r"(20[×xX]\d{1,2})\s+년",
        lambda m: f"{m.group(1).replace('x', '×').replace('X', '×')}년",
        source.replace("\n", " "),
    )


def _parse_choice_grid_headers(before: str) -> list[str]:
    header_source = _normalize_year_headers(before)
    header_matches = re.findall(
        r"년\s+(20[×xX]\d{1,2})년\s+(20[×xX]\d{1,2})년\s+(20[×xX]\d{1,2})년\s+(20[×xX]\d{1,2})",
        header_source,
    )
    if header_matches:
        first_year, second_year = header_matches[-1][:2]
        return [
            f"{first_year.replace('x', '×').replace('X', '×')}년",
            f"{second_year.replace('x', '×').replace('X', '×')}년",
        ]
    years = re.findall(r"20[×xX]\d{1,2}", before[-200:])
    unique: list[str] = []
    for year in years:
        normalized = year.replace("x", "×").replace("X", "×")
        if normalized not in unique:
            unique.append(normalized)
    if len(unique) >= 2:
        return [f"{y}년" for y in unique[:2]]
    return []


def _parse_ab_headers(before: str) -> list[str]:
    flat = before.replace("\n", " ")
    if re.search(r"\(A\).*?\(B\)", flat, re.I):
        return ["(A)", "(B)"]
    tail = flat[-120:]
    if tail.count("할인액") >= 2 and "처분손실" in tail:
        return ["할인액", "처분손실"]
    if tail.count("법인세비용") >= 1 and "이연법인세" in tail:
        return ["법인세비용", "이연법인세자산", "이연법인세부채"]
    return []


def _parse_multicolumn_headers(before: str) -> list[str]:
    year_headers = _parse_choice_grid_headers(before)
    if year_headers:
        return year_headers
    return _parse_ab_headers(before)


def _extract_won_amounts(text: str) -> list[str]:
    return re.findall(r"W[\d,]+", text or "")


def _format_multicolumn_choice(cells: list[str], headers: list[str]) -> str:
    cells = [normalize_whitespace(c) for c in cells if c.strip()]
    if len(cells) == 1:
        cell = cells[0]
        if re.search(r"[가-힣]{4,}", cell):
            return cell
        split_amounts = _extract_won_amounts(cell)
        if len(split_amounts) >= 2 and not re.search(r"[가-힣]{4,}", cell):
            cells = split_amounts[: len(headers) or len(split_amounts)]
    if len(headers) >= 3 and len(cells) >= 3:
        return ", ".join(f"{headers[i]} {cells[i]}" for i in range(3))
    if len(cells) >= 2 and len(headers) >= 2:
        return f"{headers[0]} {cells[0]}, {headers[1]} {cells[1]}"
    if len(cells) >= 2 and not any(re.search(r"[가-힣]{4,}", cell) for cell in cells):
        return f"{cells[0]}, {cells[1]}"
    if len(cells) >= 2:
        return normalize_whitespace(" ".join(cells))
    return cells[0] if cells else ""


def extract_multicolumn_circled_choices(body: str) -> list[str]:
    """Detect ① + next-line W values as multi-column choices without flattening newlines."""
    choice_idx = find_first_choice_index(body)
    if choice_idx is None:
        return []
    before = body[:choice_idx]
    tail = body[choice_idx:]
    headers = _parse_multicolumn_headers(before)
    lines = [line.strip() for line in tail.splitlines() if line.strip()]
    choices: list[str] = []
    index = 0
    while index < len(lines) and len(choices) < 5:
        line = lines[index]
        symbol_match = re.match(r"^([①②③④⑤])\s*(.*)$", line)
        if not symbol_match:
            index += 1
            continue
        _, first_cell = symbol_match.groups()
        cells = [first_cell.strip()] if first_cell.strip() else []
        next_index = index + 1
        if next_index < len(lines):
            nxt = lines[next_index]
            if (
                WON_CELL.match(nxt)
                and not CHOICE_PREFIX.match(nxt)
                and not re.match(r"^[①②③④⑤]", nxt)
            ):
                cells.append(nxt.strip())
                next_index += 1
        value = _format_multicolumn_choice(cells, headers)
        value = remove_footer_noise(value)
        if value:
            choices.append(value)
        index = next_index
    return choices[:5] if len(choices) == 5 else []


def _split_circled_choice_blocks(tail: str) -> list[tuple[str, list[str]]]:
    blocks: list[tuple[str, list[str]]] = []
    current_symbol: str | None = None
    current_parts: list[str] = []
    for raw in tail.splitlines():
        line = raw.strip()
        if not line:
            continue
        symbol_match = re.match(r"^([①②③④⑤])\s*(.*)$", line)
        if symbol_match:
            if current_symbol is not None:
                blocks.append((current_symbol, current_parts))
            current_symbol = symbol_match.group(1)
            current_parts = [symbol_match.group(2).strip()] if symbol_match.group(2).strip() else []
        elif current_symbol is not None:
            current_parts.append(line)
    if current_symbol is not None:
        blocks.append((current_symbol, current_parts))
    return blocks


def _finalize_circled_choice(parts: list[str], headers: list[str]) -> str:
    cleaned = [part.strip() for part in parts if part.strip()]
    if len(cleaned) >= 2 and WON_CELL.match(cleaned[1]):
        return _format_multicolumn_choice(cleaned, headers)
    return normalize_whitespace(" ".join(cleaned))


def _build_won_grid_table_from_body(body: str) -> TableExtract | None:
    choice_idx = find_first_choice_index(body)
    if choice_idx is None:
        return None
    headers = _parse_multicolumn_headers(body[:choice_idx])
    if len(headers) < 2:
        return None
    blocks = _split_circled_choice_blocks(body[choice_idx:])
    rows: list[list[str]] = [["", headers[0], headers[1]]]
    for symbol, parts in blocks[:5]:
        cells = [part.strip() for part in parts if part.strip()]
        if len(cells) >= 2 and WON_CELL.match(cells[1]):
            rows.append([symbol, cells[0], cells[1]])
        elif cells:
            rows.append([symbol, cells[0], ""])
    if len(rows) < 6:
        return None
    return TableExtract(
        raw_lines=[],
        grid_text=_rows_to_grid(rows),
        markdown=_rows_to_markdown(rows),
    )


def extract_choice_grid_won(body: str) -> tuple[list[str], TableExtract | None]:
    choice_idx = find_first_choice_index(body)
    if choice_idx is None:
        return [], None
    before = body[:choice_idx]
    tail = body[choice_idx:]
    headers = _parse_multicolumn_headers(before)
    if len(headers) < 2:
        years = re.findall(r"20[×xX]\d{1,2}", before[-160:])
        unique_years: list[str] = []
        for year in years:
            normalized = year.replace("x", "×").replace("X", "×")
            if normalized not in unique_years:
                unique_years.append(normalized)
        if len(unique_years) >= 2:
            headers = [f"{y}년" if y.endswith("년") else f"{y}년" for y in unique_years[:2]]
        else:
            return [], None

    rows: list[list[str]] = []
    choices: list[str] = []
    for symbol in CHOICE_SYMBOLS:
        pattern = (
            rf"{re.escape(symbol)}\s*"
            rf"(W[\d,]+(?:\.\d+)?)"
            rf"(?:\s*\n\s*(W[\d,]+(?:\.\d+)?))?"
        )
        match = re.search(pattern, tail)
        if not match:
            continue
        first = match.group(1)
        second = match.group(2)
        if second:
            rows.append([symbol, first, second])
            choices.append(f"{headers[0]} {first}, {headers[1]} {second}")
        else:
            rows.append([symbol, first])
            choices.append(first)

    if len(choices) != 5 or not rows or len(rows[0]) < 3:
        return [], None

    table_rows = [["", headers[0], headers[1]]] + rows
    table = TableExtract(
        raw_lines=[],
        grid_text=_rows_to_grid(table_rows),
        markdown=_rows_to_markdown(table_rows),
    )
    return choices, table


def extract_circled_choices(body: str) -> list[str]:
    """Extract ①–⑤ choices with newline-preserving block boundaries."""
    choice_idx = find_first_choice_index(body)
    if choice_idx is None:
        return []
    before = body[:choice_idx]
    tail = body[choice_idx:]
    headers = _parse_multicolumn_headers(before)
    blocks = _split_circled_choice_blocks(tail)
    if blocks:
        choices: list[str] = []
        for _, parts in blocks:
            value = _finalize_circled_choice(parts, headers)
            value = remove_footer_noise(value)
            if value and len(value) <= 600:
                choices.append(value)
        if len(choices) >= 5:
            return choices[:5]

    segment_lines = [line.strip() for line in tail.splitlines() if line.strip()]
    if len(segment_lines) == 1:
        flat = segment_lines[0]
        inline: list[str] = []
        for index, symbol in enumerate(CHOICE_SYMBOLS):
            next_symbols = "".join(re.escape(item) for item in CHOICE_SYMBOLS[index + 1 :])
            tail_pattern = rf"(?=\s*[{next_symbols}]|$)" if next_symbols else "$"
            pattern = rf"{re.escape(symbol)}\s*(.+?){tail_pattern}"
            match = re.search(pattern, flat)
            if not match:
                continue
            value = normalize_whitespace(match.group(1))
            value = remove_footer_noise(value)
            if value and len(value) <= 600:
                inline.append(value)
        if len(inline) >= 5:
            return inline[:5]

    return []


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
    choice_idx = find_first_choice_index(body)
    tail = body[choice_idx:] if choice_idx is not None else body
    parts = re.split(r"(?<=[.:])\s+", tail.replace("\n", " "))
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
    choice_idx = find_first_choice_index(body)
    before = body[:choice_idx] if choice_idx is not None else body
    headers = _parse_multicolumn_headers(before)
    choices: list[str] = []
    for line in body.splitlines():
        match = re.match(r"^\s*([①②③④⑤])\s*(.+)", line.strip())
        if not match:
            continue
        value = _format_multicolumn_choice([match.group(2).strip()], headers)
        value = remove_footer_noise(value)
        if "W" in value or re.search(r"\d{1,3}(?:,\d{3})+", value):
            choices.append(value)
    if len(choices) >= 5:
        return choices[:5]

    inline = re.findall(
        r"[①②③④⑤]\s*((?:W[\d,]+(?:\s*,?\s*)?)+)",
        body.replace("\n", " "),
    )
    parsed_inline = [
        _format_multicolumn_choice([item], headers) for item in inline if item.strip()
    ]
    if len(parsed_inline) >= 5:
        return [normalize_whitespace(item) for item in parsed_inline[:5]]
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
    grid_choices, _ = extract_choice_grid_won(body)
    if len(grid_choices) == 5:
        return grid_choices
    multi = extract_multicolumn_circled_choices(body)
    if len(multi) == 5:
        return multi
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


def _recover_short_w_choices(choices: list[str], body: str) -> list[str]:
    if len(choices) != 5 or not any(BARE_W_PAIR.match(str(c).strip()) for c in choices):
        return choices
    if sum(1 for c in choices if len(str(c)) > 25 and re.search(r"[가-힣]{4,}", str(c))) < 3:
        return choices
    choice_idx = find_first_choice_index(body)
    if choice_idx is None:
        return choices
    blocks = _split_circled_choice_blocks(body[choice_idx:])
    if len(blocks) != 5:
        return choices
    fixed: list[str] = []
    for (_, parts), current in zip(blocks, choices):
        candidate = remove_footer_noise(normalize_whitespace(" ".join(parts)))
        if BARE_W_PAIR.match(str(current).strip()) and len(candidate) > len(str(current)):
            fixed.append(candidate)
        else:
            fixed.append(str(current))
    return fixed


def resolve_choices_and_table(body: str, table: TableExtract | None) -> tuple[list[str], TableExtract | None]:
    grid_choices, grid_table = extract_choice_grid_won(body)
    if len(grid_choices) == 5 and grid_table:
        return _recover_short_w_choices(grid_choices, body), grid_table
    multi_choices = extract_multicolumn_circled_choices(body)
    if len(multi_choices) == 5:
        multi_table = _build_won_grid_table_from_body(body)
        if multi_table:
            return _recover_short_w_choices(multi_choices, body), multi_table
        return _recover_short_w_choices(multi_choices, body), table
    return _recover_short_w_choices(extract_choices(body), body), table


def remove_table_from_text(text: str, table: TableExtract | None) -> str:
    if not table:
        return text
    cleaned = text
    for line in table.raw_lines:
        cleaned = cleaned.replace(line, "")
    for payload in (table.markdown, table.grid_text):
        if not payload:
            continue
        cleaned = cleaned.replace(payload, "")
        for line in payload.splitlines():
            cleaned = cleaned.replace(line, "")
    return cleaned


def extract_stem(body: str, table: TableExtract | None) -> str:
    def _stem_from(text: str) -> str:
        cleaned = strip_question_prefix(text)
        cleaned = cleaned.replace("[TABLE]", "").replace("[FIGURE]", "")
        cleaned = remove_table_from_text(cleaned, table)
        cleaned = remove_footer_noise(cleaned)
        choice_idx = find_first_choice_index(cleaned)
        stem_raw = cleaned[:choice_idx] if choice_idx is not None else cleaned
        return format_question_text(stem_raw)

    stem = _stem_from(body)
    if not stem.strip() and table:
        stem = _stem_from(body.replace("\n", " "))
    return trim_stem_before_choice_grid(stem)


def build_original_question(stem: str, table: TableExtract | None) -> str:
    parts = [stem]
    if table and table.markdown:
        parts.extend(["", table.markdown.strip()])
    return "\n".join(part for part in parts if part).strip()


def classify_truncation_cause(body: str, stem: str, choices: list[str], table: TableExtract | None) -> str | None:
    if not body.strip():
        return "question_end_fail"
    if len(choices) != 5:
        return "choice_start_fail"
    choice_idx = find_first_choice_index(body)
    if choice_idx is None:
        return "choice_start_fail"
    before = body[:choice_idx]
    before_norm = re.sub(r"\s+", "", before)
    stem_norm = re.sub(r"\s+", "", stem)
    if not stem_norm:
        return "linebreak_handling"
    coverage = len(stem_norm) / max(len(before_norm), 1)
    if coverage >= 0.75:
        return None
    if table and len(stem_norm) < len(re.sub(r"\s+", "", remove_table_from_text(before, table))) * 0.6:
        return "table_handling"
    if "\n" in before and coverage < 0.55:
        return "linebreak_handling"
    old_last_q = re.findall(r"[^?\n]+\?", before)
    if old_last_q and stem_norm.endswith(re.sub(r"\s+", "", old_last_q[-1])) and coverage < 0.55:
        return "question_end_fail"
    if coverage < 0.55:
        return "question_end_fail"
    return None


def classify_question_type(body: str, table: TableExtract | None, choices: list[str]) -> str:
    if table and any(key in body for key in ("액면가치", "시장이자율", "상환가치")):
        return "table-bond"
    if table:
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
                    truncation_cause="question_end_fail",
                )
            )
            continue

        body = remove_footer_noise(body)
        table_extract, cleaned_body = detect_table_block(body)
        working_body = normalize_exam_body(cleaned_body if table_extract else body)
        choices, table_extract = resolve_choices_and_table(working_body, table_extract)
        stem = extract_stem(working_body, table_extract)
        original_question = build_original_question(stem, table_extract)
        offset = markers.get(number, 0)
        page = page_for_offset(page_offsets, acc_start + offset)
        truncation_cause = classify_truncation_cause(body, stem, choices, table_extract)

        issues: list[str] = []
        if not stem:
            issues.append(f"{number}번 question 누락")
        if len(choices) != 5:
            issues.append(f"{number}번 보기 {len(choices)}개")
        if truncation_cause:
            issues.append(f"{number}번 stem coverage ({truncation_cause})")

        qtype = classify_question_type(body, table_extract, choices)
        results.append(
            ParsedQuestion(
                question_number=number,
                question=stem,
                original_question=original_question,
                choices=choices,
                page=page,
                table_markdown=table_extract.markdown if table_extract else None,
                table_grid=table_extract.grid_text if table_extract else None,
                has_table=bool(table_extract),
                has_calculation=any(k in body for k in CALC_KEYWORDS),
                has_figure="[FIGURE]" in body,
                question_type=qtype,
                issues=issues,
                truncation_cause=truncation_cause,
            )
        )
    return results
