# Pattern Master Mode

M2.2 Learning Mode · Default recommendation for first-time learners

---

## Purpose

Pattern을 **문제보다 먼저** 익힌다.

```text
Pattern Preview
  → Pattern Introduction
  → Mechanical Algorithm
  → Study Know-how
  → Checklist
  → Question
  → Submit / Feedback
  → Pattern Review
```

---

## Who should use it

- 초시생
- 기초학습
- Pattern 암기·체화

---

## Screen map

| Stage | Learner sees |
|-------|----------------|
| Preview | Name · Grade · Frequency · Overview · Goal · Keywords |
| Introduction | 소개 · 출제 의도 · 흔한 착각 · 등장 시점 |
| Algorithm | Numbered mechanical steps + decision cards |
| Know-how | 시험장 우선 행동 · 암기 · 함정 · 체크포인트 |
| Checklist | Mental checklist before reading the stem |
| Question | Stem (OCR-cleaned) + choices |
| Result | 정답 / 선택 / 정오 |
| Review | Pattern reinforcement (concept · algorithm · related) |

---

## Data sources

Verified / existing only — see `js/pattern-lesson.js`.

Study patterns currently available when Golden mapping is `mapped` **and** Master `validation_status=verified` (e.g. `ACC_INV_001`, `ACC_INV_006`).

---

## Persistence

| Key | Value |
|-----|-------|
| `learning.studyMode.v1` | `pattern_master` |
| `learning.session.v1` | patternsLearned / patternsReviewed / startedAt |

---

## Out of scope

Recommendation · AI Coach · Mastery execution · Generated explanations
