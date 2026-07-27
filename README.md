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
│   └── llm/
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
- **Sprint 15**: Production Ready

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
