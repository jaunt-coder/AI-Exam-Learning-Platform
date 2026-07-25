# Pattern Boundary Audit

Date: 2026-07-26
Role: Pattern Auditor
Scope: **전체 240문항** (question-db-mvp.json · read-only)
Status: **AUDIT ONLY — SoT 변경 없음**

---

## 1. Purpose

Chapter First(목차 분류)와 시험장 Pattern(사고 알고리즘) 사이의 **불일치**를 식별한다.
특히 재고자산 Chapter에 원가회계(종합원가·환산량 등)가 섞인 경우를 우선 표기한다.

이번 Sprint는 **수정하지 않는다.** Audit · 후보 목록만 산출한다.

---

## 2. Method

| Layer | Source |
|-------|--------|
| Question / Pattern mapping | `data/question-db-mvp.json` · `patternId` / `chapterId` |
| Pattern name | `data/pattern-db-mvp.json` |
| 원본 PDF 가능 여부 | `data/question-source-map.json` |
| Actual Algorithm | stem + `solution.algorithm/summary/explanation` 키워드 규칙 |
| Domain | `financial_accounting` / `cost_accounting` / `tax_accounting` |

보조 스크립트(재현용, SoT 미수정): `data/analysis/_run_pattern_boundary_audit.py`

### Decision 코드

| Decision | Meaning | Class |
|----------|---------|-------|
| KEEP | 현재 Pattern 적합 | A |
| MOVE | Domain/Chapter/Pattern 재배치 필요 | B |
| LINK | Multiple Pattern(primary + related) 필요 | C |
| NEW_CANDIDATE | 신규 Pattern 후보(미생성) | D |

---

## 3. Coverage Summary

| Metric | Value |
|--------|------:|
| Questions audited | 240 |
| Source PDF available | 160 |
| Source PDF unavailable | 80 |
| Domain financial | 188 |
| Domain cost | 48 |
| Domain tax | 4 |
| KEEP | 176 |
| MOVE | 18 |
| LINK | 29 |
| NEW_CANDIDATE | 17 |

Class A/B/C/D: {'A': 176, 'B': 18, 'C': 29, 'D': 17}

### Source PDF by year

| Year | Total | PDF OK |
|-----:|------:|-------:|
| 2015 | 40 | 0 |
| 2017 | 40 | 0 |
| 2018 | 40 | 40 |
| 2020 | 40 | 40 |
| 2024 | 40 | 40 |
| 2025 | 40 | 40 |

---

## 4. High-Risk Findings (원가·재고 혼합)

우선 검토 대상: **53**문항 (INV/COST/TAX 주변 + cost Domain 불일치)

| Question | Current Pattern | Actual Algorithm | Domain | Decision | Source | Note |
|----------|-----------------|------------------|--------|----------|--------|------|
| ACC_2015_Q071 | ACC_REV_001 (수익인식) | 전부·변동원가·CVP | cost_accounting | **LINK** | N · pdf_missing | 재무 Chapter/Pattern에 원가 Algorithm(전부·변동원가·CVP) — primary/related 분리 필요 |
| ACC_2015_Q073 | ACC_GEN_001 (회계학 일반) | 종합원가·환산량 | cost_accounting | **NEW_CANDIDATE** | N · pdf_missing | Chapter=ACC_GEN Pattern=ACC_GEN_001 이나 실제는 종합원가·환산량 |
| ACC_2015_Q074 | ACC_GEN_001 (회계학 일반) | 개별·활동기준원가 | cost_accounting | **LINK** | N · pdf_missing | 재무 Chapter/Pattern에 원가 Algorithm(개별·활동기준원가) — primary/related 분리 필요 |
| ACC_2015_Q075 | ACC_INV_006 (FIFO·총평균법 매출원가) | 종합원가·환산량 | cost_accounting | **NEW_CANDIDATE** | N · pdf_missing | Chapter=ACC_INV Pattern=ACC_INV_006 이나 실제는 종합원가·환산량 |
| ACC_2015_Q076 | ACC_REV_001 (수익인식) | 개별·활동기준원가 | cost_accounting | **LINK** | N · pdf_missing | 재무 Chapter/Pattern에 원가 Algorithm(개별·활동기준원가) — primary/related 분리 필요 |
| ACC_2015_Q077 | ACC_GEN_001 (회계학 일반) | 개별·활동기준원가 | cost_accounting | **LINK** | N · pdf_missing | 재무 Chapter/Pattern에 원가 Algorithm(개별·활동기준원가) — primary/related 분리 필요 |
| ACC_2015_Q079 | ACC_INT_001 (무형자산) | 개별·활동기준원가 | cost_accounting | **LINK** | N · pdf_missing | 재무 Chapter/Pattern에 원가 Algorithm(개별·활동기준원가) — primary/related 분리 필요 |
| ACC_2015_Q080 | ACC_INT_001 (무형자산) | 제조원가 흐름(재무·원가 경계) | cost_accounting | **LINK** | N · pdf_missing | 재무 Chapter/Pattern에 원가 Algorithm(제조원가 흐름(재무·원가 경계)) — primary/related 분리 필요 |
| ACC_2017_Q069 | ACC_INV_006 (FIFO·총평균법 매출원가) | 자본·EPS | financial_accounting | **MOVE** | N · pdf_missing | 재고 Pattern에 자본·EPS 매핑 |
| ACC_2017_Q071 | ACC_REV_001 (수익인식) | 제조원가 흐름(재무·원가 경계) | cost_accounting | **LINK** | N · pdf_missing | 재무 Chapter/Pattern에 원가 Algorithm(제조원가 흐름(재무·원가 경계)) — primary/related 분리 필요 |
| ACC_2017_Q072 | ACC_GEN_001 (회계학 일반) | 표준원가·차이분석 | cost_accounting | **NEW_CANDIDATE** | N · pdf_missing | Chapter=ACC_GEN Pattern=ACC_GEN_001 이나 실제는 표준원가·차이분석 |
| ACC_2017_Q073 | ACC_REV_001 (수익인식) | 전부·변동원가·CVP | cost_accounting | **LINK** | N · pdf_missing | 재무 Chapter/Pattern에 원가 Algorithm(전부·변동원가·CVP) — primary/related 분리 필요 |
| ACC_2017_Q074 | ACC_GEN_001 (회계학 일반) | 전부·변동원가·CVP | cost_accounting | **LINK** | N · pdf_missing | 재무 Chapter/Pattern에 원가 Algorithm(전부·변동원가·CVP) — primary/related 분리 필요 |
| ACC_2017_Q075 | ACC_REV_001 (수익인식) | 전부·변동원가·CVP | cost_accounting | **LINK** | N · pdf_missing | 재무 Chapter/Pattern에 원가 Algorithm(전부·변동원가·CVP) — primary/related 분리 필요 |
| ACC_2017_Q077 | ACC_INV_006 (FIFO·총평균법 매출원가) | 종합원가·환산량 | cost_accounting | **NEW_CANDIDATE** | N · pdf_missing | Chapter=ACC_INV Pattern=ACC_INV_006 이나 실제는 종합원가·환산량 |
| ACC_2017_Q079 | ACC_GEN_001 (회계학 일반) | 전부·변동원가·CVP | cost_accounting | **LINK** | N · pdf_missing | 재무 Chapter/Pattern에 원가 Algorithm(전부·변동원가·CVP) — primary/related 분리 필요 |
| ACC_2017_Q080 | ACC_INV_006 (FIFO·총평균법 매출원가) | 종합원가·환산량 | cost_accounting | **NEW_CANDIDATE** | N · pdf_missing | Chapter=ACC_INV Pattern=ACC_INV_006 이나 실제는 종합원가·환산량 |
| ACC_2018_Q071 | ACC_INT_001 (무형자산) | 전부·변동원가·CVP | cost_accounting | **LINK** | Y · p.25 · Q71 | 재무 Chapter/Pattern에 원가 Algorithm(전부·변동원가·CVP) — primary/related 분리 필요 |
| ACC_2018_Q072 | ACC_GEN_001 (회계학 일반) | 개별·활동기준원가 | cost_accounting | **LINK** | Y · p.25 · Q72 | 재무 Chapter/Pattern에 원가 Algorithm(개별·활동기준원가) — primary/related 분리 필요 |
| ACC_2018_Q073 | ACC_GEN_001 (회계학 일반) | 개별·활동기준원가 | cost_accounting | **LINK** | Y · p.25 · Q73 | 재무 Chapter/Pattern에 원가 Algorithm(개별·활동기준원가) — primary/related 분리 필요 |
| ACC_2018_Q075 | ACC_REV_001 (수익인식) | 전부·변동원가·CVP | cost_accounting | **LINK** | Y · p.26 · Q75 | 재무 Chapter/Pattern에 원가 Algorithm(전부·변동원가·CVP) — primary/related 분리 필요 |
| ACC_2018_Q076 | ACC_REV_001 (수익인식) | 종합원가·환산량 | cost_accounting | **NEW_CANDIDATE** | Y · p.26 · Q76 | Chapter=ACC_REV Pattern=ACC_REV_001 이나 실제는 종합원가·환산량 |
| ACC_2018_Q078 | ACC_GEN_001 (회계학 일반) | 전부·변동원가·CVP | cost_accounting | **LINK** | Y · p.27 · Q78 | 재무 Chapter/Pattern에 원가 Algorithm(전부·변동원가·CVP) — primary/related 분리 필요 |
| ACC_2018_Q079 | ACC_INV_006 (FIFO·총평균법 매출원가) | 종합원가·환산량 | cost_accounting | **NEW_CANDIDATE** | Y · p.28 · Q79 | Chapter=ACC_INV Pattern=ACC_INV_006 이나 실제는 종합원가·환산량 |
| ACC_2018_Q080 | ACC_REV_001 (수익인식) | 종합원가·환산량 | cost_accounting | **NEW_CANDIDATE** | Y · p.28 · Q80 | Chapter=ACC_REV Pattern=ACC_REV_001 이나 실제는 종합원가·환산량 |
| ACC_2020_Q063 | ACC_INV_006 (FIFO·총평균법 매출원가) | 자본·EPS | financial_accounting | **MOVE** | Y · p.22 · Q63 | 재고 Pattern에 자본·EPS 매핑 |
| ACC_2020_Q071 | ACC_GEN_001 (회계학 일반) | 개별·활동기준원가 | cost_accounting | **LINK** | Y · p.25 · Q71 | 재무 Chapter/Pattern에 원가 Algorithm(개별·활동기준원가) — primary/related 분리 필요 |
| ACC_2020_Q073 | ACC_INV_006 (FIFO·총평균법 매출원가) | 종합원가·환산량 | cost_accounting | **NEW_CANDIDATE** | Y · p.26 · Q73 | Chapter=ACC_INV Pattern=ACC_INV_006 이나 실제는 종합원가·환산량 |
| ACC_2020_Q074 | ACC_GEN_001 (회계학 일반) | 종합원가·환산량 | cost_accounting | **NEW_CANDIDATE** | Y · p.27 · Q74 | Chapter=ACC_GEN Pattern=ACC_GEN_001 이나 실제는 종합원가·환산량 |
| ACC_2020_Q075 | ACC_GEN_001 (회계학 일반) | 표준원가·차이분석 | cost_accounting | **NEW_CANDIDATE** | Y · p.27 · Q75 | Chapter=ACC_GEN Pattern=ACC_GEN_001 이나 실제는 표준원가·차이분석 |
| ACC_2020_Q076 | ACC_INV_006 (FIFO·총평균법 매출원가) | 전부·변동원가·CVP | cost_accounting | **LINK** | Y · p.28 · Q76 | 재무 Chapter/Pattern에 원가 Algorithm(전부·변동원가·CVP) — primary/related 분리 필요 |
| ACC_2020_Q080 | ACC_GEN_001 (회계학 일반) | 개별·활동기준원가 | cost_accounting | **LINK** | Y · p.29 · Q80 | 재무 Chapter/Pattern에 원가 Algorithm(개별·활동기준원가) — primary/related 분리 필요 |
| ACC_2024_Q047 | ACC_INV_006 (FIFO·총평균법 매출원가) | 자본·EPS | financial_accounting | **MOVE** | Y · p.15 · Q47 | 재고 Pattern에 자본·EPS 매핑 |
| ACC_2024_Q071 | ACC_REV_001 (수익인식) | 개별·활동기준원가 | cost_accounting | **LINK** | Y · p.24 · Q71 | 재무 Chapter/Pattern에 원가 Algorithm(개별·활동기준원가) — primary/related 분리 필요 |
| ACC_2024_Q073 | ACC_INV_006 (FIFO·총평균법 매출원가) | 종합원가·환산량 | cost_accounting | **NEW_CANDIDATE** | Y · p.24 · Q73 | Chapter=ACC_INV Pattern=ACC_INV_006 이나 실제는 종합원가·환산량 |
| ACC_2024_Q074 | ACC_GEN_001 (회계학 일반) | 종합원가·환산량 | cost_accounting | **NEW_CANDIDATE** | Y · p.25 · Q74 | Chapter=ACC_GEN Pattern=ACC_GEN_001 이나 실제는 종합원가·환산량 |
| ACC_2024_Q075 | ACC_INV_006 (FIFO·총평균법 매출원가) | 전부·변동원가·CVP | cost_accounting | **LINK** | Y · p.25 · Q75 | 재무 Chapter/Pattern에 원가 Algorithm(전부·변동원가·CVP) — primary/related 분리 필요 |
| ACC_2024_Q076 | ACC_INV_007 (LCM·순실현가능가치 평가) | 종합원가·환산량 | cost_accounting | **NEW_CANDIDATE** | Y · p.25 · Q76 | Chapter=ACC_INV Pattern=ACC_INV_007 이나 실제는 종합원가·환산량 |
| ACC_2024_Q077 | ACC_TAX_001 (법인세) | 전부·변동원가·CVP | cost_accounting | **LINK** | Y · p.26 · Q77 | 재무 Chapter/Pattern에 원가 Algorithm(전부·변동원가·CVP) — primary/related 분리 필요 |
| ACC_2024_Q080 | ACC_GEN_001 (회계학 일반) | 전부·변동원가·CVP | cost_accounting | **LINK** | Y · p.26 · Q80 | 재무 Chapter/Pattern에 원가 Algorithm(전부·변동원가·CVP) — primary/related 분리 필요 |
| ACC_2025_Q051 | ACC_INV_003 (운반비·부대비용과 재고원가) | 유형자산·감가상각 | financial_accounting | **MOVE** | Y · p.17 · Q51 | 재고 Pattern에 유형자산·감가상각 매핑 |
| ACC_2025_Q053 | ACC_INV_003 (운반비·부대비용과 재고원가) | 유형자산·감가상각 | financial_accounting | **MOVE** | Y · p.18 · Q53 | 재고 Pattern에 유형자산·감가상각 매핑 |
| ACC_2025_Q063 | ACC_INV_006 (FIFO·총평균법 매출원가) | 자본·EPS | financial_accounting | **MOVE** | Y · p.21 · Q63 | 재고 Pattern에 자본·EPS 매핑 |
| ACC_2025_Q065 | ACC_INV_003 (운반비·부대비용과 재고원가) | 리스 | financial_accounting | **MOVE** | Y · p.22 · Q65 | 재고 Pattern에 리스 매핑 |
| ACC_2025_Q071 | ACC_REV_001 (수익인식) | 개별·활동기준원가 | cost_accounting | **LINK** | Y · p.24 · Q71 | 재무 Chapter/Pattern에 원가 Algorithm(개별·활동기준원가) — primary/related 분리 필요 |
| ACC_2025_Q072 | ACC_REV_001 (수익인식) | 개별·활동기준원가 | cost_accounting | **LINK** | Y · p.24 · Q72 | 재무 Chapter/Pattern에 원가 Algorithm(개별·활동기준원가) — primary/related 분리 필요 |
| ACC_2025_Q073 | ACC_INV_006 (FIFO·총평균법 매출원가) | 종합원가·환산량 | cost_accounting | **NEW_CANDIDATE** | Y · p.25 · Q73 | Chapter=ACC_INV Pattern=ACC_INV_006 이나 실제는 종합원가·환산량 |
| ACC_2025_Q074 | ACC_GEN_001 (회계학 일반) | 결합원가·주부산품 | cost_accounting | **NEW_CANDIDATE** | Y · p.25 · Q74 | Chapter=ACC_GEN Pattern=ACC_GEN_001 이나 실제는 결합원가·주부산품 |
| ACC_2025_Q075 | ACC_GEN_001 (회계학 일반) | 표준원가·차이분석 | cost_accounting | **NEW_CANDIDATE** | Y · p.25 · Q75 | Chapter=ACC_GEN Pattern=ACC_GEN_001 이나 실제는 표준원가·차이분석 |
| ACC_2025_Q076 | ACC_GEN_001 (회계학 일반) | 전부·변동원가·CVP | cost_accounting | **LINK** | Y · p.26 · Q76 | 재무 Chapter/Pattern에 원가 Algorithm(전부·변동원가·CVP) — primary/related 분리 필요 |
| ACC_2025_Q077 | ACC_REV_001 (수익인식) | 전부·변동원가·CVP | cost_accounting | **LINK** | Y · p.26 · Q77 | 재무 Chapter/Pattern에 원가 Algorithm(전부·변동원가·CVP) — primary/related 분리 필요 |
| ACC_2025_Q078 | ACC_GEN_001 (회계학 일반) | 개별·활동기준원가 | cost_accounting | **LINK** | Y · p.26 · Q78 | 재무 Chapter/Pattern에 원가 Algorithm(개별·활동기준원가) — primary/related 분리 필요 |
| ACC_2025_Q079 | ACC_INV_006 (FIFO·총평균법 매출원가) | 전부·변동원가·CVP | cost_accounting | **LINK** | Y · p.27 · Q79 | 재무 Chapter/Pattern에 원가 Algorithm(전부·변동원가·CVP) — primary/related 분리 필요 |

