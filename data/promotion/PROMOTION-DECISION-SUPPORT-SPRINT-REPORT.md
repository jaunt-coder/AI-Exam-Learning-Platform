# Promotion Decision Support Sprint — Final Report

Generated: 2026-07-20  
Sprint Goal: Promotion 판단에 필요한 결정 자료 완성 (overwrite 없음)

---

## 1. 신규 생성 파일

### Scripts (read-only)

| 파일 | 역할 |
|------|------|
| `scripts/promotion/inspect-pattern-gap.py` | G6 Pattern Evidence Collection |
| `scripts/promotion/display-acceptance-sampler.py` | Display 표본 + hasTable 전건 추출 |
| `scripts/promotion/README.md` | 도구 사용 안내 |

### Reports

| 파일 | 내용 |
|------|------|
| `data/promotion/legacy-pipeline-freeze-decision.md` | Task 4 — 동결 의사결정 메모 (승인란 비움) |
| `data/promotion/pattern-gap-analysis.md` | Task 1 — `ACC_COST_001` 15건 Evidence |
| `data/promotion/display-acceptance-sample.md` | Task 2 — 연도별 5건 × 6년 = 30건 표본 |
| `data/promotion/hastable-regression-candidates.md` | Task 3 — hasTable True→False 25건 전건 |
| `data/promotion/PROMOTION-DECISION-SUPPORT-SPRINT-REPORT.md` | 본 보고서 |

Candidate shadow (`candidate-question-db.json`)는 dry-run 재실행으로 갱신됨 (Product 아님).

---

## 2. Dry Run 결과 (Task 5)

Command: `py -3 scripts/promote-parser-emit.py --write-candidate`

| 항목 | Sprint 시작 | Sprint 종료 | 변동 |
|------|-------------|-------------|------|
| candidate count | 240 | 240 | 없음 |
| answer diff | 0 | 0 | 없음 |
| question / originalQuestion | 240 / 240 | 240 / 240 | 없음 |
| choices | 223 | 223 | 없음 |
| table / hasTable | 117 / 104 | 117 / 104 | 없음 |
| patternId | 74 | 74 | 없음 |
| G6 hard fails | 15 (`ACC_COST_001`) | 15 | 없음 |
| GATE HARD CHECKS | FAIL | FAIL | 동일 |
| DISPLAY ACCEPTANCE | NOT READY | NOT READY | 동일 |
| PROMOTION_READY | NO | NO | 동일 |
| `--apply` | 미실행 | 미실행 | — |

Baseline Drift 없음 → 보고서 수치가 재현됨.

---

## 3. Regression Check (Read-only 준수)

| 대상 | Sprint 시작 sha256 | Sprint 종료 sha256 | 결과 |
|------|--------------------|--------------------|------|
| `data/question-db-mvp.json` | `0cfcaa31…16a9629` | `0cfcaa31…16a9629` | **PASS (unchanged)** |
| `data/pattern-db-mvp.json` | `0a97e796…8699fd` | `0a97e796…8699fd` | **PASS (unchanged)** |
| `data/regression/parser-emit/question-db-parser.json` | `4aebf14e…85dd935` | `4aebf14e…85dd935` | **PASS (unchanged)** |
| `scripts/parser/*` | — | 미수정 | **PASS** |
| `js/coach/*` | — | 미수정 | **PASS** |
| `docs/35-*` | — | 미수정 | **PASS** |
| `scripts/exam_pipeline/*` (Sprint 중 추가 patch) | — | 없음 | **PASS** |
| C4 Learning Planner | — | 미착수 | **PASS** |

---

## 4. Task 요약

| Task | 구현 | Human Approval |
|------|------|----------------|
| 4 Legacy Freeze memo | 완료 | 승인란 비움 |
| 1 Pattern Evidence | 15건 Evidence only (재분류 추천 없음) | 승인란 비움 |
| 2 Display sample | seed=`20260720`, 30건 | 승인란 비움 |
| 3 hasTable removals | 25건 전건 | 승인란 비움 |
| 5 Dry-run re-verify | 수치 동일, Product untouched | — |

---

## 5. 남은 Blocker (다음 단계용)

1. Human: G6 Evidence 검토 → REGISTER / RE-MAP / REVISIT 선택
2. Human: Display Acceptance 30건 + hasTable 25건 검토
3. Human: Legacy pipeline FREEZE 승인 여부
4. 위 승인 전까지 `--apply` / Product overwrite / C4 착수 금지

---

## 6. Definition of Done Checklist

- [x] pattern-gap-analysis.md — 15건 Evidence
- [x] display-acceptance-sample.md — 6×5 표본
- [x] hastable-regression-candidates.md — 25건 전건
- [x] legacy-pipeline-freeze-decision.md — 승인란만 비움
- [x] Dry-run 재실행, G1–G5 자동 PASS 유지, G6은 Evidence+승인 대기 상태로 명시
- [x] Product / Pattern / Parser / Coach / docs/35 변경 0
- [x] exam_pipeline Sprint 중 추가 patch 0
- [x] C4 미착수
- [x] 신규 파일은 `scripts/promotion/` · `data/promotion/` 하위 분석 도구/리포트만
