# Program Decision Report — Beta Candidate Declaration

| Field | Value |
|-------|-------|
| Decision ID | `PD-20260724-BETA-CANDIDATE` |
| Role | 00_Project_Navigator |
| Date | 2026-07-24 |
| Status | **DECIDED** |
| Product State | **Beta Candidate** (≠ Beta Release) |
| Program Phase | **Development → Validation** |

---

## 1. Decision Summary

프로젝트를 **Beta Candidate**로 승격한다.

| 구분 | 판정 |
|------|------|
| Beta Candidate | **YES** — 승격 |
| Beta Release | **NO** — 아직 아님 |
| Next Phase | **Internal Pilot** (실제 수험생 학습 검증) |
| Development posture | **Validation Driven Development** |

기능 개발(추천·Coach·Mastery 실행)보다 **Evidence 축적**을 우선한다.

---

## 2. Completed Baseline (종합)

### Knowledge / Data Track

| WO / Artifact | Status |
|---------------|--------|
| WO-012 Answer Join | COMPLETE |
| WO-013 Pattern Master | COMPLETE |
| WO-013.1 Golden Mapping | COMPLETE |
| WO-013.2 Metadata | COMPLETE |
| WO-013.3 Error Taxonomy | COMPLETE |
| WO-014 Learning State | COMPLETE |
| WO-014.1 Attempt Pipeline | COMPLETE |
| WO-014.2 Mastery Policy | COMPLETE (documented only) |
| WO-014.2A Policy Apply | COMPLETE (schema slots only · **execution OFF**) |

### Learning Experience Track

| Milestone | Status |
|-----------|--------|
| M1 Learning Loop MVP | COMPLETE |
| M2 / M2.2 Pattern First | COMPLETE |
| M2.5 Study Experience Beta Polish | COMPLETE |
| M2.6 Evidence Pad | COMPLETE |
| Sprint-04 Educational Readiness Polish | IMPLEMENTED (Human Re-Review may remain) |

### Safety / Freeze (unchanged)

| Item | Status |
|------|--------|
| Architecture Freeze (docs/31–35) | ON |
| Exam Mode (docs/37) | ON |
| `PROMOTION_READY` | **NO** |
| D4 Persist | **0** |
| Recommendation / AI Coach / Mastery Execution | **NOT IMPLEMENTED** (Beta 이후) |

---

## 3. Judgment Criteria Applied

현재 단계는 **기능 개발 단계가 아니라 실제 학습 검증 단계**이다.

| Question | Answer |
|----------|--------|
| 학습 루프가 동작하는가? | YES (M1) |
| Pattern First 학습 경험이 있는가? | YES (M2.x) |
| 관찰(Evidence) 도구가 있는가? | YES (M2.6 Pad) |
| 추천·Coach·Mastery가 필요한가? | **Beta 이후** — 지금은 Evidence 부족 |
| Beta Release 가능한가? | **NO** — Internal Pilot Exit Criteria 미충족 |

---

## 4. What Changes Now

### In scope (Validation Phase)

1. **Internal Pilot** — 실제 수험생 학습 세션
2. **20–30문항** Evidence 수집 (Evidence Pad)
3. **Session 기록** 유지·내보내기
4. **07_User_Research_Analyst** Evidence Report
5. **Minor Polish** only (Pilot 차단 버그·카피·접근성)
6. **Beta Review #2** → Human Approval → Beta Release 후보

### Explicitly deferred (post-Beta Candidate / post-Pilot)

| Track | WO / Feature | Rule |
|-------|--------------|------|
| Recommendation | WO-015 (planned) | **HOLD until Pilot Evidence** |
| AI Coach | WO-016 (planned) | **HOLD** |
| Mastery Execution | (beyond 014.2A) | **HOLD** — policy documented, not executed |
| New Pattern creation | — | **HOLD** unless Evidence mandates |
| Promotion `--apply` / D3 Product Persist | — | **FORBIDDEN** until READY path |
| Parser Core redesign | — | **FORBIDDEN** |

### Operating rule — Validation Driven Development

```text
Feature idea
  → Does it unblock Internal Pilot Evidence?
       YES → Minor Polish / Pilot ops WO
       NO  → Backlog (post-Beta Review #2)
```

Navigator 우선순위:

1. Evidence 축적  
2. Pilot 운영 안정  
3. 07 분석 리포트  
4. (이후) Beta Review #2  

