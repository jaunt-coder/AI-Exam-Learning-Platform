# Question Repair Baseline

- 생성일: 2026-07-19
- 기준: `source/original-exams/` 원본 PDF/HWP raw segment
- 원칙: AI 추론 금지 · 원본 1:1 대조

## Summary

| 항목 | 값 |
|------|-----|
| 총 문항 | 240 |
| Critical 이슈 문항 | 8 |
| Warning 이슈 문항 | 124 |
| stem_truncated | 8 |
| ocr_glued_hangul | 124 |
| ocr_footer | 0 |
| missing_numbers | 0 |
| missing_units | 0 |
| table issues | 0 |
| verified (manual) | 0/240 |

**Repair 진행률**: 0/240 (0.0%)

## 연도별 Critical 문항

| 연도 | Critical |
|------|----------|
| 2015 | 0 |
| 2017 | 5 |
| 2018 | 1 |
| 2020 | 0 |
| 2024 | 1 |
| 2025 | 1 |

## Worst 25 (stem coverage 낮음)

| ID | Page | Coverage | Top Issues |
|----|------|----------|------------|
| `ACC_2024_Q045` | p.15 | 14% | stem_truncated |
| `ACC_2017_Q053` | p.19 | 32% | stem_truncated |
| `ACC_2017_Q062` | p.22 | 41% | stem_truncated, ocr_glued_hangul |
| `ACC_2017_Q078` | p.29 | 44% | stem_truncated |
| `ACC_2017_Q047` | p.16 | 48% | stem_truncated |
| `ACC_2017_Q063` | p.23 | 49% | stem_truncated, ocr_glued_hangul |
| `ACC_2018_Q074` | p.26 | 53% | stem_truncated, ocr_glued_hangul |
| `ACC_2025_Q045` | p.15 | 54% | stem_truncated, ocr_glued_hangul |
| `ACC_2020_Q072` | p.26 | 56% |  |
| `ACC_2020_Q075` | p.27 | 62% | ocr_glued_hangul |
| `ACC_2025_Q060` | p.20 | 65% |  |
| `ACC_2024_Q043` | p.14 | 66% | ocr_glued_hangul |
| `ACC_2025_Q058` | p.19 | 67% |  |
| `ACC_2025_Q046` | p.15 | 68% |  |
| `ACC_2024_Q064` | p.21 | 71% | ocr_glued_hangul |
| `ACC_2024_Q044` | p.14 | 73% |  |
| `ACC_2025_Q043` | p.14 | 78% | ocr_glued_hangul |
| `ACC_2017_Q051` | p.18 | 82% | ocr_glued_hangul |
| `ACC_2024_Q061` | p.20 | 82% |  |
| `ACC_2015_Q042` | p.8 | 84% |  |
| `ACC_2025_Q049` | p.16 | 84% |  |
| `ACC_2017_Q042` | p.14 | 86% |  |
| `ACC_2017_Q058` | p.21 | 86% |  |
| `ACC_2018_Q065` | p.23 | 86% |  |
| `ACC_2018_Q067` | p.23 | 86% |  |

## Repair Workflow

1. `docs/30-question-quality-repair-spec.md` 확인
2. PDF/HWP 원본과 Worst 문항부터 대조
3. `data/repair/verified/{questionId}.json` 작성
4. `py -3 scripts/validate-question-repair.py` 로 진행률 확인
5. (후속) `apply-question-repair.py` 로 DB 반영

## 산출물

- JSON: `data/repair/source-baseline.json`
- Spec: `docs/30-question-quality-repair-spec.md`
