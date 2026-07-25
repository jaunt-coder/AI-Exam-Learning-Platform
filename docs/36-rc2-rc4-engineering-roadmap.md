# AI Exam Learning Platform
# Engineering Roadmap — RC2 · RC3 · RC4 → v2.0

Version 1.0 — 2026-07-21  
작성 관점: Chief Software Architect / acting CTO  
상태: **실행 로드맵 (설계 변경 없음)**

> 본 문서는 `docs/31~35` Constitution을 **변경하지 않는다**.  
> Parser Core·Promotion Ownership·Four Plane 권위는 고정이며, 본 문서는 승인된 전략을 **실행 가능한 엔지니어링 계획**으로 번역할 뿐이다.  
> **Exam Mode:** `docs/37`이 시험 전 **실행 우선순위**를 보완한다(본 로드맵 폐기 아님). 충돌 시 System Safety는 `docs/35`.

---

## 0. RC1 Baseline (근거 고정)

로드맵의 모든 추정치는 아래 RC1 실측을 기준으로 한다.

| 항목 | RC1 상태 | 출처 |
|------|----------|------|
| Constitution | `docs/31~35` Freeze | docs |
| Parser Core (`scripts/parser/` S1–S9) | 불변, Emit 산출 | docs/31·32 |
| Coach | C1~C3 완료 (UserProfile / QuestionAttempt / WeaknessReport + stores) | docs/33 |
| Coach C4~C6 | 미착수 | docs/33 |
| Promotion dry-run | `PROMOTION_READY = NO` | PROMOTION-VALIDATION-REPORT |
| G5 answer drift | **0 / 240** | validation §2 |
| G6 pattern 미해결 | **15건 `ACC_COST_001`** (D4 미등록) | validation §3 |
| Display diff | question 240 / choices 223 / table 117 / hasTable 104 | validation §2 |
| hasTable True→False | 25건 (전건 목록 확보) | ADR-003 |
| ADR 판정 | 001 DEFER / 002 S1 / 003 H1 / 004 L1 | Architecture Review |
| Legacy Path L | `exam_pipeline`+`repair-pipeline`가 D3 직접 갱신 (Truth Split 잔존) | validation §4·§7 |
| Repair backlog | 183 / 240 | ADR-004 |
| Tech 제약 | HTML/CSS/Vanilla ES6/JSON/LocalStorage/GitHub Pages only | Constitution |

RC1 결론: **안전은 확보(게이트 이중 차단), 그러나 Truth Split은 운영상 미해소.** RC2의 존재 이유가 여기서 나온다.

---

# 1. RC2 Master Plan — Truth Unification & Event Backbone

> RC2 목표 한 줄: **“Emit → Product 단일 진실을 실제로 성립시키고, 학습 이벤트 척추를 깐다.”**  
> 아키텍처는 이미 docs/35가 정의했다. RC2는 그것을 **가동**시킨다.

## Epic 매핑 요약

| Epic | 이름 | Plane | 선행 ADR |
|------|------|-------|----------|
| RC2-E1 | Pattern Authority Resolution (G6) | D4 | ADR-001 |
| RC2-E2 | Display Acceptance Execution | B/D3 | ADR-002 |
| RC2-E3 | hasTable Adjudication | B/D3 | ADR-003 |
| RC2-E4 | Legacy Path Decommission | Plane A 경계 | ADR-004 |
| RC2-E5 | First Promotion (Canary→Full) | B | E1–E4 |
| RC2-E6 | Display Passthrough | C | E5 |
| RC2-E7 | Event Backbone Foundation | D | 독립 |
| RC2-E8 | Regression & Gate Hardening | 전 Plane | 병행 |

---

### RC2-E1 — Pattern Authority Resolution (G6)

- **Goal:** `ACC_COST_001` 15건의 D4 지위를 확정해 G6 Hard Gate를 해소한다.
- **Why it exists:** G6가 Promotion을 하드 차단하는 유일한 Critical blocker. D4는 Owner(인간)만 쓰기 가능하므로 엔지니어링이 단독 해소 불가 → 실행 계획에 명시적 인간 승인 단계가 필요.
- **Deliverables:** ADR-001 최종 선택 기록; (승인 시) Pattern DB에 정식 등록 또는 Promotion 측 매핑 규칙; G6 재-dry-run PASS 리포트.
- **Dependencies:** ADR-001 (현재 DEFER) → D4 Owner의 패턴 정의 제공.
- **Success Metrics:** G6 fail = 0; patternId ∈ D4 = 100%; Coach weakness 클러스터 회귀 0.
- **Estimated Sprint:** 1 (승인 대기 제외) + 인간 승인 리드타임.
- **Risk:** **High** — 이질 15건을 성급히 단일 패턴 통합 시 Coach 진단 왜곡(docs/35 E11). 완화: ADR-001 Option A(정식 등록) 우선, blind remap 금지.

