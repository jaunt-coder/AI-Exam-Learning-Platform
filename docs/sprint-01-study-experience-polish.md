# Sprint-01 — Study Experience Polish

Status: **PLANNED** (Kickoff pending)  
Owner: `08_Learning_Experience_Designer`  
Evidence Owner: `07_User_Research_Analyst`  
Baseline: M2.2 Pattern First Learning Experience (IMPLEMENTED)  
Date: 2026-07-23  
Template: Sprint Template Standard (Mandatory)

---

## Sprint Constitution (적용)

| Rule | 내용 |
|------|------|
| 1 | Evidence before Features — 증거 없는 기능 추가 금지 |
| 2 | Pattern First — 모든 기능은 Pattern 학습을 강화 |
| 3 | Data Integrity First — Question / Answer / Pattern DB 수정 금지 |
| 4 | Human Approval Required — Strength만으로 Approved 금지 |
| 5 | One Sprint = One Product Improvement |
| 6 | Every Sprint must end with Real Study |
| 7 | User Experience over Feature Count |
| 8 | Evidence is a Product Asset |

**본 Sprint의 단일 개선 목표:**  
학생이 세션 종료 후 *“문제를 많이 풀었다”*가 아니라 *“패턴을 하나 익혔다”*고 말하게 한다.

---

## Sprint Goal

M2.2 Pattern Master / Exam Mode 위에서 **학습 몰입·완주·Pattern 회상**을 방해하는 경험 마찰을 줄이고,  
세션이 Pattern 단위로 시작·진행·닫히도록 Study Experience를 polish한다.

AI / Recommendation / Mastery 계산은 도입하지 않는다.

---

## Learning Problem

| ID | 학습 문제 | 관찰 가능 학생 행동 (가설) | Pattern First 영향 |
|----|-----------|---------------------------|-------------------|
| LP-01 | 세션이 Pattern 단위로 닫히지 않는다 | Review 후 이탈, “문제 몇 개 풀었다”고 진술 | 학습 자산이 Question으로 재해석됨 |
| LP-02 | Algorithm·Checklist가 시험장 회상으로 전이되지 않는다 | “다음” 연타, 문제 직전 Pattern 단서 미회상 | Pattern 자동화 실패 |
| LP-03 | 오늘 배울 Pattern·분량이 한눈에 약하다 | Pattern picker만 보고 목표 시간/문항 수를 모름 | 학습 전 기대 설정 실패 |
| LP-04 | 진행 서사가 Question 카운트에 기운다 | Questions Solved에 집착, Pattern 이름 미기억 | Question First UX 회귀 |
| LP-05 | Review가 수동 재읽기에 그친다 | Review 스킵·대충 읽기 | 강화(reinforcement) 실패 |
| LP-06 | 학습자 화면에 미완성/개발 신호가 남아 몰입이 깨진다 | Mastery unknown, Recommendation absent, 기록 초기화에 시선 | 학습 지속 동기 저하 |

> LP는 **문제 정의**이다. 구현 허가권이 아니다.  
> 구현은 Hypothesis가 `Approved` + Human Review 이후에만 허용된다.

---

## Evidence

### Current Evidence State

| Source | Status |
|--------|--------|
| `docs/evidence-backlog.md` | **EMPTY** (UR 항목 0) |
| `docs/roadmap-update.md` Approved Queue | **0** |
| Real study sessions ingested | **0** |
| Evidence Strength records | **none** |

### Evidence Collection Plan (Sprint-01 필수)

| 항목 | 내용 |
|------|------|
| Minimum sessions | ≥ 3 (Pattern Master ≥ 2, Exam ≥ 1) |
| Minimum problems | ≥ 20 Attempt 완료 (mapped + verified Pattern만) |
| Primary Input | 세션 후 5문항 + Attempt history + (가능 시) 단계 체류 |
| Intake target | `docs/evidence-backlog.md`에 `UR-###` 등록 |
| Strength formula | Frequency × Session Coverage × Learning Impact (각 1–5) |
| Approval | Human Review 없이는 `Approved` 불가 |

### Session Exit Questions (Primary Input)

1. 오늘 **무엇을** 익혔다고 느끼나요?  
2. 가장 지루하거나 건너치고 싶었던 단계는?  
3. 문제 풀 때 Checklist/Algorithm을 실제로 떠올렸나요?  
4. 세션이 끝난 뒤 다음에 무엇을 하면 되는지 알았나요?  
5. 한 문장: “패턴을 익혔다 / 문제를 풀었다 / 잘 모르겠다”

