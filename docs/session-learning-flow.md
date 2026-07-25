# Session Learning Flow

Sprint-08 · Learning Flow First  
Status: **ACTIVE**  
Date: 2026-07-26

---

## Student-Facing Order

```text
Today's Study
  ↓
Pattern Preview          ← Home에서 먼저 읽음
  ↓
Pattern Master / Exam    ← 모드 선택
  ↓
Start
  ↓
Question                 ← 자동 진입 (다음 버튼 불필요)
  ↓
Review
  ↓
Retrieval
  ↓
Evidence
  ↓
Closing
  ↓
Next Pattern  또는  Finish Today's Study
  ↓
Session Summary + Export ← Finish 시에만
```

---

## Screen Responsibilities

| Screen | Shows | Hides |
|--------|-------|-------|
| Today's Study | Beta · compact Session Progress · Preview · Mode · Start | Flow buttons · Export · Current Study card |
| Flow | Question→… · stage nav · collapsible Dashboard | Duplicate home Progress · Session header |
| Pattern Closing | Pattern 완료 · Next Pattern / Finish | Export |
| Session Summary | 오늘 집계 · Export | — |

---

## Start → Question

Preview는 Today's Study에서 이미 소비한다.  
Start 클릭 시 flow는 **Question stage**로 바로 연다.

- Pattern Master / Exam 모두 동일 진입(모드별 Review 강화는 기존 유지)
- Lesson 패널(prev/intro/…)은 Resume 호환용으로 코드에 남기되, Start 경로에서는 건너뛴다
- Prev는 Question 이전 stage로 되돌아가지 않는다

---

## Session Progress (단일 소스)

`sessionMetrics()` → `applySessionProgress()`

- Home: compact card만
- Flow: Dashboard(접기 가능)만  
동일 화면에 두 Progress를 겹치지 않는다.

---

## Non-Goals

- Runtime grading / Storage / SoT DB 변경
- AI · Recommendation · Mastery
