# Pattern Mapping Migration Report — Sprint-09G

Date: 2026-07-26  
Role: Pattern Mapping Migration Engineer  
Type: **Approved evidence Mapping Fix** · Question/Answer content frozen

---

## Goal

09F에서 승격된 Cost Pattern(`PROMOTED_PENDING_MAPPING`)과  
Human Gate `approvedEvidenceQuestions`를 Primary/Related로 연결한다.

---

## Mapping Rules

| Field | Rule |
|-------|------|
| `primaryPattern` | 핵심 Algorithm = 승인 COST_* |
| `relatedPatterns` | 기존 `patternId`(before) 보존 |
| `patternId` | `primaryPattern`과 동기화 (frequency validator / MVP link) |
| Content / Answer | **변경 없음** |

Order: PROCESS → JOINT → STD → CVP → MFG

---

## Results

| Metric | Value |
|--------|------:|
| Mapped questions | 20 |
| COST_* patternId coverage | 0 → 20 |
| Existing ACC_* patterns deleted | 0 |
| Content/Answer mutations | 0 |

### Pattern Coverage (frequency)

| Pattern ID | Before | After | Δ |
|------------|-------:|------:|--:|

### Mapping Table

| questionId | beforePattern | afterPrimaryPattern | relatedPatterns | confidence |
|------------|---------------|---------------------|-----------------|------------|
| `ACC_2018_Q079` | `COST_PROCESS_001` | `COST_PROCESS_001` | — | high |
| `ACC_2020_Q073` | `COST_PROCESS_001` | `COST_PROCESS_001` | — | high |
| `ACC_2024_Q073` | `COST_PROCESS_001` | `COST_PROCESS_001` | — | high |
| `ACC_2025_Q073` | `COST_PROCESS_001` | `COST_PROCESS_001` | — | high |
| `ACC_2020_Q074` | `COST_JOINT_001` | `COST_JOINT_001` | — | high |
| `ACC_2024_Q076` | `COST_JOINT_001` | `COST_JOINT_001` | — | high |
| `ACC_2025_Q074` | `COST_JOINT_001` | `COST_JOINT_001` | — | high |
| `ACC_2020_Q075` | `COST_STD_001` | `COST_STD_001` | — | high |
| `ACC_2024_Q074` | `COST_STD_001` | `COST_STD_001` | — | high |
| `ACC_2025_Q075` | `COST_STD_001` | `COST_STD_001` | — | high |
| `ACC_2018_Q071` | `COST_CVP_001` | `COST_CVP_001` | — | high |
| `ACC_2018_Q075` | `COST_CVP_001` | `COST_CVP_001` | — | high |
| `ACC_2018_Q078` | `COST_CVP_001` | `COST_CVP_001` | — | high |
| `ACC_2020_Q076` | `COST_CVP_001` | `COST_CVP_001` | — | high |
| `ACC_2024_Q075` | `COST_CVP_001` | `COST_CVP_001` | — | high |
| `ACC_2024_Q077` | `COST_CVP_001` | `COST_CVP_001` | — | high |
| `ACC_2025_Q076` | `COST_CVP_001` | `COST_CVP_001` | — | high |
| `ACC_2025_Q077` | `COST_CVP_001` | `COST_CVP_001` | — | high |
| `ACC_2018_Q076` | `COST_MFG_001` | `COST_MFG_001` | — | medium |
| `ACC_2018_Q080` | `COST_MFG_001` | `COST_MFG_001` | — | medium |

---

## Acceptance

| Criterion | Status |
|-----------|--------|
| Approved Question만 Mapping | **PASS** |
| 기존 Pattern ID 유지 (ACC_* 레코드 삭제 없음) | **PASS** |
| Mapping Log 존재 | **PASS** |
| Frequency 계산 | **PASS** |
| Rollback 가능 | **PASS** (log.rollback) |
| Question/Answer 내용 변경 없음 | **PASS** (content fingerprint) |

---

## Rollback

1. `data/pattern-mapping-migration-log.json` → `mappings[]`
2. 각 항목 `rollback.patternId`로 `question.patternId` 복원
3. `primaryPattern`, `relatedPatterns` 필드 제거
4. 전 Pattern `frequency` / `relatedQuestions` 재집계
5. COST_* `status`를 `PROMOTED_PENDING_MAPPING`으로 되돌림 (선택)

---

## Next Sprint 제안

1. **09H Runtime Read (optional)** — Learning Loop가 `primaryPattern` 우선 (UI 변경 최소화)
2. **09I Residual Gate** — LINK/MOVE 잔여·peripheral CVP 문항 Human Review 후 추가 Mapping
3. **09J JOB Redefinition** — `COST_ABC_001` REJECT 후속 `COST_JOB_001`

금지 유지: AI Recommendation · Mastery · UI 대변경

---

## Files

| File | Role |
|------|------|
| `data/question-db-mvp.json` | primaryPattern / relatedPatterns / patternId sync |
| `data/pattern-db-mvp.json` | frequency · relatedQuestions · status=ACTIVE |
| `data/pattern-mapping-migration-log.json` | Full mapping + rollback |
| `docs/pattern-mapping-09G-report.md` | This report |

