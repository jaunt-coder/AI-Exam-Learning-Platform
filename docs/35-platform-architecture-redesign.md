# AI Exam Learning Platform
# Platform Architecture Redesign — Single Truth Authority

Version 1.0 — 2026-07-20  
상태: **설계 문서 (구현·모듈 변경 없음)**  
작성 관점: Chief Software Architect  
문서 번호: **35** (문서 우선순위상 34·33·32·31·00을 보완·재정렬한다. Schema 키 변경은 본 문서 범위 밖이며 별도 승인 필요)

---

## 0. Mandate

본 문서는 기능을 추가하지 않는다.  
플랫폼의 **Truth Split**을 제거하기 위한 **전체 아키텍처 재설계**만을 정의한다.

### 0.1 금지

- 구현 코드, 의사코드, API 시그니처 초안
- 기존 Parser Core / Coach / Display 모듈 수정 지시의 실행
- QuestionBuilder를 런타임 서비스로 승격
- Coach·Display가 문항 본문을 소유·변조하는 설계

### 0.2 설계 목표 (불변 요구)

| # | 요구 | 의미 |
|---|------|------|
| 1 | ONE Source of Truth | 도메인별 권위(Authority)는 정확히 하나. 이중 기록·이중 수정 금지 |
| 2 | Parser Immutable | Parser Core는 오프라인 컴파일러. 런타임·Agent가 침투하지 않음 |
| 3 | Coach ≠ Question Owner | Coach는 `questionId` 참조만. 문항 텍스트·정답·표 미소유 |
| 4 | Display ≠ Mutator | Display는 Product Snapshot의 읽기 전용 투영 |
| 5 | QuestionBuilder ≠ Runtime | Builder는 Freeze IR의 read-only codegen. 배포·브라우저에 존재하지 않음 |
| 6 | Formal Promotion | Emit → Product는 배포 파이프라인. 자동 덮어쓰기 금지 |
| 7 | Browser Agent Runtime | Coach Agent는 GitHub Pages·ES Module·LocalStorage 제약 안에서만 동작 |
| 8 | Event-Driven Learning | Attempt / Weakness / StudyPlan / StrategyRevision은 이벤트 흐름으로만 진화 |

---

## 1. Diagnostic — Truth Split

### 1.1 현재 병리

플랫폼이 사실상 **네 개의 독립 진실**을 동시에 갖고 있다.

```
[A] Parser Emit     — IR 기준 문항 진실 (제품 경로와 단절)
[B] question-db-mvp — Display가 실제로 읽는 제품 DB
[C] Display Cleanup — 메모리상 제2의 Repair / Override
[D] Coach Stores    — 학습 상태·진단 (문항 데이터를 간접 복제할 위험)
```

이 네 축이 서로 쓰기 권한을 가지면:

- 동일 `questionId`에 대해 stem·choices·table·pattern이 갈라진다.
- Display가 Parser를 우회해 “보이는 진실”을 만든다.
- Coach가 약점 분석을 “잘못된 문항 표면” 위에서 수행한다.
- Promotion이 파일 복사가 아니라 정치적 선택이 된다.

### 1.2 아키텍처 판결

> **문제는 파이프라인 단계 부족이 아니라 Ownership 붕괴다.**

해결은 기능 추가가 아니라 **Authority Separation**이다.

---

## 2. Architectural Doctrine — Single Truth Authority Model

### 2.1 “ONE Source of Truth”의 정확한 정의

단일 파일이 전 플랫폼 SoT가 아니다.  
전 플랫폼은 **단일 Truth Authority Graph**를 가진다.

규칙:

1. 모든 엔티티는 **Owner가 정확히 하나**다.
2. Owner만이 Persist에 쓸 수 있다.
3. 다른 레이어는 **참조·투영·이벤트 파생**만 한다.
4. “편의상 복사 후 수정”은 아키텍처 위반이다.

### 2.2 Authority Domains (플랫폼 전체)

| Domain | Authority (SoT) | 성격 | 비-SoT 투영 |
|--------|-----------------|------|-------------|
| **D0 Document** | `source/original-exams/` | 문서 원본 | OCR 캐시, 추출 로그 |
| **D1 IR** | Freeze된 Layout/Token/AST (+ sidecar) | Parser 내부 진실 | Diff 리포트 |
| **D2 Emit** | Parser Emit JSON | 문항 표면의 생성 권위 | Stage 8 Diff shadow |
| **D3 Product Content** | Promotion으로 승인된 Product Question DB | 런타임이 읽는 문항 스냅샷 | Candidate, baseline |
| **D4 Pattern Master** | Pattern DB (승인된 마스터) | Pattern 분류 권위 | UI short label |
| **D5 Platform Meta** | Master DB | 시험·과목·챕터·메타 | Generated 목록 |
| **D6 Enrichment** | Enrichment / Tutor content 저장소 | 해설·학습 보강 (문항 표면 아님) | Tutor override |
| **D7 Learner State** | Coach Event Log (+ 파생 Projection) | 학생 학습 진실 | Dashboard 집계 |