### RC2-E2 — Display Acceptance Execution

- **Goal:** ADR-002 S1 기준(DA-0~DA-3)으로 30건 표본을 실제 판정하고 Acceptance Gate를 통과/차단 확정.
- **Why it exists:** answer 불변만으로 UX 붕괴(choices 붕괴)를 막지 못함. D3는 “무보정 렌더 가능” 품질이어야 승격 가능(docs/35 §11.4).
- **Deliverables:** 30건 라벨링 워크시트(IMPROVED/EQUIVALENT/REGRESSED/AMBIGUOUS); Acceptance 판정 리포트; 재현용 sampler 실행 로그.
- **Dependencies:** ADR-002 승인(S1); RC2-E3 교차(hasTable 행은 판정 전 AMBIGUOUS 유지).
- **Success Metrics:** REGRESSED = 0; IMPROVED+EQUIVALENT ≥ 27/30; 연도별 REGRESSED = 0.
- **Estimated Sprint:** 1 (표본) → 미달 시 Parser 개선 Track 반복.
- **Risk:** **Medium** — 표본 통과해도 전수 잔존 위험. 완화: canary 우선, soft-gate 모니터링.

### RC2-E3 — hasTable Adjudication

- **Goal:** True→False 25건을 TRUE_REGRESSION / FALSE_ALARM / FIELD_MOVE / NEEDS_PDF로 전건 분류.
- **Why it exists:** 표 소실은 최대 UX 회귀 위험이나, MVP가 choice-grid를 table 필드에 잘못 인코딩한 흔적이 다수 → “제거=회귀” 성급 판단 금지(docs/35 §6.2 교정은 Plane A).
- **Deliverables:** 25건 라벨 워크시트; PDF 대조 근거; ADR-002 DA-2 입력.
- **Dependencies:** ADR-003 승인(H1); D0 원문 접근.
- **Success Metrics:** 25/25 라벨 완료; TRUE_REGRESSION 후보는 Parser Track 이관.
- **Estimated Sprint:** 1.
- **Risk:** **Medium** — 오탐을 회귀로 오판 시 정상 개선 차단. 완화: 원문 1회 대조 강제(H1).

### RC2-E4 — Legacy Path Decommission

- **Goal:** ADR-004 L1(Freeze) 발효 → 종국적으로 Path L(`exam_pipeline`+`repair-pipeline`)의 D3 직접 쓰기 폐지.
- **Why it exists:** Path L이 D3에 직접 기록하는 한 Truth Split은 구조적으로 재발(docs/35 D3 Owner=Promotion only). RC1에서 미커밋 M 파일로 실재 확인됨.
- **Deliverables:** Freeze 정책 커밋(추가 patch 금지, repair 재실행 금지); 워킹트리 M 파일 커밋/revert 결정 기록; (후속) staging 격리 또는 폐기 절차.
- **Dependencies:** ADR-004 승인(L1); RC2-E5 이후 repair backlog 재배치.
- **Success Metrics:** D3 쓰기 경로 = Promotion 단일; Path L 신규 patch = 0; baseline sha256 안정.
- **Estimated Sprint:** 1 (정책) + backlog 이관은 별도.
- **Risk:** **Medium** — repair 183건 부채 잔존. 완화: 부채는 Parser Track/Migration Sprint로 이관, D3 직접 쓰기만 즉시 차단.

### RC2-E5 — First Promotion (Canary → Full)

- **Goal:** E1–E4 충족 후 최초의 합법 Promotion 실행(canary 소수 ID → full 240).
- **Why it exists:** Truth Split “운영상 해소”의 실증 단계. Emit이 Product를 생성함을 manifest로 증명.
- **Deliverables:** candidate → approval → atomic promote → manifest(checksum, git sha); canary smoke; rollback 드릴 1회.
- **Dependencies:** E1(G6=0), E2(Acceptance YES), E3(TRUE_REGRESSION=0), E4(L1).
- **Success Metrics:** `PROMOTION_READY=YES`; answer drift 0 유지; rollback 성공 실증; questionId 불변.
- **Estimated Sprint:** 1 canary + 1 full.
- **Risk:** **High** — answer/보기 회귀 시 학습 사고. 완화: G5 하드, partial rollback, baseline 백업.

### RC2-E6 — Display Passthrough

