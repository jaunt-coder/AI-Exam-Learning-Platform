# Sprint-09 Report — Official PDF Source Viewer

Date: 2026-07-26  
Scope: **Presentation + Source Mapping only**

---

## Goal

문제 데이터 품질 이슈(표·계산표·줄바꿈·OCR)를 **즉시 보완 참조**할 수 있도록  
학생이 원본 PDF를 언제든 여는 Official Source Viewer를 구현한다.

데이터·Parser·OCR을 고치지 않는다.

---

## Deliverables

| File | Status |
|------|--------|
| `data/question-source-map.json` | **Created** (240 entries · 160 linked) |
| `js/source-viewer.js` | **Created** |
| `css/source-viewer.css` | **Created** |
| `question.html` / `js/question.js` | Button wired |
| `exam.html` / `js/exam.js` | Button wired |
| `learning-loop.html` / `js/learning-loop-page.js` | Button wired |
| `js/evidence-pad.js` | QA checkbox **원본 확인 필요** |
| `docs/source-map-spec.md` | Done |
| `docs/source-viewer-design.md` | Done |
| `docs/sprint-09-official-source-viewer.md` | This file |

---

## WP Results

| WP | Result |
|----|--------|
| 01 Source Map | **PASS** — DB 미수정 · map 분리 파일 |
| 02 Viewer Button | **PASS** — `window.open(pdf#page=n)` |
| 03 Missing Handling | **PASS** — disabled + 원본 연결 준비중 |
| 04 Mobile | **PASS** — 44px · full-width |
| 05 Evidence QA | **PASS** — questionId flag only |
| 06 Documentation | **PASS** |

---

## Acceptance Criteria

| Criterion | Status |
|-----------|--------|
| 문제마다 원본 PDF 버튼 표시 | **PASS** |
| 클릭 시 PDF 새 탭 | **PASS** (linked) |
| `#page=n` 이동 | **PASS** (브라우저 지원 시) |
| Source 없는 문제 비활성 | **PASS** (2015·2017 등) |
| Question DB 수정 없음 | **PASS** |
| AI / Recommendation / Parser / SoT 변경 없음 | **PASS** |

---

## Coverage Note

| Year | Viewer |
|------|--------|
| 2018 · 2020 · 2024 · 2025 | `source/past-exams/{year}/exam_2.pdf` 연결 |
| 2015 · 2017 | PDF 부재 → **원본 연결 준비중** |

`source/original-exams/`가 생기면 map 재생성으로 승격 가능 (DB 수정 불필요).

---

## Principle Restated

이번 Sprint는 품질을 고치는 Sprint가 아니다.  
**원본 시험지를 즉시 열어보는 길**을 만든 Sprint다.