---

## 5. Multiple Pattern 후보 (LINK)

총 29문항 — primary(재무 재고 등) + related(원가·관리) 구조 후보.

권장 향후 필드(미적용):

```json
{
  "questionId": "ACC_2020_Q073",
  "primaryPattern": "COST_PROCESS_001",
  "relatedPatterns": ["ACC_INV_006"]
}
```

| Question | Current Pattern | Actual Algorithm | Domain | Decision |
|----------|-----------------|------------------|--------|----------|
| ACC_2015_Q071 | ACC_REV_001 | 전부·변동원가·CVP | cost_accounting | LINK |
| ACC_2015_Q074 | ACC_GEN_001 | 개별·활동기준원가 | cost_accounting | LINK |
| ACC_2015_Q076 | ACC_REV_001 | 개별·활동기준원가 | cost_accounting | LINK |
| ACC_2015_Q077 | ACC_GEN_001 | 개별·활동기준원가 | cost_accounting | LINK |
| ACC_2015_Q079 | ACC_INT_001 | 개별·활동기준원가 | cost_accounting | LINK |
| ACC_2015_Q080 | ACC_INT_001 | 제조원가 흐름(재무·원가 경계) | cost_accounting | LINK |
| ACC_2017_Q071 | ACC_REV_001 | 제조원가 흐름(재무·원가 경계) | cost_accounting | LINK |
| ACC_2017_Q073 | ACC_REV_001 | 전부·변동원가·CVP | cost_accounting | LINK |
| ACC_2017_Q074 | ACC_GEN_001 | 전부·변동원가·CVP | cost_accounting | LINK |
| ACC_2017_Q075 | ACC_REV_001 | 전부·변동원가·CVP | cost_accounting | LINK |
| ACC_2017_Q079 | ACC_GEN_001 | 전부·변동원가·CVP | cost_accounting | LINK |
| ACC_2018_Q071 | ACC_INT_001 | 전부·변동원가·CVP | cost_accounting | LINK |
| ACC_2018_Q072 | ACC_GEN_001 | 개별·활동기준원가 | cost_accounting | LINK |
| ACC_2018_Q073 | ACC_GEN_001 | 개별·활동기준원가 | cost_accounting | LINK |
| ACC_2018_Q075 | ACC_REV_001 | 전부·변동원가·CVP | cost_accounting | LINK |
| ACC_2018_Q078 | ACC_GEN_001 | 전부·변동원가·CVP | cost_accounting | LINK |
| ACC_2020_Q071 | ACC_GEN_001 | 개별·활동기준원가 | cost_accounting | LINK |
| ACC_2020_Q076 | ACC_INV_006 | 전부·변동원가·CVP | cost_accounting | LINK |
| ACC_2020_Q080 | ACC_GEN_001 | 개별·활동기준원가 | cost_accounting | LINK |
| ACC_2024_Q071 | ACC_REV_001 | 개별·활동기준원가 | cost_accounting | LINK |
| ACC_2024_Q075 | ACC_INV_006 | 전부·변동원가·CVP | cost_accounting | LINK |
| ACC_2024_Q077 | ACC_TAX_001 | 전부·변동원가·CVP | cost_accounting | LINK |
| ACC_2024_Q080 | ACC_GEN_001 | 전부·변동원가·CVP | cost_accounting | LINK |
| ACC_2025_Q071 | ACC_REV_001 | 개별·활동기준원가 | cost_accounting | LINK |
| ACC_2025_Q072 | ACC_REV_001 | 개별·활동기준원가 | cost_accounting | LINK |
| ACC_2025_Q076 | ACC_GEN_001 | 전부·변동원가·CVP | cost_accounting | LINK |
| ACC_2025_Q077 | ACC_REV_001 | 전부·변동원가·CVP | cost_accounting | LINK |
| ACC_2025_Q078 | ACC_GEN_001 | 개별·활동기준원가 | cost_accounting | LINK |
| ACC_2025_Q079 | ACC_INV_006 | 전부·변동원가·CVP | cost_accounting | LINK |

---

## 6. 신규 Pattern 후보 (NEW_CANDIDATE) — 미생성

총 17문항. **Pattern DB에 추가하지 않음** (Audit only).

제안 ID (초안, 미발급):

| Candidate ID | Title | Domain | Evidence Questions |
|--------------|-------|--------|--------------------|
| `COST_PROCESS_001` | 완성품환산량 기반 종합원가 배분 | cost_accounting | ACC_2015_Q073, ACC_2015_Q075, ACC_2017_Q077, ACC_2017_Q080, ACC_2018_Q076, ACC_2018_Q079, ACC_2018_Q080, ACC_2020_Q073… (13) |
| `COST_STD_001` | 표준원가 차이분석 | cost_accounting | ACC_2017_Q072, ACC_2020_Q075, ACC_2025_Q075 (3) |
| `COST_JOINT_001` | 결합원가·주부산품 배분 | cost_accounting | ACC_2025_Q074 (1) |

---

## 7. Full Audit Table (240)

