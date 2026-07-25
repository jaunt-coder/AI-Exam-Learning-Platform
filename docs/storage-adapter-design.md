# Storage Adapter Design

Sprint-07 · WP-05  
Status: **ACTIVE**  
Date: 2026-07-26

---

## Purpose

Study State 저장소를 **Adapter**로 추상화하여  
Local → GitHub → Firebase로 교체해도 Sync Service API가 변하지 않게 한다.

---

## Hierarchy

```text
Storage Adapter (contract)
        ↓
Local Adapter          ← Implemented
        ↓
GitHub Adapter         ← Interface only
        ↓
Firebase Adapter       ← Interface only
```

---

## Files

| File | Role |
|------|------|
| `runtime/storage-adapter.js` | Contract · `SYNC_STATE_KEYS` · `APPEND_ONLY_KEYS` |
| `runtime/local-storage-adapter.js` | LocalStorage 구현 |
| `runtime/cloud-adapter-interface.js` | GitHub/Firebase stub interface |
| `runtime/sync-service.js` | Adapter 소비자 |

---

## Contract

```text
kind · name
isAvailable()
get(key) · set(key, value) · remove(key)
getMany(keys) · setMany(entries)
```

Cloud Adapter 추가:

```text
capabilities { push, pull, realtime, auth }
connect() · disconnect()
pushStudyState(bundle)
pullStudyState()
```

---

## Local Adapter (current)

- Backend: `window.localStorage` via `js/storage.js`
- Offline: **always available** when browser storage works
- Used as default in `sync-service.setAdapter`

---

## GitHub Adapter (future)

Intended (not implemented):

- Private Gist or repo file `sync-state.json`
- PAT / device flow auth
- push/pull only Study State package

Sprint-07: `createGitHubAdapterInterface()` returns `isAvailable() === false`.

---

## Firebase Adapter (future)

Intended (not implemented):

- Auth + Firestore document per student
- Optional realtime listener

Sprint-07: `createFirebaseAdapterInterface()` returns `isAvailable() === false`.

---

## Swap Rule

```text
setAdapter(createLocalStorageAdapter())     // default
// future:
setAdapter(createFirebaseAdapter())         // when implemented
```

Sync Service의 `save/load/merge` 시그니처는 유지한다.

---

## Safety

Adapters **must not**:

- Write Question / Answer / Pattern / Knowledge JSON files
- Call Recommendation / Mastery engines
- Delete append-only logs during merge
