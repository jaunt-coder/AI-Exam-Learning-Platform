# Mastery Policy Application Design (WO-014.2A)

Version 1.0 — 2026-07-22  
Status: **SCHEMA APPLY · NOT EXECUTED**  
Output schema: `data/student-learning-state-schema-v2.json`  
Policy input: `data/mastery-policy-schema.json`  
Prior Learning State: `data/student-learning-state-schema.json` (v1 retained)

---

## 1. Purpose

문서화된 Mastery Policy(WO-014.2)를 Student Learning State에  
**안전하게 저장할 수 있는 슬롯**으로 연결한다.

본 WO는 다음을 **하지 않는다**.

- mastery 계산 실행
- `mastered` / `weak` / `review_required` 등 실값 부여
- threshold 적용
- recommendation 생성
- Question / Answer / Pattern Master 수정

---

## 2. Schema Changes (v1 → v2)

| Change | Detail |
|--------|--------|
| New file | `data/student-learning-state-schema-v2.json` |
| `schemaVersion` | `wo014-1.0` → `wo014.2a-2.0` |
| Retained | `student_id`, `pattern_states`, `question_history`, `error_states`, `recommendation_state`, counters, timestamps |
| Added (root) | `mastery`, `transition_history`, `mastery_policy_reference` |
| Added (`pattern_states[]`) | `mastery` object (per-pattern unit) |
| Extended | `learning_data_status`: `empty` \| `observed` (ingest-ready; mastery still unknown) |
| `kb_refs` | optional `mastery_policy_schema` path |

v1 파일은 **유지**한다 (breaking replace 금지).  
신규 소비자는 v2를 사용한다.

### 2.1 New root objects

**`mastery`**

| Field | Initial (safe) |
|-------|----------------|
| `status` | `unknown` |
| `confidence` | `unknown` |
| `policy_version` | `wo014.2-1.0` |

문서 수준 슬롯이다. 전역 약점 점수가 아니다.  
패턴 단위 라벨은 `pattern_states[].mastery`에 둔다 (policy `unit_of_mastery=pattern_id`).

**`mastery_policy_reference`**

| Field | Value |
|-------|-------|
| `policy_id` | `WO-014.2` |
| `version` | `wo014.2-1.0` |
| `status` | `documented` |

**`transition_history`**

- 초기: `[]`
- Future Execution WO만 `accepted` transition을 append
- WO-014.2A는 항목을 생성하지 않음

### 2.2 `pattern_states[].mastery`

| Field | Role |
|-------|------|
| `status` | Policy enum storage (safe write = `unknown`) |
| `confidence` | Label confidence storage (safe write = `unknown`) |
| `policy_version` | Bound policy version |

**Backward mirror:** `mastery_status` 필드는 v1 호환용으로 남기며  
WO-014.2A에서는 **`unknown` only**로 잠근다.  
`mastery.status`가 `unknown`일 때 `mastery_status`도 `unknown`이어야 한다.

---

## 3. Policy Linkage

```text
data/mastery-policy-schema.json
  policy_status = documented
  policy_execution = not_executed
  mastery_status_enum / mastery_confidence_enum
        │
        │  reference only (WO-014.2A)
        ▼
Student Learning State v2
  mastery_policy_reference.status = documented
  mastery.status = unknown
  mastery.confidence = unknown
  transition_history = []
```

- Policy `candidate_parameters`는 **적용하지 않음** (`pending_human` 유지).
- Policy `transition_framework.mode = conceptual_only` → v2는 저장 슬롯만 제공.
- `accuracy_alone_sufficient = false` 불변 — 스키마가 계산을 수행하지 않음.

---

## 4. Initial State Safety

Empty example (`examples[0]`):

```json
{
  "learning_data_status": "empty",
  "pattern_states": [],
  "question_history": [],
  "error_states": [],
  "recommendation_state": { "next_action": "unknown" },
  "mastery": {
    "status": "unknown",
    "confidence": "unknown",
    "policy_version": "wo014.2-1.0"
  },
  "transition_history": [],
  "mastery_policy_reference": {
    "policy_id": "WO-014.2",
    "version": "wo014.2-1.0",
    "status": "documented"
  }
}
```

해석: **데이터가 없음** + **정책은 문서화됨** + **숙련도 미평가**.  
약함/강함/복습필요가 아님.

---

## 5. Execution Boundary

| Allowed in WO-014.2A | Forbidden |
|----------------------|-----------|
| Add storage fields | Run mastery evaluator |
| Reference policy version | Write `mastered` / `developing` / etc. to real students |
| Keep `unknown` | Assign weak synonym labels |
| Document migration | Apply `candidate_parameters` thresholds |
| Keep recommendation `unknown` | Generate `next_action` |

Storage enum이 policy 전체 값을 **나열**하는 이유:  
미래 Execution WO가 스키마를 다시 깨지 않고 기록할 수 있게 하기 위함이다.  
**나열 ≠ 실행 허가.**

---

## 6. Backward Compatibility

| v1 field | v2 |
|----------|-----|
| `student_id` | retained |
| `question_history` | retained |
| `pattern_states` (+ counters) | retained + additive `mastery` |
| `error_states` | retained |
| `recommendation_state` | retained (`next_action=unknown`) |
| `mastery_status` | retained, still `unknown`-only lock |

Migration sketch (conceptual, not executed here):

```text
v1 empty document
  + mastery {unknown, unknown, wo014.2-1.0}
  + transition_history []
  + mastery_policy_reference {WO-014.2, wo014.2-1.0, documented}
  + schemaVersion wo014.2a-2.0
→ valid v2 empty document
```

기존 v1 `pattern_states` 행이 있다면 (미래 ingest 후):  
각 행에 `mastery:{status:unknown,confidence:unknown,policy_version:wo014.2-1.0}`을 추가하고  
`mastery_status`는 `unknown` 유지.

---

## 7. Future Dependency

```text
WO-014.2A Schema Apply (this)
        │
        ▼
Mastery Execution WO (Human/Architecture gate)
  — may write non-unknown mastery.status
  — must append transition_history
  — must respect multi-gate policy (no accuracy-only)
  — candidate_parameters require approval_status≠pending_human
        │
        ▼
Recommendation WO
  — may expand next_action after mastery labels exist
```

Also blocked until separate work:

- Error Taxonomy `verified > 0` for error-driven confidence elevation
- Runtime Persist wiring for Learning State v2 documents

---

## 8. Validation Checklist

| Criterion | Expectation |
|-----------|-------------|
| No Question modification | PASS |
| No Answer modification | PASS |
| No Pattern modification | PASS |
| No mastery execution | PASS (`transition_history=[]`, status unknown) |
| Initial state unknown | PASS |
| Policy reference added | PASS (`documented`) |
| Schema migration documented | PASS (this doc) |

Script: `scripts/wo0142a_validate_policy_apply.py`
