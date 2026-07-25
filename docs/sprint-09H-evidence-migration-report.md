# Sprint-09H — Evidence Migration Report (Phase 2–4)

**Date:** 2026-07-26  
**Target:** `data/pattern-db-mvp.json` only  
**Untouched:** `data/question-db-mvp.json` (mapping / frequency / content)

---

## Validation

| Check | Result |
|-------|--------|
| questions | **240 · PASS** |
| frequency | **0 mismatch · PASS** |
| primaryPattern | **20 · PASS** |

---

## Evidence

| Stage | Count |
|-------|------:|
| before missing (top-level empty) | 21 |
| Case B migrated | **5** |
| Case C placeholder (`MISSING_REVIEW`) | **16** |
| remaining GAP (non-empty evidence 없음) | **16** |

### Case B — migrated (nested → top-level)

| patternId | count | from | confidence |
|-----------|------:|------|------------|
| COST_PROCESS_001 | 4 | `promotedFrom.approvedEvidenceQuestions` | high |
| COST_JOINT_001 | 3 | `promotedFrom.approvedEvidenceQuestions` | high |
| COST_STD_001 | 3 | `promotedFrom.approvedEvidenceQuestions` | high |
| COST_CVP_001 | 8 | `promotedFrom.approvedEvidenceQuestions` | high |
| COST_MFG_001 | 2 | `promotedFrom.approvedEvidenceQuestions` | high |

각 Pattern에 추가됨:

- `evidence.questions` / `evidence.source=human_review` / `evidence.confidence`
- `approvedEvidenceQuestions` (동일 목록)
- `promotedFrom` **보존** (삭제 없음)

### Case C — placeholder only (자동 생성 금지)

| patternId | frequency | evidence.status |
|-----------|----------:|-----------------|
| ACC_COST_002 | 2 | MISSING_REVIEW |
| ACC_EQ_001 | 16 | MISSING_REVIEW |
| ACC_FIN_001 | 7 | MISSING_REVIEW |
| ACC_FIN_002 | 12 | MISSING_REVIEW |
| ACC_FS_001 | 23 | MISSING_REVIEW |
| ACC_GEN_001 | 48 | MISSING_REVIEW |
| ACC_INT_001 | 19 | MISSING_REVIEW |
| ACC_INV_001 | 1 | MISSING_REVIEW |
| ACC_INV_003 | 3 | MISSING_REVIEW |
| ACC_INV_004 | 2 | MISSING_REVIEW |
| ACC_INV_006 | 13 | MISSING_REVIEW |
| ACC_INV_007 | 2 | MISSING_REVIEW |
| ACC_LEASE_001 | 4 | MISSING_REVIEW |
| ACC_PPE_001 | 42 | MISSING_REVIEW |
| ACC_PPE_002 | 4 | MISSING_REVIEW |
| ACC_REV_001 | 22 | MISSING_REVIEW |

형태:

```json
{
  "evidence": {
    "questions": [],
    "status": "MISSING_REVIEW"
  }
}
```

`relatedQuestions`는 Human Review evidence로 승격하지 않았다.

---

## Validator (Phase 3)

`js/data-loader.js`

- frequency > 0 이고 non-empty evidence 없으면  
  warning: `[EVIDENCE_GAP] {patternId} evidence missing`
- **Sprint-09H warning mode:** `valid`는 errors만 기준 (warnings로 실패하지 않음)
- 예상 warning 수: **16** (Case C)

---

## Guards

| Guard | Result |
|-------|--------|
| patternId 변경 | 없음 |
| frequency 변경 | 없음 |
| promotedFrom 삭제 | 없음 |
| question-db-mvp 변경 | 없음 |
| primaryPattern 재계산 | 없음 |
| 신규 Pattern 생성 | 없음 |
