# Beta Review Report — M2.7 Beta Readiness Review

Status: **COMPLETE**  
Date: 2026-07-24  
Reviewer: `08_Learning_Experience_Designer` (Product Reviewer)  
Baseline: M2.5 Study Experience Beta Polish + M2.6 Evidence Pad  
Method: Student-perspective Walkthrough (code + live `learning-loop.html`)

---

## Verdict (요약)

# ❌ Beta Not Ready

**질문:** 오늘부터 실제 감정평가사 수험생이 **매일** 이 프로그램으로 공부해도 되는가?  
**답:** **NO**

| Metric | Value |
|--------|-------|
| Beta Readiness Score | **46 / 60** |
| Band | **Major Polish Required** (40–47) |
| Beta Freeze | **권장하지 않음** |
| Next | **Sprint-04 Beta Gate Polish** 제안 |

---

## Review Scope

| In | Out |
|----|-----|
| Flow · UX · Immersion · Observation Pad | 새 기능 |
| Presentation 완성도 | Recommendation / AI / Mastery |
| 학습자 관점 완주 가능성 | Question / Answer / Pattern DB 수정 |

---

## Walkthrough Path

```text
Today's Study
  → Pattern Preview
  → Pattern Lesson (소개)
  → Algorithm
  → Know-how
  → Checklist
  → Question
  → Submit
  → Review
  → Evidence Pad
  → Session Finish
  → Dashboard
  → 종료
```

Live check: `http://localhost:8080/learning-loop.html`  
샘플 Pattern: `기말재고 포함 여부 판단` (ACC_INV_001) · Progress `Pattern 1 / 2` · `Question 1 / 1`

---

## Item Results

### 1. Today's Study — **PASS** (5/5)

학생이 5초 안에 이해 가능한가?

- 헤드라인: “오늘 Pattern 하나를 익히러 왔습니다”
- 오늘의 Pattern 이름 · 중요도 S · 약 15분 · 1문항 · 오늘 목표 표시
- CTA: “이 Pattern 학습 시작”

**판정:** PASS

---

### 2. Pattern Preview — **PASS** (4/5)

왜 배우는지 이해되는가?

- “왜 배우는 Pattern인가” · 출제 의도 · 대표 함정 · 완료 기준 · 키워드 존재
- 약점: “시험장에서 언제 등장하는가”가 **출제 연도 목록** 수준 (상황 트리거가 약함)

**판정:** PASS (품질 감점)

---

### 3. Pattern Lesson — **PASS** (4/5)

소개가 충분한가?

- 이 Pattern은? / 출제 의도 / 흔한 착각 / 등장 시점 구조 명확
- verified 자산이 있는 Pattern(ACC_INV_001) 기준 충분
- 자산 공백 Pattern에서는 “자산이 없습니다”로 급락 (커버리지 이슈와 연결)

**판정:** PASS

---

### 4. Algorithm — **PASS** (4/5)

문제를 풀 수 있을 정도로 구체적인가?

- ACC_INV_001: 5단계 기계적 절차 + Decision tree 존재
- 풀이 **예시 수치 walkthrough**는 없음 (Beta에선 허용 가능하나 초시생 부하↑)

**판정:** PASS

---

### 5. Know-how — **PASS** (5/5)

시험장에서 기억할 내용이 명확한가?

- examThinking · memoryTip(F-W-A-S) · 함정 문구가 시험장 행동으로 읽힘

**판정:** PASS

---

### 6. Checklist — **PASS** (4/5)

문제 전 도움이 되는가?

- FOB/위탁/적송 트리거 체크 가능
- 체크가 진행을 **강제하지 않음** (형식적 스킵 가능)

**판정:** PASS

---

### 7. Question Experience — **PASS** (3/5)

가독성 · OCR · 줄바꿈 · 렌더링

- stem-renderer로 soft-break 병합 동작 (M2)
- 표·다단 구조 문항은 여전히 읽기 부담 가능
- **대표 문항 1개**만인 Pattern이 있어 “적용 연습량” 부족

**판정:** PASS (아슬아슬 · 감점)

---

### 8. Review Experience — **FAIL** (2/5)

왜 맞았고 왜 틀렸는지 Pattern 중심으로 이해 가능한가?

- Pattern 이름 · 개념 · Checklist · 알고리즘 재표시는 있음
- **이 문항에서 어떤 판단이 틀렸/맞았는지** 설명 없음
- 정오 문구가 일반론 (“Pattern 판단 기준을 적용한 결과”)에 그침
- 기존 `wrongReasons` 자산도 Review에 **연결되지 않음** (생성 없이도 가능했던 구멍)

