# RC2-E8 CI-Assist Checklist

Sprint: **RC2-E8 Regression & Gate Hardening**  
Work Order: **WO-20260721-001**  
Mode: **read-only** (no Product / Pattern / Parser writes)

Use this checklist in CI or before Human Gate review. Check each box only after the command succeeds with the expected outcome.

---

## Forbidden (always)

- [ ] Confirmed **no** `--apply` on `scripts/promote-parser-emit.py`
- [ ] Confirmed **no** `--write-candidate` in this harness path
- [ ] Confirmed **no** Path L execution (`scripts/exam_pipeline/`, `repair-pipeline.py`)
- [ ] Confirmed **no** Parser recompilation / Emit rebuild
- [ ] Confirmed **no** edits to `docs/31`–`docs/35`
- [ ] Confirmed **no** ADR-001 / G6 “fix” changes; `PROMOTION_READY` not rewritten

---

## Automated steps

### 1. Baseline SHA-256 verify

```bash
py -3 scripts/regression/build-baseline-manifest.py --verify
```

- [ ] Exit code `0`
- [ ] All RC1 components `PASS` (Parser, Emit, Pattern, Product, Coach; aux Promotion scripts)
- [ ] Locked file present: `data/regression/rc1-baseline-manifest.json`

### 2. Promotion dry-run evidence reproduction

```bash
py -3 scripts/regression/reproduce-promotion-evidence.py
```

- [ ] Exit code `0` (process success; READY may still be `NO`)
- [ ] Evidence written under `data/regression/gate-evidence/`
- [ ] Latest pointer: `data/regression/gate-evidence/promotion-dry-run-latest.json`
- [ ] Observed `PROMOTION_READY` recorded **without** policy change
- [ ] `git diff -- data/question-db-mvp.json data/pattern-db-mvp.json` shows **no harness-induced change**

### 3. Unified harness

```bash
py -3 scripts/regression/run-regression-gates.py
```

Optional (skip Coach smoke):

```bash
py -3 scripts/regression/run-regression-gates.py --skip-coach
```

- [ ] `HARNESS: PASS`
- [ ] Summary lists baseline + promotion steps as `PASS`

### 4. Unit tests

```bash
py -3 tests/regression/test_baseline_manifest.py
```

- [ ] Exit code `0`

---

## Human review notes

| Topic | Expectation |
|-------|-------------|
| G6 / `ACC_COST_001` | May still FAIL in dry-run — **out of scope** for E8 |
| `PROMOTION_READY` | Remains observational; E8 does not flip to YES |
| Coach | C1–C3 smoke only; **C4 not in scope** |
| Drift | Any RC1 SHA mismatch → investigate before other RC2 work |

---

## Rollback

Delete or revert only harness surfaces:

- `scripts/regression/`
- `tests/regression/`
- `data/regression/rc1-baseline-manifest.json`
- `data/regression/gate-evidence/`
- `docs/release/RC2-E8-CI-ASSIST-CHECKLIST.md`

Product / Pattern / Parser require **no** rollback for this sprint.
