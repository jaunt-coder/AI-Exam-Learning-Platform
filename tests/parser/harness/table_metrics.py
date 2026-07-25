"""Parser-independent table metrics for Stage 6 regression.

Expected-table set uses the same signals as Phase 0 (`hasTable` / TABLE_KEYWORDS).
After side consumes the new grid AST; Before side consumes MVP markdown/string.
"""
from __future__ import annotations

import re

from .metrics import TABLE_KEYWORDS, _table_well_formed
from .tokens import extract_numbers

_NUM_RE = re.compile(r"\d[\d,]*\.?\d*")


def table_expected(record: dict, source_body: str = "") -> bool:
    if record.get("hasTable"):
        return True
    body = source_body or (record.get("originalQuestion") or record.get("question") or "")
    return sum(1 for kw in TABLE_KEYWORDS if kw in body) >= 2


def _grid_from_after(table_obj) -> list[list[str]] | None:
    """Accept TableCandidate, dict, or None."""
    if table_obj is None:
        return None
    if hasattr(table_obj, "as_dict"):
        d = table_obj.as_dict()
        rows = d.get("rows") or []
        return rows if rows else None
    if isinstance(table_obj, dict):
        rows = table_obj.get("rows") or []
        return rows if rows else None
    return None


def _grid_from_before(record: dict) -> list[list[str]] | None:
    """Best-effort grid from MVP markdown / tab text (Before)."""
    table = (record.get("table") or "").strip()
    if not table:
        return None
    lines = [ln.strip() for ln in table.splitlines() if ln.strip()]
    rows: list[list[str]] = []
    for ln in lines:
        flat = ln.replace(" ", "")
        if flat.startswith("|---") or flat.startswith("|-"):
            continue
        if ln.startswith("|") and ln.endswith("|"):
            cells = [c.strip() for c in ln.strip("|").split("|")]
            rows.append(cells)
        elif "\t" in ln:
            rows.append([c.strip() for c in ln.split("\t")])
        elif "  " in ln:
            rows.append([c.strip() for c in re.split(r"\s{2,}", ln) if c.strip()])
    return rows or None


def _nonempty_cells(rows: list[list[str]]) -> list[str]:
    return [c.strip() for r in rows for c in r if str(c).strip()]


def _numbers_in_grid(rows: list[list[str]]) -> set[str]:
    found: set[str] = set()
    for cell in _nonempty_cells(rows):
        for m in _NUM_RE.findall(cell):
            found.add(m.replace(",", ""))
    return found


