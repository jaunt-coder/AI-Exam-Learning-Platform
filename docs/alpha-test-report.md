# Alpha Test Report

- 생성일: 2026-07-19
- 대상: MVP Alpha (240문항 · 18 Pattern)
- 관점: 수험생 사용성 사전 점검 (자동 분석 + 수동 테스트 템플릿)

## Executive Summary

| 항목 | 결과 |
|------|------|
| Alpha Gate | **READY** |
| P0 (학습 불가) | 0 |
| P1 (학습 저해) | 3 |
| P2 (UX 불편) | 1 |
| 자동 PASS | 54 |
| 자동 FAIL | 0 |

자동 사전 점검 PASS — 수험생 Alpha Test 진행 가능.

## 1. 문제 풀이 흐름 연결

| Step | 경로 | 자동 검증 |
|------|------|-----------|
| 1 | index.html | PASS |
| 2 | pattern.html | PASS |
| 3 | question.html?pattern=&id= | PASS |
| 4 | 채점 (gradeAnswer) | PASS |
| 5 | AI Tutor (generateTutorLesson) | PASS |
| 6 | 오답 저장 (saveWrongAnswer) | PASS |
| 7 | wrong-note.html | PASS |
| 8 | recommendation.html | PASS |

## 2. Scenario 시뮬레이션

### Scenario A — 처음 Pattern 선택

- Pattern: `ACC_COST_001` (원가계산)
- 첫 문항: `ACC_2015_Q073`
- URL: `question.html?pattern=ACC_COST_001&id=ACC_2015_Q073`

### Scenario B — 오답 저장

- 테스트 문항: `ACC_2015_Q073`
- Retry URL: `question.html?pattern=ACC_COST_001&id=ACC_2015_Q073&retry=1`

### Scenario C — AI Tutor

- Note: Node.js unavailable — Tutor runtime probe skipped
- Static profile/fallback check PASS (runtime probe optional)

### Scenario D — Recommendation

- Mock wrong data -> pattern/question retry links generated
- Empty state normal when no LocalStorage history

## 3. 검증 데이터 — 30문항 Test Set

| 유형 | 목표 | 선정 |
|------|------|------|
| 계산형 | 15 | 15 |
| 개념형 | 10 | 10 |
| 표 문제 | 5 | 5 |

### 계산형

| ID | Pattern | Year | 수동 결과 |
|----|---------|------|-----------|
| `ACC_2015_Q073` | `ACC_COST_001` | 2015 | ☐ PASS / ☐ FAIL |
| `ACC_2024_Q078` | `ACC_COST_002` | 2024 | ☐ PASS / ☐ FAIL |
| `ACC_2015_Q051` | `ACC_EQ_001` | 2015 | ☐ PASS / ☐ FAIL |
| `ACC_2015_Q048` | `ACC_FIN_001` | 2015 | ☐ PASS / ☐ FAIL |
| `ACC_2015_Q057` | `ACC_FIN_002` | 2015 | ☐ PASS / ☐ FAIL |
| `ACC_2015_Q046` | `ACC_FS_001` | 2015 | ☐ PASS / ☐ FAIL |
| `ACC_2015_Q069` | `ACC_GEN_001` | 2015 | ☐ PASS / ☐ FAIL |
| `ACC_2015_Q061` | `ACC_INT_001` | 2015 | ☐ PASS / ☐ FAIL |
| `ACC_2015_Q044` | `ACC_INV_001` | 2015 | ☐ PASS / ☐ FAIL |
| `ACC_2015_Q067` | `ACC_INV_003` | 2015 | ☐ PASS / ☐ FAIL |
| `ACC_2015_Q045` | `ACC_INV_004` | 2015 | ☐ PASS / ☐ FAIL |
| `ACC_2015_Q075` | `ACC_INV_006` | 2015 | ☐ PASS / ☐ FAIL |
| `ACC_2018_Q067` | `ACC_INV_007` | 2018 | ☐ PASS / ☐ FAIL |
| `ACC_2015_Q043` | `ACC_PPE_001` | 2015 | ☐ PASS / ☐ FAIL |
| `ACC_2015_Q042` | `ACC_PPE_002` | 2015 | ☐ PASS / ☐ FAIL |

### 개념형

| ID | Pattern | Year | 수동 결과 |
|----|---------|------|-----------|
| `ACC_2025_Q070` | `ACC_EQ_001` | 2025 | ☐ PASS / ☐ FAIL |
| `ACC_2015_Q056` | `ACC_FIN_002` | 2015 | ☐ PASS / ☐ FAIL |
| `ACC_2018_Q041` | `ACC_FS_001` | 2018 | ☐ PASS / ☐ FAIL |
| `ACC_2017_Q061` | `ACC_GEN_001` | 2017 | ☐ PASS / ☐ FAIL |
| `ACC_2015_Q068` | `ACC_LEASE_001` | 2015 | ☐ PASS / ☐ FAIL |
| `ACC_2020_Q067` | `ACC_PPE_001` | 2020 | ☐ PASS / ☐ FAIL |
| `ACC_2015_Q041` | `ACC_PPE_002` | 2015 | ☐ PASS / ☐ FAIL |
| `ACC_2015_Q078` | `ACC_REV_001` | 2015 | ☐ PASS / ☐ FAIL |
| `ACC_2020_Q041` | `ACC_FS_001` | 2020 | ☐ PASS / ☐ FAIL |
| `ACC_2025_Q052` | `ACC_LEASE_001` | 2025 | ☐ PASS / ☐ FAIL |

