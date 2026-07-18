# AI Tutor v2 품질 검증 보고서

| 항목 | 내용 |
|------|------|
| 검증일 | 2026-07-18 |
| 검증 범위 | Phase 5 AI Tutor v2 (재고자산 6 Pattern · 32문항) |
| 검증 방식 | 코드 정적 분석 · Pattern별 대표 문항 샘플링 · 수험생 관점 평가 |
| 제약 | `data/*.json` 미수정 · Phase 1 Freeze 유지 · UI 변경 없음 |
| 자동 감사 | `scripts/audit-ai-tutor-v2.py` (read-only) |
| 구조 검증 | `scripts/validate-phase5-engine.py` → **PASS** |

---

## 1. 검증 결과 요약

### 1.1 종합 판정

| 영역 | 판정 | 점수(5점) |
|------|------|-----------|
| 아키텍처 (8단계·PDF 미노출·범용 구조) | **PASS** | 5 |
| Pattern 개념 설명 (explanation·examinerIntent) | **PASS** | 4 |
| 암기법 (memoryTip) | **PASS** | 4 |
| 풀이 알고리즘 (solvingAlgorithm) | **PARTIAL** | 3 |
| 오답 보기 분석 (wrongAnswerAnalysis) | **FAIL** | 2 |
| 문항별 재풀이 가능성 (수험생 관점) | **PARTIAL** | 2.5 |
| **종합** | **조건부 PASS** | **3.4 / 5** |

> **결론:** UI·구조·Pattern 개념 과외는 목표에 부합하나, **계산형·혼합형 문항**에서 “다시 풀 수 있는” 수준의 설명 품질은 **미달**. Phase 7(Recommendation Engine) 착수 전 **Phase 5.1 품질 보강** 필요.

### 1.2 8단계 UI 검증

| # | 섹션 | question.html | ai-tutor.html | 비고 |
|---|------|---------------|---------------|------|
| ① | 왜 틀렸는가 / 정답 확인 | ✅ | ✅ | 정답 시 explanation 200자 잘림 |
| ② | 올바른 풀이순서 | ✅ | ✅ | Pattern 공통 단계 |
| ③ | 시험장 생각 순서 | ✅ | ✅ | Pattern별 examThinking |
| ④ | 암기법 | ✅ | ✅ | 두문자·비유·시험장 TIP 포함 |
| ⑤ | 출제자의 함정 | ✅ | ✅ | intent·trap·혼동 3블록 |
| ⑥ | 관련 Pattern | ✅ | ✅ | 학습 포인트·출제 통계 |
| ⑦ | 비슷한 문제 | ✅ | ✅ | relatedQuestions 링크 |
| ⑧ | 다음 추천학습 | ✅ | ✅ | Pattern·오답·모의시험 링크 |

**PDF 해설 노출:** `question.html` solution-panel 제거 확인 · `ai-tutor-engine.js` 내 `getSolutionDisplay` 미사용 → **PASS**

**수준 선택 (기초/표준/심화):** 본문 콘텐츠에 거의 반영되지 않음 → **기능 미완 (LOW)**

---

## 2. Pattern별 상세 검증

검증 샘플: 각 Pattern 대표 1문항 + 전체 문항 키워드 적합도

| Pattern | 샘플 ID | 문항 수 | Profile | 키워드 적합도* | 재풀이 가능? |
|---------|---------|---------|---------|----------------|--------------|
| ACC_INV_001 | Q001 | 5 | ✅ | 67% (4/6) | **PARTIAL** |
| ACC_INV_003 | Q011 | 2 | ✅ | 14% (1/7) | **FAIL** |
| ACC_INV_004 | Q005 | 14 | ✅ | 60% (3/5) | **PARTIAL** |
| ACC_INV_005 | Q014 | 1 | ✅ | 60% (3/5) | **FAIL** |
| ACC_INV_006 | Q002 | 6 | ✅ | 67% (4/6) | **PARTIAL** |
| ACC_INV_007 | Q003 | 4 | ✅ | 20% (1/5) | **FAIL** |

\* Pattern Tutor Profile 키워드가 문항 지문과 얼마나 일치하는지 (audit 스크립트)

---

### ACC_INV_001 — 기말재고 포함 여부 판단

**샘플:** `ACC_INV_Q001` (2018 · FOB·적송·시송·기말재고 금액)