### 2.3 문항 텍스트에 대한 단일 생성 권위

문항의 `question` / `choices` / `table` / `answer` / `hasTable` 에 대해:

```
D0 Document
  → (Parser Core만) → D1 IR
  → (QuestionBuilder, offline, read-only) → D2 Emit
  → (Promotion Pipeline만) → D3 Product Content
  → (Display read-only) → Student View
```

이 경로 밖에서의 문항 본문 수정은 **전부 불법**이다.

### 2.4 Constitution과의 정합

- `master-db.json`(D5)은 **플랫폼 메타**의 SoT로 유지한다.
- **기출 문항 표면 텍스트**의 생성 SoT는 D2 Emit이며, D3는 그 승인 스냅샷이다.
- Generated 파일 직접 수정 금지는 D3·Pattern·Statistics에 동일하게 적용한다.
- Schema 키 변경이 필요하면 본 문서가 아니라 Schema 승인 절차를 따른다.

---

## 3. System Topology — Four Planes

플랫폼을 네 개의 **Plane**으로 분리한다. Plane 간에는 계약된 인터페이스만 존재한다.

```
╔══════════════════════════════════════════════════════════════════╗
║  PLANE A — CONTENT COMPILER (Offline, Immutable Parser Core)     ║
║  PDF → Token → CellRecon → SemanticRepair → Validator            ║
║       → IRIntegrityGate → QuestionBuilder → Diff → Emit          ║
╚══════════════════════════════╤═══════════════════════════════════╝
                               │ Emit artifact only
                               ▼
╔══════════════════════════════════════════════════════════════════╗
║  PLANE B — PRODUCT PROMOTION (Deployment Pipeline)               ║
║  Gate → Candidate → Human Approval → Product Snapshot → Release  ║
╚══════════════════════════════╤═══════════════════════════════════╝
                               │ immutable snapshot (fetch)
                               ▼
╔══════════════════════════════════════════════════════════════════╗
║  PLANE C — PRODUCT RUNTIME (Browser, GitHub Pages)               ║
║  Display · Exam · Pattern Engine · Tutor View · Recommendation   ║
║  (Question data: READ ONLY)                                      ║
╚══════════════════════════════╤═══════════════════════════════════╝
                               │ domain events (learner actions)
                               ▼
╔══════════════════════════════════════════════════════════════════╗
║  PLANE D — AGENT RUNTIME (Browser Coach, Event-Driven)           ║
║  UserProfile · Attempts · Weakness · StudyPlan · StrategyRevision║
║  AI Provider (Mock → Real) — never owns Question body            ║
╚══════════════════════════════════════════════════════════════════╝
```

### 3.1 Plane 경계 법칙

| From → To | 허용 | 금지 |
|-----------|------|------|
| A → B | Emit·sidecar·Diff metrics 전달 | Product DB 직접 기록 |
| B → C | 승인된 Product Snapshot 배포 | 런타임에서 Promotion 실행 |
| C → D | `questionId`·채점 결과·학습 이벤트 발행 | 문항 JSON 전체 복사·변조 |
| D → C | StudyPlan·추천 의도(intent) 전달 | Parser/Builder 호출 |
| D → A | 없음 | Agent가 IR/Builder 구동 |
| C → A | 없음 | Display가 Parser를 우회 repair |

---

## 4. Plane A — Parser Core (Immutable Compiler)

### 4.1 지위

Parser Core는 **콘텐츠 컴파일러**다.  
제품 서버가 아니며, 브라우저에 실리지 않으며, Coach의 하위 모듈이 아니다.

### 4.2 파이프라인 (현행 유지, 역할만 고정)

```
PDF (D0)
 → Token
 → CellRecon
 → SemanticRepair
 → SemanticValidator
 → IRIntegrityGate   ← Freeze 경계
 → QuestionBuilder   ← read-only codegen (Emit + sidecar)
 → Diff              ← 검증만, mutate 없음
 → D2 Emit
```

### 4.3 Immutable 규칙

1. Freeze 이후 AST mutate 금지.
2. QuestionBuilder는 내용 수리 엔진이 아니다. 직렬화·인코딩·직교 조회만.
3. Diff는 gate 신호를 낼 뿐 Emit을 “고치지” 않는다.
4. Parser 실패의 교정 위치는 **앞 Stage 또는 Source**이지 Display·Coach가 아니다.
5. Parser는 Promotion을 모른다. Emit까지만 책임진다.

### 4.4 QuestionBuilder의 영구 위치

QuestionBuilder는 **Plane A 전용 빌드 도구**다.

| 질문 | 판결 |
|------|------|
| 런타임 서비스가 될 수 있는가? | **불가** |
| Coach가 호출하는가? | **불가** |
| Display가 호출하는가? | **불가** |
| Agent가 “문항 생성”을 위해 쓰는가? | **불가** — Agent는 D3에서 조회만 |
| 새 문항이 필요하면? | Source 추가 → Parser 재컴파일 → Promotion |

