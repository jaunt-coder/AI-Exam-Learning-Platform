"""Stable, parser-independent text tokenization for regression metrics.

These helpers define the FROZEN reference semantics for the harness. They must
not import from the parser engine being refactored so that Baseline (old) and
future (new) outputs are measured on identical rules.
"""
from __future__ import annotations

import re

# --- number tokens -------------------------------------------------------
# Formatted thousands (1,234 / 1,234.56), plain decimals (12.34), long ints (123+).
_NUMBER_RE = re.compile(r"\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+\.\d+|\d{3,}")

# --- unit tokens ---------------------------------------------------------
_UNIT_RES = [
    re.compile(r"\d{1,3}(?:,\d{3})+(?:\.\d+)?W", re.I),
    re.compile(r"W\d{1,3}(?:,\d{3})*(?:\.\d+)?"),
    re.compile(r"\d+(?:\.\d+)?%"),
    re.compile(r"\d+(?:\.\d+)?㎡"),
    re.compile(r"\d+(?:\.\d+)?(?:원|천원|백만원|억원)"),
    re.compile(r"20×\d{1,2}년\s*\d{1,2}월\s*\d{1,2}일"),
    re.compile(r"20×\d{1,2}년"),
    re.compile(r"20×\d{1,2}"),
]

_CHOICE_MARKERS = ("①", "②", "③", "④", "⑤")


def normalize_symbols(text: str) -> str:
    """Canonicalize currency and year glyphs (non-destructive to digits)."""
    value = text or ""
    value = value.replace("￦", "W").replace("₩", "W").replace("\uFFE6", "W")
    value = re.sub(r"20[xX](\d)", r"20×\1", value)
    return value


def normalize_compare(text: str) -> str:
    """Whitespace-insensitive, case-insensitive comparison form."""
    value = normalize_symbols(text or "")
    value = re.sub(r"\s+", "", value)
    return value.lower()


def extract_numbers(text: str) -> set[str]:
    return set(_NUMBER_RE.findall(normalize_symbols(text or "")))


def extract_units(text: str) -> set[str]:
    value = normalize_symbols(text or "")
    found: set[str] = set()
    for pattern in _UNIT_RES:
        found.update(match for match in pattern.findall(value))
    return found


def first_choice_index(text: str) -> int | None:
    for index, char in enumerate(text or ""):
        if char in _CHOICE_MARKERS:
            return index
    return None


def split_stem_and_choices(text: str) -> tuple[str, str]:
    """Split a raw body into (stem_before_choices, choice_region)."""
    idx = first_choice_index(text or "")
    if idx is None:
        return text or "", ""
    return text[:idx], text[idx:]


def choice_marker_count(text: str) -> int:
    return sum((text or "").count(marker) for marker in _CHOICE_MARKERS)
