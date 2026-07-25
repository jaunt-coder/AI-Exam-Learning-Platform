# Parser Regression — Phase 6.8 (Semantic Validation Engine)

Geometry 복원 이후 AST가 **회계 의미 구조**를 만족하는지 일반 Rule로 검증한다.
문항번호·연도·questionId 하드코딩 없음.

- 대상: MVP [2015, 2017, 2018, 2020, 2024, 2025]

## 1. 종합 지표

| 지표 | 값 | 목표 |
|---|---|---|
| semantic score | 99.99% (99.99/100) | ≥99% |
| semantic violation (errors) | 0 | 0 |
| semantic warns | 1 | 최소화 |
| orphan token count | 0 | 0 |
| orphan repairs (pre-validate) | 39 | - |
| header validation accuracy | 100.00% | ↑ |
| numeric context accuracy | 100.00% | ↑ |
| blank cell ratio | 24.99% | 최소화 |
| table consistency score | 100.00% | ↑ |
| choice accuracy | 100.00% | 100% |

목표 달성: `{'semanticScore': True, 'semanticErrorCount': True, 'orphanTokenCount': True}`

## 2. Semantic Rules

| Rule | 검사 내용 |
|---|---|
| YearHeaderRule | 연도 헤더 행/열에 숫자 동반 |
| PresentValueTableRule | 현가/연금/복리 헤더 → 표 내 숫자 |
| DebitCreditRule | 차변+대변 → ≥2열 |
| ChoiceCountRule | ①~⑤ 존재 시 Choice 5개 |
| TotalHeaderRule | 합계/총계/기말(단독) → 同行/다음行 숫자 |
| PercentHeaderRule | 상단 % 헤더 → 同열 아래 숫자 |
| OrphanUnitRule | ￦/원/주/% 단독 셀 금지 |
| BlankCellRule | 빈 셀 비율(warn) |

검증 전 일반 수리: `repair_orphan_units` — 단독 단위 셀을 Chebyshev≤2 내 숫자 셀에 결합 (행/열 개수 불변).

## 3. 연도별

| 연도 | score | errors | warns | orphans | repairs | blank | choice |
|---|---|---|---|---|---|---|---|
| 2015 | 99.92 | 0 | 1 | 0 | 39 | 53.69% | 100.00% |
| 2017 | 100.0 | 0 | 0 | 0 | 0 | 20.28% | 100.00% |
| 2018 | 100.0 | 0 | 0 | 0 | 0 | 17.90% | 100.00% |
| 2020 | 100.0 | 0 | 0 | 0 | 0 | 19.84% | 100.00% |
| 2024 | 100.0 | 0 | 0 | 0 | 0 | 19.04% | 100.00% |
| 2025 | 100.0 | 0 | 0 | 0 | 0 | 19.16% | 100.00% |

## 4. Semantic Violation 목록

**Errors: 0건**

Warns: 1건 (빈 셀 비율 등 — 오류 아님)

- 2015 Q43: BlankCellRule — 빈 셀 비율이 높음 (75%)

## 5. 해석

- Geometry 복원(Stage 1~6.5) 위에 **회계 의미 제약**을 얹어 AST 품질을 게이트한다.
- Rule은 헤더/토큰/열 구조 패턴만 사용하며 특정 시험·문항 ID에 의존하지 않는다.
- 구조 정화: mutate는 Stage 6.7 `SemanticRepair`, 검증은 Stage 6.8 순수 유지.
- 다음 단계: Stage 6.9 IR Integrity Gate → Emit Contract 승인 → Stage 7 Builder(read-only).
