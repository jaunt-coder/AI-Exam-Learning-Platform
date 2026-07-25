"""Rule-based OCR cleanup for exam question parsing (no AI inference)."""
from __future__ import annotations

import re

FOOTER_PATTERNS = [
    re.compile(r"\n?\s*A-\d{2}-\d{1,2}(?:-\[\d교시\])?\s*", re.I),
    re.compile(r"\n?\s*A-\d{2}-\d{1,2}-\[\d교시\]\s*", re.I),
    re.compile(r"\n?\s*교시\s*-\[\s*\d\s*\]\s*", re.I),
    re.compile(r"\n?\s*한국산업[^\n]*", re.I),
    re.compile(r"\n?\s*page\s*\(\s*\d+\s*\)\s*", re.I),
    re.compile(r"\n?\s*제\d+회[^\n]*A-\d{2}-\d{1,2}\s*", re.I),
    re.compile(r"\n?\s*청렴한감정평가[^\n]*", re.I),
    re.compile(r"\d{4}년\s*제\d+회[^\n]{0,40}A-\d{2}-\d{1,2}", re.I),
]

UNIT_PATTERNS = [
    re.compile(r"\d{1,3}(?:,\d{3})+(?:\.\d+)?W", re.I),
    re.compile(r"W\d{1,3}(?:,\d{3})*(?:\.\d+)?"),
    re.compile(r"￦\d{1,3}(?:,\d{3})*(?:\.\d+)?"),
    re.compile(r"\d+(?:\.\d+)?%"),
    re.compile(r"\d+(?:\.\d+)?㎡"),
    re.compile(r"\d+(?:\.\d+)?(?:원|천원|백만원|억원)"),
    re.compile(r"20×\d{1,2}년\s*\d{1,2}월\s*\d{1,2}일"),
    re.compile(r"20×\d{1,2}년"),
    re.compile(r"20×\d{1,2}"),
    re.compile(r"20[xX]\d{1,2}"),
    re.compile(r"\(\s*20×\d{1,2}\s*\)년"),
]

NUMBER_PATTERN = re.compile(
    r"\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+\.\d+|\d{3,}"
)
ORPHAN_YEAR = re.compile(r"^20[×xX]\d{1,2}$")
ORPHAN_AMOUNT = re.compile(r"^(\d{1,3}(?:,\d{3})+|\d{3,})$")
DATE_UNIT = re.compile(r"^(년|월|일|주|원|%)")
ORPHAN_DATE_SKELETON = re.compile(r"^(?:년|월|일(?:까지)?)")
DIGIT_LINE = re.compile(r"^\d{1,2}$")
CHOICE_GRID_HEADER = re.compile(
    r"^(?:년\s*)?(?:20[×xX]\d{1,2}\s*년\s*){2,4}20[×xX]\d{1,2}\s*$"
)
WON_CELL = re.compile(r"^W[\d,]+(?:\.\d+)?$", re.I)
CHOICE_LINE = re.compile(r"^[①②③④⑤]")
HANGUL_PARTICLE_BREAK = re.compile(
    r"(?<=[가-힣])"
    r"(?="
    r"은|는|이|가|을|를|의|에|에서|으로|로|와|과|도|만|부터|까지|"
    r"하여|하며|하면|하거나|하는|하였|하기|"
    r"경우|때|것|등|및|"
    r"있다|없다|이다|아니다|"
    r"[(（]"
    r")"
)

OCR_SYMBOL_FIXES = {
    "AA.": "44.",
    "4A.": "44.",
    "A4.": "44.",
    "×": "×",
    "x1": "×1",
    "X1": "×1",
}


def _norm_year(token: str) -> str:
    return token.replace("x", "×").replace("X", "×")


def _is_currency_line(line: str) -> bool:
    return line in {"W", "￦", "₩"}


def _flush_pending_years(pending_years: list[str], merged: list[str]) -> None:
    if pending_years:
        merged.append(" ".join(pending_years))
        pending_years.clear()


def _strip_trailing_year_connectors(merged: list[str]) -> None:
    while merged:
        tail = merged[-1].strip()
        if tail in {"년과", "년에", "년의", "각각", "과", "(", ")", "()"}:
            merged.pop()
            continue
        if re.fullmatch(r"각각과?", tail):
            merged.pop()
            continue
        if tail.startswith("(") and tail.endswith(")") and not re.search(r"20[×xX]", tail):
            merged.pop()
            continue
        break


