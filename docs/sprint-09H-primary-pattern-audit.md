# Sprint-09H — Primary Pattern Migration Audit

**Date:** 2026-07-26  
**Source:** `data/question-db-mvp.json` (read-only)  
**Effective rule:** `effectiveQuestionPatternId = primaryPattern ?? patternId`

---

## Summary

| Metric | Count |
|--------|------:|
| total questions | 240 |
| primaryPattern count | 20 |
| fallback patternId count | 220 |

- `primaryPattern`이 있는 20문항은 모두 COST_* Taxonomy V2 mapping (Sprint-09G).
- 나머지 220문항은 `patternId` fallback으로 effective mapping된다.
- COST 20문항은 `patternId`가 `primaryPattern`과 동기화되어 있어, `patternId` 필드 분포와 effective 분포가 동일하다.

---

## Distribution

effective pattern (`primaryPattern ?? patternId`) 기준:

| patternId | question count |
|-----------|---------------:|
| ACC_GEN_001 | 48 |
| ACC_PPE_001 | 42 |
| ACC_FS_001 | 23 |
| ACC_REV_001 | 22 |
| ACC_INT_001 | 19 |
| ACC_EQ_001 | 16 |
| ACC_INV_006 | 13 |
| ACC_FIN_002 | 12 |
| COST_CVP_001 | 8 |
| ACC_FIN_001 | 7 |
| ACC_LEASE_001 | 4 |
| ACC_PPE_002 | 4 |
| COST_PROCESS_001 | 4 |
| ACC_INV_003 | 3 |
| COST_JOINT_001 | 3 |
| COST_STD_001 | 3 |
| ACC_COST_002 | 2 |
| ACC_INV_004 | 2 |
| ACC_INV_007 | 2 |
| COST_MFG_001 | 2 |
| ACC_INV_001 | 1 |
| **Total** | **240** |

### primaryPattern field only (20)

| primaryPattern | count |
|----------------|------:|
| COST_CVP_001 | 8 |
| COST_PROCESS_001 | 4 |
| COST_JOINT_001 | 3 |
| COST_STD_001 | 3 |
| COST_MFG_001 | 2 |

---

## Notes

- `relatedPatterns`는 effective count에 포함되지 않는다 (validator 규칙과 동일).
- ACC_TAX_001 등 frequency=0 Pattern은 question distribution에 나타나지 않는다.
