# AI Exam Learning Platform v2

AI 기반 시험 학습 플랫폼 — 출제 패턴 중심의 개인화 학습 시스템

## Platform Identity

본 프로젝트는 특정 과목을 위한 문제집이 아닌, **AI Exam Learning Platform**이다.

- 기출 데이터 분석 → 출제 패턴 발견
- 학습자 약점 분석 → 개인별 최적 학습 경로 제공
- Core Engine + Subject Template 구조로 다양한 시험·과목 확장

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | HTML5, CSS3, JavaScript ES6+ |
| Data | JSON |
| Storage | LocalStorage (초기) |
| Deployment | GitHub Pages |

> React, Vue, Angular, TypeScript, Backend, Node.js 서버 사용 금지

## Project Structure

```
AI Exam Learning Platform v2/
├── index.html              # 메인 진입점
├── README.md               # 프로젝트 단일 진실 공급원
│
├── css/
│   └── style.css           # 전역 스타일
│
├── js/
│   ├── app.js              # 앱 초기화
│   ├── data-loader.js      # JSON 데이터 로더
│   ├── storage.js          # LocalStorage 관리
│   └── ui.js               # UI 렌더링
│
├── data/
│   ├── master/
│   │   └── master-db.json  # Single Source of Truth
│   ├── generated/          # master-db에서 자동 생성 (직접 수정 금지)
│   ├── source/             # 원본 PDF·기출 데이터
│   └── cache/              # 캐시 데이터
│
├── assets/                 # 이미지·아이콘 등 정적 자원
├── docs/                   # 설계 문서 (00~29)
├── scripts/                # 검증·빌드 스크립트
└── .cursor/rules/          # Cursor AI 개발 규칙
```

## Data Architecture

```
Exam → Subject → Chapter → Pattern → Knowledge → Question → Learning → Statistics → Prediction
```

**원칙:** 모든 데이터 수정은 `data/master/master-db.json`에서 시작한다. Generated 파일 직접 수정 금지.

상세 스키마: [docs/02-database-spec.md](docs/02-database-spec.md)

## Document Policy

개발 시 `docs/` **전체 문서(00~29)** 를 기준으로 한다.

- 높은 번호 문서 = 기존 폐기가 아닌 **보완·실행 우선순위 조정**
- 충돌 시 우선순위: **최신 번호 → MVP Roadmap(29) → Database Schema(02,06) → 초기 설계**
- **Schema 충돌 시 임의 변경 금지** — 변경 필요성을 먼저 보고

## Design Documents

| 문서 | 내용 |
|------|------|
| [00-platform-constitution.md](docs/00-platform-constitution.md) | 플랫폼 헌법 (최우선) |
| [01-architecture-spec.md](docs/01-architecture-spec.md) | 시스템 아키텍처 |
| [02-database-spec.md](docs/02-database-spec.md) | 데이터베이스 스키마 |
| [03-master-db-spec.md](docs/03-master-db-spec.md) | Master DB 규격 |
| [04-subject-template-spec.md](docs/04-subject-template-spec.md) | 과목 템플릿 |
| [05-pattern-engine-spec.md](docs/05-pattern-engine-spec.md) | Pattern Engine |
| [06-question-schema-spec.md](docs/06-question-schema-spec.md) | Question 스키마 |
| [07-exam-analysis-spec.md](docs/07-exam-analysis-spec.md) | 기출 분석 |
| [08-recommendation-engine-spec.md](docs/08-recommendation-engine-spec.md) | 추천 엔진 |
| [09-learning-flow-spec.md](docs/09-learning-flow-spec.md) | 학습 흐름 |
| [10-development-roadmap-spec.md](docs/10-development-roadmap-spec.md) | 개발 로드맵 |
| [20-final-implementation-plan.md](docs/20-final-implementation-plan.md) | 최종 실행 계획 |
| [23-development-environment-spec.md](docs/23-development-environment-spec.md) | 개발 환경 |
| [28-testing-spec.md](docs/28-testing-spec.md) | 테스트 기준 |
| [29-mvp-fast-development-roadmap.md](docs/29-mvp-fast-development-roadmap.md) | MVP 빠른 개발 로드맵 |

## Development Principles

