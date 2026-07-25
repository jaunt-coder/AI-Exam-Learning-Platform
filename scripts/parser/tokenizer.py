"""Stage 3 — Tokenizer.

Rebuilds the meaning-bearing tokens of the exam from glyph-fragmented PDF spans
using COORDINATES ONLY. Pipeline:

    Span[] (per line)
      -> reconstruct line surface with char->bbox map
         (glued where glyphs are x-adjacent, spaced where a real gap exists)
      -> deterministic lexer (hand-rolled, no document-wide regex)
      -> Token[] (NUMBER/CURRENCY/YEAR/DATE/PERCENT/CHOICE_MARKER/QUESTION_NUMBER/TEXT)

Hard rules:
    - No invented digits. No OCR correction. No accounting-knowledge edits.
    - NUMBER/CURRENCY/YEAR/DATE/PERCENT tokens are immutable and keep original text.
    - Every source character maps to some token (nothing is dropped).
"""
from __future__ import annotations

from config import DEFAULT_CONFIG, ParserConfig
from context import ParseContext
from model import IMMUTABLE_TYPES, BBox, LayoutDocument, Span, Token, TokenType, union_bbox

CHOICE_MARKERS = "①②③④⑤⑥⑦⑧⑨⑩"
CURRENCY_SINGLE = "W₩￦"
CURRENCY_WORDS = ("백만원", "천원", "억원", "만원", "원")  # longest-first
YEAR_SEP = "×xX"

# Count units that bind to a preceding number into a single QUANTITY token.
# Deliberately excludes currency (원/W) and % (they keep dedicated types) and
# 월/일 (handled by DATE). Extensible without touching the lexer.
QUANTITY_UNITS = ("주식", "주", "좌", "계약", "매")  # longest-first

# A char gap wider than this fraction of the font size marks a real space
# between tokens; anything tighter is glyph fragmentation and is glued.
SPACE_GAP_RATIO = 0.30


class _Char:
    __slots__ = ("ch", "x0", "x1", "y0", "y1", "span_index")

    def __init__(self, ch: str, x0: float, x1: float, y0: float, y1: float, span_index: int):
        self.ch = ch
        self.x0 = x0
        self.x1 = x1
        self.y0 = y0
        self.y1 = y1
        self.span_index = span_index


def _reconstruct_line(spans: list[Span]) -> list[_Char]:
    """Turn line spans into a char stream with per-char bbox, inserting a single
    space only where a genuine horizontal gap exists."""
    ordered = sorted(spans, key=lambda s: s.x0)
    chars: list[_Char] = []
    prev: Span | None = None
    for span in ordered:
        if prev is not None:
            gap = span.x0 - prev.x1
            threshold = SPACE_GAP_RATIO * max(prev.size, span.size, 1.0)
            if gap > threshold:
                chars.append(_Char(" ", prev.x1, span.x0, span.y0, span.y1, span.span_index))
        n = max(len(span.text), 1)
        width = (span.bbox[2] - span.bbox[0]) / n
        for j, ch in enumerate(span.text):
            cx0 = span.bbox[0] + j * width
            cx1 = span.bbox[0] + (j + 1) * width
            chars.append(_Char(ch, cx0, cx1, span.bbox[1], span.bbox[3], span.span_index))
        prev = span
    return chars


# -- lexer primitives (position-anchored, hand-rolled) --------------------
def _scan_year(s: str, i: int) -> int | None:
    if s.startswith("20", i) and i + 3 < len(s) and s[i + 2] in YEAR_SEP and s[i + 3].isdigit():
        j = i + 3
        while j < len(s) and s[j].isdigit():
            j += 1
        if j < len(s) and s[j] == "년":
            j += 1
        return j
    return None


def _scan_date(s: str, i: int) -> int | None:
    if not s[i].isdigit():
        return None
    j = i
    while j < len(s) and s[j].isdigit():
        j += 1
    if j >= len(s) or s[j] not in "월일":
        return None
    end = j + 1
    if s[j] == "월":
        k = end
        while k < len(s) and s[k] == " ":
            k += 1
        m = k
        while m < len(s) and s[m].isdigit():
            m += 1
        if m > k and m < len(s) and s[m] == "일":
            end = m + 1
    return end


def _scan_number_literal(s: str, i: int) -> int | None:
    if not s[i].isdigit():
        return None
    j = i
    while j < len(s) and (s[j].isdigit() or s[j] == ","):
        j += 1
    if s[j - 1] == ",":  # trailing comma is not part of the number
        j -= 1
    if j < len(s) and s[j] == "." and j + 1 < len(s) and s[j + 1].isdigit():
        j += 1
        while j < len(s) and s[j].isdigit():
            j += 1
    return j


def _scan_currency(s: str, i: int) -> int | None:
    for word in CURRENCY_WORDS:
        if s.startswith(word, i):
            return i + len(word)
    if s[i] in CURRENCY_SINGLE:
        return i + 1
    return None


def _scan_quantity_unit(s: str, i: int) -> int | None:
    for word in QUANTITY_UNITS:
        if s.startswith(word, i):
            return i + len(word)
    return None


