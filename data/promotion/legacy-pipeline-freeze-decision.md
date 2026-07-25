# Legacy Pipeline Freeze Decision Memo

Sprint: Promotion Decision Support  
Generated: 2026-07-20  
Spec: `docs/34-truth-split-migration-plan.md`, `docs/35-platform-architecture-redesign.md`  
Status: **Approved — L1 FREEZE (2026-07-21, 이아람)** · 코드 변경 없음

---

## 1. 목적

Promotion Decision Support Sprint 동안 Baseline Drift를 막기 위해,  
`scripts/exam_pipeline/` + `scripts/repair-pipeline.py` 경로의 **추가 패치·재실행 여부**를 결정한다.

본 문서는 현황과 리스크만 기술한다. **결정은 Human Approval 란에만 기록한다.**

---

## 2. 현황 스냅샷 (Sprint 시작 시점)

| 항목 | 값 |
|------|-----|
| Product Snapshot | `data/question-db-mvp.json` |
| Sprint 시작 sha256 | `0cfcaa317bc25c811cebb48e3b53218556b2320f9c3538b2d4583ba9d16a9629` |
| Pattern DB sha256 | `0a97e796cefba51381ae3721e5d50bbb0e6c04714e5cdf861eeabe0fc18699fd` |
| Emit sha256 | `4aebf14eef76b47425605512163c97eb66a2a050ab25bbf570f28624385dd935` |
| Repair queue | `data/repair/repair-queue.json` — threshold 0.95, queueSize **183** / 240 |
| Legacy 수정 파일 (미커밋, Sprint 이전부터 존재) | `scripts/exam_pipeline/question_parser.py`, `text_postprocess.py` 외 Product/통계/baseline 산출물 |

### 2.1 Legacy 경로가 하는 일

```
scripts/exam_pipeline/*  (+ scripts/repair-pipeline.py)
  → data/question-db-mvp.json   ← Product SSOT 직접 갱신
  → data/pattern-db-mvp.json / statistics-mvp.json 등
```

docs/35 Authority Graph상 D3(Product Content) Owner는 **Promotion Pipeline만**이다.  
Legacy 경로는 Promotion Gate를 우회하는 **별도 쓰기 경로**이다.

### 2.2 신규 Parser Core와의 관계

| 경로 | 위치 | 이번 Sprint |
|------|------|-------------|
| Parser Core (Stage 1–9) | `scripts/parser/` | **수정 금지** |
| Legacy exam_pipeline | `scripts/exam_pipeline/` | **추가 패치 여부 = 본 문서 결정** |
| Promotion Gate | `scripts/promote-parser-emit.py` | dry-run만 (overwrite 금지) |

---

## 3. 동결 vs 미동결 리스크

| 선택 | 이점 | 리스크 |
|------|------|--------|
| **A. Sprint 중 동결** (추가 patch·repair 재실행 금지) | Emit↔Product Diff 수치가 재현됨. Display Acceptance / G6 Evidence 보고서가 유효 유지 | Repair queue 183건 해소가 지연됨 |
| **B. 동결하지 않음** | Legacy 수리 진행 가능 | Product Baseline Drift → Sprint 산출 보고서·dry-run 비교 무효화. Truth Split 진단이 흔들림 |

---

## 4. Human Approval

정식 결정 원본: `adr/ADR-004-legacy-pipeline-strategy.md` (Option L1).

```
[x] APPROVED: FREEZE — scripts/exam_pipeline/* 및 repair-pipeline.py 추가 패치·재실행 금지 until Explicit Unfreeze ADR
[ ] DEFERRED — 동결 보류 (사유: _______________________________)
[ ] REJECTED — 동결 거부 (사유: _______________________________)

승인자: 이아람
일자: 2026-07-21
Notes: Architecture Brief 수락. Path L D3 직접쓰기·exam_pipeline 추가패치·repair-pipeline 재실행 금지 until Explicit Unfreeze ADR.
```

---

## 5. 비범위

- Legacy 코드 삭제·리팩터 금지
- Parser Core / Coach / Pattern DB / Product Snapshot 수정 금지
- 본 문서 승인만으로 `--apply` 허가되지 않음