### Evidence Gate

```text
Observation → Candidate → (Human) Approved → Implemented → Validated → Retired
```

- Strength &lt; 27 → 구현 금지 (Backlog/Observation 유지)
- Strength 27–63 → Candidate, 추가 세션 필요
- Strength ≥ 64 + 다중 세션 + Human → Approved 가능
- 1회 피드백만으로 Deliverable 구현 **금지**

---

## Hypothesis

Status enum (고정):  
`Observation` → `Candidate` → `Approved` → `Implemented` → `Validated` → `Retired`

| ID | Title | Linked LP | Owner | Current Status | Evidence IDs | Evidence Strength | Priority | Implementation Status | Validation Status |
|----|-------|-----------|-------|----------------|--------------|-------------------|----------|----------------------|-------------------|
| H-001 | Session Closing Ritual | LP-01 | 08_LXD | Observation | — | 0 | P0 | Not Started | Pending |
| H-002 | Active Recall Gate | LP-02 | 08_LXD | Observation | — | 0 | P0 | Not Started | Pending |
| H-003 | Today's Learning Card | LP-03 | 08_LXD | Observation | — | 0 | P0 | Not Started | Pending |
| H-004 | Pattern Progress Narrative | LP-04 | 08_LXD | Observation | — | 0 | P1 | Not Started | Pending |
| H-005 | Review Experience Polish | LP-05 | 08_LXD | Observation | — | 0 | P1 | Not Started | Pending |
| H-006 | Study Dashboard Immersion Hygiene | LP-06 | 08_LXD | Observation | — | 0 | P0 | Not Started | Pending |

### Hypothesis Detail Cards

#### H-001 Session Closing Ritual

- **Status:** Observation  
- **Evidence:** —  
- **Strength:** 0  
- **Owner:** 08_Learning_Experience_Designer  
- **Implementation:** Not Started  
- **Validation:** Pending  
- **Claim:** Review 이후 Pattern 이름·알고리즘 한 줄·Checklist 요약을 보여 주면 “패턴을 익혔다” 완결감이 생긴다.

#### H-002 Active Recall Gate

- **Status:** Observation  
- **Evidence:** —  
- **Strength:** 0  
- **Owner:** 08_Learning_Experience_Designer  
- **Implementation:** Not Started  
- **Validation:** Pending  
- **Claim:** 문제 진입 전 기존 자산 기반 self-check 회상 1회가 Checklist/Algorithm 실사용을 높인다.

#### H-003 Today's Learning Card

- **Status:** Observation  
- **Evidence:** —  
- **Strength:** 0  
- **Owner:** 08_Learning_Experience_Designer  
- **Implementation:** Not Started  
- **Validation:** Pending  
- **Claim:** 학습 시작 전 Pattern·예상 시간·문항 수·중요도가 보이면 목표 인지와 완주율이 오른다.

#### H-004 Pattern Progress Narrative

- **Status:** Observation  
- **Evidence:** —  
- **Strength:** 0  
- **Owner:** 08_Learning_Experience_Designer  
- **Implementation:** Not Started  
- **Validation:** Pending  
- **Claim:** 진행 표시를 Pattern 서사 우선으로 바꾸면 세션 후 진술이 Pattern 단위로 바뀐다.

#### H-005 Review Experience Polish

- **Status:** Observation  
- **Evidence:** —  
- **Strength:** 0  
- **Owner:** 08_Learning_Experience_Designer  
- **Implementation:** Not Started  
- **Validation:** Pending  
- **Claim:** Review에서 사용한 Pattern·Checklist 강조가 수동 스킵을 줄이고 강화를 높인다.

#### H-006 Study Dashboard Immersion Hygiene

- **Status:** Observation  
- **Evidence:** —  
- **Strength:** 0  
- **Owner:** 08_Learning_Experience_Designer  
- **Implementation:** Not Started  
- **Validation:** Pending  
- **Claim:** 학습자 모드에서 미완성/개발 신호를 숨기면 몰입 방해가 줄어든다.  
- **Note:** 새 기능 추가가 아니라 **노출 억제**. 그래도 Status는 Observation이며, Human Approval 없이 Implemented로 건너뛰지 않는다. (위생이라도 Rule 4 적용)

---

## Deliverables

구현 대상은 아래 **7개 산출물**이다.  
아이디어가 아니라 **화면에 존재하는 결과물**로 정의한다.

