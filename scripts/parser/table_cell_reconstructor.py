"""Stage 6.5 — Table Cell Reconstruction.

Reassembles OCR-fragmented tokens *inside* each table cell. Geometry is frozen:

    - Row / Column / Cell membership  — NEVER changed
    - BBox of the cell region         — NEVER changed
    - Tokens never move across cells

Only the tokens that already belong to a cell are concatenated into their
original surface forms (390 + , + 000 → 390,000, ￦ + 390,000 → ￦390,000, …).
No new digits or letters are invented; only original Token.text values are joined.

Pipeline:
    TableParser → TableCellReconstructor → Grid AST (rows rewritten)
"""
from __future__ import annotations

import re

from config import DEFAULT_CONFIG, ParserConfig
from context import ParseContext
from model import IMMUTABLE_TYPES, Token, TokenType, union_bbox

_HANGUL = re.compile(r"[가-힣]")
_HANGUL_SPACE = re.compile(r"([가-힣])\s+([가-힣])")
YEAR_SEP = set("×xX")
QUANTITY_UNITS = ("주식", "주", "좌", "계약", "매")
CURRENCY_CHARS = set("W₩￦")


def _is_hangulish(text: str) -> bool:
    return bool(_HANGUL.search(text))


def _hangul_ratio(text: str) -> float:
    if not text:
        return 0.0
    h = sum(1 for ch in text if "가" <= ch <= "힣")
    return h / max(len(text.replace(" ", "")), 1)


def collapse_hangul_spaces(text: str) -> str:
    """현재 가치 → 현재가치 (whitespace only; no new characters)."""
    prev = None
    out = text
    while prev != out:
        prev = out
        out = _HANGUL_SPACE.sub(r"\1\2", out)
    return out


_YEAR_SUFFIX = frozenset({"말", "초", "도", "기"})
_WON_COMPOUND_PREFIX = ("가", "재", "가동일", "재료")


def cleanup_cell_surface(text: str) -> str:
    """Whitespace-only cleanup of a finished cell surface (no new characters)."""
    s = text
    # ￦ 390,000 → ￦390,000
    s = re.sub(r"([￦W₩])\s+(\d)", r"\1\2", s)
    # 20x1년 말 → 20x1년말 / 20×1년 도 → 20×1년도
    s = re.sub(r"(년)\s+(말|초|도|기)(?=[가-힣]|$)", r"\1\2", s)
    # 원 가 / 원 재료 / 원 가동인 → compounds
    s = re.sub(r"(?<![가-힣])원\s+가", "원가", s)
    s = re.sub(r"(?<![가-힣])원\s+재료", "원재료", s)
    s = re.sub(r"(?<![가-힣])원\s+가동", "원가동", s)
    # short Hangul fragment pairs only (현 재, 원 가 already handled)
    s = re.sub(r"(?<![가-힣])([가-힣])\s+([가-힣])(?![가-힣])", r"\1\2", s)
    # date-ish dots: 20x1 . 1.1 . → 20x1.1.1.
    s = re.sub(r"(\w)\s+\.\s*", r"\1.", s)
    s = re.sub(r"\s+\.\s*(\w)", r".\1", s)
    # 12 . 5 → 12.5 (digit space dot space digit)
    s = re.sub(r"(\d)\s+\.\s+(\d)", r"\1.\2", s)
    # 390 , 000
    s = re.sub(r"(\d)\s+,\s+(\d)", r"\1,\2", s)
    # 20 %
    s = re.sub(r"(\d)\s+%", r"\1%", s)
    return s.strip()


def _copy_token(t: Token, text: str | None = None, typ: str | None = None, unit: str | None = None) -> Token:
    new_text = text if text is not None else t.text
    new_type = typ if typ is not None else t.type
    return Token(
        text=new_text,
        type=new_type,
        bbox=t.bbox,
        page_number=t.page_number,
        block_index=t.block_index,
        line_index=t.line_index,
        span_index=t.span_index,
        token_index=t.token_index,
        normalized=t.normalized,
        unit=unit if unit is not None else t.unit,
        immutable=new_type in IMMUTABLE_TYPES,
        source_span_indices=list(t.source_span_indices),
    )


def _merge(parts: list[Token], typ: str, unit: str | None = None) -> Token:
    """Concatenate original surfaces; union bbox; never invent characters."""
    text = "".join(p.text for p in parts)
    if typ == TokenType.TEXT:
        text = collapse_hangul_spaces(text)
    bbox = union_bbox([p.bbox for p in parts]) or parts[0].bbox
    src: list[int] = []
    for p in parts:
        src.extend(p.source_span_indices)
    return Token(
        text=text,
        type=typ,
        bbox=bbox,
        page_number=parts[0].page_number,
        block_index=parts[0].block_index,
        line_index=parts[0].line_index,
        span_index=parts[0].span_index,
        token_index=parts[0].token_index,
        normalized=None,
        unit=unit,
        immutable=typ in IMMUTABLE_TYPES,
        source_span_indices=src,
    )


