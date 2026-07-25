# Sprint-09J — Pattern Mastery Schema

**Sprint:** Pattern Mastery Contract  
**Date:** 2026-07-26  
**Scope:** State contract only — no mastery execution, no AI recommendation

---

## 1. Purpose

Student Attempt → Pattern → Mastery State → (future) Learning Recommendation 연결을 위한 **상태 계약**을 정의한다.

본 Sprint는 스키마·문서·validator projection만 제공한다.  
Mastery 계산 엔진·Recommendation Engine은 구현하지 않는다.

---

## 2. Object: `patternMastery`

```json
{
  "patternId": "ACC_INV_001",
  "studentId": "m1_demo_student",
  "attempts": 0,
  "correctCount": 0,
  "incorrectCount": 0,
  "accuracy": null,
  "masteryLevel": "UNKNOWN",
  "lastAttemptAt": null,
  "weaknessSignals": []
}
```

| Field | Type | Description |
|-------|------|-------------|
| `patternId` | string | Taxonomy Pattern ID (`primaryPattern ?? patternId` effective 기준) |
| `studentId` | string | Learner ID |
| `attempts` | number ≥ 0 | 해당 Pattern 시도 횟수 |
| `correctCount` | number ≥ 0 | 정답 횟수 |
| `incorrectCount` | number ≥ 0 | 오답 횟수 |
| `accuracy` | number\|null | `correctCount / attempts` · attempts=0이면 null |
| `masteryLevel` | enum | 아래 표 |
| `lastAttemptAt` | string\|null | ISO-8601 UTC |
| `weaknessSignals` | string[] | 관측 신호 키 (추론·AI 라벨 금지 · 빈 배열 허용) |

---

## 3. `masteryLevel`

| Level | Meaning |
|-------|---------|
| `UNKNOWN` | 시도 없음 또는 평가 미실행 (초기값) |
| `LEARNING` | 초기 학습 중 |
| `DEVELOPING` | 반복 중 · 안정화 전 |
| `MASTERED` | 숙달 (실행 Sprint에서만 부여) |
| `RETRY_REQUIRED` | 재시도 필요 신호 |

Sprint-09J 초기/안전 값: **`UNKNOWN` only**  
비-UNKNOWN 쓰기는 향후 Mastery Execution Sprint + Human/Architecture gate 이후.

---

## 4. Storage Document

파일: `data/mastery-state-schema.json`

```json
{
  "version": "v1",
  "patterns": []
}
```

- `patterns[]` 항목은 `patternMastery` 객체
- 빈 배열이 정상 초기 상태 (pre-seed 금지)

---

## 5. Relations

| Upstream | Link |
|----------|------|
| Attempt Event | `docs/sprint-09J-attempt-pattern-contract.md` |
| Evidence Gate | COST_* APPROVED · ACC_* REVIEW_REQUIRED (09I) |
| Policy (existing) | `data/mastery-policy-schema.json` · `docs/mastery-calculation-policy.md` |

`patternMastery`는 WO-014 계열 Learning State와 **병행 계약**이다.  
충돌 시: Question/Answer/Pattern SoT 불변 · Evidence Review 보존 · 본 계약은 additive.

---

## 6. Out of Scope (09J)

- Mastery 자동 계산 / 레벨 승격
- AI Recommendation
- question-db / pattern taxonomy 변경
- Evidence 자동 승인
