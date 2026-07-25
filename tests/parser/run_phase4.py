#!/usr/bin/env python3
"""Phase 4-1 regression runner — Dual-Page (2-up) Split.

Both sides use the NEW parser engine; the only difference is page unit:
    Before : Physical Page unit  (build_parse(year, split=False))
    After  : Logical Page unit   (build_parse(year, split=True))

Metrics (Phase 0 harness extension):
    1. question boundary accuracy
    2. choice marker recall
    3. choice count accuracy
    4. 2015 error-question count (target Q47/Q52/Q77/Q78)

Run:
    py -3 tests/parser/run_phase4.py
Outputs:
    data/regression/phase4-metrics.json
    docs/parser-phase4-report.md
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

from tests.parser.harness.choice_metrics import aggregate_choice_metrics  # noqa: E402

MVP_YEARS = [2015, 2017, 2018, 2020, 2024, 2025]
ACC_START, ACC_END = 41, 80
GLYPHS = "①②③④⑤⑥⑦⑧⑨⑩"
TARGET_2015 = [47, 52, 77, 78]
OUT_METRICS = ROOT / "data" / "regression" / "phase4-metrics.json"
OUT_REPORT = ROOT / "docs" / "parser-phase4-report.md"


def _choice_content(cand) -> list[str]:
    out = []
    for c in sorted((c for c in cand.choices if c.index and 1 <= c.index <= 5), key=lambda c: c.index):
        t = c.text()
        if t and t[0] in GLYPHS:
            t = t[1:]
        out.append(t.strip())
    return out


def _has_five(cand) -> bool:
    return cand is not None and len({c.index for c in cand.choices if c.index and 1 <= c.index <= 5}) == 5


def _run_variant(year: int, split: bool) -> dict:
    ctx = build_parse(year, split=split)
    bstats = ctx.meta_boundary or {}
    by_num = {c.number: c for c in ctx.questions if c.number is not None}
    choices = [(_choice_content(by_num[n]) if n in by_num else []) for n in range(ACC_START, ACC_END + 1)]
    return {
        "pages": ctx.layout.page_count if ctx.layout else 0,
        "splitNote": next((d.message for d in ctx.diagnostics if d.stage == "DualPageSplitter"), ""),
        "detected": bstats.get("count", 0),
        "missing": bstats.get("missing", []),
        "choices": choices,
        "by_num": by_num,
    }


def main() -> int:
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

    per_year: dict[str, dict] = {}
    before_all: list[list[str]] = []
    after_all: list[list[str]] = []
    det_before = det_after = 0

    for year in MVP_YEARS:
        print(f"[run] {year} ...", flush=True)
        before = _run_variant(year, split=False)
        after = _run_variant(year, split=True)
        before_all += before["choices"]
        after_all += after["choices"]
        det_before += before["detected"]
        det_after += after["detected"]

        entry = {
            "pagesBefore": before["pages"], "pagesAfter": after["pages"],
            "splitNote": after["splitNote"],
            "detectedBefore": before["detected"], "detectedAfter": after["detected"],
            "missingBefore": before["missing"], "missingAfter": after["missing"],
            "before": aggregate_choice_metrics(before["choices"]),
            "after": aggregate_choice_metrics(after["choices"]),
        }
        if year == 2015:
            entry["targetBefore"] = {n: _has_five(before["by_num"].get(n)) for n in TARGET_2015}
            entry["targetAfter"] = {n: _has_five(after["by_num"].get(n)) for n in TARGET_2015}
            entry["errBefore"] = sum(1 for n in TARGET_2015 if not entry["targetBefore"][n])
            entry["errAfter"] = sum(1 for n in TARGET_2015 if not entry["targetAfter"][n])
        per_year[str(year)] = entry

    result = {
        "years": MVP_YEARS,
        "questionsExpected": len(MVP_YEARS) * (ACC_END - ACC_START + 1),
        "boundaryBefore": det_before,
        "boundaryAfter": det_after,
        "overall": {
            "before": aggregate_choice_metrics(before_all),
            "after": aggregate_choice_metrics(after_all),
        },
        "target2015": {"ids": TARGET_2015, **{k: per_year["2015"][k] for k in
                       ("targetBefore", "targetAfter", "errBefore", "errAfter")}},
        "perYear": per_year,
    }

    OUT_METRICS.parent.mkdir(parents=True, exist_ok=True)
    OUT_METRICS.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    OUT_REPORT.write_text(_render(result), encoding="utf-8")
    _print_console(result)
    print(f"\nwrote {OUT_METRICS.relative_to(ROOT)}")
    print(f"wrote {OUT_REPORT.relative_to(ROOT)}")
    return 0


def _pct(x: float) -> str:
    return f"{x * 100:.1f}%"


def _print_console(r: dict) -> None:
    ov = r["overall"]
    t = r["target2015"]
    print("\n=== Phase 4-1 Regression — Dual-Page Split (Physical → Logical) ===")
    print(f"Question boundary: {r['boundaryBefore']}/{r['questionsExpected']} → {r['boundaryAfter']}/{r['questionsExpected']}")
    for label, key in (("marker recall", "markerRecall"), ("count accuracy", "countAccuracy")):
        print(f"  {label:16s} {_pct(ov['before'][key]):>7s} → {_pct(ov['after'][key]):>7s}")
    print(f"2015 target error questions (Q47/52/77/78): {t['errBefore']} → {t['errAfter']}")


def _render(r: dict) -> str:
    L: list[str] = []
    ov = r["overall"]
    t = r["target2015"]
    L.append("# Parser Regression — Phase 4-1 (Dual-Page / 2-up Split)")
    L.append("")
    L.append("두 결과 모두 신규 Parser Engine이며, 차이는 **페이지 처리 단위**뿐입니다.")
    L.append("")
    L.append("- **Before**: Physical Page 단위 (`build_parse(year, split=False)`)")
    L.append("- **After**: Logical Page 단위 (`build_parse(year, split=True)` — DualPageSplitter 적용)")
    L.append(f"- 대상: MVP {r['years']} · 회계학 {ACC_START}~{ACC_END} · 총 {r['questionsExpected']}문항")
    L.append("")

    L.append("## 1. 종합 — Before vs After")
    L.append("")
    L.append("| 지표 | Before (Physical) | After (Logical) |")
    L.append("|---|---|---|")
    L.append(f"| question boundary accuracy | {r['boundaryBefore']}/{r['questionsExpected']} | {r['boundaryAfter']}/{r['questionsExpected']} |")
    L.append(f"| choice marker recall | {_pct(ov['before']['markerRecall'])} | {_pct(ov['after']['markerRecall'])} |")
    L.append(f"| choice count accuracy | {_pct(ov['before']['countAccuracy'])} | {_pct(ov['after']['countAccuracy'])} |")
    L.append(f"| 2015 오류 문항 수 (Q47/52/77/78) | {t['errBefore']} | {t['errAfter']} |")
    L.append("")

    L.append("## 2. 2015 목표 문항 (특정 ID 하드코딩 없이 2-up 일반 규칙으로 해결)")
    L.append("")
    L.append("| 문항 | Before (5보기) | After (5보기) |")
    L.append("|---|---|---|")
    for n in t["ids"]:
        b = "O" if t["targetBefore"][n] else "X"
        a = "O" if t["targetAfter"][n] else "X"
        L.append(f"| ACC_2015_Q{n:03d} | {b} | {a} |")
    L.append("")

    L.append("## 3. 연도별 상세 (Before → After)")
    L.append("")
    L.append("| 연도 | 페이지 | 검출/40 | marker recall | count acc | 비고 |")
    L.append("|---|---|---|---|---|---|")
    for y in r["years"]:
        e = r["perYear"][str(y)]
        note = "2-up 분할" if e["pagesAfter"] != e["pagesBefore"] else "변화 없음"
        L.append(f"| {y} | {e['pagesBefore']}→{e['pagesAfter']} | "
                 f"{e['detectedBefore']}→{e['detectedAfter']}/40 | "
                 f"{_pct(e['before']['markerRecall'])}→{_pct(e['after']['markerRecall'])} | "
                 f"{_pct(e['before']['countAccuracy'])}→{_pct(e['after']['countAccuracy'])} | {note} |")
    L.append("")

    L.append("## 4. 해석")
    L.append("")
    L.append("- **원인**: 2015 원본은 폭 729pt 시트에 두 페이지가 나란히 인쇄된 2-up 스캔이다. 단일 페이지로 처리하면 "
             "Stage 4의 열(column) 앵커가 좌/우 페이지의 QUESTION_NUMBER x좌표(≈49, ≈362)로 잡혀, 좌측 페이지 "
             "중앙(x≈259)의 보기 마커 ③이 우측 앵커에 더 가깝다고 오판되어 다른 문항으로 귀속된다(③ 유실).")
    L.append("- **해결**: Loader 직후 `DualPageSplitter`가 **geometry만으로** 2-up 시트를 감지한다. "
             "페이지별 중앙 gutter(빈 세로 띠)·좌우 content 밀도·양쪽 span 균형을 보고, 이 gutter가 "
             "문서의 다수 페이지에서 반복될 때만(document-level 판정) 2-up으로 확정한다. 확정 시 각 시트를 "
             "좌/우 논리 페이지로 분할하고 좌표계를 페이지 원점 기준으로 이동한다.")
    L.append("- **하드코딩 없음**: `year == 2015`, `page == N` 같은 분기는 없다. 판정은 폭·gutter·밀도·"
             "반복성(문서 단위 비율)만 사용한다. 그 결과 2015는 15시트 → 30 논리 페이지로 분할되고, "
             "나머지 5개 연도는 소수 페이지에만 2열 gutter가 나타나 임계값 미만 → 분할되지 않는다.")
    L.append("- **원본 보존**: 분할된 span은 이동된 `bbox`와 함께 원본 좌표를 `source_bbox`에 유지하며, "
             "Page는 `physical_number`(원본 PDF 페이지)와 `logical_index`(0/1)를 보존한다.")
    L.append("- **기존 Stage 영향**: FooterRule·Tokenizer·QuestionBoundary·ChoiceBoundary는 페이지 목록을 "
             "그대로 소비하므로 코드 변경이 없다(논리 페이지가 곧 페이지). 2015 외 연도는 분할이 일어나지 않아 "
             "Phase 3 결과와 동일하게 유지된다.")
    L.append("- 다음 단계: Stage 6 Table Parser.")
    L.append("")
    return "\n".join(L)


if __name__ == "__main__":
    sys.exit(main())
