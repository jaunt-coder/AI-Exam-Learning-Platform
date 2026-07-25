# Question Fidelity — Human Review Checklist

Date: 2026-07-26  
Use with: [`question-fidelity-audit.md`](question-fidelity-audit.md)  
Do **not** edit Question DB during this review.

---

## Prep

- [ ] `source/original-exams/{2015,2017,2018,2020,2024,2025}.pdf` 확보 (없으면 `source/past-exams` + layer-analysis L1)
- [ ] `question.html` (MVP) 와 `learning-loop.html` 각각 브라우저 준비
- [ ] 판정 기입: PASS / WARNING / FAIL
- [ ] FAIL이면 **누락 요소**를 한 줄로 기록

---

## Per-Question Checklist (copy per ID)

```
questionId: _______________
PDF page: _______________

[ ] 1. Table — 원본 표가 DB·화면에 표로 보이는가?
[ ] 2. Calc materials — 계산에 필요한 수치 열이 누락/붕괴 없는가?
[ ] 3. Figure — 도형/그림이 있으면 DB·화면에 있는가?
[ ] 4. Line breaks — ○/①/문단이 읽기 좋게 분리되는가?
[ ] 5. Choices — ①~⑤ 모두 있고 footer/다른 문항 문구 혼입 없는가?
[ ] 6. Number — 문항 번호가 UI에서 확인 가능한가?
[ ] 7. Render gap — DB 필드(table 등)가 화면에 반영되는가?

Verdict: PASS / WARNING / FAIL
Missing elements (if FAIL):
-
-
Reviewer / date:
```

---

## Priority Queue (FAIL first)

| # | questionId | Focus |
|---|------------|-------|
| 1 | `ACC_2017_Q066` | 소매재고 표 |
| 2 | `ACC_2018_Q066` | 소매재고 표 (pilot 대조) |
| 3 | `ACC_2018_Q068` | 자료 표 vs choice-grid table |
| 4 | `ACC_2017_Q080` | 월별 원가 표 |
| 5 | `ACC_2024_Q044` | 표 + choice footer |
| 6 | `ACC_2024_Q043` | NRV 표 |
| 7 | `ACC_2020_Q066` | 상품별 저가 표 |
| 8 | `ACC_2024_Q075` | 표/자료 |
| 9 | `ACC_2024_Q076` | 표/자료 |
| 10 | `ACC_2025_Q043` | 표/자료 |
| 11 | `ACC_2025_Q044` | 표/자료 |
| 12 | `ACC_2025_Q073` | 표/자료 |

---

## WARNING Queue

| questionId | Focus |
|------------|-------|
| `ACC_2015_Q075` | ○ 줄바꿈 |
| `ACC_2020_Q049` | 표 여부 확인 |
| `ACC_2020_Q073` | flat stem |
| `ACC_2024_Q047` | ○ 줄바꿈 |
| `ACC_2025_Q051` | Pattern 분류 vs 본문 |
| `ACC_2025_Q053` | 가독성 |

---

## PASS Spot-Check (최소 3문항)

| questionId | Confirm still PASS |
|------------|--------------------|
| `ACC_2018_Q042` | [ ] |
| `ACC_2017_Q077` | [ ] |
| `ACC_2025_Q079` | [ ] |

---

## Renderer Path Checks

### Product (`question.html`)

- [ ] `hasTable:true` 문항에서 표 DOM이 보이는가?
- [ ] Year-pair choice 문항(`ACC_2015_Q051` 등)에서 표가 숨겨져도 학습에 문제 없는가?
- [ ] `ACC_2024_Q044` choice 5에 footer가 보이는가? (예상: FAIL)

### Learning Loop (`learning-loop.html`)

- [ ] 2018 pilot 문항 stem만 보이는가?
- [ ] table UI가 **없는** 것을 확인했는가? (Render gap G-06)

---

## Infrastructure

- [ ] `source/original-exams` 복구 여부 기록
- [ ] Audit 판정과 Human 판정이 다른 ID 목록 작성
- [ ] 후속 Repair WO 후보 ID만 제안 (이 단계에서 DB 수정 금지)

---

## Sign-off

| Role | Name | Date | Notes |
|------|------|------|-------|
| Reviewer | | | |
| Approver | | | Audit only — no DB change |
