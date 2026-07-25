# Sprint-04 Report — Educational Readiness Polish

Status: **IMPLEMENTED** (Human Re-Review pending)  
Owner: `08_Learning_Experience_Designer`  
Baseline: M2.7 Beta Not Ready (46/60)  
Date: 2026-07-24  
Template: Sprint Template Standard (Mandatory)

---

## Sprint Goal

학생이 세션 종료 후  
*“문제를 20개 풀었다”*가 아니라  
*“오늘 ○○ Pattern을 익혔다”*고 말하게 만든다.

교육 효과 Polish only. AI / Reco / Mastery / SoT 변경 없음.

---

## Learning Problem

| ID | Problem |
|----|---------|
| LP-01 | Review가 “왜”를 Pattern으로 닫지 못함 (M2.7 FAIL) |
| LP-02 | Closing이 Pattern 기억으로 약함 |
| LP-03 | Beta 범위·커버리지가 숨겨져 기대 배신 |
| LP-04 | Immersion 잔여 (개발 토글·placeholder) |

---

## Evidence

| Source | Use |
|--------|-----|
| M2.7 Beta Review | BK-C01 Review, BK-C02 Coverage, Immersion FAIL |
| Human Charter Sprint-04 | WP-01~08 |

---

## Hypothesis

| ID | Title | Status | Implementation | Validation |
|----|-------|--------|----------------|------------|
| H-401 | Why Lens raises Review score | Approved→Implemented | Done | Pending Human |
| H-402 | Review Card + Takeaway stick Pattern | Approved→Implemented | Done | Pending |
| H-403 | Scope honesty reduces expectation break | Approved→Implemented | Done | Pending |
| H-404 | Immersion hygiene lifts score | Approved→Implemented | Done | Pending |

---

## Deliverables

### Code

| WP | Output |
|----|--------|
| WP-01 | Review Why Lens in `renderReview` |
| WP-02 | Pattern Review Card block |
| WP-03 | Exam Takeaway 3줄 |
| WP-04 | Mistake Replay (wrong only · no inference) |
| WP-05 | Educational Closing |
| WP-06/08 | Beta Scope + Coverage notice on Home |
| WP-07 | Immersion — header toggle 제거, footer `···`, placeholder/Mastery DOM 제거 |

### Docs

- `docs/sprint-04-educational-readiness-polish.md` (본 문서)
- `docs/review-why-lens-design.md`
- `docs/pattern-review-card.md`
- `docs/session-closing-design.md`
- `docs/beta-scope-notice.md`

### Files touched

| File | Change |
|------|--------|
| `js/pattern-lesson.js` | `verified_mistakes`, `exam_takeaway` 조립 |
| `js/learning-loop-page.js` | Review/Closing/Scope |
| `learning-loop.html` | Scope notice · Immersion |
| `css/learning-loop.css` | Why/Card/Takeaway/Scope styles |
| `js/evidence-pad.js` | 한글 라벨 |
| `index.html` | CTA |

---

## Acceptance Criteria

- [x] Review가 Pattern 중심이다
- [x] 왜 맞았는지 / 왜 틀렸는지 Pattern 관점 블록 존재 (문항별 추론 없음)
- [x] Pattern Review Card 존재
- [x] Exam Takeaway 3줄 (기존 자산)
- [x] Mistake Replay = Algorithm/Checklist/verified 함정 재노출
- [x] Session Closing Pattern 중심
- [x] 개발용 Mastery/Reco/placeholder 학습자 화면 제거
- [x] Beta Scope · Coverage 안내
- [x] Question/Answer/Pattern SoT 미수정

---

## Sprint Dashboard

```text
Implementation  ██████████  100%  (WP-01~08 code/docs)
Evidence        ████░░░░░░   40%  (M2.7 backlog · Real Study 대기)
Validation      ███░░░░░░░   30%  (구현 AC PASS · Human 재심사 대기)
Release         ██░░░░░░░░   20%  (Freeze 후보 · Score 재판정 전)

Deliverables .... done
Critical open ... BK-C02 content width (Honesty로 완화, 미해소)
Major open ...... ≤1 목표 — Review FAIL 해소 시도 완료, Human 확인 필요
```

---

## Validation Plan

1. Pattern Master → 정답 제출 → Why Lens · Card · Takeaway 확인  
2. 오답 제출 → Mistake Replay (추론 문구 없음) 확인  
3. Closing → Pattern 이름·핵심·시험장·내일 고정 문구  
4. Home → Beta 범위 N/M 고지  
5. 학습자 화면에서 Mastery/Reco/헤더 개발모드 없음  
6. SoT git 무변경

### Estimated Score Lift (LXD projection)

| Item | Was | Est. now |
|------|----:|---------:|
| Review | 2 | 4 |
| Immersion | 3 | 4 |
| Session Finish | 4 | 5 |
| Preview (when) | 4 | 4 |
| **Total** | **46** | **≈52–54** |

> 55 도달은 Human Walkthrough로 확정. Coverage Critical는 고지로 완화하나 **콘텐츠 폭 자체는 별도 Sprint**.

---

## Exit Criteria

- [x] Educational Review 구현 PASS
- [ ] Beta Readiness ≥55 (Human Re-Review)
- [ ] Critical Issue 0 (BK-C02 = Honesty mitigated, not content-fixed — Human 판정)
- [ ] Major Issue ≤1
- [ ] Human Review PASS

---

## Next

1. Human이 `learning-loop.html` Walkthrough 재실시  
2. Score ≥55 + Critical 합의 시 → **Beta Freeze 후보**  
3. 미달 시 Sprint-05는 Evidence 기반 초미세 Polish만

---

## Final Note

이번 Sprint는 기능 추가가 아니라 **Pattern을 기억하게 만드는 교육 재조립**이다.