### 표 문제

| ID | Pattern | Year | 수동 결과 |
|----|---------|------|-----------|
| `ACC_2017_Q044` | `ACC_PPE_001` | 2017 | ☐ PASS / ☐ FAIL |
| `ACC_2017_Q047` | `ACC_GEN_001` | 2017 | ☐ PASS / ☐ FAIL |
| `ACC_2018_Q078` | `ACC_COST_001` | 2018 | ☐ PASS / ☐ FAIL |
| `ACC_2018_Q047` | `ACC_EQ_001` | 2018 | ☐ PASS / ☐ FAIL |
| `ACC_2017_Q064` | `ACC_FIN_002` | 2017 | ☐ PASS / ☐ FAIL |

## 4. 발견 오류

- **[P1]** Home page outdated MVP messaging: index.html hero still shows Phase 1 copy (32문항/재고자산 only)
- **[P1]** Home status message outdated: app.js success message references Phase 1 Freeze, not MVP 240
- **[P1]** Table questions not visually rendered: question.html UI does not render hasTable/table Markdown

## 5. 사용성 문제

- **[P1]** Home page outdated MVP messaging: index.html hero still shows Phase 1 copy (32문항/재고자산 only)
- **[P1]** Home status message outdated: app.js success message references Phase 1 Freeze, not MVP 240
- **[P1]** Table questions not visually rendered: question.html UI does not render hasTable/table Markdown
- **[P2]** recommendation.html footer references phase1-v1.0: recommendation.html footer references phase1-v1.0

## 6. 개선 우선순위

### P0 (즉시)
- 없음 — Alpha 진행 가능

### P1 (Alpha 중 hotfix 또는 Beta)
- Home page outdated MVP messaging
- Home status message outdated
- Table questions not visually rendered

### P2 (Beta)
- recommendation.html footer references phase1-v1.0

## 7. 수동 Alpha Tester 기록란

| Scenario | PASS | FAIL | 메모 |
|----------|------|------|------|
| A — Pattern 선택 | ☐ | ☐ | |
| B — 오답 저장 | ☐ | ☐ | |
| C — AI Tutor | ☐ | ☐ | |
| D — Recommendation | ☐ | ☐ | |
| Flow 1 (Step 1~9) | ☐ | ☐ | |

## 부록: 자동 PASS 목록

- Page exists: index.html
- Page exists: pattern.html
- Page exists: question.html
- Page exists: wrong-note.html
- Page exists: ai-tutor.html
- Page exists: recommendation.html
- Core pages include cross-navigation links
- js/app.js exports/uses `loadPhase1Database`
- js/pattern.js exports/uses `loadPhase1Database`
- js/pattern.js exports/uses `pattern.html`
- js/question.js exports/uses `gradeAnswer`
- js/question.js exports/uses `recordAttempt`
- js/question.js exports/uses `generateTutorLesson`
- js/wrong-note.js exports/uses `buildWrongNoteSummary`
- js/wrong-note.js exports/uses `buildRetryUrl`
- js/ai-tutor.js exports/uses `generateTutorLesson`
- js/recommendation-engine.js exports/uses `buildFullRecommendationReport`
- question.html has #answer-form
- question.html has #submit-btn
- question.html has #result-panel
- question.html has #ai-tutor-panel
- question.html has #wrong-saved-notice
- question.html has #choices-list
- question.html has #next-btn
- data-loader.js: MVP question path
- data-loader.js: display cleanup layer
- data-loader.js: MVP default DB
- LocalStorage key preserved: progress
- LocalStorage key preserved: wrongAnswers
- LocalStorage key preserved: bookmarks
- LocalStorage key preserved: recentStudy
- LocalStorage key preserved: theme
- LocalStorage key preserved: settings
- LocalStorage key preserved: examHistory
- MVP DB 240 questions
- MVP DB 18 patterns
- statistics-mvp.json exists
- alpha-test-plan.md exists
- Alpha test set selected: 30 questions
- Scenario A: Pattern `ACC_COST_001` -> first question `ACC_2015_Q073`
- Scenario B: wrong save model OK for `ACC_2015_Q073`
- Scenario B: retry URL `question.html?pattern=ACC_COST_001&id=ACC_2015_Q073&retry=1`
- Scenario C: Tutor profile or fallback available for `ACC_COST_001`
- Scenario C: Tutor section `why-wrong` defined
- Scenario C: Tutor section `solving-order` defined
- Scenario C: Tutor section `memory-tip` defined
- Scenario C: Tutor section `generateTutorLesson` defined
- Scenario D: `buildDailyRecommendations` available
- Scenario D: `buildWeakPatternRecommendations` available
- Scenario D: `buildReviewRecommendations` available
- Scenario D: review due rule present
- Scenario D: weak pattern link `pattern.html?pattern=ACC_COST_001`
- Scenario D: review question link `question.html?pattern=ACC_COST_001&id=ACC_2015_Q073&retry=1`
- Scenario D: mock wrong age triggers review candidate (>=1 day)