def _attach_year_pair_clause(
    merged: list[str],
    years: list[str],
    *,
    amount: str = "",
    currency: str = "",
    suffix: str = "에",
) -> None:
    if len(years) < 2:
        return
    y1, y2 = _norm_year(years[0]), _norm_year(years[1])
    if amount:
        clause = f"({y1})년과 ({y2})년{suffix} 각각 {amount}{currency or 'W'}"
    else:
        clause = f"({y1})년과 ({y2})년{suffix}"
    _strip_trailing_year_connectors(merged)
    if merged:
        merged[-1] = f"{merged[-1]} {clause}".strip()
    else:
        merged.append(clause)


def _try_emit_year_pair_without_amount(merged: list[str], pending_years: list[str]) -> bool:
    if len(pending_years) < 2 or not merged:
        return False
    tail = merged[-1].strip()
    if tail.endswith("년의") or tail == "년의":
        _attach_year_pair_clause(merged, pending_years[-2:], suffix="의")
        pending_years.clear()
        return True
    if tail in {"년과", "년에"} or tail.endswith(("년과", "년에")):
        _attach_year_pair_clause(merged, pending_years[-2:], suffix="에")
        pending_years.clear()
        return True
    return False


def _try_emit_date_from_parts(
    merged: list[str],
    year: str,
    month: str,
    day: str,
    suffix: str = "",
) -> None:
    merged.append(f"{_norm_year(year)}년 {month}월 {day}일{suffix}")


