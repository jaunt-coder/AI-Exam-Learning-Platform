# Runtime Grader Design (M1 · WP-01)

Milestone: **M1 Learning Loop MVP**  
Module: `runtime/grader.js`  
Status: **IMPLEMENTED**

---

## Purpose

학생 선택 답안과 **이미 해석된** 정답 값을 비교하여 `correct` / `wrong`을 반환한다.

```text
student answer  →  normalize  →  compare  →  correct | wrong
```

---

## Non-goals

- Mastery 계산 실행
- Recommendation / AI coaching
- Question DB / Answer SoT / Pattern DB 수정
- OCR / 정답 값 추측

정답 권한은 SoT에 남는다. Grader는 **비교만** 한다.

---

## API

### `normalizeAnswer(value)`

- 정수 1-based choice
- `①`–`⑤` → 1–5
- 숫자 문자열 `"3"` → `3`

### `gradeAttempt({ selectedAnswer, correctAnswer })`

| Field | Meaning |
|-------|---------|
| `ok` | 비교 가능 여부 |
| `result` | `correct` \| `wrong` \| `null` |
| `selectedNormalized` / `correctNormalized` | 정규화 값 |
| `error` | `selected_answer_missing` \| `correct_answer_unresolved` |

---

## Validation

| Case | Expected |
|------|----------|
| selected=3, correct=3 | `correct` |
| selected=1, correct=3 | `wrong` |
| selected missing | `ok=false` |

---

## Owner

05_Data_Engineer (M1 WP-01)
