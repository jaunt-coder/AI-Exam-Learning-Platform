# Sprint-10F — Priority Model

## Selection Priority (conceptual)

1. 최근 틀린 문제  
2. 최근 오래 안 푼 문제  
3. 같은 Pattern  
4. 같은 Chapter  
5. 랜덤(안정 정렬)

구현은 **가산 점수**로 합산한 뒤 `score` 내림차순 · `questionId` 오름차순으로 확정한다.

---

## Score Weights

| Signal | Score |
|--------|------:|
| Wrong History | +50 |
| Never Solved | +40 |
| Weakness Pattern | +30 |
| Old Attempt (≥7일) | +20 |
| Recent Correct (<2일) | −20 |
| Recently Served (<24h 또는 servedIds) | −30 |
| Same Pattern (soft) | +5 |
| Same Chapter (soft) | +2 |

---

## Tie-break

```
score DESC → questionId ASC
```

동일 입력이면 항상 동일 Queue.

---

## Context Clock

`buildSelectorContext({ nowMs })`로 시각을 주입하면 테스트·파일럿에서 완전 deterministic하다.  
미주입 시 `Date.now()`를 사용한다.
