# Retrieval Prompt Spec (M2.7)

Status: **ACTIVE**  
Schema: `learning.retrieval.v1`  
Storage: `learning.retrieval.v1` (append-only)

---

## Principle

학생이 **직접 작성**한다.

- AI 채점 금지
- 정답 비교 금지
- 자동 평가 금지
- **저장만** 수행

---

## Default Prompt

```
이번 Pattern에서
시험장에서
가장 먼저 확인해야 하는 것은?
```

코드 상수: `DEFAULT_RETRIEVAL_PROMPT`  
Pattern 자산(exam_first 등)을 정답으로 쓰지 않는다.

---

## Flow Position

```
Review → Retrieval Prompt → Evidence → Closing
```

---

## Schema

```json
{
  "schema_version": "learning.retrieval.v1",
  "retrieval_id": "ret_...",
  "pattern_id": "ACC_INV_001",
  "question_id": "ACC_2018_Q042",
  "attempt_id": "evt_m1_...",
  "session_id": "session-20260724",
  "retrieval_prompt": "이번 Pattern에서 시험장에서 가장 먼저 확인해야 하는 것은?",
  "question": "이번 Pattern에서 시험장에서 가장 먼저 확인해야 하는 것은?",
  "student_response": "발송시점을 먼저 본다",
  "answered": true,
  "char_count": 12,
  "created_at": "2026-07-24T00:00:00.000Z",
  "study_mode": "pattern_master",
  "future": {
    "for_recommendation": true,
    "for_coach": true,
    "evaluated": false,
    "scored": false
  }
}
```

| Field | Notes |
|-------|--------|
| `retrieval_prompt` / `question` | 동일 프롬프트 (스키마 호환) |
| `answered` | `student_response` 비어 있지 않으면 true |
| `char_count` | 길이만 저장 · 품질 점수 아님 |
| `future.*` | WO-015/016 재사용 예약 · **현재 미사용** |

---

## Draft

Key: `learning.retrieval.draft.v1`  
`question_id` → `{ student_response, retrieval_prompt, savedAt }`

---

## UI Rules

- 지난번 회상이 있으면 인용 후 “이번에는 어떻게 설명하겠습니까?”
- 저장 성공 후 Evidence Pad 자동 Open
- 연구 용어(Observation / Strength / Candidate) 비표시
