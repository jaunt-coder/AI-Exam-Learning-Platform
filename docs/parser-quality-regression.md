# Parser Quality Regression Report

- 생성일: 2026-07-19
- 기준: `source/original-exams/` (AI 추론 금지)

## Before → After

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| stem_truncated | 98 | 98 | +0 |
| missing_numbers | 81 | 80 | -1 |
| missing_units | 36 | 35 | -1 |
| choice_split | 14 | 2 | -12 |
| duplicate_context | 2 | 0 | -2 |
| table_parse | 0 | 0 | +0 |
| ocr_glued_hangul | 111 | 111 | +0 |
| Source Fidelity (avg) | 80.20% | 90.84% | +10.64% |
| repair_queue_size | 238 | 183 | -55 |

## Target Gate

| Gate | Target | After |
|------|--------|-------|
| missing_numbers | 0 | 80 |
| missing_units | 0 | 35 |
| duplicate_context | 0 | 0 |
| choice_split | 0 | 2 |
| stem_truncated | 0 | 98 |
| Source Fidelity ≥99% | 240/240 | 61/240 |
