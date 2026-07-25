# Pattern Promotion Report — Sprint-09F

Date: 2026-07-26  
Role: Pattern Migration Architect  
Type: **Pattern DB append-only** · Question Mapping **frozen**

---

## Goal

Sprint-09E에서 승인된 Cost Candidate 5개를 Pattern DB에 승격한다.  
Question / Answer / Attempt / Evidence / Runtime / UI는 변경하지 않는다.

---

## Scope

| Allowed | Forbidden |
|---------|-----------|
| `data/pattern-db-mvp.json` append | Question DB |
| Promotion log / report | Answer / Attempt / Evidence |
| | Runtime / UI |
| | `COST_ABC_001` |

---

## Results

| Metric | Value |
|--------|------:|
| Patterns before | 17 |
| Patterns after | 22 |
| Appended | 5 |
| Existing mutated | 0 |
| Question DB changed | No |

### Promoted Patterns

| Pattern ID | Algorithm | Status | Evidence (pending map) |
|------------|-----------|--------|------------------------|
| `COST_PROCESS_001` | 종합원가계산 / 환산량 / 완성품환산량 | `PROMOTED_PENDING_MAPPING` | ACC_2018_Q079, ACC_2020_Q073, ACC_2024_Q073, ACC_2025_Q073 |
| `COST_JOINT_001` | 결합원가 배분 | `PROMOTED_PENDING_MAPPING` | ACC_2020_Q074, ACC_2024_Q076, ACC_2025_Q074 |
| `COST_STD_001` | 표준원가 차이 분석 | `PROMOTED_PENDING_MAPPING` | ACC_2020_Q075, ACC_2024_Q074, ACC_2025_Q075 |
| `COST_CVP_001` | CVP 분석 | `PROMOTED_PENDING_MAPPING` | ACC_2018_Q071, ACC_2018_Q075, ACC_2018_Q078, ACC_2020_Q076, ACC_2024_Q075, ACC_2024_Q077, ACC_2025_Q076, ACC_2025_Q077 |
| `COST_MFG_001` | 제조원가 흐름 | `PROMOTED_PENDING_MAPPING` | ACC_2018_Q076, ACC_2018_Q080 |

### Rejected (not promoted)

| Pattern ID | Reason |
|------------|--------|
| `COST_ABC_001` | Algorithm Unit 위반 (09E) |

---

## Promotion Schema (applied)

```json
{
  "patternId": "COST_PROCESS_001",
  "domain": "cost_accounting",
  "chapter": "종합원가계산",
  "title": "...",
  "algorithm": "종합원가계산 / 환산량 / 완성품환산량",
  "trigger": "...",
  "relatedPatterns": ["ACC_INV_006"],
  "status": "PROMOTED_PENDING_MAPPING",
  "promotedFrom": { "...human gate refs..." }
}
```

Legacy MVP fields 병행: `subjectId`, `chapterId`, `name`, `grade`, `frequency`, `years`, `importance`, `relatedQuestions`.

**`frequency: 0` · `relatedQuestions: []`** — Question Mapping 미변경 상태에서 data-loader 검증(`frequency == mapped question count`)을 통과하기 위함. 09G Mapping Fix 시 동기화.

---

## Before / After / Reason / Approval

### `COST_PROCESS_001`

- **Before Pattern:** `None` (new append)
- **After Pattern:** `COST_PROCESS_001` · domain=`cost_accounting` · status=`PROMOTED_PENDING_MAPPING`
- **Promotion Reason:** 공통 Trigger(종합원가·환산량·재공 완성도)와 독립 Algorithm(EU→배분)이 명확하다. ACC_INV_006 등 FA Pattern으로 설명 불가. 다년도 반복 확인(승인 4).
- **Human Approval:** data/pattern-taxonomy-cost-review-flags.json · APPROVE_CANDIDATE · confidence=high
- **Question Mapping Changed:** False

