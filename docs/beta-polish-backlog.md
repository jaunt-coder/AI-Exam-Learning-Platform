# Beta Polish Backlog — Post M2.7

Date: 2026-07-24  
Rule: **새 엔진/AI/Reco/Mastery/DB 수정 금지**  
Goal: Score 46 → **≥55** 후 Beta Freeze 재심사

---

## Proposed Next Sprint

# Sprint-04 — Beta Gate Polish

**One Product Improvement:**  
Review가 Pattern 중심으로 “왜”를 닫고, Immersion·범위 정직성으로 **매일 Pilot 가능한 Beta**에 도달한다.

**Not in Sprint-04:** AI · Recommendation · Mastery · Question/Answer/Pattern/Knowledge 생성

---

## P0 (Gate — must)

### P0-1 Review Why-Lens (기존 자산만)

| Field | Content |
|-------|---------|
| Learning Problem | Review FAIL — 정오 이유를 Pattern 판단으로 이해 못 함 |
| Student Behavior | Review 스킵 · “맞았다/틀렸다”만 기억 |
| Expected Effect | 오답 시 trap/wrongReasons(기존) 표시 · 정답 시 Checklist·판단트리 대조 |
| Evidence | BK-C01 · Score item 8 |
| Difficulty | Medium (presentation wiring) |
| Priority | P0 |
| Out of Scope | LLM 생성 해설 · 새 Knowledge |

### P0-2 Immersion Hygiene Hardening

| Field | Content |
|-------|---------|
| Learning Problem | 개발 토글·영문·hidden placeholder 신호 |
| Student Behavior | “아직 미완성”으로 인식 |
| Expected Effect | 학습자 기본에서 dev 토글 숨김(혹은 푸터/설정 3클릭) · 주요 라벨 한글화 · placeholder DOM 제거 또는 aria-hidden |
| Evidence | BK-M03 · BK-N01 · BK-N04 · Immersion 3점 |
| Difficulty | Low |
| Priority | P0 |

### P0-3 Beta Scope Honesty Card

| Field | Content |
|-------|---------|
| Learning Problem | Pattern 2개로 “매일 전범위 공부”처럼 오해 |
| Student Behavior | 기대 배신 · 이탈 |
| Expected Effect | Today's Study에 “Beta 범위: 검증된 Pattern N개 · 전 과목 아님” 고정 고지 |
| Evidence | BK-C02 · 제품 약속 |
| Difficulty | Low |
| Priority | P0 |
| Out of Scope | Pattern DB 확장 (별도 Knowledge Sprint) |

---

## P1 (Score lift)

### P1-1 Preview “등장” 카피 개선 (기존 자산 재배치)

- years + frequency + trigger keywords를 “시험장에서 이런 단어가 보이면”으로 묶어 표시
- 새 문장 창작 최소화 · 필드 재조합

### P1-2 Checklist Commitment (경량)

- 최소 1개 체크 후 문제 진입 **또는** 문제 상단 sticky 요약
- AI 없음

### P1-3 Question Count Expectation

- Today's Study에 “이 Pattern 대표 문항 n개”를 더 강조 (이미 있으나 Closing/Review에도 반복)

---

## P2 (Backlog — not Gate)

| ID | Item | Notes |
|----|------|-------|
| P2-1 | 수치 예시 Algorithm | Knowledge/콘텐츠 Sprint 필요 · 본 Gate 제외 |
| P2-2 | Pattern 커버리지 확대 | Mapping/Verify 파이프라인 · DB 거버넌스 |
| P2-3 | Evidence Pad 필드 축소 A/B | Real Study Evidence 후 |
| P2-4 | Home에 Evidence History | Wish |

---

## Explicitly Rejected for Sprint-04

- Recommendation Engine
- AI Coach / LLM 해설
- Mastery 점수화
- Question/Answer/Pattern/Knowledge SoT 수정
- “단계 삭제해서 빨리 문제” (Pattern First 훼손)

---

## Success Criteria for Sprint-04 → Re-Review

- [ ] Item 8 Review ≥ 4
- [ ] Item 12 Immersion ≥ 4
- [ ] Total Score ≥ 55
- [ ] Critical BK-C01 해소 (presentation)
- [ ] BK-C02는 **고지(Honesty)** 로 완화 (콘텐츠 폭 확대는 별도 Sprint)
- [ ] SoT DB unchanged
- [ ] Human Re-Review = Beta Ready 재판정

---

## Relation to Evidence Pad

Sprint-04 중·후에 Real Study Pilot:

1. Evidence Pad로 세션 기록
2. Export → 07 UR 등록
3. Strength 게이트로 P1 항목만 추가 승인

---

## Freeze Policy Reminder

```text
Score < 55  → Freeze NO-GO
Critical open → Freeze NO-GO
Score ≥ 55 + Critical closed + Human GO → Freeze 검토
```