| 항목 | 판정 | 평가 |
|------|------|------|
| explanation | ✅ | 소유권 기준·조정 개념 명확 |
| solvingAlgorithm | ⚠️ | 절차는 맞으나 **문항별 ±금액 산출 단계 없음** |
| wrongAnswerAnalysis | ⚠️ | 숫자 보기 3개 모두 `calc` 동일 사유 → **구분 불가** |
| memoryTip | ✅ | F-W-A-S·택배 비유·시험장 TIP — 암기 가능 |
| examinerIntent | ✅ | 소유권 이전 시점 확인 목적 명확 |
| similarTrap | ✅ | FOB 반대·적송 비율 함정 |

**수험생 관점:** 개념은 이해 가능하나, **1,130,000원 도출 계산 과정 없음** → 같은 유형 변형 문제 재풀이 **어려움**.

---

### ACC_INV_003 — 운반비·부대비용과 재고원가

**샘플:** `ACC_INV_Q011` (조업도·고정원가·최대 영업이익)

| 항목 | 판정 | 평가 |
|------|------|------|
| explanation | ❌ | Profile은 재고원가인데 **문항은 CVP(본·량·利)** |
| solvingAlgorithm | ❌ | VAT·운반비 절차 — **문항과 무관** |
| wrongAnswerAnalysis | ❌ | `calc` 일괄 — 조업도별 손익 오류 구분 불가 |
| memoryTip | ⚠️ | "운반보" 암기법 자체는 좋으나 **이 문항에 부적합** |
| examinerIntent | ❌ | 재고원가 출제 의도 vs 실제 CVP 문항 **불일치** |
| similarTrap | ❌ | Pattern 함정 설명이 문항과 연결 안 됨 |

**근본 원인:** Phase 1 DB `Q011`·`Q012`가 Pattern `ACC_INV_003`과 **내용 불일치** (Frozen DB 이슈, Tutor 엔진만으로 해결 불가).

**수험생 관점:** **재풀이 불가** — 설명과 문제가 다른 주제.

---

### ACC_INV_004 — 매출원가 계산 (PER법)

**샘플:** `ACC_INV_Q005` (재공품·제조원가·매출원가)

| 항목 | 판정 | 평가 |
|------|------|------|
| explanation | ⚠️ | PER 역산 설명은 맞으나 **제조원가 흐름(재공품→제품) 미언급** |
| solvingAlgorithm | ⚠️ | `기초+매입-기말`만 — **제조형 매출원가 단계 없음** |
| wrongAnswerAnalysis | ⚠️ | 금액 보기 전부 동일 `calc` / `formula` |
| memoryTip | ✅ | "기매기" 두문자·T자 계정식 — PER 문항에 유효 |
| examinerIntent | ✅ | PER·기초매입기말 관계 — 부분 적합 |
| similarTrap | ✅ | PER/PR 혼동·기말 누락 |

**수험생 관점:** 순수 PER 상품매매형(14문항 중 다수)에는 **양호**. 제조·원가계산형(Q005 등)은 **재풀이 불가**.

---

### ACC_INV_005 — PER vs PR 재고조사법

**샘플:** `ACC_INV_Q014` (유일 문항 · PER/PR + LCM + 실제재고수량)

| 항목 | 판정 | 평가 |
|------|------|------|
| explanation | ⚠️ | PER/PR 정의는 맞으나 **LCM·매출원가 역산 수량 계산 없음** |
| solvingAlgorithm | ❌ | 4단계 일반론 — **min(100,80)·36,000 역산 미포함** |
| wrongAnswerAnalysis | ⚠️ | "40개"~"80개" 보기 구분 없음 |
| memoryTip | ✅ | PER=Physical / PR=Perpetual — 개념 암기 가능 |
| examinerIntent | ⚠️ | PER/PR만 강조 — 실제 문항은 **혼합형** |
| similarTrap | ✅ | PER/PR 절차 혼동 함정 |

**수험생 관점:** **재풀이 불가** — 유일 기출인데 설명이 계산형 요구를 충족하지 못함.

---

### ACC_INV_006 — FIFO·총평균법 매출원가

**샘플:** `ACC_INV_Q002` (FIFO·총평균·실지/계속 · 옳지 않은 것)

| 항목 | 판정 | 평가 |
|------|------|------|
| explanation | ✅ | FIFO·총평균·실지/계속 구분 명확 |
| solvingAlgorithm | ⚠️ | "표 정리"까지 — **Q002 표 채우기 예시 없음** |
| wrongAnswerAnalysis | ⚠️ | 5개 서술 보기 — 키워드 히ュー리스틱으로 **보기별 맞춤 부족** |
| memoryTip | ✅ | FIFO·총평균 공식·시험장 체크 — 우수 |
| examinerIntent | ✅ | 평가방법·조사법 조합 확인 |
| similarTrap | ✅ | 이익大小·실지/계속 혼동 |

