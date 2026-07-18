# Alpha Test Plan — MVP 수험생 사용성 검증

- 버전: Alpha 1.0
- 대상: AI Exam Learning Platform v2 (MVP 240문항)
- 검증 관점: **개발자가 아닌 실제 수험생**
- DB: `data/question-db-mvp.json` (read-only)
- 실행 환경: 로컬 HTTP 서버 (`python -m http.server 8080`)

---

## 1. 목적

MVP 플랫폼이 수험생 학습 흐름에서 **끊김 없이 동작**하는지 확인한다.

| 영역 | 확인 내용 |
|------|-----------|
| 탐색 | 홈 → Pattern → 문제 선택 |
| 풀이 | 채점 · 정오답 표시 · 다음 문제 |
| 복습 | 오답 저장 · 오답 노트 · AI Tutor |
| 지속 학습 | 다음날 Recommendation |

---

## 2. 사전 준비

### 2.1 실행

```bash
cd "AI Exam Learning Platform v2"
python -m http.server 8080
```

브라우저: `http://localhost:8080/index.html`

### 2.2 초기화 (선택)

Alpha Test 시작 전 LocalStorage 초기화:

1. DevTools → Application → LocalStorage
2. `progress`, `wrongAnswers` 삭제
3. 새로고침

### 2.3 자동 사전 점검

```bash
py -3 scripts/alpha-test-report.py
```

`docs/alpha-test-report.md` 생성 · 흐름 연결 · 30문항 세트 · 시나리오 시뮬레이션 확인.

---

## 3. 핵심 사용자 흐름 (Flow 1)

수험생이 **처음 방문**했을 때 아래 순서를 따라 PASS/FAIL을 기록한다.

| Step | 페이지 | 행동 | PASS 기준 |
|------|--------|------|-----------|
| 1 | `index.html` | 「Pattern 학습 Dashboard」 클릭 | `pattern.html` 로드, Pattern 목록 표시 |
| 2 | `pattern.html` | Pattern 1개 선택 | Pattern 상세 · 문항 목록 링크 표시 |
| 3 | `pattern.html` | 「문제 풀이 시작」 또는 문항 링크 | `question.html?pattern=…&id=…` 로드 |
| 4 | `question.html` | 보기 선택 → 「채점」 | 정오답 패널 표시 |
| 5 | `question.html` | 채점 직후 | AI Tutor 패널 자동 표시 |
| 6 | `question.html` | 오답 시 | 「오답 노트에 저장」 안내 표시 |
| 7 | `wrong-note.html` | 헤더 메뉴 이동 | 방금 오답 문항 목록에 표시 |
| 8 | `ai-tutor.html` | 오답 문항 선택 | 8단계 Tutor Lesson 표시 |
| 9 | `recommendation.html` | 헤더 메뉴 이동 | 추천 목록 또는 「데이터 준비 중」 안내 |

**전체 Flow PASS**: Step 1~9 중 치명적 오류(페이지 깨짐·채점 불가·데이터 미로드) 없음.

---

## 4. 수험생 시나리오 (Scenarios A~D)

### Scenario A — 처음 공부하는 Pattern 선택

**상황**: 감정평가사 회계학을 처음 시작하는 수험생.

| # | 행동 | 기대 결과 |
|---|------|-----------|
| A1 | `index.html` 접속 | MVP DB 로드 성공 메시지(또는 문항 수 표시) |
| A2 | `pattern.html` → Pattern Dashboard | 18개 Pattern · 등급 · 빈도 표시 |
| A3 | 미풀이 Pattern 선택 (예: `ACC_INV_003`) | Pattern 설명 · 학습 포인트 · 문항 수 확인 |
| A4 | 첫 문항 풀이 | 문제 지문·5지선다 가독성 확인 (footer 잡음 없음) |
| A5 | 정답 제출 | 세션 점수 · 다음 문제 버튼 |

**기록**: Pattern명, 문항 ID, 지문 가독성(상/중/하), FAIL 사유

---

### Scenario B — 문제 풀이 후 오답 저장

**상황**: 고의로 오답 선택 후 복습 흐름 확인.

| # | 행동 | 기대 결과 |
|---|------|-----------|
| B1 | 계산형 문항 1개 풀이 (오답) | 오답 패널 · 정답 보기 강조 |
| B2 | 「다음 문제」 또는 홈 이동 | LocalStorage `wrongAnswers`에 저장 |
| B3 | `wrong-note.html` | 오답 문항 · Pattern · 횟수 표시 |
| B4 | 「오답 다시 풀기」 | `question.html?…&retry=1` 이동 |
| B5 | 동일 문항 정답 처리 | 오답 노트에서 제거(또는 횟수 갱신) |

**테스트 문항**: Alpha 세트 계산형 15개 중 3개 이상 수행 권장.

---

