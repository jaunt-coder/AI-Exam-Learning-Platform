"""Stage 6 — Table Parser.

Reconstructs tables as grid AST from token coordinates (never regex, never
string-join flattening of the whole region).

Pipeline position:
    DualPage -> FooterRule -> Tokenizer -> QuestionBoundary -> ChoiceBoundary
    -> TableParser

Detection (geometry only):
    - Row  = tokens sharing a y-band (tolerance from font size)
    - Cell = x-adjacent tokens within a row (gap threshold from font size)
    - Col  = x-anchor cluster across multi-cell rows (no fixed column count)

Supported shapes (by geometry, not by question id):
    현가계수표, 재고/리스/정부보조금 금액표, 연도 비교표, 좌우 2열 숫자표,
    분개(차변|대변) 1행 2열.

Output:
    QuestionCandidate.table  = TableCandidate (primary)
    QuestionCandidate.tables = list[TableCandidate]
    TableCandidate.as_dict() -> {"type":"grid","rows":[[:str]]}
"""
from __future__ import annotations

import statistics

from config import DEFAULT_CONFIG, ParserConfig
from context import ParseContext
from model import QuestionCandidate, TableCandidate, Token, TokenType, union_bbox

VALUE_TYPES = frozenset(
    {
        TokenType.NUMBER,
        TokenType.CURRENCY,
        TokenType.YEAR,
        TokenType.PERCENT,
        TokenType.QUANTITY,
        TokenType.DATE,
        TokenType.TABLE_VALUE,
    }
)

# Row y-band = median token height * ROW_BAND_FACTOR
ROW_BAND_FACTOR = 0.55
# Intra-row cell split when gap > median height * CELL_GAP_FACTOR
CELL_GAP_FACTOR = 1.35
MIN_CELL_GAP = 10.0
# Column x-cluster tolerance
COL_CLUSTER_TOL = 22.0
# Vertical gap that breaks a contiguous table region (× median row height)
REGION_GAP_FACTOR = 2.8
MIN_COLS = 2
MIN_DATA_ROWS = 2          # general grids
MIN_VALUE_CELLS_REGION = 3 # at least this many value-bearing cells in a region


def _token_height(t: Token) -> float:
    return max(t.bbox[3] - t.bbox[1], 6.0)


def _cluster_rows(tokens: list[Token]) -> list[list[Token]]:
    ordered = sorted(tokens, key=lambda t: (t.y0, t.x0))
    if not ordered:
        return []
    heights = [_token_height(t) for t in ordered]
    band = max(statistics.median(heights) * ROW_BAND_FACTOR, 3.0)
    rows: list[list[Token]] = [[ordered[0]]]
    last_y = ordered[0].y0
    for t in ordered[1:]:
        if abs(t.y0 - last_y) <= band:
            rows[-1].append(t)
        else:
            rows.append([t])
            last_y = t.y0
    return rows


def _segment_cells(row: list[Token]) -> list[list[Token]]:
    row = sorted(row, key=lambda t: t.x0)
    if not row:
        return []
    heights = [_token_height(t) for t in row]
    gap_lim = max(statistics.median(heights) * CELL_GAP_FACTOR, MIN_CELL_GAP)
    cells: list[list[Token]] = [[row[0]]]
    for t in row[1:]:
        prev = cells[-1][-1]
        if t.x0 - prev.bbox[2] <= gap_lim:
            cells[-1].append(t)
        else:
            cells.append([t])
    return cells


def _cell_text(tokens: list[Token]) -> str:
    """Join cell tokens preserving original surfaces (no invented content)."""
    if not tokens:
        return ""
    parts: list[str] = []
    for i, t in enumerate(tokens):
        if i > 0:
            prev = tokens[i - 1]
            gap = t.x0 - prev.bbox[2]
            # tiny gap → glue; larger → single space (layout whitespace only)
            if gap > max(_token_height(t) * 0.35, 2.5):
                parts.append(" ")
        parts.append(t.text)
    return "".join(parts).strip()


def _cell_x(cell: list[Token]) -> float:
    return min(t.x0 for t in cell)


def _cell_has_value(cell: list[Token]) -> bool:
    return any(t.type in VALUE_TYPES for t in cell)


def _cluster_columns(xs: list[float], tol: float = COL_CLUSTER_TOL) -> list[float]:
    if not xs:
        return []
    ordered = sorted(xs)
    groups: list[list[float]] = [[ordered[0]]]
    for x in ordered[1:]:
        if abs(x - statistics.mean(groups[-1])) <= tol:
            groups[-1].append(x)
        else:
            groups.append([x])
    return [statistics.mean(g) for g in groups]


