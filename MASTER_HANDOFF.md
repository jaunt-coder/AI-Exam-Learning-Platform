# MASTER HANDOFF — AI Exam Learning Platform

Project Constitution & Permanent Onboarding Document  
Version 1.0 — 2026-07-21  
Status: **RC1 · Beta Candidate · Validation Phase · P0=Internal Pilot IP-001 · Knowledge Extraction ON · Exam Mode ON · AI Exam OS v1.0 · ADR-001 Option A SIGNED · ADR-004 L1 · PROMOTION_READY=NO · D4 Persist=0**

> 이 문서는 **모든 미래 AI/개발자의 단일 진입점**이다.  
> RC1 이후 합류하는 주체는 과거 대화 수십 건을 읽지 않고 **이 문서만** 읽어도 프로젝트 전체를 이해할 수 있어야 한다.
>
> **이 문서의 성격:** Index + Project Memory.  
> 설계를 재정의하지 않는다. 구현 과제를 만들지 않는다. 문서를 다시 쓰지 않는다.  
> 이미 docs에 있는 내용은 **복제하지 않고 참조**한다.
>
> **불변 원칙:** docs/35가 Architecture Constitution (System Safety)이다. Parser Core·Promotion Ownership·Four Plane 권위는 변경 금지.  
> **Exam Mode + OS:** docs/37 · docs/37 §9. 충돌 시 docs/35 승.  
> **Program Stage (2026-07-24):** **Beta Candidate** (≠ Beta Release). **Validation Driven Development** — Evidence First. Decision: `docs/program-decision-beta-candidate.md`.  
> **실행 중심:** Internal Pilot IP-001 (20–30문항 · Evidence Pad · 07 Report). Recommendation / AI Coach / Mastery Execution = **HOLD until Beta Exit Criteria**.

---

## 목차

1. Project Vision
2. Architecture Overview (Four Planes)
3. Parser Core
4. Promotion System
5. Coach Architecture
6. Current RC1 Status
7. ADR Summary
8. Repository Map
9. Development Principles
10. AI Role Assignment
11. Current Roadmap
12. Known Risks
13. Project Assets
14. Onboarding Guide
15. Current State Snapshot
16. Memory Log (Completed / Decision / Changed Files / Impact / Next)

---

# 1. Project Vision

## 왜 이 플랫폼이 존재하는가

이 프로젝트는 **특정 과목 문제집이 아니라 범용 AI 시험 학습 플랫폼**이다. 기출 데이터를 단순 저장하지 않고 **분석**하여 출제 패턴을 발견하고, 학습자의 약점을 진단하며, 개인별 최적 학습 경로를 제공한다.

첫 번째 Subject Template은 **감정평가사 회계학**이지만, Core Engine은 과목을 알지 못한다(Subject Independence). 전문성은 Subject Template과 Pattern/Enrichment에서 관리한다.

참조: `docs/00-platform-constitution.md`, `docs/01-architecture-spec.md`

## 일반 에듀테크와의 차이

| 일반 에듀테크 | 본 플랫폼 |
|---------------|-----------|
| 문제 중심(문제 나열·해설) | **Pattern 중심** (기출→영역→패턴→지식→문제→전략) |
| 콘텐츠를 손으로 편집·복제 | **Single Truth Authority** — 문항 표면은 Parser가 컴파일한 진실에서만 생성 |
| 화면에서 임시 보정 | **Display는 read-only 투영** (보정 금지 목표) |
| 통계 대시보드 | **Closed-loop Coach** (진단→계획→학습→평가→전략 개정) |
| AI가 문제 생성 | **AI는 조언자** — 기출 문항 표면을 생성·수정하지 않음 |

## 장기 제품 비전

기출의 **진실을 한 번 컴파일**해 두고(Parser Core), 그 위에서 **학생 행동을 사건으로 기록**하며(Coach Event Log), **약점·경로를 그래프로 설명**하고(RC4), **여러 과목·시험으로 확장**한다(v1.5→v2.0). 최종 목표는 “범용 시험 학습 플랫폼”이다.

## 한 페이지 요약

> **“진실은 하나(Parser Emit → 승인된 Product), 학습은 사건(append-only events), AI는 조언자.”**
> 이 세 문장이 어긋나면 프로젝트가 앓던 **Truth Split**이 재발한다. 모든 미래 작업은 이 셋을 방어선으로 삼는다.

---

# 2. Architecture Overview — Four Plane Architecture

> **정식 정의는 `docs/35-platform-architecture-redesign.md`.** 아래는 요약이며, 충돌 시 docs/35가 우선한다.

플랫폼은 네 개의 Plane으로 분리되며, Plane 간에는 계약된 인터페이스만 존재한다.

```
PLANE A — CONTENT COMPILER (Offline, Immutable Parser Core)
   PDF → Token → CellRecon → SemanticRepair → SemanticValidator
        → IRIntegrityGate → QuestionBuilder → Diff → Emit
                     │ Emit artifact only
                     ▼
PLANE B — PRODUCT PROMOTION (Deployment Pipeline)
   Gate → Candidate → Human Approval → Product Snapshot → Release
                     │ immutable snapshot (fetch)
                     ▼
PLANE C — PRODUCT RUNTIME (Browser, GitHub Pages)
   Display · Exam · Pattern Engine · Tutor View · Recommendation  (Question data: READ ONLY)
                     │ domain events (learner actions)
                     ▼
PLANE D — AGENT RUNTIME (Browser Coach, Event-Driven)
   UserProfile · Attempts · Weakness · StudyPlan · StrategyRevision  (never owns Question body)
```

## Ownership Table (Authority Domains D0–D7)

| Domain | Authority (SoT) | Owner | 비-SoT 투영 |
|--------|-----------------|-------|-------------|
| D0 Document | `source/original-exams/` | Content Governance | OCR 캐시 |
| D1 IR | Freeze된 Layout/Token/AST + sidecar | Parser Core | Diff 리포트 |
| D2 Emit | Parser Emit JSON | Parser Core (생성) | Diff shadow |
| D3 Product Content | 승인된 Product Question DB | **Promotion Pipeline only** | Candidate, baseline |
| D4 Pattern Master | Pattern DB | Pattern Governance (Human) | UI short label |
| D5 Platform Meta | Master DB | Platform Architecture | Generated 파일 |
| D6 Enrichment | 해설/Tutor content | Enrichment Authority | Tutor override |
| D7 Learner State | Coach Event Log + Projection | Plane D | Dashboard 집계 |

## Data Flow (문항 텍스트의 단일 생성 권위)

```
D0 Document → (Parser Core만) → D1 IR → (QuestionBuilder, offline, read-only) → D2 Emit
           → (Promotion Pipeline만) → D3 Product → (Display read-only) → Student View
```

