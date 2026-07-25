# Exam Mode Constitution — Exam-First Development Policy

Version 1.1 — 2026-07-22  
Document: **docs/37**  
Status: **ADOPTED** (Human Policy Adopt · WO-20260722-005)  
Operating System: **AI Exam Operating System v1.0** (본 문서 §9 · docs/37 대체 아님)  
Guardian: CONDITIONAL-GO conditions 1–8 reflected  
Owner: Project Owner (수험생 · 2027-04 감정평가사 1차)

> 본 문서는 **Exam Mode Constitution**이다.  
> 상용 README·일반 개발 가이드가 아니다.  
> **docs/35를 수정·대체·완화하지 않는다.**  
> **AI Exam OS는 별도 문서로 복제하지 않고 본 문서 §9에 통합한다.**

---

## 0. Mandate

최상위 개인 목표:

> **2027년 4월 감정평가사 1차 합격 (시험 점수 상승)**

플랫폼은 그 목표를 위한 **학습 도구**이다.  
플랫폼 완성·상용화·완벽한 AI는 시험 전 목표가 아니다.

---

## 1. Constitution Hierarchy (Guardian 조건 1 · 고정)

```
docs/35 Architecture Constitution
        │
        │  System Safety (불변)
        │  Ownership · Four Plane · Parser · Promotion · Human Approval · Freeze
        │  충돌 시 항상 승
        ▼
docs/37 Exam Mode Constitution  ← 본 문서
        │
        │  User Goal Priority / 개발 일정·우선순위
        │  35를 완화·우회·재해석 금지
        ▼
AI Exam Operating System v1.0   ← 본 문서 §9 (운영 절차 · WO 필드)
        │
        │  Navigator 판단 순서 · Verification/Memory/Weekly Review
        ▼
All Development Decisions (Work Orders / Sprints)
```

### Safety 예외 (document-priority와의 관계)

- `.cursor/rules/document-priority.mdc`의 “최신 번호 우선”은 **본 문서(docs/37)에 적용되지 않는다.**
- **번호가 높아도 docs/37은 docs/35보다 System Safety에서 우위에 설 수 없다.**
- Schema/Ownership/Freeze 충돌 시: **docs/35 승** → Human 보고 → 승인 후에만 변경 검토.

### Non-goals (본 문서가 하지 않는 것)

- docs/31–35 문구 수정
- Parser Core / Promotion Ownership / D3·D4 Authority 변경
- Human Approval Gate 축소·자동화 APPROVE
- Exam Impact Score로 `--apply` / D4 write / Unfreeze 정당화

---

## 2. Principles

### Principle 1 — Exam Outcome First

모든 개발 활동에 묻는다:

> “이 작업이 **2027년 4월 1차 시험 점수 상승**에 직접 기여하는가?”

| 답 | 조치 |
|----|------|
| YES | 진행 후보 (Exam Impact + Safety Gate 병행) |
| NO | 후순위 또는 보류 |

### Principle 2 — Platform is Learning Tool, Not Product First

| 지금은 하지 않음 (X) | 지금 목표 (O) |
|---------------------|----------------|
| 상용 SaaS 완성 | 시험 합격률을 높이는 **개인 학습 시스템** |
| 완벽한 AI Tutor | 기출·패턴·오답·약점 루프 |
| 모든 기능 구현 | Tier 1만 우선 |

### Principle 3 — Development Time Budget

| 구분 | 위치 |
|------|------|
| 시험 공부 | **Primary** |
| 플랫폼 개발 | **Secondary** |

개발로 인해 회계 문제 풀이·기출 반복·암기·모의시험이 줄면 → **개발 중단 또는 축소**.

**Human-only (Guardian 조건 5):**  
“공부 시간 침해 여부”와 “중단/축소” 최종 판단은 **Human**만 한다.  
Automation / Night Job / DevAgent는 시험을 **대리·강제하지 않는다.**

### Principle 4 — MVP Expansion Rule

새 기능 요청 시 네 질문:

1. 현재 내 시험 점수를 올리는가?  
2. 이번 달 학습 루틴에서 실제 사용하는가?  
3. 다른 과목에도 재사용 가능한가?  
4. 개발 비용 대비 학습 효과가 높은가?

**3개 이상 YES가 아니면 HOLD.**

### Principle 5 — Exam Data Priority

| 순위 | 데이터 |
|------|--------|
| 1 | 기출문제 |
| 2 | 출제 패턴 |
| 3 | 취약 유형 |
| 4 | 오답 기록 |
| 5 | 개인 학습 기록 |

후순위: 디자인 · UI 개선 · 자동화 · 제품화 기능.

---

## 3. Development Priority Until Exam (2026.07 – 2027.04)

### Tier 1 — 시험 점수 직접 영향

