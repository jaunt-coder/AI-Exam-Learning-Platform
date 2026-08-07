# AI Exam Learning Platform v2 (README v2.0)

AI Exam Learning Platform v2는 감정평가사 회계학(재고자산)을 기준으로 확장 가능한 시험 학습 플랫폼을 구현한다.

현재 플랫폼은 다음 축으로 구성된다.

- Student Learning Platform
- Reviewer Workspace
- AI Recovery Assistant
- Learning Engine
- Human Review Workflow
- Data Quality Center
- Override Layer
- Resolved Question Architecture

## 1) 프로젝트 소개 (최신 상태)

핵심 원칙:

- `Question DB`, `Pattern DB`, `Statistics`는 Read Only로 유지
- Reviewer의 승인 결과는 `Override Layer`에만 반영
- 학생 화면은 원본이 아닌 `Resolved Question`만 사용
- Learning Engine은 학습 계층으로만 동작하고 DB 원본을 수정하지 않음

관련 문서:

- [Architecture](docs/ARCHITECTURE.md)
- [Project Status](docs/PROJECT_STATUS.md)
- [Sprint History](docs/SPRINT_HISTORY.md)
- [Storage Reference](docs/STORAGE_REFERENCE.md)
- [Contract Reference](docs/CONTRACT_REFERENCE.md)

## 2) Architecture

```text
Original Question DB
        │
        ▼
Override Layer
        │
        ▼
Resolved Question
        │
 ┌──────┴──────┐
 ▼             ▼
Student     Reviewer
Workspace   Workspace
        │
        ▼
Learning Engine
        │
        ▼
Dashboard / Tutor / Exam
```

아키텍처 상세: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## 3) Sprint History (12A ~ 13B)

- **Sprint 12A**: Reviewer Mode, Override Layer, Table Editor
- **Sprint 12B**: AI Recovery, Suggestion Engine, Diff Engine
- **Sprint 12C**: Quality Dashboard, Quality Score
- **Sprint 12D**: Human Review Workflow, Queue, Assignment, Decision
- **Sprint 12E**: Reviewer Workspace, One Click Fix, Bulk Review, Focus Mode
- **Sprint 13A**: Student Workspace, Resolved Question, Exam Snapshot, Tutor Resolver
- **Sprint 13B**: Learning Engine, Mastery Engine, Recommendation, Review Scheduler, Learning Analyzer
- **Sprint 15A+**: AI Dynamic Solution Engine, Mistake Diagnosis, Learning Prescription, Tutor Advice
- **Sprint 15B**: AI Learning Loop & Smart Tutor (30초 복습, Formula Card, Mini Retry, Weak Memory)
- **Sprint 15C**: AI Solution Quality Layer (품질 평가 · Missing · Reviewer 개선 루프)
- **Sprint 16A**: AI Exam Strategy (Mastery Map, Readiness Score, Daily Plan, Exam Mode)
- **Sprint 16B**: Exam Mode & Goal Management (D-Day, Goal, Phase, Mission, Streak)
- **Sprint 17A**: Gemini Native Problem Solver (Problem First AI · Cache · 2-Pass Validation)
- **Sprint 17B**: Gemini Vision OCR Recovery (Vision First · OCR Quality · Hybrid · Smart Cache)
- **Sprint 17C**: Human-Level AI Explanation Engine (Thinking Order · 상세 계산 · 오답 분석)
- **Sprint 18A**: Personal AI Textbook · AI Final Revision Book (자동 해설집 · 시험 직전 정리집)
- **Sprint 19A**: Subject Adapter Layer (Multi Subject Platform · Accounting Plugin · Subject Switch)
- **Sprint 19B**: Universal Import Engine (past-exams → Subject Candidate JSON)
- **Sprint 19C**: Pattern Intelligence Map · Pass60 · ROI Engine

상세: [docs/SPRINT_HISTORY.md](docs/SPRINT_HISTORY.md)

## 4) Storage Architecture