---

## 5. Plane B — Product Promotion Pipeline

### 5.1 목적

D2 Emit을 D3 Product Content로 **승격**하는 유일한 합법 경로.  
이것은 데이터 변환 스크립트가 아니라 **배포 게이트**다.

### 5.2 파이프라인 단계

```
[1] Emit Intake
    D2 Emit + sidecar + Diff metrics 수집
        ↓
[2] Integrity Gate
    스키마·개수·choices=5·answer 정합·patternId ∈ Pattern Master
        ↓
[3] Fidelity Gate
    Diff errorCount == 0, 숫자/표/정답 불변 검증
        ↓
[4] Display Acceptance Gate
    보정 없이 렌더 가능한 품질 기준 충족
        ↓
[5] Candidate Materialization
    미배포 Candidate Snapshot 생성 (제품 경로 미연결)
        ↓
[6] Human Approval
    승인 토큰/기록 없이는 Apply 불가
        ↓
[7] Atomic Promote
    baseline 백업 → Product Snapshot 원자 교체 → manifest(checksum, git sha)
        ↓
[8] Release
    Git commit → GitHub Pages 배포
        ↓
[9] Rollback Readiness
    직전 baseline으로 즉시 복구 가능 상태 유지
```

### 5.3 Promotion 불변식

1. **자동 cron/CI가 Product를 덮어쓰지 않는다.**
2. Parser 실행 직후 Product가 바뀌지 않는다.
3. Canary(부분 ID) → Full 승격 순서만 허용한다.
4. answer drift 1건이면 Promote 실패 또는 긴급 Rollback.
5. `questionId` 재부여 금지 (Learner State 호환).

### 5.4 Promotion이 소유하는 것 / 소유하지 않는 것

| 소유 | 비소유 |
|------|--------|
| Candidate, baseline, approval, manifest | IR AST |
| Product Snapshot 교체 권한 | Coach 이벤트 |
| Gate 판정 기록 | Display cleanup 로직 |

### 5.5 Product Snapshot의 의미

`question-db-mvp.json`(또는 후속 동일 역할 파일)은:

- **런타임 SoT 파일**이되
- **생성 SoT가 아니다.**

생성 권위는 항상 D2 Emit에 있다.  
Product는 “승인된 배포 스냅샷”이다.

---

## 6. Plane C — Product Runtime Architecture

### 6.1 구성

브라우저에서 동작하는 학습 제품 표면:

- Data Loader (fetch + schema validate)
- Display / Shared Renderer
- Exam Engine
- Pattern Engine
- Tutor View (Enrichment 소비)
- Recommendation (Learner 신호 + Pattern/Question 참조)
- Analytics (이벤트 집계 소비)

### 6.2 Question Data 계약

```
Release (D3 Product Snapshot)
    → fetch (read-only)
    → validate schema
    → render
    → Student
```

Display 규칙:

1. 문항 본문·보기·표·정답 키를 **치환·정규식 수리·문항별 override로 덮어쓰지 않는다** (목표 상태).
2. 허용되는 것은 View-only다: CSS, 마커 표시, aria, 레이아웃.
3. 품질 결함은 Display가 고치지 않고 **Plane A 결함 → Plane B 재승격**으로 해결한다.
4. Enrichment(해설) 공백은 문항 SoT 실패가 아니다. D6에서 별도 관리한다.

### 6.3 Runtime이 절대 하지 않는 일

- Parser Stage 호출
- QuestionBuilder 실행
- Product JSON 파일 기록
- Coach 저장소에 문항 전문 복제
- “임시로 맞는 텍스트”를 LocalStorage에 캐시 후 권위화

### 6.4 기존 LocalStorage 키 보호

Constitution 고정 키는 유지한다:

`progress`, `wrongAnswers`, `bookmarks`, `recentStudy`, `theme`, `settings`, `examHistory`

이들은 **레거시 Learner Projection**으로 취급한다.  
장기적으로 Plane D Event Log에서 파생 가능하나, 키 이름 변경은 금지다.

---

## 7. Plane D — Agent Runtime (Browser-Compatible Coach)

### 7.1 설계 원칙

Coach는 **학습 전략 Agent Layer**다.  
문항 공장도, Parser 클라이언트도, 두 번째 Question DB도 아니다.

브라우저 호환 제약:

| 제약 | 설계 반영 |
|------|-----------|
| GitHub Pages / static hosting | 서버 없는 이벤트 처리 |
| ES Modules only | Agent를 모듈 그래프로 구성 |
| LocalStorage | Event Log + Projection 영속 |
| No Node runtime in browser | Parser/Builder 비탑재 |
| Mock → Real AI | Provider 인터페이스 뒤 교체 |

### 7.2 Agent Runtime 구성 요소

