# Question Learning Integrity Audit

Date: 2026-07-26  
Role: Learning Content Integrity Auditor  
Status: **AUDIT ONLY** — Question / Answer / Pattern / Runtime 수정 없음  
Scope: Pattern Master **Pattern #1** 전체 Question  
**09G Mapping Migration: 비대상 (시작·진행하지 않음)**

---

## 1. Target

| Item | Value |
|------|-------|
| Pattern #1 | `ACC_INV_001` · 기말재고 포함 여부 판단 |
| validation_status | `verified` |
| Runtime pack (learning-loop) | 1문항 — `ACC_2018_Q042` |
| Declared Master question_ids | 5문항 |
| Primary audit set | **declared_master_question_ids** (5문항) |

> Human Pilot의 「첫 문제 Solution 정상 · 두 번째부터 미표시」는  
> Runtime 팩이 1문항이라 **선언 세트(5문항) + Tutor Override 경로**를 주 감사 대상으로 둔다.

---

## 2. Checks

1. Question ID 존재  
2. Answer 존재  
3. Solution Step 존재 (`solution.steps` **또는** Tutor `solvingAlgorithm`)  
4. Algorithm 존재 (Pattern metadata `solving_algorithm`)  
5. Review Why Lens 데이터 존재 (Pattern-level)  
6. Closing Takeaway 연결 가능 여부  

---

## 3. Summary (Primary Set)

| Status | Count |
|--------|------:|
| PASS | 5 |
| MISSING_SOLUTION | 0 |
| MISSING_REVIEW | 0 |
| MISSING_DATA | 0 |

| Gap check | Value |
|-----------|-------|
| First solutionExists | True |
| Rest solution missing | 0 |
| First vs Rest gap | **False** |
| DB `solution.steps` all empty | **True** |
| All have Tutor override | **True** |

### Pattern-level Review / Algorithm

| Asset | Status |
|-------|--------|
| Metadata algorithm | True (steps=3, status=evidenced) |
| Why Lens data | True |
| Closing Takeaway connectable | True |

---

## 4. Full Table (Declared Master question_ids)

| # | Question | Q | Answer | Solution | Via | DB steps | Review | Takeaway | Status | issueType |
|---|----------|---|--------|----------|-----|----------|--------|----------|--------|-----------|
| 1 | `ACC_INV_Q001` | Y | Y | Y | tutor_override | empty | Y | Y | **PASS** | — |
| 2 | `ACC_INV_Q006` | Y | Y | Y | tutor_override | empty | Y | Y | **PASS** | — |
| 3 | `ACC_INV_Q019` | Y | Y | Y | tutor_override | empty | Y | Y | **PASS** | — |
| 4 | `ACC_INV_Q022` | Y | Y | Y | tutor_override | empty | Y | Y | **PASS** | — |
| 5 | `ACC_INV_Q037` | Y | Y | Y | tutor_override | empty | Y | Y | **PASS** | — |

### Runtime study pack (learning-loop 실제 로드)

| # | Question | Answer | Solution | Status | issueType |
|---|----------|--------|----------|--------|-----------|
| 1 | `ACC_2018_Q042` | Y | N | **MISSING_SOLUTION** | pilot_candidate_no_solution_field |

---

## 5. Missing Solution List

(status=MISSING_SOLUTION 없음 — 단, **Question SoT `solution.steps`는 전량 공백**, Tutor Override로 PASS)
- SoT gap: `ACC_INV_Q001` — solution.steps empty in question-db; Tutor override supplies steps
- SoT gap: `ACC_INV_Q006` — solution.steps empty in question-db; Tutor override supplies steps
- SoT gap: `ACC_INV_Q019` — solution.steps empty in question-db; Tutor override supplies steps
- SoT gap: `ACC_INV_Q022` — solution.steps empty in question-db; Tutor override supplies steps
- SoT gap: `ACC_INV_Q037` — solution.steps empty in question-db; Tutor override supplies steps

---

## 6. Cause Classification

### C0 — DUAL_SOURCE_SPLIT

Pattern Master Runtime은 golden pilot 1문항(`['ACC_2018_Q042']`)만 로드하고, Master 선언 question_ids는 5문항(phase1 DB)이다. Human Pilot 다문항 체감은 선언 세트/Question·Tutor 경로일 가능성이 높다.

### C1 — EMPTY_SOLUTION_STEPS_IN_QUESTION_SOT

phase1 `question-db.json`의 solution.steps가 Pattern1 전 문항에서 빈 배열이다. algorithm/explanation은 OCR 잡음(스터디파이터/CHAPTER)이다.

### C2 — TUTOR_OVERRIDE_MASKS_SOT_GAP

Tutor `question-overrides.js`의 solvingAlgorithm이 Solution Step을 공급해 첫 문항 등에서 정상처럼 보인다. Override 미적용·로드 실패·다른 화면이면 두 번째부터 steps 미표시로 관측될 수 있다.

### C3 — RUNTIME_PACK_SINGLE_QUESTION

learning-loop Pattern#1 런타임 팩은 문항이 1개뿐이라 ‘같은 Pattern 내 Q2’가 존재하지 않는다. Q2 증상은 Pattern 전환 또는 Question 페이지 경로를 의심.

### C4 — PATTERN_LEVEL_ALGORITHM_OK

pattern-metadata `ACC_INV_001` solving_algorithm steps=3 — Review Why Lens / Pattern Algorithm 패널 공통 자산은 존재한다.

---

## 7. Fix Priority

| P | Action | Why |
|---|--------|-----|
| 1 | Pattern1 선언 문항의solution.steps`를 SoT(또는 승인된 Solution DB)에 구조화 채움 — OCR 잡음 제거 | C1 — steps 전량 공백 |
| 2 | Learning Loop가 Master question_ids(또는 MVP 매핑)를 쓰도록 Study Pack 정합 — golden 1문항 한계 해소 | C0/C3 — Runtime vs Declared split |
| 3 | Human Pilot 재현: Question 페이지 Tutor vs Pattern Master Review — Override 의존 여부 확인 | C2 — 첫 문항만 정상 관측 설명 |
| 4 | 09G Mapping Migration과 분리 — 본 이슈는 Solution Content Integrity (매핑 아님) | Scope guard |

---

## 8. Acceptance

| Criterion | Status |
|-----------|--------|
| Pattern 1 전체 Question 검사 | **PASS** (declared 5 + runtime 1) |
| 첫 문제 이후 누락 여부 확인 | **PASS** (status gap=False; SoT steps empty=True) |
| Missing 목록 생성 | **PASS** |
| 원인 분류 | **PASS** |
| SoT/Runtime 미수정 · 09G 미진행 | **PASS** |

---

## 9. Machine Report

`data/question-content-integrity-report.json`

