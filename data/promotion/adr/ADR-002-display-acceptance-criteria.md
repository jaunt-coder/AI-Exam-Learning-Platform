# ADR-002: Display Acceptance Approval Criteria

- Status: **Proposed — Pending Human Approval**
- Date: 2026-07-20
- Deciders: Human (Product / Display owner) / Engineering Review Lead
- Evidence: `data/promotion/display-acceptance-sample.md` (seed=`20260720`, n=30)
- Related: docs/32 Emit Contract, docs/34 Display Acceptance / soft gates, docs/35 D3

---

## Context

Emit↔Product 필드 diff (240 records):

| Field | Diff count |
|-------|------------|
| `answer` | 0 |
| `question` / `originalQuestion` | 240 / 240 |
| `choices` | 223 |
| `table` / `hasTable` | 117 / 104 |
| `patternId` | 74 |

30건 층화표본(6년 × 5)에서 **answer는 전건 일치**. 그러나 표본 다수에서 Candidate `choices`/`question`이 Product보다 나쁘거나, 반대로 stem 가독성은 개선되는 혼재 양상이 관측된다.

### 표본에서 관측된 대표 패턴 (자동 판정 아님 — Human 확인용)

| 유형 | 예시 | 관측 |
|------|------|------|
| Choices 붕괴 | `ACC_2015_Q050` | Candidate choices에 stem 조각·통화기호만 남고 5지 구조가 사실상 파괴 |
| Stem 정보 손실 | 동상 | Candidate stem에서 숫자·연도 일부 누락 정황 |
| 표/보기 경계 혼선 | `ACC_2017_Q046`, `ACC_2018_Q045` 등 | `table`/`hasTable` 동시 diff — ADR-003과 교차 |
| answer 불변 | 표본 30/30 | 정답 인덱스는 유지 |

docs/32: Emit 목표가 “구 MVP 복제”가 아니므로 `question` 전량 diff 자체는 예상 가능.  
docs/34: 그럼에도 **Display Acceptance 없이 `--apply` 금지**.

---

## Decision Drivers

1. 학생 화면에 보이는 텍스트 품질이 Product 승격의 soft gate.
2. answer 불변만으로는 UX 붕괴를 막지 못함 (choices 붕괴 시 풀이 불가).
3. 240건 전수 Human 검토는 비현실 → **표본 PASS 기준 + 차단 조건**이 필요.
4. 이번 Sprint는 기준만 확정. Apply/코드 수정 없음.

---

## Proposed Approval Criteria

### Gate DA-0 — Absolute blockers (하나라도 실패 시 Display Acceptance = NO)

표본 또는 전수 점검에서 다음이 발견되면 **즉시 거부**:

1. `answer` / `answerIndex` drift
2. `choices.length != 5`
3. Choice 항목이 비어 있거나, stem 문장이 choice로 유입된 **명백한 붕괴** (표본: `ACC_2015_Q050` 유형)
4. 필수 필드 누락 (G3와 동일)

### Gate DA-1 — Stratified sample (본 ADR 대상 30건)

Human reviewer가 각 표본에 대해 다음 중 하나를 기록한다:

| Label | 의미 |
|-------|------|
| `IMPROVED` | Candidate가 원문(D0) 대비 더 읽기 쉽고, 숫자·보기 유실 없음 |
| `EQUIVALENT` | 표현만 다르고 학습 가능 |
| `REGRESSED` | 숫자/보기/표 유실 또는 읽기 불가 |
| `AMBIGUOUS` | PDF 원문 대조 필요 |

**제안 PASS 임계값 (Human이 조정 가능):**

| 규칙 | 제안 값 |
|------|---------|
| `REGRESSED` | **0건** (표본 내) |
| `AMBIGUOUS` | ≤ 3건, 그리고 원문 대조 후 재분류 완료 |
| `IMPROVED + EQUIVALENT` | ≥ 27건 |
| 연도별 | 각 연도 5건 중 `REGRESSED` = 0 |

### Gate DA-2 — Cross-check with hasTable removals (ADR-003)

표본 중 `hasTable` True→False가 포함된 행은 ADR-003 판정 완료 전에는 `AMBIGUOUS`로 유지.

### Gate DA-3 — Promotion coupling

| Display Acceptance | `--apply` |
|--------------------|-----------|
| NO | 금지 (현재 스크립트도 question diff 시 apply 거부) |
| YES + G6 resolved + Legacy policy set | 별도 Apply Sprint에서만 검토 |

---

## Options for this Approval Sprint

### Option S1 — Adopt proposed criteria as written

| | |
|--|--|
| **장점** | 명확한 DoD; choices 붕괴를 hard blocker로 승격 |
| **단점** | 현재 표본에 REGRESSED 후보가 보이면 Acceptance는 당분간 NO 유지 |
| **Risk** | Low — Apply를 더 보수적으로 만듦 |

### Option S2 — Loosen: allow limited REGRESSED with exception list

| | |
|--|--|
| **장점** | 부분 승격(canary) 논의 가능 |
| **단점** | docs/34 전면 Promotion과 충돌; UX 부채 |
| **Risk** | High |

### Option S3 — Defer criteria; keep Display Acceptance = NOT READY

| | |
|--|--|
| **장점** | 성급 Apply 차단 유지 |
| **단점** | Promotion 로드맵 정체 |
| **Risk** | Low (안전), Medium (일정) |

---

## Consequences

- Criteria 채택만으로는 Product가 바뀌지 않는다.
- 기준 PASS 전에는 C4 / Apply Sprint 착수 불가 권고를 유지한다.

---

## Human Approval

```
[ ] Option S1 — Adopt DA-0..DA-3 as written
[ ] Option S2 — Adopt with exceptions (list): _______________
[ ] Option S3 — Defer; keep NOT READY
[ ] Amend thresholds (describe): _______________

Sample review worksheet (optional, fill during review):
  IMPROVED: ___  EQUIVALENT: ___  REGRESSED: ___  AMBIGUOUS: ___

승인자: _______________
일자: _______________
```

---

## Links

- Sample report: `../display-acceptance-sample.md`
- hasTable ADR: `./ADR-003-hastable-regression-judgment.md`
