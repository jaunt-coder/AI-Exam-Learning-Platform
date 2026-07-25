# Raw Ingress Schema — Human Export (HWP D-Primary)

WO: `WO-20260722-010`  
Full design: `docs/agent/knowledge-sprints/KS-ACC-LOSSLESS-GOLDEN-stage-2d-human-export-ingress.md`  
Status: **DESIGN ONLY** — no export files required yet

## Staging roots

| Dir | Purpose |
|-----|---------|
| `data/knowledge/raw/hwp-export/` | Unverified Human exports |
| `data/knowledge/raw/attested/` | VERIFY_EXPORT passed |
| `data/knowledge/raw/rejected/` | Failed verification |
| `data/knowledge/raw/hwp-probe/` | A-probe only (non-Golden) |

## Required sidecar

`{role}.export.json` next to export payloads — must include:

- `source.path` · `source.sha256` (WO-009 match)
- `export.files[].path` · `sha256`
- `verification.status`: `pending` | `attested` | `rejected`

## Human reply

- [x] `DESIGN ACCEPT WO-20260722-010` (2026-07-23) → WO-011 Pilot unlocked
- `DESIGN_REJECT WO-010 <reason>` → revise schema
