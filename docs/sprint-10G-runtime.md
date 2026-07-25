# Sprint-10G — Runtime Flow

```
Attempt
  → Mastery
  → Weakness
  → Learning Plan
  → Learning Strategy
  → Recommendation Engine   ← NEW (learning.recommendation.v1)
  → Study Session
  → Adaptive Question Queue
  → Attempt
```

`runtime/learning-loop.js`에서:

```
recordStrategiesFromPlans()
  ↓
buildTodayRecommendation()   // before session
  ↓
buildStudySession()
```

---

## Priority (reasonCode)

| Rank | reasonCode |
|-----:|------------|
| 1 | REPEATED_MISS |
| 2 | LOW_ACCURACY |
| 3 | CALCULATION_ERROR |
| 4 | CONCEPT_ERROR |
| 5 | SLOW_RESPONSE |

Sort: `priority ASC` → `estimatedMinutes ASC` → `patternId ASC`

---

## Estimated Minutes

| strategyType | minutes |
|--------------|--------:|
| PATTERN_RETRY_SET | 15 |
| CONCEPT_REVIEW_SET | 20 |
| CALC_DRILL_SET | 25 |
| TIMED_PRACTICE | 30 |

---

## Dashboard Summary

```json
{
  "total": 3,
  "active": 3,
  "estimatedMinutes": 60,
  "highestPriority": { "…": "…" },
  "recommendations": []
}
```
