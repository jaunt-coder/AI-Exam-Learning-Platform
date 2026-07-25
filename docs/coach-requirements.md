# Coach Requirements

Agent: `07_User_Research_Analyst`  
Version: **v1.1**  
Last updated: 2026-07-23  
Linked backlog: `docs/evidence-backlog.md`

---

## Scope

Coach 메시지·코칭 개입에 대한 **증거 기반 요구사항**만 기록한다.

금지:

- 학습 중 관찰되지 않은 코칭 메시지 발명
- 동기부여 문구의 가정 설계
- 스펙/`docs/33-ai-exam-coach-agent-spec.md`만으로의 메시지 생성
- Evidence Strength만으로 Approve / Reject / Implement

허용:

- 실제 학습 문제(개념 오류, 계산 오류, Pattern 혼란, 동기 저하 등)에 대한 반복 관찰
- Coach Request로 분류된 Evidence Backlog 추적
- Human Approval가 난 `Approved Candidate`만 Roadmap 연계

---

## Coach Rule (v1.1)

> Coach messages must solve **real learning problems observed during study**.  
> Never invent coaching messages.

코칭은 기능이 아니라 **관찰된 학습 문제의 해결 수단**이다.

---

## Discovery Flow

```text
Evidence → Insight → Candidate Requirement → Evidence Backlog
  → Approved Candidate (Human) → Roadmap Update
```

Observe → Analyze → Prioritize → Recommend  
**Never** Observe → Implement

---

## Candidate Requirement Template

Every Candidate Requirement must include:

| Field | Required |
|-------|----------|
| Title | yes |
| Category | yes (`Coach Request` or related: Motivation, Concept Error, Calculation Error, Pattern Problem, Study Habit) |
| Evidence Count | yes |
| Evidence Strength | yes (F × S × I, max 125) |
| Importance | yes |
| Observed Behavior | yes |
| User Comments | yes (verbatim when available; else `—`) |
| Learning Impact | yes |
| Suggested Solution | yes |
| Dependencies | yes |
| Priority | yes |
| Current Status | yes (Status Enum) |

### Evidence Strength

```text
Evidence Strength = Frequency Score × Session Coverage Score × Learning Impact Score
Scores: 1–5 each · Maximum: 125
```

Prioritization aid only. **Human approval required** for any roadmap entry.

---

## Active Candidates

*(없음 — 실제 학습 세션에서 Coach Request 증거 미수집)*

---

## Approved Candidates (Human Reviewed)

*(없음)*

| ID | Title | Strength | Approved By | Approved At | Roadmap Ref |
|----|-------|----------|-------------|-------------|-------------|
| — | — | — | — | — | — |

---

## Message Grounding Rule

제안되는 Coach 메시지(후보)는 반드시 아래를 명시한다.

| Field | Purpose |
|-------|---------|
| Trigger evidence IDs | 어떤 관찰/시도에서 왔는지 |
| Learning problem | 해결하려는 실제 학습 문제 |
| Non-goals | 하지 않을 말 (추측·과잉 격려 등) |

근거 없는 격려·일반론 메시지는 `Rejected` 또는 `Backlog`(약한 동기 관찰만 있을 때)로 처리한다.

---

## Backlog Cross-Reference

`docs/evidence-backlog.md`에서 Category가 `Coach Request` / `Motivation` / `Study Habit`이고 Status가 `Backlog` / `Observation` / `Candidate`인 항목만 모니터링한다.

현재: **0건**

---

## Validation

| Check | Result |
|-------|--------|
| No speculative coach messages | **PASS** |
| Evidence Strength required on Candidates | **PASS** (template ready; 0 candidates) |
| Human approval required | **PASS** |
| Linked to Evidence Backlog | **PASS** |