| Question | Current Pattern | Actual Algorithm | Domain | Decision |
|----------|-----------------|------------------|--------|----------|
| ACC_2015_Q041 | ACC_FS_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2015_Q042 | ACC_GEN_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2015_Q043 | ACC_PPE_001 | 유형자산·감가상각 | financial_accounting | KEEP |
| ACC_2015_Q044 | ACC_GEN_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2015_Q045 | ACC_REV_001 | 소매재고·FIFO·LCM(재무 재고) | financial_accounting | KEEP |
| ACC_2015_Q046 | ACC_FS_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2015_Q047 | ACC_GEN_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2015_Q048 | ACC_FIN_001 | 금융상품·사채 | financial_accounting | KEEP |
| ACC_2015_Q049 | ACC_FS_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2015_Q050 | ACC_PPE_001 | 유형자산·감가상각 | financial_accounting | KEEP |
| ACC_2015_Q051 | ACC_EQ_001 | 자본·EPS | financial_accounting | KEEP |
| ACC_2015_Q052 | ACC_REV_001 | 자본·EPS | financial_accounting | KEEP |
| ACC_2015_Q053 | ACC_GEN_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2015_Q054 | ACC_PPE_002 | 유형자산·감가상각 | financial_accounting | KEEP |
| ACC_2015_Q055 | ACC_GEN_001 | 자본·EPS | financial_accounting | MOVE |
| ACC_2015_Q056 | ACC_FIN_002 | 금융상품·사채 | financial_accounting | KEEP |
| ACC_2015_Q057 | ACC_FIN_002 | 자본·EPS | financial_accounting | KEEP |
| ACC_2015_Q058 | ACC_GEN_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2015_Q059 | ACC_PPE_001 | 유형자산·감가상각 | financial_accounting | KEEP |
| ACC_2015_Q060 | ACC_EQ_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2015_Q061 | ACC_INT_001 | 금융상품·사채 | financial_accounting | KEEP |
| ACC_2015_Q062 | ACC_FIN_001 | 금융상품·사채 | financial_accounting | KEEP |
| ACC_2015_Q063 | ACC_FS_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2015_Q064 | ACC_FS_001 | 리스 | financial_accounting | KEEP |
| ACC_2015_Q065 | ACC_EQ_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2015_Q066 | ACC_FS_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2015_Q067 | ACC_GEN_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2015_Q068 | ACC_LEASE_001 | 리스 | financial_accounting | KEEP |
| ACC_2015_Q069 | ACC_GEN_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2015_Q070 | ACC_FIN_001 | 금융상품·사채 | financial_accounting | KEEP |
| ACC_2015_Q071 | ACC_REV_001 | 전부·변동원가·CVP | cost_accounting | LINK |
| ACC_2015_Q072 | ACC_GEN_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2015_Q073 | ACC_GEN_001 | 종합원가·환산량 | cost_accounting | NEW_CANDIDATE |
| ACC_2015_Q074 | ACC_GEN_001 | 개별·활동기준원가 | cost_accounting | LINK |
| ACC_2015_Q075 | ACC_INV_006 | 종합원가·환산량 | cost_accounting | NEW_CANDIDATE |
| ACC_2015_Q076 | ACC_REV_001 | 개별·활동기준원가 | cost_accounting | LINK |
| ACC_2015_Q077 | ACC_GEN_001 | 개별·활동기준원가 | cost_accounting | LINK |
| ACC_2015_Q078 | ACC_REV_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2015_Q079 | ACC_INT_001 | 개별·활동기준원가 | cost_accounting | LINK |
| ACC_2015_Q080 | ACC_INT_001 | 제조원가 흐름(재무·원가 경계) | cost_accounting | LINK |
| ACC_2017_Q041 | ACC_PPE_001 | 유형자산·감가상각 | financial_accounting | KEEP |
| ACC_2017_Q042 | ACC_REV_001 | 수익인식 | financial_accounting | KEEP |
| ACC_2017_Q043 | ACC_FIN_001 | 금융상품·사채 | financial_accounting | KEEP |
| ACC_2017_Q044 | ACC_INT_001 | 리스 | financial_accounting | KEEP |
| ACC_2017_Q045 | ACC_GEN_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2017_Q046 | ACC_EQ_001 | 자본·EPS | financial_accounting | KEEP |
| ACC_2017_Q047 | ACC_PPE_001 | 유형자산·감가상각 | financial_accounting | KEEP |
| ACC_2017_Q048 | ACC_FS_001 | 재무제표 일반 | financial_accounting | KEEP |
| ACC_2017_Q049 | ACC_PPE_001 | 유형자산·감가상각 | financial_accounting | KEEP |
| ACC_2017_Q050 | ACC_INT_001 | 법인세 | tax_accounting | MOVE |
| ACC_2017_Q051 | ACC_FS_001 | 재무제표 일반 | financial_accounting | KEEP |
| ACC_2017_Q052 | ACC_PPE_001 | 자본·EPS | financial_accounting | KEEP |
| ACC_2017_Q053 | ACC_PPE_001 | 유형자산·감가상각 | financial_accounting | KEEP |
| ACC_2017_Q054 | ACC_PPE_001 | 유형자산·감가상각 | financial_accounting | KEEP |
| ACC_2017_Q055 | ACC_PPE_001 | 유형자산·감가상각 | financial_accounting | KEEP |
| ACC_2017_Q056 | ACC_PPE_001 | 유형자산·감가상각 | financial_accounting | KEEP |
| ACC_2017_Q057 | ACC_PPE_001 | 유형자산·감가상각 | financial_accounting | KEEP |
| ACC_2017_Q058 | ACC_FS_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2017_Q059 | ACC_GEN_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2017_Q060 | ACC_GEN_001 | 재무제표 일반 | financial_accounting | MOVE |
| ACC_2017_Q061 | ACC_GEN_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2017_Q062 | ACC_EQ_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2017_Q063 | ACC_INT_001 | 금융상품·사채 | financial_accounting | KEEP |
| ACC_2017_Q064 | ACC_FIN_002 | 자본·EPS | financial_accounting | KEEP |
| ACC_2017_Q065 | ACC_PPE_001 | 자본·EPS | financial_accounting | KEEP |
| ACC_2017_Q066 | ACC_INV_006 | 소매재고·FIFO·LCM(재무 재고) | financial_accounting | KEEP |
| ACC_2017_Q067 | ACC_PPE_001 | 유형자산·감가상각 | financial_accounting | KEEP |
| ACC_2017_Q068 | ACC_REV_001 | 소매재고·FIFO·LCM(재무 재고) | financial_accounting | KEEP |
| ACC_2017_Q069 | ACC_INV_006 | 자본·EPS | financial_accounting | MOVE |
| ACC_2017_Q070 | ACC_GEN_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2017_Q071 | ACC_REV_001 | 제조원가 흐름(재무·원가 경계) | cost_accounting | LINK |
| ACC_2017_Q072 | ACC_GEN_001 | 표준원가·차이분석 | cost_accounting | NEW_CANDIDATE |
| ACC_2017_Q073 | ACC_REV_001 | 전부·변동원가·CVP | cost_accounting | LINK |
| ACC_2017_Q074 | ACC_GEN_001 | 전부·변동원가·CVP | cost_accounting | LINK |
| ACC_2017_Q075 | ACC_REV_001 | 전부·변동원가·CVP | cost_accounting | LINK |
| ACC_2017_Q076 | ACC_GEN_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2017_Q077 | ACC_INV_006 | 종합원가·환산량 | cost_accounting | NEW_CANDIDATE |
| ACC_2017_Q078 | ACC_REV_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2017_Q079 | ACC_GEN_001 | 전부·변동원가·CVP | cost_accounting | LINK |
| ACC_2017_Q080 | ACC_INV_006 | 종합원가·환산량 | cost_accounting | NEW_CANDIDATE |
| ACC_2018_Q041 | ACC_FS_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2018_Q042 | ACC_INV_001 | 소매재고·FIFO·LCM(재무 재고) | financial_accounting | KEEP |
| ACC_2018_Q043 | ACC_PPE_001 | 유형자산·감가상각 | financial_accounting | KEEP |
| ACC_2018_Q044 | ACC_REV_001 | 소매재고·FIFO·LCM(재무 재고) | financial_accounting | KEEP |
| ACC_2018_Q045 | ACC_PPE_001 | 자본·EPS | financial_accounting | KEEP |
| ACC_2018_Q046 | ACC_FS_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2018_Q047 | ACC_EQ_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2018_Q048 | ACC_INT_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2018_Q049 | ACC_GEN_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2018_Q050 | ACC_PPE_001 | 유형자산·감가상각 | financial_accounting | KEEP |
| ACC_2018_Q051 | ACC_INT_001 | 금융상품·사채 | financial_accounting | KEEP |
| ACC_2018_Q052 | ACC_FS_001 | 재무제표 일반 | financial_accounting | KEEP |
| ACC_2018_Q053 | ACC_FIN_002 | 자본·EPS | financial_accounting | KEEP |
| ACC_2018_Q054 | ACC_PPE_001 | 유형자산·감가상각 | financial_accounting | KEEP |
| ACC_2018_Q055 | ACC_GEN_001 | 자본·EPS | financial_accounting | MOVE |
| ACC_2018_Q056 | ACC_FS_001 | 무형자산 | financial_accounting | KEEP |
| ACC_2018_Q057 | ACC_EQ_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2018_Q058 | ACC_GEN_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2018_Q059 | ACC_PPE_001 | 유형자산·감가상각 | financial_accounting | KEEP |
| ACC_2018_Q060 | ACC_INT_001 | 법인세 | tax_accounting | MOVE |
| ACC_2018_Q061 | ACC_EQ_001 | 자본·EPS | financial_accounting | KEEP |
| ACC_2018_Q062 | ACC_FIN_002 | 금융상품·사채 | financial_accounting | KEEP |
| ACC_2018_Q063 | ACC_GEN_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2018_Q064 | ACC_PPE_001 | 자본·EPS | financial_accounting | KEEP |
| ACC_2018_Q065 | ACC_GEN_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2018_Q066 | ACC_INV_006 | 소매재고·FIFO·LCM(재무 재고) | financial_accounting | KEEP |
| ACC_2018_Q067 | ACC_GEN_001 | 소매재고·FIFO·LCM(재무 재고) | financial_accounting | MOVE |
| ACC_2018_Q068 | ACC_INV_006 | 소매재고·FIFO·LCM(재무 재고) | financial_accounting | KEEP |
| ACC_2018_Q069 | ACC_PPE_001 | 유형자산·감가상각 | financial_accounting | KEEP |
| ACC_2018_Q070 | ACC_PPE_001 | 유형자산·감가상각 | financial_accounting | KEEP |
| ACC_2018_Q071 | ACC_INT_001 | 전부·변동원가·CVP | cost_accounting | LINK |
| ACC_2018_Q072 | ACC_GEN_001 | 개별·활동기준원가 | cost_accounting | LINK |
| ACC_2018_Q073 | ACC_GEN_001 | 개별·활동기준원가 | cost_accounting | LINK |
| ACC_2018_Q074 | ACC_GEN_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2018_Q075 | ACC_REV_001 | 전부·변동원가·CVP | cost_accounting | LINK |
| ACC_2018_Q076 | ACC_REV_001 | 종합원가·환산량 | cost_accounting | NEW_CANDIDATE |
| ACC_2018_Q077 | ACC_COST_002 | 개별·활동기준원가 | cost_accounting | KEEP |
| ACC_2018_Q078 | ACC_GEN_001 | 전부·변동원가·CVP | cost_accounting | LINK |
| ACC_2018_Q079 | ACC_INV_006 | 종합원가·환산량 | cost_accounting | NEW_CANDIDATE |
| ACC_2018_Q080 | ACC_REV_001 | 종합원가·환산량 | cost_accounting | NEW_CANDIDATE |
| ACC_2020_Q041 | ACC_FS_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2020_Q042 | ACC_FS_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2020_Q043 | ACC_PPE_001 | 유형자산·감가상각 | financial_accounting | KEEP |
| ACC_2020_Q044 | ACC_FS_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2020_Q045 | ACC_PPE_001 | 유형자산·감가상각 | financial_accounting | KEEP |
| ACC_2020_Q046 | ACC_PPE_001 | 유형자산·감가상각 | financial_accounting | KEEP |
| ACC_2020_Q047 | ACC_PPE_001 | 유형자산·감가상각 | financial_accounting | KEEP |
| ACC_2020_Q048 | ACC_PPE_001 | 유형자산·감가상각 | financial_accounting | KEEP |
| ACC_2020_Q049 | ACC_INV_004 | 소매재고·FIFO·LCM(재무 재고) | financial_accounting | KEEP |
| ACC_2020_Q050 | ACC_PPE_001 | 유형자산·감가상각 | financial_accounting | KEEP |
| ACC_2020_Q051 | ACC_INT_001 | 금융상품·사채 | financial_accounting | KEEP |
| ACC_2020_Q052 | ACC_FS_001 | 재무제표 일반 | financial_accounting | KEEP |
| ACC_2020_Q053 | ACC_EQ_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2020_Q054 | ACC_REV_001 | 수익인식 | financial_accounting | KEEP |
| ACC_2020_Q055 | ACC_PPE_001 | 유형자산·감가상각 | financial_accounting | KEEP |
| ACC_2020_Q056 | ACC_EQ_001 | 자본·EPS | financial_accounting | KEEP |
| ACC_2020_Q057 | ACC_PPE_001 | 유형자산·감가상각 | financial_accounting | KEEP |
| ACC_2020_Q058 | ACC_PPE_001 | 유형자산·감가상각 | financial_accounting | KEEP |
| ACC_2020_Q059 | ACC_LEASE_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2020_Q060 | ACC_FS_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2020_Q061 | ACC_PPE_002 | 유형자산·감가상각 | financial_accounting | KEEP |
| ACC_2020_Q062 | ACC_INT_001 | 법인세 | tax_accounting | MOVE |
| ACC_2020_Q063 | ACC_INV_006 | 자본·EPS | financial_accounting | MOVE |
| ACC_2020_Q064 | ACC_INT_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2020_Q065 | ACC_INT_001 | 자본·EPS | financial_accounting | KEEP |
| ACC_2020_Q066 | ACC_INV_004 | 소매재고·FIFO·LCM(재무 재고) | financial_accounting | KEEP |
| ACC_2020_Q067 | ACC_PPE_001 | 유형자산·감가상각 | financial_accounting | KEEP |
| ACC_2020_Q068 | ACC_PPE_001 | 유형자산·감가상각 | financial_accounting | KEEP |
| ACC_2020_Q069 | ACC_PPE_001 | 자본·EPS | financial_accounting | KEEP |
| ACC_2020_Q070 | ACC_FIN_002 | 금융상품·사채 | financial_accounting | KEEP |
| ACC_2020_Q071 | ACC_GEN_001 | 개별·활동기준원가 | cost_accounting | LINK |
| ACC_2020_Q072 | ACC_GEN_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2020_Q073 | ACC_INV_006 | 종합원가·환산량 | cost_accounting | NEW_CANDIDATE |
| ACC_2020_Q074 | ACC_GEN_001 | 종합원가·환산량 | cost_accounting | NEW_CANDIDATE |
| ACC_2020_Q075 | ACC_GEN_001 | 표준원가·차이분석 | cost_accounting | NEW_CANDIDATE |
| ACC_2020_Q076 | ACC_INV_006 | 전부·변동원가·CVP | cost_accounting | LINK |
| ACC_2020_Q077 | ACC_REV_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2020_Q078 | ACC_INT_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2020_Q079 | ACC_GEN_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2020_Q080 | ACC_GEN_001 | 개별·활동기준원가 | cost_accounting | LINK |
| ACC_2024_Q041 | ACC_FS_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2024_Q042 | ACC_FS_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2024_Q043 | ACC_INV_007 | 소매재고·FIFO·LCM(재무 재고) | financial_accounting | KEEP |
| ACC_2024_Q044 | ACC_INV_006 | 소매재고·FIFO·LCM(재무 재고) | financial_accounting | KEEP |
| ACC_2024_Q045 | ACC_FS_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2024_Q046 | ACC_EQ_001 | 자본·EPS | financial_accounting | KEEP |
| ACC_2024_Q047 | ACC_INV_006 | 자본·EPS | financial_accounting | MOVE |
| ACC_2024_Q048 | ACC_GEN_001 | 소매재고·FIFO·LCM(재무 재고) | financial_accounting | MOVE |
| ACC_2024_Q049 | ACC_EQ_001 | 자본·EPS | financial_accounting | KEEP |
| ACC_2024_Q050 | ACC_REV_001 | 수익인식 | financial_accounting | KEEP |
| ACC_2024_Q051 | ACC_FIN_002 | 금융상품·사채 | financial_accounting | KEEP |
| ACC_2024_Q052 | ACC_FIN_002 | 금융상품·사채 | financial_accounting | KEEP |
| ACC_2024_Q053 | ACC_GEN_001 | 재무제표 일반 | financial_accounting | MOVE |
| ACC_2024_Q054 | ACC_FIN_001 | 자본·EPS | financial_accounting | KEEP |
| ACC_2024_Q055 | ACC_LEASE_001 | 리스 | financial_accounting | KEEP |
| ACC_2024_Q056 | ACC_FS_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2024_Q057 | ACC_GEN_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2024_Q058 | ACC_PPE_002 | 금융상품·사채 | financial_accounting | KEEP |
| ACC_2024_Q059 | ACC_FIN_002 | 금융상품·사채 | financial_accounting | KEEP |
| ACC_2024_Q060 | ACC_GEN_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2024_Q061 | ACC_FIN_002 | 금융상품·사채 | financial_accounting | KEEP |
| ACC_2024_Q062 | ACC_PPE_001 | 유형자산·감가상각 | financial_accounting | KEEP |
| ACC_2024_Q063 | ACC_PPE_001 | 유형자산·감가상각 | financial_accounting | KEEP |
| ACC_2024_Q064 | ACC_PPE_001 | 유형자산·감가상각 | financial_accounting | KEEP |
| ACC_2024_Q065 | ACC_GEN_001 | 재무제표 일반 | financial_accounting | MOVE |
| ACC_2024_Q066 | ACC_GEN_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2024_Q067 | ACC_INT_001 | 무형자산 | financial_accounting | KEEP |
| ACC_2024_Q068 | ACC_GEN_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2024_Q069 | ACC_PPE_001 | 유형자산·감가상각 | financial_accounting | KEEP |
| ACC_2024_Q070 | ACC_PPE_001 | 유형자산·감가상각 | financial_accounting | KEEP |
| ACC_2024_Q071 | ACC_REV_001 | 개별·활동기준원가 | cost_accounting | LINK |
| ACC_2024_Q072 | ACC_GEN_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2024_Q073 | ACC_INV_006 | 종합원가·환산량 | cost_accounting | NEW_CANDIDATE |
| ACC_2024_Q074 | ACC_GEN_001 | 종합원가·환산량 | cost_accounting | NEW_CANDIDATE |
| ACC_2024_Q075 | ACC_INV_006 | 전부·변동원가·CVP | cost_accounting | LINK |
| ACC_2024_Q076 | ACC_INV_007 | 종합원가·환산량 | cost_accounting | NEW_CANDIDATE |
| ACC_2024_Q077 | ACC_TAX_001 | 전부·변동원가·CVP | cost_accounting | LINK |
| ACC_2024_Q078 | ACC_GEN_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2024_Q079 | ACC_REV_001 | 재무제표 일반 | financial_accounting | KEEP |
| ACC_2024_Q080 | ACC_GEN_001 | 전부·변동원가·CVP | cost_accounting | LINK |
| ACC_2025_Q041 | ACC_GEN_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2025_Q042 | ACC_FS_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2025_Q043 | ACC_INV_006 | 소매재고·FIFO·LCM(재무 재고) | financial_accounting | KEEP |
| ACC_2025_Q044 | ACC_INV_007 | 소매재고·FIFO·LCM(재무 재고) | financial_accounting | KEEP |
| ACC_2025_Q045 | ACC_EQ_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2025_Q046 | ACC_PPE_001 | 유형자산·감가상각 | financial_accounting | KEEP |
| ACC_2025_Q047 | ACC_GEN_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2025_Q048 | ACC_PPE_001 | 유형자산·감가상각 | financial_accounting | KEEP |
| ACC_2025_Q049 | ACC_INT_001 | 무형자산 | financial_accounting | KEEP |
| ACC_2025_Q050 | ACC_PPE_001 | 유형자산·감가상각 | financial_accounting | KEEP |
| ACC_2025_Q051 | ACC_INV_003 | 유형자산·감가상각 | financial_accounting | MOVE |
| ACC_2025_Q052 | ACC_LEASE_001 | 리스 | financial_accounting | KEEP |
| ACC_2025_Q053 | ACC_INV_003 | 유형자산·감가상각 | financial_accounting | MOVE |
| ACC_2025_Q054 | ACC_FIN_001 | 금융상품·사채 | financial_accounting | KEEP |
| ACC_2025_Q055 | ACC_INT_001 | 금융상품·사채 | financial_accounting | KEEP |
| ACC_2025_Q056 | ACC_FIN_001 | 금융상품·사채 | financial_accounting | KEEP |
| ACC_2025_Q057 | ACC_FIN_002 | 금융상품·사채 | financial_accounting | KEEP |
| ACC_2025_Q058 | ACC_FIN_002 | 자본·EPS | financial_accounting | KEEP |
| ACC_2025_Q059 | ACC_GEN_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2025_Q060 | ACC_REV_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2025_Q061 | ACC_EQ_001 | 자본·EPS | financial_accounting | KEEP |
| ACC_2025_Q062 | ACC_EQ_001 | 자본·EPS | financial_accounting | KEEP |
| ACC_2025_Q063 | ACC_INV_006 | 자본·EPS | financial_accounting | MOVE |
| ACC_2025_Q064 | ACC_REV_001 | 미분류·일반 | financial_accounting | KEEP |
| ACC_2025_Q065 | ACC_INV_003 | 리스 | financial_accounting | MOVE |
| ACC_2025_Q066 | ACC_INT_001 | 법인세 | tax_accounting | MOVE |
| ACC_2025_Q067 | ACC_PPE_002 | 유형자산·감가상각 | financial_accounting | KEEP |
| ACC_2025_Q068 | ACC_REV_001 | 재무제표 일반 | financial_accounting | KEEP |
| ACC_2025_Q069 | ACC_INT_001 | 자본·EPS | financial_accounting | KEEP |
| ACC_2025_Q070 | ACC_EQ_001 | 자본·EPS | financial_accounting | KEEP |
| ACC_2025_Q071 | ACC_REV_001 | 개별·활동기준원가 | cost_accounting | LINK |
| ACC_2025_Q072 | ACC_REV_001 | 개별·활동기준원가 | cost_accounting | LINK |
| ACC_2025_Q073 | ACC_INV_006 | 종합원가·환산량 | cost_accounting | NEW_CANDIDATE |
| ACC_2025_Q074 | ACC_GEN_001 | 결합원가·주부산품 | cost_accounting | NEW_CANDIDATE |
| ACC_2025_Q075 | ACC_GEN_001 | 표준원가·차이분석 | cost_accounting | NEW_CANDIDATE |
| ACC_2025_Q076 | ACC_GEN_001 | 전부·변동원가·CVP | cost_accounting | LINK |
| ACC_2025_Q077 | ACC_REV_001 | 전부·변동원가·CVP | cost_accounting | LINK |
| ACC_2025_Q078 | ACC_GEN_001 | 개별·활동기준원가 | cost_accounting | LINK |
| ACC_2025_Q079 | ACC_INV_006 | 전부·변동원가·CVP | cost_accounting | LINK |
| ACC_2025_Q080 | ACC_COST_002 | 전부·변동원가·CVP | cost_accounting | KEEP |

---

## 8. Extended Columns (reference)