Constitution Rule 1:  
`Approved`되지 않은 Hypothesis에 매핑된 Deliverable은 **코딩하지 않는다.**  
단, D-00(Evidence Intake Kit)은 Evidence 자산 생성을 위한 Sprint 운영 산출물이며 Feature가 아니다.

---

### D-00 Session Evidence Intake Kit

| Field | Content |
|-------|---------|
| **Purpose** | 실학습 세션에서 Primary Input을 표준 형식으로 남겨 07이 UR 항목을 등록할 수 있게 한다. |
| **Scope** | 세션 체크리스트 1종, 종료 5문항 양식, Attempt/세션 메타 기록 규칙, `evidence-backlog` 연계 ID 규칙 |
| **Dependencies** | M2.2 Learning Loop 동작, `docs/evidence-backlog.md`, 07 Agent |
| **Out of Scope** | Recommendation, Coach, Mastery, 자동 분석 AI, DB 스키마 변경 |
| **Linked Hypothesis** | (운영) — Feature Hypothesis 아님 |
| **Build Gate** | Sprint Kickoff와 동시에 작성 가능 |

---

### D-01 Today's Learning Card

| Field | Content |
|-------|---------|
| **Purpose** | 학습 시작 전 “오늘 익힐 Pattern”을 한 카드로 고정한다. |
| **Scope** | Pattern 이름, 예상 학습 시간, 예상 문항 수, Pattern 중요도/빈도(기존 자산 필드만), 학습 시작 CTA |
| **Dependencies** | H-003 = Approved, `pattern-lesson.js` 조립 자산, Pattern picker 화면 |
| **Out of Scope** | 새 Pattern 문구 생성, 추천 Pattern, 난이도 재계산, Question DB 조회 문구 창작 |
| **Linked Hypothesis** | H-003 |

---

### D-02 Pattern Progress Panel

| Field | Content |
|-------|---------|
| **Purpose** | 진행을 Question 개수가 아니라 Pattern 학습 서사로 보여 준다. |
| **Scope** | 현재 Pattern명, 단계 진행(예: 3/8), Patterns Learned / Reviewed, 문제 수는 2차 지표로만 표시 |
| **Dependencies** | H-004 = Approved, `learning.session.v1`, stage dots |
| **Out of Scope** | Mastery 점수, 추천 다음 Pattern, 스트릭/뱃지 게임화 |
| **Linked Hypothesis** | H-004 |

---

### D-03 Session Closing Card

| Field | Content |
|-------|---------|
| **Purpose** | 세션을 Pattern 단위로 닫아 “패턴을 하나 익혔다” 완결감을 만든다. |
| **Scope** | 익힌 Pattern 이름, 한 줄 알고리즘/개념(verified 자산), Checklist 요약, 오늘 지표(Patterns Learned/Reviewed/Time), 종료/같은 Pattern Exam 안내 문구(고정 카피) |
| **Dependencies** | H-001 = Approved, Review stage 완료 시점 |
| **Out of Scope** | AI 피드백, 약점 진단, 스케줄러, Mastery 라벨 |
| **Linked Hypothesis** | H-001 |

---

### D-04 Active Recall UI

| Field | Content |
|-------|---------|
| **Purpose** | 문제 진입 전 retrieval practice로 Pattern 사고를 작업기억에 올린다. |
| **Scope** | Checklist 직후(또는 Question 직전) self-check 회상 1회, 기존 lesson 자산 기반 프롬프트, 학생 자가확인 후 문제 진입 |
| **Dependencies** | H-002 = Approved, Checklist/Algorithm 표시 자산 |
| **Out of Scope** | AI 채점, 정답 생성, 새 Knowledge 작성, 오답 자동 분류 |
| **Linked Hypothesis** | H-002 |

---

### D-05 Review Experience Polish

| Field | Content |
|-------|---------|
| **Purpose** | 제출 후 Pattern 강화를 명확히 하여 Review 스킵을 줄인다. |
| **Scope** | “이 문제에 사용된 Pattern” 명시, Checklist 항목 강조(기존 목록), Algorithm 참조는 verified 자산만 |
| **Dependencies** | H-005 = Approved, panel-review, submit result |
| **Out of Scope** | AI 해설, wrong-answer 생성, Pattern/Question 본문 수정 |
| **Linked Hypothesis** | H-005 |

---

### D-06 Study Dashboard Polish

