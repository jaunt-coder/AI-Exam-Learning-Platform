# Knowledge Inventory Schema — SHA256 Source Inventory

Sprint: `KS-ACC-LOSSLESS-GOLDEN`  
WO: `WO-20260722-009`  
Status: **HUMAN CONFIRMED (SCHEMA CONFIRM WO-009)** · Inventory Persist **DONE**  
Confirm: 2026-07-23 · Outputs: `past-exams-inventory.json` · `original-exams-inventory.json` · `inventory-run-manifest.json`

---

## 1. Purpose

Read-only snapshot of exam source bytes for immutable reference before any extraction / Human Export ingress.

---

## 2. Roots (read-only)

| root_id | path | notes |
|---------|------|-------|
| `past_exams` | `source/past-exams` | Golden SoT primary |
| `original_exams` | `source/original-exams` | immutable; inventory even if empty |

**Never write** into either root (no sidecar `.sha256` beside originals).

---

## 3. Output files (after Human CONFIRM + Gate A)

| File | Content |
|------|---------|
| `data/knowledge/inventory/past-exams-inventory.json` | all files under past-exams |
| `data/knowledge/inventory/original-exams-inventory.json` | all files under original-exams (or empty entries[]) |
| `data/knowledge/inventory/inventory-run-manifest.json` | run metadata + unchanged proof |

---

## 4. Document schema — `*-inventory.json`

```json
{
  "schemaVersion": "1.0.0",
  "generatedAt": "ISO-8601",
  "sprintId": "KS-ACC-LOSSLESS-GOLDEN",
  "woId": "WO-20260722-009",
  "rootId": "past_exams",
  "rootPath": "source/past-exams",
  "algorithm": "SHA-256",
  "entryCount": 0,
  "entries": [
    {
      "path": "source/past-exams/2018/exam_2.pdf",
      "year": 2018,
      "role": "exam_2",
      "ext": "pdf",
      "bytes": 0,
      "sha256": "<lowercase hex>",
      "mtimeUtc": "ISO-8601|null"
    }
  ],
  "gaps": [
    {
      "year": 2017,
      "missing": ["folder", "exam_1", "exam_2", "answer"]
    }
  ]
}
```

### Field rules

| Field | Rule |
|-------|------|
| `path` | repo-relative · forward slashes |
| `year` | int from `YYYY/` folder; root loose files → `year: null` + `role: "legacy_root"` |
| `role` | `exam_1` \| `exam_2` \| `answer` \| `legacy_root` \| `other` |
| `ext` | lowercase without dot (`pdf`, `hwp`, `hwpx`, …) |
| `bytes` | file size at hash time |
| `sha256` | SHA-256 hex lowercase |
| `mtimeUtc` | optional; null if unavailable |

### Golden ACC reference subset (derived, not separate SoT)

Filter: `rootId=past_exams` ∧ `year∈[2018,2026]` ∧ `role∈{exam_2,answer}`

---

## 5. Run manifest schema — `inventory-run-manifest.json`

```json
{
  "schemaVersion": "1.0.0",
  "woId": "WO-20260722-009",
  "startedAt": "ISO-8601",
  "finishedAt": "ISO-8601",
  "mode": "read_only_sha256",
  "rootsScanned": ["source/past-exams", "source/original-exams"],
  "outputs": [
    "data/knowledge/inventory/past-exams-inventory.json",
    "data/knowledge/inventory/original-exams-inventory.json"
  ],
  "sourceWriteCount": 0,
  "forbiddenActionsExecuted": [],
  "proof": {
    "method": "preflight_file_list + postflight_identical_paths_bytes_optional_remeasure",
    "sourceUnchanged": true,
    "notes": "No files created/modified/deleted under source/"
  }
}
```

### Unchanged proof (Success Criterion 3)

1. Preflight: list `(path, bytes)` under both roots  
2. Hash pass: read-only  
3. Postflight: same `(path, bytes)` set  
4. `sourceWriteCount` must be `0`  
5. Verification FAIL if any source path appeared/disappeared or bytes changed

---

## 6. OUT (schema-level)

This inventory WO must not produce or invoke:

- extraction · OCR · convert · HWP export  
- question-db · pattern-db · parser changes  
- D3/D4 writes

---

## 7. Human CONFIRM checklist

- [x] `schemaVersion` `1.0.0` 수용 — **SCHEMA CONFIRM WO-009**
- [x] required entry fields: `path`, `year`, `role`, `ext`, `bytes`, `sha256`
- [x] outputs only under `data/knowledge/inventory/`
- [x] source sidecar hash 금지
- [x] Persist 승인 → 해시 실행 완료 (2026-07-23)

**Confirm text:** `SCHEMA CONFIRM WO-009`