- **Goal:** `data-cleaner`/`question-cleanup-overrides` 내용 보정을 no-op 목표로 축소(View-only만 잔존).
- **Why it exists:** docs/35 §6.2 목표 상태 = Display는 D3 read-only 투영. Repair Layer 이중화 제거.
- **Deliverables:** cleanup 플래그 off 실험; passthrough 렌더 회귀; 잔존 CSS/aria/마커만 문서화.
- **Dependencies:** RC2-E5 full promotion + 2주 canary 안정.
- **Success Metrics:** 내용 치환 로직 0; 육안 샘플 회귀 0; 기존 LocalStorage 키 불변.
- **Estimated Sprint:** 1–2.
- **Risk:** **Medium** — 조기 제거 시 UX 붕괴. 완화: promotion 안정 후에만, 플래그 게이팅.

### RC2-E7 — Event Backbone Foundation

- **Goal:** docs/35 §8 이벤트 척추(Event Bus + append-only Event Log + Projection updater)를 **브라우저 내** 구축. Question body 미포함.
- **Why it exists:** RC3 Closed-loop의 전제. C1~C3 store를 이벤트 파생 projection으로 정렬(키 rename 없음).
- **Deliverables:** in-browser Event Bus; `learningEvents` 호환 정렬; Attempt/Weakness projection 재구축 가능성; 멱등 처리.
- **Dependencies:** 없음(C1~C3 위에 additive).
- **Success Metrics:** Projection = Event Log에서 100% 재구축; 기존 키(progress/wrongAnswers/…) 불변; Question 필드 저장 0.
- **Estimated Sprint:** 2.
- **Risk:** **Medium** — LocalStorage 용량/스키마 드리프트. 완화: append-only + 스키마 validate + compaction 정책.

### RC2-E8 — Regression & Gate Hardening

- **Goal:** Promotion Gate·Parser 회귀·Coach·Display 스모크를 단일 재현 harness로 고정.
- **Why it exists:** RC2가 여러 Plane을 동시에 건드리므로 baseline drift 자동 탐지가 필수(RC1은 sha256 수동).
- **Deliverables:** 통합 검증 러너(read-only); sha256 매니페스트 자동화; CI-assist 체크리스트.
- **Dependencies:** 병행.
- **Success Metrics:** 회귀 탐지 자동화 100%; false pass 0.
- **Estimated Sprint:** 1.
- **Risk:** **Low**.

**RC2 총 스프린트 추정:** 9–11 (인간 승인 리드타임 별도).

---

# 2. RC3 Master Plan — Closed-loop Agent (C4~C6)

> RC3 목표: docs/35 §13.6 6-stage 학습 루프를 **이벤트 기반**으로 완성한다.  
> 전 단계는 Plane D 내부에서만 순환하며 **Plane A(Parser/Builder)를 호출하지 않는다.**  
> AI는 Provider Port 뒤의 조언자이며 어떤 단계도 Question body를 생성·수정하지 않는다.

공통 불변식: Event Log append-only · Projection 재구축 가능 · AI 출력은 이벤트로만 반영 · answer 권위는 D3 · Coach는 questionId 참조만.

### Stage 1 — OBSERVE (Profile / Session capture)

| 항목 | 내용 |
|------|------|
| Inputs | Student action, 채점 결과(D3 answer 기준), solvingTime, source |
| Outputs | `ProfileUpserted`, `QuestionAttempted`, `SessionCompleted` 이벤트 |
| Authority | Learner State (D7) — 사실은 이벤트 |
| Owner | Plane C UI Adapter (발행) → Event Bus |
| Storage | append-only Event Log + `questionAttempts` 호환 projection |
| Tests | 멱등(중복 attemptId) · answer 채점 정확성 · Question body 미저장 assert |
| Rollback | 이벤트 삭제 대신 compensating event; projection 재빌드 |

### Stage 2 — DIAGNOSE (Weakness)

| 항목 | 내용 |
|------|------|
| Inputs | `QuestionAttempted*`, `AttemptClassified`, Pattern Master(D4 참조) |
| Outputs | `WeaknessDiagnosed` → Weakness projection |
| Authority | Diagnosis Projection (D7) |
| Owner | Weakness Agent (`js/coach/`, C3 재사용) |
| Storage | `weaknessReports` / `coach.weakness.v1` (기존 키) |
| Tests | evidenceAttemptIds 링크 무결 · pattern/concept 단위 집계 · 재진단 supersede |
| Rollback | 진단은 재계산 가능(Attempt 원장 기반); 잘못된 진단은 재진단 이벤트로 대체 |

### Stage 3 — PLAN (Learning Planner, C4)

