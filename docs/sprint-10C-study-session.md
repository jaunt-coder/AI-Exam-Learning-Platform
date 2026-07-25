# Sprint-10C — Study Session + Next Question Engine

**Storage:** `learning.study-session.v1`  
**Service:** `js/study-session-service.js`  
**Runtime:** Strategy 생성 직후 `createStudySession()` 자동 연결

---

## 1. Purpose

```
Strategy
  → 오늘 공부할 문제 자동 선정
  → 한 문제씩 풀기 (queue)
  → 결과 저장
```

사람이 “오늘 뭐 공부하지?”를 고르지 않아도 되게 한다.  
AI / LLM / 문제 생성 없음. Question DB는 읽기 전용.

---

## 2. API

| Function | Role |
|----------|------|
| `createStudySession({ questions, strategies? })` | Strategy → queue 생성·저장 |
| `loadTodayQueue()` | 오늘 ACTIVE 세션 로드 |
| `completeQuestion({ questionId\|index })` | 한 문항 완료·index 전진 |
| `finishSession()` | 세션 COMPLETED |
| `resolveQuestionsForStrategy(strategy, questions)` | 전략별 문제 선정 |

`strategies` 미지정 시 `learning.strategy.v1`을 읽는다.

---

## 3. Session Shape

```json
{
  "schemaVersion": "v1",
  "sessionId": "study_…",
  "createdAt": "ISO-8601",
  "questions": [
    {
      "questionId": "ACC_…",
      "patternId": "ACC_INV_006",
      "chapterId": "ACC_INV",
      "strategyId": "strat_…",
      "strategyType": "PATTERN_RETRY_SET",
      "source": "wrong|pattern|chapter|random",
      "status": "pending|done"
    }
  ],
  "currentIndex": 0,
  "completed": [],
  "status": "ACTIVE"
}
```

---

## 4. Selection Rule (deterministic)

우선순위 (낮을수록 우선):

1. 틀린 문제 (`wrongAnswers` + incorrect attempts)
2. 같은 Pattern (`primaryPattern ?? patternId`)
3. 같은 Chapter (`chapterId`)
4. 안정 정렬 (`questionId` — 재현 가능한 tie-break)

- 세션 내 **동일 문제 반복 금지**
- 전략별 목표 수량:

| strategyType | questionCount |
|--------------|--------------:|
| PATTERN_RETRY_SET | 5 |
| CONCEPT_REVIEW_SET | 3 |
| CALC_DRILL_SET | 5 |
| TIMED_PRACTICE | 10 |

Pattern pool이 부족하거나 `TIMED_PRACTICE`이면 Chapter → 전체로 확장.

---

## 5. Runtime Flow

```
Attempt → Mastery → Weakness → Plan → Strategy
  → createStudySession() → learning.study-session.v1
```

`runLearningLoopCycle`에 `questions` 배열을 넘기면 Study Session이 생성된다.
