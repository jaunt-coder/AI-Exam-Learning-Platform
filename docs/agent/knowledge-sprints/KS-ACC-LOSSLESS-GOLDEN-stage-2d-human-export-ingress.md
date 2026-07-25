# Stage 2-D — Human Export Ingress Design

Sprint: **KS-ACC-LOSSLESS-GOLDEN**  
WO: **WO-20260722-010**  
Depends: **WO-20260722-009** (`past-exams-inventory.json` · `sourceUnchanged=true`)  
Policy: HWP **D = Primary Human Export** · **A = Probe Only**  
Status: **DESIGN PERSISTED · EXPORT EXECUTION FORBIDDEN**

---

## 1. Purpose

HWP 원본을 변환·자동 파싱으로 Golden에 넣지 않는다.  
Human이 만든 lossless export를 staging에 올리고, **source SHA256**과 묶어 검증한 뒤야 Candidate 경로로 보낸다.

PDF는 text-layer 우선(별도 extract WO). 본 문서는 Ingress **계약**만 정의한다.

---

## 2. Official HWP Path (Success Criterion 1)

```text
source/past-exams/YYYY/answer.hwp | exam_*.hwp   ← SoT (immutable)
        │
        │  Human Export (offline · 본 WO 비실행)
        ▼
data/knowledge/raw/hwp-export/YYYY/<role>/...    ← staging only
        │
        │  metadata + hash link + verification
        ▼
VERIFY_EXPORT (Human)                            ← Ingress gate
        │
        ▼
data/knowledge/raw/attested/YYYY/...             ← verified pointer/copy policy
        │
        ▼
(candidate extract — 후속 WO · 본 Stage OUT)
```

| Path | Status |
|------|--------|
| **D Human Export** | **공식 · Primary · Golden 허용 전제** |
| **A HWP Probe** | Probe report only · **Candidate/Golden 승격 금지** |
| HWP→PDF / LibreOffice | **Golden 금지** |

“Fallback” 용어: 초기 007의 A-primary 대비 **현행 공식 경로 = D**. A는 fallback이 아니라 **probe-only**.

---

## 3. Staging Structure (Success Criterion 3)

```text
data/knowledge/raw/
├── _ingress/
│   └── SCHEMA.md                 # 본 계약 요약·필드 정의
├── hwp-export/                   # Human이 올린 미검증 export
│   └── YYYY/
│       ├── exam_1/               # 해당 연도 HWP일 때만
│       ├── exam_2/
│       └── answer/
├── hwp-probe/                    # A-probe only (non-Golden)
│   └── YYYY/
├── pdf-text/                     # 향후 PDF text extract (본 WO 비적재)
│   └── YYYY/
├── attested/                     # VERIFY_EXPORT 통과분만
│   └── YYYY/
│       ├── exam_1/
│       ├── exam_2/
│       └── answer/
└── rejected/                     # 검증 실패 · 재작업 큐
    └── YYYY/
```

### Naming (export payload)

| Kind | Suggested name | Notes |
|------|----------------|-------|
| Plain text | `{role}.txt` | UTF-8 · lossless 문단 우선 |
| Tables | `{role}.tables.json` 또는 `.tsv` | 표 구조 유지 |
| Bundle manifest | `{role}.export.json` | **필수** — §4 메타 |
| Optional PDF render | `{role}.preview.pdf` | **참고만** · Golden 증거 아님 |

`source/**` 아래에는 export를 **절대** 두지 않는다.

---

## 4. Source ↔ Export Metadata Schema (Success Criterion 2)

파일: `data/knowledge/raw/hwp-export/YYYY/{role}/{role}.export.json`

```json
{
  "schemaVersion": "1.0.0",
  "sprintId": "KS-ACC-LOSSLESS-GOLDEN",
  "woIngress": "WO-20260722-010",
  "exportedAt": "ISO-8601",
  "exporter": {
    "name": "<human-id-or-initials>",
    "tool": "<예: 한글 직접 복사 | 기타>",
    "notes": "<optional>"
  },
  "source": {
    "path": "source/past-exams/2018/answer.hwp",
    "year": 2018,
    "role": "answer",
    "ext": "hwp",
    "sha256": "<from WO-009 inventory · must match>",
    "bytes": 0,
    "inventoryRef": "data/knowledge/inventory/past-exams-inventory.json"
  },
  "export": {
    "stagingDir": "data/knowledge/raw/hwp-export/2018/answer/",
    "files": [
      {
        "path": "data/knowledge/raw/hwp-export/2018/answer/answer.txt",
        "sha256": "<hex>",
        "bytes": 0,
        "mediaType": "text/plain; charset=utf-8"
      }
    ]
  },
  "losslessClaim": {
    "textComplete": true,
    "tablesComplete": true,
    "formulasComplete": true,
    "knownGaps": []
  },
  "verification": {
    "status": "pending",
    "verifiedAt": null,
    "verifiedBy": null,
    "attestedDir": null,
    "checklist": {
      "sourceHashMatchesInventory": null,
      "exportFilesPresent": null,
      "spotCheckAgainstSource": null
    }
  }
}
```

