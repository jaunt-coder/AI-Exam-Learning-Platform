# ADR-001: ACC_COST_001 Disposition (G6 Hard Gate)

- Status: **Approved (Option A)** — Decision only · Persist=0
- Date: 2026-07-20 (proposed) · **Approved: 2026-07-22**
- Deciders: Human (D4 Pattern Master owner) / Engineering Review Lead
- Signer: **Project Owner**
- Work Order: WO-20260722-001 (Resume) — **DECISION_CLOSED** (실행 미착수)
- Evidence: `data/promotion/pattern-gap-analysis.md`
- Related: docs/34 G6, docs/35 D4 Pattern Master Authority

---

## Context

Promotion Gate dry-run은 **G6 Hard FAIL × 15**로 `PROMOTION_READY = NO`이다.

| Fact | Value |
|------|-------|
| Unresolved emit patternId | `ACC_COST_001` |
| Registered in Pattern DB (D4)? | **NO** (17 patterns; COST series has only `ACC_COST_002`) — **Persist 아직 없음** |
| Affected questions | 15 (2015/2017/2018/2020/2024/2025) |
| Answer drift vs Product | **0** (all match) |
| Product(MVP) patternIds on same rows | `ACC_GEN_001` × 13, `ACC_COST_002` × 2 (`ACC_2018_Q077`, `ACC_2025_Q080`) |
| Emit chapterId | all `ACC_COST` |

본 ADR은 **선택지만 제시**한다. 재분류를 실행하지 않는다. Pattern DB / Emit / Product를 수정하지 않는다.  
**2026-07-22 서명:** Option A 결정만 기록. D4 Persist · `--apply` · Promotion · Parser · 구현은 **인가하지 않음** — 별도 실행 WO 필요.

---

## Decision Drivers

1. D4 Owner만이 Pattern Master에 쓸 수 있다 (docs/35).
2. G6는 `--apply`를 이미 차단한다 — 승격 안전은 유지 중.
3. Coach(docs/33)는 Canonical patternId에 의존한다 — 잘못된 통합은 Weakness 진단에 고착된다.
4. Parser Core 수정은 Architecture Freeze에서 금지; “분류기 수정”은 Core가 아닌 **직교 pattern 서비스** 범위를 의미한다.

---

## Options

### Option A — 신규 Pattern 등록 (`ACC_COST_001` → Pattern DB에 추가)

**의미:** D4에 `ACC_COST_001`을 정식 등록하고 Emit 값을 그대로 인정.

| | |
|--|--|
| **장점** | Emit–Product 참조 불일치 즉시 해소; G6 하드 게이트 통과 가능; chapter=`ACC_COST`와 정합; 관리회계 세부 패턴 확장 여지 |
| **단점** | Pattern Master 스키마/마스터 데이터 변경 필요(별도 Schema·D4 승인); Coach·통계·relatedQuestions 재집계 필요; `ACC_COST_002`(관리회계)와의 경계 정의 필수 |
| **영향 범위** | `data/pattern-db-mvp.json` (D4), Promotion G6, Coach weakness 집계, UI pattern label, 향후 C4 Planner 입력 |
| **Risk** | **Medium–High** — 이름만 등록하고 정의가 모호하면 Coach가 잘못된 약점 클러스터를 만든다. Product 문항 텍스트는 불변이나 학습 메타가 바뀐다. |

### Option B — 기존 Pattern으로 통합 (Emit `ACC_COST_001` → 등록된 ID로 재매핑)

**의미:** Emit 산출의 `ACC_COST_001`을 기존 등록 ID로 바꾼다. 후보: `ACC_COST_002` 또는 (현재 Product가 쓰는) `ACC_GEN_001`.

| | |
|--|--|
| **장점** | Pattern DB 신규 키 불필요; G6 해소가 빠름; D4 스키마 변경 최소화 |
| **단점** | 15건이 단일 패턴이 아닐 수 있음(전부원가/변동원가, 표준원가, 제약이론, 품질원가 등 Evidence stem 다양); Product 현재값(`GEN` 13 / `COST_002` 2)과도 불일치 → “어느 기존 ID?” 자체가 2차 결정; Emit 재생성 또는 Promotion 매핑 레이어 필요 |
| **영향 범위** | Emit pattern 서비스 또는 Promotion 매핑 규칙, Coach 집계, patternId diff(74건 중 15건) |
| **Risk** | **High if blindly mapped to one ID** — 이질 문항을 한 패턴에 몰면 Weakness 진단이 왜곡. `ACC_GEN_001` 통합은 chapter=`ACC_COST` Evidence와 충돌. |

