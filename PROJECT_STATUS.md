# PROJECT_STATUS

Last updated: 2026-07-24 (**Beta Candidate · Validation Phase**)  
Architecture Freeze: **ON** (docs/31–35)  
Exam Mode: **ON** (`docs/37`)  
AI Exam OS: **v1.0**  
Knowledge Extraction Mode: **ON** (Evidence/Pilot 우선으로 운영 재정렬)  
**Program State:** **Beta Candidate** (≠ Beta Release)  
**Program Phase:** **Validation** (Validation Driven Development)  
**Active Next:** Internal Pilot `IP-001` (20–30문항 · Evidence Pad · 07 Report)  
`PROMOTION_READY`: **NO** · D4 Persist: **0**

Decision: `docs/program-decision-beta-candidate.md` (`PD-20260724-BETA-CANDIDATE`)

---

## 🎯 P0 — Validation Phase (현재)

### Internal Pilot IP-001

| 항목 | 값 |
|------|-----|
| Goal | 실제 수험생 학습 검증 · Evidence 축적 |
| Volume | **20–30문항** |
| Tools | Pattern Master / Exam Mode · Evidence Pad · Session 기록 |
| Analyst | **07_User_Research_Analyst** (Pilot 후 Report) |
| Priority | Evidence > Minor Polish > Feature |
| OUT | Recommendation · AI Coach · Mastery Execution · SoT 변경 · Parser redesign · `--apply` |

### Beta Candidate Exit Criteria (전부 필요)

- [ ] Internal Pilot 완료
- [ ] Evidence ≥ 20문항
- [ ] 07 Evidence Report
- [ ] Minor Polish 완료 (Pilot 차단분만)
- [ ] Beta Review #2
- [ ] Human Approval → (이후) Beta Release Decision

---

## ✅ Capability Baseline (완료 · 검증 대상)

| Track | Items |
|-------|--------|
| Data | WO-012 Join · WO-013 Master · 013.1 Mapping · 013.2 Metadata · 013.3 Taxonomy |
| Learner State | WO-014 · 014.1 Attempt · 014.2 Policy · 014.2A Apply (**exec OFF**) |
| Experience | M1 Loop · M2.x Pattern First · M2.5 Polish · M2.6 Evidence Pad · **M2.7 Learning UX** · Sprint-04 Polish |

---

## ⛔ Deferred until after Exit Criteria

| Item | Why |
|------|-----|
| WO-015 Recommendation Engine | Evidence 부족 · Beta 이후 |
| WO-016 AI Coach | Evidence 부족 · Beta 이후 |
| Mastery Execution | Policy only · 실행 금지 |
| Promotion `--apply` / D3 Product Persist | READY=NO |
| New Pattern invention / AI lesson generation | Constitution + Beta scope |

---

## ⏳ Parallel (비긴급 · Pilot 비차단)

- `WO-20260722-004` ACC_COST_001 D4 REGISTER — 별도 · Pilot과 병합 금지
- ADR-002 / ADR-003 · dirty hygiene
- KS-001 Pattern Complete — Golden/Evidence 이후 재평가

---

## 🚫 Blocked / Frozen

| Item | Why |
|------|-----|
| docs/35/37 edit · Parser Core redesign | Constitution |
| D3/D4 SoT auto-write · Path L · C4/SaaS | Freeze / Exam Mode |
| Feature Sprint that does not unblock Evidence | Validation Driven rule |

---

## Operating Rule — Validation Driven Development

```text
제안된 작업이 Internal Pilot Evidence를 막는가?
  YES → DO_NOW (Minor Polish / Pilot ops)
  NO  → HOLD until Beta Review #2
```

성공 지표 (현재):

- Evidence 문항 수
- Pilot 세션 완료
- “Pattern을 익혔다” 학습자 발화
- 07 Report 품질

실패 지표:

- 추천/Coach/Mastery 조기 구현
- SoT 무단 수정
- Feature 개수 자랑

---

## Quick pointers

| Doc | Path |
|-----|------|
| **Program Decision** | `docs/program-decision-beta-candidate.md` |
| Evidence Pad | `docs/m2.6-evidence-pad.md` |
| Evidence Learning UX (M2.7) | `docs/m2.7-evidence-learning-system.md` · `docs/m2.7-sprint-report.md` |
| Retrieval / Recall | `docs/retrieval-prompt-spec.md` · `docs/recall-timeline-design.md` |
| Evidence Schema v2 | `docs/evidence-schema-v2.md` |
| Evidence Export v2 | `docs/evidence-export-v2.md` |
| M2.5 Freeze Checklist | `docs/m2.5-beta-freeze-checklist.md` |
| Sprint-04 | `docs/sprint-04-educational-readiness-polish.md` |
| MASTER HANDOFF | `MASTER_HANDOFF.md` |
