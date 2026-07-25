# Session Summary Design

Sprint-06 · WP-03 · WP-07 · WP-09  
Status: **IMPLEMENTED**  
Date: 2026-07-25

---

## Purpose

**Finish Today's Study** 선택 후에만 Session Summary를 보여준다.  
학생이 “오늘 익힌 Pattern 목록”을 한눈에 확인하게 한다.

Pattern Closing ≠ Session Summary.

---

## Entry Condition

```text
Pattern 루프 완료
  → Pattern Closing
  → Finish Today's Study 클릭
  → Session Summary
```

Continue Learning 경로에서는 Session Summary를 열지 않는다.

---

## Layout

```text
오늘 공부 요약
────────────────
Pattern     N
Question    N
Evidence    N
Retrieval   N
공부시간    N분

오늘 익힌 Pattern
✓ 기말재고 포함 여부
✓ FIFO
✓ 총평균법

세션 기록 내보내기
[ session JSON ]  [ session Markdown ]
```

---

## Metrics (집계만)

| Field | Rule |
|-------|------|
| Pattern | `patternsLearned.length` |
| Question | 세션 구간 고유 `question_id` 수 |
| Evidence | 세션 구간 Evidence 건수 |
| Retrieval | 세션 구간 Retrieval 건수 (answered 포함 전체) |
| 공부시간 | `startedAt` ~ `finishedAt`(또는 now) 분 |

- AI 분석·점수·Mastery **표시 금지**
- Evidence 본문·Retrieval 전문은 Summary에 **펼치지 않음** (Export에만 전체)

---

## Pattern List (WP-09)

- `patternsLearned` 순서 유지
- 표시 이름: Pattern Lesson `name` (없으면 `pattern_id`)
- 체크 마크(✓)로 “익힘” 시각화
- Recommendation 문구 없음

---

## Relation to Pattern Closing

| Screen | 내용 | Export |
|--------|------|--------|
| Pattern Closing | 방금 익힌 Pattern 1개 + Continue/Finish | **없음** |
| Session Summary | 오늘 Session 전체 집계 + Pattern 목록 | **있음** |

---

## Copy Rules

- 제목: **오늘 공부 요약**
- 부제: Pattern 개수 중심 (“오늘 Pattern N개를 익혔습니다”)
- “세션 기록을 JSON/Markdown으로 내보내세요”는 Summary에서만

---

## Non-Goals

- Planner / Recommendation CTA
- Mastery 게이지
- Pattern별 Evidence 상세 카드
- Retrieval Timeline 전체 렌더