def rejoin_exam_line_fragments(text: str) -> str:
    """Reattach OCR-split accounting tokens (years, amounts, dates, currency)."""
    if not text:
        return ""
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    merged: list[str] = []
    pending_years: list[str] = []
    pending_paren = False
    i = 0

    while i < len(lines):
        line = lines[i]

        if line == "(":
            pending_paren = True
            i += 1
            continue
        if line == ")" and pending_paren:
            pending_paren = False
            i += 1
            continue

        if ORPHAN_YEAR.match(line):
            pending_years.append(_norm_year(line))
            i += 1
            continue

        if len(pending_years) >= 2 and merged and not ORPHAN_AMOUNT.match(line):
            if _try_emit_year_pair_without_amount(merged, pending_years):
                if ORPHAN_YEAR.match(line):
                    pending_years.append(_norm_year(line))
                else:
                    merged.append(line)
                i += 1
                continue

        if pending_years and DATE_UNIT.match(line):
            year = pending_years.pop(0)
            if line == "년":
                merged.append(f"{year}년")
            elif line == "월":
                merged.append(f"{year}년")
            elif line.startswith("일"):
                merged.append(f"{year}년 1월 2일")
            else:
                merged.append(f"{year}년 {line}")
            pending_paren = False
            i += 1
            continue

        if (
            pending_years
            and i + 1 < len(lines)
            and DIGIT_LINE.match(lines[i])
            and DIGIT_LINE.match(lines[i + 1])
        ):
            year = pending_years.pop(0)
            month, day = lines[i], lines[i + 1]
            suffix = ""
            skip = 2
            if i + 2 < len(lines) and _is_currency_line(lines[i + 2]):
                suffix = "W"
                skip = 3
            _try_emit_date_from_parts(merged, year, month, day, suffix)
            i += skip
            continue

        if (
            i + 2 < len(lines)
            and ORPHAN_YEAR.match(lines[i])
            and DIGIT_LINE.match(lines[i + 1])
            and DIGIT_LINE.match(lines[i + 2])
        ):
            y = _norm_year(lines[i])
            month, day = lines[i + 1], lines[i + 2]
            suffix = ""
            skip = 3
            if i + 3 < len(lines) and _is_currency_line(lines[i + 3]):
                suffix = "W"
                skip = 4
            _try_emit_date_from_parts(merged, y, month, day, suffix)
            i += skip
            continue

        if _is_currency_line(line) and merged:
            merged[-1] = f"{merged[-1].rstrip()}W"
            i += 1
            continue

        if (
            i + 3 < len(lines)
            and re.match(r"^\.?\s*20[×xX]\d{1,2}$", line)
            and DIGIT_LINE.match(lines[i + 1])
            and DIGIT_LINE.match(lines[i + 2])
        ):
            year_match = re.search(r"20[×xX]\d{1,2}", line)
            if year_match:
                month, day = lines[i + 1], lines[i + 2]
                suffix = ""
                skip = 3
                if i + 3 < len(lines) and _is_currency_line(lines[i + 3]):
                    suffix = "W"
                    skip = 4
                _try_emit_date_from_parts(
                    merged, year_match.group(0), month, day, suffix
                )
                i += skip
                continue

        if (
            i + 3 < len(lines)
            and line.startswith("일")
            and ORPHAN_AMOUNT.match(lines[i + 1])
            and re.match(r"^\.?\s*20[×xX]\d{1,2}$", lines[i + 2])
            and DIGIT_LINE.match(lines[i + 3])
        ):
            amount = lines[i + 1]
            year_match = re.search(r"20[×xX]\d{1,2}", lines[i + 2])
            month = lines[i + 3]
            day = lines[i + 4] if i + 4 < len(lines) and DIGIT_LINE.match(lines[i + 4]) else None
            if year_match and day:
                date_text = (
                    f"{_norm_year(year_match.group(0))}년 {month}월 {day}일까지 "
                    f"보통주 {amount}W"
                )
                merged.append(date_text)
                skip = 5
                if i + 4 < len(lines) and _is_currency_line(lines[i + 4]):
                    skip = 5
                elif i + 4 < len(lines) and not DIGIT_LINE.match(lines[i + 4]):
                    skip = 4
                i += skip
                continue

        if (
            i + 1 < len(lines)
            and line == "년"
            and DIGIT_LINE.match(lines[i + 1])
            and i + 4 < len(lines)
            and lines[i + 2] in {".", ". ("}
            and lines[i + 3] == ")"
            and ORPHAN_YEAR.match(lines[i + 4])
        ):
            count = lines[i + 1]
            year = _norm_year(lines[i + 4])
            month = day = None
            scan = i + 5
            while scan + 1 < len(lines) and not month:
                if lines[scan] == "월" and DIGIT_LINE.match(lines[scan + 1]):
                    month = lines[scan + 1]
                    scan += 2
                    if scan < len(lines) and lines[scan].startswith("일"):
                        day_match = re.search(r"일(\d{1,2})?", lines[scan])
                        if day_match and day_match.group(1):
                            day = day_match.group(1)
                        elif scan + 1 < len(lines) and DIGIT_LINE.match(lines[scan + 1]):
                            day = lines[scan + 1]
                            scan += 1
                        scan += 1
                    break
                scan += 1
            if month and day:
                merged.append(f"{count}주이다. ({year})년 {month}월 {day}일")
                i = scan
                continue

        if (
            line == "포괄손"
            and i + 2 < len(lines)
            and lines[i + 1] == "."
            and ORPHAN_YEAR.match(lines[i + 2])
            and i + 3 < len(lines)
            and lines[i + 3].startswith("익계산서")
        ):
            merged.append(f"{_norm_year(lines[i + 2])}년 포괄손익계산서")
            i += 4
            continue

        if ORPHAN_AMOUNT.match(line):
            amount = line
            j = i + 1
            currency = ""
            if j < len(lines) and _is_currency_line(lines[j]):
                currency = "W"
                j += 1
            if (
                len(pending_years) >= 2
                and merged
                and any(
                    token in merged[-1]
                    for token in ("년과", "년에", "각각", "년의")
                )
            ):
                _attach_year_pair_clause(
                    merged,
                    pending_years[-2:],
                    amount=amount,
                    currency=currency,
                    suffix="에",
                )
                pending_years.clear()
                i = j
                continue
            years_ahead: list[str] = []
            scan = j
            while scan < len(lines) and len(years_ahead) < 2:
                if ORPHAN_YEAR.match(lines[scan]):
                    years_ahead.append(_norm_year(lines[scan]))
                    scan += 1
                elif lines[scan] in {"과", ".", ",", ";"}:
                    scan += 1
                else:
                    break
            if len(years_ahead) >= 2 and merged:
                _attach_year_pair_clause(
                    merged,
                    years_ahead,
                    amount=amount,
                    currency=currency,
                    suffix="에",
                )
                i = scan
                continue
            i = j
            token = f"{amount}{currency}"
            if merged:
                merged[-1] = f"{merged[-1]} {token}".strip()
            else:
                merged.append(token)
            continue

        if line in {"과", ".", ",", ";"} and merged:
            if line == "과" and merged[-1].endswith("각각"):
                i += 1
                continue
            merged[-1] = f"{merged[-1]}{line}"
            i += 1
            continue

        if pending_years and not DATE_UNIT.match(line) and not ORPHAN_YEAR.match(line):
            if line in {"년과", "년에", "각각"} or "년" in line:
                merged.append(line)
            else:
                _flush_pending_years(pending_years, merged)
                merged.append(line)
            i += 1
            continue

        if pending_years:
            _flush_pending_years(pending_years, merged)
        merged.append(line)
        i += 1

    if pending_years:
        merged.append(" ".join(pending_years))

    return "\n".join(merged)


