#!/usr/bin/env python3
"""Phase 6.9 regression — IR Integrity Gate (+ 6.7/6.8 separation check).

Runs the full pipeline through Stage 6.9 for MVP years and reports:
    ir frozen
    integrity error/warn counts
    partition / structure / semantic-gate failures
    repair counts (Stage 6.7) vs semantic scores (Stage 6.8)

Run:
    py -3 tests/parser/run_phase69.py
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

MVP_YEARS = [2015, 2017, 2018, 2020, 2024, 2025]
OUT_METRICS = ROOT / "data" / "regression" / "phase69-metrics.json"
OUT_REPORT = ROOT / "docs" / "parser-phase69-report.md"


def main() -> int:
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

    per_year: dict[str, dict] = {}
    all_violations: list[dict] = []

    for year in MVP_YEARS:
        print(f"[run] {year} ...", flush=True)
        ctx = build_parse(year)
        integ = ctx.meta_integrity or {}
        sem = ctx.meta_semantic or {}
        rep = ctx.meta_repair or {}
        per_year[str(year)] = {
            "frozen": bool(integ.get("frozen")),
            "passed": bool(integ.get("passed")),
            "integrityErrorCount": integ.get("errorCount", 0),
            "integrityWarnCount": integ.get("warnCount", 0),
            "questionsPassed": integ.get("questionsPassed", 0),
            "questionCount": integ.get("questionCount", 0),
            "semanticScore": sem.get("documentScore"),
            "semanticErrorCount": sem.get("errorCount", 0),
            "orphanRepairs": rep.get("orphanRepairs", sem.get("orphanRepairs", 0)),
            "degenerateTablesPruned": rep.get(
                "degenerateTablesPruned", sem.get("degenerateTablesPruned", 0)
            ),
        }
        for v in integ.get("violations") or []:
            all_violations.append({"year": year, **v})

    frozen_years = sum(1 for y in per_year.values() if y["frozen"])
    total_errors = sum(y["integrityErrorCount"] for y in per_year.values())
    total_warns = sum(y["integrityWarnCount"] for y in per_year.values())
    result = {
        "years": MVP_YEARS,
        "overall": {
            "frozenYearCount": frozen_years,
            "yearCount": len(MVP_YEARS),
            "integrityErrorCount": total_errors,
            "integrityWarnCount": total_warns,
            "allFrozen": frozen_years == len(MVP_YEARS),
        },
        "perYear": per_year,
        "violations": all_violations,
        "targets": {
            "allFrozen": True,
            "integrityErrorCount": 0,
        },
        "targetsMet": {
            "allFrozen": frozen_years == len(MVP_YEARS),
            "integrityErrorCount": total_errors == 0,
        },
    }

    OUT_METRICS.parent.mkdir(parents=True, exist_ok=True)
    OUT_METRICS.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    OUT_REPORT.write_text(_render(result), encoding="utf-8")
    _print_console(result)
    print(f"\nwrote {OUT_METRICS.relative_to(ROOT)}")
    print(f"wrote {OUT_REPORT.relative_to(ROOT)}")
    return 0 if result["targetsMet"]["integrityErrorCount"] else 1


def _print_console(result: dict) -> None:
    o = result["overall"]
    print("\n=== Phase 6.9 IR Integrity ===")
    print(f"frozen years : {o['frozenYearCount']}/{o['yearCount']}")
    print(f"errors       : {o['integrityErrorCount']}")
    print(f"warns        : {o['integrityWarnCount']}")
    print(f"targetsMet   : {result['targetsMet']}")
    for year, row in result["perYear"].items():
        flag = "FROZEN" if row["frozen"] else "OPEN"
        print(
            f"  {year}: {flag} · err={row['integrityErrorCount']} · "
            f"warn={row['integrityWarnCount']} · "
            f"Qpass={row['questionsPassed']}/{row['questionCount']} · "
            f"repair={row['orphanRepairs']}"
        )


def _render(result: dict) -> str:
    o = result["overall"]
    L: list[str] = []
    L.append("# Parser Regression — Phase 6.9 (IR Integrity Gate)")
    L.append("")
    L.append("Stage 6.7 SemanticRepair → 6.8 SemanticValidator(순수) → 6.9 IR Integrity.")
    L.append("문항번호·연도·questionId 하드코딩 없음.")
    L.append("")
    L.append("- 대상: MVP [2015, 2017, 2018, 2020, 2024, 2025]")
    L.append("")
    L.append("## 1. 종합 지표")
    L.append("")
    L.append("| 지표 | 값 | 목표 |")
    L.append("|---|---|---|")
    L.append(
        f"| frozen years | {o['frozenYearCount']}/{o['yearCount']} | 전부 FROZEN |"
    )
    L.append(f"| integrity errors | {o['integrityErrorCount']} | 0 |")
    L.append(f"| integrity warns | {o['integrityWarnCount']} | 최소화 |")
    L.append(f"| targetsMet | `{result['targetsMet']}` | |")
    L.append("")
    L.append("## 2. 연도별")
    L.append("")
    L.append("| 연도 | frozen | errors | warns | Q pass | semanticScore | repairs |")
    L.append("|---|---|---|---|---|---|---|")
    for year, row in result["perYear"].items():
        L.append(
            f"| {year} | {row['frozen']} | {row['integrityErrorCount']} | "
            f"{row['integrityWarnCount']} | {row['questionsPassed']}/{row['questionCount']} | "
            f"{row['semanticScore']} | {row['orphanRepairs']} |"
        )
    L.append("")
    L.append("## 3. Integrity Violation 목록")
    L.append("")
    errors = [v for v in result["violations"] if v.get("severity") == "error"]
    warns = [v for v in result["violations"] if v.get("severity") == "warn"]
    L.append(f"**Errors: {len(errors)}건**")
    L.append("")
    for v in errors[:40]:
        L.append(
            f"- {v.get('year')} Q{v.get('questionNumber')}: "
            f"{v.get('check')} — {v.get('message')}"
        )
    if len(errors) > 40:
        L.append(f"- … 외 {len(errors) - 40}건")
    L.append("")
    L.append(f"Warns: {len(warns)}건")
    L.append("")
    L.append("## 4. 해석")
    L.append("")
    L.append("- 6.7에서만 mutate(orphan unit 결합·degenerate table 제거).")
    L.append("- 6.8은 순수 검증. 6.9는 Freeze Gate (Builder 진입 조건).")
    L.append("- Stage 7 Builder는 `docs/32-parser-emit-contract.md` 승인 전 구현 금지.")
    L.append("")
    return "\n".join(L) + "\n"


if __name__ == "__main__":
    sys.exit(main())
