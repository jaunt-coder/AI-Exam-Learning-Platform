# Sprint-10B — Learning Policy Stabilization Report

**Date:** 2026-07-26  
**Goal:** Study Pilot(10A) 이슈를 Learning Runtime Policy로 안정화  
**Config:** `data/learning-policy.json`  
**Comparison:** `docs/sprint-10B-comparison.md`

---

## 1. Executive Verdict

**PASS.** Question / Pattern / Master / Evidence는 변경하지 않았고,  
Plan dedupe · Weakness gating · Mastery slowdown을 **config 기반**으로 적용했다.

동일 20Q/30Q 파일럿에서:

| | 10A → 10B (30Q) |
|--|------------------|
| MASTERED | 5 → **0** |
| Plans | 27 → **3** |
| Strategies | 27 → **3** |
| Plan duplicates | 19 → **0** |

---

## 2. Scope

| Allowed | Forbidden |
|---------|-----------|
| Mastery / Weakness / Plan runtime policy | question-db-mvp.json |
| `data/learning-policy.json` | pattern-db-mvp.json |
| Plan dedupe / signal gate / mastery threshold | master-db.json |
| Pilot re-validation | Evidence 수정 |
| | LLM / AI 추천 |

---

## 3. Policy Changes

### 3.1 Plan Dedupe

동일 `patternId` + `actionType` + status ∈ `{GENERATED, ACTIVE}` 이면 **새 Plan 금지**.

업데이트만 수행:

| Field | Behavior |
|-------|----------|
| `attemptCount` | +1 |
| `priority` | max(기존, 신규) |
| `lastSeen` | now |

Strategy는 **신규 생성 Plan에만** 연결 (dedupe update는 Strategy를 만들지 않음).

### 3.2 Weakness Signal Gating

누적 count가 threshold 이상일 때만 **active weakness**로 노출 → Plan 입력.

| Signal | Gate (config) |
|--------|--------------:|
| REPEATED_MISS | ≥ 2 |
| CONCEPT_ERROR | ≥ 2 |
| CALCULATION_ERROR | ≥ 2 |
| LOW_ACCURACY | ≥ 3 |
| SLOW_RESPONSE | ≥ 1 |

Store는 누적 count를 유지하고, diagnosis/plan에는 gated signal만 전달한다.

### 3.3 Mastery Slowdown

하드코딩 제거. `getLearningPolicy().mastery` 사용.

| Key | 10B value | 이전(암묵) |
|-----|----------:|-----------|
| `learningMaxAttempts` | 4 | 3 |
| `retryAccuracyBelow` | 0.5 | 0.5 |
| `masteredMinAttempts` | **8** | 5 |
| `masteredMinAccuracy` | **0.85** | 0.80 |

---

## 4. Code Touchpoints

| File | Role |
|------|------|
| `data/learning-policy.json` | SoT config |
| `js/learning-policy.js` | defaults + get/set/load |
| `js/mastery-service.js` | config-driven `computeMasteryLevel` |
| `js/weakness-service.js` | `gateWeaknessSignals` + policy gates |
| `js/learning-plan-service.js` | `findActivePlan` / upsert |
| `runtime/learning-loop.js` | Strategy only for `createdPlans` |

---

## 5. Validation

| Check | Result |
|-------|--------|
| `scripts/test-mastery-runtime.py` | PASS |
| `scripts/test-weakness-runtime.py` | PASS |
| `scripts/test-learning-plan-runtime.py` | PASS |
| `scripts/test-learning-strategy-runtime.py` | PASS |
| `scripts/sprint-10B-study-pilot.py` | PASS |
| question-db unchanged | PASS |
| 240 / frequency 0 / primaryPattern 20 | PASS |

### Pilot snapshot (10B)

**20Q:** MASTERED 0 · Weakness 2 · Plan 2 · Strategy 2 · Dup 0  
**30Q:** MASTERED 0 · Weakness 3 · Plan 3 · Strategy 3 · Dup 0

---

## 6. Acceptance

| Criterion | Result |
|-----------|--------|
| Plan dedupe | PASS |
| Weakness gating (config) | PASS |
| Mastery slowdown (config, no hardcode) | PASS |
| 20Q / 30Q re-pilot | PASS |
| Comparison documented | PASS |
| Q / P / Master / Evidence untouched | PASS |
| No LLM | PASS |

**Sprint-10B overall: PASS**

---

## 7. Deliverables

- `docs/sprint-10B-policy-report.md`
- `docs/sprint-10B-comparison.md`
- `data/learning-policy.json`
- `js/learning-policy.js` (+ runtime service updates)
- `scripts/sprint-10B-study-pilot.py`