이 경로 밖에서의 문항 본문 수정은 전부 불법이다.

## Authority Graph (한 줄 원칙)

> Content는 위에서 아래로만 흐르고(D0→D3), Learner Truth는 이벤트 원장(D7)에서만 자라며, 둘은 **`questionId`로만** 만난다.

상세: docs/35 §2(Authority Domains), §3(Four Planes), §9(Entity Ownership Matrix), §10(Ownership Map).

---

# 3. Parser Core (Plane A)

> **정식 정의: `docs/31-parser-architecture-design.md`(설계), `docs/32-parser-emit-contract.md`(Emit 계약).**  
> Parser Core는 **오프라인 콘텐츠 컴파일러**다. 브라우저에 실리지 않고, Coach의 하위 모듈이 아니며, Promotion을 알지 못한다(Emit까지만 책임).

## Stage 1~9 (컴파일러 관점)

| Stage | 역할 | 컴파일러 대응 |
|-------|------|---------------|
| S1 DocumentLoader | 원본 로드, OCR 판별 | Source |
| S2 TextExtractor | 좌표 보존 LayoutDocument | — |
| S3 Tokenizer | typed **불변 Token**(NUMBER/CURRENCY/PERCENT/YEAR/DATE) | Lexer |
| S4 Question / S5 Choice / S6 Table (CellRecon 포함) | 구조 트리 | Parser/AST |
| SemanticRepair | 의미 보존, 형태만 정리 | Semantic 분석 |
| SemanticValidator | 진단·품질 | Type checker |
| IRIntegrityGate (≈6.9) | **Freeze 경계** | Diagnostics gate |
| QuestionBuilder (7) | read-only codegen(Emit + sidecar) | Code generation |
| DiffEngine (8) | Source/Layout/AST/JSON 4단 비교, mutate 없음 | 검증 |

핵심 불변식: **단조성**(앞 Stage 정보 파괴 금지) · **불변 Token** · **결정성** · **추적성**(offset/bbox/page 보유).

## Freeze Rules / Immutable IR

- Freeze(IRIntegrityGate) 이후 **AST mutate 금지**.
- QuestionBuilder는 `ir_frozen=True`에서만 실행. 내부 데이터 수정 금지(`replace`/`regex`/`trim`/`normalize`/`repair` 불가). 허용: Token.text 그대로 연결, markdown 직렬화 인코딩(셀 `|`→`\|`), 직교 서비스(answer/pattern) **조회만**.
- Diff는 gate 신호만 낼 뿐 Emit을 고치지 않는다.
- Parser 실패의 교정 위치는 **앞 Stage 또는 Source**이지 Display·Coach가 아니다.

## SemanticRepair / SemanticValidator / IRIntegrityGate / QuestionBuilder / DiffEngine

각 컴포넌트의 상세 규칙·필드 매핑·sidecar/provenance 계약은 **docs/32 §2~§5**에 있다. 여기서는 “위치와 금지”만 기억한다: 모두 Plane A 내부, read-only 지향, Freeze 준수.

## 절대 수정 불가 (Never Modify)

- `scripts/parser/` Stage 1–9 알고리즘
- Freeze 규칙 / 불변 Token 규칙
- QuestionBuilder를 런타임/Coach/Agent가 호출하게 만드는 어떤 변경
- Emit이 Product를 자동 스위치하게 만드는 변경
- 문항 ID 하드코딩(`if questionId=="..."`) — docs/31 원칙 4 위반

RC1 Baseline SHA(Parser tree/Emit)는 `docs/release/RC1-BASELINE.md`.

---

# 4. Promotion System (Plane B)

> **정식 정의: `docs/34-truth-split-migration-plan.md`(이행 계획·Gate·Rollback), docs/35 §5·§11.**  
> Promotion은 D2 Emit을 D3 Product로 승격하는 **유일한 합법 경로**. 데이터 변환 스크립트가 아니라 **배포 게이트**다.

## 파이프라인

```
Emit(D2) → Integrity Gate → Fidelity Gate → Display Acceptance Gate
        → Candidate(미배포) → Human Approval → Atomic Promote(baseline 백업+manifest)
        → Release → Rollback Readiness
```

승격 상태기계: `EMIT_READY → GATED → CANDIDATE → APPROVED → PROMOTED → RELEASED → (optional) ROLLED_BACK`.  
`PROMOTED` 이전에는 학생 Runtime이 변화를 보지 못한다.

## Gate / Human Approval / Rollback

- Gate G1–G8 상세: docs/34 §5.2. G5(answer 불변), G6(patternId ∈ Pattern Master)이 특히 hard.
- **자동 cron/CI가 Product를 덮어쓰지 않는다.** `--apply`는 Human Approval + 게이트 통과 후에만.
- Rollback: baseline 복구, partial rollback(문제 ID만), answer drift 1건이면 긴급 롤백. 상세 docs/34 §6.

## Current Promotion Status — **PROMOTION_READY = NO**

마지막 dry-run(`--write-candidate`) 기준. Product Snapshot은 **변경되지 않았다**.

| 필드 diff (Candidate vs Product, 240) | answer | patternId | hasTable | table | choices | question |
|---|---:|---:|---:|---:|---:|---:|
| 건수 | **0** | 74 | 104 | 117 | 223 | 240 |

근거: `data/promotion/PROMOTION-VALIDATION-REPORT.md`, `PROMOTION-DECISION-SUPPORT-SPRINT-REPORT.md`.

## Known Blockers

| ID | Severity | Blocker |
|----|----------|---------|
| G6 | Critical | `ACC_COST_001` D4 **미등록 유지** (15건) — ADR-001 Option A **정책 결정 완료** · Persist 미실행 |
| DA | Gate | Display Acceptance NOT READY (question 240 / choices 223) |
| HT | Warning | hasTable True→False 25건 미판정 |
| LEG | Process | Legacy Path L = **policy frozen (L1)** — D3 직접쓰기·exam_pipeline 추가패치·repair 재실행 금지 until Explicit Unfreeze ADR; repair queue 183 잔존 |
| APPLY | Hard | `--apply` 금지(스크립트+정책) — ADR-001 서명만으로 READY 열리지 않음 |

## ADR Status (요약 — §7에서 상세)

ADR-001 = **Approved (Option A)** Decision only (2026-07-22, Project Owner) — Persist=0. ADR-004 = **Approved (L1)** (2026-07-21, 이아람). ADR-002~003 Pending.

---

# 5. Coach Architecture (Plane D)