| 항목 | 내용 |
|------|------|
| Inputs | Weakness projection, UserProfile(시험일/목표), `StrategyRevised` |
| Outputs | `StudyPlanProposed` → (학생 수락) `StudyPlanAccepted` |
| Authority | Planner Projection (활성 계획 1개) |
| Owner | Planner Agent (C4 신규) |
| Storage | StudyPlan store / Event Log (questionId·criteria만, 본문 미내장) |
| Tests | 활성 계획 유일성 · selection에 D3 catalog만 참조 · Builder/Parser 미호출 assert |
| Rollback | `StudyPlanSuperseded`로 대체; 직전 active plan 복원 |

### Stage 4 — ACT (Session Selector)

| 항목 | 내용 |
|------|------|
| Inputs | Active StudyPlan(criteria/id list) |
| Outputs | Session Queue(questionId 목록), 세션 중 `QuestionAttempted` |
| Authority | D3 Product Catalog (읽기) |
| Owner | Application Layer Session Builder (구 “Question Builder Agent” 대체, docs/35 §7.4) |
| Storage | 세션 상태는 휘발 + 이벤트 원장; Question 본문 복제 금지 |
| Tests | excludeIds 준수 · 존재하지 않는 id 방어 · IR Pipeline 미호출 |
| Rollback | 세션 폐기 후 재구성(원장 무손실) |

### Stage 5 — EVALUATE (Evaluation Agent)

| 항목 | 내용 |
|------|------|
| Inputs | `SessionCompleted`, Attempt 집계, 목표 대비 진척 |
| Outputs | 평가 결과 → Profile aggregates 갱신 이벤트, Strategy 트리거 |
| Authority | Evaluation Projection (D7) |
| Owner | Evaluation Agent (C5/C6) |
| Storage | Event Log + Dashboard projection(집계 캐시) |
| Tests | 집계 재현성 · AI가 채점 결과 불가역 assert · KPI 산식 고정 |
| Rollback | 집계는 원장에서 재계산 |

### Stage 6 — REVISE (Strategy Revision)

| 항목 | 내용 |
|------|------|
| Inputs | Evaluation 결과, Weakness, 시험일 근접, (선택) AI Provider 조언 |
| Outputs | `StrategyRevised` → Planner 재계획 트리거 |
| Authority | Strategy Projection (D7) — revision chain, 최신이 active |
| Owner | Strategy Revision Agent (C6) |
| Storage | Strategy revision log; AI 응답은 이벤트로만 |
| Tests | revision 체인 추적 · AI 출력이 projection 직접 overwrite 금지 assert · 이벤트 id 감사 |
| Rollback | 이전 revision을 active로 재지정(append 방식) |

**루프:** Observe → Diagnose → Plan → Act → Evaluate → Revise ↺ (Plane D 폐쇄).  
**RC3 Phase 매핑:** C4 Planner → C5 Dashboard/Evaluate → C6 Full loop + Strategy.  
**RC3 총 스프린트 추정:** 8–10.  
**RC3 진입 조건:** RC2-E5(Promotion) + RC2-E7(Event Backbone) 완료. (RC1 권고: G6 미해소 시 C4 착수 금지 — 유지)

---

# 3. RC4 Graph Architecture — Projection Roadmap

> docs/35 **미변경**. 그래프는 새로운 Authority가 아니라 **기존 D3/D4/D7의 read-only projection**이다.  
> 그래프는 SoT가 아니며 언제든 원장·마스터에서 재생성 가능해야 한다.

### 3.1 세 그래프의 지위

| Graph | 파생 원천(SoT) | 성격 | 저장 |
|-------|----------------|------|------|
| Knowledge Graph | D4 Pattern Master + D5 Meta (+ D3 문항-패턴 링크) | 개념·패턴·문항 관계 투영 | 정적 빌드 산출(JSON), 배포물 |
| Weakness Graph | D7 Weakness/Attempt projection | 학생별 약점 클러스터·전이 | LocalStorage projection |
| Learning Graph | D7 Event Log 전체 | 학습 경로·세션·전략 이력 | LocalStorage projection + 집계 캐시 |

### 3.2 Projection Builders

- **Knowledge Graph Builder:** 오프라인/빌드타임. Pattern DB + Product catalog를 읽어 노드(concept/pattern/question)·엣지(prereq/relatedQuestions) 생성. **Parser/Promotion 미변경**, 순수 read.
- **Weakness Graph Builder:** 브라우저 런타임. `WeaknessDiagnosed`+`QuestionAttempted` projection에서 pattern 노드·severity 가중·오류전이 엣지 생성.
- **Learning Graph Builder:** 브라우저 런타임. Event Log를 시간축 그래프로 투영(session→pattern→outcome).

### 3.3 Refresh Timing

