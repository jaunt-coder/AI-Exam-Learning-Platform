# Coach Phase C2 Report — QuestionAttempt 계약

작성일: 2026-07-20  
상태: **완료 — 승인 요청**

---

## 1. 변경 파일 목록

### 생성

| 파일 | 역할 |
|------|------|
| `js/coach/models/question-attempt.js` | C2 Attempt schema / validate |
| `js/coach/stores/attemptStore.js` | append-only store (`coach.attempts.v1`) |
| `js/coach/adapters/question-engine-adapter.js` | Engine 결과 → Attempt (비침투) |
| `data/coach/mock-attempts.json` | Mock 22건 |
| `data/coach/phase2-protected-checksums.json` | 보호 파일 checksum baseline |
| `scripts/validate-coach-phase2.py` | C2 검증 |
| `docs/coach-phase2-report.md` | 본 보고서 |

### 수정 (Coach/문서만)

| 파일 | 변경 |
|------|------|
| `js/storage.js` | `COACH_ATTEMPTS_V1: 'coach.attempts.v1'` 추가 |
| `js/coach/index.js` | C2 export 추가 |
| `js/coach/README.md` | C2 문서 |
| `docs/33-ai-exam-coach-agent-spec.md` | C2 상태 |
| `README.md` | LocalStorage 키 · roadmap |

### 미수정 (보호 — checksum 검증)

- `scripts/parser/*`
- `scripts/exam_pipeline/*`
- `data/question-db-mvp.json`
- `js/question-engine.js`
- Display / AI Tutor / Recommendation 관련 JS

---

## 2. 데이터 흐름

```
Question Engine (기존, 미수정)
        │
        │  submit/grade 결과 객체
        ▼
question-engine-adapter.js
  toQuestionAttempt() / recordAttemptFromEngine()
        │
        ▼
QuestionAttempt (C2 schema)
  id, questionId, patternId(Canonical),
  timestamp(ISO), answer, correctAnswer,
  isCorrect, elapsedSeconds,
  attemptType(practice|exam|review),
  source(question-engine|mock|import)
        │
        ▼
attemptStore.addAttempt()  ← append-only (push)
        │
        ▼
LocalStorage key: coach.attempts.v1
        │
        ▼
(향후) Weakness Diagnosis Agent — C3
```

C1 legacy key `questionAttempts`는 **유지**하며 C2와 병행한다.  
`progress` / `wrongAnswers` / `bookmarks` / `examHistory`는 읽지도 쓰지도 않는다.

---

## 3. 기존 시스템 영향 여부

| 영역 | 영향 |
|------|------|
| Parser / IR / QuestionBuilder | **없음** |
| exam_pipeline | **없음** |
| question-db-mvp.json | **없음** |
| Question Engine 본문 | **없음** (adapter만) |
| Display / AI Tutor / Recommendation | **없음** |
| wrongAnswers / progress / bookmarks | **없음** (삭제·변경 없음) |

연결 방식: 향후 UI/엔진 호출측이 `recordAttemptFromEngine()`을 **선택적으로** 호출.  
이번 Phase에서는 Engine 파일을 수정하지 않았으므로 런타임 자동 기록은 아직 없다(계약·스토어·adapter 준비 완료).

---

## 4. 테스트 결과

```
py -3 scripts/validate-coach-phase2.py
→ PASS Coach Phase C2
  mock attempts: 22
  key: coach.attempts.v1
  append-only: addAttempt push-only
  question-engine: not invaded
  protected checksums: ok (37 files)
```

Mock 포함 시나리오:

- 정답 / 오답
- `ACC_INV_003` 반복 실패
- 시간 초과 (`elapsedSeconds >= 300`, 미응답 `answer: null` 포함)
- `attemptType`: practice / exam / review
- `source`: mock / question-engine / import

---

## 5. 다음 Phase 제안

**Phase C3 — Weakness Diagnosis Engine**

입력: `coach.attempts.v1` + PatternMaster(`pattern-db-mvp.json`)  
출력: `WeaknessReport` (C1 모델 재사용 또는 C2 evidenceAttemptIds 연결)

구현하지 않을 것 (C3에서도 제한 권장):

- LLM/AI API 실연결
- 추천 알고리즘 고도화
- Parser / QuestionBuilder 침투

---

## 승인 요청

Phase C2(데이터 계약·append-only Store·비침투 Adapter) 완료.  
**승인 후 Phase C3 진행**을 요청한다.
