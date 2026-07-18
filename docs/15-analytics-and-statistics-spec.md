# AI Exam Learning Platform

# Analytics and Statistics Specification

Version 2.0


---

# 1. Purpose


본 문서는 AI Exam Learning Platform에서

학습 데이터를 분석하고 사용자의 합격 가능성을 높이기 위한

통계 시스템 기준을 정의한다.


목표:


- 학습 상태 분석
- 취약 영역 발견
- Pattern 숙련도 평가
- AI 추천 데이터 제공
- 시험 대비 전략 제공


---

# 2. Analytics Principle


단순 기록:


```
문제를 몇 개 풀었는가
```


보다 중요한 것:


```
어떤 Pattern을 이해했는가

어떤 Pattern에서 실패하는가

어떤 영역을 우선 보완해야 하는가

```


---

# 3. Analytics Data Source


분석 데이터:


## Question Result


```
Question ID

정답 여부

풀이 시간

시도 횟수

날짜

```


---

## Pattern Data


```
Pattern ID

출제 빈도

중요도

난이도

```


---

## User Learning Data


```
진도

오답

즐겨찾기

시험 기록

```


---

# 4. Analytics Architecture


구조:


```
Learning Data

↓

Statistics Engine

↓

Pattern Analysis

↓

Weakness Detection

↓

Recommendation Engine

```


---

# 5. Basic Learning Statistics


기본 통계:


표시:


```
총 학습 문제 수

정답률

학습 시간

완료 Pattern

오답 수

```


---

# 6. Subject Analysis


과목별:


예:


```
회계학

진도 65%

정답률 72%

취약:
재고자산

강점:
유형자산

```


---

# 7. Chapter Analysis


단원 분석:


표시:


```
Chapter Importance

Completion Rate

Accuracy

Weakness Level

```


---

# 8. Pattern Mastery Analysis


핵심 분석:


Pattern별:


```
Pattern ID

학습 횟수

정답률

최근 결과

숙련도

```


예:


```
ACC_INV_001

출제빈도:
높음

정답률:
45%

상태:
보완 필요

```


---

# 9. Pattern Mastery Score


계산:


```
Mastery Score

=

Accuracy

+

Recent Performance

+

Review Completion

+

Difficulty Adjustment

```


---

# 10. Mastery Level


등급:


## Level 1

미학습


조건:


```
문제 풀이 없음
```


---

## Level 2

학습 시작


조건:


```
정답률 50% 이하
```


---

## Level 3

기본 이해


조건:


```
정답률 50~80%
```


---

## Level 4

숙련


조건:


```
정답률 80% 이상
```


---

## Level 5

완성


조건:


```
고난도 문제 해결 가능
```

---

# 11. Weakness Detection


취약점 판단 기준:


```
높은 출제 빈도

+

낮은 정답률

+

반복 오답

```


우선순위:


```
Priority Score

=

Importance

×

Weakness

×

Exam Frequency

```


---

# 12. Wrong Answer Analytics


오답 분석:


저장:


```
Wrong Pattern

Wrong Type

Wrong Frequency

Last Wrong Date

```


---

# 13. Error Type Classification


오답 유형:


## Concept Error


개념 부족


---

## Calculation Error


계산 실수


---

## Reading Error


조건 해석 오류


---

## Memory Error


암기 부족


---

# 14. Time Analysis


시간 분석:


측정:


```
평균 풀이 시간

Pattern별 시간

시험 시간 대비 속도

```


---

# 15. Mock Exam Analytics


실전 분석:


결과:


```
예상 점수

취약 Pattern

시간 부족 영역

```


---

# 16. Score Prediction


예상 점수:


입력:


```
Pattern Mastery

Mock Score

Learning Volume

Accuracy

```


출력:


```
예상 점수 범위

합격 가능성

```


---

# 17. Dashboard Analytics


메인 화면:


표시:


```
오늘 학습

현재 점수

취약 Pattern TOP 5

추천 학습

진도율

```


---

# 18. AI Recommendation Connection


분석 결과:


↓

추천:


예:


```
재고자산 FIFO Pattern

최근 5회 중 4회 오답

출제빈도 높음


추천:

기초 복습 + 유사문제 5개

```


---

# 19. Statistics Data Schema


예:


```json
{
"userId":"USER001",

"patternId":"ACC_INV_001",

"attemptCount":10,

"correctCount":6,

"accuracy":0.6,

"masteryLevel":3,

"lastAttempt":"2026-08-01"

}
```


---

# 20. Visualization


표현:


```
Progress Bar

Radar Chart

Weakness Map

Heat Map

```


---

# 21. Privacy Rule


통계 데이터:


원칙:


```
개인 학습 목적 사용

외부 공개 금지

익명화 처리

```


---

# 22. Update Cycle


실시간:


```
문제 풀이 후 업데이트
```


정기:


```
주간 분석

시험 전 집중 분석
```


---

# 23. Quality Check


통계 시스템 검증:


```
□ 계산 정확성

□ 데이터 누락 확인

□ Pattern 연결 확인

□ Recommendation 정상 연결

```


---

# 24. Final Principle


좋은 학습 플랫폼은

사용자가 공부한 양을 보여주는 것이 아니다.


진짜 목표:


```
현재 위치 파악

↓

부족한 부분 발견

↓

가장 효과적인 학습 제공

```


Analytics System은

AI Exam Learning Platform의

학습 판단 엔진이다.