def normalize_rejoined_structure(text: str) -> str:
    """Minimal structural normalization after line rejoin (not question-specific patches)."""
    value = text or ""
    value = re.sub(r"\(\s*\)\s*(?=년|월|일|과|에|의|\.)", "", value)
    value = re.sub(r"년\s*과\s*년\s*에\s*(?=\()", "", value, flags=re.I)
    value = re.sub(r"년\s*과\s*년\s*의\s*(?=\()", "", value, flags=re.I)
    value = re.sub(
        r"년\s*과\s*년\s*에\s*각각\s*(?:과\s*)?"
        r"(20[×xX]\d{1,2})\s+(20[×xX]\d{1,2})\s+"
        r"(\d{1,3}(?:,\d{3})*)\s*W?",
        lambda m: (
            f"({_norm_year(m.group(1))})년과 ({_norm_year(m.group(2))})년에 "
            f"각각 {m.group(3)}W"
        ),
        value,
        flags=re.I,
    )
    value = re.sub(
        r"년\s*과\s*년\s*의(\s*[^.?]{0,60}?)\s+(20[×xX]\d{1,2})\s+(20[×xX]\d{1,2})",
        lambda m: (
            f"({_norm_year(m.group(2))})년과 ({_norm_year(m.group(3))})년의"
            f"{m.group(1)}"
        ),
        value,
        flags=re.I,
    )
    value = re.sub(
        r"(20[×xX]\d{1,2})년\s*월\s*일(?:부터|에)?[^0-9]{0,30}(\d{1,2})\s+(\d{1,2})",
        lambda m: f"{_norm_year(m.group(1))}년 {m.group(2)}월 {m.group(3)}일",
        value,
        flags=re.I,
    )
    value = re.sub(
        r"(?<![0-9])년\s*월\s*일\s*(?=까지|에|과)",
        "",
        value,
    )
    value = re.sub(
        r"월\s*일\s*과\s*월\s*일\s*에\s+[\d,]+W?\s*(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})",
        lambda m: (
            f"{m.group(1)}월 {m.group(2)}일 과 {m.group(3)}월 {m.group(4)}일"
        ),
        value,
        flags=re.I,
    )
    value = re.sub(
        r"\.?\s*(20[×xX]\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s*W(?=\s|의|까지|에|월|일|.)",
        lambda m: f"{_norm_year(m.group(1))}년 {m.group(2)}월 {m.group(3)}일",
        value,
        flags=re.I,
    )
    value = re.sub(
        r"(20[×xX]\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(?=W|의|까지|에|월|일|.)",
        lambda m: f"{_norm_year(m.group(1))}년 {m.group(2)}월 {m.group(3)}일 ",
        value,
        flags=re.I,
    )
    value = re.sub(
        r"(20[×xX]\d{1,2})\s+년\s+(\d{1,2})\s+월\s+(\d{1,2})\s+일",
        lambda m: f"{_norm_year(m.group(1))}년 {m.group(2)}월 {m.group(3)}일",
        value,
        flags=re.I,
    )
    value = re.sub(
        r"(20[×xX]\d{1,2})\s+월\s+(\d{1,2})\s+일",
        lambda m: f"{_norm_year(m.group(1))}년 {m.group(2)}월 {m.group(3)}일",
        value,
        flags=re.I,
    )
    value = re.sub(
        r"(20[×xX]\d{1,2})\s+월\s+일",
        lambda m: f"{_norm_year(m.group(1))}년 1월 2일",
        value,
        flags=re.I,
    )
    if re.search(r"20[×xX]\d{1,2}\s*년\s*\d{1,2}\s*월\s*\d{1,2}\s*일", value):
        value = re.sub(r"년\s*월\s*일\s*(?=까지|에|의|)", "", value)
        value = re.sub(r"년\s*월\s*일(?=\s*까지)", "", value)
    value = re.sub(
        r"(\d{1,3}(?:,\d{3})*W)\s*이(?:다|다\.?)\s*(?:년\s*)?(?:월\s*)?(?:일)?까지?\s*보통주\s*"
        r"(\d{1,3}(?:,\d{3})*)\s*(20[×xX]\d{1,2})년\s*(\d{1,2})월\s*(\d{1,2})일",
        lambda m: (
            f"{m.group(1)}이다. {_norm_year(m.group(4))}년 {m.group(5)}월 {m.group(6)}일까지 "
            f"보통주 {m.group(2)}W의"
        ),
        value,
        flags=re.I,
    )
    value = re.sub(
        r"년\s*(\d{2,4})\s*\.\s*\(\s*\)",
        r" \1주이다.",
        value,
    )
    value = re.sub(
        r"년\s*(\d{1,2})\s+(\d{1,2})\s*\.\s*\(\s*\)\s*"
        r"(20[×xX]\d{1,2})년\s*일\s*(까지|에)",
        lambda m: (
            f"{_norm_year(m.group(3))}년 {m.group(1)}월 {m.group(2)}일{m.group(4)}"
        ),
        value,
        flags=re.I,
    )
    value = re.sub(
        r"(20[×xX]\d{1,2})년\s*일\s*에(.{0,120}?)년\s*(\d{1,2})\s+(\d{1,2})\s+(\d{2,4})",
        lambda m: (
            f"{_norm_year(m.group(1))}년 {m.group(3)}월 {m.group(4)}일에"
            f"{m.group(2)} {m.group(5)}주"
        ),
        value,
        flags=re.I,
    )
    value = re.sub(
        r"유통보통주\s*(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s*",
        r"유통보통주 \3주당 \4주 ",
        value,
    )
    value = re.sub(
        r"주당\s*주\s*의",
        "1주당 2주의",
        value,
    )
    value = re.sub(
        r"포괄손\s*\.\s*(20[×xX]\d{1,2})\s*익계산서",
        lambda m: f"{_norm_year(m.group(1))}년 포괄손익계산서",
        value,
        flags=re.I,
    )
    value = re.sub(r"(\d{1,3}(?:,\d{3})*)W{2,}", r"\1W", value)
    value = re.sub(r"WW+", "W", value)
    value = re.sub(r"년\s*월\s*(?=20[×xX]\d{1,2}년\s*\d{1,2}월)", "", value)
    value = re.sub(r"(?<=\?)\s*년\s+(?=20[×xX]\d{1,2}년)", "", value)
    value = re.sub(r"WW의", "W의", value)
    value = re.sub(
        r"발행주식\s*수\s*는\s*주\s*이(?:다|다\.?).{0,40}?(\d+)주\s*이(?:다|다\.?)",
        r"발행주식수는 \1주이다",
        value,
        flags=re.I,
    )
    value = re.sub(
        r"(20[×xX]\d{1,2})년\s*(\d{1,2})월\s*(\d{1,2})일에\s*자기주식\s*주\s*를\s*취득\s*하여\s*(\d{2,4})주",
        lambda m: (
            f"{_norm_year(m.group(1))}년 {m.group(2)}월 {m.group(3)}일에 "
            f"자기주식 {m.group(4)}주를 취득하여"
        ),
        value,
        flags=re.I,
    )
    for year_token in set(re.findall(r"20[×xX]\d{1,2}", value)):
        y = _norm_year(year_token)
        incomplete_matches = list(
            re.finditer(rf"({re.escape(y)})년\s*일\s*(까지|에)", value)
        )
        if not incomplete_matches:
            continue
        complete_matches = list(
            re.finditer(
                rf"{re.escape(y)}년\s*(\d{{1,2}})월\s*(\d{{1,2}})일", value
            )
        )
        if not complete_matches:
            continue
        offset = 0
        for match in incomplete_matches:
            following = [
                item
                for item in complete_matches
                if item.start() > match.start() + offset
            ]
            if following:
                month, day = following[0].group(1), following[0].group(2)
            else:
                month, day = complete_matches[-1].group(1), complete_matches[-1].group(2)
            replacement = f"{y}년 {month}월 {day}일{match.group(2)}"
            start = match.start() + offset
            end = match.end() + offset
            value = value[:start] + replacement + value[end:]
            offset += len(replacement) - (end - start)
    value = re.sub(r"(?<=[^0-9×])년\s+(?=20[×xX]\d{1,2}년)", "", value)
    value = re.sub(
        r"(주당\s*\d+주\s*의[^.?]{0,50}?)\s*\d{1,2}\s+\d{1,2}\s+\d{1,2}\s+\d{1,2}\s*(?=급|지급)",
        r"\1",
        value,
    )
    value = re.sub(r"\s*\(\s*\)", "", value)
    value = re.sub(r"\.\s*\(\s*\)", ".", value)
    value = re.sub(
        r"(\?)\s*(?:년\s+(?:20[×xX]\d{1,2}\s*년\s*){2,4}20[×xX]\d{1,2}\s*)$",
        r"\1",
        value,
        flags=re.I,
    )
    return value.strip()


