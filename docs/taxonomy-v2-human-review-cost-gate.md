# Taxonomy V2 Human Review — Cost Accounting Gate (Full)

Sprint-09E · Pattern Taxonomy Reviewer  
Date: 2026-07-26  
Status: **REVIEW ONLY** — Pattern DB / Question Mapping / Runtime / UI 변경 없음

Domain: `cost_accounting`  
선행: [taxonomy-v2-human-review-cost-process.md](taxonomy-v2-human-review-cost-process.md) (09D)  
승인 기록: `data/pattern-taxonomy-cost-review-flags.json`

---

## 1. Review Principles

Pattern 생성 목적은 Chapter 분리가 아니다.  
**시험장에서 필요한 독립 Algorithm 단위**인지만 판단한다.

| # | Criterion |
|---|-----------|
| 1 | 공통 Trigger가 존재하는가? |
| 2 | 독립 Algorithm이 존재하는가? |
| 3 | 기존 Financial Accounting Pattern으로 설명 가능한가? |
| 4 | 시험 출제 반복성이 있는가? |
| 5 | 학생 학습 단위로 저장할 가치가 있는가? |

### Decision

| Decision | Condition |
|----------|-----------|
| `APPROVE_CANDIDATE` | 독립 Algorithm + 반복 가능성 확인 |
| `LINK_ONLY` | 기존 Pattern 보조 역할로 충분 |
| `REJECT` | 기존 Pattern으로 충분 **또는** 후보 정의가 Algorithm 단위를 위반 |

검토 범위: 각 후보의 **Source=Y** 근거 문항 (09D PROCESS 결과 포함).

---

## 2. Gate Summary

| Candidate | Source=Y reviewed | Decision | Confidence | Migration |
|-----------|------------------:|----------|------------|-----------|
| `COST_PROCESS_001` | 6 (승인 4) | **APPROVE_CANDIDATE** | high | 09F Promotion 1순위 |
| `COST_JOINT_001` | 3 | **APPROVE_CANDIDATE** | high | 09F Promotion 2순위 |
| `COST_STD_001` | 3* | **APPROVE_CANDIDATE** | high | 09F Promotion 3순위 |
| `COST_CVP_001` | 10 | **APPROVE_CANDIDATE** | high | 09F Promotion 4순위 |
| `COST_MFG_001` | 2† | **APPROVE_CANDIDATE** | medium | 09F Promotion 5순위 |
| `COST_ABC_001` | 8 | **REJECT** | high | 승격 금지 · 분리 재정의 |

\* `ACC_2024_Q074`는 09D에서 PROCESS REJECT → STD 이관분 포함  
† `ACC_2018_Q080`는 09D에서 PROCESS REJECT → MFG 이관분 포함

---

## 3. Candidate Decisions

### 3.1 COST_PROCESS_001 — APPROVE_CANDIDATE

| Criterion | Result |
|-----------|--------|
| 1 Common Trigger | **YES** — 종합원가 · 환산량 · 재공 완성도 · (공손) |
| 2 Independent Algorithm | **YES** — EU 계산 → 원가배분 |
| 3 Existing FA enough | **NO** — `ACC_INV_006` FIFO 상품원가와 불일치 |
| 4 Repeatability | **YES** — 2018·2020·2024·2025 |
| 5 Learning unit | **YES** |

**Decision:** `APPROVE_CANDIDATE` (09D 확정 유지)

Approved evidence:

- `ACC_2018_Q079`, `ACC_2020_Q073`, `ACC_2024_Q073`, `ACC_2025_Q073`

Excluded from this candidate:

- `ACC_2018_Q080` → MFG  
- `ACC_2024_Q074` → STD  

Related 권고: `ACC_INV_006`

---

### 3.2 COST_JOINT_001 — APPROVE_CANDIDATE

| Criterion | Result |
|-----------|--------|
| 1 Common Trigger | **YES** — 결합공정 · 분리점 · 주산품/부산품 · 결합원가 |
| 2 Independent Algorithm | **YES** — 결합원가 배분 · 추가가공 · 부산품 순실현가치 |
| 3 Existing FA enough | **NO** — `ACC_INV_007` LCM·NRV는 재고평가이지 결합배분이 아님 · `ACC_GEN_001` 버킷 |
| 4 Repeatability | **YES** — 2020·2024·2025 (Source=Y 3) |
| 5 Learning unit | **YES** |

**Decision:** `APPROVE_CANDIDATE`

Reviewed (Source=Y):