- 회계 기출 패턴 DB 완성 (D4는 docs/35 · Human Owner 경로만)
- 자동 채점
- 약점 분석 (Coach C1–C3 범위)
- 오답 반복 시스템
- 취약 패턴 추천
- 회계 실전 테스트

### Tier 2 — 다른 과목 확장 기반

- 공통 Pattern Engine
- Question Schema
- Weakness Model

### Tier 3 — 시험 이후

- SaaS 구조 · 사용자 관리 · 상용화 · AI Agent 고도화(C4+)

**docs/36 관계 (Guardian 조건 2):**  
docs/36 RC2–RC4 로드맵은 **폐기하지 않는다.**  
본 문서는 시험 전 **실행 우선순위만 보완·조정**한다.

---

## 4. Forbidden Until Exam (Guardian 조건 3 · 최소 목록)

시험 전 **금지** (또는 Exam Impact ≤2로 시험 후 이관):

- 과도한 Architecture 재설계 / docs/35 재해석
- 제품화·상용·SaaS 전용 Sprint
- UI 완성도 집착 · 학습 효과 없는 polish
- 필요 이상의 자동화
- 사용하지 않는 기능 개발
- **C4 등 대규모 Coach 확장**
- docs/35 우회성 “편의 예외” (Exam Impact로 Apply/D4/Parser Freeze 우회)

---

## 5. Exam Impact Score (전 Agent 필수)

모든 Work Order / Sprint 제안에 필수 필드:

```text
exam_impact_score: 0 | 1 | 2 | 3 | 4 | 5
```

| Score | 의미 | 진행 |
|------:|------|------|
| **5** | 시험 점수에 즉시·직접 기여 | 즉시 진행 후보 |
| **4** | 직접 기여 · 조건/범위 제한 필요 | 조건부 진행 |
| **3** | 학습 병행 가능 | 병행 가능 (시간 예산 Human 확인) |
| **2** | 시험 후가 적절 | **시험 이후** |
| **1** | 목표 불일치 | **폐기** |
| **0** | 미평가 | Navigator가 채우기 전 착수 금지 |

### Exam Impact ≠ Authority (Guardian 조건 4)

> Score **5**여도 `--apply` · D4 Persist · Unfreeze · Parser 편집을 **자동 허가하지 않는다.**

Authority는 계속:

- docs/35 · Signed ADR · Human Gate A/B · Promotion Gate · D4 Owner

### 예시 (Guardian)

| 작업 | Score |
|------|------:|
| 회계 오답 반복·약점 루프 개선 (C1–C3) | 4–5 |
| ACC_COST_001 D4 REGISTER (Human Gate 경로) | 4–5 (Authority Gate 별도) |
| 상용·SaaS·결제/멀티테넌트 | ≤2 |
| Four Plane / docs/35 재설계 · Architecture polish | ≤2 |

---

## 6. Agent Adoption Rules

1. `00_Project_Navigator` — 모든 신규 WO에 Exam Mode + OS 필수 필드 기재. Score ≤2면 시험 전 Sprint로 제안하지 않음 (Human 예외 Adopt만). Decision Order: 점수→시간→ROI→추천→Chain.  
2. `01_Architecture_Guardian` — Scope 검사 시 **35 우회 여부** + Exam Impact 정합 확인.  
3. `02` / `03` — Gate A 승인 Scope만; Score로 Scope 확대 금지. Verification은 Code + Learning + Exam PASS(미측정 시 명시).  
4. `04_Project_Memory_Manager` — 개발 사실 + `learning_outcome` 기록.  
5. `05_Automation_Agent` — OS 필수 필드 누락 WO는 Soft-Stop; Gate/Apply를 Score로 대체 금지.  
6. **Track 분리 (조건 6):** 기존 실행 Track(예: `WO-20260722-004`)과 본 정책을 **병합·불법 재개하지 않음**. 채택 후 기존 WO는 Score/OS 필드로 **재평가만**.

---

## 7. Persist / Adoption Log

| 항목 | 값 |
|------|-----|
| work_order_id | WO-20260722-005 |
| Guardian Verdict | CONDITIONAL-GO (conditions 1–8) |
| Human Policy Adopt | **APPROVED** — 2026-07-22 |
| AI Exam OS v1.0 | **ADOPTED** — 2026-07-22 (본 문서 §9 통합 · 신규 Constitution 파일 없음) |
| Persist order (조건 7) | Guardian → Human Adopt → docs/37 Persist → Memory |
| orchestration (조건 8) | WO 헤더에 Exam Mode + OS 필수 필드 · 37 전문 복제·35 수정·Gate 축소 금지 |

---

## 8. Document Control

