# Release Candidate 1 (RC1)

Version: **RC1**  
Date: 2026-07-20  
Status: **Documentation freeze for decision gate — not production promote**

> 본 문서는 RC1 정리용이다.  
> **코드 변경 / Promotion `--apply` / Coach C4 착수는 포함하지 않는다.**

---

## 1. Architecture 상태

| 항목 | 상태 |
|------|------|
| Architecture Freeze | **ON** — docs/31–35 준수 |
| Single Truth Authority (docs/35) | 설계 확정. D3 Product Owner = Promotion Pipeline only |
| Parser Core (`scripts/parser/`) | Frozen — Stage 1–9 유지, RC1에서 미수정 |
| Emit Contract (docs/32) | 준수 — read-only Builder, Product 자동 스위치 없음 |
| Coach Agent (docs/33) | C1–C3 완료, **C4 미착수** |
| Truth Split Migration (docs/34) | Gate 구현·dry-run 완료, **Apply 미실행** |
| Promotion | `PROMOTION_READY = NO` |

### Authority Graph (요약)

```
D0 Document → D1 IR → D2 Emit → [Promotion Gate] → D3 Product
                              ✖ Apply blocked
D4 Pattern Master — G6 gap (ACC_COST_001)
D7 Learner State — Coach C1–C3 only
```

---

## 2. 완료 Sprint

| # | Sprint | 결과 |
|---|--------|------|
| 1 | Parser Core Stages (Phase 2–7 / 6.5 / 6.8 / 6.9) | 완료 — IR freeze, Emit 240 records, `mvpDbUntouched` |
| 2 | Coach C1–C3 | 완료 — Profile / Attempts / Weakness |
| 3 | Promotion Gate 검증 (dry-run) | 완료 — Candidate shadow, overwrite 없음, READY=NO |
| 4 | Promotion Decision Support | **PASS** — Evidence 도구·보고서 |
| 5 | Human Approval (ADR 패키지) | **PASS (문서)** — ADR-001~004 작성, 옵션 선택란은 Human 대기 |
| 6 | Architecture Review | **완료** — RC1 진입 승인 (구현 Sprint 아님) |
| — | **RC1 Documentation** | 본 문서 세트 |

---

## 3. 승인된 ADR

RC1 시점 기준, ADR **옵션 체크박스가 서명·선택된 건은 없다.**

| ADR | 내용 | RC1 판정 |
|-----|------|----------|
| — | *(옵션 승인 없음)* | — |

다음을 **프로세스상 승인된 산출물**로 기록한다 (선택지 확정이 아님):

| 산출물 | 의미 |
|--------|------|
| docs/31–35 | Architecture Freeze 권한 문서 |
| Promotion Decision Support Sprint PASS | Evidence/read-only 도구 세트 수락 |
| Engineering Review PASS (Decision Support) | Task List DoD 충족 |
| Architecture Review 완료 | RC1 문서화 착수 허가 |

---

## 4. DEFER된 ADR

Human Approval 옵션이 미기입 상태이므로 아래는 모두 **DEFER / Pending Decision**이다.

| ADR | Topic | Defer 이유 |
|-----|-------|------------|
| [ADR-001](../../data/promotion/adr/ADR-001-acc-cost-001-disposition.md) | `ACC_COST_001` A/B/C | 옵션 미선택 — G6 유지 |
| [ADR-002](../../data/promotion/adr/ADR-002-display-acceptance-criteria.md) | Display Acceptance 기준 | 표본 Human 라벨링·기준 채택 미완 |
| [ADR-003](../../data/promotion/adr/ADR-003-hastable-regression-judgment.md) | hasTable 25건 | 워크시트 미작성 |
| [ADR-004](../../data/promotion/adr/ADR-004-legacy-pipeline-strategy.md) | Legacy Freeze vs Managed | L1/L2 미서명 (운영 권고는 L1) |

---

## 5. Promotion Blocker

| ID | Severity | Blocker | Count / Note |
|----|----------|---------|--------------|
| G6 | Critical | `ACC_COST_001` Pattern Master 미등록 | 15 |
| DA | Warning→Gate | Display Acceptance NOT READY | question 240 / choices 223 |
| HT | Warning | hasTable True→False 미판정 | 25 |
| PID | Warning | patternId 유효 재분류 (G6 제외) | 59 |
| LEG | Process | Legacy Path L이 Product 직접쓰기 가능 (동결 서명 전) | repair queue 183 |
| APPLY | Hard | `--apply` 금지 (스크립트 + 정책) | — |

Field diff snapshot (Candidate vs Product, last dry-run):

| answer | patternId | hasTable | table | choices | question |
|-------:|----------:|---------:|------:|--------:|---------:|
| 0 | 74 | 104 | 117 | 223 | 240 |

---

## 6. 다음 Sprint 조건

다음 구현/Apply Sprint에 진입하려면 **전부** 충족:

1. **ADR-001** 옵션 A/B/C(또는 Hybrid) Human 서명  
2. **ADR-002** Display Acceptance 기준 채택 + 표본 라벨이 기준 통과  
3. **ADR-003** 25건 라벨 완료, TRUE_REGRESSION 정책(H1/H2) 충족  
4. **ADR-004** L1 또는 L2(가드 포함) 서명 — L3 불가  
5. Promotion dry-run 재실행 후 `PROMOTION_READY` 재평가 (여전히 NO일 수 있음 — Apply는 별도 승인)  
6. Parser Core / docs/35 / Product overwrite 없이 진행 가능한 Task List만 허용  

**명시적 비범위 (RC1 이후에도 별도 승인 전 금지):**

- Promotion `--apply`
- Coach **C4** Learning Planner
- Parser Core 수정
- Pattern DB 무단 변경
- Legacy exam_pipeline 무제한 패치

---

## 7. RC1 Baseline

상세 SHA: [`RC1-BASELINE.md`](./RC1-BASELINE.md)

| Component | Identifier |
|-----------|------------|
| Parser Core tree | `dfaa7b50425789e2cc765c041dd7549eaa2c810e64fc3fed0f6972442b6ff031` |
| Emit JSON | `4aebf14eef76b47425605512163c97eb66a2a050ab25bbf570f28624385dd935` |
| Pattern DB | `0a97e796cefba51381ae3721e5d50bbb0e6c04714e5cdf861eeabe0fc18699fd` |
| Product Snapshot | `0cfcaa317bc25c811cebb48e3b53218556b2320f9c3538b2d4583ba9d16a9629` |
| Coach Layer tree | `cf7325be3f8849cd99410901db47f121dbf343e5039c435e8e5949305c234db6` |

---

## 8. 관련 문서

- `PROJECT_STATUS.md` (repo root)
- `CHANGELOG-RC1.md` (repo root)
- `data/promotion/adr/README.md`
- `data/promotion/PROMOTION-DECISION-SUPPORT-SPRINT-REPORT.md`
