# Coach Agent Layer (`js/coach/`)

학생 맞춤 합격 전략 Agent Layer.

IR Parser Core(`scripts/parser/`)와 **독립**이다. Core Stage를 import·수정하지 않는다.

## Phase C1

| Module | 역할 |
|--------|------|
| `models.js` | UserProfile / legacy attempt / WeaknessReport |
| `profile-store.js` | `userProfile` |
| `attempt-store.js` | legacy `questionAttempts` (C1, 유지) |
| `weakness-store.js` | `weaknessReports` |
| `ai-provider.js` | AIProvider + MockAIProvider |

## Phase C2 — append-only Attempt 계약

| Module | 역할 |
|--------|------|
| `models/question-attempt.js` | C2 QuestionAttempt schema |
| `stores/attemptStore.js` | `coach.attempts.v1` append-only |
| `adapters/question-engine-adapter.js` | Question Engine → Attempt (비침투) |

Mock: `data/coach/mock-attempts.json` (≥20)  
검증: `py -3 scripts/validate-coach-phase2.py`

`question-engine.js`를 수정하지 않는다. 호출측이 adapter를 사용한다.

## Pattern ID

Canonical only: `ACC_INV_003`

## Phase C3 — Weakness Diagnosis (진단만)

| Module | 역할 |
|--------|------|
| `models/weakness-report.js` | WeaknessReport schema |
| `config/weakness-config.js` | severity/trend 임계값 |
| `diagnosis/weakness-engine.js` | Attempt → Report |
| `diagnosis/severity-rules.js` | 규칙 적용 |
| `stores/weaknessStore.js` | `coach.weakness.v1` |

검증: `py -3 scripts/validate-coach-phase3.py`  
추천·LLM·설명 문구 생성 없음.

## 다음 Phase

- C4: Learning Planner
- C5: AI Dashboard
- C6: Full Agent Loop

명세: `docs/33-ai-exam-coach-agent-spec.md`
