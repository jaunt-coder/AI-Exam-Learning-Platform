# Promotion Validation Report

Generated: 2026-07-20 (dry-run, `--write-candidate`)
Spec: [`docs/34-truth-split-migration-plan.md`](../../docs/34-truth-split-migration-plan.md)
Command: `py -3 scripts/promote-parser-emit.py --write-candidate`
Result: **PROMOTION_READY: NO** — `--apply` was not run. `data/question-db-mvp.json` was **not** modified by this operation.

---

## 1. Dry Run 결과

| 항목 | 값 |
|---|---|
| Emit source | `data/regression/parser-emit/question-db-parser.json` |
| Product baseline | `data/question-db-mvp.json` |
| Candidate count | 240 (6 years × 40) |
| Candidate output | `data/promotion/candidate-question-db.json` (shadow only, dry-run) |
| GATE HARD CHECKS | **FAIL** (G6 × 15) |
| DISPLAY ACCEPTANCE | **NOT READY** |
| `--apply` 실행 여부 | 미실행 (요청에 따라 실행하지 않음) |
| Product Snapshot 변경 여부 | **없음** (`git status` 확인: `question-db-mvp.json` diff는 이번 실행 이전부터 존재한 별개 변경이며, 이번 dry-run으로 추가 변경 없음) |

## 2. Diff 통계 (Candidate vs 현재 Product, 240 records 기준)

스크립트 자체 집계(`S1`):

| 필드 | 차이 건수 / 240 |
|---|---|
| `answer` | 0 |
| `patternId` | 74 |
| `hasTable` | 104 |
| `table` | 117 |
| `choices` | 223 |
| `question` | 240 |
| `originalQuestion` | 240 |

세부 분해(추가 분석):

| 세부 항목 | 건수 | 의미 |
|---|---|---|
| `answer` 불일치 (G5) | 0 | 정답 불변 invariant 완전 충족 |
| `choices` 배열 길이 불일치(구조 파손) | 0 | 구조적 손상 없음, 5개 유지 |
| `choices` 텍스트만 차이 | 223 | 표현/OCR 정합성 차이 |
| `hasTable` False→True (표 추가) | 79 | 후보가 표를 새로 인식 |
| `hasTable` True→False (표 제거) | 25 | 후보가 기존 표를 제거 — 회귀 위험 후보 |
| `table` null↔present 불일치 | 104 | 위 두 항목과 정합 |
| `patternId` 미해결 (G6) | 15 | `ACC_COST_001` — Pattern DB(D4)에 미등록 |

## 3. Severity 분류

### Critical (승격 차단, 해소 전 `--apply` 불가)

| 항목 | 건수 | 근거 |
|---|---|---|
| G6 Pattern 미해결 (`ACC_COST_001`) | 15건 (2015 Q073, 2017 Q072/074/079, 2018 Q072/073/077/078, 2020 Q071/075, 2024 Q074, 2025 Q075/076/078/080) | `data/pattern-db-mvp.json` 전체 17개 patternId 중 COST 계열은 `ACC_COST_002`만 존재. `ACC_COST_001`은 어디에도 등록되어 있지 않음 → Emit 측 분류기와 Pattern Master(D4) 간 참조 불일치. 게이트가 이미 하드 FAIL 처리 중이므로 자동으로 승격이 막혀 있음(안전). |

### Warning (Human Review 필요, 자동 판단 금지)

| 항목 | 건수 | 근거 |
|---|---|---|
| `hasTable`/`table` 불일치 | 104건 (표 추가 79 / 표 제거 25) | 표 제거 25건은 학생 화면에서 표가 사라지는 회귀일 수 있음 — 샘플 검증 필요. 표 추가 79건은 개선 가능성이 높으나 오탐(false positive) 여부 확인 필요. |
| `choices` 내용 차이 | 223건 | 배열 길이는 동일(구조 파손 없음)하나 텍스트 표현이 상이. 정답 인덱스는 무결(0건 불일치)하지만 보기 문구 자체의 정확성은 원문 대조가 필요. |
| `patternId` 재분류 (G6 15건 제외한 나머지 59건) | 59건 | 기존 유효 patternId로의 재분류. 유효값이지만 분류 근거 샘플 검증 필요. |

### Cosmetic (참고용, 승격 차단 아님 — 단, 전량 자동승인은 하지 않음)

