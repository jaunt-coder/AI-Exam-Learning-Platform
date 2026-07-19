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
    re.compile(r"W\d{1,3}(?:,\d{3})*(?:\.\d+)?"),
    re.compile(r"￦\d{1,3}(?:,\d{3})*(?:\.\d+)?"),
    re.compile(r"\d+(?:\.\d+)?%"),
    re.compile(r"\d+(?:\.\d+)?㎡"),
    re.compile(r"\d+(?:\.\d+)?(?:원|천원|백만원|억원)"),
    re.compile(r"20×\d{1,2}"),
    re.compile(r"20[xX]\d{1,2}"),
]

NUMBER_PATTERN = re.compile(r"\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+\.\d+|\d+")
GLUED_HANGUL = re.compile(r"[가-힣]{12,}")
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


def remove_footer_noise(text: str) -> str:
    value = text or ""
    for pattern in FOOTER_PATTERNS:
        value = pattern.sub("", value)
    return value.strip()


def _token_placeholder(index: int) -> str:
    """Private-use marker without ASCII digits (avoids spacing regex breakage)."""
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
    """Insert spaces at punctuation and script boundaries without breaking numbers."""
    if not text:
        return ""
    value, tokens = protect_numeric_tokens(text)
    value = value.replace("￦", "W").replace("₩", "W")
    value = re.sub(r"20[xX](\d)", r"20×\1", value)
    value = re.sub(r"([.?,:;])([가-힣A-Za-z0-9])", r"\1 \2", value)
    value = re.sub(r"([가-힣0-9])(\()", r"\1 \2", value)
    value = re.sub(r"(\))([가-힣A-Za-z0-9])", r"\1 \2", value)
    value = re.sub(r"([가-힣])(W\d)", r"\1 \2", value)
    value = re.sub(r"([가-힣])(\d)", r"\1 \2", value)
    value = re.sub(r"(\d)([가-힣])", r"\1 \2", value)
    value = re.sub(r"(\d)(W)", r"\1 \2", value)
    for _ in range(2):
        value = HANGUL_PARTICLE_BREAK.sub(" ", value)
    value = re.sub(r"\(\s+", "(", value)
    value = re.sub(r"\s+\)", ")", value)
    value = re.sub(r"[ \t]{2,}", " ", value)
    value = restore_numeric_tokens(value, tokens)
    return value


def normalize_exam_symbols(text: str) -> str:
    value = text or ""
    for old, new in OCR_SYMBOL_FIXES.items():
        value = value.replace(old, new)
    value = value.replace("￦", "W").replace("₩", "W")
    value = re.sub(r"(?<=[\?？\s])#(?=\s*[0-9W①-⑤])", "①", value)
    value = re.sub(r"(?<=[①②③④⑤\s])#(?=\s*[0-9W])", "②", value)
    return value


def collapse_soft_breaks(text: str) -> str:
    """Join PDF line breaks inside sentences while preserving paragraph gaps."""
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
        if buffer.endswith(("-", "·")) or re.search(r"[,:;]$", buffer):
            buffer = buffer.rstrip("-·") + line
        elif re.search(r"[.?!?)]$", buffer):
            merged.append(buffer)
            buffer = line
        elif re.search(r"^\(", line):
            buffer += line
        else:
            buffer += " " + line
    if buffer:
        merged.append(buffer)
    return "\n".join(merged)


def format_question_text(text: str) -> str:
    value = remove_footer_noise(text)
    value = collapse_soft_breaks(value)
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
