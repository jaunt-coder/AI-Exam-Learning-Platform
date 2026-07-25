# ACC 2018 Pilot Lossless Extraction

WO: `WO-20260722-011`  
Output root: `data/knowledge/pilot/2018/`

## Layout

| Path | Contents |
|------|----------|
| `source-metadata.json` | Input SHA lock · scope notes |
| `extraction-result.json` | Summary counts |
| `raw/` | PDF text-layer pages · accounting stream · HWP probe |
| `candidate/` | ACC Q41–Q80 JSON (`verified:false`) |
| `verify/human-verify-checklist.md` | Human VERIFY_EXPORT + VERIFY_QUESTION |

## Hard rules honored

- source unchanged (no rename / no convert into source)
- no OCR
- no Parser Core edit
- no question-db / pattern-db / D3 / D4 persist

## Answer status

`answer.hwp` is image/binary-heavy; probe join = **0/40**.  
Criterion 4 (answer join) is **HOLD** until Human VERIFY_EXPORT (WO-010).

## Re-run

```bash
py -3 data/knowledge/pilot/2018/_run_wo011_pilot_extract.py
```
