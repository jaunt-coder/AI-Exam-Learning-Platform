# Sprint-11A — LLM Adapter Layer

**Branch:** `feature/sprint-11A-llm-adapter`  
**Config:** `data/llm-config.json`

---

## Architecture

```
Runtime (read-only snapshot)
  → AI Coach
  → LLM Adapter (llm-client)
  → Provider Registry
  → OpenAI Provider (gpt-5.5)
```

- Runtime / Coach는 Provider·OpenAI를 **모른다**
- OpenAI는 Adapter 내부(`openai-provider.js`)에만 존재
- API Key는 `OPENAI_API_KEY` / settings — **하드코딩 금지**

---

## Modules (`js/llm/`)

| File | Role |
|------|------|
| `llm-client.js` | `generate` / `chat` / `healthCheck` |
| `llm-provider.js` | Provider interface |
| `provider-registry.js` | OPENAI / GEMINI / CLAUDE / LOCAL |
| `openai-provider.js` | OpenAI fetch 구현 |
| `prompt-builder.js` | Runtime Snapshot → Prompt |
| `prompt-hash.js` | SHA-256 |
| `prompt-cache.js` | `learning.llm.cache.v1` |

---

## Snapshot only

Prompt에는 Question DB / Pattern DB 전체를 넣지 않는다.

```json
{
  "mastery": {},
  "weakness": {},
  "plan": {},
  "strategy": {},
  "recommendation": {},
  "studySession": {}
}
```

---

## Validation

```json
{
  "llm": {
    "enabled": true,
    "provider": "OPENAI",
    "model": "gpt-5.5",
    "adapter": true,
    "connected": true
  }
}
```