**수험생 관점:** 개념형은 **가능**, Q002급 계산·판별형은 **표 없이 재풀이 어려움**.

---

### ACC_INV_007 — LCM·순실현가능가치 평가

**샘플:** `ACC_INV_Q003` (재고자산 회계기준 · 옳지 않은 것)

| 항목 | 판정 | 평가 |
|------|------|------|
| explanation | ⚠️ | LCM·NRV 설명은 맞으나 **문항은 기준서 O/X** |
| solvingAlgorithm | ❌ | NRV 숫자 계산 절차 — **개념 판별 문항에 부적합** |
| wrongAnswerAnalysis | ⚠️ | ①~④ 각 기준 문장별 분석 없음 → `generic`/`nrv` 혼재 |
| memoryTip | ✅ | LCM=min·NRV 공식·시험장 min( ) — LCM 계산형에 유효 |
| examinerIntent | ⚠️ | LCM 계산 의도 vs **기준서 지식** 문항 |
| similarTrap | ✅ | NRV·추가원가·FV 혼동 |

**수험생 관점:** Q003(개념) **재풀이 어려움** — ⑤번 "중개기업·기타포괄손익" 오류 이유가 Tutor에 **명시되지 않음**.

---

## 3. 발견 문제

### 3.1 Critical (즉시 개선 필요)

| ID | 문제 | 영향 |
|----|------|------|
| C-01 | **Pattern 단위 생성만** — 32문항 개별 풀이·계산 미반영 | 계산형 22문항+ 재풀이 불가 |
| C-02 | **wrongAnswerAnalysis 히ュー리스틱 중복** — 숫자 보기 → 동일 `calc` 사유 (평균 다양성 **28%**) | "왜 이 보기가 틀렸는지" 요구 미충족 |
| C-03 | **ACC_INV_003 DB-Profile 불일치** (Q011 CVP, Q012 현금지출) | Pattern 2문항 전부 **오설명** |
| C-04 | **정답 시 ① 섹션 explanation 200자 truncate** | 정답자 학습 가치 저하 |

### 3.2 High

| ID | 문제 | 영향 |
|----|------|------|
| H-01 | ACC_INV_005 유일 문항(Q014) — PER/PR+LCM **혼합 계산** 미지원 | Pattern 전체 FAIL |
| H-02 | ACC_INV_007 개념형(Q003) vs 계산형 Profile **유형 미분기** | 기준서 O/X 문항 오답 분석 빈약 |
| H-03 | `level`(기초/표준/심화) **본문 미반영** | UI 컨트롤 허상 |
| H-04 | ACC_INV_004 제조원가형(Q005 등) — PER 상품형 알고리즘 **일괄 적용** | 14문항 중 일부 mismatch |

### 3.3 Medium

| ID | 문제 | 영향 |
|----|------|------|
| M-01 | ⑦ 유사 문제 — ID만 표시, **난이도·유형 힌트 없음** | 학습 경로 안내 약함 |
| M-02 | ACC_INV_001 memoryTip "F-W-A-S" — **위탁(W)과 적송(A) 용어 혼선** 가능 | 암기 혼동 위험 |
| M-03 | ai-tutor.html — 오답 문항만 접근, **정답 문항 과외 불가** | 사용 시나리오 제한 |

---

## 4. 개선 필요 항목 (Phase 5.1 제안)

> `data/*.json` 변경 없이 가능한 항목 / Freeze 해제 후 가능 항목 구분

### 4.1 UI 레이어 (Freeze 유지 가능)

1. **문항 유형 분기:** `옳지 않은 것` / `계산형` / `개념형` — solvingAlgorithm·wrongAnswerAnalysis 분기
2. **questionId별 Tutor Override Map** — `js/ai-tutor-content/` (32문항, DB 미변경)
3. **wrongAnswerAnalysis 고도화:** 보기 텍스트·정답과의 차이 기반 **보기별 고유 사유** (최소 대표 32문항)
4. **정답 ① 섹션** — truncate 제거, full explanation + 전 보기 오답 이유
5. **level 반영:** beginner=용어 풀어쓰기, advanced=함정·변형 TIP 추가
6. **ACC_INV_003 Q011/Q012** — Override로 **실제 주제(CVP·현금지출)** 임시 설명 (Pattern ID는 유지)