### Binding rules

1. `source.sha256` **MUST** equal WO-009 inventory entry for `source.path`.  
2. Mismatch → `verification.status=rejected` · Ingress 중단.  
3. Inventory 재생성 시 attested 재검증 필요 (hash drift).  
4. Preview PDF hash는 metadata에 넣어도 되나 `goldenEvidence=false` 고정.

---

## 5. Export Verification Workflow (Success Criterion 4 — Verify points)

```text
[H1] Human performs offline export
[H2] Place files under hwp-export/YYYY/{role}/ + *.export.json
[V1] Automated checks (future tooling · 본 WO 설계만)
       - path exists · export sha256 computed
       - source.sha256 == inventory
       - required losslessClaim fields present
[H3] VERIFY_EXPORT (Human)
       - open source HWP read-only
       - spot-check paragraphs / tables / answers
       - mark checklist + status=attested|rejected
[A1] On attested: record attestedDir under raw/attested/YYYY/{role}/
       (copy or promote-by-reference — 구현 WO에서 선택, source 미변경)
[H4] Later: Candidate extract from attested only
[H5] ACC Human Verify 100% on Candidate → Golden (기존 Policy)
```

### Human Verify 지점 요약

| ID | Gate | Who | Input | Output |
|----|------|-----|-------|--------|
| **VERIFY_EXPORT** | Ingress | Human | hwp-export + source SoT | attested / rejected |
| **VERIFY_QUESTION** | Post-candidate | Human | candidate questions | golden / rework |
| Probe review | Optional | Human/Eng | hwp-probe | metrics only · no promote |

ACC 2018–2026: **VERIFY_QUESTION = 100%** (Policy 유지).  
VERIFY_EXPORT는 HWP(및 Human이 export한 대상) **파일 단위** 선행 조건.

---

## 6. Per-file Processing Policy (HWP / PDF)

### 6.1 From WO-009 inventory (past-exams)

| Condition | Ingress policy |
|-----------|----------------|
| `ext=hwp` · `role∈{exam_1,exam_2,answer}` | **Must** use D Human Export before Candidate |
| `ext=pdf` · text-layer (future detect) | PDF text path (`raw/pdf-text/`) · **not** HWP export |
| `ext=pdf` · image-only | OCR queue only · OCR **OFF** until dedicated WO |
| `role=exam_2` + `answer` · ACC Golden | ACC SoT pair · export answer(H WP) + exam_2 per format |
| `year=2019` all HWP | exam_1/exam_2/answer **전부** D-export 대상 |
| `year∈2018,2020–2026` answer HWP | answer → D-export; exam_2 PDF → PDF policy |
| Probe A | Optional anytime · never attested for Golden |

### 6.2 ACC Pilot priority (for WO-011 prep — not executed here)

권장 파일 순서 (설계 힌트):

1. `answer.hwp` (전년) — 정답 키  
2. `exam_2` (pdf 또는 hwp) — 회계·관계법 booklet  
3. `exam_1` — ACC Golden 비주력 · 후순위

### 6.3 original-exams

WO-009: **0 files**. Ingress 대상 없음. 파일 추가 시 009 inventory 재실행 후 동일 스키마 적용.

---

## 7. Success Criteria Checklist

| # | Criterion | Design locus |
|---|-----------|--------------|
| 1 | HWP 공식 경로 = D Human Export | §2 |
| 2 | export ↔ source hash 연결 | §4 `source.sha256` + inventoryRef |
| 3 | staging 구조 확정 | §3 |
| 4 | Human Verify 지점 | §5 VERIFY_EXPORT + VERIFY_QUESTION |

---

## 8. Explicit Non-Goals (본 WO)

- 실제 Human Export 파일 적재  
- OCR · extraction · question/pattern DB  
- source / parser 수정  
- attested 디렉터리 실파일 생성 (스키마·경로만)

---

## 9. Next — WO-011 Pilot Extraction 준비

선행:

1. Human **DESIGN_ACCEPT** on WO-010  
2. (권장) 1개년 ACC 샘플에 대해 Human이 export 적재 + VERIFY_EXPORT  
3. WO-011: Pilot 범위(연도·문항 수)·attested-only 입력·추출 OUT/IN 재고정  

Pilot도 **source immutable · parser OUT · D3/D4 OUT** 유지.
