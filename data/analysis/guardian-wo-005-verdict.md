# Guardian Verdict — WO-20260722-005 (Exam Mode Constitution)

_Extracted from agent transcript 08f40c6f-abe7-4685-be29-ce805c686899 (assistant message)._

### Scope Card
- IN:
  - `docs/37-exam-first-development-policy.md` **신규** — **Human Policy Adopt 후** Persist만
  - Adopt 후 Memory: `MASTER_HANDOFF.md` / `PROJECT_STATUS.md`에 docs/37·Exam Impact **교차참조(최소)**
  - (선택·최소) `docs/agent/orchestration-design.md`에 Work Order 헤더 필드 `exam_impact_score` **참조 1칸** (본문 복제·35 재정의 금지)
- OUT:
  - `docs/31`–`docs/35` 수정 · Architecture 재설계
  - Parser · D3/D4 write · `--apply` · Unfreeze · Path L
  - C4 / SaaS / 상용화 / UI polish **전용** Sprint 생성(본 Track)
  - CLOSED WO REWORK · `WO-20260722-004`와 **병합**
  - 37로 35 Ownership/Four Plane/Parser/Promotion/Human Approval **완화·우회**
- FROZEN:
  - **docs/35** (System Safety) · Parser Core · Promotion ownership · Human Approval 규율
- HUMAN_ONLY:
  - **Policy Adopt** (문구·Persist 인가)
  - 공부/개발 시간 배분·“공부 침해 시 개발 중단” **최종 판단**
  - Exam Impact **≤2** 작업의 시험 후 연기/폐기
  - D3/D4/`--apply`/Unfreeze (기존 규율 불변)

---

## 1. Guardian Verdict
- code: **CONDITIONAL-GO**
- constitution_checks:
  - [pass] plane_touch=`none` — Four Plane 권위 변경 제안 없음
  - [pass] Navigator Hierarchy(35 Safety → 37 Priority → Decisions)는 docs/35와 **정합 가능**
  - [fail-if] 37이 “번호가 높으니 35보다 우선” 또는 Apply/D4/Parser Freeze를 Exam Impact로 **우회**
  - [pass] D3/D4/`--apply`/Parser를 본 WO IN에 넣지 않음
  - [pass] CLOSED tracks·004와 병합 금지 명시
  - [pass] 02/03 기본 비호출 — 정책 Track으로 적절
  - [warn] `.cursor/rules/document-priority.mdc`의 “최신 번호 우선”과 **충돌 소지** → 37에 **Safety 예외(35 불변)** 명문화 필수
- conditions:
  1. **Hierarchy 고정 문구 필수:**  
     `docs/35 = System Safety (불변·충돌 시 항상 승)` → `docs/37 = User Goal / 개발 우선순위만` → 개별 WO.  
     37은 35의 Ownership·Planes·Parser·Promotion·Human Approval·Freeze를 **완화·우회·재해석 금지**.
  2. **필수 섹션:** Mandate·Hierarchy · Principles 1–5 · Tier 1–3(2026.07–2027.04) · Forbidden Until Exam · Exam Impact Score 0–5 + 진행 기준(5즉시/4조건부/3병행/2시험후/1폐기) · Non-goals · **docs/36 관계**(폐기 아님·우선순위 보완).
  3. **Forbidden Until Exam**에 최소 포함: C4 고도화 · 과도한 Architecture/재설계 · 상용·SaaS·제품화 · 불필요 자동화 · 35 우회성 “편의 예외”.
  4. **Exam Impact ≠ Authority:** Score 5라도 `--apply`/D4 write/Unfreeze/Parser 편집을 **자동 허가하지 않음**. Safety Gate(Human·기존 orchestration) 별도.
  5. **시간 중단 조항:** “공부 시간 침해 시 개발 중단” = **Human-only**. Automation/Night Job이 시험을 대리·강제하지 않음.
  6. **Track 분리:** `WO-20260722-004` 등 기존 실행 Track **병합·불법 재개 금지**. 채택 후 004는 Exam Impact로 **재평가만**.
  7. **Persist 순서:** Guardian 판정 → **Human Policy Adopt** → 그다음 `docs/37` 생성/저장 → Memory 교차참조. Guardian·02는 기본 Chain에서 파일 작성하지 않음(User가 초단 Engineer를 따로 요청한 경우만).
  8. **orchestration 패치:** Adopt 후 **최소 참조**(WO 헤더에 `exam_impact_score` 필수)만 허용. 37 전문 복제·35 문구 수정·Gate 축소 금지.
