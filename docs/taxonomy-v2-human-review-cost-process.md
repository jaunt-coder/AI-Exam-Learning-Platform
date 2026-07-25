# Taxonomy V2 Human Review — COST_PROCESS_001

Sprint-09D · Human Review Gate Analyst  
Date: 2026-07-26  
Status: **REVIEW ONLY** — SoT / Runtime / UI 변경 없음

Candidate: `COST_PROCESS_001` (종합원가계산 · 완성품환산량 기반 원가 배분)  
Domain: `cost_accounting`  
Scope: Sprint-09B/09C 후보 중 **Source=Y** 문항만

근거:

- [pattern-boundary-audit.md](pattern-boundary-audit.md)
- [pattern-taxonomy-v2-design.md](pattern-taxonomy-v2-design.md)
- `data/pattern-taxonomy-candidates.json`

승인 기록: `data/pattern-taxonomy-review-flags.json` (**Pattern DB 아님**)

---

## 1. Review Criteria

각 문항:

| # | Question | Scale |
|---|----------|-------|
| 1 | 시험장에서 필요한 핵심 Algorithm인가? | YES / NO |
| 2 | 기존 Pattern으로 충분히 설명 가능한가? | YES / NO |
| 3 | 독립 Pattern 승격 가치가 있는가? | YES / NO |
| 4 | Primary Pattern 후보인가? | YES / NO |
| 5 | Related Pattern 연결 필요? | YES / NO |

### Decision

| Decision | Meaning |
|----------|---------|
| `APPROVE_CANDIDATE` | 향후 `COST_PROCESS_001` Pattern 승격 후보 |
| `REJECT` | 본 Candidate에서 제외 · 기존/다른 후보 경로 |
| `LINK_ONLY` | Primary 불필요 · Related만 |

---

## 2. Coverage

| Metric | Value |
|--------|------:|
| COST_PROCESS_001 draft evidence (all sources) | 10 |
| Source=Y review targets | **6** |
| APPROVE_CANDIDATE | 4 |
| REJECT | 2 |
| LINK_ONLY | 0 |

Source=N (2015·2017) evidence는 본 Sprint 제외 → 추후 PDF 연결 후 Gate 재개.

---

## 3. Summary Table

| Question | Source | Current Pattern | Candidate | Algorithm | Decision |
|----------|--------|-----------------|-----------|-----------|----------|
| ACC_2018_Q079 | Y · p.28 · Q79 | ACC_INV_006 | COST_PROCESS_001 | 완성품환산량(WA/FIFO) · 기초재공 완성도 | **APPROVE_CANDIDATE** |
| ACC_2018_Q080 | Y · p.28 · Q80 | ACC_REV_001 | COST_PROCESS_001 | 제조원가→매출원가 (재공·제품 증감) | **REJECT** |
| ACC_2020_Q073 | Y · p.26 · Q73 | ACC_INV_006 | COST_PROCESS_001 | FIFO 종합원가 · 환산량 · 기초재공원가 | **APPROVE_CANDIDATE** |
| ACC_2024_Q073 | Y · p.24 · Q73 | ACC_INV_006 | COST_PROCESS_001 | 종합원가 · 전환원가 환산 · 품질검사/공손 | **APPROVE_CANDIDATE** |
| ACC_2024_Q074 | Y · p.25 · Q74 | ACC_GEN_001 | COST_PROCESS_001 | 표준원가 · 재료 가격/능률차이 · 기말재료 | **REJECT** |
| ACC_2025_Q073 | Y · p.25 · Q73 | ACC_INV_006 | COST_PROCESS_001 | FIFO 종합원가 · 정상공손 · 환산량 | **APPROVE_CANDIDATE** |

---

## 4. Item Reviews

### ACC_2018_Q079 — APPROVE_CANDIDATE

| Criterion | Answer | Note |
|-----------|--------|------|
| 1 Core Algorithm | **YES** | WA vs FIFO 전환원가 환산량 → 기초재공 완성도 역산 |
| 2 Existing enough | **NO** | `ACC_INV_006`는 상품 FIFO·매출원가 — 환산량 사고와 불일치 |
| 3 Promote value | **YES** | 종합원가 핵심 유형 · 반복 출제 |
| 4 Primary | **YES** | |
| 5 Related | **YES** | 현행 `ACC_INV_006`을 Related(혼동·잔존 매핑)로 유지 권고 |

**Evidence (stem):** 종합원가계산 · 완성품환산량 108,000 / 87,000 · 기초재공 완성도

---

### ACC_2018_Q080 — REJECT

| Criterion | Answer | Note |
|-----------|--------|------|
| 1 Core Algorithm (PROCESS) | **NO** | 환산량·완성도 없음. 제조원가 집계 후 매출원가 |
| 2 Existing enough | **NO** | `ACC_REV_001` 부적합. 다만 PROCESS도 부적합 |
| 3 Promote as PROCESS | **NO** | |
| 4 Primary PROCESS | **NO** | |
| 5 Related to PROCESS | **NO** | |

**Disposition:** `COST_MFG_001` Human Review로 이관 권고 (본 Gate에서는 PROCESS **REJECT**).  
SoT `patternId`는 변경하지 않음.