def score_table(
    *,
    expected: bool,
    before_rows: list[list[str]] | None,
    after_rows: list[list[str]] | None,
    stem_numbers: list[str] | None = None,
) -> dict:
    """Per-question table metrics."""
    before_ok = bool(before_rows) and len(before_rows) >= 1 and max(len(r) for r in before_rows) >= 2
    after_ok = bool(after_rows) and len(after_rows) >= 1 and max(len(r) for r in after_rows) >= 2

    # detection
    detected_before = 1.0 if before_ok else 0.0
    detected_after = 1.0 if after_ok else 0.0

    # row / column accuracy (structural)
    def _row_acc(rows):
        if not rows:
            return 0.0
        return 1.0 if len(rows) >= 1 else 0.0

    def _col_acc(rows):
        if not rows:
            return 0.0
        ncols = max(len(r) for r in rows)
        # consistent width
        consistent = all(len(r) == ncols for r in rows)
        return 1.0 if ncols >= 2 and consistent else 0.0

    # cell recall: of stem numbers that look tabular, how many appear in grid
    stem_nums = [n.replace(",", "") for n in (stem_numbers or [])]
    after_nums = _numbers_in_grid(after_rows) if after_rows else set()
    before_nums = _numbers_in_grid(before_rows) if before_rows else set()
    # When stem has many prose numbers, recall uses intersection with grid numbers
    # as coverage of whatever the grid captured vs stem (upper-bounded).
    def _cell_recall(grid_nums: set[str]) -> float | None:
        if not expected:
            return None
        if not stem_nums:
            return 1.0 if grid_nums else 0.0
        # numbers present in BOTH stem and a well-formed table count as recovered
        if not grid_nums:
            return 0.0
        hit = sum(1 for n in stem_nums if n in grid_nums)
        # normalize by min(stem, grid) to avoid punishing prose numbers
        denom = max(min(len(stem_nums), len(grid_nums)), 1)
        return min(1.0, hit / denom)

    in_universe = expected or before_ok or after_ok
    fidelity_before = 1.0 if before_ok else (0.0 if in_universe else None)
    fidelity_after = 1.0 if after_ok else (0.0 if in_universe else None)

    return {
        "expected": expected,
        "detectedBefore": detected_before,
        "detectedAfter": detected_after,
        "cellRecallBefore": _cell_recall(before_nums) if in_universe else None,
        "cellRecallAfter": _cell_recall(after_nums) if in_universe else None,
        "rowAccuracyBefore": _row_acc(before_rows) if in_universe else None,
        "rowAccuracyAfter": _row_acc(after_rows) if in_universe else None,
        "columnAccuracyBefore": _col_acc(before_rows) if in_universe else None,
        "columnAccuracyAfter": _col_acc(after_rows) if in_universe else None,
        "fidelityBefore": fidelity_before,
        "fidelityAfter": fidelity_after,
        "beforeRows": len(before_rows or []),
        "beforeCols": max((len(r) for r in before_rows), default=0) if before_rows else 0,
        "afterRows": len(after_rows or []),
        "afterCols": max((len(r) for r in after_rows), default=0) if after_rows else 0,
        "afterCells": len(_nonempty_cells(after_rows)) if after_rows else 0,
    }


def aggregate_table_scores(scores: list[dict]) -> dict:
    # Union set: keyword/hasTable OR either side produced a table.
    # This avoids punishing After for recovering geometry that MVP never flagged,
    # and avoids punishing Before for markdown-only tables without clear PDF grid.
    universe = [
        s for s in scores
        if s["expected"] or s.get("detectedBefore") or s.get("detectedAfter")
        or s.get("afterRows", 0) > 0 or s.get("beforeRows", 0) > 0
    ]
    exp = [s for s in scores if s["expected"]]
    geo = [s for s in scores if s.get("afterRows", 0) > 0]

    def _mean(key, subset):
        vals = [s[key] for s in subset if s.get(key) is not None]
        return round(sum(vals) / len(vals), 4) if vals else None

    return {
        "expectedCount": len(exp),
        "universeCount": len(universe),
        "detectionRecallBefore": _mean("detectedBefore", universe),
        "detectionRecallAfter": _mean("detectedAfter", universe),
        "cellRecallBefore": _mean("cellRecallBefore", universe),
        "cellRecallAfter": _mean("cellRecallAfter", universe),
        "rowAccuracyBefore": _mean("rowAccuracyBefore", universe),
        "rowAccuracyAfter": _mean("rowAccuracyAfter", universe),
        "columnAccuracyBefore": _mean("columnAccuracyBefore", universe),
        "columnAccuracyAfter": _mean("columnAccuracyAfter", universe),
        "fidelityBefore": _mean("fidelityBefore", universe),
        "fidelityAfter": _mean("fidelityAfter", universe),
        "geometricDetections": len(geo),
        "geometricFidelity": _mean("fidelityAfter", geo),
        "keywordDetectionAfter": _mean("detectedAfter", exp),
        "keywordDetectionBefore": _mean("detectedBefore", exp),
    }


# re-export for harness consumers
__all__ = [
    "table_expected",
    "_grid_from_after",
    "_grid_from_before",
    "score_table",
    "aggregate_table_scores",
    "_table_well_formed",
    "extract_numbers",
]
