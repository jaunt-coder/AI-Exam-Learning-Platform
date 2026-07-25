# Render Gap Report

Date: 2026-07-26  
Scope: Question DB fields vs Presentation renderers  
DB / Runtime **미수정**

---

## Purpose

**DB에는 존재하거나 의미 있는 값이 있는데**,  
현재 UI Renderer가 **표시하지 않는** 항목을 목록화한다.

---

## Renderer Paths

| Path | Entry | Data source |
|------|-------|-------------|
| A · Product | `question.html` / `exam.html` | `data/question-db-mvp.json` via `shared-renderer.js` |
| B · Study Session | `learning-loop.html` | Pilot `data/knowledge/pilot/2018/candidate/*.json` via `stem-renderer.js` |

두 경로는 **스키마·필드가 다르다.**

---

## Path A — Product (`shared-renderer.js`)

### Rendered

| DB field | Render API | Notes |
|----------|------------|-------|
| `question` | `mountQuestionStem` → `textContent` | 줄바꿈은 CSS `pre-wrap`에 의존 |
| `table` + `hasTable` | `mountQuestionTable` | markdown → `<table>` |
| `choices[5]` | `renderChoiceItems` | 연도쌍이면 pair span |

### Present in DB but NOT rendered (or conditionally suppressed)

| DB field | Gap | Severity |
|----------|-----|----------|
| `originalQuestion` | UI 미사용 (표 포함 원문 보관용) | **WARNING** |
| `formula` | 전수 null에 가깝고 mount 없음 | WARNING |
| `figure` | 전수 `false` · 이미지 mount 없음 | WARNING |
| `solution.*` | 학습자 stem/table에 미노출 (엔진 내부용) | PASS (의도) |
| `source.questionNumber` | stem에 번호 문구 없음 · UI 헤더 의존 | WARNING |
| `hasCalculation` | 플래그만 · 별도 UI 없음 | PASS (메타) |
| `table` when year-pair choices | `shouldShowQuestionTable` → **false** (의도적 숨김) | WARNING — 4문항 |
| Collapsed calc table in `question` | table 필드 없어 mount 불가 | **FAIL** (data) |

### Year-pair table suppression (code)

```24:30:js/shared-renderer.js
export function shouldShowQuestionTable(question) {
  ...
  if (choicesIncludeYearPairs(question.choices)) {
    return false;
  }
```

Affected IDs: `ACC_2015_Q051`, `ACC_2017_Q055`, `ACC_2020_Q054`, `ACC_2024_Q062`  
→ DB `table`은 있으나 **Renderer가 숨김** (choices에 연도쌍이 있을 때).

---

## Path B — Learning Loop (`stem-renderer.js`)

### Rendered

| Pilot field | Render |
|-------------|--------|
| `stem` | `renderQuestionStemHtml` (○/① 문단화) |
| `choices` | 페이지 인라인 radio |

### DB(MVP) fields that never reach this path

| MVP field | Gap |
|-----------|-----|
| `question` | Pilot는 `stem`만 사용 · MVP inventory와 스키마 불일치 |
| `table` / `hasTable` | **완전 미사용** · `#question-table` 없음 |
| `originalQuestion` | 미사용 |
| `figure` / `formula` | 미사용 |

**Severity: FAIL (architecture gap)** — Study Session에서 MVP 표 문항을 열면 표를 보여줄 경로가 없다.  
(현재 loop는 2018 pilot 후보만 로드.)

---

## Gap Matrix (교육 영향)

| Gap ID | Description | Path | Status |
|--------|-------------|------|--------|
| G-01 | `originalQuestion` 미표시 | A | WARNING |
| G-02 | `table` 숨김 (year-pair rule) | A | WARNING |
| G-03 | `figure` 렌더 경로 없음 | A/B | WARNING |
| G-04 | `formula` 렌더 경로 없음 | A | WARNING |
| G-05 | `questionNumber` 본문 미표시 | A/B | WARNING |
| G-06 | Learning-loop ignores `table` | B | **FAIL** |
| G-07 | Collapsed stem tables (no `table` field) | A/B | **FAIL** (data→render) |
| G-08 | Choice footer text rendered as choice | A | **FAIL** (`ACC_2024_Q044` 등) |

---

## Choice / Number Findings

| Check | Result |
|-------|--------|
| choices length ≠ 5 | **0 / 240** → PASS |
| empty choice | 0 → PASS |
| Footer contamination | **FAIL example:** `ACC_2024_Q044` choice 5 |
| Exam number in stem | Usually absent → WARNING (UI chrome must supply) |

---

## Figure Findings

| Check | Result |
|-------|--------|
| `figure: true` in MVP | **0** |
| Image/asset renderer | None |
| Verdict | Figure 누락을 DB만으로 증명 불가 · PDF Human Review 필요 → **WARNING** |

---

## Summary Verdict

| Renderer | Educational display completeness |
|----------|----------------------------------|
| Product question/exam | **WARNING** — table path OK when data OK; gaps on originalQuestion/figure/number; year-pair hide |
| Learning-loop | **FAIL (gap)** — no table pipeline |
| Combined with table-collapse data | **FAIL** for inventory teaching set |

상세 표 붕괴 목록: [`table-missing-report.md`](table-missing-report.md)
