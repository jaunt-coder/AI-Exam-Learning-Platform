# Sync Policy

Sprint-07 · WP-03 · WP-04  
Status: **ACTIVE**  
Date: 2026-07-26

---

## Local First

```text
LocalStorage
    ↓
Cloud (future)
    ↓
Merge
    ↓
Update UI
```

1. 모든 학습 쓰기는 **먼저 Local**에 반영한다.
2. 오프라인에서도 Attempt / Evidence / Retrieval / Session이 동작해야 한다.
3. Cloud는 선택적 후처리다. Cloud 실패가 학습을 막지 않는다.

---

## Conflict Policy (WP-04)

동일 Session을 PC와 태블릿이 동시에 수정한 경우:

| Data | Policy | Rule |
|------|--------|------|
| Attempt | **Append Only** | `event_id` 기준 union · **No Delete** |
| Evidence | **Append Only** | id/타임스탬프 키 union · **No Delete** |
| Retrieval | **Append Only** | id/타임스탬프 키 union · **No Delete** |
| Session | **Newest Wins** + set-union | `finishedAt`/`startedAt` 비교 · `patternsLearned`는 합집합 |
| Progress | **Newest Wins** | `updated_at` 비교 · resume는 더 새 meta 우선 |
| Learning State | Merge | student별 newest + history union |
| Sync Meta | Newest / bump | import 후 revision 증가 |

### Invariants

- **No Delete** — merge는 기록을 제거하지 않는다.
- **No SoT Write** — Question/Answer/Pattern/Knowledge에 쓰지 않는다.
- **No Silent Drop** — 충돌 시 `conflicts[]`로 보고한다.

---

## Detection

`sync-service.detectConflicts(incoming)`  
`sync-service.merge(incoming)` — 탐지 + 적용

충돌이 있어도 merge는 성공한다.  
정책에 따라 자동 해결하며, UI는 conflict count만 안내한다.

---

## Dirty / Pending

| Flag | Meaning |
|------|---------|
| `dirty: true` | Local 변경 후 Cloud/Export 미반영 |
| `dirty: false` | Export 또는 Import 직후 정리 |

Badge **Sync Pending** = `dirty && online`.

---

## Resume vs Restart

| Action | Effect on logs |
|--------|----------------|
| Continue | resume snapshot으로 flow 복귀 · 로그 유지 |
| Restart | resume 제거 · Attempt/Evidence/Retrieval **삭제 안 함** |

---

## Non-Goals

- Realtime CRDT
- Server authoritative clock
- AI-assisted conflict resolution
- Automatic cloud push (Future Sprint)