> **정식 정의: `docs/33-ai-exam-coach-agent-spec.md`. 이벤트/루프 모델: docs/35 §7·§8·§13.6.**  
> Coach는 학습 전략 Agent Layer다. **문항 공장도, Parser 클라이언트도, 제2의 Question DB도 아니다.** questionId만 참조하고 stem/choices/table/answer를 저장·생성·수정하지 않는다.

## 완료 상태

| Phase | 내용 | 상태 | Storage 키 |
|-------|------|------|-----------|
| **C1** | Data Model: UserProfile / QuestionAttempt / WeaknessReport (factory+validate, stores) | ✅ 완료 | `userProfile`, `questionAttempts`, `weaknessReports` |
| **C2** | 학생 풀이 기록 (append-only) | ✅ 완료 | `coach.attempts.v1` |
| **C3** | Weakness Diagnosis Engine | ✅ 완료 | `coach.weakness.v1` |

기존 LocalStorage 키(`progress`, `wrongAnswers`, `bookmarks`, `recentStudy`, `theme`, `settings`, `examHistory`)는 **rename 금지**, Coach 키는 **추가만** 되었다.

## Pending

| Phase | 내용 | 상태 |
|-------|------|------|
| **C4** | Learning Planner (Plan) | 미착수 — RC1 명시적 비범위 |
| **C5** | AI Dashboard / Evaluate | 대기 |
| **C6** | Full Agent Loop + Strategy Revision | 대기 |

## Closed Loop Vision (docs/35 §13.6)

```
Observe → Diagnose → Plan → Act → Evaluate → Revise ↺   (Plane D 내부 폐쇄)
```

- 전 단계는 **이벤트로만** 진화(append-only). Projection은 원장에서 재구축 가능.
- 구 스펙의 “Question Builder Agent → IR Pipeline”은 **폐기**되고 **Session Selector(D3 catalog 조회)**로 대체됨(docs/35 §7.4).
- AI Provider는 Port 뒤 조언자. Mock(현재) → Real(후속). 응답은 이벤트로만 반영, Question body 생성 금지.

단계별 Inputs/Outputs/Authority/Owner/Storage/Tests/Rollback: `docs/36-rc2-rc4-engineering-roadmap.md` §2.

---

# 6. Current RC1 Status

> 출처: `docs/release/RC1.md`, `PROJECT_STATUS.md`, `CHANGELOG-RC1.md`.  
> RC1 = **문서·결정 게이트 정리**. 코드 변경·`--apply`·C4 착수 없음.

## ✅ Completed

