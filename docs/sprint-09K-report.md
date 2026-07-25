# Sprint-09K Report — Mastery Runtime Integration

**Date:** 2026-07-26  
**Commit target:** `Sprint-09K Mastery Runtime Integration`

---

## 1. Objective

Attempt Runtime을 Pattern Mastery State에 연결한다.

```
Question Attempt → effectivePatternId → Mastery Update → pattern mastery state
```

---

## 2. Runtime Flow

1. Learning Loop 제출 → `runLearningLoopCycle`
2. `submitAttempt` + Learning State 갱신
3. `recordAttempt` (`js/mastery-service.js`)
4. LocalStorage `learning.mastery.v1` 저장

---

## 3. Storage Key

| Key | Role |
|-----|------|
| `learning.mastery.v1` | Pattern Mastery document (`version`, `patterns[]`) |

Constitution keys (`progress`, `wrongAnswers`, …) 미변경.  
Additive key only (`STORAGE_KEYS.LEARNING_MASTERY_V1`).

---

## 4. Mastery Calculation Policy

See `docs/sprint-09K-mastery-policy.md`.

| Rule | Condition |
|------|-----------|
| UNKNOWN | attempts = 0 |
| LEARNING | attempts < 3 |
| RETRY_REQUIRED | accuracy < 0.5 (attempts ≥ 3) |
| MASTERED | attempts ≥ 5 AND accuracy ≥ 0.8 |
| DEVELOPING | otherwise |

Deterministic only — no AI.

---

## 5. Validation

```json
{
  "masteryRuntime": {
    "enabled": true,
    "schemaVersion": "v1",
    "connected": true
  }
}
```

- Does **not** fail `valid`
- Existing checks: questions 240 · frequency 0 · primaryPattern 20 · question-db untouched

---

## 6. Test Results

| Case | Expected | Result |
|------|----------|--------|
| Attempt 1 | UNKNOWN → LEARNING | PASS |
| 5 attempts / 4 correct | MASTERED | PASS |
| 5 attempts / 2 correct | RETRY_REQUIRED | PASS |

---

## 7. Limitations

1. UI에 Mastery badge 미표시 (상태만 저장)
2. `weaknessSignals` 미추론
3. ACC_* Evidence REVIEW_REQUIRED와 Mastery는 독립 축
4. Recommendation / Strategy Agent 미연결
5. Cross-device sync 없음 (LocalStorage only)

---

## 8. Deliverables

| File | Role |
|------|------|
| `js/mastery-service.js` | recordAttempt · updatePatternMastery |
| `js/storage.js` | `LEARNING_MASTERY_V1` |
| `runtime/learning-loop.js` | Attempt → Mastery wire |
| `js/data-loader.js` | `masteryRuntime.connected:true` |
| `docs/sprint-09K-mastery-policy.md` | Rules |
| `docs/sprint-09K-report.md` | This report |
| `scripts/test-mastery-runtime.mjs` | Deterministic tests |

---

## 9. Acceptance

| Criterion | Result |
|-----------|--------|
| question-db unchanged | PASS |
| mastery-service.js created | PASS |
| attempt updates mastery | PASS |
| localStorage persistence | PASS |
| masteryRuntime connected:true | PASS |
| existing validation PASS | PASS |
