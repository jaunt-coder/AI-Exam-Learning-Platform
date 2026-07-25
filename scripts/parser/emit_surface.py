"""Pure surface serialization helpers for Stage 7 (no AST mutation).

Rules (Emit Contract):
  - Do not alter Token.text
  - Do not trim / normalize / regex / repair content
  - Join only by geometry (same line gap → space; line change → newline)
  - Markdown cell '|' encoding is serialization only (not content repair)
"""
from __future__ import annotations

from model import Token, TokenType

# Gap (PDF points) above which adjacent same-line tokens get a single space.
_SAME_LINE_SPACE_GAP = 1.0


def token_geo_key(tok: Token) -> tuple:
    return (
        tok.page_number,
        tok.block_index,
        tok.line_index,
        tok.span_index,
        tok.text,
        tok.type,
    )


def table_token_keys(table) -> set[tuple]:
    """Identity keys for tokens owned by a table (for stem exclusion)."""
    keys: set[tuple] = set()
    if table is None:
        return keys
    for tok in table.tokens or []:
        keys.add(token_geo_key(tok))
        keys.add(("id", id(tok)))
    for row in table.cell_tokens or []:
        for cell in row:
            for tok in cell:
                keys.add(token_geo_key(tok))
                keys.add(("id", id(tok)))
    return keys


def filter_stem_tokens(stem_tokens: list[Token], table) -> list[Token]:
    """Return stem tokens not belonging to the primary table (read-only filter)."""
    if not table:
        return list(stem_tokens or [])
    owned = table_token_keys(table)
    out: list[Token] = []
    for tok in stem_tokens or []:
        if ("id", id(tok)) in owned or token_geo_key(tok) in owned:
            continue
        out.append(tok)
    return out


def filter_choice_body_tokens(tokens: list[Token]) -> list[Token]:
    """Drop CHOICE_MARKER tokens; keep body tokens in order."""
    return [t for t in (tokens or []) if t.type != TokenType.CHOICE_MARKER]


def join_tokens_by_geometry(tokens: list[Token]) -> str:
    """Concatenate token.text using only bbox/line geometry for separators."""
    if not tokens:
        return ""
    parts: list[str] = []
    prev: Token | None = None
    for tok in tokens:
        if prev is None:
            parts.append(tok.text)
            prev = tok
            continue
        same_page = prev.page_number == tok.page_number
        same_line = same_page and prev.line_id == tok.line_id
        if same_line:
            gap = tok.x0 - prev.bbox[2]
            if gap > _SAME_LINE_SPACE_GAP:
                parts.append(" ")
            parts.append(tok.text)
        else:
            parts.append("\n")
            parts.append(tok.text)
        prev = tok
    return "".join(parts)


def encode_markdown_cell(text: str) -> str:
    """Serialize a cell for markdown. Encodes '|' only; does not alter meaning."""
    if text is None:
        return ""
    out: list[str] = []
    for ch in text:
        if ch == "|":
            out.append("\\|")
        elif ch == "\n":
            out.append(" ")
        else:
            out.append(ch)
    return "".join(out)


def rows_to_markdown(rows: list[list[str]]) -> str:
    """Build GitHub-style markdown table from a grid (serialization only)."""
    if not rows:
        return ""
    width = 0
    for row in rows:
        if len(row) > width:
            width = len(row)
    if width == 0:
        return ""
    lines: list[str] = []
    for row in rows:
        cells = list(row)
        while len(cells) < width:
            cells.append("")
        encoded = [encode_markdown_cell(c if c is not None else "") for c in cells]
        lines.append("| " + " | ".join(encoded) + " |")
    # separator after first row (Frontend contract)
    sep = "| " + " | ".join("---" for _ in range(width)) + " |"
    lines.insert(1, sep)
    return "\n".join(lines)


def token_to_provenance(tok: Token) -> dict:
    return {
        "text": tok.text,
        "type": tok.type,
        "page": tok.page_number,
        "bbox": list(tok.bbox) if tok.bbox else None,
        "block": tok.block_index,
        "line": tok.line_index,
        "span": tok.span_index,
        "immutable": bool(tok.immutable),
        "unit": tok.unit,
    }
