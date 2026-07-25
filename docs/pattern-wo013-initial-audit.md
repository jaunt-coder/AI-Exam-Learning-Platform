# WO-013 INITIAL AUDIT REPORT

Generated: 2026-07-22T16:47:02Z  
Scope: existing Product/Phase1/MVP Pattern assets (read-only). Golden pilot pattern mapping is OUT until VERIFY_QUESTION.

## Question DB

### `data/question-db.json` (Phase1 Inventory MVP)

| Metric | Value |
|--------|------:|
| total questions | 32 |
| validated answers | 32 |
| missing pattern_id | 0 |

### `data/question-db-mvp.json` (Broad MVP)

| Metric | Value |
|--------|------:|
| total questions | 240 |
| validated answers | 240 |
| missing pattern_id | 0 |

### Golden pilot (`data/knowledge/pilot/2018/candidate`) — informational

| Metric | Value |
|--------|------:|
| total candidates | 40 |
| with answer (WO-012) | 40 |
| missing pattern_id | 40 |
| verified | 0 |

> Pattern mapping for Golden pilot is **deferred** (KS-ACC-LOSSLESS-GOLDEN: Pattern AFTER Question DB).

## Pattern DB

### `data/pattern-db.json`

| Metric | Value |
|--------|------:|
| existing patterns | 6 |
| duplicate pattern_id | 0 (none) |
| unused pattern | 0 (none) |

### `data/pattern-db-mvp.json`

| Metric | Value |
|--------|------:|
| existing patterns | 17 |
| duplicate pattern_id | 0 (none) |
| unused pattern | 0 (none) |

## Statistics

| Item | Status |
|------|--------|
| `data/statistics.json` vs Phase1 pattern frequency | CONSISTENT |
| `data/master-db.json` summary | totalPatterns=6 · totalQuestions=32 |
| Phase1 ↔ MVP ACC_INV_* grade/frequency | CONFLICT × 5 |

## Consistency status

- Phase1 Question↔Pattern↔Statistics: **OK** (32/32 mapped, frequency match).
- MVP Question↔Pattern: **OK internally** (240/240 mapped, frequency match).
- Phase1 vs MVP shared `ACC_INV_*`: **CONFLICT** (grade/frequency diverge; Phase1 wins in Pattern Master).
- Answer manifest (2018 attested): present · VERIFY_EXPORT=attested · **not modified**.
- Naming convention in repo: `ACC_<CHAPTER>_<NNN>` (not `INV-001`). Project convention retained.

## Decision for WO-013 Master build

1. Phase1 INV patterns → `validation_status: verified`
2. MVP-only patterns → frequency recalculated; coarse buckets flagged
3. No new pattern_id invented (`ACC_INV_002`, `ACC_COST_001` Persist 보류)
4. SoT files (`question-db*.json`, `pattern-db*.json`, answers, source) **unchanged**