| Graph | 갱신 시점 |
|-------|-----------|
| Knowledge | Promotion Release마다 재빌드(콘텐츠 버전에 종속) |
| Weakness | `WeaknessDiagnosed`/`SessionCompleted` 이벤트 시 증분 |
| Learning | 세션 종료 시 증분, 부팅 시 정합성 체크 |

### 3.4 Storage

- Knowledge: `data/graph/knowledge-graph.v{n}.json` (배포 read-only 산출물, Generated → 직접 수정 금지).
- Weakness/Learning: LocalStorage projection 네임스페이스(기존 키 rename 없음), 대용량 시 compaction.

### 3.5 Versioning

- Knowledge Graph 버전 = **Product Snapshot manifest sha에 바인딩**. 콘텐츠와 그래프 버전 불일치 시 런타임이 재빌드 트리거.
- Weakness/Learning: schemaVersion 필드 + projection rebuild 마이그레이션.

### 3.6 Graph Rebuild Policy

1. 모든 그래프는 **원장/마스터에서 전량 재구축 가능**(파괴 시 손실 0).
2. 증분 실패·스키마 드리프트 감지 시 **full rebuild** fallback.
3. 그래프는 결코 SoT를 역으로 수정하지 않는다(단방향).
4. Knowledge Graph 재빌드는 Promotion 파이프라인의 **후속 산출 단계**로만 트리거(별도 쓰기 권한 신설 없음).

**RC4 총 스프린트 추정:** 6–8.  
**RC4 진입 조건:** RC3 Event/Projection 안정.

---

# 4. Engineering Backlog (P0–P3)

> effort 단위: S(≤1스프린트), M(1–2), L(2–3).

## P0 — 즉시 (Promotion 해소 / Truth 단일화)

| ID | Description | Dependencies | Risk | Effort | Definition of Done |
|----|-------------|--------------|------|--------|--------------------|
| P0-1 | ADR-001 최종화 → G6 `ACC_COST_001` 처리 실행(승인 반영) | ADR-001 승인, D4 Owner 정의 | High | M | G6 fail=0, patternId∈D4=100%, 재dry-run PASS |
| P0-2 | ADR-004 L1 Freeze 발효 + Path L D3 직접쓰기 차단 | ADR-004 승인 | Medium | S | 커밋 정책 문서화, Path L 신규 patch=0, baseline sha 안정 |
| P0-3 | 워킹트리 legacy M 파일 커밋/revert 결정 | P0-2 | Medium | S | 워킹트리 정리, Promotion Gate와 혼동 소지 0 |
| P0-4 | Display Acceptance 30건 판정(ADR-002 S1) | ADR-002 승인 | Medium | S | REGRESSED=0, IMPROVED+EQUIVALENT≥27 |
| P0-5 | hasTable 25건 전건 라벨링(ADR-003 H1) | ADR-003 승인, D0 | Medium | S | 25/25 라벨, TRUE_REGRESSION 처리 경로 확정 |

## P1 — RC2 완료 (승격·척추)

| ID | Description | Dependencies | Risk | Effort | Definition of Done |
|----|-------------|--------------|------|--------|--------------------|
| P1-1 | First Canary Promotion(승인 ID) | P0-1,4,5 | High | M | canary smoke PASS, partial rollback 실증 |
| P1-2 | Full Promotion 240 + manifest | P1-1 | High | M | PROMOTION_READY=YES, answer drift 0, rollback 드릴 성공 |
| P1-3 | Event Backbone(bus+log+projection) | RC2-E7 | Medium | L | projection 재구축 100%, Question 필드 저장 0 |
| P1-4 | Regression/Gate harness 자동화 | 병행 | Low | S | 회귀 자동탐지, sha manifest 자동 |
| P1-5 | Display Passthrough(cleaner off) | P1-2 | Medium | M | 내용 치환 0, 육안 회귀 0 |

## P2 — RC3 Closed-loop

| ID | Description | Dependencies | Risk | Effort | Definition of Done |
|----|-------------|--------------|------|--------|--------------------|
| P2-1 | C4 Learning Planner(Plan stage) | P1-2,P1-3 | Medium | L | 활성계획 유일, D3 catalog만 참조, Builder 미호출 |
| P2-2 | Session Selector(Act stage) | P2-1 | Medium | M | excludeIds 준수, IR 미호출 assert |
| P2-3 | Evaluation Agent(Evaluate) | P2-2 | Medium | M | KPI 산식 고정, 집계 재현성 |
| P2-4 | Strategy Revision(Revise) | P2-3 | Medium | M | revision 체인 추적, AI overwrite 금지 assert |
| P2-5 | Coach Dashboard(C5) | P2-1..4 | Low | M | projection 시각화, LocalStorage 키 불변 |

