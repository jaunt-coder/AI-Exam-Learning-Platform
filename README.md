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
| **Phase 5** | **AI Explanation** | **✅ 완료** |
| **Phase 6** | **Exam Simulation Mode** | **✅ 완료** |

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

### Phase 5 Output (AI Explanation) — ✅ 완료

```
js/ai-tutor-engine.js
js/ai-tutor.js
ai-tutor.html
css/ai-tutor.css
scripts/validate-phase5-engine.py
```

**흐름:** 채점 후 AI 설명 생성 · 오답 시 자동 생성 · 독립 AI Tutor 페이지

| 기능 | 상태 |
|------|------|
| 문제별 AI 설명 버튼 | ✅ question.html 채점 후 패널 |
| 입력 (문제·정답·해설·Pattern·오답) | ✅ Frozen DB + gradeAnswer 결과 |
| 출력 (왜 틀렸는지·핵심 개념·암기 방법) | ✅ 수준별(beginner/intermediate/advanced) |
| 로컬 규칙 엔진 | ✅ 외부 API 없음 (GitHub Pages 호환) |
| 독립 AI Tutor 페이지 | ✅ ai-tutor.html (오답 문항 선택) |
| data/*.json 수정 | ❌ 금지 |

**실행:** `python -m http.server 8080` → `/question.html` 또는 `/ai-tutor.html`

**검증:**

```bash
python scripts/validate-phase5-engine.py
```

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