### Scenario C — AI Tutor 확인

**상황**: 오답 직후 · AI Tutor 페이지에서 해설 품질 확인.

| # | 행동 | 기대 결과 |
|---|------|-----------|
| C1 | `question.html` 오답 채점 | Tutor 패널 자동 렌더 |
| C2 | 난이도 탭 (기초/표준/심화) 전환 | 내용 갱신 |
| C3 | 「AI Tutor에서 자세히」 링크 | `ai-tutor.html?id=…&selected=…` |
| C4 | 8단계 섹션 확인 | why-wrong · solving-order · memory-tip 등 |
| C5 | 계산형 1문항 | calculation template 단계 포함 여부 |

**품질 체크**: Pattern명 일치 · 정답 번호 일치 · 오답 분석 4개 이상.

---

### Scenario D — 다음날 Recommendation 확인

**상황**: 전일 학습 기록이 반영되는지 확인.

| # | 행동 | 기대 결과 |
|---|------|-----------|
| D1 | Scenario B 완료 상태 유지 | `progress` · `wrongAnswers` 데이터 존재 |
| D2 | `recommendation.html` | 취약 Pattern · 복습 필요 문제 표시 |
| D3 | 추천 Pattern 클릭 | `pattern.html?pattern=…` 연결 |
| D4 | 추천 문항 클릭 | `question.html?…&retry=1` 연결 |
| D5 | (선택) DevTools에서 `lastWrongAt` 날짜 조작 | 복습 due 로직 반영 |

**초기 상태**: 학습 기록 없으면 「추천 데이터 준비 중」 — 정상.

---

## 5. 검증 데이터 — 30문항 세트

자동 생성: `scripts/alpha-test-report.py` → `docs/alpha-test-report.md` §Test Set

| 유형 | 목표 | MVP DB 현황 |
|------|------|-------------|
| 계산형 | 15 | `hasCalculation=true` (226문항) |
| 개념형 | 10 | `hasCalculation=false` (14문항) |
| 표 문제 | 5 | `hasTable=true` 2건 + 표 형식 stem 3건 보완 |

### 유형 정의

- **계산형**: `hasCalculation === true`
- **개념형**: `hasCalculation === false` && `hasTable === false`
- **표 문제**: `hasTable === true` 또는 stem에 `구분/기초/기말`, `예산/실제`, `○…W…W` 패턴

### Alpha Tester 기록 양식

각 문항별:

```
ID: ACC_xxxx_Qxxx
유형: 계산형 | 개념형 | 표
가독성: 상 | 중 | 하
채점: PASS | FAIL
Tutor: PASS | FAIL | SKIP
메모:
```

---

## 6. PASS / FAIL 기준

### Alpha Release Gate

| 항목 | PASS |
|------|------|
| MVP 240문항 로드 | 100% |
| Flow 1 (Step 1~9) | 치명적 오류 0건 |
| Scenario A~D | 각 시나리오 핵심 Step PASS |
| 30문항 세트 | 27/30 이상 채점·Tutor PASS |
| P0 이슈 | 0건 |

### 심각도

| 등급 | 정의 | 예시 |
|------|------|------|
| P0 | 학습 불가 | DB 로드 실패, 채점 불가, 빈 화면 |
| P1 | 학습 저해 | 지문 footer 잔존, Tutor 빈 섹션, 오답 미저장 |
| P2 | UX 불편 | 홈 문구 구버전, 표 미렌더, 모바일 레이아웃 |

---

## 7. 테스트 일정 (권장)

| Day | 작업 |
|-----|------|
| D-1 | `alpha-test-report.py` 실행 · 30문항 세트 확인 |
| D0 AM | Scenario A + Flow 1 |
| D0 PM | Scenario B + C (30문항 중 15) |
| D1 AM | Scenario D + 잔여 15문항 |
| D1 PM | 이슈 정리 · 우선순위 회의 |

---

## 8. 산출물

| 파일 | 설명 |
|------|------|
| `docs/alpha-test-plan.md` | 본 문서 |
| `docs/alpha-test-report.md` | 자동 분석 + 수동 기록 템플릿 |
| `scripts/alpha-test-report.py` | 사전 점검 스크립트 |

---

## 9. 제약 (Alpha Test 중)

- `data/*.json` **수정 금지**
- 엔진 코드 **최소 변경** (Alpha 중 버그fix만, 기능 추가는 Beta)
- LocalStorage key 변경 금지

---

## 10. 빠른 링크 (MVP)

| 페이지 | URL |
|--------|-----|
| 홈 | `/index.html` |
| Pattern | `/pattern.html` |
| 문제 | `/question.html` |
| 오답 노트 | `/wrong-note.html` |
| AI Tutor | `/ai-tutor.html` |
| 추천 | `/recommendation.html` |
| Phase 1 fallback | `?db=phase1` |
