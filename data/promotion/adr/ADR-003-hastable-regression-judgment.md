# ADR-003: hasTable True→False Regression Judgment

- Status: **Proposed — Pending Human Approval**
- Date: 2026-07-20
- Deciders: Human (Display / Content) / Engineering Review Lead
- Evidence: `data/promotion/hastable-regression-candidates.md` (n=**25**, full set)
- Related: docs/32 table markdown contract, docs/34 Warning severity, ADR-002

---

## Context

| Metric | Count |
|--------|-------|
| `hasTable` any mismatch | 104 |
| Candidate adds table (False→True) | 79 |
| Candidate removes table (True→False) | **25** ← this ADR |
| All 25: Candidate `table` | **null** |
| All 25: MVP `table` | present (markdown) |

25건 전건 목록:

`ACC_2015_Q051`, `ACC_2017_Q043`, `ACC_2017_Q046`, `ACC_2017_Q048`, `ACC_2017_Q053`, `ACC_2017_Q055`, `ACC_2017_Q067`, `ACC_2018_Q045`, `ACC_2018_Q051`, `ACC_2018_Q059`, `ACC_2018_Q062`, `ACC_2018_Q063`, `ACC_2018_Q069`, `ACC_2020_Q044`, `ACC_2020_Q054`, `ACC_2020_Q058`, `ACC_2024_Q045`, `ACC_2024_Q049`, `ACC_2024_Q054`, `ACC_2024_Q061`, `ACC_2024_Q062`, `ACC_2024_Q079`, `ACC_2025_Q046`, `ACC_2025_Q048`, `ACC_2025_Q054`

### Evidence observation (judgment aid — not auto-verdict)

MVP `table` 미리보기 다수가 다음 형태다:

- 보기 번호(①–⑤) + 금액 열 → **choice grid를 table 필드로 저장한 흔적**
- 예: `ACC_2015_Q051`, `ACC_2017_Q043`, `ACC_2017_Q046`

이 경우 Candidate가 `hasTable=false`인 것은 **stem 표 소실이 아니라 필드 경계 정상화**일 수 있다.  
반대로 원문에 실제 자료표가 있고 Candidate에서만 사라지면 **진성 회귀**다.

자동 분류기는 이번 Approval Sprint에서 **실행하지 않는다**. Human이 PDF(D0)와 대조한다.

---

## Decision Drivers

1. Warning severity 중 학생 UX 회귀 위험이 가장 큰 축.
2. “table 제거 = 무조건 회귀”는 성급 — MVP legacy encoding 오류 가능.
3. Apply 전에 25건을 **진성 회귀 / 오탐 / 보류**로 분류해야 한다.

---

## Judgment Rubric (Human)

각 questionId에 대해 PDF 원문 1회 대조 후 하나의 라벨:

| Label | 정의 | Promotion 함의 |
|-------|------|----------------|
| `TRUE_REGRESSION` | 원문에 stem/자료표가 있는데 Candidate에 없음 | Display Acceptance 차단 요인 |
| `FALSE_ALARM` | MVP table이 사실상 보기 격자/선택지 표이며, Candidate choices에 동등 정보 존재 | 제거 허용 후보 |
| `FIELD_MOVE` | 표 내용이 `question`/`choices`로 이동했고 정보 손실 없음 | 허용 후보 (문서화) |
| `NEEDS_PDF` | 미리보기만으로 판단 불가 | 대조 완료 전 AMBIGUOUS |

### Suggested review order (risk-first)

1. MVP table에 ①–⑤가 **없고** 다열 자료표처럼 보이는 건  
2. Candidate stem이 짧게 잘린 건 (예: `ACC_2015_Q051` stem 미리보기)  
3. 나머지 choice-grid형

---

## Options

### Option H1 — Require 25/25 labeled; zero `TRUE_REGRESSION` before any Apply discussion

| | |
|--|--|
| **장점** | 보수적; 표 소실 UX 사고 방지 |
| **단점** | 일정 비용 (25건 PDF 대조) |
| **영향 범위** | Display Acceptance (ADR-002), Apply Sprint 착수 조건 |
| **Risk** | Low (안전) |

### Option H2 — Allow Apply discussion if `TRUE_REGRESSION` ≤ N with explicit exception IDs

| | |
|--|--|
| **장점** | 부분 진행 |
| **단점** | 예외 관리 부채; canary 없이는 위험 |
| **Risk** | Medium–High |

### Option H3 — Treat all 25 as FALSE_ALARM without PDF review

| | |
|--|--|
| **장점** | 빠름 |
| **단점** | Evidence상 stem 손실 후보 존재; Architecture/품질 원칙 위반 |
| **Risk** | **Unacceptable** — 권고하지 않음 |

---

## Worksheet (fill during Human review — Cursor leaves blank)

| questionId | Label | Notes |
|------------|-------|-------|
| ACC_2015_Q051 | | |
| ACC_2017_Q043 | | |
| ACC_2017_Q046 | | |
| ACC_2017_Q048 | | |
| ACC_2017_Q053 | | |
| ACC_2017_Q055 | | |
| ACC_2017_Q067 | | |
| ACC_2018_Q045 | | |
| ACC_2018_Q051 | | |
| ACC_2018_Q059 | | |
| ACC_2018_Q062 | | |
| ACC_2018_Q063 | | |
| ACC_2018_Q069 | | |
| ACC_2020_Q044 | | |
| ACC_2020_Q054 | | |
| ACC_2020_Q058 | | |
| ACC_2024_Q045 | | |
| ACC_2024_Q049 | | |
| ACC_2024_Q054 | | |
| ACC_2024_Q061 | | |
| ACC_2024_Q062 | | |
| ACC_2024_Q079 | | |
| ACC_2025_Q046 | | |
| ACC_2025_Q048 | | |
| ACC_2025_Q054 | | |

Summary: TRUE_REGRESSION=__ / FALSE_ALARM=__ / FIELD_MOVE=__ / NEEDS_PDF=__

---

## Human Approval

```
[ ] Option H1 — Zero TRUE_REGRESSION required
[ ] Option H2 — Allow exceptions (max N=___ ; IDs: _______________)
[ ] Option H3 — Rejected / not permitted
[ ] DEFER pending worksheet completion

승인자: _______________
일자: _______________
```

---

## Links

- Full evidence: `../hastable-regression-candidates.md`
- Display criteria: `./ADR-002-display-acceptance-criteria.md`
