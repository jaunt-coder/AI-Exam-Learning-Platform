# M2 Study Experience Layer — Completion Report

Version: **v1.1**  
Status: **IMPLEMENTED**  
Date: 2026-07-23  
Depends: M1 Learning Loop COMPLETE

---

## Objective

Developer Verification UI → **Learner Study Interface**  
Presentation only. Learning data / SoT unchanged.

---

## Work Packages

| WP | Deliverable | Status |
|----|-------------|--------|
| WP-01 Stem Renderer | `js/stem-renderer.js` | DONE |
| WP-02 Pattern Card | verified master + metadata only | DONE |
| WP-03 Solving Algorithm | documented/evidenced only | DONE |
| WP-04 Submit Result Panel | after submit · no AI explanation | DONE |
| WP-05 Learner Dashboard | 오늘 학습 지표 · Mastery unknown | DONE |
| WP-06 Navigation | Prev / Next · `n / 40` | DONE |
| WP-07 UI | `css/learning-loop.css` · study layout | DONE |
| WP-08 Validation | SoT untouched · M1 runtime kept | DONE |

---

## Generated / Updated files

### Code

- `learning-loop.html` — study layout
- `js/learning-loop-page.js` — M2 page controller
- `js/stem-renderer.js` — OCR line-break merge (stem only)
- `js/study-data-loader.js` — read-only bundle loader
- `css/learning-loop.css` — study typography/spacing
- `index.html` — entry label “학습하기 (M2)”

### Docs

- `docs/m2-study-experience-report.md` (this file)
- `docs/m2-ui-change-log.md`

### Unchanged (by design)

- `runtime/grader.js` · `attempt-service.js` · `state-update.js` · `learning-loop.js`
- Question / Answer / Pattern Master / Metadata / Error Taxonomy files

---

## Stem rendering rule (WP-01)

- Merge consecutive OCR-broken lines with spaces
- Keep blank-line paragraph breaks
- Keep `○` scenario bullets on their own lines
- Do **not** rewrite wording, numbers, formulas, or options

---

## Pattern / Algorithm display rules

| Condition | UI |
|-----------|-----|
| `mapping_status=mapped` + Master `verified` | Pattern card shown |
| `concept.status` ∈ {documented, evidenced} | Concept text shown |
| else concept pending | Concept hidden (no generation) |
| `solving_algorithm.status` ∈ {documented, evidenced} + steps | Algorithm steps shown |
| else | “검증된 풀이 알고리즘이 아직 준비되지 않았습니다.” |

Note: Metadata DB uses `evidenced` for verified algorithms; treated as displayable alongside `documented`.

---

## Study set

- Golden pilot `ACC_2018_Q041`–`Q080` (40) for navigation
- First open prefers first **mapped** question (`ACC_2018_Q042`)
- Unmapped questions: readable + choices; Pattern/Algorithm pending message; **no Attempt write** (verified pattern_id required for M1 ingest)

---

## Completion criteria

| # | Criterion | Result |
|---|-----------|--------|
| 1 | Learner can read stems comfortably | PASS (renderer) |
| 2 | Pattern knowledge visible when verified | PASS |
| 3 | Algorithm only when available | PASS |
| 4 | Feedback after submit | PASS |
| 5 | No SoT modified | PASS |
| 6 | M1 loop still works on mapped items | PASS |

---

## How to launch

```bash
python -m http.server 8080
```

Open: `http://localhost:8080/learning-loop.html`

See also: `docs/learning-loop-m1-launch-guide.md` (server rules still apply).
