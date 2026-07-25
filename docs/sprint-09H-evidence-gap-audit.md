# Sprint-09H — Evidence Gap Audit (Phase 1)

**Date:** 2026-07-26  
**Source:** `data/pattern-db-mvp.json` (read-only at audit time)  
**Rule:** frequency > 0 Pattern은 top-level `approvedEvidenceQuestions` 또는 `evidence.questions` 필요

---

## 1. Pattern Coverage

| patternId | frequency | evidence 존재 | 상태 |
|-----------|----------:|---------------|------|
| ACC_COST_002 | 2 | 없음 (relatedQuestions만) | C |
| ACC_EQ_001 | 16 | 없음 (relatedQuestions만) | C |
| ACC_FIN_001 | 7 | 없음 (relatedQuestions만) | C |
| ACC_FIN_002 | 12 | 없음 (relatedQuestions만) | C |
| ACC_FS_001 | 23 | 없음 (relatedQuestions만) | C |
| ACC_GEN_001 | 48 | 없음 (relatedQuestions만) | C |
| ACC_INT_001 | 19 | 없음 (relatedQuestions만) | C |
| ACC_INV_001 | 1 | 없음 (relatedQuestions만) | C |
| ACC_INV_003 | 3 | 없음 (relatedQuestions만) | C |
| ACC_INV_004 | 2 | 없음 (relatedQuestions만) | C |
| ACC_INV_006 | 13 | 없음 (relatedQuestions만) | C |
| ACC_INV_007 | 2 | 없음 (relatedQuestions만) | C |
| ACC_LEASE_001 | 4 | 없음 (relatedQuestions만) | C |
| ACC_PPE_001 | 42 | 없음 (relatedQuestions만) | C |
| ACC_PPE_002 | 4 | 없음 (relatedQuestions만) | C |
| ACC_REV_001 | 22 | 없음 (relatedQuestions만) | C |
| COST_PROCESS_001 | 4 | nested `promotedFrom.approvedEvidenceQuestions` | B |
| COST_JOINT_001 | 3 | nested `promotedFrom.approvedEvidenceQuestions` | B |
| COST_STD_001 | 3 | nested `promotedFrom.approvedEvidenceQuestions` | B |
| COST_CVP_001 | 8 | nested `promotedFrom.approvedEvidenceQuestions` | B |
| COST_MFG_001 | 2 | nested `promotedFrom.approvedEvidenceQuestions` | B |

- frequency > 0: **21**
- frequency = 0 (대상 외): `ACC_TAX_001`

---

## 2. Evidence Source 위치 분석

| Location | Hits (non-empty) |
|----------|-----------------:|
| `pattern.evidence.questions` | 0 |
| `pattern.approvedEvidenceQuestions` | 0 |
| `pattern.promotedFrom.evidence.questions` | 0 |
| `pattern.promotedFrom.approvedEvidenceQuestions` | **5** (모든 COST_*) |

부가 관측 (계약 외):

- ACC_* 16개: `relatedQuestions`만 존재 (자동 승격 금지 · Case C)
- COST_* 5개: `relatedQuestions`와 nested approved 목록이 동일 문항을 가리킴

---

## 3. GAP 분류

| Category | Meaning | Count | Patterns |
|----------|---------|------:|----------|
| **A** | 완전 존재 (top-level) | 0 | — |
| **B** | 하위 위치 존재 → migration 가능 | 5 | COST_PROCESS_001, COST_JOINT_001, COST_STD_001, COST_CVP_001, COST_MFG_001 |
| **C** | 없음 → human review 필요 | 16 | 모든 frequency>0 ACC_* (위 표) |

### Case B detail

| patternId | nested approved count | source path |
|-----------|----------------------:|-------------|
| COST_PROCESS_001 | 4 | `promotedFrom.approvedEvidenceQuestions` |
| COST_JOINT_001 | 3 | `promotedFrom.approvedEvidenceQuestions` |
| COST_STD_001 | 3 | `promotedFrom.approvedEvidenceQuestions` |
| COST_CVP_001 | 8 | `promotedFrom.approvedEvidenceQuestions` |
| COST_MFG_001 | 2 | `promotedFrom.approvedEvidenceQuestions` |

### Case C note

`relatedQuestions`는 연결 힌트일 뿐 Human Review evidence가 아니다.  
Phase 2에서 자동 생성하지 않고 `evidence.status = MISSING_REVIEW` placeholder만 둔다.