def _assign_col(x: float, anchors: list[float]) -> int:
    return min(range(len(anchors)), key=lambda i: abs(anchors[i] - x))


def _hangul_len(text: str) -> int:
    return sum(1 for ch in text if "가" <= ch <= "힣")


def _is_journal_row(cells: list[list[Token]]) -> bool:
    """분개 표: 명시적 차변|대변 2열만 (느슨한 gap 휴리스틱은 산문 오탐)."""
    if len(cells) < 2:
        return False
    joined = " ".join(_cell_text(c) for c in cells)
    return "차변" in joined and "대변" in joined


def _is_two_col_numeric_row(cells: list[list[Token]]) -> bool:
    """좌우 2열 숫자표 1행: 양쪽이 값 중심이고 긴 산문이 아님."""
    if len(cells) != 2:
        return False
    for c in cells:
        if not _cell_has_value(c):
            return False
        if _hangul_len(_cell_text(c)) > 8:
            return False
    gap = cells[1][0].x0 - cells[0][-1].bbox[2]
    return gap >= 36.0


def _is_data_row(record: dict) -> bool:
    """Column anchors come from short value cells, not long header labels.

    A data row has ≥2 cells that are value-bearing and mostly numeric/short
    (현가계수 0.8929, 기간 1, 12% …). Header rows like '단일금액￦1의 현재가치'
    contain a NUMBER but are Hangul-heavy and must not create phantom columns.
    """
    short_vals = 0
    for cell in record["cells"]:
        text = _cell_text(cell)
        if not _cell_has_value(cell):
            continue
        if _hangul_len(text) <= 4 and len(text) <= 18:
            short_vals += 1
    return short_vals >= MIN_COLS


def _row_text(record: dict) -> str:
    return " ".join(_cell_text(c) for c in record["cells"])


def _is_prose_row(record: dict) -> bool:
    """Long narrative lines that must never join a table region."""
    text = _row_text(record)
    h = _hangul_len(text)
    # single-cell stem leftovers ("않는다.)", long sentences)
    if record["n_cells"] <= 1 and record["n_values"] == 0:
        if h >= 8:
            return True
        if h >= 3 and (text.endswith(("다.", "다.)", "다)", "까?", "가?")) or ")." in text):
            return True
    if record["n_cells"] <= 1 and h >= 14:
        return True
    # multi-cell but almost no values and very long Hangul → stem bleed
    if record["n_values"] == 0 and h >= 24:
        return True
    return False


def _is_headerish_row(record: dict, anchors: list[float]) -> bool:
    """Short label / column-header row sitting just above the data block."""
    if _is_prose_row(record):
        return False
    text = _row_text(record)
    if record["n_cells"] >= 2 and _hangul_len(text) <= 40:
        return True
    if record["n_cells"] == 1 and anchors:
        x = record["xs"][0]
        near = min(abs(x - a) for a in anchors) <= COL_CLUSTER_TOL * 1.5
        return near and _hangul_len(text) <= 12 and len(text) <= 24
    return False


