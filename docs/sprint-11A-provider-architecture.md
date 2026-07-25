# Sprint-11A — Provider Architecture

## Registry

| Provider | 11A Status |
|----------|------------|
| OPENAI | Implemented (`gpt-5.5`) |
| GEMINI | Registered stub |
| CLAUDE | Registered stub |
| LOCAL | Registered stub |

## Key resolution (OpenAI)

1. `process.env.OPENAI_API_KEY` (non-browser tooling)
2. `globalThis.__OPENAI_API_KEY__`
3. `settings.openaiApiKey` / `settings.llm.apiKey` (LocalStorage)

Never commit secrets.

## Cache

```
Prompt + Snapshot → SHA-256 → learning.llm.cache.v1
```

동일 Snapshot이면 동일 Hash → 캐시 응답 재사용.

## Failure

Provider 실패 시 Adapter/Coach가 Rule Coach로 fallback한다.  
Runtime은 중단되지 않는다.
