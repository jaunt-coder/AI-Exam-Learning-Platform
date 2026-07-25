# Source Viewer Design

Sprint-09 · Sprint-09A  
Status: **IMPLEMENTED**  
Date: 2026-07-26

---

## Goal

학생이 학습 중 **언제든 원본 시험지 PDF**를 확인하고,  
문항 번호를 빠르게 찾은 뒤, 이상하면 QA를 남긴다.

데이터 품질을 고치는 Sprint가 아니다.

---

## UI Placement

문제 영역 **우측 상단**:

```text
[ meta tags … ]     [ 📄 원본 시험지 ] [ 🐞 문제 수정 요청 ] [ 북마크 ]
```

적용 화면:

| Page | Host |
|------|------|
| `question.html` | `#source-viewer-host` |
| `exam.html` | `#exam-source-viewer-host` |
| `learning-loop.html` | `#loop-source-viewer-host` |

---

## Interaction

### 1) 원본 시험지 → Navigator Overlay

연도 · 페이지 · 문항 번호 · 문제 ID 표시.

### 2) Question Finder

- Desktop: Ctrl+F 안내 · 토큰 예 `17.`
- Mobile: 뷰어 검색 안내
- 복사 버튼 · **자동 검색 없음**

### 3) PDF 열기

```js
window.open(pdf + "#page=" + page, "_blank");
```

### Unavailable

- Hint: **원본 연결 준비중**
- Navigator 내 PDF 버튼 비활성
- 오류 throw 없음

### 4) 문제 수정 요청

→ Problem Report Modal (`js/problem-report.js`)  
→ Storage `learning.problemReports.v1` (append-only)

---

## Modules

| File | Role |
|------|------|
| `js/source-viewer.js` | Map load · Navigator · PDF open |
| `js/problem-report.js` | Modal · storage · export |
| `css/source-viewer.css` | Layout · overlays |

---

## Related Docs

- [source-map-spec.md](source-map-spec.md)
- [problem-report-system.md](problem-report-system.md)
- [question-patch-foundation.md](question-patch-foundation.md)
- [sprint-09A-official-source-navigator.md](sprint-09A-official-source-navigator.md)
