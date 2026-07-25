# WO-015 Recommendation & Coach Architecture

Version 1.0 — 2026-07-23  
Status: **ARCHITECTURE ONLY · NOT EXECUTED**  
Agent: `09_AI_Coach_Designer`  
Authority: Design Lock — Recommendation Engine / AI Coach / Mastery Execution **미구현**

---

## 0. Document Contract

### 0.1 Purpose

본 문서는 WO-015 **Recommendation Engine**과 연계되는 **AI Coach Decision Architecture**를 정의한다.

목표는 추천·코칭 **메시지를 만드는 것**이 아니라, 아래를 **언제·왜·어떤 조건으로** 허용할지 고정하는 것이다.

| # | Deliverable |
|---|-------------|
| 1 | Recommendation Trigger Matrix |
| 2 | Recommendation Priority Policy |
| 3 | Coach Intervention Timing |
| 4 | Coach Decision Tree |
| 5 | Human Override Policy |
| 6 | Evidence Gate |
| 7 | Confidence Policy |
| 8 | Fallback Strategy |
| 9 | Coach State Machine |
| 10 | Recommendation Roadmap |

### 0.2 Absolute Non-Goals (본 WO)

- Question / Answer / Pattern / Knowledge 수정
- Mastery 계산 실행
- Recommendation 런타임 구현
- AI 메시지·Prompt·LLM 구현
- Runtime / DB / LocalStorage 키 변경
- `recommendation_state.next_action` enum 확장·기록

### 0.3 Pipeline Position (불변)

```text
Evidence First
  → Learning State (WO-014 / 014.1)
  → Mastery Policy Apply (WO-014.2 + Human 승인 후 별도 Apply WO)
  → Recommendation Policy (본 문서 · 설계만)
  → Coach Behavior Policy (본 문서 · 설계만)
  → (Future) Runtime Emit
```

**역방향 금지:** Recommendation → Learning State 추론, Coach → Mastery 가정.

### 0.4 Relation to Existing Specs

| Doc | Relation |
|-----|----------|
| `docs/student-learning-state-design.md` | 입력 계약. Recommendation은 관측된 Learning State만 읽는다. |
| `docs/attempt-ingestion-design.md` | Attempt → counters. Recommendation 미생성. |
| `docs/mastery-calculation-policy.md` | Mastery 라벨 정책. Apply 전 `unknown`만. |
| `docs/recommendation-requirements.md` | 학습자 증거 기반 요구사항. Approved Candidate만 Roadmap. |
| `docs/coach-requirements.md` | Coach 메시지 근거 규칙. 현재 Active Candidate 0. |
| `docs/evidence-backlog.md` | Evidence Strength · Human Approval. |
| `docs/08-recommendation-engine-spec.md` | 레거시 기능 스펙. **본 문서가 Evidence-First Gate·Trigger를 상위 정책으로 둔다.** Phase 7 UI 존재 ≠ WO-015 승인. |
| `docs/33-ai-exam-coach-agent-spec.md` | C4 Planner 대기. 본 문서는 C4 전 Decision Layer. |
| `docs/35-platform-architecture-redesign.md` | Plane D Coach = 전략 Agent. Question Owner 아님. |

### 0.5 Current Freeze Snapshot (2026-07-23)

| Prerequisite | Status |
|--------------|--------|
| Verified Answer (WO-012) | Completed (참조만) |
| Pattern Knowledge (WO-013) | Completed (참조만) |
| Student Learning State (WO-014) | Schema lock · empty/observed 가능 |
| Attempt Ingest (WO-014.1) | Foundation · counters only |
| Mastery Policy (WO-014.2) | Documented · **not executed** |
| Mastery Apply | Not approved |
| Evidence Backlog · Recommendation/Coach Approved Candidates | **0** |
| Recommendation Runtime | **absent** (`next_action = unknown`) |
| Coach Runtime intervention | **absent** (학생보다 먼저 개입 금지) |

**해석:** 현재 Recommendation = **absent**. Coach = **Idle/Observe만 허용(개념)**. Emit 금지.

---

## 1. Recommendation Trigger Matrix

