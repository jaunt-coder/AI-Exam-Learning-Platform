# Recommendation Requirements

Agent: `07_User_Research_Analyst`  
Version: **v1.1**  
Last updated: 2026-07-23  
Linked backlog: `docs/evidence-backlog.md`

---

## Scope

추천(Recommendation) 기능에 대한 **증거 기반 요구사항**만 기록한다.

금지:

- 가정 기반 AI 추천 설계
- 스펙 문서만으로의 기능 발명
- mock attempt 데이터를 “학습자 증거”로 취급
- Evidence Strength만으로 Approve / Reject / Implement

허용:

- 반복 관찰에서 나온 Recommendation Request
- Backlog에 보관한 약한 증거 아이디어의 추적
- Human Approval가 난 `Approved Candidate`만 Roadmap 연계

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
| Category | yes (`Recommendation Request` or related) |
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

*(없음 — 실제 학습자 추천 요청 증거 미수집)*

---

## Approved Candidates (Human Reviewed)

*(없음)*

| ID | Title | Strength | Approved By | Approved At | Roadmap Ref |
|----|-------|----------|-------------|-------------|-------------|
| — | — | — | — | — | — |

---

## Backlog Cross-Reference

`docs/evidence-backlog.md`에서 Category가 `Recommendation Request`이고 Status가 `Backlog` / `Observation` / `Candidate`인 항목만 모니터링한다.

현재: **0건**

---

## Recommendation Rule (v1.1)

1. 반복 증거 없는 AI 추천 기능 제안 금지
2. `Backlog` 항목을 개발 로드맵에 올리지 않음
3. `Approved Candidate`만 `docs/roadmap-update.md`에 반영
4. 기능 가치 기준: 학습자 노력 감소 **또는** 학습 효과 향상

---

## Validation

| Check | Result |
|-------|--------|
| No speculative requirements | **PASS** |
| Evidence Strength required on Candidates | **PASS** (template ready; 0 candidates) |
| Human approval required | **PASS** |
| Linked to Evidence Backlog | **PASS** |