| Question | Current | Note |
|----------|---------|------|
| ACC_2020_Q074 | ACC_GEN_001 | 결합제품 A/B/C · 분리점 |
| ACC_2024_Q076 | ACC_INV_007 | 주산품·부산품 · NRV(생산기준) |
| ACC_2025_Q074 | ACC_GEN_001 | 결합원가 배분 |

---

### 3.3 COST_STD_001 — APPROVE_CANDIDATE

| Criterion | Result |
|-----------|--------|
| 1 Common Trigger | **YES** — 표준원가 · 가격/임률차이 · 능률/수량차이 |
| 2 Independent Algorithm | **YES** — 차이분석 체계 |
| 3 Existing FA enough | **NO** |
| 4 Repeatability | **YES** — 2020·2024·2025 |
| 5 Learning unit | **YES** |

**Decision:** `APPROVE_CANDIDATE`

Reviewed (Source=Y):

| Question | Current | Note |
|----------|---------|------|
| ACC_2020_Q075 | ACC_GEN_001 | 직접노무 임률·능률차이 |
| ACC_2024_Q074 | ACC_GEN_001 | 재료 가격·능률 · 기말재료 (09D 이관) |
| ACC_2025_Q075 | ACC_GEN_001 | 재료 가격·사용 차이 |

---

### 3.4 COST_CVP_001 — APPROVE_CANDIDATE

| Criterion | Result |
|-----------|--------|
| 1 Common Trigger | **YES** — 변동/전부원가 · 공헌이익 · CVP · (성과지표) |
| 2 Independent Algorithm | **YES** — 원가·조업도·이익 관계 (관리회계 본선) |
| 3 Existing FA enough | **NO** — `ACC_INV_*` / `ACC_TAX_001` / `ACC_REV_001` 오매핑 |
| 4 Repeatability | **YES** — Source=Y 10문항 · 다년도 |
| 5 Learning unit | **YES** |

**Decision:** `APPROVE_CANDIDATE`

Core evidence (Algorithm 정합 강):

`ACC_2018_Q071`, `ACC_2018_Q075`, `ACC_2018_Q078`, `ACC_2020_Q076`, `ACC_2024_Q075`, `ACC_2024_Q077`, `ACC_2025_Q076`, `ACC_2025_Q077`

Peripheral (같은 후보 유지 · Mapping 시 주의):

| Question | Note |
|----------|------|
| ACC_2024_Q080 | 관리회계기법 개념 O/X — CVP 협의보다 넓음 |
| ACC_2025_Q079 | 투자중심점 ROI/잔여이익 — 성과평가 (CVP 인접) |

---

### 3.5 COST_MFG_001 — APPROVE_CANDIDATE

| Criterion | Result |
|-----------|--------|
| 1 Common Trigger | **YES** — 제조원가 집계 · 재공/제품 · 매출원가 · 정상원가 |
| 2 Independent Algorithm | **YES** — 제조원가명세서·원가흐름 (환산량 없음) |
| 3 Existing FA enough | **NO** — 상품 PER/`ACC_REV_001`로 대체 불가 |
| 4 Repeatability | **MEDIUM** — Source=Y 확정 2 · ABC 오분류군에 유사 문항 추가 가능 |
| 5 Learning unit | **YES** — PROCESS/STD의 선수 단위 |

**Decision:** `APPROVE_CANDIDATE` (confidence: **medium**)

Reviewed:

| Question | Current | Note |
|----------|---------|------|
| ACC_2018_Q076 | ACC_REV_001 | 정상원가 · 생산·판매량 · 고정제조간접 |
| ACC_2018_Q080 | ACC_REV_001 | 재공/제품 증감 → 매출원가 (09D 이관) |

추후 재분류 검토(본 Gate 점수 외): `ACC_2020_Q071`, `ACC_2024_Q071`, `ACC_2025_Q071` 등 원가흐름형.

---

### 3.6 COST_ABC_001 — REJECT

| Criterion | Result |
|-----------|--------|
| 1 Common Trigger | **NO** — Source=Y 8문항이 ABC·개별·원가흐름·make-or-buy·배부차이로 **혼재** |
| 2 Independent Algorithm | **NO (as packaged)** — “활동기준 + 개별원가”를 한 ID에 묶음 → Algorithm 단위 위반 |
| 3 Existing FA / Cost enough | **PARTIAL** — 진성 ABC는 기존 `ACC_COST_002`(관리회계)로 일부 커버 |
| 4 Repeatability | 개별 주제별로는 있음 · **본 후보 정의로는 측정 불가** |
| 5 Learning unit | 분리 전에는 **저장 가치 없음** (잘못된 학습 단위) |

