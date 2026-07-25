# Sprint-10D — Study Session Runtime

**Branch:** `feature/sprint-10D-study-session-runtime`  
**Storage:** `learning.session.v1`  
**Schema:** `data/study-session-schema.json`  
**Service:** `js/study-session-service.js`

---

## Purpose

Learning Strategy를 **오늘 실행 가능한 Study Session**으로 변환한다.

```
Learning Strategy
  → Study Session Builder
  → Today's Session
  → Question Queue
  → Attempt (기존 Runtime)
```

Recommendation AI / LLM 없음. Question·Pattern·Master DB 읽기 전용.

---

## Session Document

```json
{
  "sessionId": "study_…",
  "createdAt": "ISO-8601",
  "status": "ACTIVE",
  "strategyType": "PATTERN_RETRY_SET",
  "patternIds": ["ACC_GEN_001"],
  "questionIds": ["ACC_2015_Q042", "…"],
  "queue": [
    { "patternId": "ACC_GEN_001", "questionIds": ["…"] }
  ],
  "estimatedMinutes": 15,
  "completedQuestions": [],
  "remainingQuestions": ["…"]
}
```

`learning.session.v1`에 저장하며, 기존 UI 세션 필드(`startedAt`, `patternsLearned` 등)는 merge로 보존한다.

---

## API

| Function | Role |
|----------|------|
| `buildStudySession()` | Strategy → Session 생성·저장 |
| `buildQuestionQueue()` | Pattern별 `{ patternId, questionIds }` |
| `recordSessionProgress()` | 문항 완료 반영 |
| `finishStudySession()` | 세션 종료 |

---

## Selection Rules

| strategyType | Selection |
|--------------|-----------|
| PATTERN_RETRY_SET | 같은 Pattern |
| CONCEPT_REVIEW_SET | 같은 Pattern |
| CALC_DRILL_SET | 계산형 (`hasCalculation`) 우선 |
| TIMED_PRACTICE | deterministic random |

기본 수량: Retry 5 / Concept 3 / Calc 5 / Timed 10.

---

## Contract

```json
{
  "studySessionContract": {
    "enabled": true,
    "schemaVersion": "v1",
    "connected": true
  }
}
```