```
┌─────────────────────────────────────────────────────────┐
│                 Agent Runtime Kernel                    │
│  Event Bus · Event Log Store · Projection Store         │
│  Clock · Idempotency · Schema Validate                  │
└───────────────┬─────────────────────┬───────────────────┘
                │                     │
        ┌───────▼────────┐    ┌───────▼────────┐
        │ Domain Agents  │    │ AI Provider    │
        │ Profile        │    │ Mock / Future  │
        │ Diagnosis      │    │ Real LLM       │
        │ Planner        │    └────────────────┘
        │ Evaluation     │
        │ Strategy Rev.  │
        └────────────────┘
```

### 7.3 Agent가 Question을 다루는 방식

- 입력: `questionId`, (선택) `patternId`, 채점 결과, 풀이 시간
- 조회: Plane C가 이미 로드한 Product Snapshot **참조** (복사본을 Coach SoT로 승격 금지)
- 출력: Attempt 이벤트, Weakness Projection, StudyPlan, StrategyRevision
- 금지: stem/choices/table/answer 저장·생성·수정

### 7.4 docs/33의 “Question Builder Agent” 재해석

구 스펙의 “Question Builder Agent → IR Pipeline”은 **본 재설계에서 폐기**한다.

대체 모델:

```
Planner / Evaluation Agent
  → Selection Intent (pattern, difficulty, count, excludeIds)
  → Product Question Catalog (D3) 조회
  → Session Queue 구성
```

IR Pipeline 호출권은 Plane A에만 있다.

---

## 8. Event-Driven Learning Architecture

### 8.1 왜 이벤트인가

UserProfile / WeaknessReport / StudyPlan을 “현재 상태 문서”로만 두면:

- 갱신 주체가 불명확해지고
- AI 출력이 상태를 직접 overwrite하며
- Attempt와 진단·계획이 시간축에서 어긋난다.

따라서 **사실(Fact)은 이벤트**, **현재 모습은 Projection**으로 분리한다.

### 8.2 이벤트 종류 (논리 모델)

| Event Type | 의미 | 발생 주체 |
|------------|------|-----------|
| `ProfileUpserted` | 목표·시험일·선호 갱신 | Student / Profile Agent |
| `QuestionAttempted` | 한 문항 풀이 사실 | Exam/Practice UI |
| `AttemptClassified` | 오류유형 등 부가 분류 | Evaluation / Diagnosis |
| `WeaknessDiagnosed` | 약점 진단 산출 | Weakness Agent |
| `StudyPlanProposed` | 계획 제안 | Planner Agent |
| `StudyPlanAccepted` | 학생 수락·활성화 | Student |
| `StudyPlanSuperseded` | 계획 대체 | Strategy Revision |
| `StrategyRevised` | 전략 개정 결정 | Strategy Revision Agent |
| `SessionCompleted` | 학습 세션 종료 | Runtime |
| `EnrichmentConsumed` | Tutor/해설 사용 | Tutor View |

레거시 `learningEvents`는 동일 Event Log의 **호환 Projection**으로 정렬한다 (키 이름 유지).

### 8.3 Runtime Event Flow (핵심)

```
Student Action (풀이·목표설정·계획수락)
        │
        ▼
Plane C UI Adapter
  - Product Snapshot에서 채점 (answer는 D3 권위)
  - questionId / correct / time / source 추출
        │
        ▼
Event Bus (in-browser)
        │
        ├─► Append-only Event Log  (D7 SoT의 원장)
        │
        ├─► Projection Updaters
        │     · Attempt Index
        │     · Weakness Reports
        │     · Active StudyPlan
        │     · UserProfile aggregates
        │     · StrategyRevision timeline
        │
        └─► Agent Triggers (구독)
              Diagnosis Agent  ← QuestionAttempted*
              Planner Agent    ← WeaknessDiagnosed / ProfileUpserted / StrategyRevised
              Evaluation Agent ← SessionCompleted
              Strategy Agent   ← Evaluation 결과 + 시험일 근접
                    │
                    ▼
              (필요 시) AI Provider.complete
                    │
                    ▼
              새 도메인 이벤트만 발행
              (Question body 절대 발행·저장 금지)
```

### 8.4 이벤트 흐름의 순환 (합격 전략 루프)

```
Goal / Profile
   → Plan
      → Practice Session (D3 문항 소비)
         → QuestionAttempted (다수)
            → WeaknessDiagnosed
               → StudyPlanProposed / Accepted
                  → Evaluation
                     → StrategyRevised
                        ↺ (Profile aggregates 갱신 후 재진입)
```

이 루프는 **Plane D 내부**에서만 돈다.  
Plane A를 호출하지 않는다.

### 8.5 이벤트 불변식

1. Event Log는 append-only (정정은 compensating event).
2. Projection은 언제든 Event Log로 재구축 가능해야 한다.
3. AI 응답은 이벤트로만 반영된다. Projection을 AI가 직접 덮어쓰지 않는다.
4. 동일 `attemptId` / `eventId`에 대해 멱등 처리한다.
5. Coach Persistence에 Question 전문 필드를 넣지 않는다.

---

## 9. Entity Ownership Matrix

각 엔티티에 대해 Owner / Producer / Consumer / Lifecycle / Persistence를 고정한다.

