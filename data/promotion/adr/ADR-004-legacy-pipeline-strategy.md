# ADR-004: Legacy Pipeline Strategy (Freeze vs Managed Continuity)

- Status: **Approved (L1)**
- Date: 2026-07-20 (proposed) · **Approved: 2026-07-21**
- Deciders: Human (Architecture owner) / Engineering Review Lead
- Signer: **이아람**
- Evidence: `data/promotion/legacy-pipeline-freeze-decision.md`, git working tree (pre-existing M files)
- Related: docs/31 §1 (legacy monolith diagnosis), docs/34 Truth Split, docs/35 D3 Owner = Promotion only

---

## Context

두 쓰기 경로가 Product Snapshot(`data/question-db-mvp.json`)을 향해 존재한다.

```
[Path P] Parser Emit → Promotion Gate → D3 Product   ← docs/34 목표
[Path L] scripts/exam_pipeline + repair-pipeline.py → D3 Product 직접 갱신  ← legacy
```

| Fact | Value |
|------|-------|
| Repair queue backlog | 183 / 240 (`data/repair/repair-queue.json`) |
| Path L patches in working tree | `question_parser.py`, `text_postprocess.py` 등 (Sprint 이전부터) |
| Promotion Gate | overwrite 차단 정상 (`PROMOTION_READY=NO`) |
| docs/35 D3 Owner | **Promotion Pipeline만** |
| docs/31 | exam_pipeline을 구조 결함·폐기 대상으로 진단 |

Promotion Decision Support 산출물(diff 통계, 표본)의 유효성은 **Path L이 Baseline을 움직이지 않을 때**만 유지된다.

---

## Decision Drivers

1. Truth Split 해소 = Path P로 단일화. Path L 병행은 Authority 붕괴를 연장한다.
2. Repair queue 183건은 실제 품질 부채 — 무시 비용도 존재.
3. Architecture Freeze: Parser Core 수정 금지. Legacy 추가 휴리스틱 확장은 docs/31이 경고한 “정규식/추출기 경쟁” 악화.
4. 이번 Sprint는 전략 결정만 — 코드 삭제/패치/Apply 없음.

---

## Options

### Option L1 — Freeze 유지 (권고 기본안)

**정의:** Promotion Apply 또는 Explicit Unfreeze ADR 전까지  
`scripts/exam_pipeline/*` 추가 패치 금지, `repair-pipeline.py` 재실행 금지, Path L로 Product 갱신 금지.

| | |
|--|--|
| **장점** | Baseline 고정 → ADR-001~003 검토 유효; docs/35 D3 정합; Truth Split 악화 방지 |
| **단점** | Repair queue 183건 해소 지연; 단기 Product UX는 legacy 품질에 고정 |
| **영향 범위** | 개발 프로세스(커밋 정책), Promotion 일정, repair backlog SLA |
| **Risk** | **Low–Medium** — 품질 부채 잔존. Architecture risk는 감소. |

### Option L2 — Managed Continuity (제한적 관리 전략)

**정의:** Path L을 즉시 폐기하지 않되 **격리 규칙** 하에서만 허용.

필수 가드(하나라도 빠지면 L1로 강등):

1. Path L 출력은 `data/question-db-mvp.json` **직접 덮어쓰기 금지** — staging 경로만 (예: `data/repair/staging/`, 이름은 Human이 확정)
2. Product 반영은 **반드시 Promotion Gate 경유** (또는 명시적 예외 ADR)
3. Sprint/게이트 비교 기간에는 Path L **실행 동결 창** 설정
4. 신규 문항ID 하드코딩 / richness-score 경쟁 추출기 추가 금지 (docs/31)
5. 변경마다 sha256 + diff 리포트 첨부

| | |
|--|--|
| **장점** | 183건 부채를 통제하며 줄일 여지; 이행기 현실 반영 |
| **단점** | 운영 복잡도; 가드 위반 시 즉시 Truth Split 재발; “임시”가 상시화 위험 |
| **영향 범위** | repair 워크플로, CI/리뷰 체크리스트, Promotion 일정 관리 |
| **Risk** | **Medium–High** — 규율 실패 시 P0 Baseline Drift 재발. |

### Option L3 — Unfreeze / unrestricted Path L

| | |
|--|--|
| **장점** | 단기 수리 속도 |
| **단점** | docs/34–35 정면 충돌; Decision Support 산출물 무효화; Apply 판단 불가 |
| **Risk** | **Unacceptable** under current Freeze — 권고하지 않음 |

---

## Comparison Matrix

| 기준 | L1 Freeze | L2 Managed | L3 Unfreeze |
|------|-----------|------------|-------------|
| docs/35 D3 Owner 정합 | 높음 | 조건부 | 위반 |
| Decision Support 수치 재현 | 보장 | 동결창에 의존 | 불가 |
| Repair 183건 해소 | 지연 | 가능(격리 시) | 가능(위험) |
| Parser Core 침범 | 없음 | 없음(가드 시) | 간접 악화 |
| Apply Sprint 진입 | 다른 ADR 충족 시 | 동결창+가드 필요 | 차단 권고 |
| 운영 비용 | 낮음 | 높음 | 낮아 보이지만 부채 폭발 |

---

## Recommended default (non-binding)

Engineering Review Lead 관점 기본 권고는 **L1 Freeze 유지**이다.  
L2는 “staging 경로 + Product 직접쓰기 금지”가 **문서로 승인·구현된 뒤**에만 재논의.

최종 선택은 Human Approval.

---

## Consequences

| If L1 | Path P 작업·Human 검토 안정; repair는 Apply 이후 또는 별도 Migration Sprint |
| If L2 | 가드 구현 Sprint가 선행 조건 (이번 Approval Sprint 범위 밖) |
| If L3 | ADR-001~003 재작성 필요; Promotion Decision Support PASS 무효화 위험 |

---

## Human Approval

```
[x] Option L1 — FREEZE maintained until Explicit Unfreeze ADR
[ ] Option L2 — Managed Continuity (guards 1–5 accepted; staging path: _______________)
[ ] Option L3 — Rejected / not permitted
[ ] DEFER

승인자: 이아람
일자: 2026-07-21
Notes: Architecture Brief 수락. Path L D3 직접쓰기·exam_pipeline 추가패치·repair-pipeline 재실행 금지 until Explicit Unfreeze ADR.
```

---

## Links

- Freeze memo: `../legacy-pipeline-freeze-decision.md`
- docs/31 legacy diagnosis; docs/34 migration; docs/35 §2.2 D3
