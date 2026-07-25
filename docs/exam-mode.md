# Exam Mode

M2.2 Learning Mode · Minimal interruption for practice / mock exams

---

## Purpose

실전처럼 **바로 문제**에 들어간다.  
다만 제출 후에는 반드시 **Pattern Review**로 Pattern을 강화한다.

```text
Question → Submit → Feedback → Pattern Review
```

Preview / Introduction / Algorithm / Know-how / Checklist 단계는 **생략**.

---

## Who should use it

- 복습
- 모의고사
- 실전훈련

---

## Behavior

1. Mode select → Exam Mode
2. Pick a verified Pattern (문항 묶음)
3. Solve questions with Prev/Next within that Pattern’s mapped set
4. After submit → Result → Pattern Review
5. Mastery remains `unknown` · Recommendation remains `absent`

---

## Persistence

| Key | Value |
|-----|-------|
| `learning.studyMode.v1` | `exam` |

---

## Relation to Pattern Master Mode

Same runtime grader / Attempt / Learning State (M1).  
Same Pattern Review assets.  
Difference = **when** Pattern teaching surfaces appear (before vs after).

---

## Out of scope

Adaptive exam scheduling · Recommendation · Coach · Mastery labels
