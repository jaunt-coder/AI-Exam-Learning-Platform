#!/usr/bin/env python3
"""Phase 6.8 regression — Semantic Validation Engine.

Runs the full pipeline (through Stage 6.8) for MVP years and reports:
    semantic score
    semantic violation count
    header validation accuracy
    numeric context accuracy
    blank cell ratio
    orphan token count
    table consistency score

Run:
    py -3 tests/parser/run_phase68.py
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

from tests.parser.harness.semantic_metrics import aggregate_semantic  # noqa: E402

MVP_YEARS = [2015, 2017, 2018, 2020, 2024, 2025]
OUT_METRICS = ROOT / "data" / "regression" / "phase68-metrics.json"
OUT_REPORT = ROOT / "docs" / "parser-phase68-report.md"


def main() -> int:
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

    per_year: dict[str, dict] = {}
    metas: list[dict] = []
    all_violations: list[dict] = []

    for year in MVP_YEARS:
        print(f"[run] {year} ...", flush=True)
        ctx = build_parse(year)
        m = ctx.meta_semantic
        metas.append(m)
        per_year[str(year)] = {
            "documentScore": m["documentScore"],
            "tableScore": m["tableScore"],
            "errorCount": m["errorCount"],
            "warnCount": m["warnCount"],
            "orphanTokenCount": m["orphanTokenCount"],
            "orphanRepairs": m.get("orphanRepairs", 0),
            "blankCellRatioMean": m["blankCellRatioMean"],
            "headerValidationAccuracy": m["headerValidationAccuracy"],
            "numericContextAccuracy": m["numericContextAccuracy"],
            "tableConsistencyMean": m["tableConsistencyMean"],
            "choiceAccuracy": m["choiceAccuracy"],
            "tableQuestionCount": m["tableQuestionCount"],
        }
        for v in m.get("violations") or []:
            all_violations.append({"year": year, **v})

    overall = aggregate_semantic(metas)
    result = {
        "years": MVP_YEARS,
        "overall": overall,
        "perYear": per_year,
        "violations": all_violations,
        "targets": {
            "semanticScore": 0.99,
            "semanticErrorCount": 0,
            "orphanTokenCount": 0,
        },
        "targetsMet": {
            "semanticScore": (overall["semanticScore"] or 0) >= 0.99,
            "semanticErrorCount": overall["semanticErrorCount"] == 0,
            "orphanTokenCount": overall["orphanTokenCount"] == 0,
        },
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
    if x > 1.5:  # already 0..100
        return f"{x:.2f}"
    return f"{x * 100:.2f}%"


def _print_console(r: dict) -> None:
    o = r["overall"]
    print("\n=== Phase 6.8 Regression — Semantic Validation ===")
    print(f"  semantic score           {_pct(o['semanticScore'])}  (100-scale {o['semanticScore100']})")
    print(f"  semantic errors          {o['semanticErrorCount']}")
    print(f"  semantic warns           {o['semanticWarnCount']}")
    print(f"  orphan tokens            {o['orphanTokenCount']}")
    print(f"  orphan repairs           {o['orphanRepairs']}")
    print(f"  header validation        {_pct(o['headerValidationAccuracy'])}")
    print(f"  numeric context          {_pct(o['numericContextAccuracy'])}")
    print(f"  blank cell ratio         {_pct(o['blankCellRatio'])}")
    print(f"  table consistency        {_pct(o['tableConsistencyScore'])}")
    print(f"  choice accuracy          {_pct(o['choiceAccuracy'])}")
    print(f"  targets met              {r['targetsMet']}")


def _render(r: dict) -> str:
    o = r["overall"]
    L: list[str] = []
    L.append("# Parser Regression — Phase 6.8 (Semantic Validation Engine)")
    L.append("")
    L.append("Geometry 복원 이후 AST가 **회계 의미 구조**를 만족하는지 일반 Rule로 검증한다.")
    L.append("문항번호·연도·questionId 하드코딩 없음.")
    L.append("")
    L.append(f"- 대상: MVP {r['years']}")
    L.append("")

    L.append("## 1. 종합 지표")
    L.append("")
    L.append("| 지표 | 값 | 목표 |")
    L.append("|---|---|---|")
    L.append(f"| semantic score | {_pct(o['semanticScore'])} ({o['semanticScore100']}/100) | ≥99% |")
    L.append(f"| semantic violation (errors) | {o['semanticErrorCount']} | 0 |")
    L.append(f"| semantic warns | {o['semanticWarnCount']} | 최소화 |")
    L.append(f"| orphan token count | {o['orphanTokenCount']} | 0 |")
    L.append(f"| orphan repairs (pre-validate) | {o['orphanRepairs']} | - |")
    L.append(f"| header validation accuracy | {_pct(o['headerValidationAccuracy'])} | ↑ |")
    L.append(f"| numeric context accuracy | {_pct(o['numericContextAccuracy'])} | ↑ |")
    L.append(f"| blank cell ratio | {_pct(o['blankCellRatio'])} | 최소화 |")
    L.append(f"| table consistency score | {_pct(o['tableConsistencyScore'])} | ↑ |")
    L.append(f"| choice accuracy | {_pct(o['choiceAccuracy'])} | 100% |")
    L.append("")
    L.append(f"목표 달성: `{r['targetsMet']}`")
    L.append("")

    L.append("## 2. Semantic Rules")
    L.append("")
    L.append("| Rule | 검사 내용 |")
    L.append("|---|---|")
    L.append("| YearHeaderRule | 연도 헤더 행/열에 숫자 동반 |")
    L.append("| PresentValueTableRule | 현가/연금/복리 헤더 → 표 내 숫자 |")
    L.append("| DebitCreditRule | 차변+대변 → ≥2열 |")
    L.append("| ChoiceCountRule | ①~⑤ 존재 시 Choice 5개 |")
    L.append("| TotalHeaderRule | 합계/총계/기말(단독) → 同行/다음行 숫자 |")
    L.append("| PercentHeaderRule | 상단 % 헤더 → 同열 아래 숫자 |")
    L.append("| OrphanUnitRule | ￦/원/주/% 단독 셀 금지 |")
    L.append("| BlankCellRule | 빈 셀 비율(warn) |")
    L.append("")
    L.append("검증 전 일반 수리: `repair_orphan_units` — 단독 단위 셀을 Chebyshev≤2 내 숫자 셀에 결합 (행/열 개수 불변).")
    L.append("")

    L.append("## 3. 연도별")
    L.append("")
    L.append("| 연도 | score | errors | warns | orphans | repairs | blank | choice |")
    L.append("|---|---|---|---|---|---|---|---|")
    for y in r["years"]:
        e = r["perYear"][str(y)]
        L.append(
            f"| {y} | {e['documentScore']} | {e['errorCount']} | {e['warnCount']} | "
            f"{e['orphanTokenCount']} | {e['orphanRepairs']} | "
            f"{_pct(e['blankCellRatioMean'])} | {_pct(e['choiceAccuracy'])} |"
        )
    L.append("")

    L.append("## 4. Semantic Violation 목록")
    L.append("")
    errors = [v for v in r["violations"] if v.get("severity") == "error"]
    warns = [v for v in r["violations"] if v.get("severity") == "warn"]
    if not errors:
        L.append("**Errors: 0건**")
        L.append("")
    else:
        L.append("| year | Q | rule | message | detail |")
        L.append("|---|---|---|---|---|")
        for v in errors:
            L.append(
                f"| {v['year']} | {v.get('questionNumber')} | {v['rule']} | "
                f"{v['message']} | `{v.get('detail')}` |"
            )
        L.append("")
    if warns:
        L.append(f"Warns: {len(warns)}건 (빈 셀 비율 등 — 오류 아님)")
        L.append("")
        for v in warns[:20]:
            L.append(f"- {v['year']} Q{v.get('questionNumber')}: {v['rule']} — {v['message']}")
        L.append("")

    L.append("## 5. 해석")
    L.append("")
    L.append("- Geometry 복원(Stage 1~6.5) 위에 **회계 의미 제약**을 얹어 AST 품질을 게이트한다.")
    L.append("- Rule은 헤더/토큰/열 구조 패턴만 사용하며 특정 시험·문항 ID에 의존하지 않는다.")
    L.append("- 구조 정화: mutate는 Stage 6.7 SemanticRepair, 검증은 Stage 6.8 순수 유지.")
    L.append("- 다음 단계: Stage 6.9 IR Integrity → Emit Contract 승인 → Stage 7 Builder.")
    L.append("")
    return "\n".join(L)


if __name__ == "__main__":
    sys.exit(main())
