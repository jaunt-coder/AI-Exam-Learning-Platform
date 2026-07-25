# Review Why Lens — Design

Sprint-04 · WP-01  
Status: **IMPLEMENTED**  
Date: 2026-07-24

---

## Purpose

학생이 Review에서 **왜 맞았는지 / 왜 틀렸는지**를 Pattern 관점으로 이해한다.

## Non-Goals

- 새 해설 생성
- LLM
- 문항별 Error 추론
- SoT 수정

## Assembly (기존 자산만)

| UI 블록 | Source |
|---------|--------|
| 핵심 판단 기준 | `algorithm.decision_tree` (PATTERN_JUDGMENT_CRITERIA) |
| 시험장 먼저 판단 | `knowhow.exam_first[0]` 또는 decision_tree[0].criterion |
| 왜 이 Pattern인가 | `introduction.examiner_intent` / concept |
| 오답 시 Mistake Replay | `verified_mistakes` + Algorithm + Checklist 재노출 |

## Correct path

```text
왜 정답인가 (Pattern 관점)
  → 핵심 판단 기준
  → 시험장에서 무엇을 먼저 판단해야 하는가
  → 이번 문제는 왜 이 Pattern에 속하는가
```

## Incorrect path

```text
왜 오답인가 (Pattern 관점) — 문항별 원인 추정 금지
  → 동일 판단 기준 재확인
  → Mistake Replay (verified 함정 + Algorithm + Checklist)
```

## Integrity

문항 본문·정답·Pattern DB를 읽기만 한다. Attempt를 수정하지 않는다.