전체 Storage Key와 용도는 [docs/STORAGE_REFERENCE.md](docs/STORAGE_REFERENCE.md) 참고.

주요 예시:

- `learning.review.v1`
- `learning.workspace.v1`
- `learning.student-session.v1`
- `learning.review-cycle.v1`
- `learning.schedule.v1`
- `learning.engine-progress.v1`
- `learning.quality.v1`
- `learning.solution-cache.v1`
- `learning.mistake-profile.v1`
- `learning.diagnosis.v1`
- `learning.prescription.v1`
- `learning.smart-review.v1`
- `learning.weak-memory.v1`
- `learning.formula-card.v1`
- `learning.mini-retry.v1`
- `learning.smart-tutor.v1`
- `learning.exam-readiness.v1`
- `learning.strategy-state.v1`
- `learning.daily-plan.v1`
- `learning.pattern-risk.v1`
- `learning.exam-mode.v1`
- `learning.exam-goal.v1`
- `learning.exam-progress.v1`
- `learning.exam-phase.v1`
- `learning.solution-quality.v1`
- `learning.solution-blueprint.v1`
- `learning.solution-review.v1`
- `learning.solution-improvement.v1`
- `learning.gemini-cache.v1`
- `learning.gemini-history.v1`
- `learning.gemini-quality.v1`
- `learning.gemini-version.v1`
- `learning.vision-cache.v1`
- `learning.vision-history.v1`
- `learning.vision-quality.v1`
- `learning.vision-config.v1`
- `learning.personal-textbook.v1`
- `learning.personal-note.v1`
- `learning.personal-summary.v1`
- `learning.personal-tag.v1`
- `learning.personal-bookmark.v1`
- `learning.personal-favorite.v1`
- `learning.final-book.v1`
- `learning.final-summary.v1`
- `learning.final-formula.v1`
- `learning.current-subject.v1`
- `learning.subject-config.v1`
- `learning.subject-history.v1`
- `learning.import-history.v1`
- `learning.import-cache.v1`
- `learning.pattern-map.v1`
- `learning.pattern-priority.v1`
- `learning.pass60.v1`
- `learning.roi.v1`

## 5) Contract 목록

전체 Contract는 [docs/CONTRACT_REFERENCE.md](docs/CONTRACT_REFERENCE.md) 참고.

주요 예시:

- `studentResolverContract`
- `reviewWorkspaceContract`
- `learningEngineContract`
- `masteryEngineContract`
- `recommendationEngineContract`
- `qualityContract`
- `reviewWorkflowContract`
- `solutionEngineContract`
- `diagnosisContract`
- `prescriptionContract`
- `validationSolutionEngine`
- `smartReviewContract`
- `formulaCardContract`
- `miniRetryContract`
- `weakMemoryContract`
- `smartTutorContract`
- `learningLoopContract`
- `validationSmartTutor`
- `examStrategyContract`
- `readinessScoreContract`
- `dailyPlanContract`
- `patternRiskContract`
- `examModeContract`
- `validationExamStrategy`
- `examGoalContract`
- `examProgressContract`
- `examPhaseContract`
- `validationExamMode`
- `solutionQualityContract`
- `solutionBlueprintContract`
- `solutionImprovementContract`
- `solutionReviewContract`
- `validationSolutionQuality`
- `geminiSolverContract`
- `geminiCacheContract`
- `validationGeminiSolver`
- `humanExplanationContract`
- `validationHumanExplanation`
- `personalTextbookContract`
- `personalSummaryContract`
- `personalExportContract`
- `personalBookmarkContract`
- `validationPersonalTextbook`
- `finalRevisionBookContract`
- `finalSummaryContract`
- `validationFinalRevisionBook`
- `subjectAdapterContract`
- `subjectRegistryContract`
- `subjectPromptContract`
- `validationSubjectAdapter`
- `importEngineContract`
- `questionImportContract`
- `answerImportContract`
- `subjectDetectContract`
- `validationImportEngine`
- `patternMapContract`
- `pass60Contract`
- `roiContract`
- `validationPatternMap`
- `visionEngineContract`
- `visionQualityContract`
- `visionCacheContract`
- `ocrQualityContract`
- `visionRecoveryContract`
- `validationVision`

