# Pattern Validation Report (WO-013)

Generated: 2026-07-22T16:47:02Z

## Scope

| Layer | Question source | Pattern source |
|-------|-----------------|----------------|
| Phase1 | `data/question-db.json` | `data/pattern-db.json` |
| MVP | `data/question-db-mvp.json` | `data/pattern-db-mvp.json` |
| Master output | — | `data/pattern-master-db.json` |

Golden pilot candidates are listed under Remaining, not counted in mapped totals.

## Summary

| Metric | Value |
|--------|------:|
| total questions (Phase1+MVP) | 272 |
| mapped questions | 272 |
| unmapped questions | 0 |
| Phase1 missing pattern_id | 0 |
| MVP missing pattern_id | 0 |
| orphan pattern refs (Phase1) | 0 |
| orphan pattern refs (MVP) | 0 |
| duplicate mapping (relatedQuestions multi-hit Phase1) | 0 |
| duplicate mapping (relatedQuestions multi-hit MVP) | 0 |
| Master patterns | 18 |
| Master verified | 6 |

## Unmapped questions

(none)

## Orphan pattern_id references

- Phase1: `[]`
- MVP: `[]`

## Duplicate mapping

One question → multiple patterns (via `relatedQuestions` reverse index):

- Phase1: `{}`
- MVP: `{}`

Question DB itself is 1:1 (`patternId` single field) for all audited rows.

## Cross-DB ACC_INV conflicts

Conflict count: **5** (see `docs/pattern-migration-log.md`).

Master resolution: Phase1 grade/frequency/`question_ids` authoritative for shared `ACC_INV_*`.

## Correction history

| Timestamp (UTC) | Action | Result |
|-----------------|--------|--------|
| 2026-07-22T16:47:02Z | Read-only audit of Phase1+MVP mapping | No SoT mutation |
| 2026-07-22T16:47:02Z | Recalculate frequency into Pattern Master | Applied in `pattern-master-db.json` only |
| 2026-07-22T16:47:02Z | Resolve INV grade/freq conflict | Phase1 wins; MVP retained as `cross_db` |
| — | Create/rename pattern_id | **None** (Rule 2) |
| — | Map Golden pilot pattern_id | **Deferred** |

## Golden pilot (deferred)

| Metric | Value |
|--------|------:|
| candidates | 40 |
| answers joined | 40 |
| pattern mapped | 0 |

## Validation Gate linkage

Validation #5 checklist is recorded inside `data/pattern-master-db.json` → `validation5` / `validation5_result`.
