# Sprint-09N — Learning Strategy Schema

**Sprint:** Learning Strategy Resolver Foundation  
**Date:** 2026-07-26  
**Schema file:** `data/learning-strategy-schema.json`  
**Storage:** `learning.strategy.v1`

---

## 1. Purpose

Learning Plan(“무엇을”)을 Learning Strategy(“어떤 방식으로”) 실행 계약으로 변환한다.

- No AI / LLM
- No automatic question selection
- Deterministic Plan → Strategy mapping only

---

## 2. Schema

```json
{
  "schemaVersion": "v1",
  "enabled": true,
  "connected": true,
  "description": "Learning Plan to Strategy resolver contract"
}
```

### Strategy object

| Field | Type |
|-------|------|
| `strategyId` | string |
| `patternId` | string |
| `sourcePlanId` | string\|null |
| `strategyType` | string |
| `nextAction` | string |
| `questionCount` | number |
| `reviewAfterDays` | number |
| `createdAt` | string |

### LocalStorage document

```json
{
  "schemaVersion": "v1",
  "strategies": []
}
```

---

## 3. Allowed strategyType

- `PATTERN_RETRY_SET`
- `CONCEPT_REVIEW_SET`
- `CALC_DRILL_SET`
- `TIMED_PRACTICE`

---

## 4. Non-goals

- Question DB / Pattern DB mutation
- AI recommendation text
- Problem auto-picker algorithm
- Changing mastery / weakness / plan mapping rules