| Field | Content |
|-------|---------|
| **Purpose** | 학습자 모드에서 Pattern 학습 신호만 남겨 몰입을 보호한다. |
| **Scope** | 학습자 모드 기본: Patterns Learned / Questions Solved / Patterns Reviewed / Study Time / 현재 Pattern 강조; Mastery·Recommendation·future-slot·불필요 개발 액션 숨김 또는 개발자 모드 한정 |
| **Dependencies** | H-006 = Approved + Human Review, 기존 `#dashboard` |
| **Out of Scope** | Mastery 엔진, Recommendation Engine, Coach UI 실구현, LocalStorage 키 변경 |
| **Linked Hypothesis** | H-006 |

---

## Acceptance Criteria

모든 기준은 **관찰 가능한 동작**으로 테스트한다.

### D-00 Session Evidence Intake Kit

PASS when

- [ ] 세션 체크리스트 문서가 저장소에 존재한다.
- [ ] 종료 5문항 양식이 정의되어 있다.
- [ ] 세션 메타(모드, Pattern ID, 문항 수, 날짜) 기록 필드가 정의되어 있다.
- [ ] 07이 `UR-###`를 `docs/evidence-backlog.md`에 등록할 수 있는 입력 형식이 명시되어 있다.
- [ ] Question / Answer / Pattern DB를 수정하는 단계가 없다.

### D-01 Today's Learning Card

PASS when

- [ ] 현재 선택된 Pattern 이름이 카드에 보인다.
- [ ] 예상 학습 시간이 표시된다(자산 없으면 “—” 또는 자산 없음 문구, 생성 금지).
- [ ] 예상 문항 수가 표시된다(해당 Pattern mapped 문항 수).
- [ ] Pattern 중요도 또는 빈도가 기존 자산 필드로 표시된다.
- [ ] 카드에서 학습 시작이 가능하다.
- [ ] Question / Answer / Pattern DB 수정이 없다.

### D-02 Pattern Progress Panel

PASS when

- [ ] 현재 Pattern 이름이 진행 영역에 항상 보인다.
- [ ] Pattern Master Mode에서 단계 진행이 보인다(예: stage index / total).
- [ ] Patterns Learned / Patterns Reviewed가 보인다.
- [ ] Questions Solved는 Pattern 지표보다 시각적으로 2차이다(동일 우선순위 금지).
- [ ] Mastery 수치·추천 문구가 학습자 기본 화면에 새로 생기지 않는다.
- [ ] Question / Answer / Pattern DB 수정이 없다.

### D-03 Session Closing Card

PASS when

- [ ] Review 이후(또는 세션 종료 시점) Closing Card가 나타난다.
- [ ] 학생이 방금 학습한 Pattern 이름을 식별할 수 있다.
- [ ] verified 자산 기반 요약(개념/알고리즘/체크리스트 중 가용 항목)이 보인다.
- [ ] 오늘 Patterns Learned / Reviewed / Study Time이 보인다.
- [ ] AI 생성 문장이 없다.
- [ ] Question / Answer / Pattern DB 수정이 없다.

### D-04 Active Recall UI

PASS when

- [ ] Question 단계 진입 전 Active Recall UI가 1회 나타난다(Pattern Master Mode).
- [ ] 프롬프트는 기존 lesson/checklist/algorithm 자산만 사용한다.
- [ ] 학생자가 확인(또는 동등한 완료 행동) 후에만 문제 패널로 진행한다.
- [ ] AI 채점/정답 판정이 없다.
- [ ] Exam Mode에서는 기본 생략 또는 최소 앵커만(가설 승인 범위 내) 적용한다.
- [ ] Question / Answer / Pattern DB 수정이 없다.

### D-05 Review Experience Polish

PASS when

- [ ] 학생이 Review에서 어떤 Pattern을 사용했는지 식별할 수 있다.
- [ ] Checklist 항목이 강조 표시된다(기존 자산 목록).
- [ ] Algorithm 참조는 verified/documented/evidenced 자산만 사용한다.
- [ ] 자산 부재 시 생성하지 않고 “자산이 없습니다” 정책을 유지한다.
- [ ] Question / Answer / Pattern DB 수정이 없다.

### D-06 Study Dashboard Polish

PASS when

- [ ] 학습자 모드에서 Patterns Learned / Reviewed / Study Time / 현재 Pattern이 보인다.
- [ ] 학습자 모드에서 Recommendation Engine / AI Coach placeholder가 기본 숨김이다.
- [ ] 학습자 모드에서 Mastery는 강조 지표가 아니거나 개발자 모드에서만 노출된다(신규 Mastery 계산 없음).
- [ ] “학습 기록 초기화”가 학습 주경로에서 분리되거나 개발자 모드로 한정된다.
- [ ] LocalStorage 키 이름이 변경되지 않는다.
- [ ] Question / Answer / Pattern DB 수정이 없다.

