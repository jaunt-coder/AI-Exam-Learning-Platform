# Knowledge Sprint — Accounting Lossless Golden Dataset

Sprint ID: **KS-ACC-LOSSLESS-GOLDEN**  
Work Order: **WO-20260722-006** (신규 · 기존 WO와 병합 금지)  
Status: **REGISTERED · HIGHEST PRIORITY**  
Date: 2026-07-22  
Mode: Knowledge Extraction Mode (유지)  
Roles: Data Extraction Architect / Knowledge Extraction Engineer (실행) · Navigator (우선순위 등록)

> 목표: 감정평가사 기출 PDF → **Lossless** 구조화 Question 자산.  
> 플랫폼 기능 완성 ≠ 성공 기준.  
> **docs/35 · docs/37 · AI Exam OS 미수정.** Parser/Architecture **재설계 금지.**

---

## 0. OS Fields (AI Exam OS)

| Field | Value |
|-------|-------|
| current_mode | `EXAM` |
| exam_impact_score | **5** |
| estimated_hours | TBD (Pipeline 단계별 산정) |
| study_roi | **HIGH** |
| recommended_action | **DO_NOW** |
| learning_goal | subject=`ACC` · chapter=`ALL_GOLDEN` · pattern=`AFTER_QUESTION_DB` |
| success_metric | Question Accuracy 99.9%+ · Choice/Metadata/Lossless 100% · Human Verify 완료율 |
| wo_class | `KNOWLEDGE_EXTRACTION` |
| knowledge_sprint_id | `KS-ACC-LOSSLESS-GOLDEN` |
| priority_rank | **P0 — 전 프로젝트 최우선** (기존 Waiting 항목보다 위) |

---

## 1. Mission

모든 감정평가사 기출 PDF를 **정보 손실 없이** 구조화 데이터로 만든다.

```
PDF → OCR → Text Reconstruction → Question/Choice/Metadata Extraction
  → Human Verify → Question DB (Candidate/Golden)
  → (이후) Pattern DB → Learning DB
```

손실률 목표: **0%** (문자 단위 동일 · 삭제/생략/요약/재작성 금지).

---

## 2. Absolute Principles

- Platform First **금지**
- Data First · Knowledge First · Exam First · **Human Verify First**
- Pattern은 **Question DB 완성 후** 생성 (Pattern First 생성 금지 — 본 Sprint 한정 순서)

---

## 3. Scope

### IN

- PDF 분석 · OCR · 텍스트/표/수식 복원
- 문제번호 · 보기 · 과목 · 연도 · 회차 · 교시 추출
- **교시 PDF 내 과목 자동 분리** (1교시: 민법/경제/부동산학원론 · 2교시: 관계법/회계학)
- Pattern **Candidate** 생성 (Persist는 Question DB 이후 · Human Approve)
- Confidence · Human Verify Queue
- **Golden Dataset: 회계학 2018–2026** (타 과목 Pipeline 검증 기준)

### OUT

- 플랫폼 UI · 로그인 · 회원 · 결제 · SaaS · C4
- Promotion `--apply` · Product Snapshot 무단 덮어쓰기
- **Parser Core 재설계** (`scripts/parser/` 수정 금지)
- Architecture / docs/35–37 재설계·수정
- 기존 WO 병합 (`WO-20260722-004`, KS-001 후보 등과 **별도 Track**)

---

## 4. Safety Alignment (docs/35 — 충돌 방지)

| 규칙 | 본 Sprint 해석 |
|------|----------------|
| D3 = Promotion only | 산출 = **Golden/Candidate JSON** (`data/` staging). `question-db-mvp.json` 직접 덮어쓰기 **금지** |
| D4 = Human Owner | Pattern Persist는 Question DB 검증 **이후** + Human Approve |
| Parser Freeze | 기존 Emit/도구 **읽기·참조** 가능. Core 알고리즘 재작성 금지. 필요 시 **별도 offline extraction tooling** (Parser 트리 밖) |
| Path L L1 | exam_pipeline → Product 직접쓰기 금지 |
| Candidate ≠ SoT | Confidence Auto Candidate ≠ Product/Pattern SoT 자동 Persist |
| Promotion OUT | 본 Sprint DoD에 `--apply` / READY=YES 없음 |

