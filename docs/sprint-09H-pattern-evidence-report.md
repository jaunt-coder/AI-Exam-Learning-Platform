# Sprint-09H — Pattern DB Evidence Report

**Date:** 2026-07-26  
**Source:** `data/pattern-db-mvp.json` (read-only · **미수정**)  
**Rule:** `frequency > 0` 인 Pattern은 top-level `approvedEvidenceQuestions` **또는** `evidence.questions` 중 하나를 가져야 한다.

---

## Summary

| Metric | Count |
|--------|------:|
| patterns total | 22 |
| frequency > 0 | 21 |
| frequency = 0 | 1 (`ACC_TAX_001`) |
| rule PASS (approvedEvidenceQuestions \| evidence.questions) | **0** |
| rule GAP (누락) | **21** |

데이터는 수정하지 않았다. 아래는 관측 결과만 기록한다.

---

## Gaps (frequency > 0, required evidence missing)

모든 frequency>0 Pattern이 top-level 필수 evidence 필드를 갖지 않는다.

| patternId | frequency | relatedQuestions | promotedFrom.approvedEvidenceQuestions | notes |
|-----------|----------:|:----------------:|:--------------------------------------:|-------|
| ACC_COST_002 | 2 | Y | N | relatedQuestions only |
| ACC_EQ_001 | 16 | Y | N | relatedQuestions only |
| ACC_FIN_001 | 7 | Y | N | relatedQuestions only |
| ACC_FIN_002 | 12 | Y | N | relatedQuestions only |
| ACC_FS_001 | 23 | Y | N | relatedQuestions only |
| ACC_GEN_001 | 48 | Y | N | relatedQuestions only |
| ACC_INT_001 | 19 | Y | N | relatedQuestions only |
| ACC_INV_001 | 1 | Y | N | relatedQuestions only |
| ACC_INV_003 | 3 | Y | N | relatedQuestions only |
| ACC_INV_004 | 2 | Y | N | relatedQuestions only |
| ACC_INV_006 | 13 | Y | N | relatedQuestions only |
| ACC_INV_007 | 2 | Y | N | relatedQuestions only |
| ACC_LEASE_001 | 4 | Y | N | relatedQuestions only |
| ACC_PPE_001 | 42 | Y | N | relatedQuestions only |
| ACC_PPE_002 | 4 | Y | N | relatedQuestions only |
| ACC_REV_001 | 22 | Y | N | relatedQuestions only |
| COST_PROCESS_001 | 4 | Y | **Y (nested)** | evidence는 `promotedFrom` 하위 |
| COST_JOINT_001 | 3 | Y | **Y (nested)** | evidence는 `promotedFrom` 하위 |
| COST_STD_001 | 3 | Y | **Y (nested)** | evidence는 `promotedFrom` 하위 |
| COST_CVP_001 | 8 | Y | **Y (nested)** | evidence는 `promotedFrom` 하위 |
| COST_MFG_001 | 2 | Y | **Y (nested)** | evidence는 `promotedFrom` 하위 |

---

## Observations

1. **ACC_\*** Pattern은 `relatedQuestions`로 문항 연결을 유지하나, Sprint-09H 계약의 `approvedEvidenceQuestions` / `evidence.questions`는 없다. `evidence` 객체가 있어도 `questions` 키가 비어 있다.
2. **COST_\*** Pattern은 Human Gate 승인 목록이 `promotedFrom.approvedEvidenceQuestions`에만 존재한다. top-level로는 승격되지 않았다.
3. 본 Sprint는 **report-only**. schema 정규화(top-level evidence 승격)는 후속 Sprint 권고.

---

## Recommended Follow-up (not in scope)

- COST_*: `promotedFrom.approvedEvidenceQuestions` → top-level `approvedEvidenceQuestions` 승격  
- ACC_*: `relatedQuestions`를 `evidence.questions`로 계약 정렬하거나 Human Gate evidence 목록 정의  
- frequency=0 Pattern은 본 규칙 대상 외