### `COST_JOINT_001`

- **Before Pattern:** `None` (new append)
- **After Pattern:** `COST_JOINT_001` · domain=`cost_accounting` · status=`PROMOTED_PENDING_MAPPING`
- **Promotion Reason:** 결합공정·분리점·주부산품 Trigger가 문항 간 공유된다. 결합원가 배분은 INV_007 LCM/NRV·GEN 버킷으로 대체 불가. Source=Y 3년 반복.
- **Human Approval:** data/pattern-taxonomy-cost-review-flags.json · APPROVE_CANDIDATE · confidence=high
- **Question Mapping Changed:** False

### `COST_STD_001`

- **Before Pattern:** `None` (new append)
- **After Pattern:** `COST_STD_001` · domain=`cost_accounting` · status=`PROMOTED_PENDING_MAPPING`
- **Promotion Reason:** 표준원가 가격/임률·능률/수량 차이분석이 독립 Algorithm이다. FA Pattern으로 설명 불가. 2020·2024·2025 반복(09D PROCESS 오분류 이관분 포함).
- **Human Approval:** data/pattern-taxonomy-cost-review-flags.json · APPROVE_CANDIDATE · confidence=high
- **Question Mapping Changed:** False

### `COST_CVP_001`

- **Before Pattern:** `None` (new append)
- **After Pattern:** `COST_CVP_001` · domain=`cost_accounting` · status=`PROMOTED_PENDING_MAPPING`
- **Promotion Reason:** 변동/전부원가·CVP·제약자원 의사결정의 공통 Trigger와 독립 Algorithm이 명확하다. INV/TAX/REV 오매핑이 FA로 해소되지 않는다. Source=Y 반복성 높음.
- **Human Approval:** data/pattern-taxonomy-cost-review-flags.json · APPROVE_CANDIDATE · confidence=high
- **Question Mapping Changed:** False

### `COST_MFG_001`

- **Before Pattern:** `None` (new append)
- **After Pattern:** `COST_MFG_001` · domain=`cost_accounting` · status=`PROMOTED_PENDING_MAPPING`
- **Promotion Reason:** 환산량 없는 제조원가 집계·재공/제품·매출원가 흐름은 PROCESS/STD와 분리되는 독립 Algorithm이다. REV Pattern으로 설명 불가. Source=Y 확정 2건으로 반복성은 medium.
- **Human Approval:** data/pattern-taxonomy-cost-review-flags.json · APPROVE_CANDIDATE · confidence=medium
- **Question Mapping Changed:** False

---

## Acceptance

| Criterion | Status |
|-----------|--------|
| Approved 5개 Pattern 추가 | **PASS** |
| Pattern ID 고정 | **PASS** |
| 기존 Pattern 유지 | **PASS** |
| Append-only 확인 | **PASS** |
| Migration Log 존재 | **PASS** (`data/pattern-promotion-log.json`) |
| Question Mapping 미변경 | **PASS** (sha256 unchanged) |

---

## Next Sprint — 09G Mapping Fix 준비

1. Order: PROCESS → JOINT → STD → CVP → MFG
2. For each approved evidence question: set `primaryPattern` / `relatedPatterns` (or `patternId`) per Taxonomy V2
3. Sync Pattern `frequency` + `relatedQuestions` with mapped counts
4. Flip status `PROMOTED_PENDING_MAPPING` → `ACTIVE` (or keep pending until runtime adoption)
5. Still forbid Answer/OCR/Parser edits

Mapping Fix Queue seed: see `data/pattern-promotion-log.json` → `promotions[].humanApprovalReference.approvedEvidenceQuestions`

---

## Files

| File | Role |
|------|------|
| `data/pattern-db-mvp.json` | Appended 5 COST_* patterns |
| `data/pattern-promotion-log.json` | Before/After/Reason/Approval log |
| `docs/pattern-promotion-09F-report.md` | This report |