**Decision:** `REJECT`

| Question (Source=Y) | Actual Algorithm (human) | Retarget hint |
|---------------------|--------------------------|---------------|
| ACC_2018_Q072 | 원가+가격결정 | CVP / pricing (비승격) |
| ACC_2018_Q073 | 실제 **개별원가** | 향후 `COST_JOB_001` 후보(미생성) |
| ACC_2020_Q071 | 제조원가·재고 흐름 | `COST_MFG_001` |
| ACC_2020_Q080 | Make-or-buy | `COST_CVP_001` 인접 |
| ACC_2024_Q071 | 정상원가·매출원가 | `COST_MFG_001` |
| ACC_2025_Q071 | 제조원가·매출총이익 | `COST_MFG_001` |
| ACC_2025_Q072 | 정상개별 · 배부차이 | 향후 `COST_JOB_001` |
| ACC_2025_Q078 | 전부/변동 성격 원가계산 | `COST_CVP_001` |

진성 활동기준원가(`ACC_2018_Q077` 등)는 **기존 `ACC_COST_002` 유지** (LINK 가능 · 신규 ABC draft 승격 불필요).

---

## 4. Question-level Snapshot (Source=Y)

### Approved candidates — evidence sets

| Candidate | Approved evidence questions |
|-----------|----------------------------|
| PROCESS | ACC_2018_Q079, ACC_2020_Q073, ACC_2024_Q073, ACC_2025_Q073 |
| JOINT | ACC_2020_Q074, ACC_2024_Q076, ACC_2025_Q074 |
| STD | ACC_2020_Q075, ACC_2024_Q074, ACC_2025_Q075 |
| CVP | ACC_2018_Q071/075/078, ACC_2020_Q076, ACC_2024_Q075/077, ACC_2025_Q076/077 (+ peripheral 080/079) |
| MFG | ACC_2018_Q076, ACC_2018_Q080 |

### Rejected candidate — no promotion set

`COST_ABC_001` — 승격 evidence 없음.

---

## 5. Migration Target Clarity

### Do now? **No**

SoT·Runtime·Mapping 변경 금지 유지.

### Promotion-ready (Pattern DB append-only 후보)

| Order | Candidate | Decision | Min evidence |
|------:|-----------|----------|--------------|
| 1 | COST_PROCESS_001 | APPROVE | 4 |
| 2 | COST_JOINT_001 | APPROVE | 3 |
| 3 | COST_STD_001 | APPROVE | 3 |
| 4 | COST_CVP_001 | APPROVE | 8+ |
| 5 | COST_MFG_001 | APPROVE | 2 (medium) |
| — | COST_ABC_001 | REJECT | 0 |

### Mapping Fix (Promotion 이후)

- APPROVE 문항: `primaryPattern` = 승인 Candidate  
- Related: 오매핑된 현행 `ACC_*` 보존  
- ABC REJECT 문항: Mapping Fix 전 **재태깅 Gate** 필요

### Explicitly out of Migration

- `COST_ABC_001` Pattern DB 추가  
- Question stem / Answer / OCR 수정  
- Runtime Learning Loop 연결  

---

## 6. Recommended Next Sprint Order

1. **09F — Cost Pattern Promotion Pack (append-only)**  
   - 승인 5 Candidate를 Pattern DB에 **소량 append**  
   - Question `patternId` **유지**  
   - `COST_ABC_001` 제외  

2. **09G — Mapping Fix Queue (approved evidence only)**  
   - PROCESS → JOINT → STD → CVP → MFG 순  
   - `primaryPattern` / `relatedPatterns` 오버레이 또는 `patternId` 최소 패치  

3. **09H — Job-Order Redefinition (optional)**  
   - `COST_JOB_001` draft 신설 검토 (개별원가)  
   - ABC는 `ACC_COST_002` 정리  

---

## 7. Acceptance

| Criterion | Status |
|-----------|--------|
| 모든 Cost Candidate 검토 | **PASS** (6/6) |
| 승인 기준 기록 | **PASS** |
| Migration 대상 명확화 | **PASS** (§5) |
| SoT 보호 | **PASS** |

---

## 8. References

- [pattern-taxonomy-v2-design.md](pattern-taxonomy-v2-design.md)
- [taxonomy-v2-human-review-cost-process.md](taxonomy-v2-human-review-cost-process.md)
- `data/pattern-taxonomy-candidates.json`
- `data/pattern-taxonomy-cost-review-flags.json`
- `data/pattern-taxonomy-review-flags.json` (09D PROCESS 상세)
