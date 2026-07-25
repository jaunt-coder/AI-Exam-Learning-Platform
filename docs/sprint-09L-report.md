# Sprint-09L Report — Weakness Detection Layer

**Date:** 2026-07-26  
**Commit target:** `Sprint-09L Weakness Detection Layer`

---

## 1. Objective

Mastery State → explainable Weakness Signals (deterministic).

```
Attempt History → Pattern Mastery → Weakness Diagnosis → Future Recommendation Input
```

---

## 2. Weakness Model

Storage key: `learning.weakness.v1`

```json
{
  "patternId": "ACC_INV_001",
  "signals": [
    { "type": "LOW_ACCURACY", "count": 3, "severity": "high" }
  ]
}
```

Service: `js/weakness-service.js`  
API: `detectWeakness(patternMastery)` · `recordWeaknessDiagnosis(...)`

Runtime wire: `runtime/learning-loop.js`  
Attempt → Mastery Update → Weakness Detection

---

## 3. Signal Rules (deterministic)

| Signal | Rule |
|--------|------|
| `LOW_ACCURACY` | attempts ≥ 3 AND accuracy < 0.6 |
| `REPEATED_MISS` | incorrectCount ≥ 3 |
| `CALCULATION_ERROR` | last attempt wrong AND `patternId` starts with `COST_` |
| `CONCEPT_ERROR` | last attempt wrong AND not COST domain |
| `SLOW_RESPONSE` | `durationMs` ≥ 120000 (optional context only) |

- No LLM / AI recommendation
- Domain miss types accumulate; accuracy/repeated/slow are refreshed from latest mastery snapshot

---

## 4. Validation

```json
{
  "weaknessRuntime": {
    "enabled": true,
    "schemaVersion": "v1",
    "connected": true
  }
}
```

Does not fail `valid`.  
Existing: questions 240 · frequency 0 · primaryPattern 20 · question-db untouched.

---

## 5. Limitations

1. Attempt Event에 duration / error taxonomy 필드가 없어 `SLOW_RESPONSE`는 `durationMs` 입력 시에만 발생
2. CALCULATION vs CONCEPT는 Pattern domain proxy (`COST_*` vs 그 외) — 문항별 오인 원인 분석 아님
3. UI 미표시 · Recommendation Agent 미연결
4. Evidence REVIEW_REQUIRED와 Weakness는 독립 축

---

## 6. Deliverables

| File | Role |
|------|------|
| `docs/sprint-09L-weakness-schema.md` | Schema |
| `js/weakness-service.js` | Detection + storage |
| `js/storage.js` | `LEARNING_WEAKNESS_V1` |
| `runtime/learning-loop.js` | Mastery → Weakness wire |
| `js/data-loader.js` | `weaknessRuntime` |
| `docs/sprint-09L-report.md` | This report |
| `scripts/test-weakness-runtime.py` | Deterministic tests |

---

## 7. Acceptance

| Criterion | Result |
|-----------|--------|
| question-db unchanged | PASS |
| weakness-service.js created | PASS |
| mastery → weakness connected | PASS |
| learning.weakness.v1 stored | PASS |
| weaknessRuntime connected:true | PASS |
| existing validation PASS | PASS |
