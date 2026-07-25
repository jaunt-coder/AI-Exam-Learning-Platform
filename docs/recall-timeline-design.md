# Recall Timeline Design (M2.7)

Status: **ACTIVE**

---

## Purpose

같은 Pattern을 다시 학습할 때 **이전 회상**을 보여 주고,  
학생이 **스스로 변화만** 확인하게 한다.

AI는 발전 여부를 **평가하지 않는다**.

---

## Data Source

`learning.retrieval.v1` 로그에서 `pattern_id`로 필터 → 시간순 정렬.

별도 SoT 파일 없음. Timeline은 **파생 뷰**.

```json
{
  "pattern_id": "ACC_INV_001",
  "history": [
    {
      "retrieval_id": "ret_...",
      "attempt_id": "evt_...",
      "created_at": "...",
      "student_response": "FOB를 잘 모르겠다",
      "char_count": 12
    }
  ]
}
```

API: `getRecallTimeline(patternId)` · `getPreviousRecall(patternId)`

---

## WP-12 — 학습 중 표시

Retrieval 단계에서:

```
지난번 회상
“FOB를 잘 모르겠다”
──────────────
이번에는
어떻게 설명하겠습니까?
__________________
```

현재 attempt의 회상은 “지난번”에서 제외한다.

---

## WP-13 — Pattern 화면 Timeline

Pattern 선택 화면에서 **회상 기록 보기**:

```
1차  잘 모르겠다.
 ↓
2차  발송주의 확인.
 ↓
3차  FOB Shipping Point는 발송 시점 소유권 이전.
```

평가·점수·“성장률” 라벨 없음.

---

## Non-Goals

- 회상 품질 점수
- “이전보다 좋아짐” 판정
- Recommendation / Coach 트리거 (미래 예약만)