1. **데이터 중심 개발** — 기능보다 데이터 구조 우선
2. **Pattern 중심 학습** — 기능 단위가 아닌 Pattern 단위 완성
3. **기능 단위 완성** — Placeholder·TODO·더미 코드 금지
4. **완료 후 코드 리뷰** — Quality Gate 통과 후 다음 Phase
5. **README 업데이트** — 기능 추가 시 문서 동기화

## Development Workflow

```
설계 문서 확인 → 데이터 구조 확인 → 구현 → 테스트 → 리뷰 → 문서 업데이트
```

## LocalStorage Keys

| Key | 용도 |
|-----|------|
| `progress` | 학습 진도 |
| `wrongAnswers` | 오답 노트 |
| `bookmarks` | 즐겨찾기 |
| `recentStudy` | 최근 학습 |
| `learningEvents` | 학습 이벤트 (Phase 7.2) |
| `theme` | 테마 설정 |
| `settings` | 사용자 설정 |
| `examHistory` | 시험 기록 |

> Key 이름 변경 금지. 하위 호환성 유지.

## Development Roadmap (MVP — docs/29)

| Phase | 목표 | 상태 |
|-------|------|------|
| Phase 0 | Project Foundation | ✅ 완료 |
| **Phase 1** | **기출 데이터 분석 및 Database 구축** | **✅ 완료 (Frozen phase1-v1.0)** |
| **Phase 2** | **Question Solving Engine** | **✅ 완료** |
| **Phase 3** | **Pattern Learning System** | **✅ 완료** |
| **Phase 4** | **Wrong Answer System** | **✅ 완료** |
| **Phase 5** | **AI Tutor v2 (AI 과외 선생님)** | **✅ 완료** |
| **Phase 5.1** | **AI Tutor Quality Enhancement** | **✅ 완료** |
| **Phase 6** | **Exam Simulation Mode** | **✅ 완료** |
| **Phase 7** | **Recommendation Engine** | **✅ 완료** |
| **Phase 7.1** | **Analytics Dashboard** | **✅ 완료** |
| **Phase 7.2** | **Learning Event Tracking** | **✅ 완료** |
| **Phase 7.3** | **Learning Timeline Dashboard** | **✅ 완료** |

> 실행 계획: `docs/29-mvp-fast-development-roadmap.md` | 구조·원칙: `docs/00~20`

### Phase 1 Output (PDF 검증 — 2026-07-18 재수행)

```
data/master-db.json          (pdfVerified: true)
data/pattern-db.json         (6 Patterns, 실제 기출 빈도)
data/question-db.json        (32 Questions, originalQuestion 포함)
data/statistics.json         (question-db 자동 생성)
data/backup/phase1-generated/  (합성 데이터 백업 — 폐기 대상)
docs/exam-analysis.md
docs/pattern-db.md
docs/statistics.md
scripts/build-phase1-from-pdf.py
scripts/validate-phase1-data.py
```

> **원본**: `source/past-exams/2018-2025.pdf` (스터디파이터 8개년 기출, p.6~169 문제 / p.170~289 해설)

### Phase 1 Freeze (공식 데이터)

| 항목 | 값 |
|------|-----|
| Freeze ID | `phase1-v1.0` |
| Manifest | `data/phase1-freeze-manifest.json` |
| Immutable copy | `data/frozen/phase1-v1.0/` |
| 정책 | `docs/phase1-freeze.md` |

> Question DB 구조 임의 변경 금지. 변경 시 Schema 문서(`docs/02`, `docs/06`, `docs/25`) 선행 업데이트.

### Phase 2 Output (Question Solving Engine) — ✅ 완료

```
question.html
css/question.css
js/question.js
js/question-engine.js
js/data-loader.js
scripts/validate-phase2-engine.py
```

**학습 흐름:** Pattern 선택 → 문제 선택 → 답 선택 → 채점 → 해설·암기 Point → (오답 저장)

| 기능 | 상태 |
|------|------|
| Pattern 선택 | ✅ pattern-db.json 기준 6 Pattern |
| 문제 표시 | ✅ question + PDF 원문 컨텍스트 |
| 보기 선택 | ✅ ①~⑤ |
| 채점 | ✅ |
| 정답/오답 표시 | ✅ |
| 해설 표시 | ✅ |
| 암기 Point | ✅ (Pattern fallback 포함) |
| 오답 저장 | ✅ LocalStorage `wrongAnswers` |

**실행:** `python -m http.server 8080` → `/question.html`

