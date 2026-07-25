# Sprint-10G — Recommendation Engine v1

**Branch:** `feature/sprint-10G-recommendation-engine`  
**Service:** `js/recommendation-service.js`  
**Storage:** `learning.recommendation.v1`  
**Schema:** `data/recommendation-schema.json`

---

## Purpose

Learning Strategy 결과를 읽어 **설명 가능한(Explainable)** 오늘의 추천을 생성한다.

- Deterministic rule only  
- No AI / LLM  
- Mastery / Weakness / Plan / Strategy / Session / Selector 서비스 미수정  

---

## API

| Function | Role |
|----------|------|
| `buildRecommendations()` | Strategy → Recommendation[] |
| `buildRecommendationReason(code)` | reasonCode → 한국어 설명 |
| `rankRecommendations()` | priority → minutes → patternId |
| `buildTodayRecommendation()` | 생성·저장·Today 반환 |
| `buildRecommendationSummary()` | Dashboard summary |

---

## Object

```json
{
  "recommendationId": "rec_…",
  "patternId": "ACC_GEN_001",
  "strategyType": "PATTERN_RETRY_SET",
  "actionType": "RETRY_PATTERN",
  "priority": 2,
  "reason": "최근 정확도가 기준 이하입니다.",
  "reasonCode": "LOW_ACCURACY",
  "estimatedMinutes": 15,
  "createdAt": "ISO-8601",
  "status": "ACTIVE"
}
```

---

## Contract

```json
{
  "recommendationContract": {
    "enabled": true,
    "schemaVersion": "v1",
    "connected": true
  }
}
```
