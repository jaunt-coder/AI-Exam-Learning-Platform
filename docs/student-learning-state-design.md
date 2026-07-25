# Student Learning State Design (WO-014)

Version 1.0 — 2026-07-22  
Status: **SCHEMA LOCK** (model only · no student weakness assumed · no recommendation engine)  
Schema: `data/student-learning-state-schema.json`

---

## 1. Purpose

학생 맞춤 AI 학습을 위한 **학습 상태(Student Learning State)** 데이터 모델을 정의한다.

본 문서는 다음을 하지 **않는다**.

- 학생 약점 가정
- 시도(attempt) 없는 mastery 판정
- 추천 로직 구현
- Question / Answer / Pattern Master / Pattern Metadata / Error Taxonomy 수정

초기 상태의 의미는 단 하나다.

> **No learning data exists**

---

## 2. Pipeline Position

```text
Verified Question Data
  + Pattern Knowledge Graph
  + Pattern Metadata
  + Error Taxonomy (Candidate)
        ↓
Student Learning State   ← WO-014 (본 문서)
        ↓
(Future) Recommendation Engine / Coach Planner
```

Knowledge Base(WO-012~013.3)는 **읽기 참조**만 한다.  
Learning State는 학생 행동 사실을 담는 **Learner Plane** 모델이다 (docs/35 D7 방향과 정합).

---

## 3. Schema Explanation

파일: `data/student-learning-state-schema.json`  
Draft: JSON Schema 2020-12

### 3.1 Root fields

| Field | Meaning |
|-------|---------|
| `student_id` | 학습자 식별자 |
| `created_at` / `updated_at` | ISO-8601 |
| `learning_data_status` | WO-014에서는 상수 `empty`만 허용 |
| `pattern_states` | 패턴별 시도 집계 슬롯 (초기 `[]`) |
| `question_history` | 문항 풀이 이력 (초기 `[]`) |
| `error_states` | 오류 taxonomy 발생 슬롯 (초기 `[]`) |
| `recommendation_state.next_action` | 상수 `unknown` |
| `kb_refs` | KB 경로 참조(복사 아님) |

### 3.2 `pattern_states[]`

| Field | Rule |
|-------|------|
| `pattern_id` | Pattern Master에 존재하는 ID. Learning 우선 범위 = `validation_status=verified` |
| `attempt_count` / `correct_count` / `wrong_count` | 관측값만. 초기 시드 금지 |
| `accuracy` | `attempt_count>0`일 때만 계산 가능. 없으면 `null` |
| `mastery_status` | WO-014 enum = **`unknown` only** |
| `last_attempt_date` | 마지막 시도 시각 또는 `null` |

**금지:** Pattern Master 18개를 미리 채워 “unknown mastery”로 가정 약점 그래프를 만들지 않는다.

### 3.3 `question_history[]`

| Field | Rule |
|-------|------|
| `question_id` | 기존 문항 ID만 |
| `pattern_id` | 시도 시점 연결값 (재분류 권한 아님) |
| `answer_result` | `correct` \| `wrong` |
| `timestamp` | ISO-8601 |
| `error_id` | optional / `null` — taxonomy ID만 |

Append-only 이력을 **투영(projection)** 으로 둘 수 있다.  
기존 Coach 키 `coach.attempts.v1` / `questionAttempts`를 대체하지 않는다 (이름 변경 금지).

### 3.4 `error_states[]`

| Field | Rule |
|-------|------|
| `error_id` | `data/error-taxonomy-db.json`의 `errors[].error_id` |
| `occurrence_count` | 학생에게 **관측된** 횟수만 |
| `confidence` | WO-014 enum = **`unknown` only** |

WO-013.3의 `partial`/`pending` taxonomy를 학생 약점으로 승격하지 않는다.  
taxonomy는 “어떤 오류 종류가 존재할 수 있는가”의 KB이고, `error_states`는 “이 학생에게 몇 번 관측되었는가”이다.

### 3.5 `recommendation_state`

| Field | Rule |
|-------|------|
| `next_action` | **`unknown`** |

추천 엔진·우선순위·다음 패턴 선택은 **본 WO OUT**.

---

## 4. Initial State (Empty)

스키마 `examples[0]`과 동일:

