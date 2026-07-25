# Session Export v3

Sprint-06 · WP-04 · WP-10  
Status: **ACTIVE**  
Date: 2026-07-25  
For: `07_User_Research_Analyst`  
Export version: `3.0`  
Schema: `learning.session.v3`

---

## When Export Runs

```text
Finish Today's Study → Session Summary → Export (JSON / Markdown)
```

| 시점 | Export |
|------|--------|
| Pattern 종료 | **금지** |
| Continue Learning | **금지** |
| Evidence Pad (학습 중) | **금지** |
| Session Summary | **허용 (세션당 종료 시 1회 UX)** |

---

## Files

| Format | Filename | MIME |
|--------|----------|------|
| JSON | `session-YYYYMMDD.json` | `application/json` |
| Markdown | `session-YYYYMMDD.md` | `text/markdown` |

---

## JSON Package Shape (v3)

Presentation Layer가 Session 종료 시 조립한다.  
Evidence / Retrieval / Attempt **원본 필드는 변경하지 않는다.**

```json
{
  "schema": "learning.session.v3",
  "export_version": "3.0",
  "for_analyst": "07_User_Research_Analyst",
  "session_id": "session-20260725",
  "created_at": "2026-07-25T02:00:00.000Z",
  "exported_at": "2026-07-25T03:30:00.000Z",
  "duration_ms": 5400000,
  "duration_minutes": 90,
  "patterns": [
    {
      "pattern_id": "ACC_INV_001",
      "name": "기말재고 포함 여부",
      "learned": true,
      "reviewed": true
    }
  ],
  "questions": [
    {
      "question_id": "ACC_2018_Q042",
      "pattern_id": "ACC_INV_001",
      "result": "correct",
      "timestamp": "..."
    }
  ],
  "retrievals": [],
  "evidence": [],
  "summary": {
    "pattern_count": 3,
    "question_count": 21,
    "evidence_count": 18,
    "retrieval_count": 16,
    "study_mode": "pattern_master"
  }
}
```

### Field Notes

| Field | Meaning |
|-------|---------|
| `session_id` | 날짜 기반 Session 식별자 |
| `patterns[]` | 오늘 익힌/복습한 Pattern 전체 |
| `questions[]` | 세션 구간 Attempt 요약 (채점 결과 참조만) |
| `retrievals[]` | 세션 구간 Retrieval 전체 |
| `evidence[]` | 세션 구간 Evidence 전체 |
| `duration` | `duration_ms` + `duration_minutes` |
| `created_at` | Session `startedAt` ISO |

v2.1 패키지 필드(`session_summary`, `growth_summary` 등)는  
호환을 위해 Presentation에서 v3로 **재조립**한다. Runtime DB는 수정하지 않는다.

---

## Markdown Sections (v3)

```markdown
# 오늘 공부 요약

- session_id
- duration
- created_at / exported_at

## Pattern
(오늘 익힌 Pattern 목록)

## Question
(문항 수 · 문항 id 목록)

## Evidence
(건수 + 레코드)

## Retrieval
(건수 + 레코드)

## Today's Reflection
(Evidence memo / understanding 집계 힌트 — 분석·점수 없음)
```

---

## Guarantees

- Question / Answer / Pattern / Knowledge DB **미포함·미변경**
- Mastery / Recommendation / AI 필드 **없음**
- Pattern 단위 mid-session Export **제거**
- Session 전체 Pattern이 JSON·Markdown에 **모두** 포함

---

## Compatibility

| Version | Scope |
|---------|-------|
| v2.0 / v2.1 | Pattern≈Session Closing + Sidebar Export (deprecated UX) |
| **v3.0** | Session Finish only · multi-Pattern |

Analyst Import는 `export_version: "3.0"` 및 `schema: learning.session.v3`로 식별한다.
