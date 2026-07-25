# Truth Split Migration Plan

Version 1.0 — 2026-07-20  
상태: **설계 승인 대기** (제품 DB 자동 전환 금지)

> 목표: Parser Emit을 **문항 Source of Truth**로 단일화하고,  
> `question-db-mvp.json`은 Emit의 **Promotion 산출물**로만 존재하게 한다.  
> Parser Core(`scripts/parser/`)·Coach Layer(`js/coach/`)는 본 계획에서 **수정하지 않는다**.

---

## 0. Executive Summary

현재 플랫폼의 최대 구조 결함은 **Truth Split**이다.

| 레이어 | 현재 역할 | 문제 |
|--------|-----------|------|
| Parser Emit | IR Source-Truth JSON | 제품에 연결되지 않음 |
| `question-db-mvp.json` | Display가 실제로 읽는 DB | Emit과 내용이 갈라짐 |
| Display Cleanup | 메모리상 보정 | 제2의 Repair Layer |

**목표 구조**

```
source/original-exams/*.pdf          ← Document Source of Truth
        ↓ (Parser Core, 기존 유지)
data/regression/parser-emit/         ← IR Emit Source of Truth
        ↓ Promotion Gate
data/promotion/candidate-*.json      ← 후보 (미배포)
        ↓ Human Approval
data/question-db-mvp.json            ← Product Snapshot (배포용 복사본)
        ↓
Display (보정 최소화 → 최종 0보정)
        ↓
Student
```

---

## 1. 현재 데이터 흐름 분석

### 1.1 As-Is Flow

```
PDF (source/original-exams/)
  → Parser Pipeline (S1…S6.9 Freeze → S7 Builder → S8 Diff skeleton)
  → data/regression/parser-emit/question-db-parser.json
     + data/regression/ast-sidecar/{year}.json
        ✖ 제품 경로와 단절 (docs/32: 제품 DB 스위치 금지)

[별도 역사 경로]
MVP Rebuild / exam_pipeline / 수동·수리 산출
  → data/question-db-mvp.json   ← 현재 Product Runtime SSOT

js/data-loader.js
  → applyQuestionCleanup (js/data-cleaner.js)
  → QUESTION_CLEANUP_OVERRIDES
  → question.html / exam / tutor / recommendation
  → Student
```

### 1.2 파일별 책임 (현재)

| 파일 | 생성 주체 | 소비 주체 | 수정 허용 |
|------|-----------|-----------|-----------|
| `data/regression/parser-emit/question-db-parser.json` | Stage 7 Builder | 회귀·Diff | Parser 재실행만 |
| `data/regression/ast-sidecar/*.json` | Stage 7 | Diff / 감사 | Parser 재실행만 |
| `data/question-db-mvp.json` | MVP Rebuild 계열 | Frontend 전 구간 | **현재는 사실상 Product SSOT** |
| `js/data-cleaner.js` | Display | 로드 시 메모리 | DB 파일은 미수정 |
| `js/question-cleanup-overrides.js` | Display 예외 | 문항별 덮어쓰기 | 예외 누적 부채 |

### 1.3 Emit vs MVP 실측 Gap (2026-07-20)

동일 ID 240문항. 스키마 키는 호환(`provenance`만 emit 추가).

| 필드 | 불일치 건수 / 240 | 의미 |
|------|-------------------|------|
| `answer` | **0** | 정답 키는 정렬됨 |
| `question` | 240 | stem join/표시 품질 전면 상이 |
| `originalQuestion` | 240 | 동일 |
| `choices` | 223 | 보기 표면 상이 |
| `table` | 117 | 표 markdown/유무 상이 |
| `hasTable` | 104 | 표 존재 판정 상이 |
| `patternId` | 74 | Pattern 분류 상이 |

**결론:** 지금 Emit을 MVP에 덮어쓰면 **학습 UX가 즉시 붕괴**한다.  
Migration은 “파일 복사”가 아니라 **품질 Gate + 단계적 승격**이다.

### 1.4 Display가 보정하는 이유 (부채)

`data-cleaner`는 DB를 고치지 않고 메모리에서:

- footer / 시험지 잡음 제거
- 숫자·회계용어 표시 정규화
- 문항별 `QUESTION_CLEANUP_OVERRIDES` 강제 치환

이는 Parser Source-Truth 원칙과 긴장한다.  
최종 목표에서는 **Display 보정 = 0** (또는 순수 CSS/타이포만).

---

## 2. Source of Truth 정의 (명확화)

Truth를 **한 파일이 아니라 계층**으로 정의한다.  
하위 계층은 상위 계층을 복제·투영할 뿐, 독자 수정하지 않는다.

### 2.1 Canonical Layers

