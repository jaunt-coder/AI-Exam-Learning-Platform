# Attempt Ingestion Design (WO-014.1)

Version 1.0 — 2026-07-22  
Status: **FOUNDATION** (event schema + counter update rules · no mastery · no recommendation)  
Schemas:

- `data/attempt-event-schema.json`
- `data/student-learning-state-schema.json` (WO-014 · consumer)

---

## 1. Purpose

학생이 문항을 풀었을 때, 그 **사실(event)** 을 학습 시스템에 넣는 방법을 정의한다.

본 WO는 다음만 한다.

- Attempt Event 스키마 고정
- Student Learning State **카운터 갱신 규칙** 문서화

본 WO는 다음을 **하지 않는다**.

- 약점(weakness) 추론
- mastery 계산·등급 부여
- recommendation 생성
- 증거 없는 error_id / 오답 원인 부여
- Question / Answer / Pattern DB 수정

---

## 2. Event Flow

```text
UI / Exam / Practice Engine
        │
        │  student selects answer
        ▼
Grade against Answer SoT (read-only lookup)
        │
        │  result = correct | wrong
        ▼
AttemptEvent  (append-only)
  data/attempt-event-schema.json
        │
        │  validate (§4)
        ▼
State Updater (rules only · §3)
        │
        ▼
Student Learning State projection
  pattern_states counters
  question_history append
  mastery_status remains unknown
  recommendation_state.next_action remains unknown
  error_states unchanged (no auto error assign)
```

### 2.1 Authority

| Concern | Authority |
|---------|-----------|
| Correct answer value | Answer / Question SoT (read-only) |
| Pattern id existence | `data/pattern-master-db.json` (read-only) |
| Event log | AttemptEvent (append-only) |
| Learner counters | Student Learning State (projection) |

AttemptEvent는 Answer SoT를 **참조**한다 (`correct_answer_reference`).  
정답 값을 고쳐 쓰지 않는다.

---

## 3. State Update Rules

입력: 검증 통과한 `AttemptEvent`  
출력: 동일 `student_id`의 Student Learning State 갱신

### 3.1 Always (every accepted event)

1. Append to `question_history`:

```text
{
  question_id: event.question_id,
  pattern_id:  event.pattern_id,
  answer_result: event.result,   // correct | wrong
  timestamp: event.timestamp,
  error_id: null                 // WO-014.1: never auto-assign
}
```

2. Set `updated_at = event.timestamp` (or ingest clock ≥ event.timestamp).

3. **Do not** change `recommendation_state.next_action` (stays `unknown`).

4. **Do not** write `error_states` (stays untouched / empty unless a future evidenced Error-Link WO).

5. **Do not** change `mastery_status` (stays `unknown` when a pattern_state row exists).

### 3.2 Pattern state counters

Locate `pattern_states[pattern_id == event.pattern_id]`.

If missing → create row **only for this pattern_id** (never pre-seed all patterns):

```text
pattern_id: event.pattern_id
attempt_count: 0
correct_count: 0
wrong_count: 0
accuracy: null
mastery_status: unknown
last_attempt_date: null
```

Then apply:

| Event `result` | Updates |
|----------------|---------|
| `correct` | `attempt_count += 1` · `correct_count += 1` |
| `wrong` | `attempt_count += 1` · `wrong_count += 1` |

Always after counter update:

```text
last_attempt_date = event.timestamp
accuracy = correct_count / attempt_count   // observational ratio only
mastery_status = unknown                   // NO mastery policy
```

`accuracy`는 단순 비율 관측값이다. mastery·weakness·priority로 해석하지 않는다.

### 3.3 Explicit non-updates

| Field / Concern | WO-014.1 action |
|-----------------|-----------------|
| `mastery_status` | keep `unknown` |
| `recommendation_state.next_action` | keep `unknown` |
| `error_states` | no write |
| Question DB | no write |
| Answer SoT | no write |
| Pattern Master / Pattern DB | no write |

### 3.4 Idempotency

- Same `event_id` MUST NOT be applied twice.
- Re-ingest of an already-accepted `event_id` → reject (no double count).