## 6) Current Features

- [x] Question Learning
- [x] Pattern Learning
- [x] Exam
- [x] Wrong Note
- [x] AI Tutor
- [x] Reviewer
- [x] AI Recovery
- [x] Human Review
- [x] Quality Dashboard
- [x] Student Workspace
- [x] Learning Engine
- [x] Dynamic Solution Engine (AI Tutor Layer)
- [x] Smart Tutor Learning Loop (Result 화면 학습 완료)
- [x] AI Exam Strategy (Mastery Map · Readiness · Daily Plan · Exam Mode)
- [x] Exam Mode & Goal Management (D-Day · Mission · Streak)
- [x] AI Solution Quality Layer (평가 → 개선 → Override 승인)
- [x] Personal AI Textbook (자동 해설집 · Summary · Bookmark · Export)
- [x] AI Final Revision Book (시험 직전 정리집 · Exam Day Sheet · Quick Review)
- [x] Subject Adapter Layer (Multi Subject · Accounting Plugin · Subject Switch)
- [x] Universal Import Engine (past-exams · Subject Detect · Candidate JSON)
- [x] Pattern Intelligence Map (Pass60 · ROI · Today Mission · D-Day)

## 7) Current Folder Structure

```text
AI Exam Learning Platform v2/
├── index.html
├── README.md
├── css/
├── js/
│   ├── learning-engine/
│   ├── student/
│   ├── reviewer/
│   ├── review-workspace/
│   ├── review-workflow/
│   ├── quality/
│   ├── recovery/
│   ├── coach/
│   ├── solution-engine/
│   ├── smart-tutor/
│   ├── exam-strategy/
│   ├── exam-goal/
│   ├── solution-quality/
│   ├── gemini-solver/
│   ├── professor-explanation/
│   ├── gemini-vision/
│   ├── personal-textbook/
│   ├── final-revision/
│   ├── subject/
│   ├── import-engine/
│   ├── pattern-map/
│   └── llm/
├── subjects/
│   ├── accounting/
│   ├── economics/
│   ├── civil/
│   ├── realestate/
│   └── law/
├── source/
│   └── past-exams/
├── data/
├── docs/
├── scripts/
└── assets/
```

## 8) Testing

| 스크립트 | 상태 |
|---|---|
| `scripts/test-reviewer-mode.py` | PASS |
| `scripts/test-ai-recovery.py` | PASS |
| `scripts/test-review-workflow.py` | PASS |
| `scripts/test-student-workspace.py` | PASS |
| `scripts/test-learning-engine.py` | PASS |
| `scripts/test-solution-engine.py` | PASS |
| `scripts/test-smart-tutor.py` | PASS |
| `scripts/test-exam-strategy.py` | PASS |
| `scripts/test-exam-mode.py` | PASS |
| `scripts/test-solution-quality.py` | PASS |
| `scripts/test-gemini-solver.py` | PASS |
| `scripts/test-gemini-vision.py` | PASS |
| `scripts/test-gemini-explanation.py` | PASS |
| `scripts/test-professor-explanation.py` | PASS |
| `scripts/test-gemini-config.py` | PASS |
| `scripts/test-personal-textbook.py` | PASS |
| `scripts/test-final-revision-book.py` | PASS |
| `scripts/test-subject-adapter.py` | PASS |
| `scripts/test-import-engine.py` | PASS |
| `scripts/test-pattern-map.py` | PASS |

## 9) Project Status

- Architecture: `██████████ 100%`
- Reviewer: `██████████ 100%`
- Student Workspace: `██████████ 100%`
- Learning Engine: `██████████ 100%`
- Dashboard: `███████░░░ 70%`
- AI Coach: `████████░░ 80%`
- OCR Repair: `██████░░░░ 60%`

