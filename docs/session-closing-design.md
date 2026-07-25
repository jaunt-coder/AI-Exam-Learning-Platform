# Session Closing Design

Sprint-04 · WP-05 (+ WP-03 Takeaway 연동)  
Status: **IMPLEMENTED**  
Date: 2026-07-24

---

## Purpose

세션 종료 후 학생이  
**“오늘 ACC_INV_001(기말재고 포함 여부) Pattern을 익혔다”**  
고 말하게 한다.

## Closing Layout

```text
오늘 익힌 Pattern (이름)
핵심 (concept / overview)
시험장 (examThinking[0] + Takeaway 3줄)
내일은 — Exam Mode 1문항 (고정 문구, Recommendation 아님)
익힌/복습 Pattern 수
```

## Exam Takeaway (WP-03)

최대 3줄, 우선순위:

1. `examThinking`
2. trigger `keyword — cue`
3. judgment `keyword: conclusion`
4. learning points

신규 작성 금지 · 기존 배열 앞에서 절단만.

## Fixed Copy

`내일 같은 Pattern을 Exam Mode로 1문항만 다시 풀어 보세요.`  
→ Recommendation Engine 아님을 UI에 명시.
