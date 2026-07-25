# Evidence Export v2 (07 Analyst Ready)

Status: **ACTIVE**  
For: `07_User_Research_Analyst`  
Export version: `2.0`  
Schema: `learning.evidence.v2`

---

## Files

세션 종료(Closing) 또는 Sidebar Export:

| Format | Filename | MIME |
|--------|----------|------|
| JSON | `session-YYYYMMDD.json` | `application/json` |
| Markdown | `session-YYYYMMDD.md` | `text/markdown` |

예: `session-20260724.json`, `session-20260724.md`

---

## JSON Package Shape

Export version **2.1** includes Retrieval.

```json
{
  "schema": "learning.evidence.v2",
  "export_version": "2.1",
  "for_analyst": "07_User_Research_Analyst",
  "session_id": "session-20260724",
  "exported_at": "2026-07-24T00:00:00.000Z",
  "session_summary": {
    "evidence_count": 12,
    "retrieval_count": 12,
    "attempt_count": 12,
    "patterns_learned": ["ACC_INV_001"],
    "patterns_reviewed": ["ACC_INV_001"],
    "study_mode": "pattern_master",
    "started_at": "..."
  },
  "growth_summary": {
    "evidence_today": 12,
    "retrieval_today": 12,
    "patterns_learned": ["ACC_INV_001"]
  },
  "pattern_summary": [
    { "pattern_id": "ACC_INV_001", "evidence_count": 12, "retrieval_count": 12 }
  ],
  "attempts": [],
  "evidence": [],
  "retrieval": []
}
```

### Evidence record (v2)

```json
{
  "schema_version": "learning.evidence.v2",
  "question_id": "ACC_2018_Q042",
  "pattern_id": "ACC_INV_001",
  "attempt_id": "evt_m1_...",
  "session_id": "session-20260724",
  "student_answer": 3,
  "correct_answer": 3,
  "is_correct": true,
  "study_mode": "pattern_master",
  "timestamp": "...",
  "pattern_understanding": "understood",
  "difficulty_reasons": ["concept"],
  "exam_retry": "can",
  "explain_friend": "maybe",
  "want_retry": false,
  "memo": "원가 비교를 먼저"
}
```

---

## Markdown Sections

1. Header + analyst meta  
2. Session Summary  
3. Pattern Summary  
4. Evidence Records  
5. Attempts (context)

07 Analyst는 MD를 1차 리뷰용, JSON을 집계·필터용으로 사용한다.

---

## Guarantees

- Question DB / Answer SoT / Pattern DB **미포함·미변경**
- Mastery / Recommendation / AI 필드 **없음**
- append-only Evidence log에서 세션 구간만 패키징

---

## Import Checklist (07)

1. `session-*.json` 로드  
2. `for_analyst === "07_User_Research_Analyst"` 확인  
3. `export_version === "2.0"`  
4. `evidence[]` 길이 ≥ Pilot 목표(예: 20) 여부 점검  
5. `pattern_understanding` / `exam_retry` / `explain_friend` 분포 요약