def _is_comma(t: Token) -> bool:
    return t.text.strip() == ","


def _is_dot(t: Token) -> bool:
    return t.text.strip() == "."


def _is_percent_mark(t: Token) -> bool:
    return t.text.strip() in {"%", "％"} or (t.type == TokenType.PERCENT and t.text.strip() in {"%", "％"})


def _is_year_sep(t: Token) -> bool:
    s = t.text.strip()
    return len(s) == 1 and s in YEAR_SEP


def _is_quantity_unit(t: Token) -> bool:
    return t.text.strip() in QUANTITY_UNITS


def _is_won_syllable(t: Token) -> bool:
    """'원' mis-tagged as CURRENCY inside a Hangul compound (공사원가)."""
    return t.text.strip() == "원" and t.type in {TokenType.CURRENCY, TokenType.TEXT}


def _try_merge_at(toks: list[Token], i: int) -> tuple[Token, int] | None:
    n = len(toks)
    a = toks[i]

    # 1) 390 + , + 000  →  390,000
    if (
        a.type == TokenType.NUMBER
        and i + 2 < n
        and _is_comma(toks[i + 1])
        and toks[i + 2].type == TokenType.NUMBER
    ):
        return _merge([a, toks[i + 1], toks[i + 2]], TokenType.NUMBER), 3

    # 2) 12 + . + 5 + %  →  12.5%
    if (
        a.type == TokenType.NUMBER
        and i + 3 < n
        and _is_dot(toks[i + 1])
        and toks[i + 2].type == TokenType.NUMBER
        and _is_percent_mark(toks[i + 3])
    ):
        return _merge([a, toks[i + 1], toks[i + 2], toks[i + 3]], TokenType.PERCENT, unit="%"), 4

    # 3) 12 + . + 5  →  12.5
    if (
        a.type == TokenType.NUMBER
        and i + 2 < n
        and _is_dot(toks[i + 1])
        and toks[i + 2].type == TokenType.NUMBER
    ):
        # if next is % absorb it
        if i + 3 < n and _is_percent_mark(toks[i + 3]):
            return _merge([a, toks[i + 1], toks[i + 2], toks[i + 3]], TokenType.PERCENT, unit="%"), 4
        return _merge([a, toks[i + 1], toks[i + 2]], TokenType.NUMBER), 3

    # 4) 20 + %  /  NUMBER + PERCENT(%)
    if a.type == TokenType.NUMBER and i + 1 < n and _is_percent_mark(toks[i + 1]):
        return _merge([a, toks[i + 1]], TokenType.PERCENT, unit="%"), 2

    # 5) 1 + 주  →  1주
    if a.type == TokenType.NUMBER and i + 1 < n and _is_quantity_unit(toks[i + 1]):
        unit = toks[i + 1].text.strip()
        return _merge([a, toks[i + 1]], TokenType.QUANTITY, unit=unit), 2

    # 6) 20 + X + 3  →  20X3 / 20×3
    if (
        a.type == TokenType.NUMBER
        and a.text.strip().startswith("20")
        and i + 2 < n
        and _is_year_sep(toks[i + 1])
        and toks[i + 2].type == TokenType.NUMBER
    ):
        parts = [a, toks[i + 1], toks[i + 2]]
        consumed = 3
        # optional trailing 년
        if i + 3 < n and toks[i + 3].text.strip() == "년":
            parts.append(toks[i + 3])
            consumed = 4
        return _merge(parts, TokenType.YEAR), consumed

    # 7) ￦ + 390,000  →  ￦390,000  (currency symbol, not mid-word 원)
    if (
        a.type == TokenType.CURRENCY
        and a.text.strip() in CURRENCY_CHARS
        and i + 1 < n
        and toks[i + 1].type == TokenType.NUMBER
    ):
        return _merge([a, toks[i + 1]], TokenType.NUMBER, unit=a.text.strip()), 2

    # 8) 공사 + 원 + 가  →  공사원가  (원 as Hangul syllable)
    if (
        a.type == TokenType.TEXT
        and _is_hangulish(a.text)
        and i + 2 < n
        and _is_won_syllable(toks[i + 1])
        and toks[i + 2].type == TokenType.TEXT
        and _is_hangulish(toks[i + 2].text)
    ):
        return _merge([a, toks[i + 1], toks[i + 2]], TokenType.TEXT), 3

    # 9) YEAR + 말/초/도/기  →  20x1년말
    if (
        a.type == TokenType.YEAR
        and i + 1 < n
        and toks[i + 1].type == TokenType.TEXT
        and toks[i + 1].text.strip() in _YEAR_SUFFIX
    ):
        return _merge([a, toks[i + 1]], TokenType.YEAR), 2

    # 10) 원 + 가/재료/…  →  원가 (leading syllable, often CURRENCY-tagged)
    if _is_won_syllable(a) and i + 1 < n and toks[i + 1].type == TokenType.TEXT:
        nxt = toks[i + 1].text.strip()
        if nxt.startswith(_WON_COMPOUND_PREFIX) or nxt in {"가"}:
            return _merge([a, toks[i + 1]], TokenType.TEXT), 2

    # 11) 현재 + 가치  →  현재가치  (Hangul TEXT glue, short compounds)
    if (
        a.type == TokenType.TEXT
        and i + 1 < n
        and toks[i + 1].type == TokenType.TEXT
        and _hangul_ratio(a.text) >= 0.5
        and _hangul_ratio(toks[i + 1].text) >= 0.5
        and len(collapse_hangul_spaces(a.text)) <= 4
        and len(collapse_hangul_spaces(toks[i + 1].text)) <= 4
    ):
        return _merge([a, toks[i + 1]], TokenType.TEXT), 2

    # 12) TEXT + mid-word 원  (공사 + 원) when next is end or Hangul
    if (
        a.type == TokenType.TEXT
        and _is_hangulish(a.text)
        and i + 1 < n
        and _is_won_syllable(toks[i + 1])
        and (i + 2 >= n or (toks[i + 2].type == TokenType.TEXT and _is_hangulish(toks[i + 2].text)))
    ):
        if i + 2 < n and toks[i + 2].type == TokenType.TEXT:
            return _merge([a, toks[i + 1], toks[i + 2]], TokenType.TEXT), 3
        return _merge([a, toks[i + 1]], TokenType.TEXT), 2

    return None


