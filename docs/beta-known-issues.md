# Beta Known Issues — M2.7

Date: 2026-07-24  
Source: Beta Readiness Walkthrough  
Severity: Critical · Major · Minor · Wish

---

## Critical

| ID | Issue | Where | Impact | Notes |
|----|-------|-------|--------|-------|
| BK-C01 | Review가 문항별 “왜 정/오답인지”를 Pattern 판단으로 닫지 못함 | Review | Pattern First 강화 실패 · “문제만 풀었다” 회귀 | 기존 profile `wrongReasons` 미연결 |
| BK-C02 | 매일 학습에 쓸 verified+mapped Pattern 폭이 극히 좁음 (≈2) | Study set | “매일 공부” 제품 약속 불가 | Content/Mapping 한계 · DB 무단 확장 금지 |

---

## Major

| ID | Issue | Where | Impact | Notes |
|----|-------|-------|--------|-------|
| BK-M01 | 일부 Pattern 대표 문항 1개 → 적용 연습 부족 | Question | 자동화(체화) 어려움 | INV_001 = 1문항 관측 |
| BK-M02 | Preview “언제 등장”이 연도 나열에 그침 | Preview | 시험장 상황 인지 약함 | years 필드 투영 |
| BK-M03 | 헤더 「학습자 모드」 상시 노출 | Immersion | 미완성/실험 UI 신호 | 개발자 진입은 숨김 필요 |
| BK-M04 | Review에 선택지·함정 대조 없음 | Review | 오답 학습 공백 | AI 없이 기존 trap/wrongReasons 가능 |

---

## Minor

| ID | Issue | Where | Impact | Notes |
|----|-------|-------|--------|-------|
| BK-N01 | 영·한 라벨 혼재 (Today's Study, Evidence History 등) | Copy | 몰입·신뢰 소폭 저하 | |
| BK-N02 | Checklist 미체크여도 문제 진입 가능 | Checklist | 형식적 통과 | |
| BK-N03 | Evidence Pad 초회 필드 밀도 | Evidence Pad | 첫 기록 >20초 가능 | 2회차부터 개선 |
| BK-N04 | hidden placeholder가 a11y 트리에 잔존 | Immersion | 스크린리더 잡음 | WO-015/016 문구 |
| BK-N05 | Algorithm에 수치 예시 walkthrough 없음 | Algorithm | 초시생 전이 비용 | 새 Knowledge 생성 금지 정책과 충돌 주의 |
| BK-N06 | Closing 고정 복습 문구가 Recommendation처럼 오해될 여지 | Closing | 기대 관리 | 이미 “Reco 아님” 힌트 있음 |

---

## Wish

| ID | Issue | Where | Impact | Notes |
|----|-------|-------|--------|-------|
| BK-W01 | Stage dots만으로 단계명 인지 약함 | Nav | 초회 학습 | title 속성은 있음 |
| BK-W02 | Evidence History를 Home에서도 보고 싶음 | Home | 동기 | Observation only |
| BK-W03 | Exam Mode Soft Anchor 강화 | Exam | Pattern 정체성 | |
| BK-W04 | 모바일 표 문항 가로 스크롤 가이드 | Question | 가독 | |

---

## Not Issues (의도적)

| Item | Why OK |
|------|--------|
| Mastery unknown / Recommendation absent | 계약상 미구현 · 학습자 시각 숨김 |
| AI 해설 없음 | Constitution |
| “자산이 없습니다” 표시 | 생성 금지 정책 준수 |
| Evidence append-only | 올바른 Observation 설계 |

---

## Severity Counts

| Severity | Count |
|----------|------:|
| Critical | 2 |
| Major | 4 |
| Minor | 6 |
| Wish | 4 |
