# Sprint-02 Report — M2.5 Study Experience Beta Polish

Status: **IMPLEMENTED** (Validation pending Real Study)  
Owner: `08_Learning_Experience_Designer`  
Baseline: M2.2 Pattern First Learning Experience  
Date: 2026-07-24  
Template: Sprint Template Standard (Mandatory)

---

## Sprint Constitution (적용)

| Rule | 적용 |
|------|------|
| 1 Evidence before Features | Beta Freeze는 **Human Charter**로 Presentation Polish를 승인. 신규 Knowledge/엔진 기능은 금지. 실학습 Evidence는 Exit에서 수집 |
| 2 Pattern First | Today's Study / Progress / Review / Closing 모두 Pattern 단위 |
| 3 Data Integrity First | Question / Answer / Pattern / Knowledge DB 미수정 |
| 4 Human Approval Required | 본 Sprint 범위는 사용자(Human) 명시 WP로 승인 |
| 5 One Product Improvement | 단일 목표: 매일 쓰는 Beta Study Experience |
| 6 Ends with Real Study | Exit Criteria에 실학습 검증 포함 |
| 7 UX over Feature Count | 신규 엔진 없음 · 표현·흐름 polish만 |
| 8 Evidence as Asset | WP-10에 Evidence 수집 계획 명시 |

---

## Sprint Goal

실제 감정평가사 수험생이 **매일** 열어 쓸 수 있는 Beta Study Experience를 완성한다.

학생이 프로그램을 열었을 때  
*“문제를 풀러 왔다”*가 아니라  
*“오늘 Pattern 하나를 익히러 왔다”*고 느끼게 한다.

AI / Recommendation / Mastery / Coach 미구현.  
Presentation Layer만 개선.

---

## Learning Problem

| ID | 학습 문제 | 학생 행동 | Pattern First 영향 |
|----|-----------|-----------|-------------------|
| LP-01 | 첫 화면이 모드 선택이라 “문제/모드” 느낌이 강함 | Pattern 목표 없이 진입 | Question First 회귀 |
| LP-02 | Preview가 Overview 중심이라 “왜/언제/함정/완료”가 약함 | Preview 스킵 | 학습 목적 희미 |
| LP-03 | Lesson 단계 가독성·계층이 약함 | 연타로 통과 | 체화 실패 |
| LP-04 | Progress가 Pattern 또는 Question 한쪽만 강조 | 문제 수에 집착 | 학습 단위 왜곡 |
| LP-05 | Review가 정오 부속처럼 보임 | Pattern 미회상 | 강화 실패 |
| LP-06 | 세션 종료 의식 없음 | “문제 풀었다”로 종료 | Product Goal 실패 |
| LP-07 | Dashboard·Placeholder가 몰입 방해 | unknown/absent 시선 | Beta 신뢰 저하 |

---

## Evidence

### Current State (Kickoff)

| Source | Status |
|--------|--------|
| `docs/evidence-backlog.md` | EMPTY (UR 0) |
| Real sessions ingested | 0 at kickoff |
| Human Charter | **YES** — Sprint-02 WP-01~10 명시 승인 |

### Evidence Plan (Sprint 중·종료)

| 항목 | 내용 |
|------|------|
| Minimum sessions | ≥ 3 |
| Minimum problems | ≥ 20 |
| Intake | 세션 후 5문항 + Attempt history → `UR-###` |
| Strength | F × S × L |
| Post-polish validation | Real Study Ready Report §실학습 시작 조건 |

### Session Exit Questions

1. 오늘 무엇을 익혔다고 느끼나요?  
2. Today's Study가 Pattern 중심으로 보였나요?  
3. Progress에서 Pattern / Question을 구분했나요?  
4. Session Closing 후 “패턴을 익혔다”고 말할 수 있나요?  
5. 몰입을 방해한 UI가 있었나요?

---

## Hypothesis