- rationale: 시험 우선 메타정책은 Plane 밖 운영 문서로 두되, **35 비우회**를 문서에 못 박으면 System Safety와 공존한다. 미채택·미명문화 상태로 Score만 주장하면 NO-GO.
- agent_adoption_note:  
  1) Human Adopt → `docs/37` Persist  
  2) Memory: HANDOFF/STATUS에 “전 Agent WO = `exam_impact_score` 필수 · Hierarchy 35>37(priority)” 한 블록  
  3) `orchestration-design.md` Work Order 템플릿에 필드 1줄 + “충돌 시 docs/35” 재확인  
  4) 05 Engine Registry / Navigator Prompt에 동 규칙 반영  
  **금지:** 35 본문 수정 · 37을 Constitution으로 35에 등격 · Score로 Human Gate 대체

---

## 2. Architecture Risk
| 항목 | 등급 |
|------|------|
| authority_risk | **medium** (정책; Persist는 Adopt 후) |
| 37이 35를 “최신 번호”로 덮음 | **Critical** → conditions #1로 차단 |
| Exam Impact로 Apply/D4 정당화 | **Critical** |
| docs/36 “폐기” 오해 | High |
| 공부 중단을 Agent가 대리 | High |

---

## 3. Condition Checklist
| # | 검토 | 결과 |
|---|------|------|
| 1 | docs/35 충돌·우회 | **조건 충족 시 PASS** |
| 2 | 2027-04·점수 상승 직접성 | PASS (정책 목적 정합) |
| 3 | Tier3·Forbidden 충분성 | **CONDITIONAL** — 상용/C4/재설계/자동화 명시 필수 |
| 4 | Exam Impact ↔ orchestration | **최소 헤더 필드로 모순 해소 가능** |
| 5 | CLOSED/004 병합 | OUT → PASS |
| 6 | 공부 중단 = Human-only | **필수 명문화** |

**Exam Impact 예시 (Tier3 → Score≤2):**  
- 상용·SaaS·결제/멀티테넌트 Sprint → **≤2** (시험 후)  
- Four Plane/docs/35 재설계·대규모 Architecture polish → **≤2** (시험 후; Safety 수정은 별도·사실상 Forbidden)

---

## 4. Gate Recommendation

**Human Policy Adopt 후보 — Guardian 미승인**  
(구현 Gate A/B 아님. Adopt = 정책 문구·Persist 인가.)

---

### (선택) Policy Outline Checklist
| 골격 | 상태 |
|------|------|
| Mandate · Hierarchy (35 Safety > 37 Priority) | **필수 · 명시 강화** |
| Principles 1–5 | Navigator 제시 — 문서에 그대로 |
| Tier 1–3 | 필수 |
| Forbidden Until Exam | 필수 (+ C4·상용·재설계·우회 금지) |
| Score 0–5 + 진행 기준 | 필수 |
| Non-goals (35/Parser/Promotion/상용) | 필수 |
| docs/36 = 보완·비폐기 | **누락 방지** |
| Exam Impact ≠ Authority bypass | **누락 방지** |
| 공부 중단 = Human-only | **누락 방지** |

---

## 5. Navigator / 05_Automation Summary

```text
## WO-20260722-005 — Guardian → Navigator / 05_Automation
- from: 01_Architecture_Guardian
- to: Human Policy Adopt → 04_Memory → All-Agent Adoption
- plane_touch: none · exam_impact_score: 5 (policy meta)
- Verdict: CONDITIONAL-GO
- Guardian Persist: 0 · No docs/37 write · No docs/35 edit · No Gate proxy-APPROVE

### Hierarchy (binding)
docs/35 System Safety (always wins on ownership/planes/parser/promotion/freeze/human approval)
  → docs/37 Exam Mode (dev priority / scheduling only)
  → All WO decisions
37 MUST NOT bypass 35. Exam Impact ≠ --apply/D4/Unfreeze authorization.

### Scope lock
IN: docs/37 create AFTER Human Adopt; Memory cross-ref; optional orchestration header field only
OUT: docs/31-35 edits, parser, d3/d4, --apply, C4/saas/commercial sprints, arch redesign, merge with 004/CLOSED

### Chain
00 ✅ → 01 ✅(this) → ★ Human Policy Adopt → 04 Memory → 05 Registry (exam_impact_score mandatory)
Do NOT call 02/03 on this track by default.

### Parallel
WO-20260722-004 stays separate; re-score with Exam Impact after 37 Adopt — no merge.

### Next
1) Human Adopt docs/37 text meeting conditions 1–8
2) Persist docs/37
3) Memory + Registry + optional orchestration 1-line field
4) All future WO headers: exam_impact_score 0–5

### Stop
No file create · No commit · Return to 05_Automation_Agent as-is
```

**Stop.** Scope Card + Verdict 완료. 파일 작성·커밋·docs/35 수정·Gate 승인 대체 없음.