### 9.1 Content Plane Entities

#### E1. Source Document (PDF/HWP)

| 항목 | 정의 |
|------|------|
| Owner | Content Governance (인간 + Source 디렉터리 정책) |
| Producer | 시험 원본 입고 |
| Consumer | Parser Core only |
| Lifecycle | Immutable once published; 교체는 새 버전 입고 |
| Persistence | `source/original-exams/` (D0) |

#### E2. IR (Token / Cell / AST / Sidecar)

| 항목 | 정의 |
|------|------|
| Owner | Parser Core |
| Producer | Parser Stages (Freeze 전·후 규칙 준수) |
| Consumer | QuestionBuilder, Diff, 감사 도구 |
| Lifecycle | Build-scoped; Freeze 후 불변 |
| Persistence | regression AST/sidecar (D1) — 제품 런타임 비탑재 |

#### E3. Parser Emit (Question Surface Authority)

| 항목 | 정의 |
|------|------|
| Owner | Parser Core (생성) / Emit Contract |
| Producer | QuestionBuilder (offline) |
| Consumer | Promotion Pipeline, Diff/회귀 |
| Lifecycle | Parser 재실행으로만 갱신 |
| Persistence | parser-emit JSON (D2) |

#### E4. Promotion Candidate

| 항목 | 정의 |
|------|------|
| Owner | Promotion Pipeline |
| Producer | Gate 통과 후 materializer |
| Consumer | Approver, Promote apply |
| Lifecycle | 임시; 승인·폐기·만료 |
| Persistence | `data/promotion/candidate-*` (미배포) |

#### E5. Product Question Snapshot

| 항목 | 정의 |
|------|------|
| Owner | Promotion Pipeline (배포 권위) |
| Producer | Atomic Promote only |
| Consumer | Plane C 전체 (Display, Exam, Reco, Tutor 조회) |
| Lifecycle | Release 단위 버전; Rollback으로 이전 baseline 복귀 |
| Persistence | Product Question DB 파일 (D3) — Git으로 배포 |

#### E6. Pattern Master

| 항목 | 정의 |
|------|------|
| Owner | Pattern Governance / Pattern DB 관리자 |
| Producer | Pattern 분석·승인 파이프라인 |
| Consumer | Parser 직교 classifier, Runtime, Coach(참조), Promotion Gate |
| Lifecycle | 버전드 마스터; 문항 텍스트와 독립 |
| Persistence | Pattern DB (D4) |

#### E7. Platform Meta (Master DB)

| 항목 | 정의 |
|------|------|
| Owner | Platform Architecture / Master DB 관리자 |
| Producer | 메타 편집(승인된 경로) |
| Consumer | Generator, 네비게이션, Subject Template 결합 |
| Lifecycle | Master 수정 → Generated 재생성 |
| Persistence | Master DB (D5) |

#### E8. Learning Enrichment

| 항목 | 정의 |
|------|------|
| Owner | Enrichment / Tutor Content Authority |
| Producer | 해설 작성·Tutor content 파이프라인 |
| Consumer | Tutor View, (선택) Recommendation 설명 |
| Lifecycle | 문항 표면과 독립 버전; Emit 공백 허용 |
| Persistence | Enrichment store / tutor content (D6) |

---

### 9.2 Learner / Coach Entities

#### E9. UserProfile

| 항목 | 정의 |
|------|------|
| Owner | Plane D Profile Projection (권위는 Event Log) |
| Producer | `ProfileUpserted` 및 aggregate 이벤트 |
| Consumer | Planner, Strategy, Dashboard, Recommendation |
| Lifecycle | 학생 생애주기; 시험 사이클마다 개정 가능 |
| Persistence | LocalStorage projection + Event Log (D7) |

> UserProfile은 “현재 요약”이다. 원장은 이벤트다.  
> `weakPatterns` 같은 필드는 Weakness Projection에서 파생된 캐시이며, 별도 SoT가 아니다.

#### E10. QuestionAttempt

| 항목 | 정의 |
|------|------|
| Owner | Plane D Event Log |
| Producer | Plane C UI Adapter (`QuestionAttempted`) |
| Consumer | Diagnosis, Evaluation, Analytics, legacy wrongAnswers sync |
| Lifecycle | Append-only fact; 삭제 대신 무효화 이벤트 |
| Persistence | `questionAttempts` / Event Log (기존 키 호환 유지) |

필수 참조: `questionId`, `patternId`(가능 시), `answer`(학생 선택), `correct`, `solvingTime`, `source`  
금지: question stem, choices, table markdown

#### E11. Weakness (WeaknessReport)

| 항목 | 정의 |
|------|------|
| Owner | Diagnosis Projection |
| Producer | Weakness Agent (`WeaknessDiagnosed`) |
| Consumer | Planner, Strategy, Dashboard |
| Lifecycle | 재진단으로 supersede; evidenceAttemptIds로 추적 |
| Persistence | `weaknessReports` projection (D7) |