### 3.5 learning_data_status note

WO-014 schema currently locks `learning_data_status` to `empty` only.  
After the first accepted AttemptEvent, the **design intent** is:

```text
empty  →  observed
```

Schema enum 확장은 **미해결 의존성** (§7).  
구현 Persist WO 전에 schema minor bump가 필요하다.  
본 문서는 전이 규칙을 정의하되, WO-014 스키마 파일을 임의로 깨지 않는다.

---

## 4. Validation Rules (Ingest Gate)

AttemptEvent는 아래를 모두 통과해야 `accepted`다.

| # | Rule | Fail action |
|---|------|-------------|
| V1 | Required fields present per `attempt-event-schema.json` | reject |
| V2 | `question_id` exists in a known Question source (Product/Phase1/Golden mapping) — **lookup only** | reject |
| V3 | `pattern_id` exists in `data/pattern-master-db.json` | reject |
| V4 | Preferred: `pattern_id.validation_status == verified` for Learning Layer production path | reject or quarantine (policy flag; default reject for foundation) |
| V5 | `correct_answer_reference` resolves read-only; grading `result` matches comparison of `selected_answer` vs referenced answer | reject |
| V6 | `result ∈ {correct, wrong}` | reject |
| V7 | `event_id` unique (not previously accepted) | reject |
| V8 | No error_id / weakness / mastery / recommendation fields required or inferred | N/A |

**Verified attempt** 의미 (본 WO):

- 스키마 유효
- Question/Pattern/Answer **참조 가능**
- `result`가 SoT 대조로 확정됨

학생 약점이 “검증됨”을 뜻하지 않는다.

---

## 5. Attempt Event Fields

| Field | Meaning |
|-------|---------|
| `event_id` | 유일 이벤트 ID |
| `student_id` | 학습자 |
| `question_id` | 기존 문항 ID |
| `pattern_id` | Pattern Master ID |
| `selected_answer` | 학생 선택 |
| `correct_answer_reference` | 정답 SoT 포인터 (`source` + `question_id` + `field=answer`) |
| `result` | `correct` \| `wrong` |
| `timestamp` | 시도 시각 |

Optional `ingest.status`: `accepted` \| `rejected` (운영 메타, 교육 추론 아님).

---

## 6. Future Mastery Dependency

```text
WO-014.1 Attempt Ingest (counters only)
        │
        ▼
(Future) Mastery Policy WO
  — defines when mastery_status may leave unknown
  — uses attempt_count / accuracy / spaced reviews
  — still must not invent without attempts
        │
        ▼
(Future) Recommendation WO
  — may set recommendation_state.next_action
        │
        ▼
(Future) Error-Link WO
  — may set question_history.error_id / error_states
  — only with evidenced taxonomy (verified preferred)
```

Mastery 공식·임계값·등급(S/A 학습 완료 등)은 **본 WO OUT**.

---

## 7. Unresolved Dependencies

1. **Student Learning State schema bump** — allow `learning_data_status: observed` (and possibly non-empty arrays under observed).
2. **Persist / LocalStorage wiring** — map AttemptEvent ↔ `coach.attempts.v1` / `questionAttempts` without renaming Constitution keys.
3. **Runtime grader module** — implement V5 comparison in code (schema/docs only in WO-014.1).
4. **Golden pilot pattern coverage** — many Q41–Q80 still `pending_review` (WO-013.1); ingest should reject or quarantine unmapped pattern_id.
5. **Error taxonomy verified=0** — error auto-link remains forbidden.

---

## 8. Out of Scope

- Recommendation / Planner
- Weakness diagnosis
- Mastery scoring
- Error cause assignment
- Question / Answer / Pattern mutation
- Mock student attempt generation presented as real data

---

## 9. Validation Checklist (WO-014.1)

| Criterion | Status |
|-----------|--------|
| No Question modification | Required |
| No Answer modification | Required |
| No Pattern modification | Required |
| No mastery assumption | Required (`mastery_status` stays `unknown`) |
| Attempt schema generated | `data/attempt-event-schema.json` |
| State update logic documented | this document |