def _lex(surface: str) -> list[tuple[str, int, int]]:
    """Return [(type, start, end)] segments spanning the whole surface."""
    out: list[tuple[str, int, int]] = []
    text_start: int | None = None
    i = 0
    n = len(surface)

    def flush_text(upto: int) -> None:
        nonlocal text_start
        if text_start is not None and upto > text_start:
            out.append((TokenType.TEXT, text_start, upto))
        text_start = None

    while i < n:
        ch = surface[i]

        if ch in CHOICE_MARKERS:
            flush_text(i)
            out.append((TokenType.CHOICE_MARKER, i, i + 1))
            i += 1
            continue

        end = _scan_year(surface, i)
        if end is not None:
            flush_text(i)
            out.append((TokenType.YEAR, i, end))
            i = end
            continue

        end = _scan_date(surface, i)
        if end is not None:
            flush_text(i)
            out.append((TokenType.DATE, i, end))
            i = end
            continue

        num_end = _scan_number_literal(surface, i)
        if num_end is not None:
            flush_text(i)
            if num_end < n and surface[num_end] == "%":
                out.append((TokenType.PERCENT, i, num_end + 1))
                i = num_end + 1
            else:
                q_end = _scan_quantity_unit(surface, num_end) if num_end < n else None
                if q_end is not None:
                    out.append((TokenType.QUANTITY, i, q_end))
                    i = q_end
                else:
                    out.append((TokenType.NUMBER, i, num_end))
                    i = num_end
            continue

        cur_end = _scan_currency(surface, i)
        if cur_end is not None:
            flush_text(i)
            out.append((TokenType.CURRENCY, i, cur_end))
            i = cur_end
            continue

        if text_start is None:
            text_start = i
        i += 1

    flush_text(n)
    return out


def _normalize(token_type: str, text: str) -> str | None:
    if token_type == TokenType.NUMBER:
        return text.replace(",", "")
    if token_type == TokenType.PERCENT:
        return text.replace("%", "").strip()
    if token_type == TokenType.YEAR:
        core = text.replace("년", "")
        return core.replace("x", "×").replace("X", "×")
    if token_type == TokenType.QUESTION_NUMBER:
        return text.rstrip(".").strip()
    return None


def _token_from_segment(
    seg_type: str, start: int, end: int, chars: list[_Char],
    page: int, block: int, line: int, order: int,
) -> Token | None:
    piece = "".join(c.ch for c in chars[start:end])
    stripped = piece.strip()
    if not stripped:
        return None
    # trim surrounding whitespace but keep interior (e.g. "8월 31일")
    lead = len(piece) - len(piece.lstrip())
    trail = len(piece) - len(piece.rstrip())
    seg_chars = chars[start + lead:end - trail] if trail else chars[start + lead:end]
    if not seg_chars:
        seg_chars = chars[start:end]
    bbox: BBox = union_bbox([(c.x0, c.y0, c.x1, c.y1) for c in seg_chars]) or (
        chars[start].x0, chars[start].y0, chars[start].x1, chars[start].y1
    )
    span_indices = sorted({c.span_index for c in seg_chars})
    normalized = _normalize(seg_type, stripped)
    unit: str | None = None
    if seg_type == TokenType.QUANTITY:
        k = 0
        while k < len(stripped) and (stripped[k].isdigit() or stripped[k] in ",."):
            k += 1
        normalized = stripped[:k].replace(",", "")
        unit = stripped[k:].strip() or None
    elif seg_type == TokenType.PERCENT:
        unit = "%"
    elif seg_type == TokenType.CURRENCY:
        unit = stripped
    return Token(
        text=stripped,
        type=seg_type,
        bbox=bbox,
        page_number=page,
        block_index=block,
        line_index=line,
        span_index=span_indices[0] if span_indices else 0,
        token_index=order,
        normalized=normalized,
        unit=unit,
        immutable=seg_type in IMMUTABLE_TYPES,
        source_span_indices=span_indices,
    )


def _promote_question_number(line_tokens: list[Token]) -> None:
    """If a line starts with `<1-2 digit> .` promote it to QUESTION_NUMBER."""
    if len(line_tokens) < 2:
        return
    first, second = line_tokens[0], line_tokens[1]
    if first.type != TokenType.NUMBER or first.normalized is None:
        return
    if not first.normalized.isdigit() or not (1 <= len(first.normalized) <= 2):
        return
    if second.type != TokenType.TEXT or not second.text.startswith("."):
        return
    first.type = TokenType.QUESTION_NUMBER
    first.normalized = first.normalized
    first.immutable = False
    # remove the leading dot from the following TEXT token
    remainder = second.text[1:].strip()
    if remainder:
        second.text = remainder
    else:
        line_tokens.pop(1)


def tokenize_layout(layout: LayoutDocument) -> list[Token]:
    tokens: list[Token] = []
    for page in layout.pages:
        for line_spans in page.lines():
            chars = _reconstruct_line(line_spans)
            if not chars:
                continue
            surface = "".join(c.ch for c in chars)
            block = line_spans[0].block_index
            line = line_spans[0].line_index
            line_tokens: list[Token] = []
            for order, (seg_type, start, end) in enumerate(_lex(surface)):
                token = _token_from_segment(seg_type, start, end, chars, page.number, block, line, order)
                if token is not None:
                    line_tokens.append(token)
            _promote_question_number(line_tokens)
            tokens.extend(line_tokens)
    return tokens


class Tokenizer:
    """Stage 3 pipeline adapter."""

    name = "Tokenizer"

    def __init__(self, config: ParserConfig | None = None):
        self.config = config or DEFAULT_CONFIG

    def run(self, ctx: ParseContext) -> ParseContext:
        if ctx.layout is None or ctx.layout.page_count == 0:
            ctx.add(self.name, "error", "no LayoutDocument to tokenize")
            return ctx
        ctx.tokens = tokenize_layout(ctx.layout)
        by_type: dict[str, int] = {}
        for token in ctx.tokens:
            by_type[token.type] = by_type.get(token.type, 0) + 1
        summary = " ".join(f"{k}={v}" for k, v in sorted(by_type.items()))
        ctx.add(self.name, "info", f"tokens={len(ctx.tokens)} [{summary}]")
        return ctx
