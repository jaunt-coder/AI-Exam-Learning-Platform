# Sprint History (12A ~ 13B)

## Sprint 12A

- Reviewer Mode
- Override Layer
- Table Editor

## Sprint 12B

- AI Recovery
- Suggestion Engine
- Diff Engine

## Sprint 12C

- Quality Dashboard
- Quality Score

## Sprint 12D

- Human Review Workflow
- Queue
- Assignment
- Decision

## Sprint 12E

- Reviewer Workspace
- One Click Fix
- Bulk Review
- Focus Mode

## Sprint 13A

- Student Workspace
- Resolved Question
- Exam Snapshot
- Tutor Resolver

## Sprint 13B

- Learning Engine
- Mastery Engine
- Recommendation
- Review Scheduler
- Learning Analyzer

## Sprint 18A

- Personal AI Textbook
- AI Final Revision Book

## Sprint 19A

- Subject Adapter Layer (`js/subject/`)
- Accounting Subject Plugin (`subjects/accounting/`)
- Economics / Civil / Real Estate / Law skeletons
- Subject Switch (Dashboard)
- Subject Prompt · Formula · Memory 자동 교체
- Personal Textbook / Final Book 과목별 분리
- Storage: `learning.current-subject.v1` · `learning.subject-config.v1` · `learning.subject-history.v1`
- Contracts: `subjectAdapterContract` · `subjectRegistryContract` · `subjectPromptContract` · `validationSubjectAdapter`

## Sprint 19B

- Universal Import Engine (`js/import-engine/`)
- `source/past-exams/{year}` 자동 탐색 (exam_1 / exam_2 / answer)
- Subject Detect (exam_1: 민법·경제·부동산학 / exam_2: 관계법규·회계)
- Candidate 출력: `subjects/{id}/question-db.json` · `pattern-candidate.json` · `formula-candidate.json`
- Dashboard Import Progress 카드
- Storage: `learning.import-history.v1` · `learning.import-cache.v1`
- Contracts: `importEngineContract` · `questionImportContract` · `answerImportContract` · `subjectDetectContract` · `validationImportEngine`
- Product DB (`data/question-db.json` 등) 쓰기 금지

## Sprint 19C

- Pattern Intelligence Map (`js/pattern-map/`)
- ROI = Expected Score Gain / Estimated Study Time
- Priority = Frequency × MasteryGap × RecentWrong × Confidence × ROI
- Pass60 Mode · Today ROI Mission · Week Mission · D-Day 전략
- Dashboard: Pass60 · ROI Gauge · Expected Score · Remaining Pattern
- Page: `pattern-intelligence.html`
- Storage: `learning.pattern-map.v1` · `learning.pattern-priority.v1` · `learning.pass60.v1` · `learning.roi.v1`
- Contracts: `patternMapContract` · `pass60Contract` · `roiContract` · `validationPatternMap`

## Sprint 17D

- Professor-Level Explanation Engine (`js/professor-explanation/`)
- Gemini 역할: 감정평가사 시험 전문 강사 (문제별 사고 과정 교육)
- Prompt `17D.1` · Quality ≥90 승인 / 70–89 부분 재생성 / <70 전체 재생성
- Manual Trigger only (`AI 강사 해설 생성`) — 자동 Cache 대량 생성 금지
- Cache: `questionId + overrideVersion + geminiModel + professorPromptVersion`
- UI Accordion: 문제 이해 → 핵심 개념 → 풀이 전략 → 실제 풀이 → 계산 → 보기 분석 → 공식 → 30초 암기 → 시험장 전략 → AI Tutor
- Personal Textbook Question별 Professor Explanation 저장
- Final Revision: 핵심 개념 · 실수 · 암기 · Tip 추출
- Dashboard: AI Explanation Quality (평균 · 낮은 품질 TOP10 · 재생성)
- Evaluation: `data/professor-evaluation-test.json` (대표 10문)
- Test: `scripts/test-professor-explanation.py`
- Frozen: Question/Pattern/Statistics DB · Learning/Recommendation/Mastery · Override · Vision

## Sprint 17D.1

- Gemini Connection Layer (`js/llm/ai-config.js`)
- Storage: `learning.ai-config.v1`
- Settings UI: API Key 저장 / 삭제 / 연결 테스트
- Resolve 우선순위: ai-config → legacy settings → LOCAL
- Missing Key: silent fallback 금지 · 설정 이동 게이트
- Cache key + `providerVersion`
- Result provider 표시: `GEMINI` / `LOCAL_PROFESSOR`
- Test: `scripts/test-gemini-config.py`

## Sprint 17D.2

- 학생 Manual Trigger 속도 최적화: Gemini **1회 호출** (`fastMode` / `skipRegen`)
- 자동 partial regen(70–89)은 Reviewer opt-in만 (`autoPartial: true`)
- Prompt 압축 · table 2500자 제한 · pass1 `maxTokens` 2800 · Prompt `17D.2`
- Result에 소요시간(ms) 표시 · 품질 90 미만 시 Reviewer Regenerate 안내
- Test: `scripts/test-professor-explanation.py`
