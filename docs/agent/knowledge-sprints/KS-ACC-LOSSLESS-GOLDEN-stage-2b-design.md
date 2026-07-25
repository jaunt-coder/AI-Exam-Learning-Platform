# Stage 2-B — Extraction Tooling Design

Sprint: **KS-ACC-LOSSLESS-GOLDEN**  
WO: **WO-20260722-008** (Design Only) → **WO-20260722-008b** (Design Document Persist)  
Parent Policy: **WO-20260722-007** Human Policy Adopt  
Gate A: **APPROVE WITH AMENDMENTS** (2026-07-23)  
Status: **DESIGN PERSISTED · EXECUTION FORBIDDEN**

> 본 문서는 설계만 고정한다. Extraction / OCR / Question·Pattern DB / Parser / source 수정은 **금지**.

---

## 0. Gate A Amendments (바인딩)

| 항목 | 확정 |
|------|------|
| Stage 2-B | **Design Only** |
| HWP | **D = Primary (Human Export)** · **A = Probe Only** |
| `source/past-exams/**` | 원본 불변 |
| `source/original-exams/**` | 원본 불변 |
| Parser (`scripts/parser/`) | 수정 금지 |
| OCR | 실행 금지 (별도 WO + Gate A 전 OFF) |
| Question DB / Pattern DB | 생성 금지 |

### Policy Supersession

| Topic | WO-007 Adopt (초기) | Gate A 008 Amendment (**현행**) |
|-------|---------------------|----------------------------------|
| HWP Primary | A Direct Parse | **D Human Export** |
| HWP Secondary | D Fallback | **A Probe Only** (Golden 경로 아님) |
| HWP→PDF / LibreOffice Golden | 금지 | **금지 유지** |

---

## 1. Golden Source of Truth

### ACC (2018–2026)

```text
source/past-exams/YYYY/exam_2.(pdf|hwp)  +  source/past-exams/YYYY/answer.(pdf|hwp)
```

### 향후 Subject Map (Split Stage · 본 Stage 비실행)

| Slot | Subjects |
|------|----------|
| `exam_1` | 민법 / 경제 / 부동산학원론 |
| `exam_2` | 관계법 / 회계학 |

### Immutable Roots

- `source/past-exams/**` — rename / convert / overwrite / PDF 재저장 금지
- `source/original-exams/**` — 동일 불변 (존재 시 읽기 전용만; SoT는 past-exams 정규 슬롯)

---

## 2. Pipeline (Adopted)

```text
source (immutable)
  ↓  read-only
raw          ← data/knowledge/raw/
  ↓
candidate    ← data/knowledge/candidate/
  ↓
human verify ← ACC 2018–2026 = 100%
  ↓
golden       ← data/knowledge/golden/   (≠ D3 Product SoT)
```

D3/D4 Product Persist는 Promotion + Human only. 본 Sprint staging ≠ `--apply`.

---

## 3. Module Architecture (Design Only)

```text
┌─────────────────────────────────────────────────────────┐
│  Extraction Tooling (future Engineer · Gate-scoped)     │
│                                                         │
│  1. SourceScanner      read-only walk past-exams/YYYY   │
│  2. Sha256Inventory    bytes + hash · no source write   │
│  3. FormatDetector     pdf_text | pdf_image | hwp | …   │
│  4. RawIngress                                          │
│       HWP-D: Human Export → raw/ (attested)             │
│       HWP-A: Probe only → probe report (not Golden)     │
│       PDF:   text-layer path design (extract OFF now)   │
│  5. OCR Hook           stub · default OFF               │
└─────────────────────────────────────────────────────────┘
         │
         ▼ never touches
   scripts/parser/** · question-db*.json · pattern-db*.json
```

---

## 4. SourceScanner Spec

### Purpose

`source/past-exams` 정규 슬롯을 **읽기 전용**으로 나열한다.

### Inputs

- `root`: `source/past-exams`
- year range (Golden default): `2018`–`2026`
- slots: `exam_1` | `exam_2` | `answer`

### Behavior

1. 연도 디렉터리 존재 여부
2. 각 슬롯 파일 존재 여부 (`*.pdf` / `*.hwp` 중 하나)
3. 상대 경로·확장자 기록
4. **파일 내용 미변경** · 복사·변환·재저장 없음

### Outputs (logical)

```json
{
  "root": "source/past-exams",
  "years": [
    {
      "year": 2018,
      "folderExists": true,
      "slots": {
        "exam_1": { "exists": true, "relativePath": "2018/exam_1.pdf", "ext": "pdf" },
        "exam_2": { "exists": true, "relativePath": "2018/exam_2.pdf", "ext": "pdf" },
        "answer":  { "exists": true, "relativePath": "2018/answer.hwp", "ext": "hwp" }
      }
    }
  ],
  "gaps": []
}
```

### Non-goals

- OCR, text extract, HWP parse dump, DB write

---

## 5. SHA256 Inventory Schema

### Purpose

