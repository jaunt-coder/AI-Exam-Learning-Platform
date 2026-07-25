# Evidence Schema v2 (+ Retrieval)

Status: **ACTIVE**  
Evidence schema: `learning.evidence.v2`  
Retrieval schema: `learning.retrieval.v1`  
Export: `2.1`

---

## Evidence Record

Storage key: `learning.evidence.v1`

```json
{
  "schema_version": "learning.evidence.v2",
  "question_id": "",
  "pattern_id": "",
  "attempt_id": null,
  "session_id": null,
  "student_answer": null,
  "correct_answer": null,
  "is_correct": null,
  "correct": null,
  "study_mode": null,
  "timestamp": "",
  "pattern_understanding": "understood|unclear|not_understood",
  "difficulty_reasons": ["calc", "concept", "interpretation", "trap", "time", "focus"],
  "exam_retry": "can|maybe|cannot",
  "explain_friend": "can|maybe|cannot",
  "want_retry": false,
  "memo": "",
  "future": {
    "for_recommendation": true,
    "for_coach": true,
    "evaluated": false,
    "scored": false
  }
}
```

`correct` ≡ `is_correct` (WP-02 / WP-15 별칭).

---

## Retrieval Record

Storage key: `learning.retrieval.v1`  
See `docs/retrieval-prompt-spec.md`.

---

## Session Export Package (v2.1)

```json
{
  "schema": "learning.evidence.v2",
  "export_version": "2.1",
  "for_analyst": "07_User_Research_Analyst",
  "session_id": "session-YYYYMMDD",
  "exported_at": "",
  "session_summary": {},
  "growth_summary": {
    "evidence_today": 0,
    "retrieval_today": 0,
    "patterns_learned": []
  },
  "pattern_summary": [],
  "attempts": [],
  "evidence": [],
  "retrieval": []
}
```

Files: `session-YYYYMMDD.json` · `session-YYYYMMDD.md`

---

## Guarantees

- Question / Answer / Pattern DB 미변경
- Mastery / Recommendation / AI 평가 필드 없음 (`future.evaluated` 항상 false)
- append-only · LocalStorage only
