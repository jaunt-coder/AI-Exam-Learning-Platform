# Question Repair Baseline

- 생성일: 2026-07-19
- 기준: `source/original-exams/` 원본 PDF/HWP raw segment
- 원칙: AI 추론 금지 · 원본 1:1 대조

## Summary

| 항목 | 값 |
|------|-----|
| 총 문항 | 240 |
| Critical 이슈 문항 | 36 |
| Warning 이슈 문항 | 138 |
| stem_truncated | 36 |
| ocr_glued_hangul | 111 |
| ocr_footer | 0 |
| missing_numbers | 19 |
| missing_units | 35 |
| table issues | 0 |
| verified (manual) | 0/240 |

**Repair 진행률**: 0/240 (0.0%)

## 연도별 Critical 문항

| 연도 | Critical |
|------|----------|
| 2015 | 24 |
| 2017 | 6 |
| 2018 | 2 |
| 2020 | 1 |
| 2024 | 1 |
| 2025 | 2 |

## Worst 25 (stem coverage 낮음)

| ID | Page | Coverage | Top Issues |
|----|------|----------|------------|
| `ACC_2015_Q051` | p.9 | 0% | stem_truncated, ocr_glued_hangul |
| `ACC_2018_Q055` | p.20 | 6% | stem_truncated, missing_numbers, missing_units |
| `ACC_2017_Q048` | p.16 | 13% | stem_truncated, missing_units |
| `ACC_2024_Q045` | p.15 | 14% | stem_truncated, missing_units |
| `ACC_2015_Q049` | p.9 | 14% | stem_truncated, ocr_glued_hangul |
| `ACC_2015_Q075` | p.14 | 20% | stem_truncated, ocr_glued_hangul |
| `ACC_2015_Q054` | p.10 | 22% | stem_truncated, ocr_glued_hangul |
| `ACC_2015_Q044` | p.8 | 22% | stem_truncated, missing_numbers, missing_units |
| `ACC_2025_Q045` | p.15 | 25% | stem_truncated, missing_numbers, missing_units |
| `ACC_2015_Q067` | p.13 | 25% | stem_truncated, missing_numbers, ocr_glued_hangul |
| `ACC_2015_Q047` | p.9 | 26% | stem_truncated, missing_numbers, ocr_glued_hangul |
| `ACC_2015_Q065` | p.12 | 26% | stem_truncated, ocr_glued_hangul |
| `ACC_2015_Q064` | p.12 | 28% | stem_truncated, ocr_glued_hangul |
| `ACC_2017_Q062` | p.22 | 30% | stem_truncated, missing_numbers, missing_units |
| `ACC_2017_Q053` | p.19 | 32% | stem_truncated |
| `ACC_2015_Q062` | p.12 | 36% | stem_truncated, missing_numbers, ocr_glued_hangul |
| `ACC_2015_Q078` | p.15 | 38% | stem_truncated, ocr_glued_hangul |
| `ACC_2017_Q063` | p.23 | 40% | stem_truncated, missing_units, ocr_glued_hangul |
| `ACC_2015_Q048` | p.9 | 40% | stem_truncated, ocr_glued_hangul |
| `ACC_2015_Q060` | p.11 | 42% | stem_truncated, ocr_glued_hangul |
| `ACC_2015_Q072` | p.14 | 43% | stem_truncated, ocr_glued_hangul |
| `ACC_2015_Q045` | p.8 | 44% | stem_truncated, ocr_glued_hangul |
| `ACC_2025_Q047` | p.16 | 45% | stem_truncated, missing_numbers, missing_units |
| `ACC_2015_Q041` | p.7 | 45% | stem_truncated, ocr_glued_hangul |
| `ACC_2017_Q051` | p.18 | 46% | stem_truncated, missing_numbers, missing_units |

## Repair Workflow

1. `docs/30-question-quality-repair-spec.md` 확인
2. PDF/HWP 원본과 Worst 문항부터 대조
3. `data/repair/verified/{questionId}.json` 작성
4. `py -3 scripts/validate-question-repair.py` 로 진행률 확인
5. (후속) `apply-question-repair.py` 로 DB 반영

## 산출물

- JSON: `data/repair/source-baseline.json`
- Spec: `docs/30-question-quality-repair-spec.md`