### 1.1 Global Precondition (모든 Type 공통)

아래 **전부** 만족하기 전에는 어떤 Recommendation Type도 **발생하지 않는다**.

| Gate ID | Condition | Fail → |
|---------|-----------|--------|
| G0 | `learning_data_status ≠ empty` | absent |
| G1 | Attempt 기반 Learning State **관측** (pattern_states / question_history에 실데이터) | absent |
| G2 | Mastery Apply WO 완료 + `mastery.status` / per-pattern mastery가 `unknown`이 아님 (또는 정책상 `insufficient_data` 이상) | absent |
| G3 | Recommendation Policy Human 승인 (본 Architecture + 숫자 파라미터) | absent |
| G4 | Confidence Gate 통과 (§7) | absent |
| G5 | Evidence Gate 통과 (§6) — Type별 Evidence Required | absent |
| G6 | Human Override가 `suppress`가 아님 (§5) | absent |

> **단일 오답 · accuracy-only · 최근 1회 결과**로 Trigger 금지.

### 1.2 Type Matrix

| Type ID | Name | Learning Problem | Evidence Required | Decision Policy | Trigger | Gate | Coach Behavior | Expected Learning Effect | Risk | Validation |
|---------|------|------------------|-------------------|-----------------|---------|------|----------------|--------------------------|------|------------|
| R-REV | Review Recommendation | Pattern 회상 붕괴 징후(최근 성과 하락 + 이력 충분) | `review_required` 라벨 + recent_window 합의 + attempt ≥ min | Multi-gate mastery만 허용; accuracy만 X | Mastery=`review_required` AND confidence≥medium AND ≥2 sessions covering pattern | G0–G6 + spacing 미충족 아님 | Review Prompt → Pattern Recall 질문 (정답 비공개) | Spacing + Retrieval | 과잉 복습으로 피로 | Human sample: 라벨↔이력 일치율 |
| R-RTY | Retry Recommendation | 동일 Pattern에서 반복 실패가 **다회·다세션**으로 관측 | wrong_count≥policy · distinct questions≥2 · sessions≥2 · mastery∈{learning,developing,review_required} | 1회 오답≠retry; question 중복만≠retry | Post-session Evaluate + same pattern_id 재실패 클러스터 | G0–G6 + not Exam Mode live | Reflection Question → Micro Hint (전략만) | Error Recovery without answer leak | 정답 유도형 힌트 | Hint content Human review |
| R-PAT | Pattern Recommendation | 학생이 Pattern을 문제로만 소비하고 회상 루프가 없음 | Pattern First 세션 로그 + attempt on pattern + mastery≠mastered | “다음 챕터” 추천 금지; verified pattern만 | Session boundary + Pattern coverage gap (verified scope) | G0–G6 + Pattern Master verified | Pattern Recall → Checklist Reminder | Pattern First reinforcement | 미검증 Pattern 추천 | verified-only audit |
| R-SPC | Spacing Reminder | mastered 후 장기 미복습으로 망각 위험 | mastery=`mastered` + last_attempt_date aged + confidence≥medium | mastered 직후 즉시 복습 강요 금지 | Idle Observe timer / session start | G0–G6 + cooldown | Planning (짧게) · Silence if mid-solve | Spacing | 방해성 알림 | Cooldown + dismiss rate |
| R-EXM | Exam Mode Suggestion | 연습만 하고 시험 조건 전이가 없음 | Profile examDate near + mastered≥N patterns + study sessions≥K | 점수 낮음만으로 Exam Mode 금지 | Session finish + calendar gate | G0–G6 + learner not in live exam | Planning | Transfer to exam condition | 조기 시험 모드로 좌절 | Human calendar policy |
| R-BRK | Study Break | 연속 오답·장시간으로 학습 효율 저하 **관측** | session duration + consecutive fails + self-report/skip signals (있을 때) | accuracy만으로 break 금지 | Mid-session Evaluate when fatigue cluster | G0–G6 + break cooldown | Motivation (짧게) / Silence option | Motivation · prevent thrashing | 과보호 | Max 1 break/session |
| R-WPR | Weak Pattern Review | 다 Pattern 중 **전략적** 취약 집중 필요 | multiple pattern rows · comparative mastery · Evidence Strength on weakness cluster | WeaknessReport를 SoT로 쓰지 않음; Learning State mastery만 | Session start plan slot | G0–G6 + error-driven path blocked until taxonomy verified | Review Prompt + Pattern Recall | Interleaving-aware focus | 가짜 약점 그래프 | No pre-seeded pattern_states |
| R-FIN | Session Finish | 세션 목표 달성·과잉 연장 | session goal met OR diminishing returns (attempts↑, recent_accuracy flat) | “더 풀기” 기본값 금지 | Session Evaluate | G0–G6 | Reflection (짧게) | Metacognition · stop rule | 조기 종료로 under-practice | Goal definition Human |