### 4.2 Phase 1 연계 (Freeze 정책 협의 필요)

1. Q011/Q012 Pattern 재분류 또는 `patternId` 보정
2. PDF 추출 품질 — `question`/`choices` 파싱 오류(Q014 ⑤번 보기 오염 등)

### 4.3 검증 체계

1. `scripts/audit-ai-tutor-v2.py` → CI 품질 게이트 (키워드 적합도·reason diversity 임계치)
2. 문항별 "재풀이 가능" 수동 체크리스트 (32문항)

---

## 5. 수험생 관점 최종 답변

> **"실제 시험 준비생이 이 설명을 보고 다시 문제를 풀 수 있는가?"**

| Pattern | 답변 | 이유 |
|---------|------|------|
| ACC_INV_001 | **부분적 Yes** | FOB·적송 개념 OK, **금액 계산 단계 없음** |
| ACC_INV_003 | **No** | Profile과 문항 주제 불일치 |
| ACC_INV_004 | **부분적 Yes** | PER 상품형 OK, **제조형 No** |
| ACC_INV_005 | **No** | 유일 문항 계산 풀이 없음 |
| ACC_INV_006 | **부분적 Yes** | FIFO·총평균 개념 OK, **표 계산 예시 없음** |
| ACC_INV_007 | **부분적 No** | LCM 암기 OK, **기준서 O/X 보기별 분석 없음** |

**종합:** 32문항 중 **즉시 재풀이 가능** 추정 8~10문항(개념·Pattern 일치), **나머지 22문항**은 보강 없이 **불충분**.

---

## 6. Phase 7 진행 여부

### 권고: **Phase 7 착수 보류 (Phase 5.1 우선)**

| Phase | 내용 | 권고 |
|-------|------|------|
| Phase 5.1 | AI Tutor 품질 보강 (문항 Override·오답 분석·유형 분기) | **즉시 착수** |
| Phase 7 | Recommendation Engine (오늘의 학습·복습 추천) | **보류** |

**보류 사유:**

1. Recommendation Engine 입력(오답·정답률·Pattern 취약도) 품질은 **Tutor·풀이 경험**에 의존
2. Tutor가 계산형·불일치 문항에서 **오설명**하면 추천·학습 루프 전체 신뢰도 하락
3. ACC_INV_003 전면 FAIL — **2문항이지만 Pattern 신뢰 붕괴** 사례

**Phase 7 착수 조건 (제안):**

- [ ] 32문항 중 **재풀이 가능** 판정 ≥ 80% (현재 ~30%)
- [ ] wrongAnswerAnalysis **보기별 고유 사유** ≥ 90%
- [ ] Pattern 키워드 적합도 평균 ≥ 70% (현재 ~30%)
- [ ] `validate-phase5-engine.py` + `audit-ai-tutor-v2.py` 품질 게이트 PASS

---

## 7. 부록

### 7.1 검증 파일 매핑

| 파일 | 검증 결과 |
|------|-----------|
| `js/ai-tutor-engine.js` | 구조 PASS · 콘텐츠 depth PARTIAL |
| `js/ai-tutor-render.js` | 8단계 렌더 PASS |
| `question.html` | PDF 미노출 PASS · Tutor 자동 표시 PASS |
| `ai-tutor.html` | 오답 전용 UX PASS · 범위 제한 MEDIUM |

### 7.2 자동 감사 수치 (2026-07-18)

```
Pattern keyword fit (avg):  ACC_INV_001 33% | 003 14% | 004 36% | 005 60% | 006 28% | 007 10%
Wrong-reason diversity:     ACC_INV_001 28% | 003 25% | 004 29% | 005 25% | 006 29% | 007 29%
```

### 7.3 코드 리뷰

| 항목 | 결과 |
|------|------|
| PDF 해설 미노출 | **PASS** |
| 8단계 범용 구조 | **PASS** |
| 7개 Tutor Content 필드 | **PASS** (생성은 Pattern 수준) |
| memoryTip 암기 요건 | **PASS** (Pattern 프로필) |
| wrongAnswerAnalysis 보기별 | **FAIL** |
| 수험생 재풀이 가능성 | **PARTIAL** |
| **코드 리뷰 종합** | **FAIL** (콘텐츠 품질 기준) |

---

*본 문서는 AI Tutor v2 품질 검증 전용이며, Phase 1 Frozen Database 정책을 변경하지 않는다.*
