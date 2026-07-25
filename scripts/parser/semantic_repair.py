"""Stage 6.7 — Semantic Repair (explicit mutate pass).

General geometry/meaning repairs that MUST run before pure Semantic Validation.
This stage is allowed to mutate table cell text / membership within existing
row/column counts. It must NEVER invent numbers, years, or new grid geometry.

Forbidden:
    year == …, questionId == …, page == …, question-number hardcoding.
"""
from __future__ import annotations

import re

from config import DEFAULT_CONFIG, ParserConfig
from context import ParseContext
from model import QuestionCandidate, TableCandidate, Token, TokenType

YEAR_CELL_RE = re.compile(
    r"^20\s*[×xX]\s*\d{1,2}(?:\s*년)?(?:말|초|도|기)?$"
)
YEAR_TOKEN_RE = re.compile(r"20[×xX]\d{1,2}")
NUMBER_RE = re.compile(r"\d")
ORPHAN_UNITS = frozenset({"￦", "W", "₩", "원", "주", "%", "％", "좌", "계약"})


def _grid(table: TableCandidate) -> list[list[str]]:
    return [[str(c).strip() if c is not None else "" for c in row] for row in table.rows]


def _cell_has_number(text: str) -> bool:
    return bool(NUMBER_RE.search(text or ""))


def _is_year_cell(text: str) -> bool:
    t = (text or "").replace(" ", "")
    return bool(YEAR_CELL_RE.match(t)) or bool(YEAR_TOKEN_RE.fullmatch(t))


def _cell_has_amount(text: str) -> bool:
    if not _cell_has_number(text):
        return False
    if _is_year_cell(text):
        return False
    return True


def _nearest_number_cell(
    grid: list[list[str]], ri: int, ci: int, max_dist: int = 2
) -> tuple[int, int] | None:
    """Nearest cell with a digit within Chebyshev distance (row/col)."""
    nrows = len(grid)
    ncols = max((len(r) for r in grid), default=0)
    best: tuple[int, int] | None = None
    best_key: tuple[int, int] | None = None
    for rr in range(max(0, ri - max_dist), min(nrows, ri + max_dist + 1)):
        for cc in range(max(0, ci - max_dist), min(ncols, ci + max_dist + 1)):
            if rr == ri and cc == ci:
                continue
            if cc >= len(grid[rr]):
                continue
            if not _cell_has_number(grid[rr][cc]):
                continue
            d = max(abs(rr - ri), abs(cc - ci))
            if d > max_dist:
                continue
            tie = 0 if (rr == ri or cc == ci) else 1
            key = (d, tie)
            if best_key is None or key < best_key:
                best = (rr, cc)
                best_key = key
    return best


def repair_orphan_units(table: TableCandidate) -> int:
    """Attach lone unit cells (￦/원/주/%) to a nearby NUMBER cell.

    Geometry (n_rows / n_cols) is unchanged — only cell text moves within the
    existing grid. Search: Chebyshev distance ≤ 2, preferring same row/col.
    Returns the number of attachments performed.
    """
    if not table.rows:
        return 0
    grid = _grid(table)
    ncols = max(len(r) for r in grid)
    for r in grid:
        while len(r) < ncols:
            r.append("")
    moved = 0

    for ri in range(len(grid)):
        for ci in range(ncols):
            unit = grid[ri][ci].strip()
            if unit not in ORPHAN_UNITS:
                continue
            target = _nearest_number_cell(grid, ri, ci, max_dist=2)
            if target is None:
                continue
            tr, tc = target
            num = grid[tr][tc]
            if unit in {"￦", "W", "₩"}:
                if num[:1] not in {"￦", "W", "₩"}:
                    grid[tr][tc] = unit + num
            else:
                if unit not in num:
                    grid[tr][tc] = num + unit
            grid[ri][ci] = ""
            if table.cell_tokens and ri < len(table.cell_tokens) and ci < len(table.cell_tokens[ri]):
                orphans = table.cell_tokens[ri][ci]
                table.cell_tokens[ri][ci] = []
                if tr < len(table.cell_tokens) and tc < len(table.cell_tokens[tr]):
                    if unit in {"￦", "W", "₩"}:
                        table.cell_tokens[tr][tc] = list(orphans) + list(
                            table.cell_tokens[tr][tc]
                        )
                    else:
                        table.cell_tokens[tr][tc] = list(
                            table.cell_tokens[tr][tc]
                        ) + list(orphans)
            moved += 1

    table.rows = grid
    if moved and table.cell_tokens:
        flat: list[Token] = []
        for row in table.cell_tokens:
            for cell in row:
                flat.extend(cell)
        table.tokens = flat
    return moved


def prune_degenerate_tables(cand: QuestionCandidate) -> int:
    """Remove clearly non-table grids (year-only / no amounts, ≤2 rows)."""
    tables = list(cand.tables) if cand.tables else ([] if not cand.table else [cand.table])
    kept: list[TableCandidate] = []
    removed = 0
    for table in tables:
        grid = _grid(table)
        has_amount = any(_cell_has_amount(c) for row in grid for c in row)
        cells = [c for row in grid for c in row if c.strip()]
        if not cells:
            removed += 1
            continue
        if has_amount:
            kept.append(table)
            continue
        yearish = sum(
            1
            for c in cells
            if _is_year_cell(c) or c.strip() in {".", ",", "-", "?", "년", "월", "일", "○", "( )"}
        )
        if len(grid) <= 2 and yearish >= max(1, len(cells) // 2):
            removed += 1
            continue
        if not has_amount and yearish == len(cells):
            removed += 1
            continue
        kept.append(table)
    cand.tables = kept
    cand.table = kept[0] if kept else None
    return removed


class SemanticRepair:
    """Stage 6.7 pipeline adapter — explicit mutate pass before validation."""

    name = "SemanticRepair"

    def __init__(self, config: ParserConfig | None = None):
        self.config = config or DEFAULT_CONFIG

    def run(self, ctx: ParseContext) -> ParseContext:
        if not ctx.questions:
            ctx.add(self.name, "warn", "no questions")
            return ctx

        repairs = 0
        pruned = 0
        for cand in ctx.questions:
            pruned += prune_degenerate_tables(cand)
            tables = list(cand.tables) if cand.tables else ([] if not cand.table else [cand.table])
            for table in tables:
                repairs += repair_orphan_units(table)
            if tables:
                cand.table = tables[0]
                cand.tables = tables
            else:
                cand.table = None
                cand.tables = []

        ctx.meta_repair = {
            "orphanRepairs": repairs,
            "degenerateTablesPruned": pruned,
            "questionCount": len(ctx.questions),
        }
        ctx.add(
            self.name,
            "info",
            f"orphan repairs={repairs} · degenerate tables pruned={pruned}",
        )
        return ctx
