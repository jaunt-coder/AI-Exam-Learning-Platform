# Sprint-10F Report — Adaptive Question Selector

**Date:** 2026-07-26  
**Branch:** `feature/sprint-10F-adaptive-selector`  
**Commit:** `Sprint-10F Adaptive Question Selector`

---

## 1. Verdict

**PASS.** Study Session Queue가 Adaptive Selector로 우선순위 선정된다.  
DB / Policy / Mastery·Weakness·Plan·Strategy 서비스는 수정하지 않았다.

---

## 2. Deliverables

| Path | Role |
|------|------|
| `js/question-selector.js` | Score + select |
| `js/study-session-service.js` | `buildQuestionQueue` 연결 |
| `js/data-loader.js` | `selectorContract` |
| `docs/sprint-10F-*.md` | Docs |
| `scripts/test-question-selector.py` | Tests |

---

## 3. Acceptance

| Criterion | Result |
|-----------|--------|
| Question / Pattern / Master unchanged | PASS |
| Evidence / Policy unchanged | PASS |
| 240 / frequency 0 / primaryPattern 20 | PASS |
| Adaptive Queue | PASS |
| No duplicates | PASS |
| Deterministic | PASS |
| selectorContract connected | PASS |
| Wrong first / recent served later | PASS |

---

## 4. Contract

```json
{
  "selectorContract": {
    "enabled": true,
    "schemaVersion": "v1",
    "connected": true
  }
}
```
