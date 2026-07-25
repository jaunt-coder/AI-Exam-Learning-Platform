# Promotion Dry-Run Evidence

Generated: 20260721T054534Z
Work Order: WO-20260721-001 (RC2-E8)

## Command

```
py -3 scripts/promote-parser-emit.py
```

- `--apply`: **not invoked**
- `--write-candidate`: **not invoked**

## Observed Markers

- GATE HARD CHECKS: `FAIL`
- PROMOTION_READY (observed only): `NO`
- process returncode: `0`

## Stdout

```
=== Promotion Gate (docs/34) ===
emit: data\regression\parser-emit\question-db-parser.json
mvp:  data\question-db-mvp.json
candidate count: 240
S1 field diffs vs current MVP: {'question': 240, 'choices': 223, 'table': 117, 'hasTable': 104, 'patternId': 74, 'answer': 0, 'originalQuestion': 240}
NOTE: high question/choices/table diffs �� Display Acceptance �̴�. T4/T5 ����.
GATE HARD CHECKS: FAIL
 - G6 ACC_2015_Q073: pattern �̿��� (ACC_COST_001)
 - G6 ACC_2017_Q072: pattern �̿��� (ACC_COST_001)
 - G6 ACC_2017_Q074: pattern �̿��� (ACC_COST_001)
 - G6 ACC_2017_Q079: pattern �̿��� (ACC_COST_001)
 - G6 ACC_2018_Q072: pattern �̿��� (ACC_COST_001)
 - G6 ACC_2018_Q073: pattern �̿��� (ACC_COST_001)
 - G6 ACC_2018_Q077: pattern �̿��� (ACC_COST_001)
 - G6 ACC_2018_Q078: pattern �̿��� (ACC_COST_001)
 - G6 ACC_2020_Q071: pattern �̿��� (ACC_COST_001)
 - G6 ACC_2020_Q075: pattern �̿��� (ACC_COST_001)
 - G6 ACC_2024_Q074: pattern �̿��� (ACC_COST_001)
 - G6 ACC_2025_Q075: pattern �̿��� (ACC_COST_001)
 - G6 ACC_2025_Q076: pattern �̿��� (ACC_COST_001)
 - G6 ACC_2025_Q078: pattern �̿��� (ACC_COST_001)
 - G6 ACC_2025_Q080: pattern �̿��� (ACC_COST_001)
DISPLAY ACCEPTANCE: NOT READY (stem/choices still diverge from current MVP)
PROMOTION_READY: NO
MODE: dry-run (no product change). Use --write-candidate or --apply when ready.
```
