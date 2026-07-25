# Sprint-10F — Adaptive Question Selector

**Branch:** `feature/sprint-10F-adaptive-selector`  
**Service:** `js/question-selector.js`  
**Wired into:** `js/study-session-service.js` → `buildQuestionQueue()`

---

## Flow

```
Learning Strategy
  → Adaptive Selector
  → Prioritized Question Queue
  → Study Session
  → Attempt
```

No new LocalStorage key. Reads (read-only):

- `learning.attempts.v1`
- `learning.mastery.v1` (available; score uses attempts + weakness primarily)
- `learning.weakness.v1`

---

## API

| Function | Role |
|----------|------|
| `questionPriorityScore(question, context)` | 점수 계산 |
| `buildQuestionPriority(questions, context)` | 점수 부여 |
| `rankQuestions(questions, context)` | score↓ · questionId↑ |
| `selectQuestionsForPattern(patternId, …)` | Pattern 단위 선정 |
| `selectQuestionsForStrategy(strategy, …)` | Strategy 단위 선정 |

---

## Contract

```json
{
  "selectorContract": {
    "enabled": true,
    "schemaVersion": "v1",
    "connected": true
  }
}
```

---

## Guarantees

- Deterministic (동일 context → 동일 queue)
- 세션 내 중복 없음
- Question / Pattern / Master / Evidence / Policy 미변경
- AI / LLM 없음
