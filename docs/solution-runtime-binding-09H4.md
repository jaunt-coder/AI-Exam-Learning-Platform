# Learning Loop Solution Binding — Sprint-09H-4

**Authority:** Learning Content Runtime Engineer  
**Date:** 2026-07-26  
**Overlay:** `data/question-solution-approved.json`  
**SoT mutation:** None (Question / Answer / Pattern / Mapping / Solution Content 미수정)

---

## 1. Goal

Approved Solution Content Layer를 Learning Loop **Pattern Review** 화면에 연결한다.

대상 문항: `ACC_INV_Q001`, `ACC_INV_Q006`, `ACC_INV_Q022`

---

## 2. Runtime Rules

1. `question-solution-approved.json` **우선** 조회  
2. 존재하면 Review에 **Diagnosis / Steps / Exam Trap / Takeaway** 표시  
3. 없으면 기존 **Pattern Algorithm Review** fallback 유지  

채점·Attempt·Pattern 학습 흐름은 변경하지 않는다.

---

## 3. Architecture

```
loadStudyBundle()
  → loadSolutionOverlay()          # data/question-solution-approved.json
  → enrichStudyQuestionsWithApproved()
       · ACC_2018_Q042 → alias ACC_INV_Q001 (solution lookup)
       · ACC_INV_Q006 / Q022 Phase1 문항을 study pack에 runtime append
  → listStudyPatterns(...)

Review stage
  → getApprovedSolution(currentQuestion.questionId)
  → 있으면 renderApprovedSolutionHtml(...)
  → 없으면 기존 Pattern Review (algorithm / checklist / takeaway)
```

### ID Bridge (Runtime only)

| Runtime questionId | Overlay key |
|--------------------|-------------|
| `ACC_2018_Q042` | `ACC_INV_Q001` |
| `ACC_INV_Q006` | `ACC_INV_Q006` |
| `ACC_INV_Q022` | `ACC_INV_Q022` |

Alias는 Mapping SoT가 아니다. `pattern-master-db` cross_db 노트(Golden vs Phase1 namespace)에 따른 runtime bridge다.

---

## 4. Files Changed

| File | Change |
|------|--------|
| `js/solution-overlay.js` | **신규** — overlay load · alias · enrich · lookup |
| `js/learning-loop-page.js` | init enrich · Review 분기 · Approved UI |
| `css/learning-loop.css` | `.solution-approved*` + mobile ≤768 |

### Unchanged (검증)

- `data/question-db.json`
- `data/question-solution-approved.json` (내용 수정 없음)
- Pattern DB / Mapping / Answer

---

## 5. Review UI

Approved 존재 시:

- Kicker: `Approved Solution`
- Diagnosis
- Steps (`order` · `title` · `explanation`)
- Exam Trap
- Takeaway

Approved 없을 시: 기존 Pattern Why-lens + Review Card + Algorithm Takeaway (변경 없음).

---

## 6. Acceptance

| # | Criterion | Result |
|---|-----------|--------|
| 1 | Q001/Q006/Q022 Review에서 Solution 표시 | **PASS** — Q042 alias→Q001; Q006·Q022 pack 포함 |
| 2 | 기존 문제 풀이 영향 없음 | **PASS** — 채점·Attempt 경로 미변경; Q042 제출→정답 확인 |
| 3 | Solution 없는 문제 fallback | **PASS** — `ACC_2018_Q068` overlay 없음 → Pattern Algorithm 경로 |
| 4 | Mobile UI 깨짐 없음 | **PASS** — 390px, overflowX=false, Solution 블록 정상 |

상세: `docs/solution-runtime-validation-09H4.md`

---

## 7. Verdict

**Learning Loop Solution Binding: COMPLETE**

Approved Solution Layer가 Review에 연결되었고, 미승인 문항은 Pattern Algorithm fallback을 유지한다.
