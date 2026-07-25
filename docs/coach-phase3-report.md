# Coach Phase C3 Report — Weakness Diagnosis Engine

작성일: 2026-07-20  
상태: **완료 — 승인 요청**

---

## 1. 변경 파일

### 생성

| 파일 | 역할 |
|------|------|
| `js/coach/models/weakness-report.js` | WeaknessReport schema |
| `js/coach/config/weakness-config.js` | 판정 임계값 (하드코딩 금지) |
| `data/coach/weakness-config.json` | 동일 config (검증·동기화) |
| `js/coach/diagnosis/severity-rules.js` | severity / trend 규칙 |
| `js/coach/diagnosis/weakness-engine.js` | Attempt → Report |
| `js/coach/stores/weaknessStore.js` | `coach.weakness.v1` |
| `data/coach/mock-weakness.json` | 진단 스냅샷 (재현 검증) |
| `data/coach/phase3-protected-checksums.json` | 보호 파일 checksum |
| `scripts/validate-coach-phase3.py` | C3 검증 |
| `docs/coach-phase3-report.md` | 본 보고서 |

### 수정

| 파일 | 변경 |
|------|------|
| `js/storage.js` | `COACH_WEAKNESS_V1` 추가 |
| `js/coach/index.js` | C3 export |
| `js/coach/README.md` | C3 문서 |
| `data/coach/mock-attempts.json` | 시나리오 보강 (improving / mastered / timeout) |
| `README.md` / `docs/33-…` | roadmap |

### 미수정 (checksum 동일)

Parser · exam_pipeline · question-db-mvp · Question Engine · Display · Tutor · Recommendation · progress/wrongAnswers

---

## 2. Architecture

```
coach.attempts.v1  (C2 QuestionAttempt[])
        │
        ▼
WeaknessDiagnosisEngine
  ├─ group by patternId (Canonical)
  ├─ metrics: attempts / accuracy / avg elapsed
  ├─ recentTrend (config window)
  └─ severity (config thresholds)
        │
        ▼
WeaknessReport[]
        │
        ▼
weaknessStore.saveReports()
        │
        ▼
LocalStorage: coach.weakness.v1
```

**범위:** 진단 데이터 생성만. 추천·설명·LLM·Parser 연동 없음.

---

## 3. Diagnosis algorithm

1. Attempt를 `patternId`로 그룹, `timestamp` 오름차순 정렬  
2. Pattern별 계산:
   - `totalAttempts`, `correctCount`, `wrongCount`
   - `accuracy = correct / total`
   - `averageElapsedSeconds`
3. `recentTrend`: 최근 `recentWindow`(5) 정답률 − 이전 구간 정답률  
   - ≥ `improvingDelta` → `improving`  
   - ≤ `decliningDelta` → `declining`  
   - else `stable` / 데이터 부족 시 `insufficient_data`
4. `severity` = config 규칙 적용 (아래)
5. `generatedAt` 고정 가능(검증용) — 엔진 옵션

동일 입력 → 동일 출력 (deterministic).

---

## 4. Severity rule (config)

출처: `data/coach/weakness-config.json` / `js/coach/config/weakness-config.js`

| severity | 조건 (요약) |
|----------|-------------|
| `mastered` | attempts ≥ 3 AND accuracy ≥ 0.85 |
| `critical` | accuracy ≤ 0.35 AND wrong ≥ 3 |
| `weak` | accuracy ≤ 0.55 (critical 미해당) |
| `normal` | 그 외 / 시도 부족 |
| timeout boost | avgElapsed ≥ 300 → normal→weak; weak+acc≤0.5 → critical |

엔진 코드에 임계값 리터럴을 두지 않음.

---

## 5. Regression 결과

```
py -3 scripts/validate-coach-phase3.py
→ PASS Coach Phase C3
  reports: 9
  deterministic: ok
  protected checksums: ok
```

시나리오 검증:

| 케이스 | pattern | 결과 |
|--------|---------|------|
| 반복 오답 | `ACC_INV_003` | severity=`critical`, acc≈0.29 |
| 시간 초과 | `ACC_FIN_001` | avgElapsed≥300, severity=`critical` |
| 최근 상승 | `ACC_PPE_002` | recentTrend=`improving` |
| 완전 숙달 | `ACC_EQ_001` | severity=`mastered`, acc≈0.86 |

---

## 6. 다음 Phase 제안

**Phase C4 — Learning Planner**

입력: WeaknessReport (`critical`/`weak`) + UserProfile(시험일/목표)  
출력: StudyPlan (기간·우선 pattern·일일 문항 수)  
금지: LLM 실연결, Parser 침투, “강의 추천” 카피 생성은 Planner 범위에서 최소 규칙만.

---

## 승인 요청

Phase C3(진단 전용 Weakness Engine) 완료를 보고하며 **승인을 요청**한다.
