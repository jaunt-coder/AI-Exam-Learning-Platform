#!/usr/bin/env python3
"""Phase 6.5 regression — Table Cell Reconstruction.

Before : TableParser only          (build_parse(..., reconstruct_cells=False))
After  : TableParser + CellRecon   (build_parse(..., reconstruct_cells=True))

Row/Column/Cell membership is identical; only cell surfaces change.

Metrics:
    cell reconstruction accuracy
    numeric reconstruction accuracy
    currency reconstruction accuracy
    year reconstruction accuracy
    merged token accuracy
    table fidelity / cell recall  (targets ≥95% / ≥90%)

Run:
    py -3 tests/parser/run_phase65.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PARSER_DIR = ROOT / "scripts" / "parser"
for p in (str(PARSER_DIR), str(ROOT)):
    if p not in sys.path:
        sys.path.insert(0, p)

from pipeline import build_parse  # noqa: E402

from tests.parser.harness.cell_recon_metrics import (  # noqa: E402
    aggregate_recon,
    score_grid_reconstruction,
)

MVP_YEARS = [2015, 2017, 2018, 2020, 2024, 2025]
ACC_START, ACC_END = 41, 80
TARGETS = [(2017, 44), (2017, 47)]
OUT_METRICS = ROOT / "data" / "regression" / "phase65-metrics.json"
OUT_REPORT = ROOT / "docs" / "parser-phase65-report.md"


def _grids(ctx) -> dict[int, list[list[str]]]:
    out = {}
    for c in ctx.questions:
        if c.number is None or not c.table:
            continue
        out[c.number] = [list(r) for r in c.table.rows]
    return out


def main() -> int:
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

    per_year: dict[str, dict] = {}
    before_scores: list[dict] = []
    after_scores: list[dict] = []
    target_detail: dict[str, dict] = {}
    all_ids: dict[str, list[int]] = {}

    for year in MVP_YEARS:
        print(f"[run] {year} ...", flush=True)
        before_ctx = build_parse(year, reconstruct_cells=False)
        after_ctx = build_parse(year, reconstruct_cells=True)
        b_grids = _grids(before_ctx)
        a_grids = _grids(after_ctx)
        ids = sorted(set(b_grids) | set(a_grids))
        all_ids[str(year)] = ids

        y_before: list[dict] = []
        y_after: list[dict] = []
        for num in ids:
            sb = score_grid_reconstruction(b_grids.get(num))
            sa = score_grid_reconstruction(a_grids.get(num))
            sb["key"] = f"{year}:{num}"
            sa["key"] = f"{year}:{num}"
            y_before.append(sb)
            y_after.append(sa)
            before_scores.append(sb)
            after_scores.append(sa)
            if (year, num) in TARGETS:
                target_detail[f"ACC_{year}_Q{num:03d}"] = {
                    "before": b_grids.get(num),
                    "after": a_grids.get(num),
                    "scoreBefore": sb,
                    "scoreAfter": sa,
                }

        per_year[str(year)] = {
            "tableCount": len(ids),
            "before": aggregate_recon(y_before),
            "after": aggregate_recon(y_after),
            "ids": ids,
            "meta": after_ctx.meta_cell_recon,
        }

    result = {
        "years": MVP_YEARS,
        "questionsExpected": len(MVP_YEARS) * (ACC_END - ACC_START + 1),
        "tableQuestions": len(before_scores),
        "overall": {
            "before": aggregate_recon(before_scores),
            "after": aggregate_recon(after_scores),
        },
        "perYear": per_year,
        "targets": target_detail,
        "idsByYear": all_ids,
    }

    OUT_METRICS.parent.mkdir(parents=True, exist_ok=True)
    OUT_METRICS.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    OUT_REPORT.write_text(_render(result), encoding="utf-8")
    _print_console(result)
    print(f"\nwrote {OUT_METRICS.relative_to(ROOT)}")
    print(f"wrote {OUT_REPORT.relative_to(ROOT)}")
    return 0


def _pct(x) -> str:
    if x is None:
        return "N/A"
    return f"{x * 100:.1f}%"


def _print_console(r: dict) -> None:
    b, a = r["overall"]["before"], r["overall"]["after"]
    print("\n=== Phase 6.5 Regression — Table Cell Reconstruction ===")
    print(f"Table questions: {r['tableQuestions']}")
    for label, key in (
        ("table fidelity", "tableFidelity"),
        ("cell recall", "cellRecall"),
        ("cell reconstruction", "cellReconstructionAccuracy"),
        ("numeric reconstruction", "numericReconstructionAccuracy"),
        ("currency reconstruction", "currencyReconstructionAccuracy"),
        ("year reconstruction", "yearReconstructionAccuracy"),
        ("merged token", "mergedTokenAccuracy"),
    ):
        print(f"  {label:24s} {_pct(b.get(key)):>7s} → {_pct(a.get(key)):>7s}")
    for tid, d in r["targets"].items():
        print(f"  {tid}: cells {d['scoreBefore']['cells']}→{d['scoreAfter']['cells']} "
              f"recon {_pct(d['scoreBefore']['cellReconstructionAccuracy'])}→"
              f"{_pct(d['scoreAfter']['cellReconstructionAccuracy'])}")


def _render(r: dict) -> str:
    b, a = r["overall"]["before"], r["overall"]["after"]
    L: list[str] = []
    L.append("# Parser Regression — Phase 6.5 (Table Cell Reconstruction)")
    L.append("")
    L.append("행/열/셀 소속은 동일하고, **셀 내부 Token 재조립**만 비교합니다.")
    L.append("")
    L.append("- **Before**: `TableParser` only (`reconstruct_cells=False`)")
    L.append("- **After**: `TableParser` → `TableCellReconstructor`")
    L.append(f"- 대상: MVP {r['years']} · 표 검출 문항 **{r['tableQuestions']}**")
    L.append("")

    L.append("## 1. 종합 — Before vs After")
    L.append("")
    L.append("| 지표 | Before | After | 목표 |")
    L.append("|---|---|---|---|")
    goals = {
        "tableFidelity": "≥95%",
        "cellRecall": "≥90%",
        "cellReconstructionAccuracy": "↑",
        "numericReconstructionAccuracy": "↑",
        "currencyReconstructionAccuracy": "↑",
        "yearReconstructionAccuracy": "↑",
        "mergedTokenAccuracy": "↑",
    }
    labels = {
        "tableFidelity": "table fidelity",
        "cellRecall": "cell recall",
        "cellReconstructionAccuracy": "cell reconstruction accuracy",
        "numericReconstructionAccuracy": "numeric reconstruction accuracy",
        "currencyReconstructionAccuracy": "currency reconstruction accuracy",
        "yearReconstructionAccuracy": "year reconstruction accuracy",
        "mergedTokenAccuracy": "merged token accuracy",
    }
    for key, label in labels.items():
        L.append(f"| {label} | {_pct(b.get(key))} | {_pct(a.get(key))} | {goals[key]} |")
    L.append("")

    L.append("## 2. 필수 검증 문항")
    L.append("")
    for tid, d in r["targets"].items():
        L.append(f"### {tid}")
        L.append("")
        L.append(f"- cell reconstruction: "
                 f"{_pct(d['scoreBefore']['cellReconstructionAccuracy'])} → "
                 f"{_pct(d['scoreAfter']['cellReconstructionAccuracy'])}")
        L.append("")
        L.append("Before:")
        L.append("```json")
        L.append(json.dumps({"type": "grid", "rows": d["before"]}, ensure_ascii=False, indent=2))
        L.append("```")
        L.append("")
        L.append("After:")
        L.append("```json")
        L.append(json.dumps({"type": "grid", "rows": d["after"]}, ensure_ascii=False, indent=2))
        L.append("```")
        L.append("")

    L.append("## 3. 연도별 (표 문항)")
    L.append("")
    L.append("| 연도 | 표 문항 | fidelity B→A | cell recall B→A | cell recon B→A | 문항 번호 |")
    L.append("|---|---|---|---|---|---|")
    for y in r["years"]:
        e = r["perYear"][str(y)]
        ids = ",".join(str(n) for n in e["ids"]) or "-"
        L.append(
            f"| {y} | {e['tableCount']} | "
            f"{_pct(e['before']['tableFidelity'])}→{_pct(e['after']['tableFidelity'])} | "
            f"{_pct(e['before']['cellRecall'])}→{_pct(e['after']['cellRecall'])} | "
            f"{_pct(e['before']['cellReconstructionAccuracy'])}→"
            f"{_pct(e['after']['cellReconstructionAccuracy'])} | {ids} |"
        )
    L.append("")

    L.append("## 4. 해석")
    L.append("")
    L.append("- Cell 내부에서만 Token을 재조립한다. Row/Column 이동·Cell merge·새 숫자/문자 생성 금지.")
    L.append("- 복원 예: `390+,+000`→`390,000`, `￦+390,000`→`￦390,000`, `20+X+3`→`20X3`, "
             "`현재+가치`→`현재가치`, `공사+원+가`→`공사원가`, `단일+금액+￦+1`→`단일금액 ￦1`.")
    L.append("- table fidelity / cell recall은 **표 검출 문항** 기준 셀 표면 품질이다 "
             "(Phase 6 universe detection 비율과 별개).")
    L.append("- 다음 단계: 품질 충분 시 Stage 7 JSON Builder.")
    L.append("")
    return "\n".join(L)


if __name__ == "__main__":
    sys.exit(main())