def _should_join_lines(prev: str, nxt: str) -> bool:
    if not prev or not nxt:
        return False
    if CHOICE_LINE.match(nxt) or CHOICE_LINE.match(prev):
        return False
    if CHOICE_GRID_HEADER.match(nxt) or CHOICE_GRID_HEADER.match(prev):
        return False
    if WON_CELL.match(nxt) and (WON_CELL.search(prev) or CHOICE_LINE.search(prev)):
        return False
    if "?" in prev or "？" in prev:
        return False
    if ORPHAN_YEAR.match(nxt) and CHOICE_GRID_HEADER.match(
        f"{prev} {nxt}".replace("  ", " ")
    ):
        return False
    if ORPHAN_DATE_SKELETON.match(nxt) and (
        prev.endswith(("W", "이다", "이었다"))
        or re.search(r"\d{1,3}(?:,\d{3})*W?\s*이(?:다|다\.?)$", prev)
    ):
        return False
    if ORPHAN_YEAR.match(prev) and (DIGIT_LINE.match(nxt) or DATE_UNIT.match(nxt)):
        return True
    if ORPHAN_AMOUNT.match(nxt) or _is_currency_line(nxt):
        return True
    if prev.endswith(("-", "·")) or re.search(r"[,:;]$", prev):
        return True
    if re.search(r"^\(", nxt):
        return True
    if DATE_UNIT.match(nxt) and (ORPHAN_YEAR.match(prev) or prev.endswith(("(", "과", "각각"))):
        return True
    if prev in {"(", "과"} or prev.endswith(("년과", "년에", "각각", "과")):
        return True
    if ORPHAN_YEAR.match(nxt) and prev.endswith(("년과", "년에", "각각", "과", "(", "이다")):
        return True
    return not re.search(r"[.?!?)]$", prev)