### 1.3 Default When Matrix Fails

```text
Recommendation Emit = ABSENT
recommendation_state.next_action = unknown
Coach may remain Observe / Silence
```

---

## 2. Recommendation Priority Policy

### 2.1 Ordering Principle

Priority는 **학습 위험 × 회상 기회 × Evidence Strength**로 정한다.  
점수 공식은 Human 승인 전 **후보**이며, Runtime에 하드코딩하지 않는다.

```text
PriorityScore (candidate only)
  = LearningImpactWeight
  × EvidenceStrengthNorm
  × MasteryUrgency
  × (1 − RecencyPenalty)
  × PatternImportanceRef   # Pattern Metadata 참조, mastery 입력 아님
```

| Factor | High when | Low / Zero when |
|--------|-----------|-----------------|
| LearningImpactWeight | Pattern recall failure blocks exam goals | Cosmetic UX preference |
| EvidenceStrengthNorm | F×S×I 높음 + multi-session | Single observation |
| MasteryUrgency | `review_required` > unstable `developing` > `learning` | `mastered` (unless spacing due) |
| RecencyPenalty | 같은 Type을 방금 제시 | 충분한 cooldown |
| PatternImportanceRef | verified + exam frequency 참조 | unverified / pending pattern |

### 2.2 Hard Priority Rules (정책 잠금)

1. **Safety > Pedagogy > Convenience**  
   - R-BRK(피로/ thrashing)가 활성 가능하면 R-RTY·R-PAT보다 우선 검토.
2. **Retrieval before Explanation**  
   - Review/Retry는 “해설 보기”보다 “회상 시도” 경로를 우선.
3. **One primary recommendation per decision cycle**  
   - 동시 다중 카드/배너 금지. Secondary는 queue만.
4. **Exam Mode live 중 Recommendation 금지** (R-EXM 제안 자체는 live 진입 전만).
5. **Error-taxonomy-driven Weak Pattern**은 taxonomy `verified>0` 전 **blocked**.
6. **Human `force_pin` Override**는 PriorityScore를 이긴다 (§5).
7. **Human `suppress`**는 해당 Type/Pattern을 0으로 만든다.

### 2.3 Conflict Resolution

| Conflict | Resolution |
|----------|------------|
| R-REV vs R-RTY same pattern | Prefer R-REV if mastery=`review_required`; else R-RTY if retry cluster only |
| R-SPC vs R-WPR | If mastered spacing due and weak cluster exists → R-WPR first **once**, then schedule R-SPC |
| R-FIN vs any | If session goal met → R-FIN wins; else defer finish |
| Equal score | Prefer higher Evidence Strength; still tie → **no emit** (Fallback: Silence) |

### 2.4 Design Frame (Priority)

| Field | Content |
|-------|---------|
| Learning Problem | 여러 추천이 동시에 떠 학생이 판단 대신 UI를 따르게 됨 |
| Evidence Required | 단일 결정 cycle 로그 + dismiss/accept 이력 (미래) |
| Decision Policy | One primary · conflict table · no-emit on tie |
| Trigger | Evaluate 단계 종료 시 |
| Gate | G0–G6 |
| Coach Behavior | Primary 1건만 Coach 채널에 연결 |
| Expected Learning Effect | 선택 부하 감소 · 회상 집중 |
| Risk | 숨은 secondary 손실 → queue + Human review |
| Validation | Decision trace 샘플 감사 |

