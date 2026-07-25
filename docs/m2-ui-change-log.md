# M2 UI Change Log

Version: **v1.1**  
Scope: Presentation Layer only

---

## Summary

M1 developer verification screen was redesigned into a learner study interface.  
Runtime Learning Loop modules were **not** redesigned; only HTML/CSS/page JS and new presentational helpers were added.

---

## Changes by area

### Question area (WP-01, WP-07)

| Before | After |
|--------|-------|
| Raw OCR stem with per-token newlines | Stem merged for readability via `stem-renderer.js` |
| Options rebuilt concern (incorrect prior note) | Options **unchanged** — displayed as SoT choices with ①–⑤ labels |
| Single demo question | Navigate Q41–Q80 (`n / 40`) |

### Knowledge cards (WP-02, WP-03)

| Before | After |
|--------|-------|
| No Pattern teaching surface | Pattern card from Master + Metadata (verified only) |
| No algorithm surface | Step 1 ↓ Step 2 ↓ … when status documented/evidenced |

### Feedback (WP-04)

| Before | After |
|--------|-------|
| One-line Correct/Wrong text | Result panel: 정답 · 학생 선택 · 결과 · Pattern · Verified Concept |
| — | Hidden until submit · no AI explanation |

### Dashboard (WP-05)

| Before | After |
|--------|-------|
| Developer counters (Attempts/…) | 오늘 학습 문제 수 · 정답 · 오답 · 정답률 · 현재 Pattern |
| Mastery / Recommendation labels | Kept **unknown** / **absent** |

### Navigation (WP-06)

| Added |
|-------|
| 이전 문제 · 다음 문제 · `current / total` progress |

### Layout (WP-07)

| Added |
|-------|
| Two-column study layout (≥1024px) |
| Stem card, Pattern card, Algorithm card spacing/typography |

---

## Files touched

| File | Change type |
|------|-------------|
| `learning-loop.html` | Rewritten structure |
| `js/learning-loop-page.js` | Rewritten for M2 |
| `js/stem-renderer.js` | **New** |
| `js/study-data-loader.js` | **New** |
| `css/learning-loop.css` | Extended |
| `index.html` | CTA label |
| `docs/m2-*.md` | **New** |

---

## Explicit non-changes

- No edits to Question SoT / Answer SoT / Pattern Master / Metadata / Error Taxonomy JSON content
- No Recommendation Engine / AI Coach / Mastery execution
- No new Pattern IDs
- No generated educational prose

---

## Correction log

Prior analysis claimed option rendering was broken.  
**v1.1 correction:** options were already fine; only **stem OCR line breaks** were improved.
