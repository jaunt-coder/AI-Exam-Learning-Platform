# Roadmap Update (Evidence-Driven)

Agent: `07_User_Research_Analyst`  
Version: **v1.1**  
Last updated: 2026-07-23  
Linked backlog: `docs/evidence-backlog.md`

---

## Roadmap Rule (v1.1)

| Allowed on this roadmap | Forbidden on this roadmap |
|-------------------------|---------------------------|
| Status = `Approved Candidate` only | `Observation` |
| Human Approval recorded | `Candidate` |
| Evidence Strength documented (prioritization aid) | `Backlog` |
| | `Rejected` |
| | 가정·스펙 기반 기능 |

> Backlog items must **NOT** appear in the development roadmap.  
> Evidence Strength never auto-approves. **Human approval is mandatory.**

---

## Product Discovery Order

```text
Observe → Analyze → Prioritize → Recommend
```

금지: Observe → Implement

---

## Approved Candidates → Roadmap Queue

| Priority | ID | Title | Category | Strength | Human Approver | Approved At | Suggested Window | Dependencies |
|----------|----|-------|----------|----------|----------------|-------------|------------------|--------------|
| — | — | *(항목 없음)* | — | — | — | — | — | — |

현재 Roadmap Queue: **0건**

---

## Explicitly Excluded (Backlog / Non-Approved)

`docs/evidence-backlog.md`의 `Backlog` · `Observation` · `Candidate` 항목은 여기에 올리지 않는다.

| Count (source) | Status filter | On roadmap? |
|----------------|---------------|-------------|
| 0 | Backlog | No |
| 0 | Observation | No |
| 0 | Candidate | No |

---

## Implemented (Evidence Track)

| ID | Title | Implemented At | Notes |
|----|-------|----------------|-------|
| — | — | — | — |

---

## Human Decision Log

| Date | ID | Decision | Approver | Rationale |
|------|----|----------|----------|-----------|
| — | — | — | — | — |

---

## Relationship to Other Roadmaps

이 문서는 **User Research / Product Discovery** 트랙 전용이다.

- Engineering / Knowledge / Exam Mode 로드맵(`docs/29`, `docs/36`, `PROJECT_STATUS.md` 등)과 **자동 병합하지 않는다**.
- `Approved Candidate`가 Human Approval를 받은 뒤에만, 별도 Human 결정으로 개발 트랙에 이관할 수 있다.

---

## Validation

| Check | Result |
|-------|--------|
| Roadmap contains Approved Candidates only | **PASS** (empty queue) |
| No Backlog items listed as development work | **PASS** |
| Human approval explicitly required | **PASS** |
| No speculative features | **PASS** |
