# Original Exam Sources

`source/original-exams/` is the **only** data source for Question DB v2.

## Expected Files

| Year | File | Notes |
|------|------|-------|
| 2017~2018, 2020, 2024~2026 | `{year}.pdf` | Text-layer PDF required |
| 2019 | `2019.hwp` | Non-distributable HWP or text PDF recommended |
| 2021~2023 | `{year}.pdf` | **Current files are scan-only (no text layer)** |

## Build Command

```bash
py -3 scripts/build-question-db-v2.py
```

Outputs:

- `data/question-db-v2.json`
- `validation-report.md`

## Answers

Original exam PDFs/HWP do **not** include official answers.

Place optional answer maps at:

```
source/original-exams/answers/{year}.json
```

Example (`2018.json`):

```json
{
  "41": 2,
  "42": 1,
  "43": 4
}
```

Keys are exam question numbers **41~80** (회계학).

## Current Limitations (2026-07-18)

| Issue | Years | Action |
|-------|-------|--------|
| Scan PDF (no text layer) | 2021, 2022, 2023 | Replace with text-layer PDF (OCR not used) |
| Distributable HWP | 2019 | Replace with PDF or non-distributable HWP |
| Legacy StudyPiter | `source/past-exams/` | Deprecated — do not use for DB v2 |