### Cross-Deliverable Integrity Gate

PASS when

- [ ] Question DB unchanged
- [ ] Answer DB unchanged
- [ ] Pattern Master / Metadata DB unchanged
- [ ] No AI-generated lesson text at runtime
- [ ] No Recommendation / Mastery execution introduced

---

## Implementation Plan

### Phase 0 — Kickoff (Day 0)

1. 본 문서 Human 확인  
2. D-00 Evidence Intake Kit 작성·배치  
3. 가설 상태 전원 `Observation` 유지 확인  
4. **Feature 코딩 시작 금지**

### Phase 1 — Real Study + Evidence (Day 1–3)

1. Pattern Master ≥ 2세션, Exam ≥ 1세션  
2. Attempt ≥ 20문제 완료  
3. Primary Input 제출 → 07 분석  
4. `docs/evidence-backlog.md`에 UR 등록  
5. Evidence Strength 산출  
6. Human Review로 Candidate / Approved / Rejected 결정

### Phase 2 — Approved만 구현 (Day 4–6)

구현 순서(승인된 항목만):

1. D-06 Study Dashboard Polish (H-006)  
2. D-01 Today's Learning Card (H-003)  
3. D-03 Session Closing Card (H-001)  
4. D-04 Active Recall UI (H-002)  
5. D-02 Pattern Progress Panel (H-004)  
6. D-05 Review Experience Polish (H-005)

규칙:

- `Approved`가 아닌 Deliverable은 스킵  
- 한 Sprint에서 무리한 전체 구현보다 **승인된 소수 고품질** 우선 (Rule 7)  
- Presentation layer only (`learning-loop.html` / `js/learning-loop-page.js` / `css/learning-loop.css` 등)

### Phase 3 — Validation Real Study (Day 6–7)

1. Polish 적용 후 동일 프로토콜로 재학습 ≥ 1세션  
2. Acceptance Criteria 체크리스트 실행  
3. Hypothesis → `Implemented` → 효과 확인 시 `Validated`  
4. Exit Criteria 전부 충족 시에만 Sprint Close

### Roles

| Role | Responsibility |
|------|----------------|
| 08_LXD | Goal, LP, Hypothesis, Deliverables, AC, Exit, Dashboard 갱신 |
| 07_URA | Evidence intake, Strength, Status 제안 |
| Human | Approved / Rejected 최종 결정 |
| Implementer | Approved Deliverable만 구현 |
| Reviewer | AC + Integrity Gate 검증 |

---

## Sprint Dashboard

### Sprint-01 Dashboard (Kickoff Snapshot)

```text
Progress
██░░░░░░░░  10%   (D-00 준비 + Kickoff만 가능 상태)

Evidence
  Total UR recorded ........... 0
  Observation ................. 0
  Candidate ................... 0
  Approved .................... 0
  Implemented ................. 0
  Validated ................... 0
  Rejected .................... 0

Hypotheses
  Observation ................. 6
  Candidate+ .................. 0

Deliverables
  Total ....................... 7  (D-00 … D-06)
  Completed ................... 0
  Remaining ................... 7
  Build-eligible (Approved) ... 0

Known Risks ................... 3
Blockers ...................... 1
```

### Dashboard Field Definitions

| Field | Meaning |
|-------|---------|
| Progress | Exit Criteria 가중 진행률(증거·승인·구현·검증) |
| Evidence counts | `evidence-backlog.md` 실집계 |
| Build-eligible | Hypothesis Status = Approved 인 Deliverable 수 |
| Blockers | 현재: **Evidence = 0** (Rule 1에 의해 Feature 구현 차단) |

### Known Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| R1 Evidence 공백 장기화 | Feature 구현 불가, Sprint 지연 | D-00 + Day1 실학습 강제 |
| R2 1회 피드백으로 과잉 구현 | Pattern First 훼손 | Strength + Human Gate |
| R3 단계 삭제로 “빨리 문제” | 철학 회귀 | H-003/004는 밀도·서사만, 단계 삭제 금지 |

### Blockers

| ID | Blocker | Clears when |
|----|---------|-------------|
| B1 | Real learner Evidence 0건 | ≥3 sessions ingested + UR registered |