---

## 3. Coach Intervention Timing

### 3.1 Timing Law

> Coach는 **항상 학생 행동 이후**에만 반응한다.  
> 학생보다 먼저 가르치거나, 문제 진입 전 해설을 밀어 넣지 않는다.

### 3.2 Timing Windows

| Window | Allowed | Forbidden |
|--------|---------|-----------|
| Pre-question (문항 열기 전) | Silence · (승인 시) Session Planning 1문장 | 개념 강의 · 정답 암시 · Pattern 해설 전문 |
| During solve (풀이 중) | Silence 기본 · 학생 **요청 후** Micro Hint | 자동 힌트 팝업 · 타이머만으로 개입 |
| Immediate post-grade | Reflection Question (짧게) · Checklist Reminder | 정답 공개를 Coach가 대신함 (Runtime Grader 권한 침해 금지) |
| Post-pattern cluster | Pattern Recall · Review Prompt | Weakness 단정 문장 |
| Session boundary | Planning · Session Finish reflection | 다음 세션 전체 커리큘럼 자동 생성 발표 |
| Idle / away | Spacing Reminder만 (Gate 충족 시) | 푸시성 잔소리 연속 |

### 3.3 Intensity Ladder (말 많음 금지)

```text
Silence
  → Observe marker (내부만)
  → Short question (≤1문장)
  → Micro Hint (전략 단서 ≤2문장)
  → Strategy suggestion (Recommendation Type 연결)
  → Answer reveal     ← 최후 수단 · Coach 비소유 (UI SoT/해설 경로)
```

### 3.4 Design Frame (Timing)

| Field | Content |
|-------|---------|
| Learning Problem | 풀이 중 개입으로 Retrieval이 깨짐 |
| Evidence Required | 개입 시점별 학습 성과 비교 증거 (미래 A/B는 Human) |
| Decision Policy | Default Silence; escalate only on Gate |
| Trigger | Student event only |
| Gate | During-solve auto-intervene = OFF |
| Coach Behavior | Post-grade question-first |
| Expected Learning Effect | 회상 기회 보존 |
| Risk | “도움이 안 된다” 인식 → 요청형 힌트 제공 |
| Validation | Intervention rate / session ≤ policy max |

---

## 4. Coach Decision Tree

### 4.1 Tree (Conceptual)

```text
[Student Event]
      │
      ▼
 Idle ──► Observe (record evidence refs only)
      │
      ▼
 Evaluate
      │
      ├─ Evidence Gate FAIL ──────────────► Silence / Observe
      ├─ Confidence Gate FAIL ────────────► Silence / Fallback
      ├─ Human suppress ──────────────────► Silence
      ├─ Recommendation absent (G0–G6) ───► Silence
      │
      └─ Gates PASS
            │
            ▼
         Intent class?
            │
            ├─ Metacognition needed ──► Reflection Question
            ├─ Pattern name/structure ─► Pattern Recall
            ├─ Process slip ──────────► Checklist Reminder
            ├─ Spacing due ───────────► Review Prompt (short)
            ├─ Plan choice ───────────► Planning
            ├─ Thrashing / fatigue ───► Motivation (short) or Break
            └─ Else ──────────────────► Silence
            │
            ▼
         Recommend (optional link to Type R-*)
            │
            ▼
         Coach emit (policy-bound utterance class ONLY — 문구 생성은 본 WO OUT)
            │
            ▼
         Observe Again
```

### 4.2 Utterance Class → Non-Goals

| Coach Type | Does | Does Not |
|------------|------|----------|
| Micro Hint | 전략 단서 · “무엇을 떠올릴지” | 선택지 지우기 · 정답 번호 |
| Reflection Question | 왜 그 Pattern인가 질문 | 정답 해설 대행 |
| Pattern Recall | Pattern 단서 회상 유도 | Pattern DB 문구 전문 낭독 |
| Checklist Reminder | 풀이 체크 순서 상기 | 계산 대행 |
| Review Prompt | 복습 시점·대상 Pattern 제시 | 약점 낙인 |
| Motivation | 관측된 노력/회복에 한해 짧게 | 근거 없는 응원 스팸 |
| Planning | 다음 1-action | 전체 합격 로드맵 자동생성 |
| Reflection | 세션 종료 메타인지 | 점수 수치 훈계 |

