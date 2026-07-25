# CHANGELOG — RC1

Release Candidate: **RC1**  
Date: 2026-07-20

형식: 시간순 (오래된 것 → 최근).  
본 변경로그는 **문서·게이트·Evidence** 중심이다. RC1 준비 Sprint에서 애플리케이션 코드/Product Apply는 없다.

---

## 2026-07 — Parser Architecture & Emit

### Parser Core (docs/31)

- Compiler-style multi-stage pipeline under `scripts/parser/`
- Stages through layout/token/AST, CellRecon, SemanticRepair/Validator, IRIntegrityGate
- Regression metrics captured under `data/regression/phase*-metrics.json`
- Phase 6.9: all target years frozen, integrity errors = 0 (recorded metrics)

### Emit Contract (docs/32)

- Stage 7 QuestionBuilder read-only emit
- Outputs: `data/regression/parser-emit/question-db-parser.json` (+ per-year), `data/regression/ast-sidecar/{year}.json`
- 240 records (6 × 40); Stage 8 diff errors = 0; **MVP DB untouched by emit**
- Product DB switch not performed

---

## 2026-07 — Coach Agent Layer (docs/33)

### C1 — Data models & stores

- `js/coach/` models + profile / attempt / weakness stores
- LocalStorage keys additive only

### C2 — Append-only attempts

- `coach.attempts.v1` contract
- Adapter path without mutating Question Engine core

### C3 — Weakness diagnosis

- Diagnosis engine + `coach.weakness.v1`
- **C4 Learning Planner not started**

---

## 2026-07-20 — Truth Split & Promotion Gate (docs/34–35)

### Architecture

- docs/34 Truth Split Migration Plan
- docs/35 Single Truth Authority (Four Planes / Authority Graph)

### Promotion Gate

- `scripts/promote-parser-emit.py`
- Dry-run + `--write-candidate` → `data/promotion/candidate-question-db.json`
- Hard fail G6 (`ACC_COST_001` × 15); Display Acceptance NOT READY
- **`--apply` not executed**; Product Snapshot unchanged by gate

### Diff snapshot (Emit candidate vs Product)

- answer 0 / patternId 74 / hasTable 104 / table 117 / choices 223 / question 240

---

## 2026-07-20 — Promotion Decision Support Sprint (PASS)

Read-only tools:

- `scripts/promotion/inspect-pattern-gap.py`
- `scripts/promotion/display-acceptance-sampler.py`

Reports:

- `data/promotion/pattern-gap-analysis.md` (15 Evidence)
- `data/promotion/display-acceptance-sample.md` (30 samples)
- `data/promotion/hastable-regression-candidates.md` (25)
- `data/promotion/legacy-pipeline-freeze-decision.md`
- `data/promotion/PROMOTION-DECISION-SUPPORT-SPRINT-REPORT.md`

Regression: Product / Pattern / Emit / Parser / Coach sha unchanged during sprint.

---

## 2026-07-20 — Human Approval Sprint (ADR package)

Architecture Decision Records (options **unsigned** → DEFER at RC1):

- ADR-001 `ACC_COST_001` disposition
- ADR-002 Display Acceptance criteria
- ADR-003 hasTable regression judgment
- ADR-004 Legacy pipeline strategy

Index: `data/promotion/adr/README.md`

Architecture Review completed → authorize **RC1 documentation only**.

---

## 2026-07-20 — RC1 Documentation

Added (no runtime code changes in this step):

- `docs/release/RC1.md`
- `docs/release/RC1-BASELINE.md`
- `PROJECT_STATUS.md`
- `CHANGELOG-RC1.md` (this file)

Baseline SHAs recorded for Parser, Emit, Pattern DB, Product Snapshot, Coach.

---

## Not in RC1

- Promotion Apply / Product overwrite
- Coach C4+
- Parser Core modifications
- Resolved G6 / Display Acceptance PASS
- Signed ADR option selections
