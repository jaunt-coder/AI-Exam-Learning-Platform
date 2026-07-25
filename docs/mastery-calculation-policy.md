# Mastery Calculation Policy (WO-014.2)

Version 1.0 — 2026-07-22  
Status: **DOCUMENTED · NOT EXECUTED**  
Schema: `data/mastery-policy-schema.json`  
Agent: `06_Education_Knowledge_Engineer`

---

## 1. Purpose

관측된 학습 데이터(Attempt → Learning State counters)가  
**언젠가** `mastery_status`로 해석될 수 있는 **정책 프레임**을 정의한다.

본 WO는 다음을 **하지 않는다**.

- 실제 학생 mastery 계산·기록
- accuracy만으로 mastered 선언
- 약점 가정
- 개인화 추천
- Question / Answer / Pattern DB 수정

---

## 2. Pipeline Position

```text
AttemptEvent (WO-014.1)
  → Student Learning State counters (WO-014)
  → Mastery Policy (WO-014.2)   ← 본 문서 (규칙만)
  → (Future) Mastery Apply WO   ← enum 확장 + 실행
  → Recommendation Engine       ← next_action 확장
```

`pattern-metadata-db`는 Pattern 개념·풀이 **참조**만 한다.  
mastery 입력 신호가 아니다.

---

## 3. Mastery Status Enum

| Value | Meaning |
|-------|---------|
| `unknown` | 평가 없음. empty Learning State, WO-014 lock, 또는 미적용. 약함/강함이 아님. |
| `insufficient_data` | 시도는 있으나 최소 attempt 미달로 상위 라벨 불가. |
| `learning` | 최소 데이터 충족·초기 연습 단계. developing 미도달. |
| `developing` | attempt·accuracy·recent_performance 다중 게이트로 성장 중. |
| `mastered` | attempt + overall accuracy + recent_performance(+ confidence) 다중 게이트 충족. |
| `review_required` | 충분한 이력 위에서 **최근 성과 불안정/하락**이 관측될 때. 첫 오답 ≠ review. |

**불변:** 모든 상태에서 `accuracy_alone_sufficient = false`.

---

## 4. Input Metrics

| Metric | Source |
|--------|--------|
| `attempt_count` | `pattern_states[].attempt_count` |
| `correct_count` | `pattern_states[].correct_count` |
| `wrong_count` | `pattern_states[].wrong_count` |
| `accuracy` | `correct_count / attempt_count` (없으면 `null`) |
| `recent_performance` | 동일 `pattern_id`의 `question_history` 최근 N건에서 유도 |

`recent_performance` 구성(개념):

- `recent_attempt_count`
- `recent_correct_count`
- `recent_accuracy`

N = `candidate_parameters.recent_window_size` (승인 전 미적용).

---

## 5. Minimum Data Requirement

```text
empty Learning State
  → unknown only (row 없음)

0 < attempt_count < min_attempts_for_any_labeled_state
  → insufficient_data 후보

attempt_count >= minimum
  → learning | developing | mastered | review_required 후보
    (각각 multi-gate · auto_apply=false)
```

Pattern Metadata의 concept / solving_algorithm 문구는  
**mastery 조건에 사용하지 않는다.**

---

## 6. Transition Framework (Conceptual Only)

`transition_framework.mode = conceptual_only`  
`auto_apply = false`  
**자동 계산 스크립트·학생 결과 파일 없음.**

### 6.1 Principle

> 여러 지표가 **동시에** 충족될 때만 상위 상태로의 eligibility를 논의한다.  
> accuracy는 일부 게이트의 필요조건일 수 있으나, **충분조건이 아니다.**

### 6.2 Eligibility sketch

| To | Requires (all) | Forbidden shortcut |
|----|----------------|--------------------|
| `insufficient_data` | attempts>0 AND below min | 1회 오답=약점 |
| `learning` | min attempts AND not developing | Metadata 문구로 판정 |
| `developing` | attempts + accuracy + recent not review | accuracy-only |
| `mastered` | higher attempts + accuracy + recent + confidence | 1회 만점=mastered |
| `review_required` | min attempts + recent decline + non-trivial history | 아무 오답=review |

상세 문장: `data/mastery-policy-schema.json#examples[0].transition_framework`.

---

## 7. Confidence Model (`mastery_confidence`)

`error_states.confidence`(WO-014 = `unknown` only)와 **별개**다.  
본 모델은 **mastery_status 라벨에 대한 신뢰도**이다.

| Value | Meaning | Confidence can increase when |
|-------|---------|------------------------------|
| `unknown` | 평가 미실행 | — |
| `low` | 최소 데이터 근접·recent window 빈약 | min attempts 도달, recent window 계산 가능 |
| `medium` | 전체 지표 + recent 방향 일치 | attempt 여유, recent↔overall 합의, 관련 drift 이슈 없음 |
| `high` | 여러 window에서 동일 라벨 안정 | 반복 합의; (미래) verified error 상승 없음 |

현재 Error Taxonomy `verified=0` 이므로  
error-driven **high** 승격 경로는 **blocked**.

---

## 8. Candidate Parameters (pending_human)

스키마 `candidate_parameters`에 숫자 후보를 둔다.  
`approval_status = pending_human`.

연속성 논의용으로 `data/coach/weakness-config.json` 규모를 참고할 수 있으나  
**본 WO에서 적용·실행하지 않는다.**

Apply WO 전에는 Learning State `mastery_status` enum이  
여전히 **`unknown` only**(WO-014)이다.

---

## 9. Downstream Locks

| Lock | Value |
|------|-------|
| Learning State mastery enum | `unknown_only` (WO-014) |
| `recommendation_state.next_action` | `unknown_only` |
| Error-driven mastery/review | blocked until verified errors exist |

---

## 10. Relation to Recommendation Engine

```text
Mastery Policy (documented)
  → Apply WO writes mastery_status (future)
  → Recommendation Engine may read labels
  → next_action enum expansion (separate WO)
```

의존 조건:

1. Attempt Ingest가 실 `question_history`를 유지  
2. 본 Policy Human 승인 + Apply WO  
3. Recommendation은 mastered/review_required를 **입력**으로만 쓰고,  
   WO-014.2가 next_action을 만들지 않음  
4. docs/08 · docs/33 C4와 병합 설계는 후속

---

## 11. Out of Scope

- 실제 mastery 계산 실행
- 추천·학습 경로 생성
- Question / Answer / Pattern / Metadata / Error Taxonomy 수정
- WO-014 Learning State schema enum 즉시 확장
- Coach weakness snapshot과 동일시

---

## 12. Validation Checklist

| Criterion | Status |
|-----------|--------|
| No student mastery assumption | Required |
| No recommendation logic | Required |
| No question modification | Required |
| No answer modification | Required |
| Policy documented | `docs/mastery-calculation-policy.md` |
| Schema generated | `data/mastery-policy-schema.json` |
| Validator | `scripts/wo0142_validate_mastery_policy.py` |