## P3 — RC4 Graph / 확장

| ID | Description | Dependencies | Risk | Effort | Definition of Done |
|----|-------------|--------------|------|--------|--------------------|
| P3-1 | Knowledge Graph builder(빌드타임) | P1-2 | Low | M | manifest sha 바인딩, 전량 재빌드 가능 |
| P3-2 | Weakness Graph projection | P2-4 | Low | M | 이벤트 증분, full rebuild fallback |
| P3-3 | Learning Graph projection | P1-3,P2-3 | Low | M | 시간축 재구축 가능, 단방향 |
| P3-4 | Real AI Provider adapter(Port 교체) | P2-4 | Medium | M | 벤더 SDK 직접결합 0, Port only, grounding 필수 |
| P3-5 | Subject Template 2번째 과목 PoC | P1-2 | Medium | L | Core 과목 무지 유지, Template 분리 |

---

# 5. Technical Debt Roadmap

| Debt | Severity | Risk | Owner | When | Can it wait? |
|------|----------|------|-------|------|--------------|
| Legacy Path L(exam_pipeline+repair)가 D3 직접 쓰기 | **Critical** | Truth Split 재발, baseline drift | Architecture Owner(User) + Cursor | RC2-E4 즉시 | **No** — P0 |
| Repair backlog 183/240 미해소 | High | 콘텐츠 UX 부채 | Parser Track + User | RC2 이후 Migration Sprint | Yes(격리 시) |
| Display cleaner/overrides 이중 Repair Layer | High | 제2 SoT 잔존(docs/35 §6.2 위반) | Cursor/Sonnet | RC2-E6 | Yes(promotion 안정 후) |
| `ACC_COST_001` D4 미등록 | High | Coach 진단 고착 | D4 Owner(User) | RC2-E1 | **No** — 게이트 차단 |
| 워킹트리 미커밋 M 파일 다수 | Medium | Gate 혼동/우발 승격 | User+Cursor | RC2-E4 병행 | No |
| sha256 수동 회귀 검증 | Medium | 사람 실수로 drift 누락 | Cursor | RC2-E8 | Yes(단기) |
| Emit join/table 품질(choices 223/table 117) | Medium | Display Acceptance 반복 실패 | Parser Track | RC2-E2 반복 | Yes(canary 우회) |
| LocalStorage 용량/compaction 정책 부재 | Medium | 이벤트 누적 시 한계 | Cursor | RC2-E7 | Yes |
| AI Provider = Mock only | Low | 실제 개인화 미검증 | Sonnet/Opus | P3-4 | Yes |
| 단일 과목 종속(회계학만) | Low | 플랫폼 범용성 미실증 | User+Opus | v1.5 | Yes |

원칙: **Critical/High 중 “게이트·D3 관련”은 대기 불가**, 그 외 콘텐츠 품질 부채는 Promotion 안정 후 Migration으로 이관.

---

# 6. Team Assignment

역할 정의: **Cursor** = 결정론적 구현/스크립트/테스트/projection. **Sonnet** = 중간 복잡도 구현·문서·테스트 저작. **Opus** = 아키텍처 민감 설계·에이전트 오케스트레이션·ADR·리스크 판단. **User** = Plane 권위가 걸린 승인(불가 위임).

| Backlog | 담당 | 이유 |
|---------|------|------|
| P0-1 실행 | Cursor (실행) + **User (승인)** | D4 쓰기는 Owner 권위(docs/35). 등록·매핑 스크립트는 결정론적 → Cursor |
| P0-2/P0-3 | Cursor + **User (freeze 승인)** | 정책 발효는 Architecture Owner, 파일 정리는 Cursor |
| P0-4/P0-5 | **User (판정)** + Cursor (sampler) | Display/PDF 대조는 인간 판단, 도구 실행은 Cursor |
| P1-1/P1-2 Promotion apply | **User (approval)** + Cursor (gate 실행) | `--apply`는 인간 승인 필수(docs/34). 원자 교체·manifest는 Cursor |
| P1-3 Event Backbone | Sonnet (구현) + Opus (설계 리뷰) | 이벤트 정합/멱등 설계는 민감 → Opus 리뷰, 구현량은 Sonnet |
| P1-4 harness | Cursor | 순수 결정론적 검증 자동화 |
| P1-5 Passthrough | Sonnet + Cursor(회귀) | UI 변경 + 회귀 스모크 |
| P2-1..P2-4 Agents | Opus (오케스트레이션 설계) + Sonnet (구현) | 6-stage 루프·이벤트 흐름은 아키텍처 민감 |
| P2-5 Dashboard | Sonnet + Cursor | UI 구현 + projection 바인딩 |
| P3-1..P3-3 Graphs | Cursor (builder) + Opus (버저닝 정책) | 재빌드/단방향 규율은 설계, 빌드는 결정론적 |
| P3-4 Real AI | Opus (Port 계약·safety) + Sonnet (adapter) | grounding/non-authoritative 안전은 Opus |
| P3-5 2nd Subject | Opus (Template 경계) + User (콘텐츠 승인) | Subject Independence 판단 + 콘텐츠 권위 |
| Tech Debt Critical/High | **User (권위 결정)** + Cursor (실행) | D3/D4/Freeze는 Owner 결정 |