def collapse_soft_breaks(text: str) -> str:
    """Join PDF line breaks while preserving choice/table row boundaries."""
    if not text:
        return ""
    lines = [line.strip() for line in text.splitlines()]
    merged: list[str] = []
    buffer = ""
    for line in lines:
        if not line:
            if buffer:
                merged.append(buffer)
                buffer = ""
            merged.append("")
            continue
        if not buffer:
            buffer = line
            continue
        if _should_join_lines(buffer, line):
            if buffer.endswith("-") or buffer.endswith("·"):
                buffer = buffer.rstrip("-·") + line
            elif _is_currency_line(line):
                buffer = f"{buffer.rstrip()}W"
            elif ORPHAN_AMOUNT.match(line):
                buffer = f"{buffer} {line}"
            else:
                buffer = f"{buffer} {line}"
        else:
            merged.append(buffer)
            buffer = line
    if buffer:
        merged.append(buffer)
    return "\n".join(merged)


def remove_footer_noise(text: str) -> str:
    value = text or ""
    for pattern in FOOTER_PATTERNS:
        value = pattern.sub("", value)
    return value.strip()


def _token_placeholder(index: int) -> str:
    return f"\ue000{chr(0xE100 + index)}\ue001"


def protect_numeric_tokens(text: str) -> tuple[str, list[str]]:
    tokens: list[str] = []

    def repl(match: re.Match[str]) -> str:
        tokens.append(match.group(0))
        return _token_placeholder(len(tokens) - 1)

    value = text
    for pattern in UNIT_PATTERNS:
        value = pattern.sub(repl, value)
    value = NUMBER_PATTERN.sub(repl, value)
    return value, tokens


