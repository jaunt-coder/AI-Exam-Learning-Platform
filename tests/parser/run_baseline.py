#!/usr/bin/env python3
"""Phase 0 Regression Harness runner.

Builds the source-truth snapshot and parser-output snapshot, computes the 8
regression indicators per question, and writes the Baseline Report.

Usage:
    py -3 tests/parser/run_baseline.py

Outputs:
    data/regression/source-truth-snapshot.json
    data/regression/parser-output-snapshot.json
    data/regression/baseline-metrics.json
    docs/parser-regression-baseline.md
"""
from __future__ import annotations

import json
import sys
from dataclasses import asdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from tests.parser.harness.metrics import aggregate, compute_question_metrics
from tests.parser.harness.report import render_markdown
from tests.parser.harness.snapshot import (
    MVP_YEARS,
    build_source_snapshot,
    load_parser_snapshot,
)

REGRESSION_DIR = ROOT / "data" / "regression"
DOCS_DIR = ROOT / "docs"


def _per_year_summary(metrics_list) -> dict:
    per_year: dict[int, dict] = {}
    grouped: dict[int, list] = {}
    for m in metrics_list:
        grouped.setdefault(m.year, []).append(m)
    return grouped


def main() -> int:
    print("Phase 0 Regression Harness")
    print("  building source-truth snapshot ...")
    source_snapshot = build_source_snapshot(MVP_YEARS)
    print(f"    source questions: {len(source_snapshot['questions'])}")

    print("  loading parser-output snapshot ...")
    parser_snapshot = load_parser_snapshot(MVP_YEARS)
    print(f"    parser questions: {len(parser_snapshot['questions'])}")

    print("  computing metrics ...")
    metrics_list = []
    for key, source in source_snapshot["questions"].items():
        record = parser_snapshot["questions"].get(key)
        metrics_list.append(compute_question_metrics(record, source))

    agg = aggregate(metrics_list)

    grouped = _per_year_summary(metrics_list)
    per_year: dict[int, dict] = {}
    for year, items in grouped.items():
        present = [m for m in items if m.present]
        year_meta = source_snapshot["years"].get(str(year), {})

        def mean(attr):
            vals = [getattr(m, attr) for m in present]
            return round(sum(vals) / len(vals), 4) if vals else 0.0

        per_year[year] = {
            "sourceFile": year_meta.get("sourceFile", ""),
            "sourceKind": year_meta.get("sourceKind", ""),
            "present": len(present),
            "stemCoverage": mean("stem_coverage"),
            "choiceCoverage": mean("choice_coverage"),
            "numberFidelity": mean("number_fidelity"),
            "unitFidelity": mean("unit_fidelity"),
            "sourceFidelity": mean("source_fidelity"),
            "not5Choices": sum(1 for m in present if not m.five_choices),
            "duplicates": sum(1 for m in present if m.duplicate),
        }

    REGRESSION_DIR.mkdir(parents=True, exist_ok=True)
    (REGRESSION_DIR / "source-truth-snapshot.json").write_text(
        json.dumps(source_snapshot, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (REGRESSION_DIR / "parser-output-snapshot.json").write_text(
        json.dumps(parser_snapshot, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    metrics_payload = {
        "aggregate": agg,
        "perYear": {str(y): per_year[y] for y in sorted(per_year)},
        "perQuestion": [asdict(m) for m in metrics_list],
    }
    (REGRESSION_DIR / "baseline-metrics.json").write_text(
        json.dumps(metrics_payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    report = render_markdown(agg, per_year, metrics_list, source_snapshot["years"])
    (DOCS_DIR / "parser-regression-baseline.md").write_text(report, encoding="utf-8")

    means = agg["means"]
    counts = agg["counts"]
    print("")
    print("  === Baseline Summary ===")
    print(f"  present            {agg['present']}/{agg['totalExpected']}")
    print(f"  stem coverage      {means['stemCoverage']*100:.1f}%")
    print(f"  choice coverage    {means['choiceCoverage']*100:.1f}%")
    tf = means["tableFidelity"]
    print(f"  table fidelity     {tf*100:.1f}%" if tf is not None else "  table fidelity     N/A")
    print(f"  number fidelity    {means['numberFidelity']*100:.1f}%")
    print(f"  unit fidelity      {means['unitFidelity']*100:.1f}%")
    print(f"  source fidelity    {means['sourceFidelity']*100:.1f}%")
    print(f"  completeness       {means['completeness']*100:.1f}%")
    print(f"  duplicates         {counts['duplicates']}")
    print(f"  not-5-choices      {counts['not5Choices']}")
    print(f"  numbers missing    {counts['numbersMissing']}")
    print(f"  units missing      {counts['unitsMissing']}")
    print(f"  fidelity <99%      {counts['sourceFidelityBelowTarget']}")
    print("")
    print(f"  -> {REGRESSION_DIR / 'baseline-metrics.json'}")
    print(f"  -> {DOCS_DIR / 'parser-regression-baseline.md'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
