# Sprint-09N — Plan → Strategy Mapping

**Service:** `js/learning-strategy-service.js`  
**Function:** `resolveStrategyFromPlan(plan)`

---

## Mapping Table

| Weakness (upstream) | Plan `actionType` | Strategy `strategyType` | `nextAction` | `questionCount` | `reviewAfterDays` |
|---------------------|-------------------|-------------------------|--------------|----------------:|------------------:|
| LOW_ACCURACY | RETRY_PATTERN | PATTERN_RETRY_SET | SOLVE_PATTERN_SET | 5 | 3 |
| REPEATED_MISS / CONCEPT_ERROR | REVIEW_CONCEPT | CONCEPT_REVIEW_SET | REVIEW_CONCEPT_CARD | 3 | 2 |
| CALCULATION_ERROR | PRACTICE_CALCULATION | CALC_DRILL_SET | SOLVE_CALCULATION_DRILL | 5 | 3 |
| SLOW_RESPONSE | MOCK_TEST | TIMED_PRACTICE | MINI_TEST | 10 | 7 |

`MEMORIZE_RULE`는 09N mapping 대상 아님 → strategy 미생성 (`null`).

---

## Runtime Flow

```
Attempt
  → Mastery
  → Weakness
  → Learning Plan (learning.plan.v1)
  → resolveStrategyFromPlan / recordStrategy (learning.strategy.v1)
```

Plans가 없으면 Strategy도 skip (unnecessary generation 없음).
