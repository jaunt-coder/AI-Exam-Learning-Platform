# Sprint-09A Report — Official Source Navigator & QA Patch Foundation

Date: 2026-07-26  
Scope: **Presentation · Source Mapping · QA Reporting only**

---

## Goal

데이터를 고치지 않는다.  
학생이 학습을 멈추지 않고 원본 시험지를 확인하고, 이상하면 QA를 남겨  
Question Patch Queue Foundation을 구축한다.

---

## Deliverables

| File | Status |
|------|--------|
| `data/question-source-map.json` | **Updated** v1.1.0 · `questionNo` |
| `js/source-viewer.js` | Navigator + Finder + dual buttons |
| `js/problem-report.js` | Modal · append-only · Export |
| `css/source-viewer.css` | Navigator / Report / Settings styles |
| `settings.html` / `js/settings-page.js` | Problem Reports dashboard |
| `docs/source-map-spec.md` | Updated |
| `docs/problem-report-system.md` | Created |
| `docs/question-patch-foundation.md` | Created |
| `docs/sprint-09A-official-source-navigator.md` | This file |

Hosts (unchanged): `question.html` · `exam.html` · `learning-loop.html`

---

## WP Results

| WP | Result |
|----|--------|
| 01 Official Source Map | **PASS** — `questionNo` · DB 미수정 |
| 02 Official Source Viewer | **PASS** — 📄 원본 시험지 |
| 03 Question Navigator | **PASS** — Overlay (연도/페이지/문항) |
| 04 Question Finder | **PASS** — Ctrl+F 안내 · 복사 · 자동검색 없음 |
| 05 Source Missing | **PASS** — hint + PDF 버튼 "원본 연결 준비중" |
| 06 Problem Report Button | **PASS** — 🐞 문제 수정 요청 |
| 07 Problem Report Modal | **PASS** — ID/원본 자동 · QA 체크 · 메모 |
| 08 Storage | **PASS** — `learning.problemReports.v1` append-only |
| 09 Export | **PASS** — JSON / MD (Evidence 별도) |
| 10 Future Patch Hook | **PASS** — `patchTarget` only |
| 11 Dashboard | **PASS** — Settings 통계 |
| 12 Documentation | **PASS** |

---

## Acceptance Criteria

| Criterion | Status |
|-----------|--------|
| 모든 문제에 📄 원본 시험지 표시 | ✓ |
| 클릭 → Navigator → PDF `#page=` | ✓ |
| Question Number 표시 | ✓ |
| Source 없음 → 원본 연결 준비중 | ✓ |
| 🐞 문제 수정 요청 | ✓ |
| QA 저장 | ✓ |
| JSON / Markdown Export | ✓ |
| append-only | ✓ |
| Question / Pattern / Answer DB 미수정 | ✓ |
| Recommendation / AI / Mastery / Parser / OCR 없음 | ✓ |

---

## Non-Goals (confirmed)

- Question / Answer / Pattern / Knowledge SoT 수정
- Recommendation · AI Coach · Mastery
- Parser · OCR 재수행
- 자동 Question Patch 적용

---

## Next (suggested)

1. 미연결 연도(2015·2017) PDF를 `source/past-exams`에 배치 후 Source Map 재생성
2. Analyst import 파이프라인 (`07_User_Research_Analyst`)
3. Question Patch System (승인 게이트 후)
