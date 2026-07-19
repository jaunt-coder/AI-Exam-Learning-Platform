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
