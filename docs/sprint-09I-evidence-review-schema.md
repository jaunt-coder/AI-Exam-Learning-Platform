# Sprint-09I — Evidence Review Schema

**Sprint:** Evidence Quality Gate & Human Review Workflow  
**Date:** 2026-07-26  
**SoT files:** `data/evidence-review-queue.json` (queue) · `data/pattern-db-mvp.json` (approved evidence only after Human Decision)

---

## 1. Purpose

Evidence GAP을 수동 warning에서 **명시적 Human-in-the-loop lifecycle**로 전환한다.

```
Evidence GAP
  → Review Queue
  → Human Decision
  → Evidence Approval
  → Validation PASS
```

금지:

- `question-db-mvp.json` 수정
- ACC_* evidence 자동 생성 (`relatedQuestions` 승격 금지)
- frequency / primaryPattern / patternId 재계산

---

## 2. Object: `patternEvidenceReview`

```json
{
  "patternId": "ACC_REV_001",
  "status": "MISSING_REVIEW",
  "reviewStage": "queue",
  "candidateQuestions": [],
  "approvedQuestions": [],
  "reviewerDecision": null,
  "rationale": "Human review required",
  "updatedAt": "2026-07-26T00:00:00.000Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `patternId` | string | Pattern ID (변경 금지) |
| `status` | enum | 아래 Allowed status |
| `reviewStage` | string | `queue` \| `in_review` \| `closed` |
| `candidateQuestions` | string[] | Human이 검토할 **후보** (자동 채움 금지 · 비어 있을 수 있음) |
| `approvedQuestions` | string[] | 승인된 evidence questionId |
| `reviewerDecision` | string\|null | `APPROVE` \| `REJECT` \| null |
| `rationale` | string | 결정 근거 |
| `updatedAt` | string | ISO-8601 UTC |

---

## 3. Allowed `status`

| status | Meaning |
|--------|---------|
| `MISSING_REVIEW` | top-level 승인 evidence 없음 · Queue 대기 |
| `REVIEW_READY` | 후보 목록 준비 · Human 검토 가능 |
| `APPROVED` | Human 승인 · Pattern DB evidence 반영 완료 |
| `REJECTED` | Human 기각 · evidence 미반영 · `blocked` 집계 |

---

## 4. Decision Policy

1. Queue entry만으로 Pattern DB evidence를 자동 채우지 않는다.
2. `reviewerDecision = APPROVE` + non-empty `approvedQuestions`일 때만  
   Pattern의 `evidence.questions` / `approvedEvidenceQuestions` 갱신 (별도 Approval Sprint).
3. `REJECTED`는 evidence를 비운 채 `blocked`로 집계한다.
4. COST_* (이미 승인 목록 보유)는 Queue 대상이 아니다.

---

## 5. Validator Projection

`validateDatabasePayload` → `evidenceReview`:

```json
{
  "totalPatterns": 21,
  "approved": 5,
  "missingReview": 16,
  "blocked": 0
}
```

| Field | Rule |
|-------|------|
| `totalPatterns` | `frequency > 0` Pattern 수 |
| `approved` | non-empty `approvedEvidenceQuestions` 또는 `evidence.questions` |
| `missingReview` | frequency>0 이고 승인 evidence 없음 (REJECTED 제외) |
| `blocked` | Queue/`status`가 `REJECTED`인 Pattern 수 (Pattern DB 또는 Queue 기준) |

Sprint-09I: **warning mode 유지** — `valid`는 errors만으로 판정. Evidence GAP은 `warnings` + `evidenceReview`로 노출.