class TableParser:
    """Stage 6 — coordinate-based table → grid AST."""

    name = "TableParser"

    def __init__(self, config: ParserConfig | None = None):
        self.config = config or DEFAULT_CONFIG

    def _stem_tokens(self, cand: QuestionCandidate) -> list[Token]:
        toks = list(cand.stem_tokens) if cand.stem_tokens else []
        if not toks:
            # fallback: everything before first choice marker
            for t in cand.tokens:
                if t.type == TokenType.CHOICE_MARKER:
                    break
                toks.append(t)
        return [t for t in toks if t.type != TokenType.QUESTION_NUMBER and t.text.strip()]

    def _row_records(self, tokens: list[Token]) -> list[dict]:
        out = []
        for row_toks in _cluster_rows(tokens):
            cells = _segment_cells(row_toks)
            out.append(
                {
                    "tokens": row_toks,
                    "cells": cells,
                    "y": statistics.mean(t.y0 for t in row_toks),
                    "n_cells": len(cells),
                    "n_values": sum(1 for c in cells if _cell_has_value(c)),
                    "xs": [_cell_x(c) for c in cells],
                }
            )
        return out

    def _find_regions(self, records: list[dict]) -> list[tuple[int, int]]:
        """Return (start, end) inclusive index ranges of table-like row runs."""
        if not records:
            return []
        heights = []
        for r in records:
            for t in r["tokens"]:
                heights.append(_token_height(t))
        row_h = statistics.median(heights) if heights else 12.0
        max_gap = row_h * REGION_GAP_FACTOR

        # Mark rows that can participate in a table
        eligible = []
        for i, r in enumerate(records):
            multi = r["n_cells"] >= MIN_COLS
            journal = _is_journal_row(r["cells"])
            two_num = _is_two_col_numeric_row(r["cells"])
            eligible.append(multi or journal or two_num)

        regions: list[tuple[int, int]] = []
        i = 0
        n = len(records)
        while i < n:
            if not eligible[i]:
                i += 1
                continue
            start = i
            j = i
            while j + 1 < n:
                gap = records[j + 1]["y"] - records[j]["y"]
                if gap > max_gap:
                    break
                nxt = records[j + 1]
                if _is_prose_row(nxt):
                    break
                if eligible[j + 1]:
                    j += 1
                    continue
                # allow one short headerish spacer between data rows
                if (
                    nxt["n_cells"] >= 1
                    and _hangul_len(_row_text(nxt)) <= 16
                    and j + 2 < n
                    and eligible[j + 2]
                    and (records[j + 2]["y"] - nxt["y"]) <= max_gap
                    and not _is_prose_row(records[j + 2])
                ):
                    j += 1
                    continue
                break
            regions.append((start, j))
            i = j + 1
        return regions

    def _accept_region(self, records: list[dict], start: int, end: int) -> tuple[bool, str]:
        slice_ = records[start : end + 1]
        multi_rows = [r for r in slice_ if r["n_cells"] >= MIN_COLS]
        journal_rows = [r for r in slice_ if _is_journal_row(r["cells"])]
        two_num_rows = [r for r in slice_ if _is_two_col_numeric_row(r["cells"])]
        value_cells = sum(r["n_values"] for r in slice_)

        # Journal (차변|대변) — even a single row
        if journal_rows and value_cells >= 2:
            return True, "journal"

        # Single-row 2-col numeric (연도/금액 비교 헤더만 있는 경우 등)
        if len(slice_) == 1 and two_num_rows and value_cells >= 2:
            return True, "two-column"

        if len(multi_rows) < MIN_DATA_ROWS:
            # multi-row region that is only two-col numeric rows
            if len(two_num_rows) >= 2 and value_cells >= 2:
                return True, "two-column"
            return False, ""

        # Column stability from DATA rows only (short values). Header labels
        # that embed a currency/number must not invent extra x-anchors.
        data_rows = [r for r in multi_rows if _is_data_row(r)] or multi_rows
        xs = [x for r in data_rows for x in r["xs"]]
        anchors = _cluster_columns(xs)
        if len(anchors) < MIN_COLS:
            return False, ""
        hits = [0] * len(anchors)
        for r in data_rows:
            seen = set()
            for x in r["xs"]:
                ci = _assign_col(x, anchors)
                seen.add(ci)
            for ci in seen:
                hits[ci] += 1
        stable = sum(1 for h in hits if h >= 2)
        if stable < MIN_COLS:
            return False, ""
        if value_cells < MIN_VALUE_CELLS_REGION:
            return False, ""
        return True, "grid"

    def _expand_headers(self, records: list[dict], start: int, end: int) -> int:
        """Pull in immediately preceding HEADER rows (never prose stem)."""
        multi = [r for r in records[start : end + 1] if r["n_cells"] >= MIN_COLS]
        if not multi:
            return start
        data_rows = [r for r in multi if _is_data_row(r)] or multi
        xs = [x for r in data_rows for x in r["xs"]]
        anchors = _cluster_columns(xs)
        if len(anchors) < 2:
            return start
        heights = [_token_height(t) for r in records[start : end + 1] for t in r["tokens"]]
        max_gap = (statistics.median(heights) if heights else 12.0) * REGION_GAP_FACTOR
        s = start
        while s > 0:
            prev = records[s - 1]
            gap = records[s]["y"] - prev["y"]
            if gap > max_gap:
                break
            if not _is_headerish_row(prev, anchors):
                break
            s -= 1
        return s

    def _trim_prose(self, records: list[dict], start: int, end: int) -> tuple[int, int]:
        while start <= end and _is_prose_row(records[start]):
            start += 1
        while end >= start and _is_prose_row(records[end]):
            end -= 1
        # drop leading zero-value fragments that are not column headers
        while start <= end:
            r = records[start]
            if _is_data_row(r) or _is_journal_row(r["cells"]) or _is_two_col_numeric_row(r["cells"]):
                break
            if _is_headerish_row(r, _cluster_columns([x for rr in records[start:end+1] if _is_data_row(rr) for x in rr["xs"]] or r["xs"])):
                break
            if r["n_values"] == 0:
                start += 1
                continue
            break
        return start, end

    def _build_table(self, records: list[dict], start: int, end: int, kind: str) -> TableCandidate | None:
        slice_ = records[start : end + 1]
        multi = [r for r in slice_ if r["n_cells"] >= MIN_COLS]
        # Anchors from short-value DATA rows; headers snap to nearest col
        data_rows = [r for r in multi if _is_data_row(r)]
        xs = [x for r in (data_rows or multi) for x in r["xs"]]
        if not xs:
            xs = [x for r in slice_ for x in r["xs"]]
        anchors = _cluster_columns(xs)
        if len(anchors) < MIN_COLS:
            return None

        grid_rows: list[list[str]] = []
        cell_tokens: list[list[list[Token]]] = []
        all_tokens: list[Token] = []
        for r in slice_:
            if _is_prose_row(r):
                continue
            row_cells = [""] * len(anchors)
            row_tok: list[list[Token]] = [[] for _ in anchors]
            for cell in r["cells"]:
                ci = _assign_col(_cell_x(cell), anchors)
                text = _cell_text(cell)
                if row_cells[ci]:
                    # same column collision — append with space (rare; keep both)
                    row_cells[ci] = row_cells[ci] + " " + text
                else:
                    row_cells[ci] = text
                row_tok[ci].extend(cell)
                all_tokens.extend(cell)
            grid_rows.append(row_cells)
            cell_tokens.append(row_tok)

        # Trim leading/trailing fully-empty columns
        if grid_rows:
            ncols = len(anchors)
            keep = [
                i for i in range(ncols)
                if any((grid_rows[r][i] or "").strip() for r in range(len(grid_rows)))
            ]
            if keep and len(keep) < ncols:
                grid_rows = [[row[i] for i in keep] for row in grid_rows]
                cell_tokens = [[row[i] for i in keep] for row in cell_tokens]
                anchors = [anchors[i] for i in keep]

        # Reject degenerate (single non-empty column after trim)
        if len(anchors) < MIN_COLS:
            return None

        bbox = union_bbox([t.bbox for t in all_tokens])
        return TableCandidate(
            bbox=bbox,
            tokens=all_tokens,
            rows=grid_rows,
            cell_tokens=cell_tokens,
            column_x=[round(a, 1) for a in anchors],
            source="layout",
            kind=kind,
        )

    def detect_for_question(self, cand: QuestionCandidate) -> list[TableCandidate]:
        tokens = self._stem_tokens(cand)
        if len(tokens) < 4:
            return []
        records = self._row_records(tokens)
        regions = self._find_regions(records)
        tables: list[TableCandidate] = []
        for start, end in regions:
            start = self._expand_headers(records, start, end)
            start, end = self._trim_prose(records, start, end)
            if start > end:
                continue
            ok, kind = self._accept_region(records, start, end)
            if not ok:
                continue
            table = self._build_table(records, start, end, kind)
            if table and table.n_rows >= 1 and table.n_cols >= MIN_COLS:
                tables.append(table)
        return tables

    def run(self, ctx: ParseContext) -> ParseContext:
        if not ctx.questions:
            ctx.add(self.name, "warn", "no questions")
            return ctx

        detected = 0
        total_cells = 0
        kinds: dict[str, int] = {}
        for cand in ctx.questions:
            tables = self.detect_for_question(cand)
            cand.tables = tables
            cand.table = tables[0] if tables else None
            if tables:
                detected += 1
                for t in tables:
                    total_cells += t.n_cells
                    kinds[t.kind] = kinds.get(t.kind, 0) + 1

        ctx.meta_table = {
            "questionsWithTable": detected,
            "tablesDetected": sum(len(c.tables) for c in ctx.questions),
            "cellsDetected": total_cells,
            "kinds": kinds,
        }
        ctx.add(
            self.name,
            "info",
            f"tables in {detected}/{len(ctx.questions)} questions · "
            f"{ctx.meta_table['tablesDetected']} tables · {total_cells} cells · kinds={kinds}",
        )
        return ctx