Status enum: Observation → Candidate → Approved → Implemented → Validated → Retired

| ID | Title | Owner | Status | Evidence IDs | Strength | Priority | Implementation | Validation |
|----|-------|-------|--------|--------------|----------|----------|----------------|------------|
| H-201 | Today's Study Home | 08_LXD | Approved → Implemented | Human Charter Sprint-02 | — | P0 | Done | Pending Real Study |
| H-202 | Preview Polish | 08_LXD | Approved → Implemented | Human Charter | — | P0 | Done | Pending |
| H-203 | Lesson Polish | 08_LXD | Approved → Implemented | Human Charter | — | P0 | Done | Pending |
| H-204 | Pattern Progress | 08_LXD | Approved → Implemented | Human Charter | — | P0 | Done | Pending |
| H-205 | Review Pattern Lens | 08_LXD | Approved → Implemented | Human Charter | — | P0 | Done | Pending |
| H-206 | Session Closing | 08_LXD | Approved → Implemented | Human Charter | — | P0 | Done | Pending |
| H-207 | Dashboard Immersion | 08_LXD | Approved → Implemented | Human Charter | — | P0 | Done | Pending |

> Strength 수치 UR는 실학습 후 07이 채운다.  
> 본 Sprint의 Approved는 **Human Charter(명시 WP)** 경로이다. 자동 Approve 아님.

---

## Deliverables

### D-01 Today's Study Home (WP-01)

| Field | Content |
|-------|---------|
| **Purpose** | 앱을 열면 Pattern 학습 의도로 진입시킨다. |
| **Scope** | 오늘의 Pattern, 중요도(S/A/B=grade), 예상 시간, 대표 문항 수, 오늘 목표, 모드 선택, 학습 시작 |
| **Dependencies** | `listStudyPatterns`, verified lesson 자산 |
| **Out of Scope** | 추천 엔진, 자동 Pattern 선정 AI, DB 수정 |

### D-02 Pattern Preview Polish (WP-02)

| Field | Content |
|-------|---------|
| **Purpose** | Preview에서 왜/언제/의도/함정/완료 기준을 본다. |
| **Scope** | 기존 introduction·preview·knowhow·checklist 자산 재배치 표시 |
| **Dependencies** | `assemblePatternLesson` |
| **Out of Scope** | 새 Knowledge 문장 생성 |

### D-03 Pattern Lesson Polish (WP-03)

| Field | Content |
|-------|---------|
| **Purpose** | Intro → Algorithm → Know-how → Checklist 가독성 향상 |
| **Scope** | Step 헤더, lesson-block 레이아웃, 한글 단계명 |
| **Dependencies** | 기존 패널·자산 |
| **Out of Scope** | 단계 삭제, 새 해설 |

### D-04 Pattern Progress Experience (WP-04)

| Field | Content |
|-------|---------|
| **Purpose** | 진행을 Pattern 1차 · Question 2차로 표시 |
| **Scope** | `Pattern n / N` + `Question m / M` |
| **Dependencies** | studyPatterns, questionIndex |
| **Out of Scope** | Mastery 게이지 |

### D-05 Review Experience Polish (WP-05)

| Field | Content |
|-------|---------|
| **Purpose** | 제출 후 “이 문제가 검증한 Pattern” 관점 복습 |
| **Scope** | Pattern명, 정오의 Pattern 해석, Checklist 재표시, 알고리즘, 시험장 한 줄 |
| **Dependencies** | grade result, lesson assets |
| **Out of Scope** | AI 단계 추론 |

### D-06 Session Closing Experience (WP-06)

| Field | Content |
|-------|---------|
| **Purpose** | “패턴을 하나 익혔다”로 세션을 닫는다. |
| **Scope** | 익힌 Pattern, Checklist, 한 줄, 고정 복습 문구, 종료 CTA |
| **Dependencies** | Review 완료 시점 |
| **Out of Scope** | Recommendation Engine, AI |

