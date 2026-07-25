# Evidence Backlog

Agent: `07_User_Research_Analyst`  
Version: **v1.1**  
Last updated: 2026-07-23  
Status: **ACTIVE** (empty — no learner evidence ingested yet)

---

## Purpose

Evidence Backlog는 **아직 증거가 부족한 아이디어**를 보관한다.

목표:

1. 가치 있는 관찰을 **잃지 않는다**
2. 증거가 부족한 아이디어의 **조기 구현을 막는다**

> Observation → Insight → Candidate → **Evidence Backlog** → Approved Candidate → Roadmap

---

## Status Enum (exactly one)

| Status | Meaning | Promotion rule |
|--------|---------|----------------|
| `Observation` | 단일 관찰. 반복 증거 없음 | 모니터링 |
| `Candidate` | 동일 학습 세션 내 최소 3회 반복 | Evidence Strength 산출 필수 |
| `Approved Candidate` | 다중 세션 반복 + Strength 충분 + **Human review 필수** | Roadmap 진입 가능 |
| `Backlog` | 흥미로운 아이디어이나 증거 부족 | 모니터링 유지 · Roadmap 금지 |
| `Rejected` | 증거로 반증됨 또는 교육적 가치 없음 | 종료 |
| `Implemented` | 기능 완료 | 사후 효과 관찰 |

---

## Evidence Strength (prioritization only)

```text
Evidence Strength
  = Frequency Score (1–5)
  × Session Coverage Score (1–5)
  × Learning Impact Score (1–5)

Maximum = 125
```

**중요:** Evidence Strength는 **우선순위 지표**일 뿐이다.

- 자동 Approve 금지
- 자동 Reject 금지
- 자동 Implement 금지
- **최종 결정은 항상 Human Approval**

---

## Backlog Table

| ID | Idea | Category | Evidence Count | Strength | Status | Notes |
|----|------|----------|----------------|----------|--------|-------|
| — | *(항목 없음)* | — | 0 | — | — | 실제 학습 세션 증거 대기 중 |

> 예시 형식(참고용 · **본 표에 넣지 않음**):  
> `UR-001 | Show today's wrong answers | Recommendation | 12 | 100 | Approved Candidate | Repeated in 4 sessions.`  
> `UR-002 | Encouragement messages | Coach | 2 | 4 | Backlog | Interesting but weak evidence.`

---

## ID Convention

| Prefix | Domain |
|--------|--------|
| `UR-###` | User Research discovery item (shared backlog) |

다음 할당 ID: **`UR-001`** (첫 실제 관찰 등록 시)

---

## Category Taxonomy

Learning Difficulty · Calculation Error · Concept Error · Pattern Problem · UI Problem · Dashboard Problem · Recommendation Request · Coach Request · Motivation · Study Habit · Other

---

## Intake Rules

1. 모든 학습자 관찰은 가치 있다. 그러나 **즉시 기능이 되지 않는다**.
2. 1회 관찰 → `Observation` (또는 증거 부족 시 `Backlog`)
3. 동일 세션 3회+ → `Candidate` + Evidence Strength 필수
4. 다중 세션 반복 + Human review → `Approved Candidate`
5. `Approved Candidate`만 `docs/roadmap-update.md`에 등재
6. `Backlog` 항목은 개발 로드맵에 **등장 금지**
7. 가정·스펙 문서·mock 데이터만으로는 Candidate를 만들지 **않는다**

---

## Session Intake Log

| Session Date | Source | Observations Added | Status Changes | Human Approvals |
|--------------|--------|--------------------|----------------|-----------------|
| — | — | 0 | — | none |

---

## Validation Checklist (v1.1)

| Check | Result |
|-------|--------|
| No speculative requirements | **PASS** (empty) |
| Evidence Strength formula documented | **PASS** |
| Backlog generated | **PASS** |
| Roadmap contains Approved Candidates only | **PASS** (none) |
| Human approval explicitly required | **PASS** |

---

## Next Action

학습 세션 종료 후 Primary Input을 제출한다.

- Question Feedback Cards
- Session Review
- Learning Dashboard observations
- Learning Loop runtime logs
- Attempt history
- User comments

증거가 들어오면 본 표에 `UR-###`를 등록하고 Status를 Evidence Rules에 따라 갱신한다.