### 4.3 Design Frame (Decision Tree)

| Field | Content |
|-------|---------|
| Learning Problem | Coach가 Teacher처럼 설명부터 시작함 |
| Evidence Required | Event → intent class 매핑이 반복 관찰로 검증됨 |
| Decision Policy | Question → Hint → Strategy → Answer(last) |
| Trigger | Post-Evaluate only |
| Gate | §6 · §7 |
| Coach Behavior | Type table above |
| Expected Learning Effect | 회상 촉진 |
| Risk | Tree 과적합 → Silence fallback |
| Validation | Trace: event_id → gates → class → (no raw LLM dump as SoT) |

---

## 5. Human Override Policy

### 5.1 Override Modes

| Mode | Effect | Who | Persistence |
|------|--------|-----|-------------|
| `allow` | 기본. Gate 통과 시 emit 가능 | — | default |
| `suppress` | Type 또는 pattern_id 또는 전역 Coach mute | Human | until cleared |
| `force_pin` | Priority 무시하고 특정 R-*를 primary로 고정 | Human | TTL 필수 |
| `force_silence` | 이번 세션 Coach/Recommendation 모두 absent | Human / learner quick control | session |
| `require_review` | Emit 후보를 Human inbox로만 보냄 · 학생 UI 미표시 | Human | until approve/reject |

### 5.2 Non-Negotiables

1. Evidence Strength **alone**로 Approve/Implement 금지 (`docs/evidence-backlog.md`).
2. Override는 Question/Answer/Pattern SoT를 **변경하지 않는다**.
3. Override로 Mastery 라벨을 조작하지 않는다 (Mastery Apply WO 권한).
4. Learner `force_silence`는 존중한다 (학습자 통제권).
5. `force_pin`은 Evidence Gate를 **우회하지 못한다** — 우회가 필요하면 `require_review`로 Human이 명시 승인.

### 5.3 Design Frame (Override)

| Field | Content |
|-------|---------|
| Learning Problem | 자동 추천이 학습 맥락을 해침 |
| Evidence Required | Override 사용 로그 · 사유 코드 |
| Decision Policy | Human > Policy > Score; pin≠bypass evidence |
| Trigger | Manual action / policy admin |
| Gate | Pin still needs G0–G5 unless `require_review` path |
| Coach Behavior | Mute or pinned class only |
| Expected Learning Effect | Trust · safety |
| Risk | Pin 남용 → TTL + audit |
| Validation | Override audit trail |

---

## 6. Evidence Gate

### 6.1 Evidence Strength (공유 공식)

```text
Evidence Strength
  = Frequency Score (1–5)
  × Session Coverage Score (1–5)
  × Learning Impact Score (1–5)

Maximum = 125
```

출처: `docs/evidence-backlog.md`, `docs/recommendation-requirements.md`, `docs/coach-requirements.md`.

**역할:** Prioritization aid only.  
**금지:** 자동 Approve / Reject / Implement / Emit.

### 6.2 Gate Layers

| Layer | Input | Pass rule |
|-------|-------|-----------|
| L1 Attempt Fact | AttemptEvent accepted | 최소 1건 이상 (Type별 상향) |
| L2 State Projection | Learning State counters | empty 금지 |
| L3 Mastery Label | Applied mastery (post Apply WO) | Type별 enum 집합 |
| L4 Multi-signal | attempt + recent + (optional) spacing age | accuracy-only 실패 |
| L5 Product Evidence | Evidence Backlog status | Roadmap Type은 `Approved Candidate` 또는 Architecture-approved bootstrap (§10) |
| L6 Human | Approval record | required |

### 6.3 Forbidden Evidence Shortcuts

