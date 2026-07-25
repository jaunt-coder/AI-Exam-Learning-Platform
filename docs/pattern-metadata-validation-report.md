# Pattern Metadata Validation Report (WO-013.2)

Generated: 2026-07-22T17:00:00Z

## Result

**PASS**

| Gate | Status |
|------|--------|
| no answer modification | PASS |
| no question_id modification | PASS |
| no unsupported metadata | PASS |
| all metadata has evidence (or pending) | PASS |

## Scope

- Processed: Pattern Master `validation_status=verified` only (6 patterns).
- Excluded: pending / coarse buckets / non-verified Master patterns.

## Summary Counts

| Metric | Value |
|--------|------:|
| processed patterns | 6 |
| verified metadata fields | 11 |
| pending metadata fields | 7 |
| unresolved issues | 3 |

## Completed Patterns (field status)

| pattern_id | concept | solving_algorithm | common_errors |
|------------|---------|-------------------|---------------|
| `ACC_INV_001` | documented | evidenced | pending |
| `ACC_INV_003` | documented | pending | pending |
| `ACC_INV_004` | documented | evidenced | pending |
| `ACC_INV_005` | documented | evidenced | pending |
| `ACC_INV_006` | documented | evidenced | pending |
| `ACC_INV_007` | documented | evidenced | pending |

## Pending Metadata

| pattern_id | field | reason |
|------------|-------|--------|
| `ACC_INV_001` | common_errors | question-db solution.wrongAnalysis가 비어 있음. 오답 유형을 추정 생성하지 않음. |
| `ACC_INV_003` | solving_algorithm | relatedQuestions ACC_INV_Q011(CVP/공헌이익), ACC_INV_Q012(매입 현금예산) 본문이 패턴명(운반비·부대비용)과 불일치. 운반비 풀이절차를 추정 작성하지 않음. |
| `ACC_INV_003` | common_errors | wrongAnalysis 공란 + 관련 문항 내용 불일치로 오답 유형 확정 불가. |
| `ACC_INV_004` | common_errors | wrongAnalysis 공란. 오답 함정을 추정하지 않음. |
| `ACC_INV_005` | common_errors | wrongAnalysis 공란. |
| `ACC_INV_006` | common_errors | wrongAnalysis 공란. 보기 함정(⑤)을 일반 오답유형으로 확장 서술하지 않음. |
| `ACC_INV_007` | common_errors | wrongAnalysis 공란. |

## Evidence List

### `ACC_INV_001` — 기말재고 포함 여부 판단

**concept** (`documented`)

| question_id | validation_source | excerpt |
|-------------|-------------------|---------|
| `—` | `docs/pattern-db.md` | ACC_INV_001 \| 기말재고 포함 여부 판단 |
| `—` | `docs/05-pattern-engine-spec.md` | name: "기말재고 귀속" |
| `ACC_INV_Q001` | `data/question-db.json#originalQuestion` | FOB 선적지/도착지, 적송품, 시송품 사실관계가 포함된 기말재고 가액 문항 |
| `ACC_2018_Q042` | `data/golden-pattern-mapping.json` | mapping_status=mapped → ACC_INV_001 (WO-013.1) |

**solving_algorithm** (`evidenced`)

| question_id | validation_source | excerpt |
|-------------|-------------------|---------|
| `ACC_INV_Q001` | `data/question-db.json#solution.calculationProcess` | 기말재고자산 금액 / 실사시 재고자산 금액 ￦1,000,000 / 적송품(위탁판매시) + 60,000 / 시송품(시용판매시) + 70,000 |
| `ACC_2018_Q042` | `data/knowledge/pilot/2018/candidate/ACC_2018_Q042.json#stem` | FOB 선적지 판매 운송중, 적송품, 시송품, FOB 도착지 매입 운송중 |

**common_errors** (`pending`)

### `ACC_INV_003` — 운반비·부대비용과 재고원가

**concept** (`documented`)

| question_id | validation_source | excerpt |
|-------------|-------------------|---------|
| `—` | `docs/pattern-db.md` | ACC_INV_003 \| 운반비·부대비용과 재고원가 |
| `—` | `data/pattern-master-db.json` | pattern_id=ACC_INV_003, validation_status=verified, name=운반비·부대비용과 재고원가 |

**solving_algorithm** (`pending`)

**common_errors** (`pending`)

### `ACC_INV_004` — 매출원가 계산 (PER법)

**concept** (`documented`)

| question_id | validation_source | excerpt |
|-------------|-------------------|---------|
| `—` | `docs/pattern-db.md` | ACC_INV_004 \| 매출원가 계산 (PER법) |
| `ACC_INV_Q008` | `data/question-db.json#originalQuestion` | 매출총이익률 30%, 기초·당기매입·순매출로 기말재고자산원가 질문 |

**solving_algorithm** (`evidenced`)

