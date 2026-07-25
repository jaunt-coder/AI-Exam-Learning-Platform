# Golden Pattern Validation Report (WO-013.1)

Generated: 2026-07-22T16:52:41Z

## Objective

Integrate Golden Pilot ACC 2018 Q41–Q80 into Pattern Knowledge Base using **existing verified patterns only**, with evidence. No speculative pattern creation.

## Completion Gate

**Result: PASS**

| Criterion | Status |
|-----------|--------|
| all 40 questions reviewed | PASS |
| answer unchanged | PASS |
| mapping evidence recorded | PASS |
| no speculative pattern created | PASS |

## Summary

| Metric | Value |
|--------|------:|
| total questions | 40 |
| mapped (verified + evidence) | 2 |
| pending_review | 38 |

Mapped pattern IDs: `ACC_INV_001`, `ACC_INV_006`

### Pending candidate distribution (from existing Product/Master only)

| candidate_pattern_id | count |
|----------------------|------:|
| `ACC_GEN_001` | 10 |
| `ACC_PPE_001` | 8 |
| `ACC_FS_001` | 4 |
| `ACC_INT_001` | 4 |
| `ACC_REV_001` | 4 |
| `ACC_EQ_001` | 3 |
| `ACC_FIN_002` | 2 |
| `ACC_INV_006` | 2 |
| `ACC_COST_002` | 1 |

## Mapping Policy

1. Candidate source = existing `question-db-mvp.json` patternId ∩ Pattern Master.
2. **Auto-map** only if Pattern Master `validation_status=verified` **and** content/Phase1 crosswalk evidence is recorded in WO-013.1 gate list.
3. Otherwise `pending_review` — candidate retained, **no new pattern_id**.
4. `ACC_COST_001` not registered (ADR-001 Persist=0) — never created here.

## Mapped Questions

| question_id | pattern_id | answer | evidence (short) |
|-------------|------------|-------:|------------------|
| `ACC_2018_Q042` | `ACC_INV_001` | 3 | Pattern Master validation_status=verified for ACC_INV_001 (기말재고 포함 여부 판단). |
| `ACC_2018_Q068` | `ACC_INV_006` | 1 | Pattern Master validation_status=verified for ACC_INV_006 (FIFO·총평균법 매출원가). |

## Pending Review (excerpt rules applied)

All non-mapped rows are `pending_review`. Notable holds:

| question_id | MVP candidate | reason |
|-------------|---------------|--------|
| `ACC_2018_Q066` | `ACC_INV_006` | MVP patternId=ACC_INV_006 but stem is 선입선출 vs 후입선출 (LIFO). Verified ACC_INV_006 definition is FIFO·총평균 — content fit insufficient for auto-map. |
| `ACC_2018_Q072` | `ACC_GEN_001` | pattern-gap-analysis.md lists emit ACC_COST_001 for this/near cluster; ACC_COST_001 Persist=0 (ADR-001) — no new pattern created. |
| `ACC_2018_Q073` | `ACC_GEN_001` | pattern-gap-analysis.md lists emit ACC_COST_001 for this/near cluster; ACC_COST_001 Persist=0 (ADR-001) — no new pattern created. |
| `ACC_2018_Q076` | `ACC_REV_001` | Pilot answer (1) differs from MVP answer (2). Pilot Human SoT retained; answers not modified. |
| `ACC_2018_Q077` | `ACC_COST_002` | pattern-gap-analysis.md lists emit ACC_COST_001 for this/near cluster; ACC_COST_001 Persist=0 (ADR-001) — no new pattern created. |
| `ACC_2018_Q078` | `ACC_GEN_001` | pattern-gap-analysis.md lists emit ACC_COST_001 for this/near cluster; ACC_COST_001 Persist=0 (ADR-001) — no new pattern created. |
| `ACC_2018_Q079` | `ACC_INV_006` | MVP patternId=ACC_INV_006 but stem is 종합원가계산 / 완성품환산량 (process costing). Not merchandise FIFO·총평균 — content fit insufficient for auto-map. |
| `ACC_2018_Q080` | `ACC_REV_001` | Pilot answer (1) differs from MVP answer (3). Pilot Human SoT retained; answers not modified. |

> Full per-question evidence is in `data/golden-pattern-mapping.json`.

## Answer Integrity

| Check | Result |
|-------|--------|
| pilot answers unchanged | True |
| question IDs unchanged | True |
| pilot file hashes unchanged | True |

Pilot vs MVP answer mismatches (informational; pilot SoT kept):

`ACC_2018_Q076`, `ACC_2018_Q080`

## Files Touched

| Path | Action |
|------|--------|
| `data/golden-pattern-mapping.json` | **created** |
| `docs/golden-pattern-validation-report.md` | **created** |
| pilot candidate JSON | **not modified** |
| answer / pattern-db SoT | **not modified** |

## Remaining Work

1. Human review of `pending_review` rows (especially coarse buckets `ACC_GEN_001`, `ACC_PPE_001`).
2. Resolve MVP-vs-content conflicts for `ACC_2018_Q066`, `ACC_2018_Q079`.
3. ADR-001 `ACC_COST_001` Persist WO (separate) before cost-accounting fine mapping.
4. After Human approve, optionally append mapped golden IDs into Pattern Master `question_ids` (D4).
