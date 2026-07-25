# Pattern Frequency Analysis (WO-013)

Generated: 2026-07-22T16:47:02Z

## Rule

```
pattern.frequency = count(questions where question.patternId == pattern_id)
```

Existing frequency values were **not trusted a priori**; they were recomputed from Question DB.
Results are written to `data/pattern-master-db.json` only (SoT pattern-db*.json untouched).

## Recalculation Table

| pattern_id | before | after | delta | status | reason |
|------------|-------:|------:|------:|--------|--------|
| `ACC_COST_002` | 2 | 2 | +0 | mapped_frequency_verified | count(question.patternId == pattern_id) in data/question-db-mvp.json |
| `ACC_EQ_001` | 16 | 16 | +0 | mapped_frequency_verified | count(question.patternId == pattern_id) in data/question-db-mvp.json |
| `ACC_FIN_001` | 7 | 7 | +0 | mapped_frequency_verified | count(question.patternId == pattern_id) in data/question-db-mvp.json |
| `ACC_FIN_002` | 12 | 12 | +0 | mapped_frequency_verified | count(question.patternId == pattern_id) in data/question-db-mvp.json |
| `ACC_FS_001` | 23 | 23 | +0 | mapped_coarse_bucket | count(question.patternId == pattern_id) in data/question-db-mvp.json |
| `ACC_GEN_001` | 55 | 55 | +0 | mapped_coarse_bucket | count(question.patternId == pattern_id) in data/question-db-mvp.json |
| `ACC_INT_001` | 20 | 20 | +0 | mapped_coarse_bucket | count(question.patternId == pattern_id) in data/question-db-mvp.json |
| `ACC_INV_001` | 5 | 5 | +0 | verified | count(question.patternId == pattern_id) in data/question-db.json |
| `ACC_INV_003` | 2 | 2 | +0 | verified | count(question.patternId == pattern_id) in data/question-db.json |
| `ACC_INV_004` | 14 | 14 | +0 | verified | count(question.patternId == pattern_id) in data/question-db.json |
| `ACC_INV_005` | 1 | 1 | +0 | verified | count(question.patternId == pattern_id) in data/question-db.json |
| `ACC_INV_006` | 6 | 6 | +0 | verified | count(question.patternId == pattern_id) in data/question-db.json |
| `ACC_INV_007` | 4 | 4 | +0 | verified | count(question.patternId == pattern_id) in data/question-db.json |
| `ACC_LEASE_001` | 4 | 4 | +0 | mapped_frequency_verified | count(question.patternId == pattern_id) in data/question-db-mvp.json |
| `ACC_PPE_001` | 42 | 42 | +0 | mapped_coarse_bucket | count(question.patternId == pattern_id) in data/question-db-mvp.json |
| `ACC_PPE_002` | 4 | 4 | +0 | mapped_frequency_verified | count(question.patternId == pattern_id) in data/question-db-mvp.json |
| `ACC_REV_001` | 26 | 26 | +0 | mapped_coarse_bucket | count(question.patternId == pattern_id) in data/question-db-mvp.json |
| `ACC_TAX_001` | 1 | 1 | +0 | mapped_frequency_verified | count(question.patternId == pattern_id) in data/question-db-mvp.json |

## Importance / Grade Revalidation

Frequency alone does **not** set grade. Phase1 grades use documented rationale:

| pattern_id | grade | rationale |
|------------|-------|-----------|
| `ACC_INV_001` | S | 기말재고 귀속·포함 여부 판단은 재고자산 기본 계산 패턴이며 다년도 반복 출제(docs/pattern-db.md, docs/exam-analysis.md). |
| `ACC_INV_003` | A | 운반비·부대비용 원가 배분은 특정 조건에서 중요하나 출제 빈도는 상대적으로 낮음(A). |
| `ACC_INV_004` | S | PER법 매출원가 계산은 최고 빈도(14) · 합격 전략상 필수(docs/statistics.md priority HIGH). |
| `ACC_INV_005` | B | PER vs PR 재고조사법 비교는 간헐 출제(1회) · 보조 개념(docs/25 grade B). |
| `ACC_INV_006` | S | FIFO·총평균법 매출원가는 기본 계산 패턴 · 다년도 반복(docs/pattern-db.md). |
| `ACC_INV_007` | S | LCM·순실현가능가치 평가는 기본 평가 패턴 · 최근 연도 연속 출제(2022/2024/2025). |

MVP-only patterns: grade **inherited** (not re-authored). Coarse buckets flagged `mapped_coarse_bucket`.

## Cross-DB frequency conflicts (informational)

| pattern_id | Phase1 after | MVP after | Master uses |
|------------|-------------:|----------:|-------------|
| `ACC_INV_001` | 5 | 1 | Phase1 |
| `ACC_INV_003` | 2 | 3 | Phase1 |
| `ACC_INV_004` | 14 | 2 | Phase1 |
| `ACC_INV_006` | 6 | 19 | Phase1 |
| `ACC_INV_007` | 4 | 3 | Phase1 |

## Recalculated

**YES** — all Master pattern frequencies recomputed from Question DB counts.