| 항목 | 값 |
|------|-----|
| Relation to docs/35 | Dependent · never supersedes Safety |
| Relation to docs/36 | Complements priority · does not retire roadmap |
| AI Exam OS | Operational layer inside docs/37 §9 · not a parallel constitution |
| Freeze | docs/35 Frozen; 본 문서는 Priority + Operating Policy (Human Adopt로 개정) |
| Next review | 2027-04 시험 이후 또는 Human이 Exam Mode 종료를 선언할 때 |

---

## 9. AI Exam Operating System v1.0 (운영 계층)

> **Adoption:** 2026-07-22 · Project Operating Policy Upgrade  
> **성격:** Architecture 변경 아님 · docs/35 미수정 · docs/37 대체 아님 · 기존 WO/Agent 폐기·교체 아님  
> **범위:** 향후 모든 Work Order 생성·우선순위·Verification·Memory·Weekly Review에 적용

### 9.1 Project Mission (Highest Priority)

최상위 목표 = **2027년 4월 감정평가사 1차 합격**  
플랫폼 완성 ≠ 최상위 목표. 플랫폼 = 합격을 위한 **도구**.

Navigator는 먼저 묻지 않는다: “무엇을 개발할까?”  
Navigator는 먼저 묻는다: **“무엇이 합격 확률을 가장 많이 높이는가?”**

### 9.2 Every Work Order — 필수 필드

§5 `exam_impact_score`에 더해, 이후 모든 WO에 아래를 **필수**로 포함한다.

| Field | 예시 / 값 |
|-------|-----------|
| `current_mode` | `EXAM` (시험 전 기본) |
| `exam_impact_score` | `0`–`5` |
| `estimated_hours` | 예: `2` |
| `study_roi` | `HIGH` \| `MEDIUM` \| `LOW` |
| `recommended_action` | `DO_NOW` \| `HOLD` \| `DEFER_POST_EXAM` \| `SPLIT` |
| `learning_goal` | `subject` · `chapter` · `pattern` |
| `success_metric` | `accuracy_gain` · `solve_time` · `retention` (해당 시) |

Authority 필드(`proposed_plane`, `forbidden_actions`, Gates)는 **기존 orchestration을 유지**한다. OS 필드는 우선순위·학습 성과 신호이다.

### 9.3 Navigator Decision Order

1. 시험 점수 영향 (`exam_impact_score`)  
2. 예상 개발시간 (`estimated_hours`)  
3. Study ROI (`study_roi`)  
4. 추천 여부 (`recommended_action`)  
5. Agent Chain 생성  

기술적 흥미보다 **시험 점수**를 우선한다.

### 9.4 Verification Upgrade

`03_Code_Verification`은 Code PASS만으로 끝내지 않는다. 가능하면 함께 기록:

| Check | 의미 |
|-------|------|
| **Code PASS** | 기존 architecture / tests / frozen paths |
| **Learning PASS** | `learning_goal` 대비 학습 흐름이 실제로 개선·유지되는가 |
| **Exam PASS** | `success_metric` / 합격 확률에 의미 있는 기여가 관측·주장 가능한가 (허위 계량 금지) |

Learning/Exam PASS 증거가 없으면 `known_limitations`에 **미측정**을 명시한다. Authority 위반은 기존과 같이 FAIL / ARCHITECTURE_VIOLATION.

### 9.5 Memory Upgrade

Memory는 “무엇을 개발했는지”뿐 아니라 **무엇을 학습하게 되었는지**를 한 줄 이상 기록한다 (`learning_outcome` 권장).

### 9.6 Weekly Review (Navigator)

매주 Review 시 필수 5항:

1. 이번주 공부시간  
2. 이번주 개발시간  
3. 이번주 점수 상승 (또는 대리지표)  
4. 불필요했던 개발  
5. 다음주 **단 하나의** 최우선 개발  

### 9.7 Roadmap Freeze (시험 전)

§3–§4와 정합. 시험 전 **대형 신규 기능 금지**.

| 허용 | 보류 |
|------|------|
| 회계 Pattern 추가 | SaaS · 결제 |
| 학습효과 개선 | UI Polish (학습 무관) |
| 버그 수정 | C4 확장 |
| 개인 학습 효율 개선 | Architecture Refactoring · Commercial Feature |

기존 진행 Track(예: D4 REGISTER)은 **폐기하지 않고** §9 필드로 재평가만 한다.

### 9.8 Final Decision Rule (모든 Agent)

> “이 작업이 감정평가사 1차 **합격 확률**을 의미 있게 높이는가?”

| 답 | 조치 |
|----|------|
| **YES** | 진행 (Safety Gate 병행) |
| **NO** | 시험 후 |
| **UNCERTAIN** | 더 작은 WO로 분해 (`recommended_action: SPLIT`) |

---

**끝.**  
권위는 항상 Human과 docs/35에 남는다.  
docs/37(+§9 OS)은 **언제·무엇을·어떻게 운영 판단할지**만 시험 목표에 맞춰 정렬한다.