**불변:** 어떤 `--apply`·D4 등록·Unfreeze·콘텐츠 승인도 AI가 단독 실행하지 않는다. AI는 준비·검증·실행 스크립트까지, 최종 승인은 User.

---

# 7. Release Roadmap

| Release | Features | Architecture State | Business Milestone | Success KPI |
|---------|----------|--------------------|--------------------|-------------|
| **RC2** | Promotion 실행, Truth 단일화, Display passthrough, Event Backbone | Four Plane 가동, D3=Emit 승인본, Path L 폐지 | 단일 진실 위 학습 제품 성립 | PROMOTION_READY=YES, answer drift 0, cleaner 내용보정 0 |
| **RC3** | Closed-loop Coach(Observe→Revise), C4~C6 | Plane D 이벤트 폐쇄 루프 | 개인화 학습 루프 첫 가동 | 루프 6단계 이벤트 추적 100%, 재계획 자동 트리거 |
| **RC4** | Knowledge/Weakness/Learning Graph | Graph = read-only projection | 그래프 기반 약점·경로 시각화 | 그래프 full rebuild 성공, 콘텐츠-그래프 버전 정합 |
| **v1.0** | 회계학 단일 과목 GA(문항+Coach+Dashboard) | RC1~RC4 안정, Freeze 유지 | 첫 정식 출시(감정평가사 회계학) | 정답 정합 100%, 학습 세션 완주율, 재방문율 |
| **v1.5** | Real AI Provider, 2번째 Subject Template PoC | Provider Port 실교체, Core 과목 무지 유지 | 멀티 과목 확장성 실증 | 신규 과목 온보딩 리드타임, AI 조언 grounding 100% |
| **v2.0** | 멀티 시험·멀티 과목, 그래프 주도 개인화 | 플랫폼화(Subject Template N개) | 범용 시험 학습 플랫폼 | 과목 수, MAU, 합격 기여 지표 |

**아키텍처 상태 공통:** 전 릴리스에서 docs/35 Ownership·Parser 불변·Promotion 권위 **불변**.

---

# 8. Risk Register

| Risk | Likelihood | Impact | Mitigation | Owner |
|------|-----------|--------|------------|-------|
| G6 미해소로 Promotion 장기 정체 | Medium | High | ADR-001 Option A 우선, D4 정의 리드타임 확보 | User(D4) |
| Path L 재가동으로 baseline drift | Medium | Critical | L1 Freeze 발효, D3 직접쓰기 차단, sha 자동감시 | Architecture Owner |
| answer/보기 회귀로 학습 사고 | Low | Critical | G5 하드, canary, partial rollback, 백업 | Promotion Owner |
| Display Acceptance 반복 실패 | Medium | Medium | Parser Track 개선, canary 우회, soft-gate 모니터 | Parser Track |
| 이벤트 척추 스키마 드리프트 | Medium | Medium | append-only, schemaVersion, full rebuild fallback | Cursor/Sonnet |
| Coach가 Question body 복제(권위 위반) | Low | High | 저장 시 body 필드 assert 테스트, 코드리뷰 | Opus |
| AI 출력이 projection/answer overwrite | Low | High | AI는 이벤트로만, non-authoritative assert | Opus |
| LocalStorage 용량 초과 | Medium | Medium | compaction, projection 재구축 | Cursor |
| Repair backlog 183 방치로 UX 부채 고착 | Medium | Medium | 별도 Migration Sprint, Parser Track SLA | User+Parser |
| 단일 과목 종속으로 범용성 미검증 | Medium | Medium | v1.5 2nd subject PoC | Opus+User |
| Freeze 하 임시예외의 상시화 | Medium | High | Explicit Unfreeze ADR 강제, 예외 만료 | Architecture Owner |

---

# 9. Architecture Maturity Review (RC1 근거 재채점)

척도 1(부재)–5(성숙). 근거는 RC1 실측.

