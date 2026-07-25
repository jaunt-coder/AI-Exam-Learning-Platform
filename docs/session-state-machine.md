# Session State Machine

Sprint-06 · WP-01 · WP-02 · WP-11  
Status: **ACTIVE**  
Date: 2026-07-25

---

## States

```text
IDLE
  → SESSION_ACTIVE
  → PATTERN_FLOW
  → PATTERN_CLOSING
  → SESSION_SUMMARY
  → SESSION_FINISHED
```

| State | UI | Export |
|-------|-----|--------|
| `IDLE` | Today's Study (세션 미시작 또는 대기) | 불가 |
| `SESSION_ACTIVE` | Today's Study + Session Progress | 불가 |
| `PATTERN_FLOW` | Preview…Evidence | 불가 |
| `PATTERN_CLOSING` | Continue / Finish 선택 | **불가** |
| `SESSION_SUMMARY` | 오늘 집계 | **가능** |
| `SESSION_FINISHED` | Home 복귀 후 종료 표시 | 재진입 시 Summary만 |

---

## Transitions

```text
[IDLE / SESSION_ACTIVE]
        │ start Pattern
        ▼
[PATTERN_FLOW]
        │ last Question Evidence saved + Next
        ▼
[PATTERN_CLOSING]
        │
        ├─ Continue Learning ──► [SESSION_ACTIVE] ──► Pattern 선택
        │
        └─ Finish Today's Study ──► [SESSION_SUMMARY]
                                          │ Export (optional, once UX)
                                          ▼
                                   [SESSION_FINISHED]
                                          │ (같은 날 추가 학습)
                                          ▼
                                   [SESSION_ACTIVE]  (새 Pattern 가능)
```

---

## Events

| Event | From | To | Side effect |
|-------|------|-----|-------------|
| `START_PATTERN` | ACTIVE / IDLE | PATTERN_FLOW | lesson 로드 |
| `COMPLETE_PATTERN` | PATTERN_FLOW | PATTERN_CLOSING | patternsLearned 반영 유지 |
| `CONTINUE_LEARNING` | PATTERN_CLOSING | SESSION_ACTIVE | Export 없음 · Home |
| `FINISH_TODAY` | PATTERN_CLOSING | SESSION_SUMMARY | `finishedAt` 기록 |
| `EXPORT_SESSION` | SESSION_SUMMARY | SESSION_SUMMARY | `exportedAt` 기록 · 파일 다운로드 |
| `LEAVE_SUMMARY` | SESSION_SUMMARY | SESSION_FINISHED | Home |

---

## Invariants

1. **Pattern 종료 ≠ Session 종료**
2. **Export는 `SESSION_SUMMARY`에서만** 트리거 가능
3. Evidence / Retrieval은 Pattern 흐름 중 append-only 유지
4. Continue 시 Session `startedAt` 유지 (같은 오늘 공부)
5. Mastery는 항상 `unknown` · Recommendation 이벤트 없음

---

## Pattern Sub-machine (unchanged content)

```text
preview → intro → algorithm → knowhow → checklist
  → question → result → review → retrieval → evidence
  → (next question | PATTERN_CLOSING)
```

Exam Mode는 Lesson 앞단을 생략할 뿐, Session 경계는 동일하다.

---

## Future Hooks (no architecture change)

| Hook point | Consumer |
|------------|----------|
| `FINISH_TODAY` 직전 | WO-015 Session Finish reflection (optional) |
| `SESSION_ACTIVE` 진입 | WO-016 Planner Pattern 목록 주입 |
| `EXPORT_SESSION` 후 | 07 Analyst Import (기존) |

훅은 **이벤트를 구독**한다. Session 상태를 대체하지 않는다.

---

## Persistence Map

| Key | Owner |
|-----|-------|
| `learning.session.v1` | Session state machine |
| `learning.evidence.v1` | Evidence (Pattern scoped records) |
| `learning.retrieval.v1` | Retrieval (Pattern scoped records) |
| `learning.attempts.v1` | Attempts |
| `learning.todayPattern.v1` | Last selected Pattern |

---

## Validation Walkthrough

```text
Pattern A → Closing → Continue
  → Pattern B → Closing → Continue
  → Pattern C → Closing → Finish
  → Summary → Export
```

각 Pattern Closing에서 Export UI가 없어야 한다.  
Export는 마지막 Summary에서만 존재해야 한다.
