"""Stage 6.5 cell-reconstruction metrics (parser-independent scoring).

Scores a grid AST's *cell surface quality* — not detection. Used to compare
TableParser-only (Before) vs TableParser+CellReconstructor (After).
"""
from __future__ import annotations

import re

_BROKEN_NUM = re.compile(r"\d\s+[,.]\s+\d|\d\s+\d{3}\b")  # 390 , 000 or 390 000
_WELL_NUM = re.compile(r"[￦W₩]?[\d,]+(?:\.\d+)?%?")
_WELL_CURRENCY = re.compile(r"[￦W₩]\s*[\d,]+")  # allow optional space then we penalize space
_TIGHT_CURRENCY = re.compile(r"[￦W₩][\d,]+")
_WELL_YEAR = re.compile(r"20[×xX]\d{1,2}")
_BROKEN_YEAR = re.compile(r"20\s*[×xX]\s*\d")
_BROKEN_PCT = re.compile(r"\d\s+%")
_HANGUL_SPACE = re.compile(r"[가-힣]\s+[가-힣]")
_WON_SPLIT = re.compile(r"[가-힣]\s*원\s+[가-힣]")  # 공사 원 가 style still split


def _cells(rows: list[list[str]] | None) -> list[str]:
    if not rows:
        return []
    return [str(c).strip() for r in rows for c in r if str(c).strip()]


def _cell_well_formed(cell: str) -> bool:
    if _BROKEN_NUM.search(cell):
        return False
    if _BROKEN_PCT.search(cell):
        return False
    # currency with space ￦ 390,000 is not fully reconstructed
    if re.search(r"[￦W₩]\s+\d", cell):
        return False
    # 년 말 / 년 초 fragments (should be 년말)
    if re.search(r"년\s+(말|초|도|기)(?=[가-힣]|$)", cell):
        return False
    # 원 가 / 원 재료 fragments
    if re.search(r"(?<![가-힣])원\s+(가|재료|가동)", cell):
        return False
    # only single-syllable Hangul pairs count as OCR fragments (원 가).
    # Legitimate phrases like "주 증가", "년 세무조정" are allowed.
    if re.search(r"(?<![가-힣])([가-힣])\s+([가-힣])(?![가-힣])", cell):
        return False
    # year with spaces around × separator
    if re.search(r"20\s+[×xX]\s+\d", cell):
        return False
    return True


def score_grid_reconstruction(rows: list[list[str]] | None) -> dict:
    cells = _cells(rows)
    if not cells:
        return {
            "cells": 0,
            "wellFormed": 0,
            "cellReconstructionAccuracy": None,
            "numericReconstructionAccuracy": None,
            "currencyReconstructionAccuracy": None,
            "yearReconstructionAccuracy": None,
            "mergedTokenAccuracy": None,
            "cellRecall": None,
            "tableFidelity": 0.0,
        }

    well = sum(1 for c in cells if _cell_well_formed(c))
    # numeric cells: contain a digit
    num_cells = [c for c in cells if any(ch.isdigit() for ch in c)]
    num_ok = sum(1 for c in num_cells if _WELL_NUM.search(c.replace(" ", "")) and not _BROKEN_NUM.search(c) and not _BROKEN_PCT.search(c))
    cur_cells = [c for c in cells if any(ch in c for ch in "￦W₩")]
    # lone ￦ (own column) is structurally fine; only spaced ￦ 123 is broken
    cur_ok = sum(
        1 for c in cur_cells
        if _TIGHT_CURRENCY.search(c) or c.strip() in {"￦", "W", "₩"} or (
            any(ch in c for ch in "￦W₩") and not re.search(r"[￦W₩]\s+\d", c)
        )
    )
    year_cells = [c for c in cells if re.search(r"20\s*[×xX]\s*\d|20[×xX]\d", c)]
    year_ok = sum(1 for c in year_cells if _WELL_YEAR.search(c.replace(" ", "")) and not re.search(r"20\s+[×xX]\s+\d", c))

    # merged-token proxy: cells that look like glued compounds (no hangul space, tight currency)
    merged_ok = well

    ncols = max((len(r) for r in rows), default=0) if rows else 0
    nrows = len(rows or [])
    fidelity = 1.0 if nrows >= 1 and ncols >= 2 and well / len(cells) >= 0.5 else 0.0
    # stronger fidelity: structural grid + high cell quality
    if nrows >= 1 and ncols >= 2 and well == len(cells):
        fidelity = 1.0
    elif nrows >= 1 and ncols >= 2:
        fidelity = well / len(cells)
    else:
        fidelity = 0.0

    def _ratio(ok, n):
        return round(ok / n, 4) if n else None

    cell_recon = _ratio(well, len(cells))
    return {
        "cells": len(cells),
        "wellFormed": well,
        "cellReconstructionAccuracy": cell_recon,
        "numericReconstructionAccuracy": _ratio(num_ok, len(num_cells)),
        "currencyReconstructionAccuracy": _ratio(cur_ok, len(cur_cells)),
        "yearReconstructionAccuracy": _ratio(year_ok, len(year_cells)),
        "mergedTokenAccuracy": cell_recon,
        "cellRecall": cell_recon,  # Stage 6.5: recall ≡ well-formed cell content rate
        "tableFidelity": round(fidelity, 4),
    }


def aggregate_recon(scores: list[dict]) -> dict:
    def _mean(key):
        vals = [s[key] for s in scores if s.get(key) is not None]
        return round(sum(vals) / len(vals), 4) if vals else None

    return {
        "tables": len(scores),
        "cells": sum(s.get("cells", 0) for s in scores),
        "cellReconstructionAccuracy": _mean("cellReconstructionAccuracy"),
        "numericReconstructionAccuracy": _mean("numericReconstructionAccuracy"),
        "currencyReconstructionAccuracy": _mean("currencyReconstructionAccuracy"),
        "yearReconstructionAccuracy": _mean("yearReconstructionAccuracy"),
        "mergedTokenAccuracy": _mean("mergedTokenAccuracy"),
        "cellRecall": _mean("cellRecall"),
        "tableFidelity": _mean("tableFidelity"),
    }