| Layer ID | 이름 | 경로 | 역할 | 직접 수정 |
|----------|------|------|------|-----------|
| **L0** | Document SoT | `source/original-exams/` | PDF/원본 | 원본 교체만 |
| **L1** | IR SoT | Parser AST + sidecar | Freeze된 구조 진실 | Parser Core만 (본 계획 범위 외) |
| **L2** | Emit SoT | `data/regression/parser-emit/question-db-parser.json` | 제품 스키마형 Source-Truth JSON | Stage 7 재실행만 |
| **L3** | Candidate | `data/promotion/candidate-question-db.json` | Promotion 후보 | Gate 스크립트만 |
| **L4** | Product Snapshot | `data/question-db-mvp.json` | GitHub Pages 배포 스냅샷 | **Promotion + Git만** |
| **L5** | Runtime View | 브라우저 메모리 | Display | Cleanup 최종 제거 목표 |

### 2.2 단일 진실 규칙 (문항 본문)

1. **문항 본문·보기·표·숫자**의 유일한 생성 권한 = **L2 Emit** (← L1 IR ← L0 Document).
2. **L4 `question-db-mvp.json`은 L2의 승인된 복사본**이다. 손으로 고치지 않는다.
3. Display(L5)는 L4를 **그대로 렌더**한다. 내용 치환 금지(최종 상태).
4. `solution` / Tutor 해설은 **Learning Enrichment Layer**(별도 계약)로 분리한다.  
   Emit이 비어 있어도 L2 SoT를 훼손하지 않는다.
5. Constitution의 `master-db.json`은 **플랫폼 메타 SSOT**로 유지하되,  
   **기출 문항 표면 텍스트의 실행 SoT는 L2 Emit**으로 본 문서가 우선한다  
   (문서 우선순위: 최신 번호 `34` > 구 SSOT 서술. Schema 키 변경은 별도 승인).

### 2.3 무엇이 SoT가 아닌가

| 항목 | 지위 |
|------|------|
| 현재 `question-db-mvp.json` (Migration 완료 전) | **Legacy Product Snapshot** (임시 SSOT) |
| `data-cleaner` 출력 | View, SoT 아님 |
| Coach mock / attempts | 학습 이벤트, 문항 SoT 아님 |
| Pattern DB | Pattern Master (문항 텍스트 SoT 아님) |

---

## 3. Migration Plan — MVP를 Emit에서 생성하도록 전환

### 3.1 전환 원칙

- Parser Core / Coach **무수정**.
- Emit → Product는 **Promotion Gate만** 수행.
- 한 번에 240문항 전면 교체 금지. **Phase gate**로 진행.
- 매 Phase마다 Rollback 스냅샷 필수.

### 3.2 Phase 정의

#### Phase T0 — Freeze Legacy (즉시, 설계만으로 착수 가능)

| 항목 | 내용 |
|------|------|
| 목적 | 현재 MVP를 Rollback 기준선으로 고정 |
| 행동 | `data/promotion/baselines/mvp-pre-migration.json` 복사(승인 후) |
| 제품 전환 | **없음** — Display는 계속 기존 MVP |
| 완료 조건 | baseline checksum 기록 |

#### Phase T1 — Compare & Contract (현재 단계)

| 항목 | 내용 |
|------|------|
| 목적 | Gap 계량, 승격 계약 고정 |
| 도구 | `scripts/promote-parser-emit.py` (dry-run) |
| 산출 | 필드별 diff 리포트, Gate 체크리스트 |
| 제품 전환 | **없음** |
| 완료 조건 | 본 문서 승인 + dry-run PASS(리포트 생성) |

#### Phase T2 — Emit Quality Gate (Parser 개선은 **별 Track**, Core 침투 최소화)

| 항목 | 내용 |
|------|------|
| 목적 | Display가 보정 없이 읽을 수 있는 Emit 품질 |
| 범위 | join 품질·표 판정·stem 번호 분리 등 — **기존 Stage 계약 준수하에 후속 Parser 작업** |
| 본 계획 | Gate 기준만 정의 (아래 §5). Core 코드 변경은 별도 PR |
| 완료 조건 | Display Acceptance 지표 충족 (§4.3) |

#### Phase T3 — Shadow Candidate

| 항목 | 내용 |
|------|------|
| 목적 | Candidate JSON 생성, 제품 경로 미연결 |
| 명령 | `py -3 scripts/promote-parser-emit.py --write-candidate` |
| 산출 | `data/promotion/candidate-question-db.json` |
| Display | 여전히 `question-db-mvp.json` |
| 완료 조건 | Candidate가 MVP validate 규칙 PASS + Diff Gate PASS |

#### Phase T4 — Canary Promotion (부분 승격)

| 항목 | 내용 |
|------|------|
| 목적 | 연도 또는 Pattern 단위로 소량 교체 |
| 방식 | Candidate 중 승인 ID만 MVP에 merge (스크립트 `--apply --ids …`) |
| 기본 추천 | 표 없는 연도/문항부터 |
| 완료 조건 | Canary 문항 Display smoke + 학습 기능 회귀 PASS |

