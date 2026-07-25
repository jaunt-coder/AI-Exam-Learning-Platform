# Question Fidelity Audit

Date: 2026-07-26  
Scope: **Audit only** — Question DB / Runtime **미수정**  
Primary corpus: MVP Inventory (`ACC_INV_*`) **28 / 240**  
Reference corpus: MVP full 240 (render-gap · flag stats)

---

## Goal

원본 시험 자료와 현재 Question DB·Renderer를 비교하여  
문제의 **교육적 완전성**을 검증한다.

검사 항목:

1. 표(Table) 누락  
2. 계산 자료 누락  
3. 도형/Figure 누락  
4. 줄바꿈 붕괴  
5. 선택지 누락  
6. 번호 누락  
7. DB에는 있으나 Renderer가 표시하지 않는 항목  

판정: **PASS** / **WARNING** / **FAIL**

---

## Evidence Sources

| Layer | Path | Status |
|-------|------|--------|
| MVP Question DB | `data/question-db-mvp.json` | Used |
| Declared SoT PDF | `source/original-exams/` | **Missing in workspace** |
| Alternate PDF | `source/past-exams/{year}/` | Partial (StudyPiter) |
| Layer analysis | `data/repair/layer-analysis/ACC_*.md` | Used (L1 ground truth) |
| Pilot extract | `data/knowledge/pilot/2018/` | Used (2018 cross-check) |
| Renderer (product) | `js/shared-renderer.js` · `question.html` | Used |
| Renderer (loop) | `js/stem-renderer.js` · `learning-loop-page.js` | Used |
| Machine assist | `data/analysis/_fidelity-audit-inv-summary.json` | Heuristic aid |

> 원본 `source/original-exams/*.pdf`가 없어 L1 대조는 **layer-analysis + past-exams + pilot raw**로 수행했다.  
> Human Review Checklist로 PDF 재대조를 권장한다.

---

## Method

1. Inventory 28문항 전수 기계 스캔 (표 붕괴 신호 · choice 수 · figure · hasTable)  
2. FAIL 후보를 layer-analysis L1 / pilot stem과 대조  
3. Renderer 코드 경로별 **표시 가능 필드** 목록화  
4. Human 판정으로 false positive 완화 (아래 Inventory Verdict)

---

## Inventory Verdict (28)

| Status | Count | Share |
|--------|------:|------:|
| **FAIL** | 12 | 43% |
| **WARNING** | 6 | 21% |
| **PASS** | 10 | 36% |

### FAIL (교육적으로 표·계산자료가 깨진 문항)

| questionId | Missing / Defect |
|------------|------------------|
| `ACC_2017_Q066` | 소매재고 **표**가 stem 한 줄로 붕괴 · `hasTable:false` · table UI 없음 |
| `ACC_2017_Q080` | 1·2월 **원가 표** 붕괴 · 계산 열 구조 소실 |
| `ACC_2018_Q066` | 원가/매가 **표** 붕괴 (pilot raw는 행 단위, MVP는 flatten) |
| `ACC_2018_Q068` | 기말재고·순이익 **자료 표** flatten · `table`은 **보기 그리드만** 저장 |
| `ACC_2020_Q066` | 상품 A/B/C **평가 표** flatten · ○ 줄바꿈 붕괴 동반 |
| `ACC_2024_Q043` | 항목×원가/NRV **표** flatten |
| `ACC_2024_Q044` | 소매재고 **표** flatten + **choice[5]에 시험지 footer 혼입** |
| `ACC_2024_Q075` | 계산 표/자료 flatten (`TABLE_COLLAPSED` / `CALC_MATERIALS_FLAT`) |
| `ACC_2024_Q076` | 동일 |
| `ACC_2025_Q043` | 동일 |
| `ACC_2025_Q044` | 동일 |
| `ACC_2025_Q073` | 동일 |

상세 표 누락: [`docs/table-missing-report.md`](table-missing-report.md)

### WARNING

| questionId | Issue |
|------------|-------|
| `ACC_2015_Q075` | ○ 항목이 한 줄에 다중 결합 (`LINEBREAK_MULTI_CIRCLE`) |
| `ACC_2020_Q049` | 표 여부는 애매 · 수치 나열 가독성 저하 (Human PDF 확인 필요) |
| `ACC_2020_Q073` | stem 줄바꿈 없음 (`LINEBREAK_FLAT`) |
| `ACC_2024_Q047` | ○ 다중 결합 |
| `ACC_2025_Q051` | Pattern=`ACC_INV_003`이나 본문은 유형자산 성격 · 분류 WARNING |
| `ACC_2025_Q053` | 줄바꿈/가독성 WARNING |

### PASS

`ACC_2017_Q069`, `ACC_2017_Q077`, `ACC_2018_Q042`, `ACC_2018_Q079`,  
`ACC_2020_Q063`, `ACC_2020_Q076`, `ACC_2024_Q073`,  
`ACC_2025_Q063`, `ACC_2025_Q065`, `ACC_2025_Q079`

---

## Check Item Summary

| # | Item | Inventory finding |
|---|------|-------------------|
| 1 | Table missing | **FAIL 다수** — 소매재고·원가표가 stem flatten |
| 2 | Calc materials missing | **FAIL** — 표와 동일 케이스가 대부분 (구조 소실) |
| 3 | Figure missing | **PASS (N/A)** — DB `figure:false` 전수(240) · 원본 figure 후보 미확인 |
| 4 | Line-break collapse | **WARNING** — ○ 다중 라인 · flat stem |
| 5 | Choices missing | **PASS** — inventory·전수 모두 choices=5 · empty 없음 |
| 6 | Number missing | **WARNING (render)** — `source.questionNumber`는 DB에 있으나 stem/UI 본문에 미표시인 경로 있음 |
| 7 | DB vs Renderer gap | **FAIL/WARNING** — 아래 및 [`render-gap-report.md`](render-gap-report.md) |

---

## Full DB Snapshot (240)

| Metric | Value |
|--------|------:|
| `hasTable: true` | 38 |
| `table` non-null | 38 |
| `hasTable` but null table | 0 |
| `figure: true` | **0** |
| `hasCalculation: true` | 227 |
| `choices.length ≠ 5` | **0** |
| Table hidden by year-pair rule | 4 (`ACC_2015_Q051`, `Q055` 2017, `Q054` 2020, `Q062` 2024) |

---

## Overall Audit Status

| Axis | Status |
|------|--------|
| Inventory educational completeness | **FAIL** (12/28) |
| Choice cardinality | **PASS** |
| Figure pipeline | **WARNING** (항상 false · 미검증) |
| Product renderer (question/exam) table path | **WARNING** (정상 작동하나 붕괴 데이터면 표시 불가) |
| Learning-loop renderer | **FAIL (gap)** — MVP `table`/`hasTable` 미사용 |
| SoT PDF availability | **WARNING** — `original-exams` 부재 |

**총평:** Inventory Pattern 학습 핵심 문항에서 **표·계산자료 fidelity가 교육적으로 불완전**하다.  
DB/Runtime 수정 없이 Audit만 완료했다.

---

## Deliverables

| Doc | Purpose |
|-----|---------|
| `docs/question-fidelity-audit.md` | 본 보고서 |
| `docs/table-missing-report.md` | FAIL 표/계산자료 상세 |
| `docs/render-gap-report.md` | DB 필드 vs Renderer |
| `docs/question-fidelity-human-review-checklist.md` | Human Review Checklist |

---

## Out of Scope (준수)

- Question DB 수정 금지  
- Runtime 수정 금지  
- Sprint-09 미진행  
- AI / Recommendation / Mastery 미개입  