SoT 바이트 고정 증거. 원본 옆에 sidecar 해시 파일을 **쓰지 않는다** (source 트리 청결).

### Persist target (Gate 후 구현 시)

`data/knowledge/inventory/past-exams-inventory.json`

### Record shape

```json
{
  "generatedAt": "ISO-8601",
  "sprintId": "KS-ACC-LOSSLESS-GOLDEN",
  "woId": "WO-20260722-008b",
  "algorithm": "SHA-256",
  "entries": [
    {
      "year": 2018,
      "role": "exam_2",
      "relativePath": "source/past-exams/2018/exam_2.pdf",
      "ext": "pdf",
      "bytes": 0,
      "sha256": "<hex>"
    }
  ]
}
```

### Rules

- Hash = file open read-only
- source 경로에 `.sha256` 등 **금지**
- inventory JSON만 `data/knowledge/inventory/`에 기록 (구현 WO에서)

---

## 6. FormatDetector Spec

### Purpose

추출 전략 분기용 **분류만** (본 Stage 실행 없음).

| Code | Meaning | Next (future) |
|------|---------|----------------|
| `pdf_text` | Text layer 우세 | PDF text extract path |
| `pdf_image` | Image-only / 스캔 우세 | OCR 후보 큐 (OCR OFF until WO) |
| `pdf_mixed` | 텍스트+이미지 표 | 텍스트 우선 + 표 큐 |
| `hwp` | HWP/HWPX | **D ingress** · A probe optional |
| `unknown` | 판정 실패 | Human triage |

### Detection design (heuristic only)

1. Extension (`pdf` / `hwp` / `hwpx`)
2. PDF: `%PDF` magic · (future) text operator 샘플링으로 text vs image
3. HWP: OLE / HWP signature 확인
4. **본 Design Persist 시점: 휴리스틱 문서화만 · 실행 금지**

---

## 7. HWP Raw Architecture

### D — Primary (Human Export)

```text
Human exports lossless text/tables from HWP offline
  → places attested files under data/knowledge/raw/hwp-export/YYYY/
  → metadata links: source relativePath + source sha256 + export sha256 + exporter note
  → ONLY this path feeds Candidate/Golden for HWP-origin content
```

### A — Probe Only

```text
Optional read-only probe of HWP binary structure
  → data/knowledge/raw/hwp-probe/YYYY/*.probe.json (or report)
  → MUST NOT promote probe output to Candidate/Golden
  → Used for feasibility / coverage metrics only
```

### Forbidden (Golden)

- HWP → PDF conversion as Golden evidence
- LibreOffice (or equivalent) conversion as Golden generator
- Writing converted files into `source/**`

---

## 8. PDF Raw Architecture

```text
pdf_text  → (future) text-layer extract → raw/pdf-text/YYYY/
pdf_image → classify only → ocr_queue (OCR execution OFF)
pdf_mixed → text path + table regions queued
```

OCR: **OFF** until dedicated WO + Gate A.  
Source PDF: never re-saved / linearized / “optimized”.

---

## 9. Staging Directory Contract

| Path | Role |
|------|------|
| `source/past-exams/**` | SoT immutable |
| `source/original-exams/**` | Immutable (non-primary) |
| `data/knowledge/inventory/` | SHA256 inventory JSON |
| `data/knowledge/raw/` | Raw ingress + probe reports |
| `data/knowledge/candidate/` | Pre-verify questions |
| `data/knowledge/golden/` | Post-verify ACC golden staging |
| `scripts/parser/` | **OUT — do not modify** |
| `data/question-db*.json` | **OUT** |
| `data/pattern-db*.json` | **OUT** |

---

## 10. Human Verify

- Subject: **ACC**
- Years: **2018–2026**
- Coverage: **100% of questions** (Confidence 무관)
- Promotion Candidate → Golden: Human only

---

## 11. Stage 2-B Done Criteria (Design)

- [x] Scanner / Inventory / Detector / Raw arch 문서화
- [x] HWP D-primary / A-probe Gate A amendment 반영
- [x] OCR / extract / DB / Parser / source touch = 명시적 OUT
- [ ] Implementation scaffold — **별도 WO** (본 008b 범위 밖)
- [ ] Inventory JSON 실측 Persist — **별도 WO + Gate** (해시 실행은 Design 아님)

---

## 12. Explicit Non-Goals (Affidavit)

본 Persist로 **하지 않은** 것:

1. Extraction 실행
2. OCR 실행
3. Question DB / Pattern DB 생성
4. Parser 수정
5. `source/past-exams` · `source/original-exams` 임의 수정
6. HWP→PDF / LibreOffice Golden 경로 도입

---

## 13. Next WO (권고)

| ID | Goal |
|----|------|
| (future) | Read-only inventory dry-run + SHA256 Persist to `data/knowledge/inventory/` |
| (future) | Human Export ingress template + checksum link schema |
| (later) | OCR enablement WO — Gate A 필수 |

Extraction 실행 WO는 위 inventory/ingress 준비 + 별도 Gate 없이 착수 **금지**.