#### Phase T5 — Full Promotion

| 항목 | 내용 |
|------|------|
| 목적 | 240문항 전량 Emit 기반 |
| 방식 | Approval → Approval → `question-db-mvp.json` 교체 → Git Commit → Release |
| 병행 | Display cleanup 플래그 off 실험 |
| 완료 조건 | §5 Gate 전부 PASS + Rollback 드릴 1회 성공 |

#### Phase T6 — Display Passthrough

| 항목 | 내용 |
|------|------|
| 목적 | `data-cleaner` 내용 보정 제거(또는 no-op) |
| 조건 | T5 이후 2주 canary 또는 전수 육안 샘플 PASS |
| 결과 | L4 → L5 직결 |

### 3.3 “언제” Emit이 MVP를 생성하는가

| 시점 | Emit → MVP? |
|------|-------------|
| Parser 회귀 실행 직후 | **아니오** (L2만 갱신) |
| Diff error = 0 이고 Quality Gate PASS | Candidate 생성 가능 |
| Human Approval 파일 존재 | Apply 가능 |
| Git Commit + Release | 제품 반영 완료 |

**자동 cron/CI가 MVP를 덮어쓰는 것은 금지**한다.  
승격은 명시적 승인 커맨드 + Git 이력으로만 한다.

### 3.4 “어떻게” 생성하는가 (데이터 변환)

1. L2 emit JSON 로드  
2. Product envelope 정규화 (`version`, `generatedAt`, `metadata.pipeline=parser-emit-promotion`)  
3. 레코드에서 Frontend 불필요 시 `provenance`는 **유지 권장**(무시 가능) 또는 sidecar 참조만 남김  
4. `validate-question-db-mvp.py` 동등 규칙 검증  
5. baseline 백업 후 L4 원자적 교체(temp → rename)  
6. checksum manifest 기록

---

## 4. Display Layer 최종 구조 제안

### 4.1 Target

```
question-db-mvp.json (L4 = 승인된 Emit)
        ↓ fetch
data-loader.js  (스키마 validate만)
        ↓
shared-renderer.js  (question / choices / table / hasTable)
        ↓
Student UI
```

**제거 목표**

- 본문 regex cleanup
- 문항별 cleanup overrides (예외는 Parser/Emit 쪽에서 해소)
- “표시용으로 숫자를 다시 쓰는” 로직

**허용 잔존 (View-only)**

- CSS 줄바꿈·표 스타일
- 보기 ①~⑤ 마커 표시(데이터에 마커가 없다는 Emit 계약과 정합)
- 접근성 aria label

### 4.2 Learning Enrichment 분리

| 필드 | SoT | 비고 |
|------|-----|------|
| `question`, `choices`, `table`, `answer` | L2 Emit | 필수 |
| `solution.*` | Enrichment DB 또는 Tutor 엔진 | Emit 공백 허용 |
| Tutor overrides | `js/ai-tutor-content/` | 문항 텍스트 SoT 아님 |

### 4.3 Display Acceptance Gate (Emit이 “보정 없이” 통과해야 하는 기준)

샘플 또는 전수에 대해:

1. `choices.length === 5`
2. stem에 시험지 footer / `A-xx-x` 잔존 없음
3. 숫자 토큰이 원본과 불변(Stage 8 숫자 recall과 연동)
4. `hasTable === true` ↔ `table` non-null 일치
5. 육안 샘플 N문항(권장 연도당 3문항) “풀이 가능” 판정
6. `validate-question-db-mvp.py` PASS
7. 기존 Phase2/3/6 엔진 스모크 PASS

이 Gate를 통과하기 전에는 **T4/T5 금지**.

---

## 5. Promotion Gate 설계

### 5.1 Pipeline

```
Diff PASS (Stage 8: errorCount == 0)
        ↓
Quality Gate (Display Acceptance + MVP schema)
        ↓
Candidate JSON  (data/promotion/candidate-question-db.json)
        ↓
Approval        (data/promotion/APPROVAL.md 또는 approval.json)
        ↓
question-db-mvp.json  (원자적 교체 + baseline 백업)
        ↓
Git Commit
        ↓
Release (GitHub Pages)
```

### 5.2 Gate Checks (필수)

| ID | 검사 | Fail 시 |
|----|------|---------|
| G1 | Emit 파일 존재·JSON 파싱 | 중단 |
| G2 | count == 240, 연도당 40 | 중단 |
| G3 | 필수 키·choices 5·answer==answerIndex | 중단 |
| G4 | Stage 8 diff errors == 0 (metrics/리포트 입력) | 중단 |
| G5 | answer 불변: Candidate.answer == Baseline.answer (전항) | 중단 |
| G6 | patternId ∈ pattern-db-mvp | 중단 |
| G7 | Approval 토큰/서명 존재 (`--apply` 시) | 중단 |
| G8 | baseline 백업 성공 | 중단 |