- 최근 1회 오답
- accuracy만으로 weak/review
- mock-attempts를 학습자 증거로 취급
- Pattern Metadata 문구로 mastery/recommendation
- Error taxonomy `partial`/`pending`을 student weakness로 승격
- Coach WeaknessReport를 Learning State SoT로 혼동

### 6.4 Design Frame (Evidence Gate)

| Field | Content |
|-------|---------|
| Learning Problem | 증거 없는 추천으로 학습 왜곡 |
| Evidence Required | L1–L6 artifacts |
| Decision Policy | All layers pass |
| Trigger | Evaluate |
| Gate | Fail-closed → absent |
| Coach Behavior | Silence |
| Expected Learning Effect | Trustworthy coaching |
| Risk | Cold start 장기화 → §8 Fallback |
| Validation | Gate failure reason codes |

---

## 7. Confidence Policy

### 7.1 Confidence Objects (분리)

| Object | Meaning | Owner |
|--------|---------|-------|
| `mastery_confidence` | mastery_status 라벨 신뢰도 | WO-014.2 |
| `recommendation_confidence` | 추천 Type·대상 선택 신뢰도 | WO-015 (본 정책) |
| `coach_confidence` | 개입 class 선택 신뢰도 | WO-015 |
| `error_states.confidence` | 오류 taxonomy 관측 신뢰도 | WO-014 (현재 unknown-only) |

서로 자동 복사하지 않는다.

### 7.2 Recommendation Confidence Enum (Design)

| Value | Meaning | Emit |
|-------|---------|------|
| `unknown` | 평가 불가/미실행 | **No** |
| `low` | 최소 데이터 근접 · 신호 불일치 | **No** (Fallback) |
| `medium` | multi-signal 합의 · multi-session | Yes (soft UX) |
| `high` | 반복 합의 + Human sample audit | Yes |

Error-driven high path: taxonomy verified=0 → **blocked** (WO-014.2와 동일).

### 7.3 Mapping Rules (Conceptual)

```text
mastery_confidence = unknown|low  → recommendation_confidence ≤ low → No emit
signals disagree (overall vs recent) → downgrade
single session only → cap at low (대부분의 Type)
Human require_review approve → may raise display path without claiming high
```

### 7.4 Design Frame (Confidence)

| Field | Content |
|-------|---------|
| Learning Problem | 낮은 확신 추천이 권위처럼 보임 |
| Evidence Required | mastery_confidence + session coverage |
| Decision Policy | medium 미만 emit 금지 |
| Trigger | Pre-Recommend |
| Gate | Confidence Gate |
| Coach Behavior | Soft wording class only at medium; never “너는 약하다” |
| Expected Learning Effect | Calibrated trust |
| Risk | 과도한 low → 무도움 느낌 → 요청형 힌트 |
| Validation | confidence distribution audit |

---

## 8. Fallback Strategy

### 8.1 Fail-Closed Default

| Failure | Fallback |
|---------|----------|
| Any of G0–G6 fail | `ABSENT` + Silence |
| Confidence < medium | Silence · optional learner-initiated hint affordance |
| Priority tie | Silence (no random pick) |
| Missing mastery apply | Silence · Learning Dashboard counters만 (이미 M1) |
| Empty Evidence Backlog for new Type | Type not in runtime catalog |
| Exam Mode live | Coach/Recommend mute |
| Data corrupt / schema invalid | No emit · error log (설계: 구현은 후속) |

### 8.2 Cold Start Policy

```text
learning_data_status = empty
  → No recommendation
  → No coach teaching
  → UI: Pattern First / Exam / Practice 진입만 (M2.2)
  → Coach State = Idle|Observe
```

Cold start를 “인기 Pattern 추천”으로 채우지 **않는다**.

### 8.3 Graceful Degradation Order

```text
Full Recommend+Coach
  → Recommend without Coach copy (type id only · future)
  → Coach question without Recommend
  → Silence + Learning State dashboard
  → Manual study (Pattern list)
```

### 8.4 Design Frame (Fallback)

