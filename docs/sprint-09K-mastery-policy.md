# Sprint-09K — Deterministic Mastery Policy

**Sprint:** Mastery Runtime Integration  
**Date:** 2026-07-26  
**Runtime:** `js/mastery-service.js` · Storage key `learning.mastery.v1`

---

## 1. Scope

Attempt → effective Pattern → Mastery Update의 **결정론적** 규칙만 정의한다.  
AI Recommendation · Evidence 자동 승인 · Question/Pattern DB 변경 없음.

---

## 2. Runtime Flow

```
Question Attempt
    ↓
effectivePatternId (primaryPattern ?? patternId)  // attempt 시점 patternId
    ↓
recordAttempt({ questionId, patternId, correct, timestamp })
    ↓
updatePatternMastery()
    ↓
patternMastery in learning.mastery.v1
```

---

## 3. Counters

| Field | Update |
|-------|--------|
| `attempts` | +1 per attempt |
| `correctCount` | +1 if `correct === true` |
| `incorrectCount` | +1 if `correct === false` |
| `accuracy` | `correctCount / attempts` (attempts=0 → null) |
| `lastAttemptAt` | attempt timestamp |

---

## 4. masteryLevel Rules

Evaluation order:

1. **UNKNOWN** — `attempts === 0`
2. **LEARNING** — `attempts < 3`
3. **RETRY_REQUIRED** — `accuracy < 0.5` (and attempts ≥ 3)
4. **MASTERED** — `attempts >= 5` AND `accuracy >= 0.8`
5. **DEVELOPING** — otherwise (`accuracy < 0.8`, or `accuracy >= 0.8` with `attempts < 5`)

### Examples

| Scenario | Level |
|----------|-------|
| No attempts | UNKNOWN |
| Attempt 1 (any result) | LEARNING |
| 5 attempts, 4 correct (acc=0.8) | MASTERED |
| 5 attempts, 2 correct (acc=0.4) | RETRY_REQUIRED |
| 4 attempts, 3 correct (acc=0.75) | DEVELOPING |
| 4 attempts, 4 correct (acc=1.0) | DEVELOPING (need 5+) |

---

## 5. Storage Document

Key: `learning.mastery.v1`

```json
{
  "version": "v1",
  "updatedAt": "ISO-8601",
  "patterns": [
    {
      "patternId": "ACC_INV_001",
      "studentId": "m1_demo_student",
      "attempts": 1,
      "correctCount": 1,
      "incorrectCount": 0,
      "accuracy": 1,
      "masteryLevel": "LEARNING",
      "lastAttemptAt": "...",
      "weaknessSignals": []
    }
  ]
}
```

`weaknessSignals`는 09K에서 자동 추론하지 않는다 (빈 배열 유지).

---

## 6. Non-goals

- AI Recommendation
- Evidence GAP 자동 해소
- MASTERED를 Evidence 미승인 Pattern에 특별 차단 (Attempt는 기록; Evidence Gate는 별도 축)
