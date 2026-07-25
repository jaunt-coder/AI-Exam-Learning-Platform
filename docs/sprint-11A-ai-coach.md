# Sprint-11A — AI Coach Foundation

**Service:** `js/coach/ai-coach-service.js`  
**Schema:** `data/coach-schema.json`

---

## Rules

- Coach는 `llm-client`만 사용한다
- OpenAI API 직접 호출 금지
- Runtime Recommendation / Plan / Strategy 수정 금지
- 새 Pattern 추천 금지
- LLM 실패 시 Rule Coach fallback

---

## Tasks

| Task | Dashboard card |
|------|----------------|
| `TODAY_COACH` | Today's Coach |
| `PATTERN_COACH` | Pattern Coach |
| `RECOMMENDATION_COACH` | Recommendation Coach |

---

## Output

- 한국어 300~500자 목표
- 섹션: 왜 / 어떻게 / 주의 / 격려
- LLM은 **설명만** 생성 — 무엇을 공부할지는 Runtime이 결정
