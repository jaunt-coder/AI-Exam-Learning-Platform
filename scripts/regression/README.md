# Regression & Gate Harness (RC2-E8)

Read-only tools for baseline drift detection and Promotion dry-run evidence reproduction.

**Work Order:** WO-20260721-001  
**Spec:** `docs/36` RC2-E8 · `docs/release/RC1-BASELINE.md` · CI checklist: `docs/release/RC2-E8-CI-ASSIST-CHECKLIST.md`

## Rules

- Do **not** pass `--apply` or `--write-candidate`
- Do **not** modify `data/question-db-mvp.json` / `data/pattern-db-mvp.json`
- Do **not** import or patch `scripts/parser/`
- Do **not** run Path L (`scripts/exam_pipeline/`, `repair-pipeline.py`)
- Evidence may record `PROMOTION_READY: NO` — that is expected; harness does not “fix” G6

## Scripts

| Script | Purpose |
|--------|---------|
| `build-baseline-manifest.py` | Verify / lock RC1 SHA-256 manifest |
| `reproduce-promotion-evidence.py` | Re-run Promotion Gate dry-run; write evidence under `data/regression/gate-evidence/` |
| `run-regression-gates.py` | Unified runner (baseline + dry-run + optional Coach C1–C3 smoke) |
| `lib_hash.py` | Shared SHA-256 / directory Merkle (RC1 algorithm) |

## Commands

```bash
py -3 scripts/regression/build-baseline-manifest.py --verify
py -3 scripts/regression/build-baseline-manifest.py --write
py -3 scripts/regression/reproduce-promotion-evidence.py
py -3 scripts/regression/run-regression-gates.py
py -3 scripts/regression/run-regression-gates.py --skip-coach
py -3 tests/regression/test_baseline_manifest.py
```
