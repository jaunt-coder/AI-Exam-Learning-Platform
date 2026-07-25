# Sprint-09J — Attempt → Pattern → Mastery Contract

**Sprint:** Pattern Mastery Contract  
**Date:** 2026-07-26  
**Related:** `data/attempt-event-schema.json` (WO-014.1) · `docs/sprint-09J-mastery-schema.md`

---

## 1. Goal

Attempt Event를 Pattern에 연결하고, 향후 Mastery State 갱신 입력으로 쓴다.  
본 문서는 **통합 계약**만 정의한다. Mastery 실행·AI Recommendation은 포함하지 않는다.

---

## 2. Attempt Event (contract view)

최소 필드 (Learning Loop / runtime 기록용 뷰):

```json
{
  "questionId": "ACC_2018_Q042",
  "patternId": "ACC_INV_001",
  "result": "correct",
  "timestamp": "2026-07-26T00:00:00.000Z"
}
```

| Field | Type | Rule |
|-------|------|------|
| `questionId` | string | 기존 Question ID만 · Question DB 미변경 |
| `patternId` | string | Attempt 시점 Pattern · `effectiveQuestionPatternId` (= `primaryPattern ?? patternId`) 권장 |
| `result` | string | `correct` \| `wrong` (엔진 grade와 동일 계열) |
| `timestamp` | string | ISO-8601 UTC |

전체 저장 스키마는 WO-014.1 `AttemptEvent` (`data/attempt-event-schema.json`)를 따른다.  
09J 뷰는 그 중 Pattern Mastery 연결에 필요한 축만 요약한다.

---

## 3. Flow

```
Attempt Event
    ↓
resolve Pattern (effectiveQuestionPatternId)
    ↓
patternMastery lookup / create slot (future execution)
    ↓
Mastery Update (future execution — NOT in 09J)
```

### Pattern resolve

1. Question의 `primaryPattern` 우선  
2. 없으면 `patternId`  
3. `relatedPatterns`는 Mastery 집계 대상 아님 (frequency validator와 동일)

### Evidence Gate (read-only constraint)

| Pattern evidence | Mastery implication (09J) |
|------------------|---------------------------|
| COST_* APPROVED | Mastery slot 연결 가능 (실행은 후속) |
| ACC_* REVIEW_REQUIRED | Mastery slot은 허용하되 Evidence 미승인을 신호로 보존 |

Evidence 미승인이 Attempt 기록을 막지 않는다.  
Evidence Quality Gate(09I)와 Mastery Contract는 독립 축이다.

---

## 4. Mastery Update (future — not implemented)

후속 Execution Sprint에서만:

| Attempt `result` | Counter delta |
|------------------|---------------|
| `correct` | `attempts++`, `correctCount++` |
| `wrong` | `attempts++`, `incorrectCount++` |

그 다음:

- `accuracy = correctCount / attempts`
- `lastAttemptAt = timestamp`
- `masteryLevel` 재평가 (policy gate 이후)

09J에서는 위 단계를 **문서화만** 하고 runtime 적용하지 않는다.

---

## 5. Non-goals

- AI Recommendation 생성
- weaknessSignals 자동 추론
- Question / Pattern / Evidence DB 변경
- Mastery 레벨 자동 승격