### D-07 Dashboard Polish (WP-07)

| Field | Content |
|-------|---------|
| **Purpose** | 학생 지표만 노출 |
| **Scope** | 현재 Pattern, 익힌/복습 Pattern, 공부 시간; 푼 문제 수는 2차 |
| **Dependencies** | session + learning state |
| **Out of Scope** | Mastery 계산, Reco 실행 |

### D-08 Immersion Polish (WP-08)

| Field | Content |
|-------|---------|
| **Purpose** | 몰입 방해 요소 제거/숨김 |
| **Scope** | Mastery/Reco/placeholder/reset → 학습자 모드 숨김; Pattern을 결과 카드에 표시 |
| **Dependencies** | `is-learner` / `dev-only` |
| **Out of Scope** | 개발자 디버그 기능 삭제(숨김만) |

### D-09 Beta Freeze Checklist (WP-09)

| Field | Content |
|-------|---------|
| **Purpose** | Beta 출시 전 수동 검증 목록 |
| **Scope** | `docs/m2.5-beta-freeze-checklist.md` |
| **Dependencies** | D-01~D-08 구현 |
| **Out of Scope** | 자동 E2E 프레임워크 |

### D-10 Real Study Ready Report (WP-10)

| Field | Content |
|-------|---------|
| **Purpose** | 실학습 시작 가능 여부·제한·Evidence 계획 보고 |
| **Scope** | `docs/m2.5-real-study-ready-report.md` |
| **Dependencies** | D-09 |
| **Out of Scope** | 마케팅 문서 |

---

## Acceptance Criteria

### D-01 Today's Study Home

PASS when

- [x] 프로그램 진입 시 Today's Study 화면이 먼저 보인다.
- [x] 오늘의 Pattern 이름이 보인다.
- [x] 중요도(grade S/A/B)가 보인다.
- [x] 예상 학습시간이 보인다.
- [x] 대표 문제 수가 보인다.
- [x] 오늘 목표가 보인다(자산 없으면 “자산이 없습니다”).
- [x] 학습 시작 버튼이 동작한다.
- [x] Question/Answer/Pattern DB 미수정.

### D-02 Preview

PASS when

- [x] 왜 배우는 Pattern인가 표시
- [x] 시험장 등장 시점 표시
- [x] 출제 의도 표시
- [x] 대표 함정 표시
- [x] 학습 완료 기준(목표+Checklist 자산) 표시
- [x] Verified/기존 자산만 사용 · 생성 없음

### D-03 Lesson

PASS when

- [x] Intro/Algorithm/Know-how/Checklist에 Step 헤더·가독 블록 적용
- [x] 새 Knowledge 없음

### D-04 Progress

PASS when

- [x] `Pattern n / N` 표시
- [x] `Question m / M` 표시

### D-05 Review

PASS when

- [x] 학생이 어떤 Pattern을 검증했는지 식별 가능
- [x] Checklist 재표시
- [x] 알고리즘은 기존 자산만
- [x] 정오를 Pattern 관점으로 해석하는 문구 존재

### D-06 Closing

PASS when

- [x] 세션 종료 화면 존재
- [x] 오늘 익힌 Pattern / Checklist / 한 줄 / 고정 복습 문구 / 학습 종료
- [x] Recommendation Engine 아님(고정 카피)

### D-07 / D-08 Dashboard & Immersion

PASS when

- [x] 학습자 모드에서 현재 Pattern·익힌 Pattern·복습·공부 시간 표시
- [x] Mastery unknown / Recommendation absent 기본 숨김
- [x] Placeholder·기록 초기화는 개발자 모드
- [x] LocalStorage 키 이름 변경 없음

### Cross Integrity

PASS when

- [x] Question DB unchanged
- [x] Answer DB unchanged
- [x] Pattern DB unchanged
- [x] Knowledge 미수정
- [x] AI 생성 없음
- [x] Recommendation / Mastery 실행 없음