| Question | Chapter | Pattern Name | Source PDF | Class | Reason | Stem preview |
|----------|---------|--------------|------------|-------|--------|--------------|
| ACC_2015_Q041 | ACC_FS (재무제표 일반) | 재무제표 일반 | N · pdf_missing | A | Chapter/Pattern/Domain 대체로 정합 | 다음 은 공정 가치 에 관한 정 의 이다 괄호 안 에. 들어갈적절한단어 를나타낸 것 은? 공정 가치 는원칙적 으 로측정일 에 사 이 ㄱ 의정상거래 에서자산 을매  |
| ACC_2015_Q042 | ACC_GEN (회계학 일반) | 회계학 일반 | N · pdf_missing | A | 일반 버킷 유지(세부분류 근거 부족) — 추후 세분화 | 수익 에관한설명 으 로옳지않 은 것 은? |
| ACC_2015_Q043 | ACC_PPE (유형자산) | 유형자산·감가상각 | N · pdf_missing | A | Chapter/Pattern/Domain 대체로 정합 | (주감평 은 보유중인 유형자산 을 주대한 의) 유형자산 과교환 하면서공정 가치차액 에해당 하 는 현금 을지급 하였다 교환일현재보 300,000. W 유 중인 유형 |
| ACC_2015_Q044 | ACC_GEN (회계학 일반) | 회계학 일반 | N · pdf_missing | A | 일반 버킷 유지(세부분류 근거 부족) — 추후 세분화 | 주감평 은 년 월말현재창고 에보관 20×1 12 중인 상품재고 를 실사한 결 과 금액 이, 임 을 확인 하였다 다음 자료 를 반영 2,000,000. W 하여계산 |
| ACC_2015_Q045 | ACC_REV (수익인식) | 수익인식 | N · pdf_missing | A | Chapter/Pattern/Domain 대체로 정합 | 상품매매기업인 주감평 의정상영업주기 는상품 매입시점 부터 판매대금 회수시점 까지 기간 으 로 정 의된다 년 정상영업주기 는 일 이며. 20×1 42, 매출 이 평 |
| ACC_2015_Q046 | ACC_FS (재무제표 일반) | 재무제표 일반 | N · pdf_missing | A | Chapter/Pattern/Domain 대체로 정합 | 주감평 은 년 초 건설공사 를 수주 하였다. 20×3 공사기간 은 년말 까지 이며 총공사계약금액, 20×5 은 이다 년공사진행 과정 에서 1,000,000 . 2 |
| ACC_2015_Q047 | ACC_GEN (회계학 일반) | 회계학 일반 | N · pdf_missing | A | 일반 버킷 유지(세부분류 근거 부족) — 추후 세분화 | 에설립된 주감평 은 20×1년 1월 1일 20×1 말 에 확정급여제 도 를 도입 하였다 확정급여채무. 계산시적용한할인율 은연 이며 년 10% , 20×1 이후 할 |
| ACC_2015_Q048 | ACC_FIN (금융상품) | 금융상품 | N · pdf_missing | A | Chapter/Pattern/Domain 대체로 정합 | 주감평 의 20 년 ×5 법인세 와관련된자료 가다 음 과 같 을 때 법인세비용 이연법인세자산 이,,, 연법인세부채 는각각얼마인 가? 주감평 은 20 년 ×5 월  |
| ACC_2015_Q049 | ACC_FS (재무제표 일반) | 재무제표 일반 | N · pdf_missing | A | Chapter/Pattern/Domain 대체로 정합 | 주감평 은 미국 에 소재한 20×1년 10월 1일 토지 를영업 에사용할목적 으 로 에취득 $10,000 하였고 현재토지 의공정 가 , 20×1년 12월 31일 치 |
| ACC_2015_Q050 | ACC_PPE (유형자산) | 유형자산·감가상각 | N · pdf_missing | A | Chapter/Pattern/Domain 대체로 정합 | 주감평 은 년 초 잔존 가치 20×4 5,000,000(W 내용연수 년 정액법감 가상각 에 1,000,000, 5,) W 건물 을취득 하였다 주감평 은 년말건물  |
| ACC_2015_Q051 | ACC_EQ (자본·배당) | 자본·배당 | N · pdf_missing | A | Chapter/Pattern/Domain 대체로 정합 | 주감평 의 보통주 에 귀속되 는 당기순 이익 이 (20×2) 년 과 (20×3) 년 에 각각 450,000W 이다 20×3년 8월 31일까지 보통주 1,080,0 |
| ACC_2015_Q052 | ACC_REV (수익인식) | 수익인식 | N · pdf_missing | A | Chapter/Pattern/Domain 대체로 정합 | 주감평 은 주대한 을흡수합 20×4년 1월 1일 병 하였다 합병관련 자료 가 다음 과 같 을 때 합. 병시영업권 의금액 은? 합병일현재 주대한 의재무상태표 는다  |
| ACC_2015_Q053 | ACC_GEN (회계학 일반) | 회계학 일반 | N · pdf_missing | A | 일반 버킷 유지(세부분류 근거 부족) — 추후 세분화 | 정부보조금 의 회계처리 에 관한 설명 으 로 옳지 않 은 것 은? |
| ACC_2015_Q054 | ACC_PPE (유형자산) | 재평가·손상 | N · pdf_missing | A | Chapter/Pattern/Domain 대체로 정합 | 주감평 은 에 기계장치 를 20×1년 1월 1일 에 취득 하였다잔존 가치 내용 1,000,000 .(0, W 연수 년정액법감 가상각원 가모형적용 5,,) 에동기계 |
| ACC_2015_Q055 | ACC_GEN (회계학 일반) | 회계학 일반 | N · pdf_missing | B | ACC_GEN 바구니 — 실제 자본·EPS | 주감평 은 20 년초토지 를 에취 ×3 1,500,000W 득하고 매년 말 공정 가치 로 평 가 하 는 재평 가모 형 을적용한다 또한재평 가잉여금 을자산 의처.  |
| ACC_2015_Q056 | ACC_FIN (금융상품) | 사채·채권 | N · pdf_missing | A | Chapter/Pattern/Domain 대체로 정합 | 금융상품 에해당 하 는 것 을모두고른 것 은? 국공채 를기초자산 으 로발행된약속어음. ㄱ 대여금. ㄴ 매출채권. ㄷ 선급비용 투자사채.. ㄹ ㅁ 산업재산권 선수수 |
| ACC_2015_Q057 | ACC_FIN (금융상품) | 사채·채권 | N · pdf_missing | A | Chapter/Pattern/Domain 대체로 정합 | 주감평 은 20× 에 1 1 1 다음 과같 은전환 사채 를액면발행 하였다. ○액면금액 500,000 ：W ○표시 이자율 연8% ： ○일반사채 의시장수익률 연10% |
| ACC_2015_Q058 | ACC_GEN (회계학 일반) | 회계학 일반 | N · pdf_missing | A | 일반 버킷 유지(세부분류 근거 부족) — 추후 세분화 | 농림어업 에관한회계처리 로옳지않 은 것 은 ‘ ’ ? |
| ACC_2015_Q059 | ACC_PPE (유형자산) | 유형자산·감가상각 | N · pdf_missing | A | Chapter/Pattern/Domain 대체로 정합 | 유형자산 의 장부금액 에 가산하지 않 는 항목 을 모두고른 것 은? 시험 과정 에서생산된재화 의순매각금액. ㄱ 유형자산 의 매입 또 는 건설 과 직접적 으 로.  |
| ACC_2015_Q060 | ACC_EQ (자본·배당) | 자본·배당 | N · pdf_missing | A | Chapter/Pattern/Domain 대체로 정합 | 주감평 은 20×1년 1월 1일 였으며 이 를위해연 의 이자율 로특정목적, 8% 차입금 을 차입 하였다 주감평 은 1,000,000. W 동차입금 중 1월 1일  |
| ACC_2015_Q061 | ACC_INT (무형자산) | 무형자산 | N · pdf_missing | A | Chapter/Pattern/Domain 대체로 정합 | 주) 감평 의 년당기순 이익 은 이 2,500,000W 20×5 다 다음 자료 를 이용 하여 년 의 영업활동. 20×5 현금흐름 을계산 하면 단간접법 으 로계산한 |
| ACC_2015_Q062 | ACC_FIN (금융상품) | 금융상품 | N · pdf_missing | A | Chapter/Pattern/Domain 대체로 정합 | 주) 감평 은 에주식 주 를주 20×5년 6월 2일 100 당 에취득하고 취득 과직접적 으 로관련 2,500, W 된수수료 을지급 하였다 위주식 의각 15,000 |
| ACC_2015_Q063 | ACC_FS (재무제표 일반) | 재무제표 일반 | N · pdf_missing | A | Chapter/Pattern/Domain 대체로 정합 | 재무제표 표시 의 일반사항 에 관한 설명 으 로 옳 지않 은 것 은? |
| ACC_2015_Q064 | ACC_FS (재무제표 일반) | 재무제표 일반 | N · pdf_missing | A | Chapter/Pattern/Domain 대체로 정합 | 주대한 은 년 초 기계장치 를 공정 가치 20×5 에구입 하여 주감평 에 년간임대해 296,894 , 5W 주 는금융리스계약 을체결 하였다 주감평 은리 . 스료  |
| ACC_2015_Q065 | ACC_EQ (자본·배당) | 자본·배당 | N · pdf_missing | A | Chapter/Pattern/Domain 대체로 정합 | 주감평 은 임직원 명 에게다 20×1년 7월 1일 40 음 과같 은조건 으 로 인당 개 의주식선택권 1 100 을부여 하였다 년말현재 명 이퇴사 하였 . 20×1 |
| ACC_2015_Q066 | ACC_FS (재무제표 일반) | 재무제표 일반 | N · pdf_missing | A | Chapter/Pattern/Domain 대체로 정합 | 주) 감평 은제품구입후 년 이내 에발생 하 는 1 제품 의 결함 에 대 하여 제품보증 을 실시하고 있 다 년 에 판매된 제품 에 대 하여 중요하지. 20×3 않  |
| ACC_2015_Q067 | ACC_GEN (회계학 일반) | 회계학 일반 | N · pdf_missing | A | 일반 버킷 유지(세부분류 근거 부족) — 추후 세분화 | 주) 감평 은 년 년 에당기순 이익 을각 20×3 , 20×4 각 으 로보고 하였지 만 다음 55,000, 56,000, W과 같 은 오류 를 포함하고 있었다 이 |
| ACC_2015_Q068 | ACC_LEASE (리스) | 리스 | N · pdf_missing | A | Chapter/Pattern/Domain 대체로 정합 | 투자부동산 에해당되 는항목 을모두고른 것 은? 장래사용목적 을결정하지못한채 로보유. ㄱ 하고있 는토지 직접 소유또 는 금융리스 를 통해 보유하. ㄴ 고운용리스 로 |
| ACC_2015_Q069 | ACC_GEN (회계학 일반) | 회계학 일반 | N · pdf_missing | A | 일반 버킷 유지(세부분류 근거 부족) — 추후 세분화 | 다음 은 주감평 의 년연구 및개발활동지 20×1 출 에관한자료 이다 주감평 이 년 에연구 . 20×1 활동 으 로분류해야 하 는금액 은? ○새 로운지식 을얻고자  |
| ACC_2015_Q070 | ACC_FIN (금융상품) | 금융상품 | N · pdf_missing | A | Chapter/Pattern/Domain 대체로 정합 | 주감평 은 년중 에단기매매목적 으 로공정 20×1 가치 의주식 을취득하고 년 10,000,000 , 20×2W 월 일 에 예외적인 상황 이 발생 하여 7 1 단기 |
| ACC_2015_Q071 | ACC_REV (수익인식) | 수익인식 | N · pdf_missing | C | 재무 Chapter/Pattern에 원가 Algorithm(전부·변동원가·CVP) — primary/related 분리 필요 | 전년 도 에 주감평 의변동원 가 는매출액 의 60% 였고 고정원 가 는 매출액 의 이었다 당해연, 10%. 도 에 경영자 가 단위당 판매 가격 을 인상하 10%  |
| ACC_2015_Q072 | ACC_GEN (회계학 일반) | 회계학 일반 | N · pdf_missing | A | 일반 버킷 유지(세부분류 근거 부족) — 추후 세분화 | 주감평 은 두 개 의 보조부문 부문 부문 과 (X, Y) 두 개 의 제조부문 부문 부문 으 로 구성되어 (A, B) 있다 각각 의 부문 에서 발생한 부문원 가 는 |
| ACC_2015_Q073 | ACC_GEN (회계학 일반) | 회계학 일반 | N · pdf_missing | D | Chapter=ACC_GEN Pattern=ACC_GEN_001 이나 실제는 종합원가·환산량 | 주감평 은 생활용품 을 생산 판매하고 있다. ㆍ 년생산량 은 단위 이고판매량 은 1,200 1,000 20×5 단위 이다판매 가격 및원 가자료 는다음 과같다..  |
| ACC_2015_Q074 | ACC_GEN (회계학 일반) | 회계학 일반 | N · pdf_missing | C | 재무 Chapter/Pattern에 원가 Algorithm(개별·활동기준원가) — primary/related 분리 필요 | 선박 을 제조 하여 판매 하 는 주감평 은 년 20×5 초 에영업 을개시 하였으며 제조 와관련된원 가, 및활동 에관한자료 는다음 과같다. 화물선 유람선 여객선 직 |
| ACC_2015_Q075 | ACC_INV (재고자산) | FIFO·총평균법 매출원가 | N · pdf_missing | D | Chapter=ACC_INV Pattern=ACC_INV_006 이나 실제는 종합원가·환산량 | 주감평 은종합원 가계산 을채택하고 있다 원재. 료 는 공정초 에 전량 투입되며 가공원 가전환원, 가 는공정전반 에걸쳐균 등하게발생한다 공. 손 및감손 은발생하지않 |
| ACC_2015_Q076 | ACC_REV (수익인식) | 수익인식 | N · pdf_missing | C | 재무 Chapter/Pattern에 원가 Algorithm(개별·활동기준원가) — primary/related 분리 필요 | 다음자료 를 이용 하여계산한 주감평 의 년 20×5 손익분기점매출액 은? ○단위당판매 가격 2,000W ○단위당변동제조원 가 700 ○단위당변동판매비 와관리비 3 |
| ACC_2015_Q077 | ACC_GEN (회계학 일반) | 회계학 일반 | N · pdf_missing | C | 재무 Chapter/Pattern에 원가 Algorithm(개별·활동기준원가) — primary/related 분리 필요 | 주감평 의 년생산활동 및제조간접원 가 에 20×5 관한정보 는다음 과같다. 활동 원 가 원 가동인 원 가동인 총량 조립 450,000W 기계시간 시간 37,500 |
| ACC_2015_Q078 | ACC_REV (수익인식) | 수익인식 | N · pdf_missing | A | Chapter/Pattern/Domain 대체로 정합 | 주감평 은향후 개월 의월별매출액 을다음 과 6 같 이추정 하였다. 월 매출액 월 1 350,000W 월 2 300,000 월 3 320,000 월 4 400,00 |
| ACC_2015_Q079 | ACC_INT (무형자산) | 무형자산 | N · pdf_missing | C | 재무 Chapter/Pattern에 원가 Algorithm(개별·활동기준원가) — primary/related 분리 필요 | 표준원 가계산제 도 를 채택하고 있 는 주감평 의 년 월 의제조간접원 가예산 과실제발생액 20×5 6 은다음 과같다. 예산 실제발생액 변동제조간접원 가: 간접재료 |
| ACC_2015_Q080 | ACC_INT (무형자산) | 무형자산 | N · pdf_missing | C | 재무 Chapter/Pattern에 원가 Algorithm(제조원가 흐름(재무·원가 경계)) — primary/related 분리 필요 | 주감평 의 재공품 재고액 은 20×5년 1월 1일 이고 월 일 재공품 재고액 은 50,000, 1 31W 이다 월 에 발생한 원 가자료 가 다음 100,000.  |
| ACC_2017_Q041 | ACC_PPE (유형자산) | 유형자산·감가상각 | N · pdf_missing | A | Chapter/Pattern/Domain 대체로 정합 | 유형자산 의교환거래시취득원 가 에관한설명 으 로옳지않 은 것 은? |
| ACC_2017_Q042 | ACC_REV (수익인식) | 수익인식 | N · pdf_missing | A | Chapter/Pattern/Domain 대체로 정합 | 수익인식 에관한설명 으 로옳지않 은 것 은? |
| ACC_2017_Q043 | ACC_FIN (금융상품) | 금융상품 | N · pdf_missing | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은20×1년4월1일에거래처 에상품 을판매하고그대 가 로 이자부 약속어음 (3 개월 만기, 표시 이자율연5%, 액면금액W300,000) 을수취 하였다. |
| ACC_2017_Q044 | ACC_INT (무형자산) | 무형자산 | N · pdf_missing | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은 (주) 리스 가20×1년1월1일에취득한기계장치 (공정 가치W390,000) 에 대 하여금융리스계약 (리스기간 3년, 연간리스료W150,000 매년 |
| ACC_2017_Q045 | ACC_GEN (회계학 일반) | 회계학 일반 | N · pdf_missing | A | 일반 버킷 유지(세부분류 근거 부족) — 추후 세분화 | 보고기간후사건 에관한설명 으 로옳지않 은 것 은? |
| ACC_2017_Q046 | ACC_EQ (자본·배당) | 자본·배당 | N · pdf_missing | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은20×1년부터20x3년 까지배당 가능 이익 의부족 으 로배당금 을지급 하지못 하였으나, 20x4년 도 에 는영업 의호전 으 로W220,000을현금배 |
| ACC_2017_Q047 | ACC_PPE (유형자산) | 유형자산·감가상각 | N · pdf_missing | A | Chapter/Pattern/Domain 대체로 정합 | 20×1년초 (주) 감평 은정부보조금W500,000을받아연구소건물 (내용연수 5년, 잔존 가치W0, 정액법상각) 을W1,000,000에취득하고다음 과같 이회계처리 |
| ACC_2017_Q048 | ACC_FS (재무제표 일반) | 재무제표 일반 | N · pdf_missing | A | Chapter/Pattern/Domain 대체로 정합 | 다음20×1년말 (주) 감평 의자료 에서재무상태표 에표시될충당부채금액 은? |
| ACC_2017_Q049 | ACC_PPE (유형자산) | 유형자산·감가상각 | N · pdf_missing | A | Chapter/Pattern/Domain 대체로 정합 | 다음 은 (주) 감평 의20×1년현금흐름표작성 을위한자료 이다. 감 가상각비 W40,000 미지급 이자증 가액 W5,000 유형자산처분손실 20,000 매출채권증 |
| ACC_2017_Q050 | ACC_INT (무형자산) | 무형자산 | N · pdf_missing | B | 법인세 Algorithm인데 Pattern=ACC_INT_001 | (주) 감평 은20×1년1월1일에설립되었다. 20×1년도 (주) 감평 의법인세비용 차감전순 이익 은W1,000,000이며, 법인세율 은20%이고, 법인세 와관련된 |
| ACC_2017_Q051 | ACC_FS (재무제표 일반) | 재무제표 일반 | N · pdf_missing | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은20×1년초 에 도급금액W1,000,000인건설공사 를수주하고, 20x3년 말 에공사 를완공 하였다. 이 와관련된원 가자료 는다음 과같다. (주)  |
| ACC_2017_Q052 | ACC_PPE (유형자산) | 유형자산·감가상각 | N · pdf_missing | A | Chapter/Pattern/Domain 대체로 정합 | (주) 대한 은20×1년1월1일에건물 을W20,000,000에취득 하여사용하고 있다 (내용연수 5년, 잔존 가치W0, 정액법상각). (주) 대한 은20x2년말 에 |
| ACC_2017_Q053 | ACC_PPE (유형자산) | 유형자산·감가상각 | N · pdf_missing | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 이본사건물취득시점 부터취득후 2년간지출 은다음 과같다. 동 건물 과관련 하여 (주) 감평 이20x3년 도포괄손익계산서 에인식할당기비용 은? (단, 감 |
| ACC_2017_Q054 | ACC_PPE (유형자산) | 유형자산·감가상각 | N · pdf_missing | A | Chapter/Pattern/Domain 대체로 정합 | 상품매매기업인 (주) 감평 은20×1년1월1일특허권 (내용연수 5년, 잔존 가치W0) 과 상표권 (비한정적내용연수, 잔존 가치W0) 을각각W100,000과W200 |
| ACC_2017_Q055 | ACC_PPE (유형자산) | 유형자산·감가상각 | N · pdf_missing | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은 20×1년 1월 1일 토지 와 토지 위 에 있 는 건물A를 일괄 하여 W40,000에취득 (토지 와건물A의공정 가치비율 은 4: 1) 하였다. 취 |
| ACC_2017_Q056 | ACC_PPE (유형자산) | 유형자산·감가상각 | N · pdf_missing | A | Chapter/Pattern/Domain 대체로 정합 | 자동차부품제조업 을영위하고하고있 는 (주) 감평 은20×1년초임대수익목적 으 로 건물 (취득원 가W1,000,000, 잔여내용연수 5년, 잔존 가치W0, 정액법감 |
| ACC_2017_Q057 | ACC_PPE (유형자산) | 유형자산·감가상각 | N · pdf_missing | A | Chapter/Pattern/Domain 대체로 정합 | 유형자산 의감 가상각 에관한설명 으 로옳지않 은 것 은? |
| ACC_2017_Q058 | ACC_FS (재무제표 일반) | 재무제표 일반 | N · pdf_missing | A | Chapter/Pattern/Domain 대체로 정합 | 재무제표표시 에관한설명 으 로옳 은 것 은? |
| ACC_2017_Q059 | ACC_GEN (회계학 일반) | 회계학 일반 | N · pdf_missing | A | 일반 버킷 유지(세부분류 근거 부족) — 추후 세분화 | (주) 감평 은20×1년1월1일에설립되었다. 다음20×1년자료 를 이용 하여계산한 기말자산 은? 기초자산 W1,000 당기중유상증자 W500 기초부채 620 영업 |
| ACC_2017_Q060 | ACC_GEN (회계학 일반) | 회계학 일반 | N · pdf_missing | B | ACC_GEN → 재무제표 일반 재분류 후보 | 회계정책, 회계추정 의변경 및오류 에관한설명 으 로옳 은 것 은? |
| ACC_2017_Q061 | ACC_GEN (회계학 일반) | 회계학 일반 | N · pdf_missing | A | 일반 버킷 유지(세부분류 근거 부족) — 추후 세분화 | 유용한재무정보 의질적특성 에관한설명 으 로옳지않 은 것 은? |
| ACC_2017_Q062 | ACC_EQ (자본·배당) | 자본·배당 | N · pdf_missing | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은20×1년1월1일에공장건물 을신축 하여20x2년 9월 30일 에완공 하였다. 공장건물신축관련자료 가다음 과같 을 때, (주) 감평 이20×1년도 에 |
| ACC_2017_Q063 | ACC_INT (무형자산) | 무형자산 | N · pdf_missing | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은20×1년1월1일에사채 를발행 하여매년말액면 이자 를지급하고 유효 이자율법 에 의 하여상각한다. 20x2년말 이자 와관련된회계처리 는다음 과 같다. |
| ACC_2017_Q064 | ACC_FIN (금융상품) | 사채·채권 | N · pdf_missing | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은20×1년1월1일에다음조건 의전환사채 를발행 하였다. ○액면금액: W2,000,000 ○표시 이자율: 연7% ○일반사채 의시장 이자율: 연12% ○ |
| ACC_2017_Q065 | ACC_PPE (유형자산) | 유형자산·감가상각 | N · pdf_missing | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은20×1년1월1일에 (주) 민국 을흡수합병 하였다. 합병시점 에 (주) 감평 과 (주) 민국 의식별 가능한자산 과부채 의장부금액 및공정 가치 는다음 |
| ACC_2017_Q066 | ACC_INV (재고자산) | FIFO·총평균법 매출원가 | N · pdf_missing | A | 재무 재고 Algorithm과 Pattern 정합 | (주) 감평 의20×1년재고자산관련자료 는다음 과같다. 재고자산 가격결정 방법 으 로선입선출-소매재고법 을적용할 경우기말재고액 (원 가) 은? (단, 단수 차 이 |
| ACC_2017_Q067 | ACC_PPE (유형자산) | 유형자산·감가상각 | N · pdf_missing | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은20×1년1월1일에건물 을W5,000,000에취득 (내용연수 10년, 잔존 가치W0, 정액법감 가상각) 하였다. 20×1년말 및20x2년말기준원 가 |
| ACC_2017_Q068 | ACC_REV (수익인식) | 수익인식 | N · pdf_missing | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 의20×1년초상품재고 는W30,000이며, 당기매출액 과당기상품매입액 은 각각W100,000과W84,000이다. (주) 감평 의원 가 에대한 이익률  |
| ACC_2017_Q069 | ACC_INV (재고자산) | FIFO·총평균법 매출원가 | N · pdf_missing | B | 재고 Pattern에 자본·EPS 매핑 | (주) 감평 은20×1년초 에 1주당액면금액W5,000인보통주140주 를액면발행 하여 설립 하였으며, 20×1년말 이익잉여금 이W300,000이었다. 20x2년중 |
| ACC_2017_Q070 | ACC_GEN (회계학 일반) | 회계학 일반 | N · pdf_missing | A | 일반 버킷 유지(세부분류 근거 부족) — 추후 세분화 | 충당부채 와우발부채 에관한설명 으 로옳지않 은 것 은? |
| ACC_2017_Q071 | ACC_REV (수익인식) | 수익인식 | N · pdf_missing | C | 재무 Chapter/Pattern에 원가 Algorithm(제조원가 흐름(재무·원가 경계)) — primary/related 분리 필요 | (주) 대한 은제 1 공정 에서주산물A, B와부산물C를생산한다. 주산물A와 부산물C는즉시판매될수있으나, 주산물B는제 2 공정 에서추 가 가공 을거쳐 판매된다. 2 |
| ACC_2017_Q072 | ACC_GEN (회계학 일반) | 회계학 일반 | N · pdf_missing | D | Chapter=ACC_GEN Pattern=ACC_GEN_001 이나 실제는 표준원가·차이분석 | 표준원 가계산제 도 를채택하고있 는 (주) 대한 의20×1년도직접노무원 가 와관련된 자료 는다음 과같다. 20×1년도 의실제생산량 은? 실제직접노무시간 101,5 |
| ACC_2017_Q073 | ACC_REV (수익인식) | 수익인식 | N · pdf_missing | C | 재무 Chapter/Pattern에 원가 Algorithm(전부·변동원가·CVP) — primary/related 분리 필요 | 다음 은 (주) 대한 의20×1년도예산자료 이다. 구분 A제품 B제품 C제품 판매수량 1,000단위 500단위 1,500단위 단위당판매 가격 W150 W100 W |
| ACC_2017_Q074 | ACC_GEN (회계학 일반) | 회계학 일반 | N · pdf_missing | C | 재무 Chapter/Pattern에 원가 Algorithm(전부·변동원가·CVP) — primary/related 분리 필요 | (주) 대한 은펌프사업부 와밸브사업부 를 이익중심점 으 로운영하고 있다. 밸브 사업부 는X제품 을생산 하며, X제품 의단위당판매 가격 과단위당변동원 가 는 각각W |
| ACC_2017_Q075 | ACC_REV (수익인식) | 수익인식 | N · pdf_missing | C | 재무 Chapter/Pattern에 원가 Algorithm(전부·변동원가·CVP) — primary/related 분리 필요 | (주) 대한 은X, Y, Z 제품 을생산ㆍ판매하고있으며, 20×1년도제품별예산손익 계산서 는다음 과같다. 구분 X제품 Y제품 Z제품 매출액 W100,000 W20 |
| ACC_2017_Q076 | ACC_GEN (회계학 일반) | 회계학 일반 | N · pdf_missing | A | 일반 버킷 유지(세부분류 근거 부족) — 추후 세분화 | (주) 감평 의최근 6 개월간A제품생산량 및총원 가자료 이다. 월 생산량 (단위) 총원 가 1 110,000 W10,000,000 2 50,000 7,000,00 |
| ACC_2017_Q077 | ACC_INV (재고자산) | FIFO·총평균법 매출원가 | N · pdf_missing | D | Chapter=ACC_INV Pattern=ACC_INV_006 이나 실제는 종합원가·환산량 | (주) 감평 은선입선출법 에 의한종합원 가계산 을채택하고 있다. 전환원 가 (가공 원 가) 는공정전반 에걸쳐균 등하게발생한다. 다음자료 를활용할 때, 기말 재공품 |
| ACC_2017_Q078 | ACC_REV (수익인식) | 수익인식 | N · pdf_missing | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은매입원 가 의130%로매출액 을책정한다. 모든매입 은외상거래 이다. 외상매입액중30%는구매한달 에, 70%는구매한달 의다음달 에현금 으 로 지급된다 |
| ACC_2017_Q079 | ACC_GEN (회계학 일반) | 회계학 일반 | N · pdf_missing | C | 재무 Chapter/Pattern에 원가 Algorithm(전부·변동원가·CVP) — primary/related 분리 필요 | (주) 감평 은A제품 을생산ㆍ판매하고 있다. 20×1년에 는기존고객 에게9,000단위 를 판매할 것 으 로예상되며, A제품관련자료 는다음 과같다. 연간최대생산량  |
| ACC_2017_Q080 | ACC_INV (재고자산) | FIFO·총평균법 매출원가 | N · pdf_missing | D | Chapter=ACC_INV Pattern=ACC_INV_006 이나 실제는 종합원가·환산량 | (주) 감평 은20×1년1월1일에설립된회사 이다. 20×1년도 1월 및 2월 의원 가 자료 는다음 과같다. 구분 1월 2월 최대생산 가능량 1,000단위 1,20 |
| ACC_2018_Q041 | ACC_FS (재무제표 일반) | 재무제표 일반 | Y · p.14 · Q41 | A | Chapter/Pattern/Domain 대체로 정합 | 재무보고 를위한개념체계 에서유용한재무정보 의질적특성 에관한설명 으 로 옳 은 것 은? |
| ACC_2018_Q042 | ACC_INV (재고자산) | 기말재고 포함 여부 판단 | Y · p.14 · Q42 | A | 재무 재고 Algorithm과 Pattern 정합 | 20×1년 말 현재 (주) 감평 의 외부감사 전 재무상태표 상 재고자산 은 W1,000,000이다. (주) 감평 은실지재고조사법 을사용 하여창고 에있 는상품 만  |
| ACC_2018_Q043 | ACC_PPE (유형자산) | 유형자산·감가상각 | Y · p.15 · Q43 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은20×1년초기계장치 를W100,000에취득하고재평 가모형 을적용 하기 로 하였다. 기계장치 의내용연수 는 5년, 잔존 가치 는W0이며정액법 으 로감 |
| ACC_2018_Q044 | ACC_REV (수익인식) | 수익인식 | Y · p.15 · Q44 | A | Chapter/Pattern/Domain 대체로 정합 | 다음 은 (주) 감평 의20×1년도재고자산거래 와관련된자료 이다. 일자 적요 수량 단 가 1월 1일 기초재고 100개 W90 3월 9일 매입 200개 150 5월 |
| ACC_2018_Q045 | ACC_PPE (유형자산) | 유형자산·감가상각 | Y · p.16 · Q45 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은 20×1년 초 W100,000인 건물 (내용연수 10년, 잔존 가치 W0, 정액법상각) 을취득 하였다. (주) 감평 은동건물 에대 하여재평 가모형 |
| ACC_2018_Q046 | ACC_FS (재무제표 일반) | 재무제표 일반 | Y · p.16 · Q46 | A | Chapter/Pattern/Domain 대체로 정합 | 재무보고 를위한개념체계 에서재무제표요소 에관한설명 으 로옳지않 은 것 은? |
| ACC_2018_Q047 | ACC_EQ (자본·배당) | 자본·배당 | Y · p.16 · Q47 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은20×1년초공장건물 을신축 하기시작 하여20×1년말 에완공 하였다. 다음 은공장건물 의신축 을위한 (주) 감평 의지출액 과특정차입금 및일반차입금 에 |
| ACC_2018_Q048 | ACC_INT (무형자산) | 무형자산 | Y · p.17 · Q48 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은20x8년 3월 1일사용중 이던기계장치 를 (주) 대한 의신형기계장치 와 교환 하면서W4,000의현금 을추 가 로지급 하였다. (주) 감평 이사용하 |
| ACC_2018_Q049 | ACC_GEN (회계학 일반) | 회계학 일반 | Y · p.17 · Q49 | A | 일반 버킷 유지(세부분류 근거 부족) — 추후 세분화 | (주) 감평 은본사사옥 을신축 하기위 하여토지 를취득 하였 는데 이토지 에 는 철거예정인창고 가있었다. 다음자료 를고려할 때, 토지 의취득원 가 는? 토지구입대금 |
| ACC_2018_Q050 | ACC_PPE (유형자산) | 유형자산·감가상각 | Y · p.17 · Q50 | A | Chapter/Pattern/Domain 대체로 정합 | 다음설명중옳 은 것 을모두고른 것 은? ㄱ. 특정유형자산 을재평 가할 때, 해당자산 이포함되 는유형자산분류전 체 를재평 가한다. ㄴ. 자 가사용부동산 을공정 가치 |
| ACC_2018_Q051 | ACC_INT (무형자산) | 무형자산 | Y · p.18 · Q51 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은 20×1년 1월 1일 (주) 한국 이 동 일자 에 발행한 액면금액 W1,000,000, 표시 이자율연10%(이자 는매년말지급) 의 3년 만기 의사 |
| ACC_2018_Q052 | ACC_FS (재무제표 일반) | 재무제표 일반 | Y · p.18 · Q52 | A | Chapter/Pattern/Domain 대체로 정합 | 다음 은 (주) 감평 이채택하고있 는확정급여제 도 와관련한자료 이다. ○확정급여채무계산시적용 하 는할인율 연5% ○기초확정급여채무 의현재 가치 W700,000 ○ |
| ACC_2018_Q053 | ACC_FIN (금융상품) | 사채·채권 | Y · p.19 · Q53 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은20×1년1월1일다음 과같 은조건 의전환사채 (만기 3년) 를액면발 행 하였다. 20x3년 1월 1일 에액면금액 의40%에해당 하 는전환사채 가보통 |
| ACC_2018_Q054 | ACC_PPE (유형자산) | 유형자산·감가상각 | Y · p.19 · Q54 | A | Chapter/Pattern/Domain 대체로 정합 | 다음 은 (주) 감평 의20×1년도현금흐름표 를작성 하기위한자료 이다. (1) 20×1년도포괄손익계산서자료 ○당기순 이익: W100,000 ○대손상각비: W5,0 |
| ACC_2018_Q055 | ACC_GEN (회계학 일반) | 회계학 일반 | Y · p.20 · Q55 | B | ACC_GEN 바구니 — 실제 자본·EPS | (주) 감평 의20×1년도희석주당 이익 은? |
| ACC_2018_Q056 | ACC_FS (재무제표 일반) | 재무제표 일반 | Y · p.20 · Q56 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은20×1년초 (주) 대한 을합병 하면서 이전대 가 로현금W1,500,000 과 (주) 감평 이보유한토지 (장부금액W200,000, 공정 가치W150 |
| ACC_2018_Q057 | ACC_EQ (자본·배당) | 자본·배당 | Y · p.20 · Q57 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은20×1년초 에부여일 로 부터 3년 의지속적인용역제공 을조건 으 로직 원100명 에게주식선택권 을 1 인당 10 개씩부여 하였다. 20×1년초주식선 |
| ACC_2018_Q058 | ACC_GEN (회계학 일반) | 회계학 일반 | Y · p.21 · Q58 | A | 일반 버킷 유지(세부분류 근거 부족) — 추후 세분화 | 충당부채, 우발부채 및우발자산 에관한설명 으 로옳지않 은 것 은? |
| ACC_2018_Q059 | ACC_PPE (유형자산) | 유형자산·감가상각 | Y · p.21 · Q59 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은20×1년초업무용건물 을W2,000,000에취득 하였다. 구입당시 에 동건물 의내용연수 는 5년 이고잔존 가치 는W200,000으 로추정되었다. ( |
| ACC_2018_Q060 | ACC_INT (무형자산) | 무형자산 | Y · p.21 · Q60 | B | 법인세 Algorithm인데 Pattern=ACC_INT_001 | 다음 은20×1년초설립한 (주) 감평 의20×1년도법인세 와관련된내용 이다. 20×1년과세소득산출내역 법인세비용차감전순 이익 W1,000,000 세무조정항목: 감 |
| ACC_2018_Q061 | ACC_EQ (자본·배당) | 자본·배당 | Y · p.22 · Q61 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 의20×1년초유통보통주식수 는1,000주 (주당액면금액W1,000), 유통우선 주식수 는200주 (주당액면금액W1,000) 이다. 20×1년9월1일에 |
| ACC_2018_Q062 | ACC_FIN (금융상품) | 사채·채권 | Y · p.22 · Q62 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은 20×1년 1월 1일에 액면금액 W1,000,000(표시 이자율 연 8%, 매년말 이자지급, 만기 3년) 의사채 를발행 하였다. 발행당시시장 이자 |
| ACC_2018_Q063 | ACC_GEN (회계학 일반) | 회계학 일반 | Y · p.22 · Q63 | A | 일반 버킷 유지(세부분류 근거 부족) — 추후 세분화 | (주) 감평 은20×1년초투자목적 으 로건물 을W2,000,000에취득 하여공정 가 치모형 을적용 하였다. 건물 의공정 가치변동 이다음 과같 을떄, (주) 감평  |
| ACC_2018_Q064 | ACC_PPE (유형자산) | 유형자산·감가상각 | Y · p.22 · Q64 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은20x7년초기계장치 를W5,000(내용연수 5년, 잔존 가치W0, 정액 법상각) 에취득 하였다. 20x7년말 과20x8년말기계장치 에대한공정 가치  |
| ACC_2018_Q065 | ACC_GEN (회계학 일반) | 회계학 일반 | Y · p.23 · Q65 | A | 일반 버킷 유지(세부분류 근거 부족) — 추후 세분화 | 생물자산 에관한설명 으 로옳지않 은 것 은? |
| ACC_2018_Q066 | ACC_INV (재고자산) | FIFO·총평균법 매출원가 | Y · p.23 · Q66 | A | 재무 재고 Algorithm과 Pattern 정합 | (주) 감평 은선입선출법 에 의한저 가기준 을적용 하여소매재고법 으 로재고 자산 을평 가하고 있다. 20x8년 도상품재고거래 와관련된자료 가다음 과 같 은 경우  |
| ACC_2018_Q067 | ACC_GEN (회계학 일반) | 회계학 일반 | Y · p.23 · Q67 | B | ACC_GEN → 소매재고·FIFO·LCM(재무 재고) 재분류 후보 | 재고자산 에관한설명 으 로옳지않 은 것 은? |
| ACC_2018_Q068 | ACC_INV (재고자산) | FIFO·총평균법 매출원가 | Y · p.24 · Q68 | A | 재무 재고 Algorithm과 Pattern 정합 | (주) 감평 은20x3년 도 부터재고자산평 가방법 을선입선출법 에서 가중평균법 으 로변경 하였다. 이러한회계정책 의변경 은한국채택국제회계기준 에서제시 하 는조건  |
| ACC_2018_Q069 | ACC_PPE (유형자산) | 유형자산·감가상각 | Y · p.24 · Q69 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은 20x3년 초 건물 을 W41,500에 취득 (내용연수 10년, 잔존 가치 W1,500, 정액법 상각) 하여 사용하고 있으며, 20x5년 중 손상 |
| ACC_2018_Q070 | ACC_PPE (유형자산) | 유형자산·감가상각 | Y · p.24 · Q70 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은20×1년초 에하수처리장치 를W20,000,000에구입 하여즉시 가동 하였 으며, 하수처리장치 의내용연수 는 3년 이고잔존 가치 는없으며정액법 으  |
| ACC_2018_Q071 | ACC_INT (무형자산) | 무형자산 | Y · p.25 · Q71 | C | 재무 Chapter/Pattern에 원가 Algorithm(전부·변동원가·CVP) — primary/related 분리 필요 | 제조기업인 (주) 감평 이 변동원 가계산방법 에 의 하여 제품원 가 를 계산할 때 제품원 가 에포함되 는항목 을모두고른 것 은? ㄱ. 직접재료원 가 ㄴ. 직접노무 |
| ACC_2018_Q072 | ACC_GEN (회계학 일반) | 회계학 일반 | Y · p.25 · Q72 | C | 재무 Chapter/Pattern에 원가 Algorithm(개별·활동기준원가) — primary/related 분리 필요 | 원 가 가산 가격결정방법 에 의해서판매 가격 을결정 하 는 경우 에들어갈 금액 으 로옳 은 것 은? (단, 영업 이익 은총원 가 의30%이고, 판매비 와관리비 는 |
| ACC_2018_Q073 | ACC_GEN (회계학 일반) | 회계학 일반 | Y · p.25 · Q73 | C | 재무 Chapter/Pattern에 원가 Algorithm(개별·활동기준원가) — primary/related 분리 필요 | 실제개별원 가계산제 도 를사용 하 는 (주) 감평 의20×1년도연간실제원 가 는다음 과같다. 직접재료원 가 W4,000,000 직접노무원 가 W5,000,000  |
| ACC_2018_Q074 | ACC_GEN (회계학 일반) | 회계학 일반 | Y · p.26 · Q74 | A | 일반 버킷 유지(세부분류 근거 부족) — 추후 세분화 | (주) 감평 은수선부문 과동력부문 의두개 의보조부문 과 도색부문 과조립부문 의 두개 의제조부문 으 로구성되어 있다. (주) 감평 은상호배부법 을사용 하여보조 부문 |
| ACC_2018_Q075 | ACC_REV (수익인식) | 수익인식 | Y · p.26 · Q75 | C | 재무 Chapter/Pattern에 원가 Algorithm(전부·변동원가·CVP) — primary/related 분리 필요 | 다음 은 (주) 감평 의20×1년도매출관련자료 이다. 매출액 W282,000 총변동원 가 W147,000 총고정원 가 W30,000 판매량 3,000단위 20x2 |
| ACC_2018_Q076 | ACC_REV (수익인식) | 수익인식 | Y · p.26 · Q76 | D | Chapter=ACC_REV Pattern=ACC_REV_001 이나 실제는 종합원가·환산량 | 정상원 가계산 을사용 하 는 (주) 감평 은단일제품 을제조ㆍ판매 하 는기업 이다. 20×1년도 의고정제조간접원 가총예산액 및실제발생액 은W720,000이었다. 2 |
| ACC_2018_Q077 | ACC_COST (원가·관리회계) | 관리회계 | Y · p.27 · Q77 | A | 원가·관리회계 Pattern과 Algorithm 정합 | 다음 은활동기준원 가계산 을사용 하 는제조기업인 (주) 감평 의20×1년도연간 활동원 가예산자료 이다. 20×1년에회사 는제품A를1,000단위생산 하였 는데 제품 |
| ACC_2018_Q078 | ACC_GEN (회계학 일반) | 회계학 일반 | Y · p.27 · Q78 | C | 재무 Chapter/Pattern에 원가 Algorithm(전부·변동원가·CVP) — primary/related 분리 필요 | (주) 감평 은세종류 의제품A, B, C를독점생산 및판매하고 있다. 제품생산 을위해사용되 는공통설비 의연간사용시간 은총40,000시간 으 로제한되어 있다. 20× |
| ACC_2018_Q079 | ACC_INV (재고자산) | FIFO·총평균법 매출원가 | Y · p.28 · Q79 | D | Chapter=ACC_INV Pattern=ACC_INV_006 이나 실제는 종합원가·환산량 | (주) 감평 은종합원 가계산제 도 를채택하고단일제품 을생산하고 있다. 재료 는 공정 이시작되 는시점 에서전량투입되며, 가공 (전환) 원 가 는공정전체 에걸 쳐균  |
| ACC_2018_Q080 | ACC_REV (수익인식) | 수익인식 | Y · p.28 · Q80 | D | Chapter=ACC_REV Pattern=ACC_REV_001 이나 실제는 종합원가·환산량 | 다음자료 를 이용 하여계산한매출원 가 는? 기초재공품 W60,000 기초제품 W45,000 기말재공품 W30,000 기말제품 W60,000 직접재료원 가 W45, |
| ACC_2020_Q041 | ACC_FS (재무제표 일반) | 재무제표 일반 | Y · p.13 · Q41 | A | Chapter/Pattern/Domain 대체로 정합 | 재무보고 를위한개념체계중재무정보 의질적특성 에관한설명 으 로옳지않 은 것 은? |
| ACC_2020_Q042 | ACC_FS (재무제표 일반) | 재무제표 일반 | Y · p.13 · Q42 | A | Chapter/Pattern/Domain 대체로 정합 | 재무제표표시 에관한설명 으 로옳 은 것 은? |
| ACC_2020_Q043 | ACC_PPE (유형자산) | 유형자산·감가상각 | Y · p.14 · Q43 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은20×1년1월1일미국 에있 는건물 (취득원 가$5,000, 내용연수 5년, 잔 존 가치$0, 정액법상각) 을취득 하였다. (주) 감평 은건물 에대  |
| ACC_2020_Q044 | ACC_FS (재무제표 일반) | 재무제표 일반 | Y · p.14 · Q44 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은20×1년4월1일에 만기 가20×1년7월31일인액면금액W1,200,000의 어음 을거래처 로 부터수취 하였다. (주) 감평 은동어음 을20×1년6월 |
| ACC_2020_Q045 | ACC_PPE (유형자산) | 유형자산·감가상각 | Y · p.14 · Q45 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은20×1년초임대수익 을얻고자건물 (취득원 가W1,000,000, 내용연수 5 년, 잔존 가치W100,000, 정액법상각) 을취득하고, 이 를투자부동 |
| ACC_2020_Q046 | ACC_PPE (유형자산) | 유형자산·감가상각 | Y · p.15 · Q46 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은20×1년초기계장치 (취득원 가W1,600,000, 내용연수 4년, 잔존 가치 W0, 정액법상각) 를취득 하였다. (주) 감평 은기계장치 에대해원  |
| ACC_2020_Q047 | ACC_PPE (유형자산) | 유형자산·감가상각 | Y · p.15 · Q47 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은20×1년초환경설비 (취득원 가W5,000,000, 내용연수 5년, 잔존 가치 W0, 정액법상각) 를취득 하였다. 동환경설비 는관계법령 에 의 하여 |
| ACC_2020_Q048 | ACC_PPE (유형자산) | 유형자산·감가상각 | Y · p.16 · Q48 | A | Chapter/Pattern/Domain 대체로 정합 | 토지 의취득원 가 에포함해야할항목 을모두고른 것 은? ㄱ. 토지중개수수료 및취득세 ㄴ. 직전소유자 의체납재산세 를대납한 경우, 체납재산세 ㄷ. 회사 가유지․관리  |
| ACC_2020_Q049 | ACC_INV (재고자산) | 매출원가 계산 (PER법) | Y · p.16 · Q49 | A | 재무 재고 Algorithm과 Pattern 정합 | 상품매매기업인 (주) 감평 은계속기록법 과실지재고조사법 을병행하고 있다. (주) 감평 의20×1년기초재고 는W10,000(단 가W100) 이고, 당기매입액 은W3 |
| ACC_2020_Q050 | ACC_PPE (유형자산) | 유형자산·감가상각 | Y · p.16 · Q50 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은신약개발 을위해20×1년중 에연구활동관련W500,000, 개발활동관련 W800,000을지출 하였다. 개발활동 에소요된W800,000 중W300,00 |
| ACC_2020_Q051 | ACC_INT (무형자산) | 무형자산 | Y · p.17 · Q51 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은20×1년초상각후원 가 (AC) 로측정 하 는금융부채 에해당 하 는회사채 (액면금액W1,000,000, 액면 이자율연10%, 만기 3년, 매년말 이 |
| ACC_2020_Q052 | ACC_FS (재무제표 일반) | 재무제표 일반 | Y · p.17 · Q52 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은 확정급여제 도 를 채택하고 있으며, 20×1년 초 순확정급여부채 는 W20,000이다. (주) 감평 의20×1년도확정급여제 도 와관련된자료 는다음 |
| ACC_2020_Q053 | ACC_EQ (자본·배당) | 자본·배당 | Y · p.18 · Q53 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은20×1년초부여일 로 부터 3년 의용역제공 을조건 으 로직원 50 명 에게 각각주식선택권 10 개 를부여 하였으며, 부여일현재주식선택권 의단위당공정 |
| ACC_2020_Q054 | ACC_REV (수익인식) | 수익인식 | Y · p.18 · Q54 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은20×1년1월1일제품 을판매 하기 로 (주) 한국 과계약 을체결 하였다. 동 제품 에대한통제 는20x2년말 에 (주) 한국 으 로 이전된다. 계약  |
| ACC_2020_Q055 | ACC_PPE (유형자산) | 유형자산·감가상각 | Y · p.19 · Q55 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 의20×1년말예상되 는자산 과부채 는각각W100,000과W80,000으 로 부채비율 (총부채÷ 주주지분) 400%가 예상된다. (주) 감평 은 부채비 |
| ACC_2020_Q056 | ACC_EQ (자본·배당) | 자본·배당 | Y · p.19 · Q56 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은20×1년초액면 가W5,000인보통주200주 를주당W15,000에발행하 여설립되었다. 다음 은 (주) 감평 의20×1년중자본거래 이다. ○20×1년 |
| ACC_2020_Q057 | ACC_PPE (유형자산) | 유형자산·감가상각 | Y · p.20 · Q57 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은20×1년초지방자치단체 로 부터무 이자조건 의자금W100,000을차입 (20x4년말전액일시상환) 하여기계장치 (취득원 가W100,000, 내용연수  |
| ACC_2020_Q058 | ACC_PPE (유형자산) | 유형자산·감가상각 | Y · p.20 · Q58 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은20×1년초기계장치 (취득원 가W1,000,000, 내용연수 5년, 잔존 가치 W0, 정액법상각) 를취득 하여원 가모형 을적용하고 있다. 20x2년 |
| ACC_2020_Q059 | ACC_LEASE (리스) | 리스 | Y · p.20 · Q59 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은20×1년1월1일(주) 한국리스 로 부터기계장치 (기초자산) 를리스 하 는 계약 을체결 하였다. 계약상리스기간 은20×1년1월1일부터 4년, 내재  |
| ACC_2020_Q060 | ACC_FS (재무제표 일반) | 재무제표 일반 | Y · p.21 · Q60 | A | Chapter/Pattern/Domain 대체로 정합 | 다음 은 (주) 감평 의수익관련자료 이다. ○(주) 감평 은20×1년초 (주) 한국 에게원 가W50,000의상품 을판매하고대금 은매년말W40,000씩총 3회 에걸 |
| ACC_2020_Q061 | ACC_PPE (유형자산) | 재평가·손상 | Y · p.21 · Q61 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 의20×1년도현금흐름표상영업 에서창출된현금 (영업 으 로 부터창출된 현금) 은W100,000이다. 다음자료 를 이용 하여계산한 (주) 감평 의20×1 |
| ACC_2020_Q062 | ACC_INT (무형자산) | 무형자산 | Y · p.22 · Q62 | B | 법인세 Algorithm인데 Pattern=ACC_INT_001 | 다음 은20×1년초설립한 (주) 감평 의법인세관련자료 이다. ○20×1년세무조정사항 - 감 가상각비한 도초 과액 W125,000 - 접대비한 도초 과액 60,00 |
| ACC_2020_Q063 | ACC_INV (재고자산) | FIFO·총평균법 매출원가 | Y · p.22 · Q63 | B | 재고 Pattern에 자본·EPS 매핑 | 20×1년1월1일설립한 (주) 감평 의20×1년보통주 (주당액면금액W5,000) 변동 현황 은다음 과같다. 구분 내용 보통주증감 1월 1일 유통보통주식수 10,0 |
| ACC_2020_Q064 | ACC_INT (무형자산) | 무형자산 | Y · p.22 · Q64 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은 (주) 한국 과다음 과같 은기계장치 를상호교환 하였다. 구분 (주) 감평 (주) 한국 취득원 가 W800,000 W600,000 감 가상각누계액  |
| ACC_2020_Q065 | ACC_INT (무형자산) | 무형자산 | Y · p.23 · Q65 | A | Chapter/Pattern/Domain 대체로 정합 | 다음 은 (주) 감평 이20×1년1월1일액면발행한전환사채 와관련된자료 이다. ○액면금액: W100,000 ○20×1년1월1일전환권조정: W11,414 ○20×1년 |
| ACC_2020_Q066 | ACC_INV (재고자산) | 매출원가 계산 (PER법) | Y · p.23 · Q66 | A | 재무 재고 Algorithm과 Pattern 정합 | 다음 은20×1년설립된 (주) 감평 의재고자산 (상품) 관련자료 이다. ○당기매입액: W2,000,000 ○취득원 가 로파악한장부상기말재고액: W250,000 기 |
| ACC_2020_Q067 | ACC_PPE (유형자산) | 유형자산·감가상각 | Y · p.23 · Q67 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은20×1년1월1일기계장치 (내용연수 5년, 잔존 가치W0, 정액법상각) 를W1,000,000에취득 하여사용개시 하였다. (주) 감평 은동기계장치 에 |
| ACC_2020_Q068 | ACC_PPE (유형자산) | 유형자산·감가상각 | Y · p.24 · Q68 | A | Chapter/Pattern/Domain 대체로 정합 | 상품매매기업인 (주) 감평 은20×1년초건물 (취득원 가W10,000,000, 내용연수 10 년, 잔존 가치W0, 정액법상각) 을취득 하면서다음 과같 은조건 의공 |
| ACC_2020_Q069 | ACC_PPE (유형자산) | 유형자산·감가상각 | Y · p.24 · Q69 | A | Chapter/Pattern/Domain 대체로 정합 | 상품매매기업인 (주) 감평 은20x0년말취득한건물 (취득원 가W2,400,000, 내용연 수 10년, 잔존 가치W0, 정액법상각) 을유형자산 으 로분류 하여즉시사 |
| ACC_2020_Q070 | ACC_FIN (금융상품) | 사채·채권 | Y · p.25 · Q70 | A | Chapter/Pattern/Domain 대체로 정합 | 20×1년 1월 1일 (주) 감평 은 (주) 한국 이 동 일자 에 발행한 사채 (액면금액 W1,000,000, 액면 이자율연4%, 이자 는매년말지급) 를W896, |
| ACC_2020_Q071 | ACC_GEN (회계학 일반) | 회계학 일반 | Y · p.25 · Q71 | C | 재무 Chapter/Pattern에 원가 Algorithm(개별·활동기준원가) — primary/related 분리 필요 | (주) 감평 의20×1년기초 및기말재고자산 은다음 과같다. 구분 기 초 기 말 직접재료 W10,000 W15,000 재공품 40,000 50,000 제 품 40, |
| ACC_2020_Q072 | ACC_GEN (회계학 일반) | 회계학 일반 | Y · p.26 · Q72 | A | 일반 버킷 유지(세부분류 근거 부족) — 추후 세분화 | (주) 감평 은두개 의제조부문 (P1, P2) 과두개 의보조부문 (S1, S2) 을두고 있다. 각부문간 의용역수수관계 는다음 과같다. 사용부문 제공부문 보조부문  |
| ACC_2020_Q073 | ACC_INV (재고자산) | FIFO·총평균법 매출원가 | Y · p.26 · Q73 | D | Chapter=ACC_INV Pattern=ACC_INV_006 이나 실제는 종합원가·환산량 | (주) 감평 은단일공정 을통해단일제품 을생산하고있으며, 선입선출법 에 의한종 합원 가계산 을적용하고 있다. 직접재료 는공정초 에전량투입되고, 가공원 가 는 공정전 |
| ACC_2020_Q074 | ACC_GEN (회계학 일반) | 회계학 일반 | Y · p.27 · Q74 | D | Chapter=ACC_GEN Pattern=ACC_GEN_001 이나 실제는 종합원가·환산량 | (주) 감평 은동일한원재료 를결합공정 에투입 하여세종류 의결합제품A, B, C를 생산ㆍ판매하고 있다. 결합제품A, B, C는분리점 에서판매될수있으며, 추 가 가  |
| ACC_2020_Q075 | ACC_GEN (회계학 일반) | 회계학 일반 | Y · p.27 · Q75 | D | Chapter=ACC_GEN Pattern=ACC_GEN_001 이나 실제는 표준원가·차이분석 | (주) 감평 은 표준원 가계산제 도 를 채택하고 있다. 20×1년 직접노무원 가 와 관련된 자료 가다음 과같 을 경우, 20×1년실제직접노무시간 은? ○실제생산량 |
| ACC_2020_Q076 | ACC_INV (재고자산) | FIFO·총평균법 매출원가 | Y · p.28 · Q76 | C | 재무 Chapter/Pattern에 원가 Algorithm(전부·변동원가·CVP) — primary/related 분리 필요 | (주) 감평 의전부원 가계산 에 의한영업 이익 은W374,000이고, 변동원 가계산 에 의한 영업 이익 은W352,000이며, 전부원 가계산 에 의한기말제품재고액 |
| ACC_2020_Q077 | ACC_REV (수익인식) | 수익인식 | Y · p.28 · Q77 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은단일제품A를생산ㆍ판매하고 있다. 제품A의단위당판매 가격 은 W2,000, 단위당변동비 는W1,400, 총고정비 는W90,000이다. (주) 감평 이 |
| ACC_2020_Q078 | ACC_INT (무형자산) | 무형자산 | Y · p.28 · Q78 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 의20×1년4월초현금잔액 은W450,000이며, 3월 과 4월 의매입 과매출 은 다음 과같다. 구분 매입액 매출액 3월 W600,000 W800,00 |
| ACC_2020_Q079 | ACC_GEN (회계학 일반) | 회계학 일반 | Y · p.29 · Q79 | A | 일반 버킷 유지(세부분류 근거 부족) — 추후 세분화 | (주) 감평 은최근신제품 을개발 하여최초 10 단위 의제품 을생산 하 는데총150시 간 의노무시간 을소요 하였으며, 직접노무시간당W1,200의직접노무원 가 가발생 |
| ACC_2020_Q080 | ACC_GEN (회계학 일반) | 회계학 일반 | Y · p.29 · Q80 | C | 재무 Chapter/Pattern에 원가 Algorithm(개별·활동기준원가) — primary/related 분리 필요 | 레저용요트 를전문적 으 로생산ㆍ판매하고있 는 (주) 감평 은매년해당요트 의주 요부품인자동제어센서2,000단위 를자 가제조하고있으며, 관련원 가자료 는다음 과같다. |
| ACC_2024_Q041 | ACC_FS (재무제표 일반) | 재무제표 일반 | Y · p.13 · Q41 | A | Chapter/Pattern/Domain 대체로 정합 | 재무보고 를위한개념체계 에관한설명 으 로옳지않 은 것 은? |
| ACC_2024_Q042 | ACC_FS (재무제표 일반) | 재무제표 일반 | Y · p.13 · Q42 | A | Chapter/Pattern/Domain 대체로 정합 | 재무제표표시 에관한설명 으 로옳 은 것 은? |
| ACC_2024_Q043 | ACC_INV (재고자산) | LCM·순실현가능가치 평가 | Y · p.14 · Q43 | A | 재무 재고 Algorithm과 Pattern 정합 | (주) 감평 의20×1년기말재고자산 에대한자료 가다음 과같다. 항목 원 가 확정판매계약 가격 일반판매 가격 현행대체원 가 제품A W1,000 W900 W950 제 |
| ACC_2024_Q044 | ACC_INV (재고자산) | FIFO·총평균법 매출원가 | Y · p.14 · Q44 | A | 재무 재고 Algorithm과 Pattern 정합 | (주) 감평 은재고자산 을원 가기준선입선출소매재고법 으 로측정한다. 20×1년재고 자산자료 가다음 과같 을 때, 매출원 가 는? (단, 평 가손실 과감모손실 은발 |
| ACC_2024_Q045 | ACC_FS (재무제표 일반) | 재무제표 일반 | Y · p.15 · Q45 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은20×1년초종업원100명 에게각각현금결제형주 가차액보상권 10 개씩 년말최종 가득자 는 75 명, 권리행사자 는 40 명 이다. 주 가차액보상권 의 |
| ACC_2024_Q046 | ACC_EQ (자본·배당) | 자본·배당 | Y · p.15 · Q46 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 의20×1년도재무제표 및자본관련자료 가다음 과같 을 때총자산 이익 률 은? (단, 총자산 이익률계산시평균자산 을 이용한다.) ○기초자산 W10,000 |
| ACC_2024_Q047 | ACC_INV (재고자산) | FIFO·총평균법 매출원가 | Y · p.15 · Q47 | B | 재고 Pattern에 자본·EPS 매핑 | 20×1년초설립된 (주) 감평 의20×1년주식 과관련된자료 가다음 과같다. ○20×1년초유통보통주식수: 3,000주 ○4월초모든주식 에대 하여10% 무상증자실시  |
| ACC_2024_Q048 | ACC_GEN (회계학 일반) | 회계학 일반 | Y · p.15 · Q48 | B | ACC_GEN → 소매재고·FIFO·LCM(재무 재고) 재분류 후보 | (주) 감평 은20×1년부터20×3년까지매년말다음 과같 이기말재고자산 을 과소또 는 과대계상 하였으며 오류수정 전 20×2년도 와 20×3년도 의 당기순 이익 은 |
| ACC_2024_Q049 | ACC_EQ (자본·배당) | 자본·배당 | Y · p.16 · Q49 | A | Chapter/Pattern/Domain 대체로 정합 | 20×1년초설립된 (주) 감평 의자본계정 은다음 과같으며, 설립후20×3년초 까지 자본금변동 은없었다. 우선주 에대해서 는20×1년도 에배당 가능 이익 이부족 하 |
| ACC_2024_Q050 | ACC_REV (수익인식) | 수익인식 | Y · p.16 · Q50 | A | Chapter/Pattern/Domain 대체로 정합 | 20×1년초설립된 (주) 감평 은커피머신 1 대 를 이전 (W300) 하면서 2년간일정량 의 원두 를공급 (W100) 하기 로 하 는계약 을체결 하여약속 을 이행 |
| ACC_2024_Q051 | ACC_FIN (금융상품) | 사채·채권 | Y · p.16 · Q51 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은20×1년1월1일에액면금액W1,000(표시 이자율: 연5%, 이자지급일: 매년 12월 31일, 만기: 20×3년12월31일) 인사채 를발행 하였다. |
| ACC_2024_Q052 | ACC_FIN (금융상품) | 사채·채권 | Y · p.17 · Q52 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은20×1년1월1일다음 과같 은조건 의비분리형신주인수권부사채 를액 면발행 하였다. ○액면금액: W1,000 ○표시 이자율: 연5% ○사채발행시신주인수 |
| ACC_2024_Q053 | ACC_GEN (회계학 일반) | 회계학 일반 | Y · p.17 · Q53 | B | ACC_GEN → 재무제표 일반 재분류 후보 | 20×1년초설립된 (주) 감평 은우유생산 을위 하여20×1년2월1일어미젖소 2 마 리 (1 마리당순공정 가치W1,500) 를 1 마리당W1,500에취득 하였으며, |
| ACC_2024_Q054 | ACC_FIN (금융상품) | 금융상품 | Y · p.18 · Q54 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은20×1년초A사주식 10주 (보통주, @W100) 를수수료W100을포함한 W1,100에취득 하여당기손익-공정 가치측정금융자산 으 로분류 하였다. ( |
| ACC_2024_Q055 | ACC_LEASE (리스) | 리스 | Y · p.18 · Q55 | A | Chapter/Pattern/Domain 대체로 정합 | 리스제공자입장 에서일반적 으 로금융리스 로분류될수있 는조건 이아닌 것 은? |
| ACC_2024_Q056 | ACC_FS (재무제표 일반) | 재무제표 일반 | Y · p.18 · Q56 | A | Chapter/Pattern/Domain 대체로 정합 | 충당부채 를인식할수있 는상황 을모두고른 것 은? (단, 금액 은모두신뢰성있 게측정할수 있다.) ㄱ. 법률 에따라항공사 의항공기 를 3년 에한번씩정밀하게정비하 도록 |
| ACC_2024_Q057 | ACC_GEN (회계학 일반) | 회계학 일반 | Y · p.19 · Q57 | A | 일반 버킷 유지(세부분류 근거 부족) — 추후 세분화 | (주) 감평 은20×1년초토지A(취득원 가W1,000) 와토지B(취득원 가W2,000) 를 각각취득하고, 재평 가모형 을적용 하였다. 동 2 건 의토지 에대 하여 |
| ACC_2024_Q058 | ACC_PPE (유형자산) | 재평가·손상 | Y · p.19 · Q58 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은 (주) 대한 이발행한사채 (발행일20×1년1월1일, 액면금액W1,000, 표 시 이자율연8%, 매년말 이자지급, 20×4년12월31일에일시상환)  |
| ACC_2024_Q059 | ACC_FIN (금융상품) | 사채·채권 | Y · p.20 · Q59 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은20×1년1월1일에액면금액W900, 표시 이자율연5%, 매년말 이자 를지급 하 는조건 의사채 (매년말 에액면금액W300씩 을상환 하 는연속상환사채) |
| ACC_2024_Q060 | ACC_GEN (회계학 일반) | 회계학 일반 | Y · p.20 · Q60 | A | 일반 버킷 유지(세부분류 근거 부족) — 추후 세분화 | 특수관계자공시 에관한설명 으 로옳지않 은 것 은? |
| ACC_2024_Q061 | ACC_FIN (금융상품) | 사채·채권 | Y · p.20 · Q61 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은20×1년1월1일에달러표시사채 (액면금액＄1,000) 를＄920에할인 발행 하였다. 동사채 는매년 12월 31일 에액면금액 의연3% 이자 를지급 하 |
| ACC_2024_Q062 | ACC_PPE (유형자산) | 유형자산·감가상각 | Y · p.21 · Q62 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은20×1년초유형자산인기계장치 를W50,000에취득 (내용연수 5년, 잔 존 가치W0, 정액법상각) 하여사용하고 있다. 20×2년중자산손상 의징후 를 |
| ACC_2024_Q063 | ACC_PPE (유형자산) | 유형자산·감가상각 | Y · p.21 · Q63 | A | Chapter/Pattern/Domain 대체로 정합 | 도소매업 을영위 하 는 (주) 감평 은20×1년초건물 을취득 (취득원 가W10,000, 내용 연수 5년, 잔존 가치W0, 정액법상각) 하였다. 공정 가치 가다음  |
| ACC_2024_Q064 | ACC_PPE (유형자산) | 유형자산·감가상각 | Y · p.21 · Q64 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은 20×1년 초 유류저장고 (취득원 가 W13,000, 내용연수 5년, 잔존 가치 W1,000, 정액법상각) 를취득하고원 가모형 을적용 하였다. 동 |
| ACC_2024_Q065 | ACC_GEN (회계학 일반) | 회계학 일반 | Y · p.22 · Q65 | B | ACC_GEN → 재무제표 일반 재분류 후보 | 20×1년1월1일에설립된 (주) 감평 은확정급여제 도 를운영하고 있다. 20×1년도 관련자료 가다음 과같 을 때, 20×1년말재무상태표 의기타포괄손익누계액 에미  |
| ACC_2024_Q066 | ACC_GEN (회계학 일반) | 회계학 일반 | Y · p.22 · Q66 | A | 일반 버킷 유지(세부분류 근거 부족) — 추후 세분화 | 생물자산 에관한설명 으 로옳지않 은 것 은? |
| ACC_2024_Q067 | ACC_INT (무형자산) | 무형자산 | Y · p.22 · Q67 | A | Chapter/Pattern/Domain 대체로 정합 | 무형자산 의회계처리 에관한설명 으 로옳 은 것 을모두고른 것 은? ㄱ. 경영자 가 의 도 하 는방식 으 로운용될수있으나아직사용하지않고있 는 기간 에발생한원 가 는 |
| ACC_2024_Q068 | ACC_GEN (회계학 일반) | 회계학 일반 | Y · p.23 · Q68 | A | 일반 버킷 유지(세부분류 근거 부족) — 추후 세분화 | 매각예정 으 로분류된비유동자산또 는처분자산집단 의회계처리 에관한설명 으 로 옳지않 은 것 은? |
| ACC_2024_Q069 | ACC_PPE (유형자산) | 유형자산·감가상각 | Y · p.23 · Q69 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은20×1년4월1일업무용기계장치 를취득 (취득원 가W61,000, 내용연수 5년, 잔존 가치W1,000) 하여정액법 으 로감 가상각 하였다. (주)  |
| ACC_2024_Q070 | ACC_PPE (유형자산) | 유형자산·감가상각 | Y · p.23 · Q70 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 과 (주) 한국 은사용중인유형자산 을상호교환 하여취득 하였다. 동교환 거래 에서 (주) 한국 의유형자산공정 가치 가 (주) 감평 의유형자산공정 가치보 |
| ACC_2024_Q071 | ACC_REV (수익인식) | 수익인식 | Y · p.24 · Q71 | C | 재무 Chapter/Pattern에 원가 Algorithm(개별·활동기준원가) — primary/related 분리 필요 | (주) 감평 은정상원 가계산제 도 를채택하고있으며, 20×1년재고자산 은다음 과같다. 구분 기초 기말 직접재료 W5,000 W6,000 재공품 10,000 12, |
| ACC_2024_Q072 | ACC_GEN (회계학 일반) | 회계학 일반 | Y · p.24 · Q72 | A | 일반 버킷 유지(세부분류 근거 부족) — 추후 세분화 | (주) 감평 은두개 의제조부문P1, P2 와두개 의보조부문S1, S2 를통해제품 을 생산하고 있다. S1 과S2 의부문원 가 는각각W60,000과W30,000이다 |
| ACC_2024_Q073 | ACC_INV (재고자산) | FIFO·총평균법 매출원가 | Y · p.24 · Q73 | D | Chapter=ACC_INV Pattern=ACC_INV_006 이나 실제는 종합원가·환산량 | (주) 감평 은종합원 가계산제 도 를채택하고있으며, 제품X의생산관련자료 는다 음 과같다. 구분 물량 기초재공품 (전환원 가완성 도) 60 단위 (70%) 당기착수 |
| ACC_2024_Q074 | ACC_GEN (회계학 일반) | 회계학 일반 | Y · p.25 · Q74 | D | Chapter=ACC_GEN Pattern=ACC_GEN_001 이나 실제는 종합원가·환산량 | (주) 감평 은20×1년초영업 을개시 하였으며, 표준원 가계산제 도 를채택하고 있다. 직접 재료kg당실제구입 가격 은W5, 제품단위당직접재료표준원 가 는W6(2k |
| ACC_2024_Q075 | ACC_INV (재고자산) | FIFO·총평균법 매출원가 | Y · p.25 · Q75 | C | 재무 Chapter/Pattern에 원가 Algorithm(전부·변동원가·CVP) — primary/related 분리 필요 | (주) 감평 은20×1년초영업 을개시 하였으며, 제품X를생산ㆍ판매하고 있다. 재 고자산평 가방법 은선입선출법 을적용하고있으며, 20×1년1분기 와 2분기 의영업  |
| ACC_2024_Q076 | ACC_INV (재고자산) | LCM·순실현가능가치 평가 | Y · p.25 · Q76 | D | Chapter=ACC_INV Pattern=ACC_INV_007 이나 실제는 종합원가·환산량 | (주) 감평 은결합공정 을거쳐주산품A, B와부산품F를생산 하여주산품A, B는 추 가 가공한후판매하고, 부산품F의회계처리 는생산시점 에서순실현 가치법 (생 산기준법 |
| ACC_2024_Q077 | ACC_TAX (법인세) | 법인세 | Y · p.26 · Q77 | C | 재무 Chapter/Pattern에 원가 Algorithm(전부·변동원가·CVP) — primary/related 분리 필요 | (주) 감평 은제품A를생산 하여단위당W1,000에판매하고 있다. 제품A의단위 당변동원 가 는W600, 총고정원 가 는연W30,000이다. (주) 감평 이20×1년 |
| ACC_2024_Q078 | ACC_GEN (회계학 일반) | 회계학 일반 | Y · p.26 · Q78 | A | 일반 버킷 유지(세부분류 근거 부족) — 추후 세분화 | (주) 감평 은두개 의사업부X와Y를운영하고있으며, 최저필수수익률 은10%이 다. 20×1년사업부X와Y의평균영업자산 은각각W70,000과W50,000이다. 사업 부 |
| ACC_2024_Q079 | ACC_REV (수익인식) | 수익인식 | Y · p.26 · Q79 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 의20×1년말재무상태표매출채권잔액 은W35,000이며, 이중W5,000 은 11월판매분 이다. 매출채권 은판매한달 에60%, 그다음달 에30%, 그다 |
| ACC_2024_Q080 | ACC_GEN (회계학 일반) | 회계학 일반 | Y · p.26 · Q80 | C | 재무 Chapter/Pattern에 원가 Algorithm(전부·변동원가·CVP) — primary/related 분리 필요 | 최신 의관리회계기법 에관한설명 으 로옳지않 은 것 은? |
| ACC_2025_Q041 | ACC_GEN (회계학 일반) | 회계학 일반 | Y · p.13 · Q41 | A | 일반 버킷 유지(세부분류 근거 부족) — 추후 세분화 | 유용한재무정보 의질적특성 에관한설명 으 로옳 은 것 은? |
| ACC_2025_Q042 | ACC_FS (재무제표 일반) | 재무제표 일반 | Y · p.13 · Q42 | A | Chapter/Pattern/Domain 대체로 정합 | 재무제표표시 에관한설명 으 로옳지않 은 것 은? |
| ACC_2025_Q043 | ACC_INV (재고자산) | FIFO·총평균법 매출원가 | Y · p.14 · Q43 | A | 재무 재고 Algorithm과 Pattern 정합 | (주) 감평 의20×1년재고자산관련자료 는다음 과같다. (주) 감평 이재고자산 을저 가기준 가중평균소매재고법 으 로측정 하 는 경우매출원 가 는? (단, 재고자산 |
| ACC_2025_Q044 | ACC_INV (재고자산) | LCM·순실현가능가치 평가 | Y · p.14 · Q44 | A | 재무 재고 Algorithm과 Pattern 정합 | (주) 감평 의20×1년기초상품 은W20,000, 당기상품매입액 은W80,000이다. 20×1년 기말상품관련자료 는다음 과같다. ○장부상수량 90 개 ○단위당취득 |
| ACC_2025_Q045 | ACC_EQ (자본·배당) | 자본·배당 | Y · p.15 · Q45 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은20×1년5월초공장건물신축공사 를시작 하여20×2년10월말완공하 였다. 동건물 은차입원 가자본화대상인적격자산 이다. 동건물신축관련자료 가다음 과같  |
| ACC_2025_Q046 | ACC_PPE (유형자산) | 유형자산·감가상각 | Y · p.15 · Q46 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은20×1년초구축물 로분류되 는폐기물처리시설 (내용연수 10년, 잔존 가 치W0, 정액법상각, 원 가모형적용) 을동일자 에수령한정부보조금 (상환 의무 |
| ACC_2025_Q047 | ACC_GEN (회계학 일반) | 회계학 일반 | Y · p.16 · Q47 | A | 일반 버킷 유지(세부분류 근거 부족) — 추후 세분화 | (주) 감평 은20×1년초영업 에사용할목적 으 로토지 를W200,000에취득 하였으며, 재평 가모형 을적용하고 있다. 토지 의공정 가치 와회수 가능액 이다음 과같 |
| ACC_2025_Q048 | ACC_PPE (유형자산) | 유형자산·감가상각 | Y · p.16 · Q48 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은 20×1년 초 사용 중인 기계장치 (장부금액 W100,000, 공정 가치 W40,000) 를 (주) 한국 의구축물 (장부금액W80,000, 공정  |
| ACC_2025_Q049 | ACC_INT (무형자산) | 무형자산 | Y · p.16 · Q49 | A | Chapter/Pattern/Domain 대체로 정합 | 무형자산 에관한설명 으 로옳 은 것 은? |
| ACC_2025_Q050 | ACC_PPE (유형자산) | 유형자산·감가상각 | Y · p.17 · Q50 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은20×1년초본사사옥 으 로사용할목적 으 로건물 (취득원 가W480,000, 내용연수 4년, 잔존 가치W0, 정액법상각) 을취득 하였다. 20×2년초 |
| ACC_2025_Q051 | ACC_INV (재고자산) | 운반비·부대비용과 재고원가 | Y · p.17 · Q51 | B | 재고 Pattern에 유형자산·감가상각 매핑 | (주) 감평 은20×1년초영업용차량운반구 (취득원 가W500,000, 내용연수 5년, 잔 존 가치W0, 정액법상각) 를취득하고원 가모형 을적용 하였다. (주) 감 |
| ACC_2025_Q052 | ACC_LEASE (리스) | 리스 | Y · p.17 · Q52 | A | Chapter/Pattern/Domain 대체로 정합 | 투자부동산 에해당 하 는 것 을모두고른 것 은? ㄱ. 장래용 도 를결정하지못한채 로보유하고있 는토지 ㄴ. 금융리스 로제공한부동산 ㄷ. 직접소유하고운용리스 로제공  |
| ACC_2025_Q053 | ACC_INV (재고자산) | 운반비·부대비용과 재고원가 | Y · p.18 · Q53 | B | 재고 Pattern에 유형자산·감가상각 매핑 | (주) 감평 은20×1년초영업용차량운반구 (취득원 가W300,000, 내용연수 5년, 잔 존 가치W50,000, 정액법상각) 를취득하고원 가모형 을적용 하였다.  |
| ACC_2025_Q054 | ACC_FIN (금융상품) | 금융상품 | Y · p.18 · Q54 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은20×1년초 (주) 한국 이 3년 만기 로발행한사채 (발행일20×1년초, 액 면금액W100,000, 표시 이자율연 10 %, 매년말 이자지급) 를발 |
| ACC_2025_Q055 | ACC_INT (무형자산) | 무형자산 | Y · p.18 · Q55 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은20×1년초금융자산 을취득하고, 이 를상각후원 가 로측정 하 는금융자 산 으 로분류 하였다. 20×1년말동금융자산 의손실충당금반영전장부금액 은 W9 |
| ACC_2025_Q056 | ACC_FIN (금융상품) | 금융상품 | Y · p.19 · Q56 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은20×1년6월1일제품판매대금 으 로 만기 가20×1년9월30일인액면 금액W120,000, 연 10 %의 이자부어음 (이자 는 만기시수취) 을거래처  |
| ACC_2025_Q057 | ACC_FIN (금융상품) | 사채·채권 | Y · p.19 · Q57 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은20×1년초연속상환사채 (액면금액W9,000, 표시 이자율연 5 %, 이자 는매년말지급, 만기 3년, 매년말W3,000씩원금상환조건) 를W8,524 |
| ACC_2025_Q058 | ACC_FIN (금융상품) | 사채·채권 | Y · p.19 · Q58 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은20×1년초다음 과같 은조건 의전환사채 를액면발행 하였다. ○액면금액: W100,000 ○표시 이자율: 연 6 %(이자 는매년말지급) ○전환 가격: |
| ACC_2025_Q059 | ACC_GEN (회계학 일반) | 회계학 일반 | Y · p.20 · Q59 | A | 일반 버킷 유지(세부분류 근거 부족) — 추후 세분화 | 충당부채, 우발부채 및우발자산 에관한설명 으 로옳 은 것 은? |
| ACC_2025_Q060 | ACC_REV (수익인식) | 수익인식 | Y · p.20 · Q60 | A | Chapter/Pattern/Domain 대체로 정합 | 20×1년2월초영업 을개시한 (주) 감평 은제품하자보증 을실시하고 있다. 제품 매출액 은20×1년W200,000, 20×2년W250,000이고, (주) 감평 은2 |
| ACC_2025_Q061 | ACC_EQ (자본·배당) | 자본·배당 | Y · p.20 · Q61 | A | Chapter/Pattern/Domain 대체로 정합 | 20×1년초설립된 (주) 감평 의20×3년말자본계정 은다음 과같으며, 설립후현 재 까지자본금변동 은없었다. 구분 액면금액 발행주식수 비고 보통주자본금 W500 1 |
| ACC_2025_Q062 | ACC_EQ (자본·배당) | 자본·배당 | Y · p.21 · Q62 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은20×1년초종업원100명 에게각각주식선택권 10 개 (개당행사 가격 W500, 주당액면금액W150) 를부여하고부여일 로 부터 2년 의용역제공조건 을 |
| ACC_2025_Q063 | ACC_INV (재고자산) | FIFO·총평균법 매출원가 | Y · p.21 · Q63 | B | 재고 Pattern에 자본·EPS 매핑 | (주) 감평 의20×1년보통주 에귀속되 는당기순 이익 은W1,000,000, 가중평균유통보 통주식수 는100주, 중단사업손익 은 없다. (주) 감평 이희석주당 이 |
| ACC_2025_Q064 | ACC_REV (수익인식) | 수익인식 | Y · p.21 · Q64 | A | Chapter/Pattern/Domain 대체로 정합 | 20×1년영업 을개시한 (주) 감평 은상품구매W10당 1 포인트 를고객 에게보상 하 는 고객충성제 도 를운영한다. 각포인트 는기업 의상품 을미래 에구매할 때W1의 |
| ACC_2025_Q065 | ACC_INV (재고자산) | 운반비·부대비용과 재고원가 | Y · p.22 · Q65 | B | 재고 Pattern에 리스 매핑 | (주) 감평 은20×1년초 (주) 대한리스 와사용목적 으 로차량운반구 (내용연수 5년, 잔 존 가치W0, 정액법상각, 재평 가모형적용) 금융리스계약 (리스기간 3 |
| ACC_2025_Q066 | ACC_INT (무형자산) | 무형자산 | Y · p.22 · Q66 | B | 법인세 Algorithm인데 Pattern=ACC_INT_001 | 다음 은20×1년설립한 (주) 감평 의20×2년법인세관련자료 이다. ○20×2년법인세비용차감전순 이익 W500,000 ○20×2년처음발생한세무조정사항 - 접대비한 |
| ACC_2025_Q067 | ACC_PPE (유형자산) | 재평가·손상 | Y · p.23 · Q67 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 의20×1년기계장치 (원 가모형적용) 와관련된기초 및기말잔액자료 는 다음 과같다. 계정 기초 기말 기계장치 W130,000 W150,000 감 가상각 |
| ACC_2025_Q068 | ACC_REV (수익인식) | 수익인식 | Y · p.23 · Q68 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 의20×1년매출액순 이익률 은 10 %, 총자산회전율 은1.2회, 자기자본순 이 익률 (ROE) 은 15 %이다. (주) 감평 의20×1년부채비율 ( |
| ACC_2025_Q069 | ACC_INT (무형자산) | 무형자산 | Y · p.23 · Q69 | A | Chapter/Pattern/Domain 대체로 정합 | (주) 감평 은20×1년초 (주) 대한 을흡수합병하고 이전대 가 로 (주) 감평 의보통주식 200주 (주당액면금액W1,000, 주당공정 가치W4,500) 를지급  |
| ACC_2025_Q070 | ACC_EQ (자본·배당) | 자본·배당 | Y · p.23 · Q70 | A | Chapter/Pattern/Domain 대체로 정합 | 외화거래 에서화폐성항목 을모두고른 것 은? ㄱ. 현금 으 로지급 하 는연금 ㄴ. 현금 으 로상환 하 는충당부채 ㄷ. 부채 로인식 하 는현금배당 ㄹ. 사용권자산 ㅁ |
| ACC_2025_Q071 | ACC_REV (수익인식) | 수익인식 | Y · p.24 · Q71 | C | 재무 Chapter/Pattern에 원가 Algorithm(개별·활동기준원가) — primary/related 분리 필요 | (주) 감평 의20×1년매출액 은W4,000,000이며, 매출총 이익률 은 20 %이다. 당기중 직접재료 매입액 은 W1,500,000이며, 직접노무원 가 는 제 |
| ACC_2025_Q072 | ACC_REV (수익인식) | 수익인식 | Y · p.24 · Q72 | C | 재무 Chapter/Pattern에 원가 Algorithm(개별·활동기준원가) — primary/related 분리 필요 | (주) 감평 은20×1년초 에설립되었으며, 정상개별원 가계산 을적용하고 있다. 다음 은20×1년말배부차 이 를조정 하기전 의제조간접원 가계정 과기말재고자산 및 매 |
| ACC_2025_Q073 | ACC_INV (재고자산) | FIFO·총평균법 매출원가 | Y · p.25 · Q73 | D | Chapter=ACC_INV Pattern=ACC_INV_006 이나 실제는 종합원가·환산량 | (주) 감평 은단일제품 을대량생산하고있으며, 선입선출법 에 의한종합원 가계산 을적 용하고 있다. 직접재료원 가 는공정초 에전량투입되며, 전환원 가 (convers |
| ACC_2025_Q074 | ACC_GEN (회계학 일반) | 회계학 일반 | Y · p.25 · Q74 | D | Chapter=ACC_GEN Pattern=ACC_GEN_001 이나 실제는 결합원가·주부산품 | (주) 감평 은원재료리튬 을 이용 하여결합제품A, B, C를생산하고 있다. 각결합 제품 의생산량, 결합원 가 및분리점 의판매 가치 에관한자료 는다음 과같다. 제품 |
| ACC_2025_Q075 | ACC_GEN (회계학 일반) | 회계학 일반 | Y · p.25 · Q75 | D | Chapter=ACC_GEN Pattern=ACC_GEN_001 이나 실제는 표준원가·차이분석 | (주) 감평 은표준원 가계산제 도 를채택하고 있다. 20×1년직접재료원 가 의표준원 가 와실제원 가 의차 이 에관한자료 는다음 과같다. 직접재료실제사용량 4,85 |
| ACC_2025_Q076 | ACC_GEN (회계학 일반) | 회계학 일반 | Y · p.26 · Q76 | C | 재무 Chapter/Pattern에 원가 Algorithm(전부·변동원가·CVP) — primary/related 분리 필요 | 전부원 가계산, 변동원 가계산 및초변동원 가계산 에관한설명 으 로옳지않 은 것 은? |
| ACC_2025_Q077 | ACC_REV (수익인식) | 수익인식 | Y · p.26 · Q77 | C | 재무 Chapter/Pattern에 원가 Algorithm(전부·변동원가·CVP) — primary/related 분리 필요 | (주) 감평 은단일제품 을생산ㆍ판매하고 있다. 20×1년매출액 은W1,200,000(판매량 1,000단위), 총고정원 가 는W240,000, 변동원 가율 은 75 |
| ACC_2025_Q078 | ACC_GEN (회계학 일반) | 회계학 일반 | Y · p.26 · Q78 | C | 재무 Chapter/Pattern에 원가 Algorithm(개별·활동기준원가) — primary/related 분리 필요 | (주) 감평 은20×1년에영업 을개시 하였으며, 실제원 가계산 을적용하고 있다. 20×1년 생산 및판매 에관한자료 는다음 과같다. 생산량 5,000단위 판매량 4 |
| ACC_2025_Q079 | ACC_INV (재고자산) | FIFO·총평균법 매출원가 | Y · p.27 · Q79 | C | 재무 Chapter/Pattern에 원가 Algorithm(전부·변동원가·CVP) — primary/related 분리 필요 | (주) 감평 의제 1 사업부 는단일제품 을생산ㆍ판매하고있으며, 투자중심점 으 로운영 되고 있다. 20×1년제 1 사업부 의성 과평 가 와관련된자료 는다음 과같다. |
| ACC_2025_Q080 | ACC_COST (원가·관리회계) | 관리회계 | Y · p.27 · Q80 | A | 원가·관리회계 Pattern과 Algorithm 정합 | 전략적관리회계기법 에관한내용 으 로옳 은 것 을모두고른 것 은? ㄱ. 제약 이론 (theory of constraints) 은기업 의목표 를달성 하 는 과정 에서 |

---

## 9. Acceptance

| Criterion | Status |
|-----------|--------|
| 240문항 Audit Coverage | PASS (240) |
| 원본 확인 가능 여부 표기 | PASS (OK 160 / NG 80) |
| Pattern 오류 후보 목록 | PASS (MOVE/LINK/NEW sections) |
| Multiple Pattern 후보 | PASS (LINK section) |
| 기존 SoT 변경 없음 | PASS |

---

## 10. Limitations

- Actual Algorithm은 **키워드 규칙 + stem/solution 텍스트** 기반이다. 원본 PDF 전수 육안 대조는 별도 Human Review가 필요하다.
- `solution.algorithm` 필드가 비어 있는 문항이 많아 stem 의존도가 높다.
- ACC_GEN(55) KEEP 다수는 ‘세부분류 근거 부족’이며, 추가 육안 Audit 대상이다.
- 원본 PDF 미연결 연도(2015·2017)는 Source=N이어도 stem 기반 Domain 판정은 수행했다.