| Field | Content |
|-------|---------|
| Learning Problem | 빈약한 추천이 없는 것보다 해로움 |
| Evidence Required | Failure reason telemetry (future) |
| Decision Policy | Fail-closed |
| Trigger | Any gate fail |
| Gate | — |
| Coach Behavior | Silence |
| Expected Learning Effect | Avoid false guidance |
| Risk | Perceived emptiness → onboarding copy (non-coach) |
| Validation | Absent rate by gate reason |

---

## 9. Coach State Machine

### 9.1 States

| State | Meaning | Student-visible? |
|-------|---------|------------------|
| `Idle` | 세션 없음 · 대기 | No |
| `Observe` | 사건 수집 · 내부 마커만 | No |
| `Evaluate` | Gate·Confidence·Priority 평가 | No |
| `Recommend` | R-* Type 선택(또는 absent) | Only if emit allowed |
| `Coach` | Utterance class 결정 · (미래) 표시 | Only if emit allowed |
| `ObserveAgain` | 효과·후속 사건 대기 | No |

### 9.2 Transitions

```text
Idle
  --(session_start|attempt_event)--> Observe
Observe
  --(enough_events_for_cycle)--> Evaluate
  --(session_end & no cycle)--> Idle
Evaluate
  --(gates_fail|override_silence)--> ObserveAgain
  --(gates_pass)--> Recommend
Recommend
  --(type=ABSENT)--> ObserveAgain
  --(type=R-*)--> Coach
Coach
  --(emit_or_skip)--> ObserveAgain
ObserveAgain
  --(new_student_event)--> Observe
  --(session_end)--> Idle
```

### 9.3 Invariants

1. `Recommend`/`Coach`로 가려면 Evaluate를 **반드시** 거친다.
2. `Idle`에서 곧바로 `Coach` 금지.
3. Answer SoT·Grader 결과를 Coach가 변경 금지.
4. State Machine은 **정책 모델**이다. 본 WO에서 JS 구현 금지.
5. `next_action`은 Machine이 통과해도 Apply/Enum WO 전 **unknown 유지**.

### 9.4 Design Frame (State Machine)

| Field | Content |
|-------|---------|
| Learning Problem | 상시 개입형 튜터로 변질 |
| Evidence Required | Transition traces |
| Decision Policy | Observe→Evaluate→… only |
| Trigger | Student events |
| Gate | Embedded in Evaluate |
| Coach Behavior | State-bound |
| Expected Learning Effect | Disciplined acceleration |
| Risk | 복잡도 → keep states minimal (6) |
| Validation | Illegal transition tests (future) |

---

## 10. Recommendation Roadmap

### 10.1 Maturity Stages (Sprint = Architecture only)

| Stage | Name | Exit Criteria | Emit? |
|-------|------|---------------|-------|
| S0 | **Architecture Lock** (본 문서) | 10 deliverables reviewed | No |
| S1 | Prerequisite Complete | Mastery Policy Human 승인 + Apply WO + Learning State enum 확장 | No |
| S2 | Evidence Intake | Recommendation/Coach Approved Candidates ≥1 또는 Bootstrap Types Human 지정 | No |
| S3 | Decision Simulation | Offline traces on real attempts (no UI coach) · gate reason codes | No |
| S4 | Soft Surface | `next_action` enum 확장 WO + 단일 Type shadow UI (default hidden) | Shadow only |
| S5 | Controlled Coach | 1 utterance class · opt-in · Human override live | Limited |
| S6 | Multi-Type Priority | Priority Policy 파라미터 승인 후 확장 | Yes (gated) |

**09 Sprint 규칙:** Sprint마다 Recommendation/Coach **생성 금지**. Architecture만 성숙.

### 10.2 Bootstrap Types (후보 · 미승인)

Evidence Backlog가 비어 있어도 Architecture가 허용을 **논의**할 수 있는 최소 집합:

1. R-FIN — Session Finish ( thrashing 방지 )
2. R-SPC — Spacing Reminder (mastered 이후만)
3. R-REV — Review Recommendation (`review_required`만)

나머지는 **Approved Candidate** 없이 Runtime catalog 진입 금지.

### 10.3 Dependency Graph

