# Q001 Solution Revision Review (Sprint-09H-2b)

**Authority:** Solution Revision Reviewer  
**Question:** `ACC_INV_Q001`  
**Pattern:** `ACC_INV_001`  
**Prior gate:** Sprint-09H-2 → **REVISE**  
**Decision:** **APPROVE**  
**SoT mutation:** None (Question / Answer / Pattern / Mapping 미수정)

---

## 1. Prior Issue

구 Draft Step5가 FOB 도착지 매입 운송중(+₩200,000)을 매입자 재고에 **포함**한다고 서술했다.  
이는 `ACC_INV_001` Pattern(도착지·미도착 = 판매자 재고 → 매입자 **제외**)과 충돌했다.

동시에 구 Draft는  
`1,000,000 − 300,000 + 60,000 + 70,000 + 200,000 = 1,130,000`  
으로 정답 ③과 숫자만 맞췄다. Pattern과 시험장 판단 과정이 틀렸다.

---

## 2. Corrected Model

출발점: 창고 실사만 보고한 ₩1,000,000 (창고 밖 미포함).

| 항목 | Pattern 판단 | 조정 |
|------|--------------|------|
| FOB 선적지 판매·운송중 ₩300,000 | 이미 출고·소유권 이전 → 재고 제외. 실사에 없으므로 **재차감 없음** | 0 |
| 적송 미판매 60% | 위탁자 재고 → **가산** | +60,000 |
| 시송 미확정 | 판매 미확정 → **가산** | +70,000 |
| FOB 도착지 매입·운송중 ₩200,000 | 소유권 판매자 → 매입자 **가산 금지** | 0 |

**합계:** `1,000,000 + 60,000 + 70,000 = ₩1,130,000` → 정답 **③**

구 Draft의 −300,000과 +200,000은 서로 상쇄되며 같은 숫자를 만들었을 뿐, Pattern 기준 해법이 아니다.

---

## 3. Criteria

| # | 기준 | 결과 |
|---|------|------|
| 1 | FOB 조건 판단 정확 | **PASS** — 도착지 매입 미도착 = 제외; 선적지 판매 = 재차감 금지 |
| 2 | 원본 PDF 정답 일치 | **PASS** — attested `answer.tsv` Q42=3; choice ₩1,130,000 |
| 3 | ACC_INV_001 Algorithm 연결 | **PASS** — Step1 실사 → Step2 소유권 가감 → Step3 확정 |
| 4 | 시험장 재사용 가능 | **PASS** — “창고 밖만 소유권으로 가감” 판단 루프 |

---

## 4. Revised Fields (요약)

- **diagnosis:** 창고 실사 출발 + 창고 밖만 소유권 가감. 도착지 매입 미가산.
- **steps:** 6단계 (실사 → FOB선적 0 → 적송+60k → 시송+70k → FOB도착 0 → 1,130,000 확정).
- **examTrap:** −300k/+200k 동시 적용으로 우연히 정답을 내는 오류를 명시.
- **takeaway:** 선적지 판매=재차감 금지 · 도착지 매입=가산 금지.

전문은 `data/q001-solution-revision.json` → `revisedSolution`.

---

## 5. Decision

**APPROVE**

근거:

1. Pattern 충돌 Issue 해소 (FOB 도착지 = 제외).
2. 공인 정답키·선택지와 수치 일치.
3. 학생이 재사용할 수 있는 실사→소유권 가감 과정으로 재작성됨.

---

## 6. Merge Note (범위 밖)

본 Sprint는 Draft 수정·재심사만 수행한다.  
Question SoT merge는 Q001·Q006·Q022 APPROVE 후 별도 Sprint에서 진행한다.

Machine artifact: `data/q001-solution-revision.json`
