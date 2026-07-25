# M1 Learning Loop — Launch Guide

Milestone: **M1 Learning Loop MVP**  
Audience: Human / QA / Navigator  
Related: `docs/learning-loop-m1-report.md`

---

## 1. 무엇을 검증하는가

AI 추천·Mastery 계산이 **아닙니다**.  
아래 **한 사이클**만 확인합니다.

```text
Question
  → Student Answer
  → Runtime Grader
  → Attempt Event
  → Student Learning State
  → Learning Dashboard
```

| 항목 | 기대 |
|------|------|
| Mastery | 항상 `unknown` |
| Recommendation | `absent` |
| Question / Answer / Pattern SoT | 읽기만 · 변경 없음 |

---

## 2. 사전 조건

- 저장소 루트: `AI Exam Learning Platform v2`
- 브라우저: ES Modules + LocalStorage 지원 (Chrome / Edge / Firefox 권장)
- 데모 문항 파일 존재:
  - `data/knowledge/pilot/2018/candidate/ACC_2018_Q042.json`
- **`file://`로 HTML을 직접 열지 말 것** — `fetch`로 JSON을 읽으므로 로컬 HTTP 서버 필요

---

## 3. 로컬 실행 (권장)

### 3.1 서버 기동

저장소 루트에서:

```bash
python -m http.server 8080
```

또는:

```bash
npx serve .
```

### 3.2 페이지 열기

브라우저에서:

```text
http://localhost:8080/learning-loop.html
```

홈 경유:

```text
http://localhost:8080/index.html
  → [M1 Learning Loop]
```

---

## 4. 수동 Acceptance 시나리오

### Step A — Open Question

1. `learning-loop.html` 로드
2. 좌측 **Question**에 `ACC_2018_Q042` stem·선지 표시
3. 우측 Dashboard 초기값:
   - Attempts / Correct / Wrong = `0`
   - Observed Accuracy = `—`
   - Mastery = `unknown`
   - Recommendation = `absent`

**PASS:** 문항 로드 · Mastery unknown · 추천 없음

### Step B — Submit (오답)

1. 정답이 아닌 선지 선택 (정답은 **③** / `3`)
2. **Submit answer** 클릭
3. 피드백: `Wrong · Attempt evt_m1_…`
4. Dashboard:
   - Attempts `1`
   - Wrong `1`
   - Correct `0`
   - Observed Accuracy `0%`
   - Mastery 여전히 `unknown`

**PASS:** Grader + Attempt + State + Dashboard 갱신

### Step C — Submit (정답)

1. 선지 **3** 선택 후 Submit
2. 피드백: `Correct · Attempt …`
3. Dashboard:
   - Attempts `2`
   - Correct `1` · Wrong `1`
   - Observed Accuracy `50%`
   - Mastery `unknown` · Recommendation `absent`

**PASS:** 카운터만 증가 · Mastery/추천 불변

### Step D — Reset (선택)

1. **Reset demo state** 클릭
2. LocalStorage 데모 키 초기화 · 카운터 0으로 복귀

---

## 5. LocalStorage 키 (확인용)

DevTools → Application → Local Storage:

| Key | 내용 |
|-----|------|
| `learning.attempts.v1` | AttemptEvent 로그 (append-only) |
| `learning.state.v1` | Student Learning State |

Constitution 키(`progress`, `wrongAnswers`, …)는 M1이 **이름을 바꾸지 않음**.

---

## 6. 모듈 맵

| 단계 | 파일 |
|------|------|
| Grade | `runtime/grader.js` |
| Attempt Persist | `runtime/attempt-service.js` |
| State Update | `runtime/state-update.js` |
| Orchestrator | `runtime/learning-loop.js` |
| UI | `learning-loop.html` · `js/learning-loop-page.js` |

설계 문서:

- `docs/runtime-grader-design.md`
- `docs/attempt-pipeline.md`
- `docs/learning-loop-m1-report.md`

---

## 7. 데모 데이터 고정값

| Field | Value |
|-------|-------|
| student_id | `m1_demo_student` |
| question_id | `ACC_2018_Q042` |
| pattern_id | `ACC_INV_001` (verified) |
| correct answer | `3` (①=1 … ⑤=5) |
| answer source (read-only) | pilot candidate JSON |

---

## 8. FAIL 시 점검

| 증상 | 원인 · 조치 |
|------|-------------|
| 문항 안 뜸 / Load error | `file://` 사용 중 → HTTP 서버로 재실행 · JSON 경로 확인 |
| Submit 무반응 | 선지 미선택 · 콘솔 모듈 import 오류 확인 |
| Mastery가 unknown이 아님 | M1 범위 위반 — `runtime/state-update.js`가 policy를 호출하지 않는지 확인 |
| 추천 문구 표시 | Dashboard는 recommendation UI 없음이 정상 · `absent`만 표시 |
| CORS / failed to fetch | 서버 루트가 저장소 루트인지 확인 |

---

## 9. GitHub Pages

배포 후:

```text
https://<org-or-user>.github.io/<repo>/learning-loop.html
```

로컬과 동일 Acceptance 시나리오(§4)를 반복한다.

---

## 10. M1 완료 판정

아래가 모두 참이면 **Launch PASS**:

- [ ] Question 로드
- [ ] Submit → correct/wrong 피드백
- [ ] Attempt LocalStorage 생성
- [ ] Learning State 카운터 갱신
- [ ] Dashboard 갱신
- [ ] Mastery = unknown
- [ ] Recommendation = absent
- [ ] Question / Answer / Pattern 파일 미수정

상세 완료 보고: `docs/learning-loop-m1-report.md`
