# Student Error Model Design (WO-013.3)

Version 1.0 — 2026-07-22  
Status: **FOUNDATION** (Candidate taxonomy · SoT Persist 아님)  
Agent: `06_Education_Knowledge_Engineer`

---

## 1. Purpose

학습 시스템에서 **학생 오답(mistake)** 을 어떻게 표현·검증·연결할지 정의한다.

본 문서는 Architecture Constitution을 대체하지 않는다.  
교육 지식 계층의 **표현 계약**만 고정한다.

---

## 2. Pipeline Position (불변)

```text
Source
  → Verified Question Data
  → Verified Pattern
  → Educational Knowledge   ← 본 Error Model 위치
  → AI Learning Layer
```

Error Taxonomy는 Verified Pattern **이후에만** 부착한다.  
Question / Answer / Pattern Master를 우회·수정하지 않는다.

---

## 3. Representation Model

### 3.1 Core Entity — `ErrorDefinition`

| Field | Required | Meaning |
|-------|----------|---------|
| `error_id` | Yes | 전역 유일 ID (`ERR_{pattern_id}_{NN}`) |
| `pattern_id` | Yes | Verified Pattern만 허용 |
| `error_type` | Yes | Controlled vocabulary (§4) |
| `description` | Yes | 무엇이 틀리는지 1~2문장 (추정 조언 금지) |
| `evidence_question_id` | Yes | 증거 문항 ID |
| `validation_status` | Yes | `verified` \| `partial` \| `pending` |

Optional:

| Field | Meaning |
|-------|---------|
| `evidence[]` | source path + excerpt |
| `pending_reason` | status≠verified 일 때 필수 권장 |
| `choice_refs` | 보기 번호(있으면) |
| `related_solving_step` | metadata solving_algorithm step index |

### 3.2 What is NOT an ErrorDefinition

- 일반 시험 팁 / 암기 조언
- Pattern 이름만으로 추론한 “자주 틀리는 점”
- 학생 행동 로그 없이 가정한 오답 빈도
- Tutor UI 레이어의 미검증 문구를 `verified`로 승격한 항목

---

## 4. Error Type Vocabulary

출처: `docs/27-learning-algorithm-spec.md` §13 Wrong Type Classification  
(스키마 어휘만 채택. 패턴별 배정은 증거 필요.)

| error_type | label_ko | Definition (operational) |
|------------|----------|---------------------------|
| `concept_error` | 개념 오류 | 회계 원칙·귀속·평가기준을 반대로 적용 |
| `calculation_error` | 계산 실수 | 원칙은 맞으나 수량·비율·사칙 오류 |
| `reading_error` | 조건 해석 실패 | 지문 조건(FOB·실사/계속·이익률 기준 등) 오독 |
| `memory_error` | 암기 부족 | 공식·예외 규정 미회상 (현재 증거 거의 없음 → 기본 pending) |

`unspecified` 는 vocabulary에 포함하되, **pending foundation slot** 전용이다.  
완성된 교육 지식으로 취급하지 않는다.

---

## 5. Validation Status Rules

| Status | Gate |
|--------|------|
| `verified` | (a) SoT `solution.wrongAnalysis` 비어 있지 않음 **또는** Human attestation, **그리고** (b) `evidence_question_id` + `pattern_id` 정합 |
| `partial` | Stem·보기 금액·`calculationProcess`가 특정 오적용 경로를 **재현 가능**하게 지지. Human 승격 전 |
| `pending` | 증거 부족·문항-패턴 내용 불일치·wrongAnalysis 공란. **강제 완성 금지** |

품질 우선순위: **Accuracy > Completeness**  
빈 필드·pending은 허용. 잘못된 교육 설명은 불허.

---

## 6. Linkage Contracts

```text
ErrorDefinition.pattern_id
  ⊆ pattern-master-db.patterns[validation_status=verified]

ErrorDefinition.evidence_question_id
  ∈ pattern-metadata related / golden mapped questions
    (또는 명시적 pending 사유와 함께 대표 문항)

Coach / Recommendation (미래)
  Attempt(incorrect) → (pattern_id, error_id?) → Weakness graph
```

현재 Coach Event의 `errorType` 문자열(예: "개념 오류")은  
본 vocabulary의 `concept_error`와 **매핑 후보**일 뿐, 자동 동일시하지 않는다.

---

## 7. Promotion Path (Human Gate)

```text
pending / partial (WO-013.3 Candidate)
        ↓  Human review + (권장) SoT wrongAnalysis 보강
verified
        ↓  별도 Persist WO (D4 / Product)
Learning Layer 소비
```

WO-013.3 산출물(`data/error-taxonomy-db.json`)은 **staging Candidate**이다.  
Pattern Master · Question · Answer · Product Pattern DB를 수정하지 않는다.

---

## 8. Out of Scope (본 WO)

- 신규 Pattern 생성
- Question / Answer / Pattern Master 수정
- 학생 로그 기반 빈도 통계 확정
- AI Learning Layer 구현·Coach C4 확장
- Tutor UI 문장의 자동 `verified` 승격

---

## 9. Current Foundation Snapshot

| Metric | Value |
|--------|------:|
| Verified patterns in scope | 6 |
| Verified errors | 0 |
| Partial errors | (see `data/error-taxonomy-db.json`) |
| Pending errors | (see `data/error-taxonomy-db.json`) |

근거: Phase1 `solution.wrongAnalysis` 전항 공란 (WO-013.2 확인).  
본 Foundation은 스키마·어휘·후보 슬롯을 고정하고, verified 채움은 후속 Human/Data WO에 남긴다.
