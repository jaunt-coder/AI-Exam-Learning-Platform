# Sprint-10A — Runtime Audit

**Date:** 2026-07-26  
**Scope:** Learning Runtime state transition + LocalStorage contracts  
**Method:** Deterministic pilot (20Q / 30Q) mirroring `runtime/learning-loop.js` rules  
**Evidence:** `data/analysis/sprint-10A-pilot-metrics.json`  
**Simulator:** `scripts/sprint-10A-study-pilot.py`

---

## 1. Freeze Guarantees

| Asset | Result |
|-------|--------|
| `data/question-db-mvp.json` | unchanged (sha256 match) |
| `data/pattern-db-mvp.json` | not modified |
| `data/master-db.json` | not modified |
| Evidence SoT | not modified |
| AI / LLM | not used |

| Validation | Result |
|------------|--------|
| questions | 240 PASS |
| frequency mismatch | 0 PASS |
| primaryPattern | 20 PASS |

---

## 2. Runtime Chain Under Test

```
Attempt
  → learning.attempts.v1
Mastery
  → learning.mastery.v1
Weakness
  → learning.weakness.v1
Learning Plan
  → learning.plan.v1
Learning Strategy
  → learning.strategy.v1
```

State transition observed per attempt: **PASS** (20/20, 30/30 cycles completed with valid mastery levels).

---

## 3. Storage Contract Audit

### 3.1 Session 20Q

| Key | Shape check | Count | Result |
|-----|-------------|------:|--------|
| `learning.attempts.v1` | append events | 20 | PASS |
| `learning.mastery.v1` | upsert patterns | 6 | PASS |
| `learning.weakness.v1` | upsert patterns | 6 (signals on 4) | PASS |
| `learning.plan.v1` | append plans | 13 | PASS |
| `learning.strategy.v1` | append strategies | 13 | PASS |

### 3.2 Session 30Q

| Key | Shape check | Count | Result |
|-----|-------------|------:|--------|
| `learning.attempts.v1` | append events | 30 | PASS |
| `learning.mastery.v1` | upsert patterns | 6 | PASS |
| `learning.weakness.v1` | upsert patterns | 6 | PASS |
| `learning.plan.v1` | append plans | 27 | PASS |
| `learning.strategy.v1` | append strategies | 27 | PASS |

### 3.3 Accumulation semantics

| Store | Semantics | Observed |
|-------|-----------|----------|
| attempts | append-only | event count = N |
| mastery | pattern upsert | attempts/accuracy update in place |
| weakness | pattern upsert + signal merge | snapshot + accumulate domain misses |
| plan | append-only | **no dedupe** |
| strategy | append-only | 1:1 with created plans (mapped actions) |

---

## 4. Mastery Transition Audit

Policy (unchanged):

| Level | Rule |
|-------|------|
| UNKNOWN | attempts = 0 |
| LEARNING | attempts < 3 |
| RETRY_REQUIRED | attempts ≥ 3 and accuracy < 0.5 |
| DEVELOPING | otherwise (incl. high accuracy but attempts < 5) |
| MASTERED | attempts ≥ 5 and accuracy ≥ 0.8 |

### 20Q snapshot

| Pattern | attempts | accuracy | level |
|---------|---------:|---------:|-------|
| ACC_GEN_001 | 4 | 0.50 | DEVELOPING |
| ACC_PPE_001 | 4 | 1.00 | DEVELOPING |
| ACC_EQ_001 | 3 | 0.67 | DEVELOPING |
| ACC_FS_001 | 3 | 1.00 | DEVELOPING |
| ACC_INT_001 | 3 | 0.67 | DEVELOPING |
| ACC_REV_001 | 3 | 0.67 | DEVELOPING |

→ No MASTERED in 20Q. High accuracy alone does not unlock MASTERED before 5 attempts (**policy holds**).

### 30Q snapshot

| Pattern | attempts | accuracy | level |
|---------|---------:|---------:|-------|
| ACC_GEN_001 | 5 | 0.40 | RETRY_REQUIRED |
| ACC_PPE_001 | 5 | 0.80 | MASTERED |
| ACC_EQ_001 | 5 | 0.80 | MASTERED |
| ACC_FS_001 | 5 | 0.80 | MASTERED |
| ACC_INT_001 | 5 | 0.80 | MASTERED |
| ACC_REV_001 | 5 | 0.80 | MASTERED |

→ Five patterns hit MASTERED at the **minimum floor** (5 attempts / 0.8).  
→ Weak focus pattern correctly enters RETRY_REQUIRED.

---

## 5. Weakness → Plan → Strategy Audit

### Signal inventory

| Session | CONCEPT_ERROR | LOW_ACCURACY | REPEATED_MISS | SLOW (via MOCK_TEST plans) |
|---------|--------------:|-------------:|--------------:|---------------------------:|
| 20Q | 4 | 1 | 0 | 1 plan |
| 30Q | 6 | 1 | 1 | 1 plan |

### Mapping integrity

| Plan actionType | Strategy type | Alignment |
|-----------------|---------------|-----------|
| RETRY_PATTERN | PATTERN_RETRY_SET | 100% |
| REVIEW_CONCEPT | CONCEPT_REVIEW_SET | 100% |
| PRACTICE_CALCULATION | CALC_DRILL_SET | (not triggered in this ACC-heavy pilot) |
| MOCK_TEST | TIMED_PRACTICE | 100% |

`strategyAlignmentFail`: **0 / 0** (20Q / 30Q).

---

## 6. Contract Flags (runtime)

| Contract | connected |
|----------|-----------|
| masteryRuntime | true |
| weaknessRuntime | true |
| learningPlanContract | true |
| strategyContract | true |

---

## 7. Audit Verdict

| Area | Verdict |
|------|---------|
| State transition | **PASS** |
| Five storage keys | **PASS** |
| Plan→Strategy mapping | **PASS** |
| Freeze (Q/P/Master) | **PASS** |
| Plan append volume / dedupe | **FAIL (product UX)** — see UX audit |

Runtime foundation is executable for study pilot.  
Product-quality issues are concentrated in **plan/strategy append without dedupe**, not in broken transitions.
