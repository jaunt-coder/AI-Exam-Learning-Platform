# Sprint-11C — Question Tutor AI Coach

**Branch:** `feature/sprint-11C-question-tutor`  
**Depends on:** Sprint-11A LLM Adapter, Sprint-11B Pattern Tutor

---

## Architecture

```
Question → Attempt → Mastery → Weakness → Pattern Tutor → Question Tutor → LLM Adapter → OpenAI gpt-5.5
```

Question Tutor는 **단일 문항**의 오답 원인·해설 계층이다.  
Pattern Tutor는 유지되며, Question Tutor Fallback 체인에 재사용된다.

---

## Frozen (절대 수정 금지)

- Question DB / Pattern DB / Master DB
- Evidence / Policy
- Runtime Logic

읽기만 허용.

---

## Modules

| Path | Export | Role |
|------|--------|------|
| `js/llm/question-prompt-builder.js` | `buildQuestionTutorPrompt()` | System / Developer / User |
| `js/coach/question-tutor.js` | `generateQuestionTutor()` | LLM · Schema · Fallback |

---

## Input

```js
generateQuestionTutor({
  question,
  attempt,
  runtimeSnapshot,
  studentState,
  pattern,
  mastery,
  weakness,
  recommendation,
  studentQuestion, // optional
})
```

---

## Prompt (3단)

1. **System** — 감정평가사 회계학 전문 튜터 + 오답 원인 구분 원칙
2. **Developer** — Runtime Snapshot / Question / Pattern / Mastery / Weakness / Recommendation / Evidence / Attempt
3. **User** — 학생 질문 또는 자동 생성 (`이 문제를 왜 틀렸나요?`)

---

## Response Schema

```json
{
  "title": "string",
  "summary": "string",
  "correctAnswer": "string",
  "whyWrong": "string",
  "mistakeType": "CALCULATION|CONCEPT|MEMORIZATION|MISREAD|TIME_PRESSURE|UNKNOWN",
  "stepByStep": ["string"],
  "keyConcept": "string",
  "relatedPattern": "string",
  "reviewChecklist": ["string"],
  "similarTrap": "string",
  "nextQuestion": "string",
  "confidence": 0.0
}
```

- JSON ONLY · `temperature: 0.2`
- Schema 검사 실패 시 재시도 최대 2회

---

## Fallback

```
LLM 실패 → Pattern Tutor → Rule Coach
```

---

## Storage (읽기만)

- `learning.attempts.v1`
- `learning.mastery.v1`
- `learning.weakness.v1`
- `learning.plan.v1`
- `learning.strategy.v1`
- `learning.recommendation.v1`

쓰기 없음.

---

## Validation

```json
{
  "questionTutor": {
    "enabled": true,
    "connected": true,
    "provider": "openai",
    "model": "gpt-5.5",
    "fallback": true,
    "schemaValidated": true
  }
}
```

---

## Dashboard

**AI Question Tutor** — Question Result Panel

- 왜 틀렸는가
- Mistake Type
- Step by Step
- 핵심 개념
- 같은 함정
- 복습 체크리스트