기능 추가·스마트화는 **Exit Criteria 충족 후**.

---

## 5. Next Phase — Internal Pilot

| Field | Value |
|-------|-------|
| Phase ID | `IP-001` |
| Goal | 실제 수험생 학습 검증 |
| Target volume | **20–30문항** Evidence |
| Tools | Evidence Pad · Session 기록 · Pattern Master / Exam Mode |
| Analyst | **07_User_Research_Analyst** |
| Owner (ops) | Human + Navigator coordination |
| Forbidden | Reco / Coach / Mastery exec / SoT mutation / AI lesson generation |

### Pilot success signal (learning)

수험생이 세션 후 말하는 문장:

> “오늘 ○○ Pattern을 익혔다.”

가 “문제를 N개 풀었다.”보다 우선한다.

---

## 6. Beta Candidate Exit Criteria

Beta Release로 가려면 **전부** 충족:

| # | Criterion | Owner |
|---|-----------|-------|
| 1 | Internal Pilot 완료 | Human / Ops |
| 2 | Evidence ≥ **20문항** | Evidence Pad + export |
| 3 | 07 Evidence Report | 07_User_Research_Analyst |
| 4 | Minor Polish 완료 (Pilot 차단분) | LX / Engineer |
| 5 | Beta Review #2 | Guardian + Human |
| 6 | Human Approval | Project Owner |

하나라도 미충족 시 **Beta Candidate 유지** · Beta Release **보류**.

---

## 7. Program Status Transition

```text
Development Phase
        ↓  PD-20260724-BETA-CANDIDATE
Validation Phase  (현재)
        ↓  Exit Criteria + Human Approval
Beta Release Candidate Review
        ↓
Beta Release  (미래 · 미선언)
```

| Layer | Development Phase | Validation Phase (now) |
|-------|-------------------|-------------------------|
| Primary KPI | Feature / WO complete | Evidence count · Pilot insights |
| Build policy | Ship capability | Stabilize + observe |
| AI features | Placeholder OK | Still deferred |
| Risk focus | Scope creep into Reco/Coach | Insufficient real-learner evidence |

---

## 8. Roadmap Pointers (updated intent)

| Horizon | Intent |
|---------|--------|
| **Now** | Internal Pilot · Evidence ≥20 · 07 Report |
| **Next** | Beta Review #2 · Minor Polish · Human Approval |
| **Later** | Beta Release declaration (별도 Decision) |
| **Post-Beta** | WO-015 Recommendation · WO-016 AI Coach · Mastery Execution (각각 Gate) |

Architecture / Promotion / Parser Freeze 문서는 **본 Decision으로 변경하지 않는다.**

---

## 9. Authority & Safety Affirmation

본 Decision은:

- docs/35 System Safety를 **완화하지 않는다**
- docs/37 Exam Mode를 **폐기하지 않는다**
- D3/D4/`--apply`/Parser Core를 **허가하지 않는다**
- Mastery Policy **실행을 허가하지 않는다**

단지 Program Stage를 **Validation**으로 전환하고,  
실행 우선순위를 **Evidence First**로 고정한다.

---

## 10. Immediate Actions

| # | Action | Who |
|---|--------|-----|
| 1 | 본 Report Adopt 확인 | Human / Project Owner |
| 2 | Internal Pilot 킥오프 (20–30문항 · Evidence Pad) | Human + learners |
| 3 | Evidence export 경로 확인 (`docs/m2.6-evidence-pad.md`) | Ops |
| 4 | 07 Analyst 대기 큐에 Pilot 완료 후 배정 | Navigator |
| 5 | Reco/Coach/Mastery WO **발행 금지** until Exit #1–3 | Navigator |

---

## 11. One-line Program State

> **Beta Candidate · Validation Phase · Evidence First · Internal Pilot Next · Not Beta Release.**

---

## References

- `docs/m2.5-real-study-ready-report.md`
- `docs/m2.5-beta-freeze-checklist.md`
- `docs/m2.6-evidence-pad.md`
- `docs/sprint-04-educational-readiness-polish.md`
- `docs/learning-loop-m1-report.md`
- `docs/m2.2-pattern-first-learning-experience.md`
- `PROJECT_STATUS.md` (동기화)
- `MASTER_HANDOFF.md` §11 / §16 (동기화)