- Architecture Freeze docs 31–35
- Parser Core Stage 1–9 (Emit 240 records, Builder가 Product 미변경)
- Coach C1–C3
- Promotion Gate 스크립트 + dry-run (Candidate shadow, Product overwrite 없음, READY=NO)
- Promotion Decision Support Sprint PASS (read-only evidence 도구·리포트)
- Human Approval ADR 패키지 발행 (ADR-001~004)
- Architecture Review 완료 → RC1 문서 세트
- **ADR-004 = Option L1 Freeze** Human 서명 (2026-07-21, 이아람) — 문서 동기화 완료 (§16 Memory Log)
- **Sprint 001 — RC2-E8 Regression & Gate Hardening** CLOSED (WO-20260721-001, Gate B ACCEPT 2026-07-22) — read-only harness/evidence. 참조: `scripts/regression/` · `tests/regression/` · `data/regression/rc1-baseline-manifest.json` · `data/regression/gate-evidence/` · `docs/release/RC2-E8-CI-ASSIST-CHECKLIST.md`
- **Inventory MVP v0.1 Student Validation** CLOSED (WO-20260722-002, Gate B ACCEPT WITH NOTES 2026-07-22) — Plane C ACC_INV Vertical Slice. D3/D4/Parser/Promotion/`--apply`/C4 untouched. Feedback #001 = 재작업 아님 → Pattern Learning Enhancement Sprint로 이행(본 WO ≠ REWORK)
- **Pattern Learning Enhancement (Feedback #001)** CLOSED (WO-20260722-003, Gate B ACCEPT WITH NOTES 2026-07-22) — Plane C Trigger Keyword + Keyword→판단→결론; Step·관련 Question 유지. D3/D4 SHA=RC1 (write 없음). Parser/Promotion/`--apply`/C4/coach 신규 untouched
- **ADR-001 = Option A SIGNED** (WO-20260722-001, 2026-07-22, Project Owner) — **DECISION_CLOSED** · REGISTER `ACC_COST_001` 정책 결정 · Persist/`--apply`/구현 **미인가** · D4 미등록 유지

## ⏳ Pending Human Approval

- ~~ADR-001 옵션 서명~~ → **Signed: Approved (Option A)** 2026-07-22, Project Owner — Decision only · Persist=0
- **실행 후보(미착수):** `ACC_COST_001` D4 REGISTER execution — **신규 WO ID** · Guardian Scope 필수 · `--apply` 금지 until READY path
- ADR-002 Display Acceptance 기준 채택 + 표본 라벨
- ADR-003 hasTable 25건 워크시트
- ~~ADR-004 Legacy L1/L2 서명~~ → **Signed: Approved (L1)** 2026-07-21, 이아람
- Display Acceptance 정식 PASS/FAIL
- Path L / HEAD dirty hygiene → **ADR-004 follow-up WO** (Unfreeze 금지)
- dirty workspace hygiene / WO-003 단독 commit 분리 (pre-existing dirty baseline: WO-002 Plane C + WO-003 미커밋 공존)
- orphan ACC_INV_005 정리(UI↔D4) — D4 write는 Human/별도 WO (known limitation: enrichment=Plane C UI 상수, D4 미기록)
- Notes follow-up (WO-20260722-002 Minor): footer messaging mismatch · recentStudy schema
- 다음 Sprint Task List (ADR 게이트 이후; RC2 Open=NO)

## 🟡 Deferred

- ADR-002~003 옵션 미선택 상태 → DEFER (운영 권고 유지). ADR-001 Option A 서명 완료(Decision). ADR-004는 L1 서명 완료.

## 🚫 Blocked

| Blocker | Why |
|---------|-----|
| Promotion `--apply` | G6 Persist 미실행 + Display Acceptance + 정책, READY=NO (ADR-001 서명 ≠ READY) |
| Product Snapshot promote | Truth Split 미해소, overwrite 금지 |
| Coach C4 | Pattern/Acceptance blocker, RC1 명시적 비범위 |
| Parser Core edits | Architecture Freeze |
| Pattern DB Persist (D4) | ADR-001 A Decision만 완료 — **실행 WO·Guardian 전 Persist 금지** |
| Unrestricted Legacy exam_pipeline → Product | **ADR-004 L1 signed** — Path L patch/repair 재실행 금지 until Explicit Unfreeze ADR |

---

# 7. ADR Summary

> 원본: `data/promotion/adr/ADR-001~004`. RC1 판정: `docs/release/RC1.md` §3–§4.  
> **ADR-001 = Approved (Option A)** Decision only (2026-07-22, Project Owner) — Persist=0. **ADR-004 = Approved (L1)** (2026-07-21). ADR-002~003 Pending/DEFER.

| ADR | Topic | 권고 결정 | Status | Impact |
|-----|-------|-----------|--------|--------|
| **ADR-001** | `ACC_COST_001` disposition (G6) | **Option A** REGISTER; boundary vs `ACC_COST_002` 정의됨 | **Approved (Option A)** 2026-07-22, Project Owner — **Decision only · Persist=0** | 정책 결정 완료. D4 미등록 유지 → G6 런타임 차단 유지. 실행은 별도 WO |
| **ADR-002** | Display Acceptance Criteria | **APPROVE — Option S1**(DA-0~DA-3 원안) | Pending (미서명) | choices 붕괴를 hard blocker화. Apply를 더 보수적으로 만듦 |
| **ADR-003** | hasTable Regression Judgment | **APPROVE — Option H1**(TRUE_REGRESSION=0) | Pending (워크시트 미작성) | 25건 PDF 대조 필요. FALSE_ALARM=choice-grid 오인코딩 가능 |
| **ADR-004** | Legacy Pipeline Strategy | **Option L1**(Freeze) | **Approved (L1)** 2026-07-21, 이아람 | Path L D3 직접쓰기·exam_pipeline 추가패치·repair 재실행 금지 until Explicit Unfreeze ADR |

전체 함의: **ADR-001 Option A 서명만으로 `PROMOTION_READY`는 열리지 않는다.** D4 Persist 실행 WO 완료 + Display Acceptance 등 잔여 게이트 해소 전까지 `--apply` 차단·C4 보류 유지. ADR-004 L1은 Path L 재발을 정책으로 봉쇄.

---

# 8. Repository Map

| 폴더/파일 | 역할 | 상태 |
|-----------|------|------|
| `docs/00~29` | 플랫폼 헌법·아키텍처·스키마·스펙 | 기준 문서 |
| `docs/31~35` | **Constitution (Freeze)** — Parser/Emit/Coach/TruthSplit/SingleTruth | **Frozen** |
| `docs/36-*` | RC2~v2.0 엔지니어링 로드맵 | Active(계획) |
| `docs/release/RC1.md`, `RC1-BASELINE.md` | RC1 릴리스 노트·baseline SHA | 기준 |
| `docs/release/RC2-E8-CI-ASSIST-CHECKLIST.md` | RC2-E8 CI-assist 체크리스트 | Sprint 001 산출 (참조) |
| `scripts/parser/` | Parser Core Stage 1–9 | **Frozen — 수정 금지** |
| `scripts/promotion/` | read-only evidence 도구(inspect/sampler) | Active(read-only) |
| `scripts/regression/`, `tests/regression/` | RC2-E8 read-only harness | Sprint 001 완료 (read-only) |
| `scripts/promote-parser-emit.py` | Promotion Gate (dry-run/candidate/apply guards) | **Immutable ownership** |
| `scripts/exam_pipeline/`, `scripts/repair-pipeline.py` | **Legacy Path L** | **동결됨 (ADR-004 L1 signed)** — 추가패치·repair 재실행 금지 until Explicit Unfreeze ADR |
| `js/coach/` | Coach C1–C3 (models/stores/ai-provider) | Active(추가만, 키 불변) |
| `js/` (data-loader, data-cleaner, renderer 등) | Product Runtime (Plane C) | Active(Display read-only 지향) |
| `data/regression/parser-emit/`, `ast-sidecar/` | D1/D2 Emit·sidecar | Parser 재실행만 |
| `data/regression/rc1-baseline-manifest.json`, `gate-evidence/` | RC2-E8 baseline·gate evidence | Sprint 001 산출 (참조) |
| `data/promotion/` | Candidate·ADR·evidence·리포트 | Active(승격 산출) |
| `data/promotion/adr/` | ADR-001~004 | 결정 기록 |
| `data/question-db-mvp.json` | D3 Product Snapshot | **Promotion만 쓰기** |
| `data/pattern-db-mvp.json` | D4 Pattern Master | D4 Owner만 |
| `data/coach/` | Coach mock JSON | 테스트용 |
| `data/repair/` | Legacy repair queue(183) | 부채(격리/이관 대상) |
| `source/original-exams/` | D0 Document | 원본 교체만 |

**Frozen:** `docs/31~35`, `scripts/parser/`, Promotion ownership.  
**Active:** `js/coach/`(추가), `scripts/promotion/`(read-only), `scripts/regression/`+`tests/regression/`(RC2-E8), `data/promotion/`, 로드맵 문서.  
**동결/폐기 대상:** `scripts/exam_pipeline/`, `scripts/repair-pipeline.py`의 D3 직접쓰기(ADR-004 L1).

---

# 9. Development Principles

> 정식: docs/35 §14·§15, `docs/00-platform-constitution.md`, `.cursor/rules/`.

핵심 불변 규칙:

1. **Single Truth Authority** — 모든 엔티티는 Owner가 정확히 하나. Owner만 Persist에 쓴다.
2. **Parser never calls Coach / Coach never calls Parser** — Parser는 Emit까지만, Plane A는 offline.
3. **Coach never edits Question** — questionId 참조만. 문항 본문·정답·표 미소유.
4. **Display never edits Source/Question** — Display는 D3 read-only 투영(보정 금지 목표).
5. **Promotion owns Product Snapshot** — D3 쓰기 경로는 Promotion Pipeline 단 하나.
6. **QuestionBuilder ≠ Runtime** — Builder는 offline codegen. 브라우저/Agent에 존재하지 않음.
7. **Append-only events** — Learner Truth는 이벤트 원장. Projection은 재구축 가능. AI 출력은 이벤트로만.
8. **No authority across planes** — Plane 경계를 넘는 쓰기 금지.
9. **Tech 제약** — HTML5/CSS3/Vanilla ES6/JSON/LocalStorage/GitHub Pages only. React/Vue/TS/백엔드/Node 서버 금지.
10. **LocalStorage 키 rename 금지**, Generated 파일 직접 수정 금지, 문항 ID 하드코딩 금지, No Placeholders.
11. **Human Approval 필수** — 모든 D3/D4 쓰기·`--apply`·Unfreeze·AI 실연결.
12. **언어 규칙** — 사용자 대화는 한국어(코드 식별자는 영어). `.cursor/rules` 참조.

---

# 10. AI Role Assignment

> 상세 매핑: `docs/36` §6. 요약:

| 주체 | 책임 | 이유 |
|------|------|------|
| **Cursor** | Implementation — 결정론적 스크립트·테스트·projection·gate 실행·파일 정리 | 재현 가능·검증 가능 작업에 최적 |
| **Sonnet** | Engineering Review — 중간 복잡도 구현·문서·테스트 저작 | 구현량 처리 |
| **Opus** | Architecture — 아키텍처 민감 설계·에이전트 오케스트레이션·ADR·리스크·Provider safety | Plane 권위·Truth 방어 판단 |
| **User** | Product Owner — D3/D4 쓰기·`--apply`·Unfreeze·콘텐츠/패턴 승인 | Plane 권위는 위임 불가 |

**불변:** 어떤 AI도 `--apply`·D4 등록·Unfreeze·콘텐츠 승인을 단독 실행하지 않는다. AI는 준비·검증·실행 스크립트까지, 최종 승인은 User.

---

# 11. Current Roadmap

> 목적만 요약. 상세 Epic/Backlog/Sprint는 `docs/36-rc2-rc4-engineering-roadmap.md`.

| Milestone | 목적 (구현 상세 아님) |
|-----------|----------------------|
| **RC1** ✅ | 아키텍처 Freeze·Parser Emit·Coach C1–C3·Promotion dry-run·ADR 패키지 — 결정 게이트 정리 |
| **Beta Candidate** ✅ (2026-07-24) | Learning Loop + Pattern First + Evidence Pad 능력 고정 · **Validation Phase 진입** · Decision=`docs/program-decision-beta-candidate.md` |
| **Internal Pilot IP-001** ← **NOW** | 실제 수험생 검증 · Evidence ≥20 · Session · 07 Report · Minor Polish only |
| **Beta Review #2 → Human Approval** | Exit Criteria 충족 후 Beta Release **별도 선언** |
| **RC2** | **Truth Unification & Event Backbone** — G6 해소(ADR-001 A Decision ✅ · Persist 대기), Legacy Freeze, 첫 Promotion(canary→full), Display passthrough, 이벤트 척추. **RC2 Open=NO**. Epic 일부: **RC2-E8 ✅ CLOSED**; **RC2-E7** = 미착수(gated) |
| **Post-Beta (HOLD)** | WO-015 Recommendation · WO-016 AI Coach · Mastery Execution — Pilot Evidence 이전 착수 금지 |
| **RC3** | **Closed-loop Coach** — C4~C6 (Beta Evidence 이후 재평가) |
| **RC4** | **Graph Architecture** — Knowledge/Weakness/Learning 그래프(=read-only projection) |
| v1.0 / v1.5 / v2.0 | 회계학 GA → Real AI Provider·2번째 과목 → 멀티 시험·그래프 주도 개인화 |

현재 위치: **Beta Candidate · Validation Phase · P0=Internal Pilot IP-001.**  
기능 추가보다 Evidence 축적 우선 (Validation Driven Development).  
`PROMOTION_READY=NO` · D4 Persist=0 · Reco/Coach/Mastery Exec = HOLD.

---

# 12. Known Risks

> 정식 Risk Register: docs/36 §8. 핵심 5개:

| Risk | 요약 | 방어선 |
|------|------|--------|
| **Truth Split** | Emit/Product/Display/Coach가 서로 진실을 쓰면 문항이 갈라짐 | Single Truth Authority, D3=Promotion only |
| **Promotion Blockers** | G6(15) + Display Acceptance + `--apply` 하드 차단 | ADR-001 해소, 게이트 이중 안전장치 유지 |
| **Pattern Governance** | `ACC_COST_001` D4 미등록(Persist=0) → Coach 진단 고착 위험 | ADR-001 Option A 서명 완료; 실행 WO에서 D4 등록 |
| **Legacy Pipeline** | Path L이 D3 직접쓰기(repair 183) → Truth Split 재발 | ADR-004 L1 Freeze, D3 직접쓰기 차단 |
| **Coach Wiring** | C4~C6 이벤트 배선 시 Question body 복제·AI overwrite 위험 | append-only, body 미저장 assert, AI는 이벤트로만 |

---

# 13. Project Assets

| 분류 | 자산 | 참조 |
|------|------|------|
| **Architecture** | Four Plane + D0~D7 Authority Graph, Freeze 규율, Emit Contract | docs/31~35 |
| **Data** | Emit 240 records(answer drift 0), Product Snapshot, sidecar/provenance, baseline SHA | data/regression, RC1-BASELINE |
| **Pattern** | Pattern DB(17 patterns), Pattern-first 학습 구조 | data/pattern-db-mvp.json, docs/05 |
| **Coach** | UserProfile/Attempt/Weakness 모델·store, append-only 이벤트 기반 | js/coach, docs/33 |
| **Promotion** | Gate(G1–G8) + dry-run 재현 + Rollback 절차 + evidence 도구 | scripts/promotion, docs/34 |
| **잠재 특허/차별화** | 기출 좌표 보존 컴파일러(불변 Token) + Promotion 게이트 + Closed-loop 약점 진단의 결합 | — |
| **Business moat** | (1) 컴파일된 기출 진실의 정확성, (2) Pattern 중심 개인화, (3) Subject Independence로 다과목 확장성 | docs/00·01 |

> 자산의 핵심 가치는 “정확한 기출 진실 + 그 위의 개인화 루프”이며, 이는 **Truth 단일성**을 지킬 때만 성립한다.

---

# 14. Onboarding Guide

새 AI/개발자는 다음 순서로 읽는다.

```
MASTER_HANDOFF.md   ← (이 문서) 전체 지도
   ↓
docs/35             ← Architecture Constitution (System Safety)
   ↓
docs/37             ← Exam Mode Constitution (개발 우선순위 · exam_impact_score)
   ↓
docs/agent/orchestration-design.md  ← DevAgent OS
   ↓
docs/agent/knowledge-extraction-mode.md  ← 실행 중심: Knowledge Complete
   ↓
docs/34             ← Truth Split 이행 계획·Promotion Gate·Rollback
   ↓
docs/33             ← Coach C1~C6, 데이터 모델, 이벤트/루프
   ↓
docs/32             ← Parser Emit Contract (Builder read-only)
   ↓
docs/31             ← Parser Architecture (Stage 1~9, Freeze)
   ↓
docs/release/RC1.md ← RC1 상태·blocker·ADR·baseline
```

보조 참조: `PROJECT_STATUS.md`(현황), `docs/36`(로드맵·폐기 아님), `data/promotion/adr/`(결정), `.cursor/rules/`(작업 규칙).

**첫 4가지 확인 사항:** ① Frozen(§8), ② `PROMOTION_READY`/blocker(§4), ③ Plane 권위(§2·§9), ④ `exam_impact_score`와 docs/37 Tier (시험 전 Tier3/Score≤2 금지).

---

# 15. Current State Snapshot

> RC1 근거 기반 성숙도(1 부재 – 5 성숙). 상세: docs/36 §9.

| 영역 | 점수 | 근거 |
|------|------|------|
| **Architecture** | 4.5 / 5 | docs/31~35 완비, Four Plane·D0~D7 명문화. 감점: 실행 미완 |
| **Coach** | 3.0 / 5 | C1~C3 완료, C4~C6·이벤트 척추(E7) 미착수 |
| **Promotion** | 3.5 / 5 | Gate 설계·이중 안전장치·dry-run 재현. 감점: apply 0회, G6 blocker. RC2-E8 harness ✅ |
| **Data** | 2.5 / 5 | answer drift 0·questionId 안정. 감점: Truth Split 운영 미해소, repair 183. Legacy Path L = **policy frozen (L1)** |
| **AI** | 1.5 / 5 | Provider 인터페이스+Mock만 |
| **Commercial/Business** | 2.0 / 5 | 단일 과목·미출시, GA 지표 부재 |
| **Overall** | — | **Exam Mode ON.** ADR-001 A Decision ✅ · Persist=0. RC2-E8 + Inventory MVP + Enhancement CLOSED. RC2 Open=NO. `PROMOTION_READY=NO` |

**한 문장 현황:** *P0 = KS-ACC-LOSSLESS-GOLDEN (WO-20260722-006). 기출 PDF Lossless Question 자산이 최우선. Platform은 도구. docs/35 Safety 불변. 기존 WO와 병합 없음.*

### Decision History

| Date | Decision | Signer / Gate |
|------|----------|---------------|
| 2026-07-21 | ADR-004 = L1 Freeze | 이아람 |
| 2026-07-22 | WO-20260721-001 Sprint 001 RC2-E8 Gate B ACCEPT → CLOSED | Gate B |
| 2026-07-22 | WO-20260722-002 Inventory MVP v0.1 Gate B ACCEPT WITH NOTES → CLOSED | Gate B / Human |
| 2026-07-22 | WO-20260722-003 Pattern Learning Enhancement (Feedback #001) Gate B ACCEPT WITH NOTES → CLOSED | Gate B / Human |
| 2026-07-22 | WO-20260722-001 ADR-001 Resume → Option A SIGNED · DECISION_CLOSED (Persist=0) | Project Owner |
| 2026-07-22 | WO-20260722-005 docs/37 Exam Mode Constitution ADOPTED · exam_impact_score 전 Agent 필수 | Human Policy Adopt |
| 2026-07-22 | AI Exam Operating System v1.0 ADOPTED (docs/37 §9 · 운영 정책) | Project Owner |
| 2026-07-22 | Knowledge Extraction Mode ADOPTED (docs/agent/knowledge-extraction-mode.md · 실행 중심) | Project Owner |
| 2026-07-22 | **KS-ACC-LOSSLESS-GOLDEN / WO-20260722-006 REGISTERED as P0** (Lossless Golden ACC · 비병합) | Project Owner / Navigator |

---

# 16. Memory Log

> Project Memory만 기록한다. **새 Architecture를 만들지 않는다.**
> 각 항목은 Completed / Decision / Changed Files / Architecture Impact / Next Step 다섯 칸만 채운다.

## 2026-07-24 — Beta Candidate Declaration (Validation Phase)

| 칸 | 내용 |
|----|------|
| **Completed** | Learning Loop(M1)·Pattern First(M2.x)·Evidence Pad(M2.6)·**M2.7 Learning UX**·Sprint-04 Polish 등 Capability Baseline 종합 검토. Program Stage를 Development→**Validation**으로 전환. |
| **Decision** | 2026-07-24 \| `PD-20260724-BETA-CANDIDATE` \| State=**Beta Candidate** (≠ Beta Release) \| Posture=**Validation Driven Development** \| P0=Internal Pilot IP-001 (20–30문항 · Evidence Pad · 07 Report) \| Reco/Coach/Mastery Exec=**HOLD until Exit Criteria** |
| **Changed Files** | `docs/program-decision-beta-candidate.md` · `PROJECT_STATUS.md` · `MASTER_HANDOFF.md` (§Status · §11 · §16) |
| **Architecture Impact** | **없음.** docs/35/37 · Parser · Promotion · D3/D4 Authority 불변. Mastery Policy 실행 미인가 유지. |
| **Next Step** | Internal Pilot 킥오프 → Evidence ≥20 → 07_User_Research_Analyst Report → Minor Polish → Beta Review #2 → Human Approval |
| **learning_outcome** | 지금 필요한 것은 더 똑똑한 AI가 아니라, 수험생이 Pattern을 익혔는지에 대한 **실측 Evidence**다. |

## 2026-07-22 — KS-ACC-LOSSLESS-GOLDEN / WO-20260722-006 REGISTERED (P0)

| 칸 | 내용 |
|----|------|
| **Completed** | 신규 Knowledge Sprint 등록(최우선). Charter 작성. 기존 WO/Mode와 **병합 없음**. docs/35·37 미수정. |
| **Decision** | 2026-07-22 \| WO-20260722-006 \| KS-ACC-LOSSLESS-GOLDEN = P0 \| Goal=Lossless Question DB · Golden ACC 2018–2026 · ACC Human Verify 100% \| Pattern after Questions \| Parser redesign OUT \| Candidate staging only |
| **Changed Files** | `docs/agent/knowledge-sprints/KS-ACC-LOSSLESS-GOLDEN.md` · `docs/agent/knowledge-extraction-mode.md` (Active Top Sprint 포인터) · `MASTER_HANDOFF.md` · `PROJECT_STATUS.md` |
| **Architecture Impact** | **없음.** Parser/Promotion/D3/D4 Authority 불변. Offline/Candidate 경로만 허용 예정(Gate A 후). |
| **Next Step** | `01_Architecture_Guardian` — WO-20260722-006 Scope (tooling IN · Parser/D3/D4 SoT OUT) → Gate A → Stage 1 Source inventory |
| **learning_outcome** | 학습 상한 = 기출 데이터 품질. 플랫폼보다 Lossless Golden이 합격 확률에 직결. |

## 2026-07-22 — Knowledge Extraction Mode ADOPTED (Execution Center)

| 칸 | 내용 |
|----|------|
| **Completed** | 실행 중심을 Platform Feature → **Knowledge Extraction**으로 전환. 정책 문서 `docs/agent/knowledge-extraction-mode.md` Adopt. Constitution(docs/35/37) 미수정 · AI Exam OS 유지 · 기존 WO 미폐기. |
| **Decision** | 2026-07-22 \| Knowledge Extraction Mode ON \| Goal=Knowledge Complete / 2027 회계 점수 최대화 \| Sprint=`KS-*` Pattern Complete \| Priority: Extraction > Review > Minimal UI > Platform > Commercial \| Confidence Candidate≠SoT Persist \| Human=승인·학습 · AI=반복 추출 |
| **Changed Files** | `docs/agent/knowledge-extraction-mode.md` · `docs/agent/orchestration-design.md` (우선순위 1노트) · `MASTER_HANDOFF.md` · `PROJECT_STATUS.md` |
| **Architecture Impact** | **없음.** D3=Promotion · D4=Human · Parser Freeze · Path L L1 유지. Auto Accept = Candidate only. |
| **Next Step** | Navigator가 KS-001(재고 Pattern Complete) 또는 D4 REGISTER를 Knowledge 규칙으로 재평가 후 **단일** WO 선정. |
| **learning_outcome** | 개발 성공 지표가 Feature 개수가 아니라 Pattern Complete·Coverage·Confidence·Review로 바뀜. |

## 2026-07-22 — AI Exam Operating System v1.0 ADOPTED (docs/37 §9)

| 칸 | 내용 |
|----|------|
| **Completed** | AI Exam OS v1.0을 docs/37 §9에 통합 채택. 신규 Constitution 파일 없음. docs/35 미수정 · docs/37 대체 아님 · 기존 WO/Agent 유지. orchestration WO/Verification/Memory 템플릿에 OS 필드 최소 반영. |
| **Decision** | 2026-07-22 \| Operating Policy Upgrade \| ADOPTED \| Mission=2027-04 1차 합격 · Navigator는 “합격 확률” 우선 · WO 필수 필드 7종 · Verification=Code+Learning+Exam · Memory=`learning_outcome` · Weekly Review 5항 · Roadmap Freeze(시험 전) · Final YES/NO/UNCERTAIN |
| **Changed Files** | `docs/37-exam-first-development-policy.md` (§9) · `docs/agent/orchestration-design.md` (§4.2/4.5/4.6) · `MASTER_HANDOFF.md` · `PROJECT_STATUS.md` |
| **Architecture Impact** | **없음.** System Safety·Four Plane·Parser·Promotion 불변. 운영·우선순위·학습 성과 기록만 강화. |
| **Next Step** | 기존 후보(D4 REGISTER 등)를 OS 필드로 재평가 후 단일 최우선 WO 선정. Weekly Review 루틴 시작. |
| **learning_outcome** | 개발 판단이 “기능 흥미”가 아니라 “합격 확률·공부 시간 ROI”로 정렬됨. |

## 2026-07-22 — WO-20260722-005 Exam Mode Constitution (docs/37) ADOPTED

| 칸 | 내용 |
|----|------|
| **Completed** | Exam Mode Constitution 채택. Guardian CONDITIONAL-GO (조건 1–8) → Human Policy Adopt → `docs/37-exam-first-development-policy.md` Persist → Memory 교차참조 · orchestration WO 헤더에 `exam_impact_score` 최소 참조. |
| **Decision** | 2026-07-22 \| WO-20260722-005 \| Human Policy Adopt APPROVED \| docs/37 ADOPTED \| Hierarchy: docs/35 System Safety (충돌 시 승) → docs/37 User Goal Priority → All WO \| 전 Agent WO에 `exam_impact_score` 0–5 필수 \| Exam Impact ≠ Authority bypass \| 공부 중단 = Human-only \| docs/36 비폐기 |
| **Changed Files** | `docs/37-exam-first-development-policy.md` · `docs/agent/orchestration-design.md` (WO 헤더 1필드) · `MASTER_HANDOFF.md` · `PROJECT_STATUS.md` |
| **Architecture Impact** | **docs/35 미수정.** Four Plane·Parser·Promotion·D3/D4 Ownership 불변. 개발 **우선순위·일정**만 Exam Mode로 정렬. `PROMOTION_READY=NO` · RC2 Open=NO · D4 Persist=0 유지. |
| **Next Step** | 기존 후보를 Exam Impact로 재평가 후 선정. 유력: **ACC_COST_001 D4 REGISTER** (`WO-20260722-004` · Gate A/D4-write 별도) · dirty hygiene · Notes. Tier3/Score≤2는 시험 전 금지. |

## 2026-07-22 — WO-20260722-001 ADR-001 Option A SIGNED (DECISION_CLOSED)

| 칸 | 내용 |
|----|------|
| **Completed** | ADR-001 Human Decision (G6) Resume. Guardian Verdict GO · 권고 Option A · Persist=0. Project Owner 서명 → **DECISION_CLOSED** (실행 미착수). |
| **Decision** | 2026-07-22 \| WO-20260722-001 ADR-001 Resume \| Option A SIGNED (Project Owner) \| DECISION_CLOSED \| REGISTER ACC_COST_001; boundary vs ACC_COST_002 defined; Persist/--apply/implementation NOT authorized; Next = separate execution WO under new Guardian Scope |
| **Changed Files (Memory only)** | `data/promotion/adr/ADR-001-acc-cost-001-disposition.md` · `data/promotion/adr/README.md` · `MASTER_HANDOFF.md` · `PROJECT_STATUS.md` |
| **Architecture Impact** | **없음(정책 기록만).** D4 Persist=0 · Pattern DB 미변경. `PROMOTION_READY=NO` · RC2 Open=NO · ADR-002~003 Pending · ADR-004 L1 · C4 미착수 · E8/MVP/Enhancement CLOSED 비간섭. G6 런타임 차단 유지(미등록). |
| **Next Step** | Next WO candidate = **ACC_COST_001 D4 REGISTER execution** (신규 ID · Guardian 필수 · `--apply` 금지 until READY path) |

## 2026-07-22 — WO-20260722-003 Pattern Learning Enhancement (Feedback #001) CLOSED

| 칸 | 내용 |
|----|------|
| **Completed** | Pattern Learning Enhancement (Feedback #001). Gate A APPROVE WITH AMENDMENTS → Implementation DONE (Trigger Keyword + Keyword→판단→결론; Step·관련 Question 유지) → Verification CONDITIONAL-PASS (all checks pass, Blocking=NONE) → Gate B ACCEPT WITH NOTES → **SPRINT_CLOSED**. Plane C: `pattern.html` / `pattern.js` / `pattern-engine.js` / `pattern.css` + `validate-pattern-learning-ux.py`. |
| **Decision** | 2026-07-22 \| WO-20260722-003 Pattern Learning Enhancement (Feedback #001) \| Gate B ACCEPT WITH NOTES \| CLOSED \| Plane C Trigger Keyword + decision criteria; Step/관련Q 유지; D3/D4 SHA=RC1; Parser/Promotion/C4 untouched \| Notes: dirty WO-002+003 coexist; D3/D4 git M but SHA=RC1; data-loader dirty=WO-002; orphan ACC_INV_005 UI; validator marker-only; enrichment=UI constants not D4 |
| **Changed Files (Memory only)** | `MASTER_HANDOFF.md` · `PROJECT_STATUS.md` |
| **Architecture Impact** | **없음.** Plane C UI enrichment만. D3/D4 SHA=RC1 (write 증거 없음). Parser/Promotion/`--apply`/C4/coach 신규 untouched. `PROMOTION_READY=NO` · RC2 Open=NO · ADR-001~003 Pending · ADR-004 L1 · WO-20260722-002 CLOSED 유지(본 WO ≠ REWORK) · WO-20260722-001 ADR-001 Track = 별도 · WO-20260721-001 RC2-E8 CLOSED 유지. |
| **Next Step** | Next WO candidates = **ADR-001 Human Decision (G6)** · **dirty workspace hygiene / WO-003 단독 commit 분리** · **orphan ACC_INV_005 정리(UI↔D4) — D4 write는 Human/별도 WO** · **Notes follow-up (footer / recentStudy) from WO-002** |

## 2026-07-22 — WO-20260722-002 Inventory MVP v0.1 CLOSED

| 칸 | 내용 |
|----|------|
| **Completed** | Inventory MVP v0.1 Student Validation (Plane C, ACC_INV Vertical Slice). Gate A APPROVE WITH AMENDMENTS → Implementation DONE → Verification CONDITIONAL-PASS (Violation=NONE, Blocking=NONE) → Gate B ACCEPT WITH NOTES → **SPRINT_CLOSED**. Feedback #001 = **재작업 요청 아님**. |
| **Decision** | 2026-07-22 \| WO-20260722-002 Inventory MVP v0.1 Student Validation \| Gate B ACCEPT WITH NOTES \| CLOSED \| Plane C ACC_INV slice; D3/D4/Parser/Promotion untouched; C4 none \| Notes: footer mismatch; recentStudy schema; dirty workspace \| Feedback#001 → future Pattern Learning Enhancement Sprint (not rework): exam-trigger keywords block; core decision criteria (keyword→judgment) |
| **Changed Files (Memory only)** | `MASTER_HANDOFF.md` · `PROJECT_STATUS.md` |
| **Architecture Impact** | **없음.** Plane C 학습 UX 검증만. D3/D4/Parser/Promotion/`--apply`/C4 untouched. `PROMOTION_READY=NO` · RC2 Open=NO · ADR-001~003 Pending · ADR-004 L1 · WO-20260721-001 RC2-E8 CLOSED 유지. WO-20260722-001 ADR-001 Track = 별도. |
| **Next Step** | Next WO candidates = **ADR-001 Human Decision (G6)** · **Pattern Learning Enhancement Sprint (Feedback #001)** · **Notes follow-up (footer / recentStudy / dirty workspace)** |

## 2026-07-22 — WO-20260721-001 Sprint 001 RC2-E8 CLOSED

| 칸 | 내용 |
|----|------|
| **Completed** | Sprint 001 — RC2-E8 Regression & Gate Hardening. Gate A APPROVE WITH AMENDMENTS → Implementation COMPLETE → Verification PASS → Gate B ACCEPT → **SPRINT_CLOSED**. |
| **Decision** | 2026-07-22 \| WO-20260721-001 Sprint 001 RC2-E8 \| Gate B ACCEPT \| CLOSED \| Amendments: no `__pycache__`; README link separate commit; Path L/HEAD dirty → ADR-004 follow-up (Unfreeze 금지) |
| **Changed Files (Memory only)** | `MASTER_HANDOFF.md` · `PROJECT_STATUS.md` (본 Memory Update). 구현 산출 참조만: `scripts/regression/` · `tests/regression/` · `data/regression/rc1-baseline-manifest.json` · `data/regression/gate-evidence/` · `docs/release/RC2-E8-CI-ASSIST-CHECKLIST.md` |
| **Architecture Impact** | **없음.** Four Plane·D0~D7·Parser·Promotion Ownership 불변. `PROMOTION_READY=NO` · ADR-001~003 Pending · ADR-004 L1 · Coach C4 미착수 · **RC2 Open=NO** 유지. E8=완료, E7=미착수(gated). |
| **Next Step** | (당시) ADR-001 Human Decision (G6) OR ADR-004 follow-up (dirty hygiene) — 후속 후보에 Pattern Learning Enhancement 추가됨(WO-20260722-002) |

## 2026-07-21 — ADR-004 L1 Document Sync

| 칸 | 내용 |
|----|------|
| **Completed** | ADR-004 Human Decision(Option L1 Freeze)을 허용 문서에만 동기화. 코드·Parser·Promotion `--apply`·Product/Pattern DB·docs/31~35 문구 **미변경**. |
| **Decision** | ADR-004 = **Option L1** — FREEZE maintained until Explicit Unfreeze ADR. Signer: **이아람**. Notes: Architecture Brief 수락. Path L D3 직접쓰기·`exam_pipeline` 추가패치·`repair-pipeline` 재실행 금지. |
| **Changed Files** | `data/promotion/adr/ADR-004-legacy-pipeline-strategy.md` · `data/promotion/adr/README.md` · `data/promotion/legacy-pipeline-freeze-decision.md` · `MASTER_HANDOFF.md` · `PROJECT_STATUS.md` |
| **Architecture Impact** | **없음(정책 기록만).** Four Plane·D0~D7·Parser Core·Promotion Ownership 불변. `PROMOTION_READY=NO`·ADR-001~003 Pending·RC2 Open=NO. (이후 Sprint 001에서 E8 완료 — 본 항목 시점의 “E7/E8 미착수”는 역사 기록.) |
| **Next Step** | (당시) ADR-001 Human Decision (G6) — E7/E8 still gated → **E8는 2026-07-22 CLOSED로 해소** |

---

## 부록 — 이 문서의 유지 규칙

- MASTER_HANDOFF는 **요약·인덱스**다. docs에 있는 내용은 복제하지 않고 참조한다.
- 아키텍처·Ownership·Freeze 상태가 바뀌면(예: ADR 서명, Promotion apply, RC2 착수) 이 문서의 §4·§6·§7·§11·§15·§16만 갱신한다.
- 이 문서는 **재설계·구현 과제·신규 아키텍처를 담지 않는다.** 그런 내용은 docs/3x 또는 로드맵(docs/36)에 둔다.
- §16 Memory Log는 Completed / Decision / Changed Files / Architecture Impact / Next Step만 추가한다.
