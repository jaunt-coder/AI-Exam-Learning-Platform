# Parser Regression — Phase 6.9 (IR Integrity Gate)

Stage 6.7 SemanticRepair → 6.8 SemanticValidator(순수) → 6.9 IR Integrity.
문항번호·연도·questionId 하드코딩 없음.

- 대상: MVP [2015, 2017, 2018, 2020, 2024, 2025]

## 1. 종합 지표

| 지표 | 값 | 목표 |
|---|---|---|
| frozen years | 6/6 | 전부 FROZEN |
| integrity errors | 0 | 0 |
| integrity warns | 0 | 최소화 |
| targetsMet | `{'allFrozen': True, 'integrityErrorCount': True}` | |

## 2. 연도별

| 연도 | frozen | errors | warns | Q pass | semanticScore | repairs |
|---|---|---|---|---|---|---|
| 2015 | True | 0 | 0 | 40/40 | 99.92 | 39 |
| 2017 | True | 0 | 0 | 40/40 | 100.0 | 0 |
| 2018 | True | 0 | 0 | 40/40 | 100.0 | 0 |
| 2020 | True | 0 | 0 | 40/40 | 100.0 | 0 |
| 2024 | True | 0 | 0 | 40/40 | 100.0 | 0 |
| 2025 | True | 0 | 0 | 40/40 | 100.0 | 0 |

## 3. Integrity Violation 목록

**Errors: 0건**


Warns: 0건

## 4. 해석

- 6.7에서만 mutate(orphan unit 결합·degenerate table 제거).
- 6.8은 순수 검증. 6.9는 Freeze Gate (Builder 진입 조건).
- Stage 7 Builder는 `docs/32-parser-emit-contract.md` 승인 전 구현 금지.