### Option C — 분류기 수정 (Emit이 미등록 ID를 내보내지 않도록)

**의미:** Pattern 직교 분류 로직이 등록된 ID만 출력하도록 수정. Parser Core(Stage 1–9)는 **범위 외**.

| | |
|--|--|
| **장점** | D2 Emit 품질 자체를 고침; 근본 원인(미등록 ID 방출) 제거; 장기적으로 Promotion Gate와 정합 |
| **단점** | 구현 Sprint 필요; Freeze 하에서 Core 침범 위험(경계 문서화 필수); 수정 후에도 Human이 “어느 등록 ID?”를 정해야 함 → Option B와 결합될 수 있음; 단기 G6 해소만으로 Product UX가 좋아지지는 않음 |
| **영향 범위** | pattern classifier / Emit orthogonal service (Parser Core 금지), regression emit JSON 재생성, Stage8 diff, Promotion 재 dry-run |
| **Risk** | **Medium** — Core 경계 위반 시 Architecture Freeze 파손. 분류기만 고치고 D4 정의가 없으면 증상만 이동. |

---

## Comparison Matrix

| 기준 | A 신규 등록 | B 기존 통합 | C 분류기 수정 |
|------|-------------|-------------|---------------|
| G6 해소 속도 | 승인 후 즉시 | 매핑 규칙 확정 후 | 구현+재Emit 후 |
| D4 스키마 변경 | 필요 | 최소 | 불필요(가능) |
| Coach 정확도 | 정의 품질에 좌우 | 잘못된 통합 시 악화 | 장기 개선 |
| Parser Core 침범 | 없음 | 없음(매핑만이면) | **위험 — 경계 필수** |
| Product Snapshot | 불변 | 불변(이번 Approval Sprint) | 불변 |
| Architecture Freeze 정합 | 높음(D4 정식 절차) | 높음(매핑이 Promotion측이면) | 조건부 |

---

## Consequences if undecided

- `PROMOTION_READY` 유지 **NO**
- `--apply` 계속 차단 (안전)
- Coach C4 착수 계속 보류 권고

---

## Human Approval

하나만 선택한다. Cursor는 실행하지 않는다.

```
[x] Option A — REGISTER ACC_COST_001 (D4 formal approval attached: WO-20260722-001 Decision)
[ ] Option B — RE-MAP to existing patternId: _______________
      notes (per-question exceptions if any): _______________
[ ] Option C — REVISIT classifier (scope document: _____; Core out of scope confirmed)
[ ] Hybrid (describe): _______________
[ ] DEFER

승인자: Project Owner
일자: 2026-07-22
```

### Approved Decision Detail (Option A)

| Field | Value |
|-------|-------|
| **Option** | **A — REGISTER ACC_COST_001** |
| **Definition** | `ACC_COST_001`은 원가흐름·원가배분과 독립적인 **원가 계산 및 집계 구조** Pattern으로 정의한다. |
| **Boundary vs ACC_COST_002** | `ACC_COST_002`는 세부 계산/배부 로직을 담당하며, 두 Pattern은 **중복되지 않는다**. |
| **Signer** | Project Owner |
| **Date** | 2026-07-22 |
| **Guardian** | Verdict GO · 권고 Option A · Persist=0 |
| **Authorization scope** | **Decision only.** D4 Persist · `--apply` · Promotion · Parser · implementation **NOT authorized.** |
| **Execution** | Must proceed in a **separate Work Order** under new Guardian Scope. |
| **Runtime fact** | Pattern DB에 `ACC_COST_001` **미등록 유지** (Persist=0). `PROMOTION_READY=NO` 유지. |

---

## Links

- Evidence table: 15 rows in `../pattern-gap-analysis.md` §2–§3
- Gate: `scripts/promote-parser-emit.py` G6
