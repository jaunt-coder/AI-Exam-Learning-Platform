# Sprint-09M — Learning Plan Contract

**Date:** 2026-07-26  
**Schema:** `data/learning-plan-schema.json`  
**Runtime:** `js/learning-plan-service.js` · Storage `learning.plan.v1`

---

## Purpose

Weakness Diagnosis를 **결정론적 Learning Action**으로 연결하는 계약 계층이다.

```
Attempt → Mastery → Weakness Diagnosis → Learning Plan Contract
```

AI / LLM / Recommendation Model 없음.

---

## Schema

```json
{
  "planId": "string",
  "patternId": "string",
  "weaknessSignal": "string",
  "priority": "number",
  "actionType": "string",
  "target": "string",
  "status": "string"
}
```

### actionType

| Value | Meaning |
|-------|---------|
| `REVIEW_CONCEPT` | 개념 재학습 |
| `RETRY_PATTERN` | Pattern 재시도 |
| `PRACTICE_CALCULATION` | 계산 연습 |
| `MEMORIZE_RULE` | 규칙 암기 (예약) |
| `MOCK_TEST` | 모의 적용/시간 연습 |

### status

`GENERATED` · `ACTIVE` · `COMPLETED`

---

## Weakness → Action Mapping

| weaknessSignal | actionType |
|----------------|------------|
| `LOW_ACCURACY` | `RETRY_PATTERN` |
| `REPEATED_MISS` | `REVIEW_CONCEPT` |
| `CALCULATION_ERROR` | `PRACTICE_CALCULATION` |
| `CONCEPT_ERROR` | `REVIEW_CONCEPT` |
| `SLOW_RESPONSE` | `MOCK_TEST` |

- `priority`: severity `high=3` · `medium=2` · `low=1`
- weakness signal이 없으면 **plan 생성 안 함** (`skipped:true`)

---

## Runtime Flow

```
runLearningLoopCycle
  → recordAttempt (learning.mastery.v1)
  → recordWeaknessDiagnosis (learning.weakness.v1)
  → recordLearningPlansFromWeakness (learning.plan.v1)
```

Document shape:

```json
{
  "schemaVersion": "v1",
  "plans": []
}
```

---

## Non-goals

- AI Recommendation 문장 생성
- LLM 호출
- Question / Pattern DB 변경
- Mastery / Weakness 규칙 변경
- Plan UI / 자동 ACTIVE 승격