| 영역 | 점수 | 근거 (RC1) |
|------|------|-----------|
| **Architecture** | **4.5 / 5** | docs/31~35 Constitution 완비, Four Plane·D0~D7 권위 명문화, Freeze 규율. 감점: 실행(가동) 미완 |
| **Runtime (Product)** | **3.0 / 5** | Display 동작하나 cleaner 이중 Repair Layer 잔존, passthrough 미완 |
| **Coach** | **3.0 / 5** | C1~C3 완료(모델·store·mock), 그러나 C4~C6 미착수, 이벤트 척추 없음 |
| **Promotion** | **3.5 / 5** | Gate G1~G8 설계·이중 안전장치 실증, dry-run 재현. 감점: 실제 apply 0회, G6 blocker |
| **Data** | **2.5 / 5** | answer 무결(drift 0)·questionId 안정. 감점: Truth Split 운영 미해소, Path L 직접쓰기, repair 183 |
| **AI** | **1.5 / 5** | Provider 인터페이스 + Mock만. 실제 개인화·grounding 미검증 |
| **Business** | **2.0 / 5** | 단일 과목·미출시. 콘텐츠 파이프라인은 존재하나 GA 지표 부재 |

**종합 판정:** 설계 성숙도(Architecture)는 최상위권, **실행 성숙도(Runtime/Data/AI/Business)가 지체**. RC2가 Data/Runtime을, RC3가 Coach/AI를, v1.x가 Business를 끌어올리는 순서가 정합.

---

# 10. Final Recommendation (as CTO — 향후 12개월)

Product Owner에게 다음 순서로 집중할 것을 권고합니다.

1. **먼저 “진실”을 닫아라 (0–3개월).** 신기능이 아니라 **RC2 Truth Unification**이 최우선이다. G6 해소(ADR-001) → Legacy Path L Freeze(ADR-004) → 첫 Promotion(canary→full) → Display passthrough. 이것을 끝내기 전 어떤 Coach 고도화도 착수하지 않는다. 이유: 갈라진 진실 위에 개인화를 쌓으면 부채가 복리로 늘어난다.

2. **다음으로 “루프”를 켜라 (3–7개월).** RC2 이벤트 척추 위에서 **RC3 Closed-loop(C4~C6)**를 이벤트 기반으로 구현한다. 여기서 비로소 “약점 진단 → 계획 → 학습 → 평가 → 전략 개정”이 제품 가치가 된다. AI는 아직 Mock으로 두고 **흐름과 안전(권위 경계)**을 먼저 검증한다.

3. **그 다음 “증거”를 보여줘라 (7–10개월).** RC4 그래프는 화려한 기능이 아니라 **학생에게 약점·경로를 시각적으로 설명**하는 신뢰 장치다. 단, 그래프는 projection이며 SoT가 아님을 규율로 지킨다.

4. **마지막에 “확장”을 증명하라 (10–12개월).** v1.0 회계학 GA로 KPI(정답 정합, 완주율, 재방문)를 확보한 뒤, v1.5에서 **Real AI Provider(Port 교체)**와 **2번째 Subject Template PoC**로 범용성을 실증한다. 여기서 처음으로 벤더 AI에 돈을 쓴다.

**하지 말아야 할 것:** (a) Promotion 없이 제품 DB를 손대는 임시방편, (b) Coach에 Question 본문 캐시, (c) 브라우저에서 Parser/Builder 실행, (d) AI로 기출 문항 표면 생성. 이 네 가지는 docs/35가 금지한 Truth Split 재발 경로이며, 12개월 내내 방어선으로 유지한다.

**한 줄 요약:** *“기능을 늘리기 전에 진실을 하나로 닫고, 그 위에서 학습 루프를 돌린 뒤, 증거(그래프)와 확장(멀티 과목)으로 신뢰를 산다.”*

---

## 부록 A — 진입 게이트 요약

| 단계 | 진입 조건 |
|------|-----------|
| RC2-E5 Promotion | G6=0 · Display Acceptance YES · TRUE_REGRESSION=0 · L1 Freeze |
| RC3 (C4) | RC2-E5 완료 · Event Backbone 완료 (RC1 권고: G6 미해소 시 C4 금지) |
| RC4 Graph | RC3 이벤트/projection 안정 |
| v1.0 GA | RC2~RC4 안정 · rollback 드릴 성공 |
| v1.5 Real AI | Provider Port·safety 계약 · grounding 테스트 |

## 부록 B — 불변 보장(전 로드맵)

- docs/31~35 미변경. Parser Core(S1–S9) 미수정. Promotion Ownership(D3=Promotion only) 미이동.
- Four Plane 권위·D0~D7 Owner 불변. LocalStorage 고정 키 rename 금지.
- 모든 D3/D4 쓰기·Unfreeze·AI 실연결은 Human Approval 필수.