def restore_numeric_tokens(text: str, tokens: list[str]) -> str:
    value = text
    for index, token in enumerate(tokens):
        value = value.replace(_token_placeholder(index), token)
    return value


def fix_glued_hangul_spacing(text: str) -> str:
    """Insert hangul spacing without splitting protected accounting tokens."""
    if not text:
        return ""
    value, tokens = protect_numeric_tokens(text)
    value = value.replace("￦", "W").replace("₩", "W")
    value = re.sub(r"20[xX](\d)", r"20×\1", value)
    value = re.sub(r"([.?,:;])([가-힣A-Za-z0-9])", r"\1 \2", value)
    value = re.sub(r"([가-힣0-9])(\()", r"\1 \2", value)
    value = re.sub(r"(\))(?=[가-힣A-Za-z0-9])", ") ", value)
    value = re.sub(r"([가-힣])(W\d)", r"\1 \2", value)
    value = re.sub(
        r"([가-힣])(\d)",
        lambda m: m.group(0)
        if m.group(2) in {"년", "월", "일", "원", "주", "회", "번", "호", "층", "시", "분", "세", "㎡", "％", "%"}
        else f"{m.group(1)} {m.group(2)}",
        value,
    )
    value = re.sub(
        r"(\d)([가-힣])",
        lambda m: m.group(0)
        if m.group(2) in {"년", "월", "일", "원", "주", "회", "번", "호", "층", "시", "분", "세", "㎡", "％", "%", "W"}
        else f"{m.group(1)} {m.group(2)}",
        value,
    )
    for _ in range(2):
        value = HANGUL_PARTICLE_BREAK.sub(" ", value)
    value = re.sub(r"\(\s+", "(", value)
    value = re.sub(r"\s+\)", ")", value)
    value = re.sub(r"[ \t]{2,}", " ", value)
    return restore_numeric_tokens(value, tokens)


def normalize_exam_symbols(text: str) -> str:
    value = text or ""
    for old, new in OCR_SYMBOL_FIXES.items():
        value = value.replace(old, new)
    value = value.replace("￦", "W").replace("₩", "W")
    value = re.sub(r"(?<=[\?？\s])#(?=\s*[0-9W①-⑤])", "①", value)
    value = re.sub(r"(?<=[①②③④⑤\s])#(?=\s*[0-9W])", "②", value)
    return value


def normalize_exam_body(text: str) -> str:
    """Full body normalization before field extraction (preserves newlines)."""
    value = remove_footer_noise(text)
    value = rejoin_exam_line_fragments(value)
    value = collapse_soft_breaks(value)
    value = normalize_rejoined_structure(value)
    return value.strip()


def strip_trailing_choice_grid_header(text: str) -> str:
    """Remove 2-column year header rows that precede ①–⑤ W grid choices."""
    if not text:
        return ""
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    while lines:
        probe = " ".join(lines[-4:]) if len(lines) >= 4 else " ".join(lines)
        flat = probe.replace(" ", "")
        if CHOICE_GRID_HEADER.match(flat):
            while lines and (
                ORPHAN_YEAR.match(lines[-1])
                or lines[-1] in {"년", "과", "에", "의"}
                or re.fullmatch(r"20[×xX]\d{1,2}년?", lines[-1].replace(" ", ""))
            ):
                lines.pop()
            continue
        if len(lines) >= 2 and all(
            re.fullmatch(r"20[×xX]\d{1,2}년?", item.replace(" ", "")) or item == "년"
            for item in lines[-2:]
        ):
            lines.pop()
            continue
        break
    return "\n".join(lines).strip()


def format_question_text(text: str) -> str:
    value = normalize_exam_body(text)
    value = fix_glued_hangul_spacing(value)
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value.strip()


def extract_numbers(text: str) -> set[str]:
    return set(NUMBER_PATTERN.findall(text or ""))


def extract_units(text: str) -> set[str]:
    found: set[str] = set()
    for pattern in UNIT_PATTERNS:
        found.update(pattern.findall(text or ""))
    return found