def reconstruct_cell_tokens(tokens: list[Token], _depth: int = 0) -> list[Token]:
    """Reassemble tokens inside one cell. Order preserved; no cross-cell moves."""
    if not tokens:
        return []
    toks = sorted(tokens, key=lambda t: (t.x0, t.y0)) if _depth == 0 else list(tokens)
    out: list[Token] = []
    i = 0
    while i < len(toks):
        merged = _try_merge_at(toks, i)
        if merged is not None:
            token, consumed = merged
            out.append(token)
            i += consumed
            continue
        t = toks[i]
        if t.type == TokenType.TEXT:
            out.append(_copy_token(t, text=collapse_hangul_spaces(t.text)))
        else:
            out.append(t)
        i += 1
    # further passes: Hangul TEXT pairs / chained number fragments
    if _depth < 6 and _needs_second_pass(out):
        return reconstruct_cell_tokens(out, _depth + 1)
    return out


def _needs_second_pass(toks: list[Token]) -> bool:
    for i in range(len(toks) - 1):
        if _try_merge_at(toks, i) is not None:
            return True
    return False


def _should_glue(prev: Token, curr: Token) -> bool:
    """Decide whether to emit a space between two reconstructed tokens."""
    # ￦390,000 already one token after merge; if still separate, glue
    if prev.type == TokenType.CURRENCY and prev.text.strip() in CURRENCY_CHARS and curr.type == TokenType.NUMBER:
        return True
    if prev.type == TokenType.NUMBER and curr.type in {TokenType.PERCENT, TokenType.QUANTITY}:
        return True
    if prev.type == TokenType.TEXT and curr.type == TokenType.TEXT:
        if _hangul_ratio(prev.text) >= 0.5 and _hangul_ratio(curr.text) >= 0.5:
            return True
    # Hangul + ￦amount → keep space (단일금액 ￦1)
    if prev.type == TokenType.TEXT and _is_hangulish(prev.text):
        if curr.type == TokenType.CURRENCY and curr.text.strip() in CURRENCY_CHARS:
            return False
        if curr.type == TokenType.NUMBER and curr.unit and curr.unit in CURRENCY_CHARS:
            return False
        if curr.type == TokenType.NUMBER and curr.text[:1] in CURRENCY_CHARS:
            return False
    # NUMBER + Hangul: glue particle/suffix (￦1의현재가치), space before label (40,000 미지급…)
    if prev.type in {TokenType.NUMBER, TokenType.PERCENT, TokenType.QUANTITY, TokenType.CURRENCY}:
        if curr.type == TokenType.TEXT and _is_hangulish(curr.text):
            cur = curr.text.lstrip()
            if cur.startswith(("의", "은", "이", "을", "를", "에", "와", "과", "로")):
                return True
            if prev.text[:1] in CURRENCY_CHARS or (prev.unit and prev.unit in CURRENCY_CHARS):
                if cur.startswith("의"):
                    return True
            return False
    return False