| question_id | validation_source | excerpt |
|-------------|-------------------|---------|
| `ACC_INV_Q008` | `data/question-db.json#solution.calculationProcess` | 1) 매출원가 = 매출(10,000,000) × (1-매출총이익률 30%) = ￦7,000,000; 2) 기말재고자산 = 기초재고(2,000,000) + 당기매입(6,000,000) - 매출원가(7,000,00... |
| `ACC_INV_Q009` | `data/question-db.json#solution.calculationProcess` | 동일 공식(매출총이익률 → 매출원가 → 기말재고)이 Q009 해설에도 등장 |

**common_errors** (`pending`)

### `ACC_INV_005` — PER vs PR 재고조사법

**concept** (`documented`)

| question_id | validation_source | excerpt |
|-------------|-------------------|---------|
| `—` | `docs/pattern-db.md` | ACC_INV_005 \| PER vs PR 재고조사법 |
| `ACC_INV_Q014` | `data/question-db.json#originalQuestion` | 계속기록법·순실현가능가치 하락·매출원가 인식액으로부터 실제재고수량 역산 문항 |

**solving_algorithm** (`evidenced`)

| question_id | validation_source | excerpt |
|-------------|-------------------|---------|
| `ACC_INV_Q014` | `data/question-db.json#solution.calculationProcess` | 매출원가 = 판매가능재고 - 기말재고자산 = 10,000 + 30,000 - 실제재고수량 × min(100, 80) = ￦36,000; ∴ 실제재고수량 = 50개 |

**common_errors** (`pending`)

### `ACC_INV_006` — FIFO·총평균법 매출원가

**concept** (`documented`)

| question_id | validation_source | excerpt |
|-------------|-------------------|---------|
| `—` | `docs/pattern-db.md` | ACC_INV_006 \| FIFO·총평균법 매출원가 |
| `ACC_INV_Q002` | `data/question-db.json#question` | 재고자산 거래 자료에서 선입선출·가중평균/총평균 설명의 正誤 판단 |
| `ACC_2018_Q068` | `data/golden-pattern-mapping.json` | mapping_status=mapped → ACC_INV_006 (WO-013.1) |

**solving_algorithm** (`evidenced`)

| question_id | validation_source | excerpt |
|-------------|-------------------|---------|
| `ACC_INV_Q002` | `data/question-db.json#solution.calculationProcess` | ① 실지재고조사법하의 선입선출법하의 기말재고; ② 실지재고조사법하의 평균법(총평균법)하의 매출원가; 평균단가·매출원가 계산식; → 실지재고조사법하의 평균법 : 총평균법, 계속기록법하의 평균법 : 이동평균법; ⑤... |
| `ACC_2018_Q068` | `data/knowledge/pilot/2018/candidate/ACC_2018_Q068.json#stem` | 선입선출법과 총평균법, 회계정책 변경(소급법) 후 매출원가 영향 |

**common_errors** (`pending`)

### `ACC_INV_007` — LCM·순실현가능가치 평가

**concept** (`documented`)

| question_id | validation_source | excerpt |
|-------------|-------------------|---------|
| `—` | `docs/pattern-db.md` | ACC_INV_007 \| LCM·순실현가능가치 평가 |
| `ACC_INV_Q003` | `data/question-db.json#originalQuestion` | 기말 재고자산을 원가와 순실현가능가치 중 낮은 금액으로 평가한다는 진술 포함 |
| `ACC_INV_Q039` | `data/question-db.json#originalQuestion` | 저가법·순실현가능가치 자료로 평가손실/매출원가 계산 |

**solving_algorithm** (`evidenced`)

| question_id | validation_source | excerpt |
|-------------|-------------------|---------|
| `ACC_INV_Q039` | `data/question-db.json#originalQuestion` | 순실현가능가치·추정판매비용·저가법 적용 전제 |
| `ACC_INV_Q003` | `data/question-db.json#originalQuestion` | 기말 재고자산을 원가와 순실현가능가치 중 낮은 금액으로 평가 |

**common_errors** (`pending`)

## Unresolved Issues

- `ACC_INV_003`: Phase1 relatedQuestions content mismatch vs pattern name (운반비). Classification repair is out of WO-013.2 scope.
- `ACC_INV_004`: Some relatedQuestions under ACC_INV_004 (e.g. ACC_INV_Q013 display, ACC_INV_Q020 ownership, ACC_INV_Q038 LCM) appear content-mismatched; metadata uses only Q008/Q009-aligned evidence.
- `ACC_INV_007`: ACC_INV_Q038 (LCM numeric solution) is tagged ACC_INV_004 in question-db.json — classification drift; not used as INV_007 numeric evidence.

## Integrity

| Check | Value |
|-------|-------|
| answers unchanged | True |
| question_ids unchanged | True |
| SoT file hashes unchanged | True |

## Generated Files

- `data/pattern-metadata-db.json`
- `docs/pattern-metadata-validation-report.md`

## Notes

- `common_errors` are uniformly pending: Phase1 `solution.wrongAnalysis` is empty.
- Solving steps are quoted/derived only where stem and solution lines align.
- No AI-invented accounting theory was added.