Weakness는 문항을 소유하지 않는다.  
소유하는 것은 **pattern/concept/errorType에 대한 진단 판단**과 evidence 링크다.

#### E12. StudyPlan

| 항목 | 정의 |
|------|------|
| Owner | Planner Projection (활성 계획은 하나) |
| Producer | Planner Agent (`StudyPlanProposed` → `StudyPlanAccepted`) |
| Consumer | Session Builder, Dashboard, Strategy Agent |
| Lifecycle | proposed → active → completed/superseded |
| Persistence | StudyPlan store / Event Log (D7) |

StudyPlan은 “어떤 Product 문항을 풀지”에 대한 **의도**를 담는다.  
문항 본문을 내장하지 않고 `questionId` 또는 selection criteria만 가진다.

#### E13. StrategyRevision

| 항목 | 정의 |
|------|------|
| Owner | Strategy Projection |
| Producer | Strategy Revision Agent (`StrategyRevised`) |
| Consumer | Planner (재계획 트리거), Profile aggregates, Dashboard |
| Lifecycle | 시간순 revision chain; 최신이 active strategy |
| Persistence | Strategy revision log (D7) |

StrategyRevision은 Weakness·StudyPlan·평가 결과를 입력으로 하는 **메타 결정**이다.  
AI Provider 출력을 직접 상태 문서로 쓰지 않고, 반드시 이벤트로 남긴다.

#### E14. AI Provider Exchange (논리적 엔티티)

| 항목 | 정의 |
|------|------|
| Owner | Agent Runtime (호출 정책) |
| Producer | Domain Agent → Provider |
| Consumer | 호출한 Agent만 (응답을 이벤트로 재발행) |
| Lifecycle | request/response ephemeral (+ 선택적 audit log) |
| Persistence | 기본 비영속; 감사 필요 시 anonymized prompt meta만 |

Provider는 Question DB가 아니며, 응답으로 문항 표면을 생성·수정할 권한이 없다.

#### E15. Legacy Learning Projections

| 엔티티 | Owner | Producer | Consumer | Lifecycle | Persistence |
|--------|-------|----------|----------|-----------|-------------|
| `progress` | Compatibility Projection | Attempt/Session 이벤트 동기화 | Dashboard, Reco | 누적 | LocalStorage (키 고정) |
| `wrongAnswers` | Compatibility Projection | incorrect Attempt | Wrong note UI | 누적/정리 | LocalStorage |
| `bookmarks` | Student | UI | Reco/UI | 사용자 관리 | LocalStorage |
| `recentStudy` | Compatibility Projection | Session/learning events | Home/Reco | 최근 N | LocalStorage |
| `examHistory` | Exam Engine Projection | Mock exam completion | Analytics | 시험 단위 | LocalStorage |
| `learningEvents` | Compatibility Event View | UI adapters | Analytics timeline | append | LocalStorage |
| `theme` / `settings` | Student preferences | Settings UI | App shell | 설정 생애 | LocalStorage |

이들은 D3 Question SoT가 아니다.  
장기적으로 D7 Event Log의 파생으로 수렴하되, **키 rename 금지**.

---

## 10. Ownership Summary Map

```
Document(D0) ──owns──► IR(D1) ──owns──► Emit(D2)
                              │
                     Promotion owns Candidate
                              │
                     Promotion owns Product(D3)
                              │
              ┌───────────────┼────────────────┐
              ▼               ▼                ▼
           Display         Exam/Reco        Tutor(Enrichment D6)
           (read)          (read D3)        (read D3 + D6)
              │
              │ emits learner facts
              ▼
        Event Log (D7) owns Attempts / Strategy facts
              │
              ├──derives──► UserProfile projection
              ├──derives──► Weakness projection
              ├──derives──► StudyPlan projection
              └──derives──► StrategyRevision projection
```

**한 줄 원칙:**  
Content는 위에서 아래로만 흐르고, Learner Truth는 이벤트 원장에서만 자라며, 둘은 `questionId`로만 만난다.

---

## 11. Product Promotion Pipeline (정식 정의)

### 11.1 파이프라인 정체성

| 항목 | 정의 |
|------|------|
| 유형 | Content Deployment Pipeline |
| 입력 | D2 Emit + Diff metrics + Pattern Master |
| 출력 | D3 Product Snapshot + Manifest |
| 실행 환경 | Offline / CI-assist + Human Approval |
| 런타임 노출 | 없음 (브라우저에 Promotion 엔진 없음) |

### 11.2 승격 상태기계

```
EMIT_READY
  → GATED (integrity/fidelity/display gates)
    → CANDIDATE
      → APPROVED
        → PROMOTED (product replaced)
          → RELEASED
            → (optional) ROLLED_BACK
```

실패 시 상태는 항상 직전 안전 상태로 남는다.  
`PROMOTED` 이전에는 Student Runtime이 변화를 보지 못한다.

### 11.3 Canary / Full

| Mode | 의미 |
|------|------|
| Canary | 승인된 `questionId` 집합만 Product에 merge |
| Full | Emit 기준 전량 교체 |
| Partial Rollback | 문제 ID만 baseline 값으로 복귀 |