---

## Implementation Plan (실행 결과)

| Phase | 내용 | 결과 |
|-------|------|------|
| 1 | HTML shell: Home / Closing / Progress / Dashboard | Done |
| 2 | JS: render Home·Preview·Lesson·Review·Closing·Progress | Done |
| 3 | CSS: Beta readability / immersion | Done |
| 4 | Docs: Checklist + Real Study Report + Sprint Report | Done |
| 5 | Real Study validation | **Pending** (Exit) |

### Files Changed

| File | Change |
|------|--------|
| `learning-loop.html` | Today's Home, Closing, Progress, Dashboard 구조 |
| `js/learning-loop-page.js` | M2.5 orchestration (presentation) |
| `css/learning-loop.css` | Beta polish styles |
| `index.html` | CTA → M2.5 Beta |
| `docs/sprint-02-m2.5-study-experience-beta-polish.md` | 본 보고서 |
| `docs/m2.5-beta-freeze-checklist.md` | WP-09 |
| `docs/m2.5-real-study-ready-report.md` | WP-10 |

### Files Not Changed (Integrity)

Question / Answer / Pattern Master / Metadata / Knowledge JSON · runtime grader/attempt core contracts · LocalStorage key names

---

## Sprint Dashboard

```text
Sprint-02 Dashboard

Progress
████████░░  85%   (구현 완료 · Real Study Exit 남음)

Evidence
  Total UR .......... 0 (실학습 대기)
  Observation ....... 0
  Candidate ......... 0
  Approved .......... 7 (Human Charter WP)
  Implemented ....... 7
  Validated ......... 0
  Rejected .......... 0

Deliverables
  Total ............. 10
  Completed ......... 10 (코드·문서)
  Remaining ......... 0 (구현)
  Exit remaining .... Real Study + Human Freeze sign-off

Known Risks ......... 2
Blockers ............ 0 (구현) / Evidence UR=0 (검증)
```

### Known Risks

| Risk | Mitigation |
|------|------------|
| Evidence 없이 Polish 선행 | Human Charter 한정 · 실학습로 Validated 승격 |
| 자산 빈 필드 다수 | “자산이 없습니다” 유지 · 생성 금지 |

---

## Validation Plan

| Check | Method |
|-------|--------|
| Home first | `learning-loop.html` 로드 → `#screen-home` visible |
| Pattern progress | Flow 중 Pattern/Question 동시 표시 |
| Closing | 마지막 문제 Review → 세션 마무리 → `#screen-closing` |
| Immersion | 학습자 모드에서 Mastery/Reco/reset 비가시 |
| Integrity | DB git diff empty for SoT JSON |
| Real Study | ≥3 sessions · ≥20 problems · Q5 Pattern 진술 |

---

## Exit Criteria

- [x] Deliverables WP-01~10 산출물 존재
- [x] Acceptance Criteria (구현 관측) PASS
- [ ] Minimum 20 real study problems
- [ ] Evidence from ≥3 sessions
- [ ] No regression (수동 Beta Checklist)
- [x] Question DB unchanged
- [x] Answer DB unchanged
- [x] Pattern DB unchanged
- [ ] Human Review / Beta Freeze sign-off
- [ ] Sprint Retrospective 작성

> **Close 조건:** Real Study + Checklist 수동 PASS + Human sign-off 후 Sprint Close.

---

## Sprint Retrospective

> Real Study 완료 후 기입.

### What improved learning

- (작성 예정)

### What failed

- (작성 예정)

### Carry-over to next Sprint

- Evidence UR 등록 → Validated / Retired 정리
- Beta Freeze 이후는 신규 기능보다 Evidence 루프 유지

---

## Document Control

| Version | Date | Change |
|---------|------|--------|
| v1.0 | 2026-07-24 | M2.5 Beta Polish 구현 + Sprint Report |