| 항목 | 건수 | 근거 |
|---|---|---|
| `question` / `originalQuestion` 차이 | 240/240 | docs/32 §0.2-5에 의해 **설계상 당연한 차이**(Emit은 기존 MVP 복제가 목표가 아니라 Source Truth 재생성). `data/analysis/compare-ACC_2015_Q051.txt`, `compare-ACC_2015_Q066.txt`, `compare-ACC_2015_Q073.txt` 3건 수동 샘플 확인 결과, 현재 MVP(OLD) 쪽이 글자 단위로 파편화(`"주\n(\n)감평은..."` 형태)된 반면 Emit(NEW) 쪽은 정상 join — **방향성은 개선으로 추정**됨. 그러나 240건 전체를 이 3개 샘플로 일반화할 수 없어 "Cosmetic 자동승인"이 아닌 "Warning과 동일하게 Display Acceptance 대상"으로 유지함. |

## 4. Modified 파일 원인 (`git status` / `git diff` 분석)

이번 세션에서 발생한 변경은 **dry-run 후보 파일 1건**(`data/promotion/candidate-question-db.json`, shadow)뿐입니다. 그 외 워킹트리의 기존 Modified 파일들은 이번 작업 이전부터 존재하던 미커밋 변경이며, 원인을 분석한 결과는 다음과 같습니다.

| 파일 | 원인 분류 | 상세 |
|---|---|---|
| `scripts/exam_pipeline/question_parser.py` (+52/-9), `text_postprocess.py` (+228) | **Legacy Pipeline 패치 (Parser Core 아님)** | `docs/31` §1.2가 진단한 구조(`extract_choices` 8종 추출기 + richness score 경쟁)가 diff에서 오히려 확장되어 있음(`_choice_richness_score`, `candidates` 리스트 방식 추가). 이는 **신규 Parser Core(`scripts/parser/`, Stage1~9)가 아니라 구(舊) `scripts/exam_pipeline/`**에 대한 패치이므로 이번 세션의 "Parser Core 수정 금지" 대상은 아니지만, docs/31이 폐기 대상으로 지목한 구조가 계속 patch되고 있다는 점은 아키텍처 리스크로 별도 기록함(§7). |
| `data/question-db-mvp.json` (+/-800줄), `data/pattern-db-mvp.json` (+/-11줄), `data/statistics-mvp.json`, `data/repair/source-baseline.json`, `docs/question-repair-baseline.md`, `validation-report-mvp.md` | **Legacy Repair Pipeline 실행 결과물** | 위 `exam_pipeline` 패치 및 `data/repair/repair-queue.json`(183건 대기)·`scripts/repair-pipeline.py` 기반 수리 사이클의 산출물로 추정됨. Parser Core(Stage1~9)나 Promotion Gate와 무관한 **별도 경로**로 Product SSOT(`question-db-mvp.json`)를 직접 갱신하고 있음 — docs/35 D3 Owner 원칙(Promotion Pipeline만 D3에 쓰기)과 충돌 가능성이 있는 기존 구조적 이슈. 이번 세션에서 생성하거나 추가로 수정하지 않았음. |
| `js/storage.js` (+10/-1) | **Coach Layer 추가 (하위호환)** | `STORAGE_KEYS`에 `userProfile`, `questionAttempts`, `weaknessReports`, `coach.attempts.v1`, `coach.weakness.v1` 키를 **추가만** 함. 기존 키(`progress`, `wrongAnswers`, `bookmarks`, `recentStudy`, `theme`, `settings`, `examHistory`) 이름 변경 없음 → LocalStorage 계약 위반 없음, `docs/33` Phase C1~C3 요구사항과 일치. |
| `README.md`, `data/analysis/q51-layer-dump.txt` | **문서/디버그 로그 갱신** | 위 repair 사이클 보고 성격의 변경으로 추정. 기능적 영향 없음. |
| `.pyc` 캐시 2건 | **바이트코드 캐시** | `question_parser.py`/`text_postprocess.py` 소스 변경에 따른 자동 재컴파일 산물. 무해. |

**결론**: 이번 세션은 위 Modified 파일 중 어느 것도 생성·수정하지 않았습니다. 다만 `scripts/exam_pipeline/*`와 `data/question-db-mvp.json` 계열 변경은 **신규 Parser Core/Promotion Gate 경로 밖에서 Product SSOT를 직접 건드리는 기존 경로가 여전히 활성 상태**라는 뜻이므로, Truth Split 해소 관점에서 이 legacy 경로의 커밋/폐기 여부를 Review Lead가 판단해야 합니다(§7 참조).