### Phase 3 Output (Pattern Learning System) — ✅ 완료

```
pattern.html
css/pattern.css
js/pattern.js
js/pattern-engine.js
scripts/validate-phase3-engine.py
```

**학습 흐름:** Pattern Dashboard → Pattern 상세 → 관련 Question → 문제 풀이

| 기능 | 상태 |
|------|------|
| Pattern Dashboard | ✅ 이름·Grade·빈도·출제연도·풀이 진행률 |
| Pattern 상세 페이지 | ✅ 설명·학습 포인트·관련 Question·풀이 진입 |
| Wrong Note 연동 | ✅ questionId → patternId 집계 |
| data/*.json 수정 | ❌ 금지 (Freeze 유지) |

**실행:** `python -m http.server 8080` → `/pattern.html`

### Phase 4 Output (Wrong Answer System) — ✅ 완료

```
wrong-note.html
css/wrong-note.css
js/wrong-note.js
js/wrong-note-engine.js
scripts/validate-phase4-engine.py
```

**흐름:** 오답 저장(Phase 2) → 오답 노트 → Pattern 취약도 → 다시 풀기

| 기능 | 상태 |
|------|------|
| 오답 저장 | ✅ `wrongAnswers` (questionId, patternId, wrongCount, lastWrongAt) |
| 오답 다시 풀기 | ✅ 우선순위 복습 · 문항별 "다시 풀기" |
| Pattern 취약도 | ✅ HIGH/MEDIUM/LOW 집계 |
| 정답 시 오답 제거 | ✅ `removeWrongAnswer` |
| data/*.json 수정 | ❌ 금지 |

**실행:** `python -m http.server 8080` → `/wrong-note.html`

### Phase 5 Output (AI Tutor v2 — AI 과외 선생님) — ✅ 완료

```
js/ai-tutor-engine.js
js/ai-tutor-render.js
js/ai-tutor.js
ai-tutor.html
css/ai-tutor.css
scripts/validate-phase5-engine.py
```

**정책:** PDF `solution` 필드는 정답 검증용만 사용 · 학습자에게 PDF 해설 미노출

**8단계 범용 과외 구조 (수능·CPA·감정평가사·공인중개사 확장 가능)**

| 단계 | 내용 |
|------|------|
| ① | 왜 틀렸는가 / 정답 확인 |
| ② | 올바른 풀이순서 |
| ③ | 시험장에서 생각하는 순서 |
| ④ | 암기법 (두문자·비유·시험장 TIP) |
| ⑤ | 출제자의 함정 (examinerIntent · similarTrap) |
| ⑥ | 관련 Pattern |
| ⑦ | 비슷한 문제 |
| ⑧ | 다음 추천학습 |

**Question별 AI 생성 필드 (로컬 엔진 · UI 레이어)**

`explanation` · `solvingAlgorithm` · `wrongAnswerAnalysis`(보기별) · `examinerIntent` · `memoryTip` · `similarTrap` · `frequentlyConfusedWith`

| 기능 | 상태 |
|------|------|
| PDF 해설 출력 폐기 | ✅ question.html solution-panel 제거 |
| AI 과외 8단계 | ✅ 채점 후 자동 표시 |
| 보기별 오답 분석 | ✅ wrongAnswerAnalysis |
| 독립 AI Tutor 페이지 | ✅ ai-tutor.html |
| data/*.json 수정 | ❌ 금지 |

**실행:** `python -m http.server 8080` → `/question.html` 또는 `/ai-tutor.html`

### Phase 5.1 Output (AI Tutor Quality Enhancement) — ✅ 완료

```
js/ai-tutor-content/pattern-profiles.js
js/ai-tutor-content/question-overrides.js
js/ai-tutor-content/calculation-templates.js
scripts/tutor-overrides-data.json
scripts/generate-tutor-overrides.py
scripts/validate-phase5-1-tutor.py
```

**구조:** `Question → Question Override → Pattern Profile → Tutor Lesson (8단계)`

| 개선 | 내용 |
|------|------|
| Pattern Profile 분리 | Pattern 공통 과외 콘텐츠를 `pattern-profiles.js`로 분리 |
| Question Override | 32문항 문항별 풀이·보기별 오답 분석 (`question-overrides.js`) |
| Calculation Template | 계산형 재사용 풀이 골격 (`calculation-templates.js`) |
| Pattern mismatch | Q011(CVP)·Q012(현금지출) 등 Override로 보정 |
| 정답 해설 truncate | 200자 제한 제거 — 전체 explanation 표시 |

**품질 게이트 (ACC_INV_001~007, 32문항):**

| 기준 | 목표 | 결과 |
|------|------|------|
| 재풀이 가능 문항 | ≥80% | ✅ |
| 계산형 재풀이 | ≥90% | ✅ |
| 보기별 wrongAnswerAnalysis | ≥90% | ✅ |
| Pattern mismatch | Q011/Q012 해결 | ✅ |
| 8단계 출력 | 유지 | ✅ |

**검증:**

```bash
python scripts/validate-phase5-1-tutor.py
python scripts/validate-phase5-engine.py
```

**정책:** `data/*.json` 미변경 · Phase 1 Frozen DB 유지

### Phase 6 Output (Exam Simulation Mode) — ✅ 완료

```
exam.html
css/exam.css
js/exam.js
js/exam-engine.js
scripts/validate-phase6-engine.py
```

**흐름:** 시험 유형 선택 → 랜덤 출제 → 제한 시간 풀이 → 제출 → 결과 분석

| 기능 | 상태 |
|------|------|
| Exam Mode 페이지 | ✅ exam.html |
| 랜덤 출제 | ✅ Fisher-Yates 셔플 · 프리셋(10/20/32문항) |
| 제한 시간 Timer | ✅ 20/40/60분 · 잔여 5분/1분 경고 · 시간 종료 자동 제출 |
| 문항 이동 Navigation | ✅ 번호 그리드 · 이전/다음 |
| 답안 저장 | ✅ 선택 즉시 sessionStorage + examHistory 제출 시 영구 저장 |
| 시험 제출 | ✅ 미응답 확인 · progress/wrongAnswers 반영 |
| 총점·정답률 | ✅ 100점 만점 · 합격 60점 |
| Pattern별 성취도 | ✅ 정답률·등급(우수/양호/보통/취약) |
| 취약 Pattern | ✅ 70% 미만 Pattern 식별 |
| 복습 추천 | ✅ Pattern·오답노트·AI Tutor 링크 |
| data/*.json 수정 | ❌ 금지 |
| examHistory LocalStorage | ✅ 기존 키 사용 (변경 없음) |

**실행:** `python -m http.server 8080` → `/exam.html`

**검증:**

```bash
python scripts/validate-phase6-engine.py
```

### Phase 7 Output (Recommendation Engine) — ✅ 완료

```
recommendation.html
css/recommendation.css
js/recommendation-engine.js
js/recommendation-rules.js
scripts/validate-phase7-recommendation.py
```

**흐름:** LocalStorage 학습 기록 + statistics + AI Tutor Override → Recommendation Score → 오늘의 추천·취약 Pattern·복습 문항

| 기능 | 상태 |
|------|------|
| 오늘의 추천 학습 | ✅ Pattern Score 상위 3개 |
| 취약 Pattern 추천 | ✅ 오답·정답률 기반 |
| 복습 필요 문제 | ✅ 망각 곡선(1·3·7·14·30일) |
| 추천 이유 표시 | ✅ reasons 배열 UI |
| AI Tutor 바로가기 | ✅ 문항별 tutor 링크 |
| data/*.json 수정 | ❌ 금지 |
| Phase 1 Freeze | ✅ 유지 |

**검증:**

```bash
python scripts/validate-phase7-recommendation.py
```

**실행:** `python -m http.server 8080` → `/recommendation.html`

### Phase 7.1 Output (Analytics Dashboard) — ✅ 완료

```
analytics.html
css/analytics.css
js/analytics-engine.js
js/chart-engine.js
scripts/validate-phase7-1-analytics.py
```

**흐름:** LocalStorage(progress/wrongAnswers/recentStudy) + Recommendation → Analytics 리포트 → Dashboard 시각화

| 기능 | 상태 |
|------|------|
| 전체 학습 현황 | ✅ 풀이·정답률·오답률·학습 시간 |
| Pattern 분석 | ✅ 정답률·시도·마지막 학습일·취약도 |
| 학습 성장 그래프 | ✅ 날짜별 풀이량·정답률 (Canvas) |
| 취약점 TOP 3 | ✅ 취약도 점수 기반 |
| Recommendation 연동 | ✅ 오늘 추천 학습 바로가기 |
| data/*.json 수정 | ❌ 금지 |
| 기존 엔진 변경 | ❌ 금지 (Analytics Layer만 추가) |

**검증:**

```bash
python scripts/validate-phase7-1-analytics.py
```

**실행:** `python -m http.server 8080` → `/analytics.html`

### Phase 7.2 Output (Learning Event Tracking) — ✅ 완료

```
js/learning-event.js
js/storage.js (learningEvents key)
js/question-engine.js (optional trackLearningEvent)
js/question.js
js/exam.js
js/analytics-engine.js
scripts/validate-phase7-2-learning-events.py
```

**흐름:** 문제 풀이·AI Tutor·모의시험 → `learningEvents` LocalStorage → `recentStudy` 동기화 → Analytics 실제 학습 시간 반영

| 이벤트 | type | 기록 시점 |
|--------|------|-----------|
| 문제 시작 | `question_start` | 문항 풀이 화면 진입 |
| 답 제출 | `question_answer` | 채점·progress 저장 |
| AI Tutor 확인 | `tutor_view` | AI 해설 최초 표시 |
| 모의시험 완료 | `exam_complete` | 시험 제출 |

**이벤트 필드:** `eventId`, `date`, `timestamp`, `type`, `questionId`, `patternId`, `duration`(초), `correct`, `usedTutor`

| 기능 | 상태 |
|------|------|
| learningEvents LocalStorage | ✅ |
| recentStudy 이벤트 기반 동기화 | ✅ |
| Analytics 실제 학습 시간 | ✅ learningEvents 우선 |
| 기존 exam progress 연동 | ✅ exam_complete만 이벤트 (중복 방지) |
| data/*.json 수정 | ❌ 금지 |
| Phase 1 Freeze | ✅ 유지 |

**검증:**

```bash
python scripts/validate-phase7-2-learning-events.py
```

### Phase 7.3 Output (Learning Timeline Dashboard) — ✅ 완료

```
analytics-timeline.html
css/timeline.css
js/timeline-engine.js
js/analytics-engine.js (Timeline Analytics API 확장)
analytics.html (Timeline 링크)
scripts/validate-phase7-3-timeline.py
```

**흐름:** `learningEvents` LocalStorage → Timeline Analytics 리포트 → Canvas Dashboard

| 기능 | 상태 |
|------|------|
| Daily Study Timeline | ✅ 최근 14일 · 날짜별 학습 시간·풀이량 |
| Accuracy Growth | ✅ 날짜별 정답률 · 3일 이동 평균 |
| Tutor Usage Analytics | ✅ tutor_view 분석 · AI Tutor 활용 비율 |
| Learning Habit | ✅ 피크 시간대 · TOP Pattern · 취약 변화 |
| Canvas 그래프 | ✅ 순수 JS · GitHub Pages 호환 |
| data/*.json 수정 | ❌ 금지 |
| question-engine 변경 | ❌ 금지 |
| Phase 1 Freeze | ✅ 유지 |

**Timeline 리포트 구조:**

- `summary` — 14일 학습 시간·풀이량·평균 정답률·Tutor 활용률
- `dailyTimeline[]` — `{ date, studyMinutes, answered, tutorViews }`
- `accuracyTrend[]` — `{ date, answered, correct, accuracy, movingAverage }`
- `tutorAnalytics` — `{ totalAnswered, tutorViewCount, usageRatio, dailyViews[] }`
- `habits` — `{ peakHour, topPattern, weakPatternChanges[], hourDistribution[] }`

**검증:**

```bash
python scripts/validate-phase7-3-timeline.py
```

**실행:** `python -m http.server 8080` → `/analytics-timeline.html`

## Legacy Roadmap (docs/20)

| Phase | 목표 | 상태 |
|-------|------|------|
| Phase 0 | Project Foundation | ✅ 완료 |
| Phase 1 | Core Data System | ⬜ MVP Phase 2로 대체 |

## First Implementation Target

```
Certification → 감정평가사 → 회계학 → 재고자산
```

회계학은 첫 번째 Subject Template으로 구현한다.

## Local Development

로컬 서버 없이 `index.html`을 브라우저에서 직접 열거나, CORS 회피를 위해 간단한 HTTP 서버 사용:

```bash
# Python 3
python -m http.server 8080

# Node.js (npx)
npx serve .
```

## License

Private — All Rights Reserved
