# Evidence Card Spec (M2.7)

Status: **ACTIVE**  
Schema: `learning.evidence.v2`

---

## Layout (학생 화면)

```
========================
이번 문제 기록
========================

Pattern 이해
  이해했다 / 애매하다 / 모르겠다

어려웠던 이유
  □ 계산 □ 개념 □ 문제 해석
  □ 함정 □ 시간 부족 □ 집중력

시험장에서 다시 나오면?
  맞힐 수 있다 / 반반 / 자신 없다

친구에게 30초 설명할 수 있다
  가능 / 애매 / 불가능

다시 풀고 싶다
  □ YES

한 줄 메모
  _____________________

[ Save Evidence ]
========================
```

---

## Field Contract

| UI | JSON key | Values |
|----|----------|--------|
| Pattern 이해 | `pattern_understanding` | `understood` · `unclear` · `not_understood` |
| 어려웠던 이유 | `difficulty_reasons[]` | `calc` · `concept` · `interpretation` · `trap` · `time` · `focus` |
| 시험장 재출 | `exam_retry` | `can` · `maybe` · `cannot` |
| 친구 설명 | `explain_friend` | `can` · `maybe` · `cannot` |
| 다시 풀고 싶다 | `want_retry` | boolean |
| 한 줄 메모 | `memo` | string (max 200 UI) |

### Required before Save

- `pattern_understanding`
- `exam_retry`
- `explain_friend`

체크박스·메모는 선택.

---

## Automatic Context (학생 비표시)

저장 시 서비스가 자동 포함:

| Field | Source |
|-------|--------|
| `question_id` | 현재 문항 |
| `pattern_id` | 현재 Pattern |
| `attempt_id` | Attempt `event_id` |
| `session_id` | `session-YYYYMMDD` |
| `student_answer` | 제출 선택 |
| `correct_answer` | 문항 정답 값 (읽기 전용) |
| `is_correct` | grade result |
| `study_mode` | `pattern_master` \| `exam` |
| `timestamp` | ISO |

학생 화면에 **Strength / Candidate / Observation / raw ID debug** 를 표시하지 않는다.

---

## Interaction

| Input | Behavior |
|-------|----------|
| Tab | 다음 컨트롤 |
| Space / Enter | 선택 토글(라디오형 버튼) |
| Escape | Pad 닫기 (draft 저장) |
| Save Evidence | append + draft clear |

---

## Progress (Sidebar)

| Label | Target |
|-------|--------|
| Evidence `n / 20` | session evidence count |
| Pattern `n / 5` | distinct pattern_id in session |

집계만 한다. 점수·Mastery·Confidence 없음.

---

## Persistence

- Draft key: `learning.evidence.draft.v1`
- 키: `question_id` → form state
- 새로고침·이동 후 동일 문항에서 복원
- Save 성공 시 해당 draft 삭제