---

### ACC_2020_Q073 — APPROVE_CANDIDATE

| Criterion | Answer | Note |
|-----------|--------|------|
| 1 Core Algorithm | **YES** | FIFO 종합원가 · 물량·완성도 · 기초재공 직접재료원가 |
| 2 Existing enough | **NO** | `ACC_INV_006` 불충분 |
| 3 Promote value | **YES** | |
| 4 Primary | **YES** | |
| 5 Related | **YES** | `ACC_INV_006` |

---

### ACC_2024_Q073 — APPROVE_CANDIDATE

| Criterion | Answer | Note |
|-----------|--------|------|
| 1 Core Algorithm | **YES** | 종합원가 · 전환원가 환산 · 품질검사 시점 |
| 2 Existing enough | **NO** | |
| 3 Promote value | **YES** | 공손·검사 변형 포함 — PROCESS 범위 내 |
| 4 Primary | **YES** | |
| 5 Related | **YES** | `ACC_INV_006` |

---

### ACC_2024_Q074 — REJECT

| Criterion | Answer | Note |
|-----------|--------|------|
| 1 Core Algorithm (PROCESS) | **NO** | 표준원가 재료 가격차이·능률차이 · 기말재료수량 |
| 2 Existing enough | **NO** | `ACC_GEN_001` 버킷 — PROCESS로 설명 불가 |
| 3 Promote as PROCESS | **NO** | |
| 4 Primary PROCESS | **NO** | |
| 5 Related to PROCESS | **NO** | |

**Disposition:** `COST_STD_001` Human Review로 이관 권고.  
후보 JSON의 `COST_PROCESS_001` 태그는 **오분류**로 판정.

---

### ACC_2025_Q073 — APPROVE_CANDIDATE

| Criterion | Answer | Note |
|-----------|--------|------|
| 1 Core Algorithm | **YES** | FIFO 종합원가 · 정상공손(합격품 3%) · 환산량 |
| 2 Existing enough | **NO** | `ACC_INV_006` 불충분 |
| 3 Promote value | **YES** | |
| 4 Primary | **YES** | |
| 5 Related | **YES** | `ACC_INV_006` |

---

## 5. Gate Verdict — COST_PROCESS_001

| Verdict | Detail |
|---------|--------|
| **Candidate viability** | **PASS** — Source=Y 승인 4문항 ≥ minEvidence(2) |
| Promotion to Pattern DB now | **NO** — 별도 Promotion Sprint + 서명 필요 |
| Mapping Fix now | **NO** — Question `patternId` 동결 |
| Runtime | **NO IMPACT** |

### Approved evidence set (Primary = COST_PROCESS_001)

1. `ACC_2018_Q079`
2. `ACC_2020_Q073`
3. `ACC_2024_Q073`
4. `ACC_2025_Q073`

권고 Related (마이그레이션 시): 각 문항 `ACC_INV_006`

### Rejected from this candidate

| Question | Reason | Suggested next candidate |
|----------|--------|--------------------------|
| ACC_2018_Q080 | 제조원가→COGS · 환산량 없음 | `COST_MFG_001` |
| ACC_2024_Q074 | 표준원가 차이분석 | `COST_STD_001` |

---

## 6. Migration Recommendation

| Option | Recommend | Why |
|--------|-----------|-----|
| 즉시 Pattern DB append | **No** | Human Gate는 승인 기록만 · Promotion Sprint 분리 |
| 즉시 Question mapping 변경 | **No** | SoT 보호 · Mapping Fix는 승인 큐 이후 |
| 다음 Sprint | **Yes — 09E** | (A) `COST_STD_001` / `COST_MFG_001` Source=Y Gate **또는** (B) `COST_PROCESS_001` Promotion Pack (draft→Pattern DB append only, mapping 유지) |

**권장 순서:**

1. **09E** — 나머지 Cost draft (`STD` / `MFG` / `JOINT` / `CVP` / `ABC`) Source=Y Human Review  
2. **09F** — 승인된 draft만 Pattern DB **소량 append** (Question mapping 유지)  
3. **09G** — APPROVE 4문항 Mapping Fix: `primaryPattern=COST_PROCESS_001`, `relatedPatterns=[ACC_INV_006]`

---

## 7. Acceptance

| Criterion | Status |
|-----------|--------|
| Source=Y 검토 | **PASS** (6/6) |
| COST_PROCESS 후보 검증 | **PASS** (4 approve · 2 reject) |
| Human 판단 기록 | **PASS** (md + flags JSON) |
| 기존 SoT 변경 없음 | **PASS** |
| Runtime 영향 없음 | **PASS** |

---

## 8. Limitations

- 원본 PDF 페이지는 Source Map 기준으로 열람 가능하다고 전제하고, 본 리뷰는 **DB stem 전문 + Algorithm 적합성**으로 판정했다.
- Source=N 종합원가 문항(2015·2017)은 승인 세트에 넣지 않았다.
- `REJECT`는 Question 품질 거부가 아니라 **본 Candidate 부적합**을 뜻한다.
