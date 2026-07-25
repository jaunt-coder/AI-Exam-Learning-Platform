# Cloud Study Foundation

Sprint-07 · Study State Sync Layer  
Status: **IMPLEMENTED (Local First)**  
Date: 2026-07-26

---

## Goal

집 PC · 회사 PC · 태블릿 · 휴대폰에서  
**동일한 학습 상태**를 이어갈 수 있는 기반을 만든다.

이번 Sprint는 **Cloud Push를 완성하지 않는다.**  
Local First + Adapter + File Transfer(`sync-state.json`)로 Foundation만 깐다.

---

## What Syncs

Student Study State **only**:

| Key | Role | Mutability |
|-----|------|------------|
| `learning.progress.v1` | Resume · touched patterns | Upsert / Newest |
| `learning.attempts.v1` | Attempt log | **Append Only** |
| `learning.evidence.v1` | Evidence log | **Append Only** |
| `learning.retrieval.v1` | Retrieval log | **Append Only** |
| `learning.session.v1` | Today's Session meta | Newest + set-union |
| `learning.state.v1` | Student counters | Merge |
| `learning.sync.meta.v1` | Sync revision / dirty | Meta |

---

## What Never Syncs

| Asset | Rule |
|-------|------|
| Question DB | READ ONLY · Sync 패키지 미포함 |
| Answer DB | READ ONLY · Sync 패키지 미포함 |
| Pattern DB | READ ONLY · Sync 패키지 미포함 |
| Knowledge | READ ONLY · Sync 패키지 미포함 |

AI Coach · Recommendation · Mastery · Evidence 평가 · Difficulty 자동계산  
**미구현 · 동기화 대상 아님.**

---

## Architecture

```text
UI (learning-loop / settings)
        ↓
js/session-resume.js
js/import-export-v4.js
        ↓
runtime/sync-service.js
  save · load · merge · version · conflict detection
        ↓
Storage Adapter
  ├── LocalStorageAdapter   ← 현재 구현
  ├── GitHubAdapter         ← Interface only
  └── FirebaseAdapter       ← Interface only
```

### Local First Flow

```text
LocalStorage 쓰기
  → dirty = true
  → (offline OK)
  → Export sync-state.json 또는 (미래) Cloud push
  → 다른 기기 Import / pull
  → merge()
  → UI 갱신
```

---

## Multi-Device Today (no cloud account)

1. 기기 A에서 공부
2. Settings 또는 Session Summary에서 **Export sync-state.json**
3. 기기 B에서 Settings → **Import sync-state.json**
4. Resume Study? 로 이어서 학습

---

## Status Badge

| Status | Meaning |
|--------|---------|
| Cloud Ready | Foundation 준비 · Local Adapter · dirty 없음 |
| Local Mode | (예약) Local 전용 표시 |
| Offline | `navigator.onLine === false` |
| Sync Pending | Local 변경 후 Cloud 미반영(파일 Export 전) |

**실제 Cloud Sync는 수행하지 않는다.**

---

## Entry Points

| Page | Role |
|------|------|
| `learning-loop.html` | Resume · Session Export v3 + sync-state v4 |
| `settings.html` | Cloud Ready badge · Import/Export v4 |

---

## Principle

```text
Cloud Sync
   ↓
Student State만 동기화
```
