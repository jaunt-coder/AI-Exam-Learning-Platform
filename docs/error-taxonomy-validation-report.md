# Error Taxonomy Validation Report (WO-013.3)

Generated: 2026-07-22T17:30:00Z  
Agent: `06_Education_Knowledge_Engineer`

## Result

**PASS**

| Gate | Status |
|------|--------|
| no answer modification | PASS |
| no question_id modification | PASS |
| no Pattern Master modification | PASS |
| every verified error has evidence | PASS (verified count = 0) |
| unsupported errors remain pending | PASS |

## Scope

- Processed: Pattern Master `validation_status=verified` only (**6** patterns).
- Inputs: `data/pattern-master-db.json`, `data/pattern-metadata-db.json`, `data/golden-pattern-mapping.json`.
- Supporting read-only check: linked Phase1 question stems / `calculationProcess` (SoT 미수정).
- Excluded: non-verified Master patterns, coarse buckets, invented “자주 틀리는” 조언.

## Summary Counts

| Metric | Value |
|--------|------:|
| processed patterns | 6 |
| verified errors | 0 |
| partial errors | 5 |
| pending errors | 11 |
| total error candidates | 16 |
| unresolved issues | 5 |

## Why verified = 0

WO-013.2와 동일 사실:

- Phase1 `solution.wrongAnalysis`가 관련 문항 전부 **공란**.
- Human attestation / SoT 오답분석 Persist 없음.
- Accuracy > Completeness → **빈 verified가 잘못된 verified보다 우선**.

## Pattern Review Matrix

| pattern_id | concept | solving_algorithm | error candidates | notes |
|------------|---------|-------------------|------------------|-------|
| `ACC_INV_001` | documented | evidenced | 1 partial · 2 pending | FOB 미차감→1,330,000 경로만 partial |
| `ACC_INV_003` | documented | pending | 0 partial · 2 pending | Q011/Q012 내용 불일치 — 운반비 오류 발명 금지 |
| `ACC_INV_004` | documented | evidenced | 1 partial · 2 pending | PER 이익률↔원가율 혼동→5,000,000만 partial |
| `ACC_INV_005` | documented | evidenced | 2 partial · 1 pending | NRV 미적용→40개 · 장부수량70 선택 |
| `ACC_INV_006` | documented | evidenced | 0 partial · 3 pending | Q002 ⑤ OCR 불일치로 partial 미채택 |
| `ACC_INV_007` | documented | evidenced | 1 partial · 1 pending | 중개기업 OCI 서술(⑤) partial |

## Partial Errors (evidence-backed reconstruction)

| error_id | pattern_id | error_type | evidence_question_id | reconstruction gist |
|----------|------------|------------|----------------------|---------------------|
| `ERR_ACC_INV_001_01` | ACC_INV_001 | concept_error | ACC_INV_Q001 | 1,000,000+60k+70k+200k=1,330,000 (FOB선적 판매 미차감) |
| `ERR_ACC_INV_004_01` | ACC_INV_004 | concept_error | ACC_INV_Q008 | 2M+6M−(10M×30%)=5M (이익률을 매출원가율로 적용) |
| `ERR_ACC_INV_005_01` | ACC_INV_005 | concept_error | ACC_INV_Q014 | 40,000−Q×100=36,000 → Q=40 (NRV80 미적용) |
| `ERR_ACC_INV_005_02` | ACC_INV_005 | reading_error | ACC_INV_Q014 | 장부수량 70개를 실제수량으로 선택 |
| `ERR_ACC_INV_007_01` | ACC_INV_007 | concept_error | ACC_INV_Q003 | 중개기업 순공정가치 변동을 OCI로 서술 (해설: 당기손익) |

> `partial` ≠ `verified`. Human attestation 또는 SoT `wrongAnalysis` 보강 전 Learning Layer 자동 진단에 사용하지 말 것.
>
> partial 5건 = `ERR_ACC_INV_001_01`, `004_01`, `005_01`, `005_02`, `007_01`.

## Pending Highlights

| error_id | reason |
|----------|--------|
| `ERR_ACC_INV_001_02` | 보기①·② 유일 경로 미확정 |
| `ERR_ACC_INV_001_03` | Golden `ACC_2018_Q042` 오답경로 미작성 |
| `ERR_ACC_INV_003_01/02` | 문항–패턴 내용 불일치 |
| `ERR_ACC_INV_004_02/03` | 다의 경로 / Q038 태그 drift |
| `ERR_ACC_INV_005_03` | 잔여 보기 경로 부족 |
| `ERR_ACC_INV_006_01/02/03` | OCR·Golden·일반화 금지 |
| `ERR_ACC_INV_007_02` | LCM 수치 증거 태그 불일치 |

## Unresolved Issues

1. `ACC_INV_003` classification mismatch (운반비 vs CVP/현금예산).
2. `ACC_INV_004` relatedQuestion content drift (일부 문항).
3. `ACC_INV_007` / `ACC_INV_Q038` patternId drift.
4. Global: `wrongAnalysis` 공란 → verified 불가.
5. `ACC_INV_006` / `ACC_INV_Q002` choice ⑤ OCR vs answer-key conflict.

## Integrity

| Check | Value |
|-------|-------|
| answers unchanged | True |
| question_ids unchanged | True |
| Pattern Master unchanged | True |
| pattern-metadata-db unchanged | True |
| golden-pattern-mapping unchanged | True |
| unsupported verified errors | None |

## Generated Files

- `data/error-taxonomy-db.json`
- `docs/error-taxonomy-validation-report.md`
- `docs/student-error-model-design.md`

## Notes

- Error type vocabulary는 `docs/27-learning-algorithm-spec.md` §13을 스키마로만 채택.
- Tutor UI (`js/ai-tutor-content/*`) 문구는 **자동 verified 승격하지 않음** (UI 레이어 ≠ Educational SoT).
- 다음 권장: Human이 partial 6건 spot-check → SoT `wrongAnalysis` 보강 WO → verified 승격.