## 5. Promotion 가능 여부

**현재 시점: 불가 (`PROMOTION_READY: NO`)**

차단 이유:
1. G6 하드 게이트 실패 15건(`ACC_COST_001` 미해결) — 스크립트가 이미 `--apply`를 거부하도록 설계되어 있어 안전.
2. Display Acceptance 미충족 — `question`(240) / `choices`(223) 차이가 존재하는 한 스크립트는 `--apply` 시에도 `"refusing apply while question text differs from MVP"`로 재차 거부함(코드 261~266행 확인).
3. 즉, 현재 게이트 설계 자체가 이중으로 안전장치를 두고 있어 **의도치 않은 Product Snapshot 덮어쓰기 위험은 없음**.

## 6. 자동 승인 가능 항목 vs Human Approval 필요 항목

### 자동 승인 완료 (게이트가 이미 결정론적으로 검증함, 추가 인간 판단 불필요)

- G1 파일 로드 무결성 (emit/mvp/pattern 3파일 정상 로드)
- G2 레코드 수 일치 (240건, 연도별 40/40)
- G3 필수 필드 완비 (`questionId`, `year`, `subjectId`, `chapterId`, `originalQuestion`, `question`, `choices`, `answer`, `answerIndex`, `source` — 15건 제외 전량 충족. 단 G6과 별개 필드 자체는 존재)
- G5 정답 불변성 (`answer` drift 0건) — **정답 정합성은 완전히 자동 확인됨**
- `choices` 배열 구조(5개) 무결성

### Human Approval 필요 (자동 판단 금지)

| 결정 항목 | 필요한 의사결정 |
|---|---|
| `ACC_COST_001` 처리 (15건) | ① Pattern DB(D4)에 신규 patternId로 정식 등록(스키마 승인 절차, docs/35 §2.4) ② 기존 `ACC_COST_002`로 재분류 ③ Emit 분류기 로직 재검토. **셀 중 하나만 선택 가능하며 임의 변경 금지 대상**(pattern-db는 D4 Authority) |
| Display Acceptance 표본 검증 | `question`/`choices`/`table` 변경 240/223/117건에 대해 최소 표본(연도별 5~10건) 원문 대조 후 승인 여부 결정 |
| `hasTable` 제거 25건 | 표가 사라지는 케이스이므로 회귀 여부 개별 확인 필요 (임의 자동승인 금지) |
| Legacy `scripts/exam_pipeline/` 활성 상태 처리 | 계속 패치할지, docs/31 로드맵대로 폐기 시점을 확정할지 아키텍처 의사결정 필요 (이번 세션 범위 밖, Review Lead 보고 사항) |

## 7. 남은 Blocker

1. **G6 Pattern 미해결 15건** — Promotion 하드 블로커. Pattern DB 소유자의 승인 없이는 해소 불가.
2. **Display Acceptance 미달** — `question`/`choices` 콘텐츠 240/223건 차이는 표본 검증 없이는 승격 불가(스크립트가 이미 거부 로직 내장).
3. **`hasTable` 회귀 후보 25건** — 표 소실 가능성, 개별 확인 전까지 Warning 유지.
4. **Legacy Repair 경로 활성화 상태** — `scripts/exam_pipeline/` + `scripts/repair-pipeline.py`가 Promotion Gate와 무관하게 `question-db-mvp.json`을 직접 갱신 중인 기존 변경이 워킹트리에 미커밋 상태로 남아 있음. Truth Split 완전 해소를 위해서는 이 경로의 존속 여부를 아키텍처 차원에서 결정해야 함(이번 세션은 이 파일들을 건드리지 않았으며, 커밋도 하지 않음).
5. **미커밋 M 파일 다수** — 위 legacy 변경분이 커밋되지 않은 상태로 남아 있어, 다음 세션에서 우발적으로 Promotion Gate와 혼동되지 않도록 별도 처리(커밋 또는 revert 결정)가 필요.

---

*본 리포트는 dry-run 산출물이며 Product Snapshot(`data/question-db-mvp.json`)을 변경하지 않았습니다.*
