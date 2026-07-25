# Pattern Migration Log (WO-013)

Generated: 2026-07-22T16:47:02Z

## Purpose

Record Pattern ID system issues and resolutions **without mutating** existing Pattern/Question SoT files.

## Naming Convention

| Item | Value |
|------|-------|
| Project convention | `SUBJECT_CHAPTER_NUMBER` e.g. `ACC_INV_001` |
| Prompt example form | `INV-001` |
| Resolution | **Keep `ACC_*`**. Do not rename to `INV-*` (would break question references). |

## Uniqueness

- `pattern-db.json` duplicates: `[]`
- `pattern-db-mvp.json` duplicates: `[]`
- `pattern-master-db.json` unique: enforced at build

## Category Mapping

Pattern ID chapter segment maps to `category` / `chapterId`:

- `ACC_INV_*` → `ACC_INV`
- `ACC_PPE_*` → `ACC_PPE`
- `ACC_GEN_*` → `ACC_GEN`
- (etc.)

## Shared ID Conflicts (Phase1 vs MVP)

| pattern_id | Phase1 grade/freq | MVP grade/freq | Resolution |
|------------|-------------------|----------------|------------|
| `ACC_INV_001` | S/5 | B/1 | Phase1 (question-db.json + docs/pattern-db.md) wins for grade/frequency/question_ids |
| `ACC_INV_003` | A/2 | A/3 | Phase1 (question-db.json + docs/pattern-db.md) wins for grade/frequency/question_ids |
| `ACC_INV_004` | S/14 | A/2 | Phase1 (question-db.json + docs/pattern-db.md) wins for grade/frequency/question_ids |
| `ACC_INV_006` | S/6 | S/19 | Phase1 (question-db.json + docs/pattern-db.md) wins for grade/frequency/question_ids |
| `ACC_INV_007` | S/4 | A/3 | Phase1 (question-db.json + docs/pattern-db.md) wins for grade/frequency/question_ids |

### Shared IDs without grade/freq conflict

(none — all shared IDs conflicted on grade/freq)

## Documented Gaps (NOT created)

| pattern_id | status | note |
|------------|--------|------|
| `ACC_INV_002` | documented_gap | docs/05·docs/27 예시 ID이나 Phase1/MVP Pattern DB에 미등록. 신규 생성 금지(WO-013 Rule 2). |
| `ACC_COST_001` | adr_pending_persist | ADR-001 Option A 승인·Persist=0. D4 등록은 별도 실행 WO 필요. WO-013에서 임의 등록 금지. |
| `ACC_INV_005` | mvp_missing | Phase1에는 존재(B/1). pattern-db-mvp.json에는 부재. |

## ID Sequence Notes

- Phase1 inventory patterns skip `ACC_INV_002` (001, 003–007). This is historical, not auto-filled.
- MVP lacks `ACC_INV_005` while Phase1 has it — Master keeps Phase1 entry; MVP gap recorded only.

## Actions Taken

1. Created `data/pattern-master-db.json` (new file).
2. Did **not** rename/delete/alter existing `pattern_id` values.
3. Did **not** register `ACC_COST_001` (ADR-001 Persist=0).
4. Did **not** create `ACC_INV_002`.