**판정:** FAIL

---

### 9. Evidence Pad — **PASS** (4/5)

20초 안에 기록 가능한가?

- 제출 후 Sidebar 고정 위치 · 체크 중심 · Save만 저장
- History Count / Export 존재
- 필드 수가 다소 많아 초회 20초는 빡빡할 수 있음 (2회차부터 가능)

**판정:** PASS

---

### 10. Session Finish — **PASS** (4/5)

“오늘 Pattern 하나를 익혔다”고 느끼는가?

- Closing: “오늘 Pattern을 하나 익혔습니다” + Checklist + 한 줄 + 고정 복습 문구
- Pattern 단위 종료 의식은 설계 목표에 부합
- 다만 Review FAIL이 Closing 설득력을 깎음

**판정:** PASS

---

### 11. Dashboard — **PASS** (4/5)

학생 정보만 보이는가?

- 현재 Pattern · 익힌/복습 · 공부 시간 중심
- Mastery/Reco는 학습자 모드에서 시각적으로 숨김 확인 (`offsetParent=null`, slot `hidden`)

**판정:** PASS

---

### 12. Immersion — **FAIL** (3/5)

Placeholder / Unknown / Debug / 미완성 느낌이 남는가?

- 시각적으로 Mastery·Reco·placeholder는 숨김 (양호)
- 헤더 **「학습자 모드」** 토글이 상시 노출 → “아직 개발 중” 신호
- UI 카피 혼재: Today's Study / Pattern Preview / Evidence History (영문) + 한글
- a11y 트리에 hidden placeholder·Pad가 남아 스크린리더 잡음 가능
- 학습 가능 Pattern이 **2개**뿐 → “매일 공부” 제품 약속과 괴리 (제품 신뢰)

**판정:** FAIL

---

## Score Summary

| # | Item | Pass/Fail | Score |
|---|------|-----------|-------|
| 1 | Today's Study | PASS | 5 |
| 2 | Pattern Preview | PASS | 4 |
| 3 | Pattern Lesson | PASS | 4 |
| 4 | Algorithm | PASS | 4 |
| 5 | Know-how | PASS | 5 |
| 6 | Checklist | PASS | 4 |
| 7 | Question Experience | PASS | 3 |
| 8 | Review Experience | **FAIL** | **2** |
| 9 | Evidence Pad | PASS | 4 |
| 10 | Session Finish | PASS | 4 |
| 11 | Dashboard | PASS | 4 |
| 12 | Immersion | **FAIL** | **3** |
| | **Total** | | **46 / 60** |

---

## Why Not Ready (핵심 3)

1. **Review가 “왜”를 닫지 못함** — Pattern First의 핵심 강화 구간이 약함  
2. **매일 공부할 콘텐츠 폭이 부족** — verified+mapped Pattern ≈ 2, 일부 Pattern 문항 1개  
3. **Immersion 잔여 신호** — 개발자 토글·영문 라벨·제품 범위 미고지가 “미완성 Beta” 느낌

---

## What IS Ready (인정)

- Pattern First 진입(Today's Study)과 모드 구조
- Preview → Lesson → Algorithm → Know-how → Checklist 뼈대
- Know-how 품질 (특히 ACC_INV_001)
- Evidence Pad Observation 도구
- Session Closing 카피 방향
- SoT 무변경 · AI/Reco/Mastery 미도입 원칙 준수

---

## Recommendation

| Decision | Action |
|----------|--------|
| Beta Freeze | **NO-GO** |
| Next Sprint | **Sprint-04 · Beta Gate Polish** (기능 폭주 금지 · Review/Immersion/범위 고지) |
| Real Study | **소규모 Pilot만** (Evidence Pad 수집용). “매일 전 과목 공부” 홍보 금지 |

---

## Constitution Check

| Rule | Result |
|------|--------|
| 새 기능 미작성 (본 Review) | PASS |
| DB 미수정 | PASS |
| AI/Reco/Mastery 미제안 구현 | PASS |
| Evidence 기반 다음 Sprint | PASS (Review FAIL = Evidence) |

---

## Final Declaration

# ❌ Beta Not Ready

점수 46/60 · Major Polish Required · Beta Freeze 비권장  
다음: `docs/beta-polish-backlog.md` → Sprint-04
