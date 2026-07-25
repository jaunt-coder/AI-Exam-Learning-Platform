# Sprint-09L — Weakness Detection Schema

**Sprint:** Weakness Detection Layer  
**Date:** 2026-07-26  
**Storage:** `learning.weakness.v1`  
**Runtime:** `js/weakness-service.js`

---

## 1. Purpose

Pattern Mastery State를 **설명 가능한(deterministic) weakness signals**로 변환한다.  
AI / LLM 추론·Recommendation 생성은 하지 않는다.

```
Attempt History
  → Pattern Mastery
  → Weakness Diagnosis
  → Future Recommendation Input (read-only later)
```

---

## 2. Object: Pattern Weakness

```json
{
  "patternId": "ACC_INV_001",
  "studentId": "m1_demo_student",
  "signals": [
    {
      "type": "LOW_ACCURACY",
      "count": 1,
      "severity": "high"
    }
  ],
  "updatedAt": "2026-07-26T00:00:00.000Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `patternId` | string | Pattern ID |
| `studentId` | string | Learner ID |
| `signals` | array | Weakness signal objects |
| `updatedAt` | string\|null | ISO-8601 UTC |

### Signal object

| Field | Type | Description |
|-------|------|-------------|
| `type` | enum | 아래 Signal Types |
| `count` | number ≥ 0 | 신호 강도/누적 횟수 |
| `severity` | enum | `low` \| `medium` \| `high` |

---

## 3. Signal Types

| type | Meaning (deterministic) |
|------|-------------------------|
| `LOW_ACCURACY` | Pattern accuracy가 임계값 미만 |
| `CALCULATION_ERROR` | 오답 + Pattern domain = cost (`COST_*`) |
| `CONCEPT_ERROR` | 오답 + Pattern domain ≠ cost |
| `REPEATED_MISS` | 누적 오답 횟수가 임계값 이상 |
| `SLOW_RESPONSE` | Attempt `durationMs`가 임계값 이상 (제공 시에만) |

---

## 4. Storage Document

Key: `learning.weakness.v1`

```json
{
  "version": "v1",
  "updatedAt": "ISO-8601",
  "patterns": []
}
```

---

## 5. Out of Scope

- AI Recommendation
- LLM 오인 원인 추정
- Question / Pattern / Evidence DB 변경
- Evidence Pad 자동 라벨링
