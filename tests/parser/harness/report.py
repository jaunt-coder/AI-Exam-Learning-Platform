"""Baseline report rendering for the regression harness."""
from __future__ import annotations

from datetime import date

from .metrics import QuestionMetrics, STEM_COVERAGE_TARGET, SOURCE_FIDELITY_TARGET


def _fmt_pct(value: float | None) -> str:
    if value is None:
        return "N/A"
    return f"{value * 100:.1f}%"


def render_markdown(
    aggregate: dict,
    per_year: dict[int, dict],
    per_question: list[QuestionMetrics],
    source_meta: dict,
) -> str:
    means = aggregate["means"]
    counts = aggregate["counts"]
    rates = aggregate["rates"]

    lines = [
        "# Parser Regression Baseline Report",
        "",
        f"- 생성일: {date.today().isoformat()}",
        "- 기준(Source of Truth): `source/original-exams/` (AI 추론 없음)",
        "- 대상: 회계학 41~80번 × 6개 연도 (2015, 2017, 2018, 2020, 2024, 2025)",
        "- 측정 대상 산출물: `data/question-db-mvp.json` (현재 Parser 결과)",
        "- Harness: `tests/parser/harness/` (Parser 엔진과 독립된 측정 지표)",
        "",
        "> 본 리포트는 Phase 0 Baseline이다. Parser는 아직 수정하지 않았다.",
        "> 이후 Phase에서 새 엔진 산출물을 동일 지표로 재측정해 비교한다.",
        "",
        "## 1. 요약 (240문항 기준)",
        "",
        "| 지표 | 값 |",
        "|------|-----|",
        f"| 기대 문항 | {aggregate['totalExpected']} |",
        f"| 추출 문항(present) | {aggregate['present']} |",
        f"| 누락 문항 | {aggregate['missingQuestions']} |",
        f"| stem coverage (평균) | {_fmt_pct(means['stemCoverage'])} |",
        f"| choice coverage (평균) | {_fmt_pct(means['choiceCoverage'])} |",
        f"| table fidelity (평균) | {_fmt_pct(means['tableFidelity'])} |",
        f"| number fidelity (평균) | {_fmt_pct(means['numberFidelity'])} |",
        f"| unit fidelity (평균) | {_fmt_pct(means['unitFidelity'])} |",
        f"| source fidelity (평균) | {_fmt_pct(means['sourceFidelity'])} |",
        f"| question completeness (평균) | {_fmt_pct(means['completeness'])} |",
        f"| duplicate rate | {_fmt_pct(rates['duplicateRate'])} |",
        f"| complete rate | {_fmt_pct(rates['completeRate'])} |",
        "",
        "## 2. 결함 카운트 (target = 0)",
        "",
        "| 항목 | 건수 |",
        "|------|------|",
        f"| stem coverage < {int(STEM_COVERAGE_TARGET*100)}% | {counts['stemCoverageBelowTarget']} |",
        f"| 보기 5개 아님 | {counts['not5Choices']} |",
        f"| 표 기대 문항 | {counts['tableExpected']} |",
        f"| 표 구조 손상 | {counts['tableBroken']} |",
        f"| 숫자 누락 문항 | {counts['numbersMissing']} |",
        f"| 단위 누락 문항 | {counts['unitsMissing']} |",
        f"| source fidelity < {int(SOURCE_FIDELITY_TARGET*100)}% | {counts['sourceFidelityBelowTarget']} |",
        f"| stem/context 중복 | {counts['duplicates']} |",
        f"| 미완성(불완전) 문항 | {counts['incomplete']} |",
        "",
        "## 3. 연도별 요약",
        "",
        "| 연도 | 원본 | 방식 | present | stemCov | choiceCov | numberFid | unitFid | sourceFid | 보기≠5 | 중복 |",
        "|------|------|------|---------|---------|-----------|-----------|---------|-----------|--------|------|",
    ]
    for year in sorted(per_year):
        row = per_year[year]
        lines.append(
            f"| {year} | `{row['sourceFile']}` | {row['sourceKind']} | "
            f"{row['present']}/40 | {_fmt_pct(row['stemCoverage'])} | {_fmt_pct(row['choiceCoverage'])} | "
            f"{_fmt_pct(row['numberFidelity'])} | {_fmt_pct(row['unitFidelity'])} | {_fmt_pct(row['sourceFidelity'])} | "
            f"{row['not5Choices']} | {row['duplicates']} |"
        )

    lines.extend([
        "",
        "## 4. 최하위 문항 (source fidelity 낮은 순 30개)",
        "",
        "| 문항 | present | stemCov | numberFid | unitFid | sourceFid | 보기 | 표손상 | 중복 | 누락숫자(일부) |",
        "|------|---------|---------|-----------|---------|-----------|------|--------|------|----------------|",
    ])
    worst = sorted(per_question, key=lambda m: (m.present, m.source_fidelity))[:30]
    for m in worst:
        table_broken = "-" if m.table_fidelity is None else ("Y" if m.table_fidelity == 0.0 else "N")
        missing = ", ".join(m.missing_numbers[:5]) if m.missing_numbers else ""
        lines.append(
            f"| ACC_{m.year}_Q{m.number:03d} | {'Y' if m.present else 'N'} | "
            f"{_fmt_pct(m.stem_coverage)} | {_fmt_pct(m.number_fidelity)} | {_fmt_pct(m.unit_fidelity)} | "
            f"{_fmt_pct(m.source_fidelity)} | {len_choices(m)} | {table_broken} | "
            f"{'Y' if m.duplicate else 'N'} | {missing} |"
        )

    lines.extend([
        "",
        "## 5. 해석",
        "",
        "- 본 수치는 **현재 Parser의 출발점**이다. 각 Phase 종료 시 동일 harness로 재측정한다.",
        "- 회귀 판정: 새 엔진의 모든 평균 지표가 baseline 대비 하락하지 않고, 결함 카운트가 증가하지 않아야 통과.",
        "- 최종 목표(Design 문서 §7): 숫자/단위/중복/보기/stem 결함 0, source fidelity ≥99% 240/240.",
        "",
    ])
    return "\n".join(lines)


def len_choices(m: QuestionMetrics) -> str:
    return "5" if m.five_choices else "≠5"