### 11.4 Promotion과 Truth Split의 종식 조건

Truth Split 종식으로 인정하려면 동시에:

1. D3가 D2의 승인 복사본임이 manifest로 증명되고
2. Display가 D3를 무보정 렌더하며
3. Coach가 D3 본문을 저장하지 않고
4. Emit과 Product를 잇는 경로가 Promotion 외에 존재하지 않아야 한다.

상세 Gate 체크리스트·Phase T0–T6는 `docs/34-truth-split-migration-plan.md`가 실행 계획으로 종속된다.  
본 문서(35)는 **영구 아키텍처 권위**이고, 34는 **이행 계획**이다.

---

## 12. Runtime Architecture (Browser)

### 12.1 논리 레이어

```
┌──────────────────────────────────────────┐
│ Presentation  (HTML pages / UI)          │
├──────────────────────────────────────────┤
│ Application   (Exam, Tutor, Dashboard)   │
├──────────────────────────────────────────┤
│ Read Models   (Product Snapshot cache,   │
│                Pattern index, Enrichment)│
├──────────────────────────────────────────┤
│ Agent Runtime (Event Bus + Agents)       │
├──────────────────────────────────────────┤
│ Persistence   (LocalStorage namespaces)  │
└──────────────────────────────────────────┘
         ▲
         │ static fetch
   Product/Pattern/Enrichment JSON (GitHub Pages)
```

### 12.2 데이터 로드 규칙

1. Product/Pattern/Enrichment는 **부팅 시 fetch**되는 read model이다.
2. Learner State는 **로컬 Event Log / Projection**이다.
3. 두 세계를 merge할 때 Question 필드를 Learner store로 끌어내리지 않는다.
4. Offline 학습은 이미 fetch된 read model + 로컬 이벤트로만 성립한다.

### 12.3 채점 권위

- 정답 키의 권위: **D3 Product Snapshot**
- 학생이 고른 값의 권위: **QuestionAttempt 이벤트**
- Coach/AI는 채점 결과를 뒤집을 수 없다. 해석만 한다.

### 12.4 Session Construction

StudyPlan이 “오늘 풀 문항”을 정할 때:

1. Planner가 selection criteria 또는 id list를 낸다.
2. Application Layer가 D3 catalog에서 해석한다.
3. 세션 중 발생한 Attempt만 Event Bus로 흘린다.

이 과정에 Builder/Parser는 없다.

---

## 13. Future AI Integration Architecture

### 13.1 위치

AI는 Plane D의 **능력(Capability)** 이지, Content Compiler가 아니다.

```
Domain Agent
  → Prompt Assembly (profile, weakness, plan, attempt summaries)
  → AI Provider Port
  → Structured Advice
  → Domain Event (StudyPlanProposed / StrategyRevised / …)
```

### 13.2 Provider Port

| 세대 | 구현 | 역할 |
|------|------|------|
| Now | Mock AI Provider | 계약·UX·이벤트 흐름 검증 |
| Next | Remote LLM via browser-safe adapter | 동일 Port 교체 |
| Later | Optional edge/proxy (별도 승인) | 키 보호·쿼터 — Pages 순수성 검토 필수 |

Agent 코드는 벤더 SDK에 직접 결합하지 않고 Provider Port만 의존한다.

### 13.3 AI가 할 수 있는 일 / 없는 일

| 허용 | 금지 |
|------|------|
| 약점 설명 문구 제안 | 문항 stem/choices/table 생성·수정 |
| StudyPlan 우선순위 제안 | Product DB 기록 |
| 오류유형 가설 | IR/Parser 우회 |
| 동기부여·전략 문장 | answer 변조 |
| Enrichment 초안 (D6 승인 파이프라인으로만 전환) | Display override 생성 |

### 13.4 AI와 Enrichment의 분리

- **실시간 Coach 조언**: 이벤트·Projection에만 영향 (D7)
- **영구 해설 자산**: D6 Enrichment Authority의 승인 후에만 Product 학습 경험에 편입
- AI 출력을 곧바로 D3에 합치는 경로는 존재하지 않는다.

### 13.5 AI Safety for Exam Content

1. Grounding: 조언은 `questionId` / `patternId` / Attempt evidence에 묶는다.
2. Non-authoritative: AI 텍스트는 SoT가 아니다.
3. Deterministic core: 채점·Promotion·Parser는 AI-free.
4. Auditability: StrategyRevision·Plan 제안은 이벤트 id로 추적한다.

### 13.6 장기 Agent Loop (재정의)

```
Student Goal
  → Profile Agent
  → Weakness Diagnosis Agent
  → Learning Planner Agent
  → Session Selector (D3 catalog)     ※ 구 Question Builder Agent 대체
  → Evaluation Agent
  → Strategy Revision Agent
  ↺
```