---

## Validation Plan

### What we validate

| Layer | Method |
|-------|--------|
| Learning outcome | 세션 후 Q5: “패턴을 익혔다” 비율 |
| Behavior | 문제 도달률, Review 완주, Active Recall 완료율(구현 후) |
| Integrity | DB diff = empty for Question/Answer/Pattern |
| Regression | M2.2 Mode select → Pattern pick → stage flow → submit → review 동작 |
| Evidence quality | UR Status 규칙 준수, Strength 기록, Human log |

### Validation Sessions

| Session | Mode | Minimum |
|---------|------|---------|
| V0 Baseline | Pattern Master | Sprint 구현 전 1회 (증거용) |
| V1–V2 | Pattern Master | 증거 추가 |
| V3 | Exam | 증거 추가 |
| V4 Post-Polish | Pattern Master | Approved 구현 후 필수 (Rule 6) |

### Pass thresholds (Sprint 수준)

| Metric | Pass |
|--------|------|
| Real problems completed | ≥ 20 |
| Sessions with Evidence | ≥ 3 |
| Post-session Pattern-unit statement | ≥ 66% (표본 명시) |
| Integrity Gate | 100% PASS |
| AC of each Implemented Deliverable | 100% PASS |

### Failure / Retire rules

- 구현 후 V4에서 지표 개선 없음 → Hypothesis `Retired` 후보  
- 반증 Evidence → `Rejected` / Deliverable 롤백 검토  
- Strength만 높고 Human 미승인 → 구현 유지 금지

---

## Exit Criteria

Sprint는 코딩 종료만으로 닫히지 않는다.  
아래 **전부** 충족 시에만 Close.

### Learning & Evidence

- [ ] Minimum **20** real study problems completed
- [ ] Evidence generated from at least **3** sessions
- [ ] `docs/evidence-backlog.md`에 UR ≥ 3 등록
- [ ] Evidence Strength가 해당 UR에 기록됨
- [ ] Human Review completed (Decision Log 존재)

### Product

- [ ] At least **one** Approved Candidate implemented (D-01~D-06 중)
- [ ] Implemented Deliverable의 Acceptance Criteria 100% PASS
- [ ] Post-polish Real Study (V4) 완료
- [ ] No regression on M2.2 Pattern Master / Exam core flow

### Integrity

- [ ] No Data Integrity violation
- [ ] Question DB unchanged
- [ ] Answer DB unchanged
- [ ] Pattern DB unchanged
- [ ] No AI lesson generation introduced
- [ ] No Recommendation / Mastery execution introduced

### Governance

- [ ] Sprint Dashboard 최종 수치 갱신
- [ ] Hypothesis Status가 Implemented/Validated/Rejected/Retired 중 하나로 정리
- [ ] Sprint Retrospective 작성 완료

---

## Sprint Retrospective

> **작성 시점:** Sprint Close 시. Kickoff 시점에는 비움.

### What improved learning

- (작성 예정)

### What failed or was rejected

- (작성 예정)

### Evidence quality notes

- (작성 예정)

### Carry-over to Sprint-02

- (작성 예정)

### Constitution compliance check

| Rule | Result |
|------|--------|
| 1 Evidence before Features | TBD |
| 2 Pattern First | TBD |
| 3 Data Integrity First | TBD |
| 4 Human Approval Required | TBD |
| 5 One Product Improvement | TBD |
| 6 Ends with Real Study | TBD |
| 7 UX over Feature Count | TBD |
| 8 Evidence as Asset | TBD |

---

## Appendix A — ID Map

| Hypothesis | Deliverable |
|------------|-------------|
| (ops) | D-00 Session Evidence Intake Kit |
| H-003 | D-01 Today's Learning Card |
| H-004 | D-02 Pattern Progress Panel |
| H-001 | D-03 Session Closing Card |
| H-002 | D-04 Active Recall UI |
| H-005 | D-05 Review Experience Polish |
| H-006 | D-06 Study Dashboard Polish |

## Appendix B — Explicit Non-Goals

- AI Tutor / AI explanation
- Recommendation Engine (WO-015)
- Mastery calculation (WO-016 영역)
- Question / Answer / Pattern / Knowledge 생성·수정
- Parser / Promotion / DB schema 변경
- 단계 삭제로 Exam-like 강제 전환

---

## Document Control

| Version | Date | Change |
|---------|------|--------|
| v1.0 | 2026-07-23 | Sprint Template Standard 적용 초안 (Kickoff) |
