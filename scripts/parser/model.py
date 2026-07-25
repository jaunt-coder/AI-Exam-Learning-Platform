"""Core data models for the new Parser Engine (Phase 1).

These dataclasses are the "AST substrate" that later stages build on:

    RawDocument       Stage 1 output (source resolved, kind, OCR decision)
    Span              one text run with FULL layout info (bbox/font/size/...)
    Page              one page = ordered spans + geometry
    LayoutDocument    Stage 2 output (the coordinate-preserving document)
    Token             Stage 3 substrate (typed token; classification is later)
    QuestionCandidate Stage 4 substrate (question boundary)
    ChoiceCandidate   Stage 5 substrate (choice boundary, incl. column)
    TableCandidate    Stage 6 substrate (table region)

Phase 1 populates RawDocument / Span / Page / LayoutDocument only.
Token/*Candidate are DEFINED here but produced by later stages.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

# (x0, y0, x1, y1) in PDF points, origin top-left.
BBox = tuple[float, float, float, float]


def union_bbox(boxes: list[BBox]) -> BBox | None:
    boxes = [b for b in boxes if b]
    if not boxes:
        return None
    return (
        min(b[0] for b in boxes),
        min(b[1] for b in boxes),
        max(b[2] for b in boxes),
        max(b[3] for b in boxes),
    )


def bbox_center(bbox: BBox) -> tuple[float, float]:
    return ((bbox[0] + bbox[2]) / 2.0, (bbox[1] + bbox[3]) / 2.0)


# ---------------------------------------------------------------------------
# Stage 1
# ---------------------------------------------------------------------------
@dataclass
class RawDocument:
    """Resolved source file + extraction routing decision (no content yet)."""

    year: int | None
    path: Path | None
    kind: str | None          # "pdf" | "hwp" | None
    exists: bool
    needs_ocr: bool = False
    page_count: int = 0
    note: str = ""


# ---------------------------------------------------------------------------
# Stage 2 substrate
# ---------------------------------------------------------------------------
@dataclass
class Span:
    """A single text run with complete layout provenance.

    Mirrors fitz `get_text("dict")` span, but keeps block/line context so the
    block→line→span hierarchy is losslessly reconstructable from a flat list.
    """

    text: str
    bbox: BBox
    font: str
    size: float
    flags: int                # fitz font flags (bit4 bold, bit1 italic, ...)
    color: int
    page_number: int          # LOGICAL page number (after dual-page split)
    block_index: int
    line_index: int
    span_index: int
    line_bbox: BBox | None = None
    block_bbox: BBox | None = None
    origin: tuple[float, float] | None = None   # text baseline origin
    source_bbox: BBox | None = None             # ORIGINAL physical-sheet bbox (pre-split)

    @property
    def x0(self) -> float:
        return self.bbox[0]

    @property
    def x1(self) -> float:
        return self.bbox[2]

    @property
    def y0(self) -> float:
        return self.bbox[1]

    @property
    def y1(self) -> float:
        return self.bbox[3]

    @property
    def center(self) -> tuple[float, float]:
        return bbox_center(self.bbox)

    @property
    def is_bold(self) -> bool:
        return bool(self.flags & 2 ** 4)

    @property
    def line_id(self) -> tuple[int, int]:
        return (self.block_index, self.line_index)


@dataclass
class Page:
    """One page of the document: geometry + ordered spans (+ image regions)."""

    number: int                              # LOGICAL page number (1..N sequential)
    width: float
    height: float
    spans: list[Span] = field(default_factory=list)
    image_bboxes: list[BBox] = field(default_factory=list)
    physical_number: int | None = None       # original PDF page (pre-split)
    logical_index: int = 0                    # 0/1 within a split physical sheet
    x_offset: float = 0.0                     # x translation applied at split

    @property
    def span_count(self) -> int:
        return len(self.spans)

    def lines(self) -> list[list[Span]]:
        """Regroup flat spans into lines by (block_index, line_index) order."""
        grouped: dict[tuple[int, int], list[Span]] = {}
        order: list[tuple[int, int]] = []
        for span in self.spans:
            key = span.line_id
            if key not in grouped:
                grouped[key] = []
                order.append(key)
            grouped[key].append(span)
        return [grouped[key] for key in order]

    def blocks(self) -> list[list[Span]]:
        grouped: dict[int, list[Span]] = {}
        order: list[int] = []
        for span in self.spans:
            if span.block_index not in grouped:
                grouped[span.block_index] = []
                order.append(span.block_index)
            grouped[span.block_index].append(span)
        return [grouped[key] for key in order]


@dataclass
class LayoutDocument:
    """Stage 2 output — the coordinate-preserving document.

    This replaces the legacy flat-string extraction. Everything downstream
    (Stage 3~6) reads geometry from here; no re-extraction needed.
    """

    source_path: str
    source_kind: str          # "pdf" | "hwp"
    used_ocr: bool
    page_count: int
    pages: list[Page] = field(default_factory=list)

    @property
    def span_count(self) -> int:
        return sum(page.span_count for page in self.pages)

    def iter_spans(self):
        for page in self.pages:
            yield from page.spans


# ---------------------------------------------------------------------------
# Stage 3 substrate (defined only; tokenizer implemented in a later phase)
# ---------------------------------------------------------------------------
class TokenType:
    """Token type vocabulary (Stage 3). Kept as plain string constants so tokens
    serialize trivially and compare cheaply."""

    NUMBER = "NUMBER"
    CURRENCY = "CURRENCY"
    QUANTITY = "QUANTITY"         # number fused with a count unit (400주, 10좌)
    YEAR = "YEAR"
    DATE = "DATE"
    PERCENT = "PERCENT"
    QUESTION_NUMBER = "QUESTION_NUMBER"
    CHOICE_MARKER = "CHOICE_MARKER"
    TEXT = "TEXT"
    TABLE_VALUE = "TABLE_VALUE"   # reserved for Stage 6
    RAW = "raw"                   # Phase 1 scaffolding only


# Types whose ORIGINAL content must never be altered by later stages.
IMMUTABLE_TYPES = frozenset(
    {
        TokenType.NUMBER,
        TokenType.CURRENCY,
        TokenType.QUANTITY,
        TokenType.YEAR,
        TokenType.DATE,
        TokenType.PERCENT,
        TokenType.TABLE_VALUE,
    }
)


@dataclass
class Token:
    """A typed, coordinate-anchored token.

    `text` is the faithfully reconstructed surface form (e.g. "450,000",
    "20×2", "8월 31일"). It is PRESERVED verbatim. `normalized` is an optional,
    non-inventive derivation (commas stripped, year glyph canonicalized) used
    for matching only. Immutable tokens must never have `text` rewritten by a
    later stage.
    """

    text: str
    type: str
    bbox: BBox
    page_number: int
    block_index: int
    line_index: int
    span_index: int = 0
    token_index: int = 0
    normalized: str | None = None
    unit: str | None = None       # semantic unit for QUANTITY/PERCENT/CURRENCY (주, %, 원, W)
    immutable: bool = False
    source_span_indices: list[int] = field(default_factory=list)

    @property
    def x0(self) -> float:
        return self.bbox[0]

    @property
    def y0(self) -> float:
        return self.bbox[1]

    @property
    def line_id(self) -> tuple[int, int, int]:
        return (self.page_number, self.block_index, self.line_index)


def iter_raw_tokens(layout: LayoutDocument) -> list[Token]:
    """Whitespace-split scaffolding so raw token counts are observable.

    NOTE: This performs NO classification and NO merging. The real typed
    Tokenizer lives in tokenizer.py (Stage 3). Retained only for the Phase 1
    demo's raw-token count.
    """
    tokens: list[Token] = []
    for span in layout.iter_spans():
        pieces = span.text.split()
        if not pieces:
            continue
        for offset, piece in enumerate(pieces):
            tokens.append(
                Token(
                    text=piece,
                    type=TokenType.RAW,
                    bbox=span.bbox,
                    page_number=span.page_number,
                    block_index=span.block_index,
                    line_index=span.line_index,
                    span_index=span.span_index,
                    token_index=offset,
                )
            )
    return tokens


# ---------------------------------------------------------------------------
# Stage 4/5/6 substrate (defined only; detectors implemented in later phases)
# ---------------------------------------------------------------------------
@dataclass
class QuestionCandidate:
    """Stage 4 substrate — a question boundary (number + owned spans)."""

    number: int | None
    page_number: int
    spans: list[Span] = field(default_factory=list)
    tokens: list["Token"] = field(default_factory=list)   # Stage 3 tokens owned by this question
    choices: list["ChoiceCandidate"] = field(default_factory=list)  # Stage 5
    stem_tokens: list["Token"] = field(default_factory=list)        # tokens before first choice
    table: "TableCandidate | None" = None                           # Stage 6 primary table
    tables: list["TableCandidate"] = field(default_factory=list)    # Stage 6 all tables
    semantic: object | None = None                                  # Stage 6.8 SemanticReport
    integrity: object | None = None                                 # Stage 6.9 IntegrityReport
    marker_span: Span | None = None
    bbox: BBox | None = None
    column: int | None = None   # 0=left, 1=right for 2-column layouts


@dataclass
class ChoiceCandidate:
    """Stage 5 substrate — one choice (marker + owned tokens/spans + column)."""

    marker: str | None                     # "①".."⑤" or None
    index: int | None = None               # 1..5
    tokens: list["Token"] = field(default_factory=list)
    spans: list[Span] = field(default_factory=list)
    bbox: BBox | None = None
    column: int | None = None
    layout_kind: str | None = None         # "inline" | "single" | "two-column" | "multiline"

    def text(self) -> str:
        return "".join(t.text for t in self.tokens).strip()


@dataclass
class TableCandidate:
    """Stage 6 substrate — a coordinate-reconstructed table (grid AST).

    `rows` is the canonical JSON grid (list of cell strings). Token provenance
    lives in `cell_tokens`. Markdown is a secondary view via `as_markdown()`.
    """

    bbox: BBox | None = None
    spans: list[Span] = field(default_factory=list)
    tokens: list["Token"] = field(default_factory=list)
    rows: list[list[str]] = field(default_factory=list)              # grid AST cells
    cell_tokens: list[list[list["Token"]]] = field(default_factory=list)
    column_x: list[float] = field(default_factory=list)              # detected column anchors
    source: str = "layout"                                           # "layout" | "ocr" | "hwp-marker"
    kind: str = "grid"                                               # "grid" | "journal" | "two-column"

    def as_dict(self) -> dict:
        """Canonical Stage 6 JSON structure (not markdown)."""
        return {"type": "grid", "rows": [list(r) for r in self.rows]}

    def as_markdown(self) -> str:
        """Secondary serialization only — never the primary store."""
        if not self.rows:
            return ""
        n = max((len(r) for r in self.rows), default=0)
        if n == 0:
            return ""
        lines = ["| " + " | ".join(r + [""] * (n - len(r))) + " |" for r in self.rows]
        if len(lines) >= 1:
            lines.insert(1, "| " + " | ".join("---" for _ in range(n)) + " |")
        return "\n".join(lines)

    @property
    def n_rows(self) -> int:
        return len(self.rows)

    @property
    def n_cols(self) -> int:
        return max((len(r) for r in self.rows), default=0)

    @property
    def n_cells(self) -> int:
        return sum(1 for r in self.rows for c in r if str(c).strip())
