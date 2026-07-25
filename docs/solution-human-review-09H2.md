# Solution Human Review — Sprint-09H-2

Date: 2026-07-26  
Role: Solution Human Review Gate  
Draft source: `data/question-solution-draft-review.json`  
Decision log: `data/solution-review-decision.json`

**SoT 변경 없음** — Question / Answer / Pattern / Mapping / Runtime 미수정

---

## 1. Scope

| Pattern | `ACC_INV_001` |
|---------|----------------|
| Reviewed | `ACC_INV_Q001`, `ACC_INV_Q006`, `ACC_INV_Q022` |
| Deferred | `ACC_INV_Q019`, `ACC_INV_Q037` (weak_fit · 별도 Gate) |

### Criteria

1. Diagnosis이 문제 핵심 판단을 설명하는가  
2. Step이 실제 풀이 사고 순서를 설명하는가  
3. Pattern Algorithm과 연결되는가  
4. Exam Trap이 존재하는가  
5. Takeaway가 시험장에서 재사용 가능한가  

### Decision codes

| Decision | Meaning |
|----------|---------|
| APPROVE | 학습용 Content로 승인 (SoT merge는 후속 Sprint) |
| REVISE | 수정 방향 명확 · 재심사 필요 |
| REJECT | Draft 폐기 수준 |

---

## 2. Gate Summary

| questionId | Decision | Pattern link | Notes |
|------------|----------|--------------|-------|
| ACC_INV_Q001 | **REVISE** | FAIL (FOB 도착지) | 수정 방향 명시 |
| ACC_INV_Q006 | **APPROVE** | PASS | Merge 대기 가능 |
| ACC_INV_Q022 | **APPROVE** | PASS | Merge 대기 가능 |

Gate 조건: *3문항 모두 APPROVE 또는 수정 방향 명확화* → **충족**

일괄 SoT Merge: **보류** (Q001 REVISE 반영 후)

---

## 3. Item Reviews

### ACC_INV_Q001 — REVISE

| Criterion | Score | Note |
|-----------|-------|------|
| 1 Diagnosis | PASS | 실사 출발 + 소유권 가감 핵심 명확 |
| 2 Steps order | PASS | 실사→FOB선적→적송→시송→도착지→합산 |
| 3 Pattern link | **FAIL** | Step5가 Pattern 기준과 충돌 |
| 4 Exam Trap | PASS | 1,330,000·과소계상 경로 제시 |
| 5 Takeaway | PASS | 「선적 빼고 도착 더한다」 재사용 가능 |

**충돌 상세**

- Pattern / `pattern-engine` 기준: **FOB 도착지·미도착 = 판매자 재고 → 매입자 제외**
- Draft Step5: FOB 도착지 매입 운송중을 **매입자 재고에 가산** (+200,000)
- 합산 ₩1,130,000은 DB 정답③·Tutor Override와 일치하나, Pattern Algorithm 정합 실패

**requiredFix**

1. FOB 도착지 매입·기말 운송중 포함/제외를 Pattern 기준으로 재기술  
2. 원본 PDF·정답키와 ₩1,130,000 정합 재확인  
3. Step5·examTrap을 재검증 결과에 맞게 수정  
4. (필요 시) Answer/해설 정비는 **별도 승인 Sprint** — 본 Gate에서 Answer 수정 금지

---

### ACC_INV_Q006 — APPROVE

| Criterion | Score | Note |
|-----------|-------|------|
| 1 Diagnosis | PASS | A(수탁 수수료) vs B(위탁 COGS) 분리 |
| 2 Steps order | PASS | 판매량→A→운반비 배분→B |
| 3 Pattern link | PASS | 판매분 인식·미판 재고 (Step2–3) |
| 4 Exam Trap | PASS | B=84,000·수수료 6,240 |
| 5 Takeaway | PASS | 공식형 암기 가능 |

수치: A=6,000, B=88,800 → ② 일치.

`approvedForSotMerge`: **true** (Q001 정리 후 일괄 권장)

---

### ACC_INV_Q022 — APPROVE

| Criterion | Score | Note |
|-----------|-------|------|
| 1 Diagnosis | PASS | 판매분×(원가+운반/총수량) |
| 2 Steps order | PASS | 7대→단가 710→4,970 |
| 3 Pattern link | PASS | 적송·위탁 판매분 (Q006 연속) |
| 4 Exam Trap | PASS | 10대 전체 원가 오인 |
| 5 Takeaway | PASS | Q006과 동일 골격 |

수치: 7×710=4,970 → ① 일치.

`approvedForSotMerge`: **true**

---

## 4. Acceptance

| Criterion | Status |
|-----------|--------|
| 3문항 검토 완료 | **PASS** |
| APPROVE 또는 수정 방향 명확화 | **PASS** (2 APPROVE + 1 REVISE+fix) |
| Question/Answer/Pattern/Mapping 미변경 | **PASS** |

---

## 5. Next Actions

1. **09H-2b** — `ACC_INV_Q001` draft REVISE (FOB 도착지 + PDF 대조)  
2. **09H-2c** — Q001 재심사 → 3× APPROVE 시 Merge 개방  
3. **Content Merge Sprint** — 승인 Solution만 Question `solution` 필드 반영 (본문·Answer·Pattern·Mapping 금지)  
4. **09H-3** — Q019 / Q037 weak_fit Gate  

---

## 6. Decision Table (machine)

| questionId | decision | requiredFix |
|------------|----------|-------------|
| ACC_INV_Q001 | REVISE | FOB 도착지 Pattern 정합 · PDF 정답 재확인 |
| ACC_INV_Q006 | APPROVE | — |
| ACC_INV_Q022 | APPROVE | — |
