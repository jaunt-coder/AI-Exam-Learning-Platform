# AI Exam Coach Agent Platform Spec

Version 1.0 — 2026-07-20

> 목표: 기출 IR 품질 보증 Engine 위에 **학생 맞춤 합격 전략 Agent Layer**를 올린다.  
> 기존 Parser Core(CellRecon → … → QuestionBuilder)는 **삭제·단순화 금지**.

---

## 1. Architecture

```
Student Goal
    → Student Profile Agent
    → Weakness Diagnosis Agent
    → Learning Planner Agent
    → Question Builder Agent  ──calls──► IR Pipeline (6.7~7) + IRIntegrityGate
    → Evaluation Agent
    → Strategy Revision Agent
    ↺
```

| Layer | 역할 | 보호 |
|-------|------|------|
| IR Engine | 문제 생성·복원 품질 보증 | **Core — 변경 최소화** |
| Agent Layer | 학생 상태·전략·추천 | 신규 독립 모듈 `js/coach/` |

---

## 2. Development Order (필수)

| Phase | 내용 | 상태 |
|-------|------|------|
| **C1** | Data Model: UserProfile, QuestionAttempt, WeaknessReport | **✅ 완료** |
| **C2** | 학생 풀이 기록 (append-only `coach.attempts.v1`) | **✅ 완료** |
| **C3** | Weakness Diagnosis Engine (`coach.weakness.v1`) | **✅ 완료 — 승인 요청** |
| C4 | Learning Planner | 대기 |
| C5 | AI Dashboard | 대기 |
| C6 | Full Agent Loop | 대기 |

한 Phase 완료 후 보고 → 승인 후 다음 Phase.

---

## 3. Pattern ID 규칙

| 구분 | 형식 | 예 |
|------|------|-----|
| Canonical (저장·조인) | 기존 Pattern DB | `ACC_INV_003` |
| Display short (UI만) | chapter-short | `INV-003` |

Mock/에이전트 출력의 `pattern` / `patternId`는 **항상 Canonical**을 쓴다.

---

## 4. Phase C1 Data Models

### 4.1 UserProfile

LocalStorage key: `userProfile` (기존 키 변경 없음, **추가**)

```json
{
  "userId": "001",
  "examTarget": "감정평가사 1차",
  "examDate": "2026-10-15",
  "currentScore": { "accounting": 37.5, "civilLaw": 57.5 },
  "targetScore": { "accounting": 60, "civilLaw": 60 },
  "studyTime": { "totalMinutes": 1200, "weekMinutes": 180 },
  "solvedQuestions": 86,
  "accuracyRate": 0.54,
  "weakPatterns": ["ACC_INV_003", "ACC_PPE_002"],
  "strongPatterns": ["ACC_EQ_001"],
  "learningHistory": [],
  "updatedAt": "2026-07-20T00:00:00.000Z"
}
```

### 4.2 QuestionAttempt

LocalStorage key: `questionAttempts`

```json
{
  "attemptId": "att_001",
  "userId": "001",
  "questionId": "ACC_2015_Q044",
  "patternId": "ACC_INV_003",
  "answer": 2,
  "correct": false,
  "solvingTime": 95,
  "errorType": "개념 오류",
  "difficulty": "medium",
  "source": "practice",
  "createdAt": "2026-07-20T01:00:00.000Z"
}
```

### 4.3 WeaknessReport

LocalStorage key: `weaknessReports`

```json
{
  "reportId": "wr_001",
  "userId": "001",
  "patternId": "ACC_INV_003",
  "concept": "재고자산 귀속",
  "errorType": "개념 오류",
  "severity": "HIGH",
  "failureRate": 0.7,
  "repeatWrongCount": 4,
  "recommendation": "기초 문제 반복 필요",
  "evidenceAttemptIds": ["att_001"],
  "createdAt": "2026-07-20T02:00:00.000Z"
}
```

### 4.4 후속 Collection (C1에서 스키마만 예고, 구현은 이후 Phase)

| Collection | Phase | 비고 |
|------------|-------|------|
| PatternMaster | C3+ | 기존 `pattern-db-mvp.json` 재사용 |
| QuestionIR | C4+ | Parser sidecar / emit JSON 연계 |
| StudyPlan | C4 | Planner 출력 |
| LearningHistory | C2+ | UserProfile.learningHistory 확장 |

---

## 5. Storage 정책

- 기존 키(`progress`, `wrongAnswers`, …) **이름 변경 금지**.
- Coach 키는 **추가만**: `userProfile`, `questionAttempts`, `weaknessReports`.
- GitHub Pages / LocalStorage only — 서버 DB 없음.
- Mock: `data/coach/mock-*.json` (에이전트 연결 전 테스트용).

---

## 6. AI Provider Interface

`js/coach/ai-provider.js`

- `AIProvider` 인터페이스: `complete(prompt, options) → Promise<string|object>`
- 구현체: `MockAIProvider` (C1), 이후 OpenAI / Claude / Gemini 교체 가능.
- Agent 로직은 Provider에만 의존 — 벤더 SDK 직접 호출 금지.

---

## 7. IR Pipeline 보호 규칙

금지:

- `scripts/parser/semantic_repair.py` 등 Core Stage 삭제·의미 변경
- QuestionBuilder를 Agent가 bypass하고 JSON 직접 날조
- IRIntegrityGate 미통과 문항을 학습 풀에 투입

허용:

- Agent가 Pattern/난이도 선택 후 **기존 Builder/DB 문항을 조회**
- (후속) 생성 문항은 반드시 IRIntegrityGate 통과 후에만 사용

---

## 8. Module Layout

```
js/coach/
  README.md
  models.js           # factory + validate
  profile-store.js
  attempt-store.js
  weakness-store.js
  ai-provider.js
  index.js

data/coach/
  mock-user-profile.json
  mock-question-attempts.json
  mock-weakness-reports.json
```

---

## 9. Phase C1 완료 기준

- [x] 스키마 문서화 (`docs/33`)
- [x] JS factory/validate (`js/coach/models.js`)
- [x] LocalStorage store (기존 키 비파괴, Coach 키 추가만)
- [x] Mock JSON (`data/coach/`)
- [x] README / storage keys 갱신
- [x] Mock 검증 스크립트 PASS (`scripts/validate-coach-phase1.py`)
- [ ] Agent 로직 / Dashboard — **C2 이후 (미착수)**
