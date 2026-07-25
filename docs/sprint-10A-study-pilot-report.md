# Sprint-10A — Study Pilot Report

**Date:** 2026-07-26  
**Goal:** 실제 학습 시작 전 Learning Runtime 검증 (기능 추가 최소화)  
**Pilot:** mixed learner · 20문항 / 30문항  
**Evidence:** `data/analysis/sprint-10A-pilot-metrics.json`  
**Audit detail:** `docs/sprint-10A-runtime-audit.md`

---

## 1. Executive Verdict

Learning Runtime은 **Attempt → Mastery → Weakness → Plan → Strategy → Storage** 전 구간이 동작한다.  
학습 시작(파일럿)에 필요한 상태 전이는 **PASS**.

다만 UX 관점에서:

- Plan / Strategy **중복 append**가 뚜렷함 (**ISSUE**)
- 오답 1회마다 domain miss signal → Plan 다발 생성 (**ISSUE**)
- MASTERED가 최소 조건(5회·정확도 0.8)에서 바로 열림 (**WATCH**)

→ Runtime은 쓸 수 있고, 다음 Sprint는 **Plan dedupe / signal gating** 쪽이 우선이다.

---

## 2. What Was Validated (not built)

| Did | Did not |
|-----|---------|
| 20Q / 30Q 시뮬레이션 | Question DB 수정 |
| 5개 LocalStorage key 검증 | Pattern DB 수정 |
| State transition 확인 | Master DB 수정 |
| UX Audit 5항목 | Evidence 수정 |
| Freeze / 240 / frequency 0 | AI·LLM 추천 |

---

## 3. Pilot Scenario

| Item | Value |
|------|-------|
| Student | `pilot_10A_student` |
| Profile | mixed (~73–75% correct) |
| Focus patterns | `ACC_GEN_001`, `ACC_PPE_001` (+ 4 ACC patterns) |
| Slow responses | selected wrongs ≥ 120s → `SLOW_RESPONSE` |
| Engine rules | mirror of `js/mastery-service.js`, `weakness-service.js`, `learning-plan-service.js`, `learning-strategy-service.js` |

Simulator: `scripts/sprint-10A-study-pilot.py`

---

## 4. Session Results

### 4.1 20문항

| Metric | Value |
|--------|------:|
| correct / incorrect | 15 / 5 |
| session accuracy | 0.75 |
| mastery patterns | 6 (all DEVELOPING) |
| MASTERED | 0 |
| plans created | 13 |
| strategies created | 13 |
| plans per wrong | 2.6 |
| duplicate plan extras | 7 |

Storage:

| Key | Count | Result |
|-----|------:|--------|
| `learning.attempts.v1` | 20 | PASS |
| `learning.mastery.v1` | 6 | PASS |
| `learning.weakness.v1` | 6 | PASS |
| `learning.plan.v1` | 13 | PASS |
| `learning.strategy.v1` | 13 | PASS |

### 4.2 30문항

| Metric | Value |
|--------|------:|
| correct / incorrect | 22 / 8 |
| session accuracy | 0.733 |
| mastery patterns | 6 |
| MASTERED | 5 |
| RETRY_REQUIRED | 1 (`ACC_GEN_001`, acc 0.40) |
| plans created | 27 |
| strategies created | 27 |
| plans per wrong | 3.38 |
| duplicate plan extras | 19 |

Storage:

| Key | Count | Result |
|-----|------:|--------|
| `learning.attempts.v1` | 30 | PASS |
| `learning.mastery.v1` | 6 | PASS |
| `learning.weakness.v1` | 6 | PASS |
| `learning.plan.v1` | 27 | PASS |
| `learning.strategy.v1` | 27 | PASS |

---

## 5. UX Audit

### 1) Mastery가 너무 빨리 올라가는가 → **WATCH**

- 20Q: MASTERED 없음 (attempts < 5이면 정확도 1.0이어도 DEVELOPING) → 정책 정상.
- 30Q: 5개 패턴이 **attempts=5 & accuracy=0.8**에서 즉시 MASTERED.
- 결론: 버그는 아님. 다만 시험 준비 체감상 “숙달”이 이르게 느껴질 수 있음.  
  다음 후보: MASTERED 하한 상향(예: attempts≥8) 또는 최근 N회 창 정확도.

### 2) Weakness가 과도하게 생성되는가 → **ISSUE**

- 오답마다 `CONCEPT_ERROR` / `CALCULATION_ERROR` 즉시 발생.
- Weakness store는 merge하지만, **매 cycle마다 현재 signal 집합 전체를 Plan으로 재생성**.
- 결과: plans/wrong = **2.6 (20Q)** / **3.38 (30Q)**.
- multi-plan cycles: 20Q=3, 30Q=4.

### 3) Plan이 중복 생성되는가 → **ISSUE**

- `(patternId, actionType)` 중복 extra rows: **7 (20Q)** / **19 (30Q)**.
- `learning.plan.v1`은 append-only이며 upsert/dedupe 없음.
- 실사용 시 동일 REVIEW_CONCEPT / CONCEPT_REVIEW_SET가 쌓여 공부 큐가 오염됨.

### 4) Strategy가 실제 공부 순서와 맞는가 → **OK**

- Plan→Strategy alignment fail: **0**.
- 규칙 매핑은 공부 방식 계약으로 타당함:
  - LOW_ACCURACY → RETRY_PATTERN → PATTERN_RETRY_SET
  - CONCEPT/REPEATED → REVIEW_CONCEPT → CONCEPT_REVIEW_SET
  - SLOW → MOCK_TEST → TIMED_PRACTICE
- 한계: Strategy는 “실행 계약”이지 아직 **스케줄러/UI 큐**가 아님.

### 5) LocalStorage가 정상 누적되는가 → **OK**

- 5개 key 모두 세션 길이/패턴 수에 맞게 누적.
- attempts / plans / strategies = append  
- mastery / weakness = pattern upsert  
- 스키마 파괴·키 충돌 없음.

---

## 6. Acceptance Checklist

| Criterion | Result |
|-----------|--------|
| question-db unchanged | PASS |
| pattern-db unchanged | PASS |
| master-db unchanged | PASS |
| evidence untouched | PASS |
| no AI / LLM | PASS |
| questions 240 | PASS |
| frequency mismatch 0 | PASS |
| primaryPattern 20 | PASS |
| learning.attempts.v1 | PASS |
| learning.mastery.v1 | PASS |
| learning.weakness.v1 | PASS |
| learning.plan.v1 | PASS |
| learning.strategy.v1 | PASS |
| state transition | PASS |
| UX audit documented | PASS |

**Sprint-10A overall:** **PASS (validation)** — runtime ready for study pilot; UX issues logged for follow-up.

---

## 7. Recommended Next (not in this Sprint)

1. **Plan dedupe** — same `(patternId, actionType)` upsert / refresh `updatedAt` only  
2. **Signal gating** — domain miss를 즉시 Plan하지 말고 threshold 또는 cooldown  
3. **Strategy queue view** — study order UI (nextAction 단일 노출)  
4. MASTERED 정책 재검토 (WATCH만; 당장 변경 불필요)

---

## 8. Deliverables

| Path | Role |
|------|------|
| `docs/sprint-10A-study-pilot-report.md` | 본 보고서 |
| `docs/sprint-10A-runtime-audit.md` | Storage / transition audit |
| `scripts/sprint-10A-study-pilot.py` | 재현 가능한 파일럿 |
| `data/analysis/sprint-10A-pilot-metrics.json` | 수치 증거 |
