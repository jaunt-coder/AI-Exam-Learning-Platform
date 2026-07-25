#!/usr/bin/env python3
"""Phase 7 — Source-Truth emit (Stage 7 Builder + Stage 8 Diff skeleton).

Writes:
  data/regression/ast-sidecar/{year}.json
  data/regression/parser-emit/questions-{year}.json
  data/regression/parser-emit/question-db-parser.json

Does NOT touch data/question-db-mvp.json.

Run:
    py -3 tests/parser/run_phase7.py
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
from question_builder import EMIT_JSON, merge_year_emits  # noqa: E402

MVP_YEARS = [2015, 2017, 2018, 2020, 2024, 2025]
OUT_METRICS = ROOT / "data" / "regression" / "phase7-metrics.json"
OUT_REPORT = ROOT / "docs" / "parser-phase7-report.md"


def main() -> int:
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

    per_year: dict[str, dict] = {}
    all_diff_issues: list[dict] = []

    for year in MVP_YEARS:
        print(f"[emit] {year} ...", flush=True)
        ctx = build_parse(year, emit=True, write_emit=True)
        b = ctx.meta_builder or {}
        d = ctx.meta_diff or {}
        per_year[str(year)] = {
            "frozen": bool(ctx.ir_frozen),
            "records": b.get("recordCount", 0),
            "withAnswer": b.get("withAnswer", 0),
            "withTable": b.get("withTable", 0),
            "diffPassed": bool(d.get("passed")),
            "diffErrors": d.get("errorCount", 0),
            "diffWarns": d.get("warnCount", 0),
            "sidecar": b.get("sidecar"),
            "yearEmit": b.get("yearEmit"),
        }
        for issue in d.get("issues") or []:
            if issue.get("severity") == "error":
                all_diff_issues.append({"year": year, **issue})

    merged = merge_year_emits(MVP_YEARS, EMIT_JSON)
    overall = {
        "years": len(MVP_YEARS),
        "frozenYears": sum(1 for y in per_year.values() if y["frozen"]),
        "totalRecords": sum(y["records"] for y in per_year.values()),
        "diffErrorCount": sum(y["diffErrors"] for y in per_year.values()),
        "diffWarnCount": sum(y["diffWarns"] for y in per_year.values()),
        "allDiffPassed": all(y["diffPassed"] for y in per_year.values()),
        "emitJson": str(merged.relative_to(ROOT)).replace("\\", "/"),
        "mvpDbUntouched": True,
    }
    result = {
        "years": MVP_YEARS,
        "overall": overall,
        "perYear": per_year,
        "diffErrors": all_diff_issues[:80],
        "targets": {
            "allFrozen": True,
            "totalRecords": len(MVP_YEARS) * 40,
            "diffErrorCount": 0,
        },
        "targetsMet": {
            "allFrozen": overall["frozenYears"] == len(MVP_YEARS),
            "totalRecords": overall["totalRecords"] == len(MVP_YEARS) * 40,
            "diffErrorCount": overall["diffErrorCount"] == 0,
        },
    }

    OUT_METRICS.parent.mkdir(parents=True, exist_ok=True)
    OUT_METRICS.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    OUT_REPORT.write_text(_render(result), encoding="utf-8")
    _print(result)
    print(f"\nwrote {OUT_METRICS.relative_to(ROOT)}")
    print(f"wrote {OUT_REPORT.relative_to(ROOT)}")
    print(f"wrote {merged.relative_to(ROOT)}")
    return 0 if result["targetsMet"]["diffErrorCount"] and result["targetsMet"]["totalRecords"] else 1


def _print(result: dict) -> None:
    o = result["overall"]
    print("\n=== Phase 7 Source-Truth Emit ===")
    print(f"records     : {o['totalRecords']}")
    print(f"frozen      : {o['frozenYears']}/{o['years']}")
    print(f"diff errors : {o['diffErrorCount']}")
    print(f"diff warns  : {o['diffWarnCount']}")
    print(f"emit JSON   : {o['emitJson']}")
    print(f"MVP DB      : untouched")
    print(f"targetsMet  : {result['targetsMet']}")
    for year, row in result["perYear"].items():
        print(
            f"  {year}: records={row['records']} ans={row['withAnswer']} "
            f"tables={row['withTable']} diff_err={row['diffErrors']} "
            f"diff_warn={row['diffWarns']}"
        )


def _render(result: dict) -> str:
    o = result["overall"]
    L = [
        "# Parser Regression — Phase 7 (Source-Truth Emit)",
        "",
        "Stage 7 QuestionBuilder (read-only) + Stage 8 DiffEngine skeleton.",
        "목표: 기존 `question-db-mvp.json` 복제가 **아님**. Source Truth 기준 신규 JSON.",
        "",
        "## 1. 종합",
        "",
        "| 지표 | 값 |",
        "|---|---|",
        f"| records | {o['totalRecords']} |",
        f"| frozen years | {o['frozenYears']}/{o['years']} |",
        f"| diff errors | {o['diffErrorCount']} |",
        f"| diff warns | {o['diffWarnCount']} |",
        f"| emit JSON | `{o['emitJson']}` |",
        f"| MVP DB untouched | {o['mvpDbUntouched']} |",
        f"| targetsMet | `{result['targetsMet']}` |",
        "",
        "## 2. 연도별",
        "",
        "| 연도 | records | answers | tables | diff err | diff warn |",
        "|---|---|---|---|---|---|",
    ]
    for year, row in result["perYear"].items():
        L.append(
            f"| {year} | {row['records']} | {row['withAnswer']} | {row['withTable']} | "
            f"{row['diffErrors']} | {row['diffWarns']} |"
        )
    L += [
        "",
        "## 3. Diff errors (sample)",
        "",
    ]
    errs = result.get("diffErrors") or []
    if not errs:
        L.append("(none)")
    else:
        for e in errs[:30]:
            L.append(
                f"- {e.get('year')} Q{e.get('questionNumber')}: "
                f"[{e.get('layer')}] {e.get('message')}"
            )
    L += [
        "",
        "## 4. 산출물",
        "",
        "- `data/regression/parser-emit/question-db-parser.json`",
        "- `data/regression/ast-sidecar/{year}.json`",
        "- 제품 `data/question-db-mvp.json` **미변경**",
        "",
    ]
    return "\n".join(L) + "\n"


if __name__ == "__main__":
    sys.exit(main())
