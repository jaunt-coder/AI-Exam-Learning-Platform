# Solution Content Merge Report — Sprint-09H-3

**Authority:** Solution Content Merge Engineer  
**Date:** 2026-07-26  
**Pattern:** `ACC_INV_001`  
**Merge mode:** Append-only Learning Content Layer (overlay)

---

## 1. Goal

Human Review Gate에서 **APPROVE**된 3문항 Solution을 Question Learning Content Layer에 반영한다.

| questionId | Gate | Source |
|------------|------|--------|
| `ACC_INV_Q001` | 09H-2b APPROVE | `data/q001-solution-revision.json` |
| `ACC_INV_Q006` | 09H-2 APPROVE | `data/question-solution-draft-review.json` |
| `ACC_INV_Q022` | 09H-2 APPROVE | `data/question-solution-draft-review.json` |

---

## 2. Merge Strategy

기존 Question Object(`data/question-db.json`)는 **유지**한다.  
승인 Solution은 별도 overlay에 **append-only**로 적재한다.

```
Question SoT (immutable this sprint)
  └─ data/question-db.json  → stem / answer / patternId 고정

Learning Content Layer (new)
  └─ data/question-solution-approved.json
       └─ questions[].solution.{diagnosis,steps,examTrap,takeaway,version,reviewStatus,approvedReview}
```

이유:

1. SoT의 legacy `solution` 필드(오염된 PDF dump·빈 `steps`)를 덮어쓰지 않음  
2. Question hash / Answer / Pattern 불변 보장  
3. Overlay 삭제만으로 Rollback 가능  

Runtime 배선은 본 Sprint 범위 밖이다.

---

## 3. Allowed / Forbidden

| 허용 | 금지 |
|------|------|
| solution content 필드 추가 | Question 본문 수정 |
| `solution.version` | Answer 수정 |
| `solution.reviewStatus` → `APPROVED` | Pattern ID 수정 |
| `solution.approvedReview` 기록 | Mapping 수정 |
| | Runtime 수정 |

---

## 4. Merged Shape (요약)

각 문항 overlay 레코드:

```json
{
  "questionId": "ACC_INV_Q00x",
  "patternId": "ACC_INV_001",
  "answer": <snapshot>,
  "solution": {
    "diagnosis": "...",
    "steps": [...],
    "examTrap": "...",
    "takeaway": "...",
    "version": "1.0.0",
    "reviewStatus": "APPROVED",
    "approvedReview": { "gate": "...", "decision": "APPROVE", ... }
  }
}
```

- Q001: 창고 실사 +60k/+70k, FOB 도착지 미가산 → ₩1,130,000  
- Q006: A=6,000 / B=88,800  
- Q022: 7×710=4,970  

---

## 5. Validation Checklist

| Check | Result | Evidence |
|-------|--------|----------|
| 기존 Question hash 유지 | **PASS** | SoT 미수정; core/record SHA-256 전후 동일 (`data/solution-merge-log.json`) |
| Answer 동일 | **PASS** | Q001=3, Q006=2, Q022=1 |
| Pattern 동일 | **PASS** | 전부 `ACC_INV_001` |
| Solution 추가 확인 | **PASS** | overlay 3건 · `reviewStatus=APPROVED` |
| Rollback 가능 | **PASS** | overlay 삭제/entry 제거 |

### Hash Snapshot (SoT, solution 제외 core)

| questionId | questionCoreHashSha256 |
|------------|------------------------|
| ACC_INV_Q001 | `8f75fb148343313b42c16b27cac5923b1fa526a04c2c1506f93d2a1e2ed83d1e` |
| ACC_INV_Q006 | `19367bcf5b4ad7a6f0f9da7d123aceed1f8df7f196175b692afd81cf0dfa70d9` |
| ACC_INV_Q022 | `d678589ffe374a96e0a7c707130dc7e6f8af4e7dec73245c0ecfad4217e3ccc9` |

---

## 6. Deliverables

| File | Role |
|------|------|
| `data/question-solution-approved.json` | Approved Solution Learning Content Layer |
| `data/solution-merge-log.json` | Merge·validation·rollback log |
| `docs/solution-content-merge-09H3.md` | This report |

---

## 7. Out of Scope

- `ACC_INV_Q019`, `ACC_INV_Q037` — Gate 미승인  
- Question SoT in-place `solution` 교체  
- Runtime / Tutor override 전환  
- Mapping·Pattern DB 변경  

---

## 8. Rollback

1. `data/question-solution-approved.json`에서 해당 `questionId` 제거(또는 파일 삭제)  
2. `data/solution-merge-log.json`의 본 Sprint 기록 보존 또는 무효 표시  
3. `data/question-db.json` hash가 pre-merge snapshot과 일치하는지 확인  

SoT는 본 Merge에서 변경되지 않았으므로 별도 restore 불필요.

---

## 9. Verdict

**Solution Content Merge: PASS**

3문항 APPROVE Solution이 Learning Content Layer에 append-only로 반영되었고, Question hash / Answer / Pattern은 불변이다.
