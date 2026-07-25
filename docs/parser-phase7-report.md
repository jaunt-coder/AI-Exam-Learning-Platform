# Parser Regression — Phase 7 (Source-Truth Emit)

Stage 7 QuestionBuilder (read-only) + Stage 8 DiffEngine skeleton.
목표: 기존 `question-db-mvp.json` 복제가 **아님**. Source Truth 기준 신규 JSON.

## 1. 종합

| 지표 | 값 |
|---|---|
| records | 240 |
| frozen years | 6/6 |
| diff errors | 0 |
| diff warns | 138 |
| emit JSON | `data/regression/parser-emit/question-db-parser.json` |
| MVP DB untouched | True |
| targetsMet | `{'allFrozen': True, 'totalRecords': True, 'diffErrorCount': True}` |

## 2. 연도별

| 연도 | records | answers | tables | diff err | diff warn |
|---|---|---|---|---|---|
| 2015 | 40 | 40 | 13 | 0 | 30 |
| 2017 | 40 | 40 | 18 | 0 | 19 |
| 2018 | 40 | 40 | 16 | 0 | 16 |
| 2020 | 40 | 40 | 16 | 0 | 21 |
| 2024 | 40 | 40 | 14 | 0 | 26 |
| 2025 | 40 | 40 | 15 | 0 | 26 |

## 3. Diff errors (sample)

(none)

## 4. 산출물

- `data/regression/parser-emit/question-db-parser.json`
- `data/regression/ast-sidecar/{year}.json`
- 제품 `data/question-db-mvp.json` **미변경**

