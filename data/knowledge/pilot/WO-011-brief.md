# ACC 2018 Pilot — Extraction Validation Brief

WO: `WO-20260722-011`  
Human lock: 2026-07-23  
Full WO: `docs/agent/knowledge-sprints/WO-20260722-011.md`

## Scope one-liner

**Only** 2018 `exam_2` + `answer` → staging raw/candidate → quality validation.  
No year expand · no Pattern · no Product QDB · no D3/D4 · no Parser · no OCR.

## Validation (PASS all)

1. Question numbers preserved  
2. Choices preserved  
3. Numbers/formulas preserved  
4. Answers joinable by question number  
5. Structure supports Human Verify  

## Blockers before Engineer extract

- [ ] Guardian + Gate A  
- [ ] 2018 `answer.hwp` Human Export + VERIFY_EXPORT (HWP D-primary)  
- [ ] exam_2 PDF text-layer path (no OCR)

## Staging targets

```text
data/knowledge/raw/pdf-text/2018/exam_2/
data/knowledge/raw/hwp-export/2018/answer/   → attested/
data/knowledge/candidate/ACC/2018/
data/knowledge/pilot/WO-011-validation-report.md
```