def cell_surface(tokens: list[Token]) -> str:
    """Render reconstructed cell tokens to the grid AST string."""
    if not tokens:
        return ""
    parts: list[str] = []
    for i, t in enumerate(tokens):
        text = collapse_hangul_spaces(t.text) if t.type == TokenType.TEXT else t.text
        if i > 0 and not _should_glue(tokens[i - 1], t):
            # glue tightly for currency-number that survived as two tokens
            if not (
                tokens[i - 1].type == TokenType.CURRENCY
                and tokens[i - 1].text.strip() in CURRENCY_CHARS
                and t.type == TokenType.NUMBER
            ):
                # YEAR + 말/초 …
                if (
                    tokens[i - 1].type == TokenType.YEAR
                    and t.type == TokenType.TEXT
                    and t.text.strip() in _YEAR_SUFFIX
                ):
                    parts.append(text)
                    continue
                parts.append(" ")
        parts.append(text)
    return cleanup_cell_surface("".join(parts))


def reconstruct_table(table) -> dict:
    """Apply cell reconstruction to one TableCandidate. Returns stats."""
    merges = 0
    numeric_ok = currency_ok = year_ok = 0
    numeric_n = currency_n = year_n = 0
    new_rows: list[list[str]] = []
    new_cells: list[list[list[Token]]] = []
    flat: list[Token] = []

    for ri, row in enumerate(table.cell_tokens):
        row_text: list[str] = []
        row_tok: list[list[Token]] = []
        for ci, cell in enumerate(row):
            before_n = len(cell)
            rebuilt = reconstruct_cell_tokens(cell)
            if len(rebuilt) < before_n:
                merges += before_n - len(rebuilt)
            surface = cell_surface(rebuilt)
            # prefer existing row width
            if ri < len(table.rows) and ci < len(table.rows[ri]):
                pass
            row_text.append(surface)
            row_tok.append(rebuilt)
            flat.extend(rebuilt)

            for t in rebuilt:
                if t.type == TokenType.NUMBER:
                    numeric_n += 1
                    if re.fullmatch(r"[￦W₩]?[\d,]+(?:\.\d+)?", t.text):
                        numeric_ok += 1
                elif t.type == TokenType.CURRENCY:
                    currency_n += 1
                    currency_ok += 1
                elif t.type == TokenType.YEAR:
                    year_n += 1
                    if re.search(r"20[×xX]\d", t.text):
                        year_ok += 1
                elif t.type == TokenType.PERCENT:
                    numeric_n += 1
                    if "%" in t.text and any(ch.isdigit() for ch in t.text):
                        numeric_ok += 1
                # currency glued into NUMBER
                if t.type == TokenType.NUMBER and t.text[:1] in CURRENCY_CHARS:
                    currency_n += 1
                    currency_ok += 1

        # pad/truncate to original column count
        ncols = table.n_cols
        if len(row_text) < ncols:
            row_text.extend([""] * (ncols - len(row_text)))
            row_tok.extend([[] for _ in range(ncols - len(row_tok))])
        new_rows.append(row_text[:ncols])
        new_cells.append(row_tok[:ncols])

    table.rows = new_rows
    table.cell_tokens = new_cells
    table.tokens = flat
    return {
        "merges": merges,
        "numericOk": numeric_ok,
        "numericN": numeric_n,
        "currencyOk": currency_ok,
        "currencyN": currency_n,
        "yearOk": year_ok,
        "yearN": year_n,
    }


class TableCellReconstructor:
    """Stage 6.5 pipeline adapter."""

    name = "TableCellReconstructor"

    def __init__(self, config: ParserConfig | None = None):
        self.config = config or DEFAULT_CONFIG

    def run(self, ctx: ParseContext) -> ParseContext:
        if not ctx.questions:
            ctx.add(self.name, "warn", "no questions")
            return ctx

        total_merges = 0
        tables_touched = 0
        agg = {"numericOk": 0, "numericN": 0, "currencyOk": 0, "currencyN": 0, "yearOk": 0, "yearN": 0}

        for cand in ctx.questions:
            tables = list(cand.tables) if cand.tables else ([] if not cand.table else [cand.table])
            for table in tables:
                if not table.cell_tokens:
                    # synthesize cell_tokens from rows if missing (shouldn't happen)
                    continue
                stats = reconstruct_table(table)
                tables_touched += 1
                total_merges += stats["merges"]
                for k in agg:
                    agg[k] += stats[k]
            if tables:
                cand.table = tables[0]
                cand.tables = tables

        ctx.meta_cell_recon = {
            "tablesTouched": tables_touched,
            "merges": total_merges,
            **agg,
        }
        ctx.add(
            self.name,
            "info",
            f"rebuilt {tables_touched} tables · merges={total_merges} · "
            f"numeric {agg['numericOk']}/{agg['numericN']} · "
            f"currency {agg['currencyOk']}/{agg['currencyN']} · "
            f"year {agg['yearOk']}/{agg['yearN']}",
        )
        return ctx
