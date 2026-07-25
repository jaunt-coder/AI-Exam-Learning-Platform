# Sprint-03 Report — M2.6 Evidence Pad

Status: **IMPLEMENTED** (Real Study Evidence intake pending)  
Owner: `08_Learning_Experience_Designer`  
Baseline: M2.5 Study Experience Beta Polish  
Date: 2026-07-24  
Template: Sprint Template Standard (Mandatory)

---

## Sprint Constitution

| Rule | 적용 |
|------|------|
| 1 Evidence before Features | 본 Sprint는 Evidence **수집 도구** 자체 (Feature≠분석엔진) |
| 2 Pattern First | question_id + pattern_id 동시 기록 |
| 3 Data Integrity First | Q/A/Pattern/Knowledge/Attempt 미수정 |
| 4 Human Approval | Charter = 사용자 Sprint-03 WP |
| 5 One Improvement | Evidence를 프로그램 안 체크로 |
| 6 Real Study | Pad로 실학습 기록 시작 가능 |
| 7 UX over count | 20초 체크 · 자동저장 없음 |
| 8 Evidence as Asset | `learning.evidence.v1` append-only |

---

## Sprint Goal

학생이 문제 제출 직후 **20초 안**에 학습 상태를 기록할 수 있게 한다.  
Evidence Pad는 Observation Tool이다. 분석·추천·평가하지 않는다.

---

## Learning Problem

| ID | 문제 | 행동 | 영향 |
|----|------|------|------|
| LP-01 | Evidence가 문서/수기라 누락 | 세션 후 미기록 | Backlog 공백 |
| LP-02 | 기록 비용이 커서 중단 | 타이핑 부담 | Frequency↓ |
| LP-03 | Attempt와 관찰이 섞일 위험 | DB/Attempt 오염 | Integrity 위험 |

---

## Evidence

| Source | Status |
|--------|--------|
| Human Charter Sprint-03 | Approved scope |
| Learner UR from Pad | 실학습 후 적재 |
| Tool purpose | Collect raw observations |

---

## Hypothesis

| ID | Title | Status | Evidence | Strength | Implementation | Validation |
|----|-------|--------|----------|----------|----------------|------------|
| H-301 | In-app Evidence Pad raises capture rate | Approved → Implemented | Human Charter | — | Done | Pending Real Study |
| H-302 | Sidebar fixed slot ≤20s | Approved → Implemented | Human Charter | — | Done | Pending |
| H-303 | Export enables 07 intake | Approved → Implemented | Human Charter | — | Done | Pending |

---

## Deliverables

### D-01 `runtime/evidence-service.js`

| Field | Content |
|-------|---------|
| Purpose | append-only LocalStorage API + count + export helpers |
| Scope | load/append/list/counts/json/md/download |
| Dependencies | `js/storage.js` get/set |
| Out of Scope | analysis, mastery, recommendation, attempt writes |

### D-02 `js/evidence-pad.js`

| Field | Content |
|-------|---------|
| Purpose | Pad UI · History · Export buttons |
| Scope | radios/checkboxes/memo/Save · History counts |
| Dependencies | evidence-service |
| Out of Scope | LLM, auto-save, grading |

### D-03 `css/evidence-pad.css`

| Field | Content |
|-------|---------|
| Purpose | Pad / History 가독성 |
| Scope | compact form styles |
| Dependencies | learning-loop layout |
| Out of Scope | new brand system |

### D-04 Integration (learning-loop)

| Field | Content |
|-------|---------|
| Purpose | 제출 후 Sidebar 고정 위치 open |
| Scope | html slot + page open/close |
| Dependencies | M2.5 flow |
| Out of Scope | flow redesign |

### D-05 Docs

| Field | Content |
|-------|---------|
| Purpose | Spec / Export / Validation / Sprint Report |
| Scope | `docs/m2.6-evidence-pad.md`, `evidence-export-format.md`, `evidence-validation-report.md`, 본 문서 |
| Dependencies | — |
| Out of Scope | roadmap merge without UR |

---

## Acceptance Criteria

PASS when

- [x] Question 제출 후 Evidence Pad가 열린다
- [x] Save → `learning.evidence.v1` 저장
- [x] Question DB 변경 없음
- [x] Attempt DB(키) Evidence Save로 수정 없음
- [x] Pattern DB 변경 없음
- [x] Evidence Export (JSON/MD) 가능
- [x] 프로그램 종료 후에도 LocalStorage 유지
- [x] Dashboard(Evidence History) Count only
- [x] AI / Recommendation / Mastery 없음

---

## Implementation Plan (결과)

| Step | Result |
|------|--------|
| evidence-service | Done |
| evidence-pad UI | Done |
| CSS | Done |
| learning-loop wire | Done |
| Docs | Done |

### Files

| File | Change |
|------|--------|
| `runtime/evidence-service.js` | **New** |
| `js/evidence-pad.js` | **New** |
| `css/evidence-pad.css` | **New** |
| `learning-loop.html` | pad root + css |
| `js/learning-loop-page.js` | open after submit |
| `js/storage.js` | key registry additive |
| `index.html` | CTA M2.6 |
| `docs/m2.6-evidence-pad.md` | **New** |
| `docs/evidence-export-format.md` | **New** |
| `docs/evidence-validation-report.md` | **New** |
| `docs/sprint-03-m2.6-evidence-pad.md` | **New** |

---

## Sprint Dashboard

```text
Progress
█████████░  90%

Evidence tool ...... Implemented
Learner UR ......... 0 (await Real Study)
Deliverables ....... 5/5
Validation ......... Implementation PASS
Exit remaining ..... Real Study capture smoke

Known Risks ........ 1 (unused Pad → backlog still empty)
Blockers ........... 0
```

---

## Validation Plan

1. Manual script in `docs/evidence-validation-report.md`
2. Confirm append-only array growth
3. Confirm attempts key untouched on Save
4. Real Study: ≥1 session with ≥3 Pad saves

---

## Exit Criteria

- [x] Evidence Pad 구현
- [x] Export 구현
- [x] Dashboard(History) 구현
- [x] Validation PASS (implementation)
- [x] Beta Study Ready (Conditional — Pad usable)
- [ ] Human smoke sign-off (권장)
- [ ] First real UR from exported evidence (07)

---

## Sprint Retrospective

> Real Study 후 기입.

- Capture rate / time-to-save 측정 예정
- Pad 필드 과다 여부는 Evidence로만 축소

---

## Document Control

| Version | Date | Change |
|---------|------|--------|
| v1.0 | 2026-07-24 | M2.6 Evidence Pad Sprint Report |
