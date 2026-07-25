# Sprint-10D — Runtime Flow

```
Attempt
  → Mastery          (learning.mastery.v1)
  → Weakness         (learning.weakness.v1)
  → Learning Plan    (learning.plan.v1)
  → Learning Strategy(learning.strategy.v1)
  → Study Session    (learning.session.v1)
  → Question Queue
  → Attempt (next)
```

---

## learning-loop.js

```
recordStrategiesFromPlans(plans)
  ↓
buildStudySession({ strategies, questions })
  ↓
save → learning.session.v1
```

`input.questions`가 있으면 Question Bank로 사용한다 (DB 파일 미수정).

---

## Queue Shape

```json
{
  "queue": [
    {
      "patternId": "ACC_INV_006",
      "questionIds": ["ACC_2018_Q0xx", "…"]
    }
  ]
}
```

Session flat lists:

- `questionIds` — 전체 순서
- `remainingQuestions` / `completedQuestions` — 진행

---

## Guarantees

| Flag | Value |
|------|-------|
| `study_session_connected` | true |
| `recommendation_absent` | true |
| `question_db_untouched` | true |
| `pattern_db_untouched` | true |
