# Sprint-10B — 10A vs 10B Comparison

**Date:** 2026-07-26  
**Scenario:** identical mixed pilot (same question pick + outcome schedule as Sprint-10A)  
**Evidence:** `data/analysis/sprint-10B-pilot-metrics.json`

---

## 1. 20Q

| Metric | Sprint-10A | Sprint-10B | Δ |
|--------|----------:|----------:|---|
| MASTERED | 0 | 0 | 0 |
| Weakness (active signals) | 5 | 2 | −3 |
| Plan | 13 | 2 | −11 |
| Strategy | 13 | 2 | −11 |
| Plan Duplicate (extra rows) | 7 | **0** | −7 |

---

## 2. 30Q

| Metric | Sprint-10A | Sprint-10B | Δ |
|--------|----------:|----------:|---|
| MASTERED | 5 | **0** | −5 |
| Weakness (active signals) | 8 | 3 | −5 |
| Plan | 27 | 3 | −24 |
| Strategy | 27 | 3 | −24 |
| Plan Duplicate (extra rows) | 19 | **0** | −19 |

---

## 3. Interpretation

| Goal | Result |
|------|--------|
| Mastery slowdown | PASS — 30Q에서 MASTERED 5 → 0 (최소 attempts=8 / acc≥0.85) |
| Weakness gating | PASS — 활성 signal 감소 (1회 오답 즉시 Plan 없음) |
| Plan dedupe | PASS — duplicate extra **0** |
| Strategy spam | PASS — Plan 감소에 비례해 Strategy도 감소 |

---

## 4. Policy levers used

From `data/learning-policy.json`:

| Area | Key | Value |
|------|-----|------:|
| Mastery | `masteredMinAttempts` | 8 |
| Mastery | `masteredMinAccuracy` | 0.85 |
| Mastery | `learningMaxAttempts` | 4 |
| Gate | `CONCEPT_ERROR` | 2 |
| Gate | `CALCULATION_ERROR` | 2 |
| Gate | `REPEATED_MISS` | 2 |
| Gate | `LOW_ACCURACY` | 3 |
| Plan | `dedupeStatuses` | GENERATED, ACTIVE |

---

## 5. Freeze

| Check | Result |
|-------|--------|
| question-db | unchanged |
| pattern-db | unchanged |
| master-db | unchanged |
| questions 240 / frequency 0 / primaryPattern 20 | PASS |
