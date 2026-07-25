# Solution Content Foundation Report

Sprint-09H-1 · Solution Content Architect  
Date: 2026-07-26  
Status: **DRAFT for Human Review** — Question / Answer / Pattern / Mapping / Runtime **미수정**

근거 Audit: [question-learning-integrity-audit.md](question-learning-integrity-audit.md)  
Draft 저장소: `data/question-solution-draft-review.json` (**Question SoT 아님**)

---

## 1. Goal

Pattern `#1 ACC_INV_001` Master 선언 5문항에 대해  
**Question-level Solution Content Foundation**을 구축한다.

- Pattern metadata algorithm은 재사용
- 문항별 판단 과정(`diagnosis` · `steps` · `examTrap` · `takeaway`)을 추가
- Human Review 가능한 draft 상태로 유지 (SoT merge 금지)

---

## 2. Scope

| Item | Value |
|------|-------|
| Pattern | `ACC_INV_001` 기말재고 포함 여부 판단 |
| Questions | `ACC_INV_Q001`, `Q006`, `Q019`, `Q022`, `Q037` |
| In scope | Solution draft JSON + 본 보고서 |
| Out of scope | Question 본문 · Answer · Pattern · Mapping · Runtime · Tutor Override 파일 수정 |

### Pattern algorithm (재사용 원본)

`data/pattern-metadata-db.json` · status `evidenced`

1. 실사(창고) 재고금액을 출발점으로 둔다.  
2. 소유권·인도조건·위탁·시용 사실을 반영해 가감한다.  
3. 조정 후 기말재고자산 금액을 구한다.  

---

## 3. Solution Schema

```json
{
  "diagnosis": "...",
  "steps": [
    { "order": 1, "title": "...", "explanation": "...", "patternStepRef": 1 }
  ],
  "examTrap": "...",
  "takeaway": "..."
}
```

| Field | Role |
|-------|------|
| `diagnosis` | 이 문항의핵심 판단 |
| `steps[]` | 순서 있는 풀이 · `patternStepRef`로 Pattern algorithm 연결 |
| `examTrap` | 시험장 함정 |
| `takeaway` | Closing / Review 한 줄 |

---

## 4. Per-Question Summary

| questionId | createdFields | reviewStatus | confidence | patternFit |
|------------|---------------|--------------|------------|------------|
| ACC_INV_Q001 | diagnosis, steps(6), examTrap, takeaway, patternAlgorithmLink | PENDING_HUMAN_REVIEW | **high** | strong |
| ACC_INV_Q006 | diagnosis, steps(4), examTrap, takeaway, patternAlgorithmLink | PENDING_HUMAN_REVIEW | **high** | strong |
| ACC_INV_Q019 | + integrityFlags | PENDING_HUMAN_REVIEW | **medium** | weak_mismatch_suspected |
| ACC_INV_Q022 | diagnosis, steps(3), examTrap, takeaway, patternAlgorithmLink | PENDING_HUMAN_REVIEW | **high** | strong |
| ACC_INV_Q037 | + integrityFlags | PENDING_HUMAN_REVIEW | **medium** | weak_mismatch_suspected |

### Differentiation

| Question | Question-specific judgment |
|----------|----------------------------|
| Q001 | FOB선적 판매 − / 적송 60% + / 시송 70천 + / FOB도착 매입 + → 1,130,000 |
| Q006 | 수탁 수수료 A vs 위탁 COGS B · 운반비/100 배분 |
| Q019 | 전환상환우선주 자본증가(DB⑤) + stem 혼재 ㄱㄴㄷㄹ 참고 스텝 |
| Q022 | 위탁 판매 7대 × (700+100/10) = 4,970 |
| Q037 | 변동 기초 + 고정MOH → 전부 기초 77,000 (Pattern 축 다름) |

### Pattern algorithm 연결

| Question | patternStepRef 사용 |
|----------|---------------------|
| Q001 | 1 · 2 · 3 (전 구간) |
| Q006 | 2 · 3 |
| Q022 | 2 · 3 |
| Q019 | 참고 스텝만 2 (본선은 복합금융상품) |
| Q037 | 미사용 (관리회계 축) |

---

## 5. Human Review Checklist

각 draft에 대해:

1. [ ] 원본 PDF와 수치·정답 일치  
2. [ ] `steps` 순서가 시험장 사고와 일치  
3. [ ] `examTrap` / `takeaway`가 과잉·오해 없음  
4. [ ] Q019 stem 혼재 — 자본전환 vs 기말재고 ㄱㄴㄷㄹ **분리 필요 여부**  
5. [ ] Q037 — `ACC_INV_001` 유지 vs Cost/CVP 재분류(별도 Mapping Sprint)  

승인 시 `reviewStatus` → `APPROVED_FOR_SOT_MERGE` (다음 Content Merge Sprint에서만 Question SoT 반영).

---

## 6. Acceptance

| Criterion | Status |
|-----------|--------|
| 5문항 Solution 구조 생성 | **PASS** |
| Pattern algorithm과 연결 | **PASS** (strong 3 · weak 2에 명시) |
| Question별 차별화 | **PASS** |
| Human Review 가능 상태 | **PASS** (`PENDING_HUMAN_REVIEW`) |
| Question/Answer/Pattern/Mapping/Runtime 미수정 | **PASS** |

---

## 7. Next Steps (제안)

1. **Human Review Gate** — high 3문항 우선 승인  
2. **Q019 stem 정비 Audit** — 레코드 분리 여부 결정 (본문 수정은 승인 후)  
3. **Q037 Pattern retarget 검토** — Mapping Sprint에서만  
4. **SOT Merge Sprint** — 승인 draft만 `solution.steps` 등으로 Question DB 반영 (빈 steps 교체)

---

## 8. Files

| File | Role |
|------|------|
| `data/question-solution-draft-review.json` | 5문항 draft + reviewStatus/confidence |
| `docs/solution-content-foundation-report.md` | This report |