상세: [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md)

## 10) Roadmap

- **Sprint 14B**: Learning Dashboard UI
- **Sprint 14C**: Evidence System
- **Sprint 15A+**: AI Dynamic Solution Engine (Tutor Layer · Mistake Diagnosis · Learning Prescription)
- **Sprint 15B**: AI Learning Loop & Smart Tutor (Smart Explanation · 30초 복습 · Formula Card · Mini Retry · Weak Memory)
- **Sprint 15C**: AI Solution Quality Layer (Quality Score · Blueprint · Improvement · Reviewer Override Loop)
- **Sprint 16A**: AI Exam Strategy (Mastery Map · Readiness Score · Daily Plan · Pattern Risk · Exam Mode)
- **Sprint 16B**: Exam Mode & Goal Management (Goal · Phase · Mission · Progress · Tutor Context)
- **Sprint 17A**: Gemini Native Problem Solver (Problem First · Cache · 2-Pass · Missing Recovery)
- **Sprint 17B**: Gemini Vision OCR Recovery (Vision Architecture · OCR Quality Engine · Vision Cache · Hybrid OCR)
- **Sprint 17C**: Human-Level AI Explanation (Thinking Order · Calculation · Why Others Wrong · Memory Hack · Exam Tip)
- **Sprint 18A**: Personal AI Textbook · AI Final Revision Book
- **Sprint 19A**: Subject Adapter Layer (Multi Subject Platform)
- **Sprint 19B**: Universal Import Engine (Multi Subject PDF Import)
- **Sprint 19C**: Pattern Intelligence Map + Pass60 + ROI Engine
- **Sprint 15**: Production Ready

## Vision Architecture (Sprint-17B)

```text
PDF → Question Locator → PDF Crop → OCR Quality
  ≥ threshold → OCR
  < threshold → Gemini Vision → Vision JSON
→ Resolved Question → Gemini Solver (17A) → Student
```

- Vision은 풀이하지 않고 복원만 수행한다.
- OCR 품질이 높으면 Vision API를 호출하지 않는다.
- Cache Key: `questionId + pdfHash + visionModel + promptVersion`
- LocalStorage + IndexedDB 이중 캐시. Hit 시 API 호출 금지.
- Vision 실패 시 OCR Fallback — 학생은 항상 문제를 볼 수 있다.
- Reviewer Approve → `saveOverride()` + Vision Cache만 갱신 (Question DB 금지).

### Production Guide

1. `GEMINI_API_KEY` 또는 settings에 Gemini 키를 설정한다.
2. `learning.vision-config.v1`에서 `ocrThreshold`(기본 70)를 조정한다.
3. Dashboard에서 Vision Cache Hit / 이번 달 절감 호출 / 예상 비용 절감을 확인한다.
4. 추천·오늘 학습 문제는 `requestIdleCallback`으로 Vision 캐시를 미리 생성한다.
5. PDF 페이지 렌더러가 필요하면 `globalThis.__PDF_RENDER__` 훅을 주입한다.

## Human-Level Explanation (Sprint-17C)

Resolved Question만 입력으로 받아 감정평가사 회계 강사형 풀이를 생성한다.

Accordion: 문제 접근 순서 → 단계별 계산 → 정답 이유 → 오답 이유 → 공식 → 30초 암기 → 시험장 풀이법

- Prompt Version `17C.1` — 변경 시에만 Cache Miss
- Pattern은 참고용만, 문제 숫자로만 계산
- Reviewer는 Markdown으로만 수정 후 Override 저장

## Professor-Level Explanation (Sprint-17D)

Gemini를 “문제 풀이 생성기”가 아니라 **감정평가사 시험 전문 강사**로 운용한다.

```text
Question → OCR/Resolved → Gemini 문제 분석 → 개념 탐색 → 풀이
```

