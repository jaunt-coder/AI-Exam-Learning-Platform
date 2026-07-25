# Beta Scope Notice

Sprint-04 · WP-06 · WP-08  
Status: **IMPLEMENTED**  
Date: 2026-07-24

---

## Purpose

Coverage 부족을 숨기지 않는다.  
학생이 “전 과목을 매일 공부하는 완성 제품”으로 오해하지 않게 한다.

## Copy (Today's Study)

- **현재 Beta에서는 검증 완료된 Pattern만 학습할 수 있습니다.**
- 지금 학습 가능 **N**개
- Master verified **M**개 중 나머지 **M−N**개는 검증·매핑 후 순차 개방 예정
- 전 과목·전 Pattern이 아님

## Numbers Source

| Metric | Source |
|--------|--------|
| N 학습 가능 | `listStudyPatterns` 결과 길이 |
| M verified | `pattern-master-db` 중 `validation_status=verified` 개수 |

## Non-Goals

- Pattern DB 확장
- 가짜 “곧 100 Pattern” 약속
- Recommendation으로 빈칸 채우기
