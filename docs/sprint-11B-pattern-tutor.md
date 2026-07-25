# Sprint-11B — Pattern Tutor AI Coach

**Branch:** `feature/sprint-11B-pattern-tutor`  
**Depends on:** Sprint-11A LLM Adapter

---

## Architecture

```
Attempt → Mastery → Weakness → Recommendation → Pattern Tutor → LLM Adapter → OpenAI gpt-5.5
```

Pattern Tutor는 **설명 계층**이다. Runtime이 무엇을 공부할지 결정하고, Tutor는 그 결정을 학생에게 설명한다.

---

## Frozen (절대 수정 금지)

- Question DB / Pattern DB / Master DB
- Evidence / Policy
- Runtime (`learning-loop.js`)
- Recommendation Engine 출력 변경

읽기만 허용.

---

## Modules

| Path | Export | Role |
|------|--------|------|
| `js/llm/pattern-prompt-builder.js` | `buildPatternTutorPrompt()` | System / Developer / User |
| `js/coach/pattern-tutor.js` | `generatePatternTutor()` | LLM 호출 · 검증 · Fallback |

---

## Input

```js
generatePatternTutor({
  patternId,
  runtimeSnapshot,
  studentState,
  masteryState,
  weaknessState,
  recommendation,
  studentQuestion, // optional
})
```

### Runtime Snapshot (example)

```json
{
  "pattern": {},
  "mastery": {},
  "weakness": {},
  "recommendation": {},
  "recentAttempts": [],
  "accuracy": 0.4,
  "attemptCount": 5,
  "lastAttempt": {},
  "difficulty": "MEDIUM",
  "evidence": {}
}
```

---

## Prompt (3단)

1. **System** — 감정평가사 회계학 전문 튜터 역할 + 원칙
2. **Developer** — Runtime Snapshot / Policy / Evidence / Mastery / Weakness / Recommendation / Pattern Metadata
3. **User** — 학생 질문 또는 자동 생성 (`왜 이 Pattern을 틀렸나요?`)

---

## Response Schema

```json
{
  "title": "string",
  "summary": "string",
  "whyWrong": "string",
  "patternExplanation": "string",
  "commonMistakes": ["string"],
  "reviewChecklist": ["string"],
  "nextStudy": "string",
  "confidence": 0.0
}
```

- LLM 출력: **JSON ONLY**
- `temperature`: `0.2`
- Schema 검사 실패 시 자동 재시도 **최대 2회**
- 최종 실패 시 **Rule Coach Fallback** (기존 Recommendation 사용)

---

## Storage

| Key | Access |
|-----|--------|
| `learning.mastery.v1` | read |
| `learning.weakness.v1` | read |
| `learning.plan.v1` | read |
| `learning.strategy.v1` | read |
| `learning.recommendation.v1` | read |

**쓰기 없음.**

---

## Validation

```json
{
  "patternTutor": {
    "enabled": true,
    "connected": true,
    "provider": "openai",
    "model": "gpt-5.5",
    "fallback": true
  }
}
```

---

## Dashboard

**AI Pattern Tutor** Pattern Detail Card

- Pattern
- Mastery
- Weakness
- Explanation
- Common Mistakes
- Review Checklist