```text
WO-014 Learning State
  → WO-014.1 Attempt Ingest (runtime counters)
  → WO-014.2 Mastery Policy (doc)
  → Mastery Apply WO (future · Human)
  → WO-015 Architecture (본 문서)     ← now
  → Evidence Approved Candidates
  → Recommendation Enum/Persist WO
  → Coach Surface WO (docs/33 C4 정합)
```

### 10.4 Explicit Deferral vs Legacy Phase 7

| Item | Policy |
|------|--------|
| `js/recommendation-engine.js` / `recommendation.html` | 레거시 MVP 산출물. WO-015 Gate를 충족한다고 **간주하지 않음**. |
| `docs/08-recommendation-engine-spec.md` | 기능 아이디어 창고. Emit 권한 없음. |
| README Phase 7 ✅ | 과거 MVP 체크. **본 Architecture Freeze와 충돌 시 본 문서·Evidence First 우선.** |

### 10.5 Design Frame (Roadmap)

| Field | Content |
|-------|---------|
| Learning Problem | 추천을 먼저 만들어 Evidence를 역설계함 |
| Evidence Required | Stage exit artifacts |
| Decision Policy | S0→S6; no skip to S5 |
| Trigger | Human stage approval |
| Gate | Per-stage checklist |
| Coach Behavior | None until S5 |
| Expected Learning Effect | Safe acceleration path |
| Risk | Legacy UI 재활성화 유혹 |
| Validation | Stage gate review |

---

## 11. Learning Strategy Binding (Architecture Map)

Recommendation/Coach는 아래 학습 전략에 **종속**된다. 전략을 구현하지 않고 **매핑만** 고정한다.

| Strategy | Primary Types | Coach Types | Note |
|----------|---------------|-------------|------|
| Retrieval Practice | R-REV, R-RTY | Reflection Question, Pattern Recall | 정답 전 회상 |
| Spacing | R-SPC | Review Prompt | mastered 이후 |
| Interleaving | R-WPR, R-PAT | Planning | 단일 약점 고착 방지 |
| Pattern Reinforcement | R-PAT | Pattern Recall, Checklist | Pattern First (M2.2) 정합 |
| Error Recovery | R-RTY | Micro Hint → Reflection | Answer last |
| Motivation | R-BRK | Motivation (short) | Evidence 있는 피로만 |
| Review Timing | R-REV, R-SPC | Review Prompt | recent decline ≠ 1 miss |

---

## 12. Out of Scope Checklist

| Item | Status |
|------|--------|
| Implement Recommendation Engine | OUT |
| Generate Coach messages / prompts | OUT |
| Modify Question / Answer / Pattern / Learning State | OUT |
| Execute mastery calculation | OUT |
| Expand `next_action` enum in schema | OUT (future WO) |
| Change LocalStorage keys | OUT |

---

## 13. Validation Checklist (WO-015 Architecture)

| Criterion | Result |
|-----------|--------|
| Trigger Matrix defined | PASS (design) |
| Priority Policy defined | PASS (design) |
| Coach Intervention Timing defined | PASS (design) |
| Coach Decision Tree defined | PASS (design) |
| Human Override Policy defined | PASS (design) |
| Evidence Gate defined | PASS (design) |
| Confidence Policy defined | PASS (design) |
| Fallback Strategy defined | PASS (design) |
| Coach State Machine defined | PASS (design) |
| Recommendation Roadmap defined | PASS (design) |
| No runtime code added for WO-015 | Required |
| No DB / Question / Answer / Pattern edits | Required |
| Recommendation remains absent until gates | Required |
| Evidence First order preserved | Required |

---

## 14. Next Human Decisions (승인 대기)

1. 본 Architecture S0 Lock 승인 여부  
2. Mastery Apply WO 착수 조건·파라미터 승인 (`pending_human`)  
3. Bootstrap Types (R-FIN / R-SPC / R-REV) Human 지정 여부  
4. 레거시 Phase 7 Recommendation UI를 Shadow/Hidden으로 유지할지 명시  
5. docs/33 C4와 WO-015 Decision Layer 병합 시점  

**승인 전 Runtime 작업 금지.**