---

## 5. Question Schema (Lossless Record)

필수 필드:

`questionId` · `year` · `examRound` · `session` · `subject` · `chapter` · `page` · `questionNumber` · `questionText` · `choices[]` · `answer` · `sourcePdf` · `sourcePage` · `confidence` · `reviewStatus` · `verified` · `rawText` · `ocrEngine` · `extractVersion`

출력 원칙: PDF와 **문자 하나까지 동일**. 삭제·생략·요약·재작성 금지.

---

## 6. Confidence → Verify

| Confidence | Action |
|------------|--------|
| 95–100 | Auto **Candidate** |
| 90–95 | Human Quick Review |
| 80–90 | Human Verify |
| &lt; 80 | Manual Reconstruction |

**회계학 (초기):** Question 단위 **100% Human Verify** (Confidence와 무관).  
회계 Pipeline 검증 후 → 경제/민법/관계법/부동산학원론은 Confidence 기반 Verify로 전환.

---

## 7. Lossless Rule

```
PDF → JSON → Viewer → JSON
```

역변환 시 원본 PDF와 **내용 동일**해야 한다 (Golden 합격 조건).

---

## 8. Quality Gates (DoD)

| Metric | Target |
|--------|--------:|
| Question Accuracy | 99.9%+ |
| Choice Accuracy | 100% |
| Metadata Accuracy | 100% |
| Lossless Reconstruction | 100% |
| Accounting Human Verify | 100% (초기) |

성공 기준 (플랫폼 기능 수 아님):  
Question Accuracy · Pattern Coverage(후속) · Knowledge Coverage · Review Completion · Exam Readiness

---

## 9. Pipeline Stages (실행 순서)

| Stage | 이름 | 상태 (등록 시점) |
|------:|------|------------------|
| 0 | Sprint Charter / Safety Lock | **DONE** (본 문서) |
| 1 | Source inventory (PDF · 교시 · 과목 맵) | NEXT |
| 2 | OCR + Text/Table/Formula Reconstruction | pending |
| 3 | Subject Split (session PDF → subject streams) | pending |
| 4 | Question + Choice + Metadata Extraction | pending |
| 5 | Confidence + Verify Queue (ACC 100% Human) | pending |
| 6 | Golden Dataset ACC 2018–2026 | pending |
| 7 | Lossless round-trip check | pending |
| 8 | (Post) Pattern DB from verified Questions | blocked until 6–7 |

---

## 10. Agent Chain (본 Sprint)

```
00_Navigator          ✅ 등록 완료 (본 Package)
  → 01_Guardian       Scope: offline tooling IN · Parser/D3/D4 SoT OUT
  → ★ Gate A
  → 02_Engineer       Stage 1+ 구현 (승인 Scope만)
  → 03_Verification   Code + Learning + Exam + Lossless checks
  → ★ Gate B
  → 04_Memory
```

기존 `WO-20260722-004` / Feature Sprint와 **병합하지 않음**.

---

## 11. Non-Interference

| Track | 관계 |
|-------|------|
| Knowledge Extraction Mode | **유지** · 본 Sprint가 최우선 실행체 |
| WO-20260722-004 D4 REGISTER | 별도 · 본 Sprint에 병합 금지 · Pattern은 Question 이후 |
| KS-001 Pattern Complete | 본 Golden Question 완료 **후** 재개 권장 |
| Platform / UI / SaaS | OUT |

---

## 12. Decision Rule

> 이 작업이 시험 합격 확률을 높이는가?

본 Sprint = **YES** (기출 자산 품질 = 학습 상한선).  
Platform polish = NO → 후순위.