```json
{
  "schemaVersion": "wo014-1.0",
  "student_id": "student_placeholder",
  "created_at": "2026-07-22T17:00:00Z",
  "updated_at": "2026-07-22T17:00:00Z",
  "learning_data_status": "empty",
  "kb_refs": {
    "pattern_master": "data/pattern-master-db.json",
    "pattern_metadata": "data/pattern-metadata-db.json",
    "error_taxonomy": "data/error-taxonomy-db.json"
  },
  "pattern_states": [],
  "question_history": [],
  "error_states": [],
  "recommendation_state": {
    "next_action": "unknown"
  }
}
```

해석:

- 약점 없음이 아니라 **데이터 없음**
- mastery / confidence / recommendation 모두 미정 (`unknown` 또는 빈 배열)

---

## 5. State Transition Concept (Design only)

WO-014는 전이 **구현을 하지 않는다**. 개념만 고정한다.

```text
[empty]
  learning_data_status = empty
  arrays = []
  next_action = unknown
        │
        │  (Future) Attempt Ingest WO
        │  — real question_history append
        ▼
[observed]
  learning_data_status → (future enum extension)
  pattern_states / error_states rows created ONLY from attempts
  mastery_status still unknown until Mastery Policy WO
  next_action still unknown until Recommendation WO
        │
        ▼
[policy-applied]   ← 별도 WO + Human/Architecture 승인
  mastery_status enum extension
  error confidence extension
  recommendation next_action extension
```

전이 불변식:

1. attempt 없는 mastery 금지  
2. taxonomy partial을 student weakness로 자동 승격 금지  
3. recommendation 계산 금지 (본 스키마 범위)  
4. Question/Answer/Pattern SoT 수정 금지  

---

## 6. Knowledge Base Linkage

| KB | Role for Learning State |
|----|-------------------------|
| `data/pattern-master-db.json` | `pattern_id` 존재·verified 범위 참조 |
| `data/pattern-metadata-db.json` | 학습 설명 메타(개념/풀이) — 상태 계산에 사용하지 않음 |
| `data/error-taxonomy-db.json` | `error_id` 후보 집합 — occurrence는 학생 시도 후에만 |

Verified Pattern (현재 6):  
`ACC_INV_001`, `ACC_INV_003`, `ACC_INV_004`, `ACC_INV_005`, `ACC_INV_006`, `ACC_INV_007`

Error taxonomy (현재): verified **0** · partial/pending candidates only → Learning State에 자동 반영하지 않음.

---

## 7. Future Recommendation Engine Relation

```text
Student Learning State (observed attempts)
  + Pattern Master / Metadata
  + (verified) Error Taxonomy
        ↓
Recommendation Engine (future WO)
  → recommendation_state.next_action (enum 확장)
  → study plan / next pattern / review set
```

의존 조건:

1. Attempt Ingest가 `question_history`를 실데이터로 채움  
2. Mastery Policy가 `mastery_status` enum을 attempt 기반으로 확장  
3. Error Taxonomy의 `verified` 항목이 충분할 때만 error-driven 추천 허용  
4. docs/33 C4 Planner · docs/08 Recommendation과 **병합 설계** 필요 (키 이름 변경 금지)

본 WO는 위 엔진의 **입력 계약(스키마)** 만 제공한다.

---

## 8. Relation to Existing Coach Storage

| Existing key | Relation |
|--------------|----------|
| `progress` / `wrongAnswers` | Immutable names (Constitution). Projection 후보. |
| `questionAttempts` / `coach.attempts.v1` | Attempt event source 후보. WO-014가 대체하지 않음. |
| `coach.weakness.v1` | Weakness snapshot. Learning State와 혼동 금지. |

WO-014 스키마는 **논리 모델**이다. LocalStorage 키를 새로 강제하지 않으며, Persist WO에서 매핑한다.

---

## 9. Out of Scope

- Recommendation / Planner 구현
- Mastery score 공식 확정
- 학생 mock 약점 데이터 생성
- Question DB · Answer SoT · Pattern Master · Metadata · Error Taxonomy 수정
- Coach C4 실행

---

## 10. Validation Checklist (WO-014)

| Criterion | Status |
|-----------|--------|
| No Question modification | Required |
| No Answer modification | Required |
| No Pattern modification | Required |
| No assumed student state | Required (`empty` + `[]` + `unknown`) |
| Schema generated | `data/student-learning-state-schema.json` |
| Documentation generated | `docs/student-learning-state-design.md` |
