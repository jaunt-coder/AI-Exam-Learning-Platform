# Session Architecture

Sprint-06 · Presentation Layer  
Status: **ACTIVE**  
Date: 2026-07-25

---

## Purpose

학생이 **“오늘 Pattern 3개를 익혔다”**고 말할 수 있도록  
학습 단위를 Pattern이 아니라 **Study Session**으로 둔다.

---

## Unit Hierarchy

```text
Study Session          ← 학생 인식 단위 (오늘 공부)
  └── Pattern × N      ← 학습 단위
        └── Question × M
              └── Review
              └── Retrieval
              └── Evidence
```

| 단위 | 역할 | Export |
|------|------|--------|
| Question | Pattern 적용·검증 | 없음 |
| Pattern | 개념 습득 루프 | 없음 |
| **Study Session** | 오늘 공부 묶음 | **종료 시 1회** |

---

## Wrong Model (M2.7 이전)

```text
Pattern 종료 → Closing → Export
```

이 모델은 **Pattern = Session**이다.  
실제 수험 공부와 불일치한다.

---

## Correct Model (Sprint-06)

```text
Today's Study
  ↓
Pattern 선택
  ↓
Preview → Lesson → Question → Review → Retrieval → Evidence
  ↓
Pattern Closing (선택)
  ├─ Continue Learning → Today's Study → 다음 Pattern
  └─ Finish Today's Study → Session Summary → Export(JSON/MD)
```

---

## Presentation Screens

| Screen | ID | 역할 |
|--------|-----|------|
| Today's Study | `#screen-home` | Session Dashboard · Pattern 시작 |
| Pattern Pick | `#screen-pattern-pick` | Pattern 선택 |
| Learning Flow | `#screen-flow` | Pattern 내부 스테이지 + Session Header |
| Pattern Closing | `#screen-closing` | Continue / Finish 선택 (**Export 없음**) |
| Session Summary | `#screen-session-summary` | 오늘 집계 + Export |

---

## Session State (LocalStorage)

Key: `learning.session.v1` (기존 키 유지)

```json
{
  "startedAt": 1721870000000,
  "patternsLearned": ["ACC_INV_001", "ACC_INV_002"],
  "patternsReviewed": ["ACC_INV_001", "ACC_INV_002"],
  "finishedAt": null,
  "exportedAt": null
}
```

- Evidence / Retrieval: Pattern별 append-only 로그 유지 (`pattern_id`로 구분)
- Session은 **집계·종료·Export 경계**만 담당
- Mastery / Recommendation / Planner 필드 **없음** (Future Ready 훅만 문서화)

---

## What Session Aggregates

| Metric | Source | Session에서 |
|--------|--------|-------------|
| Pattern 수 | `patternsLearned[]` | 개수 + 이름 목록 |
| Question 수 | 오늘 attempt / question_history | 고유 문항 수 |
| Evidence | `learning.evidence.v1` (session 구간) | 건수 집계만 |
| Retrieval | `learning.retrieval.v1` (session 구간) | 건수 집계만 |
| Duration | `startedAt` → now / finishedAt | 분 단위 |

Pattern별 Evidence 내용·Retrieval Timeline은 **유지**한다.  
Session Summary에는 **총합만** 표시한다.

---

## Boundaries (Immutable)

- Question DB / Answer DB / Pattern DB / Knowledge **무변경**
- Runtime grading **무변경**
- Evidence 레코드 내용 **무변경**
- AI · Recommendation · Mastery 계산 **미사용** (`mastery = unknown`)

---

## Future Ready (WO-015 / WO-016)

Session 경계만 안정적이면 된다.

| Future Work | Session 훅 | Architecture 변경 |
|-------------|------------|-------------------|
| WO-015 Recommendation | Session Evaluate / Finish 직후 | 불필요 — Session 종료 이벤트만 소비 |
| WO-016 Planner | Today's Study 진입 전 Planning | 불필요 — Pattern 목록 공급만 |

Session은 **컨테이너**다.  
Recommendation·Planner는 Session **안/앞**에 붙는 플러그인이며 Session 단위를 대체하지 않는다.

---

## Principle

```text
Question ⊂ Pattern ⊂ Study Session
Export ∈ Session Finish only
```