권장 Soft Gate (경고, Canary에서 hard로 승격 가능):

| ID | 검사 |
|----|------|
| S1 | question/choices diff rate vs baseline (급변 감지) |
| S2 | hasTable flip count |
| S3 | 평균 stem 길이 급변 |

### 5.3 디렉터리 계약

```
data/promotion/
  README.md                         (본 계획 요약 링크)
  candidate-question-db.json        (T3+)
  baselines/
    mvp-pre-migration.json          (T0)
    mvp-before-{timestamp}.json     (매 apply)
  manifests/
    promotion-{timestamp}.json      (checksum, gate results, git sha)
  APPROVAL.md                       (인간 승인 기록)
```

### 5.4 최소 구현

`scripts/promote-parser-emit.py`

- 기본: **dry-run** (리포트만, 파일 미기록)
- `--write-candidate`: Candidate 기록
- `--apply`: Approval + G1–G8 후에만 MVP 교체
- Parser / Coach 코드 경로 **import·수정 없음**

---

## 6. Rollback 전략 (학습 기능 보호)

### 6.1 불변 원칙

1. LocalStorage 키·스키마 변경 없음 (`progress`, `wrongAnswers`, …).
2. `questionId` / `answer` 안정성 최우선 — answer drift 시 즉시 Rollback.
3. Promotion 실패 시 Display 경로는 항상 **직전 baseline MVP**로 복구.
4. Coach·Tutor·Recommendation 코드 경로는 본 Migration에서 건드리지 않음.

### 6.2 Rollback 트리거

| 트리거 | 행동 |
|--------|------|
| Gate G* Fail | apply 안 함 |
| Release 후 학습 스모크 Fail | L4를 직전 baseline으로 복구 커밋 |
| 학생 보고(보기/표 붕괴) | hotfix = baseline restore |
| answer mismatch 1건이라도 발견 | 긴급 Rollback |

### 6.3 Rollback 절차

```
1. data/promotion/baselines/mvp-before-{ts}.json
     → data/question-db-mvp.json  복사
2. py -3 scripts/validate-question-db-mvp.py
3. 핵심 스모크: validate-phase2 / phase3 / phase6
4. Git commit: "revert: rollback question-db-mvp to baseline {ts}"
5. GitHub Pages release
6. postmortem: manifests/promotion-{ts}.json 에 rollback=true
```

### 6.4 Canary 보호

- T4에서 소수 ID만 교체 시, 나머지 240-n은 baseline 유지.
- 문제 발생 시 **해당 ID만 baseline 값으로 되돌리는 partial rollback** 가능.

### 6.5 학습 데이터 호환

| 데이터 | 영향 | 대응 |
|--------|------|------|
| `progress` / `wrongAnswers` | questionId 기준 | ID 유지(현재 240 ID 동일)로 호환 |
| `examHistory` | 동일 | answer 불변 Gate로 채점 안정 |
| bookmarks | 동일 | ID 유지 |
| Tutor overrides | questionId 키 | ID 유지; 본문 변경 시 육안 확인 |

**금지:** Migration 중 questionId 재부여.

---

## 7. 작업 경계 (이번·이후)

### 이번 작업 (허용)

- 본 설계 문서 (`docs/34`)
- Promotion dry-run 스크립트
- `data/promotion/` 안내
- README SoT 절 갱신

### 금지 (이번)

- `scripts/parser/**` 수정
- `js/coach/**` 수정
- `question-db-mvp.json` 자동 덮어쓰기
- Display cleaner 즉시 삭제
- C4 Coach 구현

### 후속 작업 (별도 승인)

- Emit join/표 품질 (Parser Track)
- T0 baseline 스냅샷 커밋
- T4 Canary apply
- Display passthrough

---

## 8. 승인 체크리스트

- [ ] SoT 계층(L0–L5) 정의 승인
- [ ] Phase T0–T6 순서 승인
- [ ] Promotion Gate G1–G8 승인
- [ ] Rollback 절차 승인
- [ ] “자동 승격 금지 / Git 승인만” 승인

승인 전 `docs/32`의 **제품 DB 스위치 금지**는 유지한다.  
승인 후 금지문은 본 문서 Gate를 통과한 경우에만 예외로 개정한다.

---

## 9. 관련 문서

- `docs/32-parser-emit-contract.md` — Emit 계약
- `docs/31-parser-architecture-design.md` — Parser 원칙
- `docs/00-platform-constitution.md` — 플랫폼 헌법 (메타 SSOT)
- `scripts/promote-parser-emit.py` — Promotion Gate (최소 구현)
- `scripts/validate-question-db-mvp.py` — Product schema 검증