- Prompt Version `17D.2` (`js/professor-explanation/`) — 학생 Manual Trigger는 **Gemini 1회 호출** (품질 자동 재생성 생략, 속도 우선)
- Output: 문제 이해 · 핵심 개념 · 풀이 전략 · 실제 풀이 · 계산 · 보기 분석 · 공식 · 30초 암기 · 시험장 전략 · AI Tutor
- Quality Reviewer: 100점 기준, **90 이상 승인** / Reviewer에서만 70–89 부분·70 미만 전체 재생성 (`fastMode: false`)
- **Manual Trigger만** 허용 (`AI 강사 해설 생성` 버튼) — 자동 Cache 대량 생성 금지
- Cache Key: `questionId + overrideVersion + modelVersion + promptVersion + providerVersion`
- AI Config: `learning.ai-config.v1` — Settings에서 API Key 저장·삭제·연결 테스트
- **기본 모델 `gemini-3-flash`** · 미존재 시 `gemini-3-flash-preview` 자동 재시도 (404 / MODEL_NOT_FOUND)
- **Responses Runtime (Sprint-17E)**: `POST /v1beta2/interactions` · Provider는 Runtime만 호출 (직접 fetch 금지)
- Connection Test: Responses API 실호출 · HTTP **200** 필수 · Dashboard AI Runtime 카드
- Missing Key: silent LOCAL 금지 → 「Gemini API Key 설정이 필요합니다」+ 설정 이동
- Result에 `provider: GEMINI | LOCAL_PROFESSOR` 명시 · 소요시간(ms) 표시
- Personal Textbook: Question별 Professor Explanation 전체 저장
- Final Revision: 핵심 개념 · 실수 포인트 · 암기 · 시험장 Tip 추출
- Phase 1 평가 세트: `data/professor-evaluation-test.json` (대표 10문)
- 테스트: `python scripts/test-professor-explanation.py` · `python scripts/test-gemini-config.py` · `python scripts/test-gemini-model.py` · `python scripts/test-responses-runtime.py`

DB(Question/Pattern/Statistics)·Learning/Recommendation/Mastery·Override·Vision 계산식은 변경하지 않는다.

## Personal AI Textbook (Sprint-18A)

학생 제출 → Result → AI Explanation 이후 **자동**으로 개인 해설집에 저장한다.

```text
Student Solve → Result → AI Explanation → Personal AI Textbook → Learning Engine
```

- Pattern 3문제 이상 → AI Summary 자동 생성 (Version History 유지, 삭제 금지)
- Bookmark ★ · Favorite Formula · Weak Collection · Search/Filter
- Export: PDF / Markdown / HTML
- UI: `textbook.html` (Pattern Tree · 해설 · 메모)

## AI Final Revision Book (Sprint-18A)

시험 직전 자동/수동으로 최종 정리집을 생성한다. Gemini에는 **요약 데이터만** 전달한다 (전체 Textbook 금지, 출제 예측 금지).

- 자동: D-30 / D-14 / D-7 / D-3 / D-1
- ①~⑩ 섹션 · Exam Day Sheet · Memory Sheet · Quick Review
- Formula Ranking = 사용빈도 × 오답률 × 최근학습
- Weak Pattern Ranking = 오답 · Mastery · Confidence · Review Delay

## Technology Stack

- HTML5
- CSS3
- Vanilla JavaScript (ES6+)
- JSON
- LocalStorage
- GitHub Pages

금지:

- React, Vue, Angular, TypeScript
- Backend/Server/Node.js API 서버

## Development Rules

- DB 파일 원본(`Question DB`, `Pattern DB`, `Statistics`) 직접 수정 금지
- Runtime 핵심 로직 임의 변경 금지
- README와 문서를 구현 상태와 항상 동기화
- 기능 추가 시 테스트 스크립트 동반

## Local Development

```bash
python -m http.server 8080
```

브라우저에서 `http://localhost:8080` 접속.

## License

Private — All Rights Reserved
