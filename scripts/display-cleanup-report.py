#!/usr/bin/env python3
"""Generate Display Cleanup Layer Before/After readability report."""
from __future__ import annotations

import json
import subprocess
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

from display_cleanup_py import build_metrics_report  # noqa: E402

METRICS_JSON = ROOT / "data" / "analysis" / "display-cleanup-metrics.json"
REPORT_MD = ROOT / "docs" / "display-cleanup-report.md"
QUESTION_DB = ROOT / "data" / "question-db-mvp.json"
RUNNER = ROOT / "scripts" / "display-cleanup-runner.mjs"


def run_metrics_node() -> dict | None:
    try:
        result = subprocess.run(
            ["node", str(RUNNER)],
            cwd=str(ROOT),
            capture_output=True,
            text=True,
            encoding="utf-8",
            check=False,
        )
    except FileNotFoundError:
        return None
    if result.returncode != 0:
        return None
    if METRICS_JSON.exists():
        return json.loads(METRICS_JSON.read_text(encoding="utf-8"))
    return json.loads(result.stdout)


def pct(value: float) -> str:
    sign = "+" if value >= 0 else ""
    return f"{sign}{value:.1f}%"


def build_report(metrics: dict) -> str:
    before = metrics["before"]
    after = metrics["after"]
    improvement = metrics["improvement"]
    demos = metrics.get("demos", {})

    lines = [
        "# Display Cleanup Report",
        "",
        f"- 생성일: {date.today().isoformat()}",
        "- 대상: `data/question-db-mvp.json` (**DB 미변경**, 표시 레이어만 적용)",
        "- 레이어: `js/data-cleaner.js` + `js/accounting-term-dictionary.js`",
        "- 적용 경로: `js/data-loader.js` → Question / AI Tutor / Recommendation / Analytics",
        "",
        "## Readability Metrics (Before → After)",
        "",
        "| Metric | Before | After | Change |",
        "|--------|--------|-------|--------|",
        f"| glued 12자+ 토큰 문항 | {before['gluedQuestions']} | {after['gluedQuestions']} | {pct(-improvement['gluedQuestionsReduction'])} |",
        f"| 최장 한글 토큰 (자) | {before['longestGlued']} | {after['longestGlued']} | {pct(-improvement['longestGluedReduction'])} |",
        f"| 한글 공백 비율 (avg) | {before['avgSpaceRatio']:.3f} | {after['avgSpaceRatio']:.3f} | {pct(improvement['spaceRatioIncrease'])} |",
        f"| 미포맷 숫자(4자+) | {before['unformattedNumbers']} | {after['unformattedNumbers']} | {pct(-improvement['unformattedNumbersReduction'])} |",
        "",
        "## 기능 검증",
        "",
    ]

    term = demos.get("termSpacing", {})
    number = demos.get("numberFormatting", {})
    if term:
        lines.extend(
            [
                "### 회계 용어 띄어쓰기",
                "",
                f"- Before: `{term.get('before', '')}`",
                f"- After: `{term.get('after', '')}`",
                "",
            ]
        )
    if number:
        lines.extend(
            [
                "### 숫자·단위 정리",
                "",
                f"- Before: `{number.get('before', '')}`",
                f"- After: `{number.get('after', '')}`",
                "",
            ]
        )

    lines.extend(
        [
            "## Before / After 샘플",
            "",
            "| ID | 사유 | Before | After | glued Before→After |",
            "|----|------|--------|-------|---------------------|",
        ]
    )

    for sample in metrics.get("samples", []):
        b = sample.get("beforeMetrics", {})
        a = sample.get("afterMetrics", {})
        glued = f"{b.get('longestGlued', 0)}→{a.get('longestGlued', 0)}"
        lines.append(
            f"| `{sample['questionId']}` | {sample['reason']} | "
            f"{sample['beforeQuestion']} | {sample['afterQuestion']} | {glued} |"
        )

    lines.extend(
        [
            "",
            "## Notes",
            "",
            "- OCR 오류 수정이 아니라 **수험생 가독성** 목적의 Display Layer",
            "- 원본 JSON 필드는 변경하지 않음 (`applyQuestionCleanup`은 fetch 후 메모리 적용)",
            "- 회계 용어 사전: `js/accounting-term-dictionary.js`",
            "",
        ]
    )
    return "\n".join(lines)


def main() -> int:
    if not QUESTION_DB.exists():
        print("FAIL: question-db-mvp.json missing")
        return 1

    metrics = run_metrics_node() or build_metrics_report()
    METRICS_JSON.parent.mkdir(parents=True, exist_ok=True)
    METRICS_JSON.write_text(json.dumps(metrics, ensure_ascii=False, indent=2), encoding="utf-8")
    REPORT_MD.write_text(build_report(metrics), encoding="utf-8")

    before = metrics["before"]
    after = metrics["after"]
    print("Display Cleanup Report")
    print(f"- glued questions: {before['gluedQuestions']} -> {after['gluedQuestions']}")
    print(f"- longest glued: {before['longestGlued']} -> {after['longestGlued']}")
    print(f"- unformatted numbers: {before['unformattedNumbers']} -> {after['unformattedNumbers']}")
    print(f"- report: {REPORT_MD}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