IR IntegrityGate는 **콘텐츠 컴파일 타임**에만 존재한다.  
학습 루프의 품질 게이트는 “잘못된 문항을 풀에 넣지 않음”이 아니라 **승인된 D3만 소비함**으로 달성한다.

---

## 14. Cross-Cutting Rules

### 14.1 Subject Independence

Core Engine / Agent Runtime은 과목을 모른다.  
과목 전문성은 Subject Template + Pattern/Enrichment에 둔다.

### 14.2 Pattern First

학습 추천·약점·계획의 기본 단위는 Pattern이다.  
문항은 Pattern을 연습하는 인스턴스다.

### 14.3 No Placeholders in Architecture

아키텍처상 “나중에 고칠 Display override”를 정상 경로로 남기지 않는다.  
이행 기간의 legacy cleaner는 `docs/34`의 폐기 대상 부채로만 인정한다.

### 14.4 Schema Discipline

본 재설계는 Ownership·흐름·Plane을 바꾼다.  
JSON Schema 파괴적 변경은 별도 승인 없이는 하지 않는다.

---

## 15. What This Redesign Explicitly Rejects

1. Emit과 Product의 이중 수동 편집
2. Display를 Repair Layer로 유지
3. Coach LocalStorage에 Question 본문 캐시
4. Browser에서 QuestionBuilder/Parser 실행
5. AI가 기출 문항 표면을 생성하여 학습 풀에 투입
6. Promotion 없는 “임시 제품 DB 스위치”
7. UserProfile이 Weakness·Plan·Attempt의 상위 만능 SoT가 되는 구조
8. docs/33의 Agent→IR Pipeline 직접 호출 모델

---

## 16. Conformity With Existing Specs

| 문서 | 본 재설계와의 관계 |
|------|-------------------|
| `00` Constitution | Pattern First·Subject Independence·LocalStorage 키 유지. 문항 표면 SoT는 Authority Graph로 정밀화 |
| `01` Architecture | Master/Learning Engine 중심도를 Four Planes로 재배치 |
| `31` Parser Architecture | Plane A로 흡수. Immutable Compiler 지위 고정 |
| `32` Emit Contract | D2 계약 유지. Builder 런타임화 금지 재확인 |
| `33` Coach Spec | Plane D로 흡수. Builder Agent→IR 호출은 Selection으로 대체 |
| `34` Truth Split Migration | Plane B 이행 계획. 35의 하위 실행 문서 |
| `18` AI Tutor | Enrichment/조언은 D6·D7. 문항 SoT 아님 |

충돌 시: **본 문서(35)가 Ownership·Plane·이벤트 권위에서 우선**한다.  
Schema·LocalStorage 키·Parser Core 불변 원칙은 기존 승인과 같다.

---

## 17. Acceptance Criteria (Architecture-Level)

아키텍처가 수용된 것으로 보려면 설계 합의만으로 다음이 참이어야 한다.

1. 문항 본문의 쓰기 경로가 **Parser → Emit → Promotion → Product** 외에 없음이 문서상 증명된다.
2. QuestionBuilder가 Runtime/Agent 구성도에 나타나지 않는다.
3. Coach 엔티티 정의에 Question body 필드가 없다.
4. Display 목표 상태가 passthrough render이다.
5. Attempt→Weakness→Plan→Strategy 순환이 이벤트 원장 기준으로 설명된다.
6. AI는 Provider Port 뒤의 조언자이며 Content Authority가 아니다.
7. 이행은 `docs/34` Phase로만 Product를 건드린다.

---

## 18. Out of Scope (본 문서)

- 코드 구현, 스크립트 작성, 모듈 리팩터
- Schema 필드 추가/삭제 승인
- Parser Stage 알고리즘 변경
- LLM 벤더·요금·프롬프트 상세
- UI 와이어프레임

---

## 19. Architect’s Closing Statement

이 플랫폼의 장기 생존 조건은 기능 밀도이 아니라 **권위의 단일성**이다.

- Parser는 과거 시험을 **컴파일**한다.
- Promotion은 컴파일 결과를 **배포**한다.
- Runtime은 배포본을 **소비**한다.
- Coach는 학생의 행동을 **사건으로 기록하고 전략을 개정**한다.

네 역할이 섞이는 순간 Truth Split이 재발한다.  
네 역할이 지키는 한, AI를 붙여도 기출 진실은 흔들리지 않는다.

---

## 20. Approval Checklist

- [ ] Four Planes (Compiler / Promotion / Product Runtime / Agent Runtime) 승인
- [ ] Authority Domains D0–D7 승인
- [ ] Entity Ownership Matrix (E1–E15) 승인
- [ ] Event-driven Coach flow 승인
- [ ] QuestionBuilder 런타임 영구 배제 승인
- [ ] Future AI = Provider behind Agents 승인
- [ ] docs/34를 Plane B 이행 문서로 종속 승인

승인 전: 제품 DB 자동 전환 금지 (`docs/32` / `docs/34`와 동일).  
승인 후: 구현은 Phase 단위로만, 본 문서 Ownership을 깨지 않는 범위에서 진행한다.
