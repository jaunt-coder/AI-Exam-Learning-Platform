# AI Exam Learning Platform

# Recommendation Engine Specification

Version 2.0


---

# 1. Purpose


Recommendation Engine은 사용자의 학습 데이터를 분석하여

개인별 최적 학습 순서를 추천하는 AI 학습 엔진이다.


목표:


- 부족한 Pattern 발견
- 오답 반복 방지
- 효율적인 복습 순서 제공
- 시험일까지 학습 계획 자동 조정


---

# 2. Core Concept


모든 사용자는 같은 순서로 공부하지 않는다.


기존 방식:


```
Chapter 1

↓

Chapter 2

↓

Chapter 3

```


AI 방식:


```
사용자 데이터

↓

취약점 분석

↓

Pattern 우선순위 계산

↓

개인 맞춤 학습 추천

```


---

# 3. Recommendation Architecture


구조:


```
Master Database

+

User Learning Data

↓

Analysis Engine

↓

Recommendation Engine

↓

Learning Roadmap

```


---

# 4. Input Data


Recommendation Engine 입력:


## Master Data


사용:


```
Pattern Importance

Frequency

Difficulty

Relations

```


## User Data


사용:


```
Solved Questions

Wrong Answers

Accuracy

Study History

Time Spent

```


---

# 5. User Data Structure


저장 위치:


```
user-data/

progress.json

wrong-answer.json

history.json

```


---

# 6. Progress Data


예:


```json
{
"questionId":"Q_ACC_INV_001",

"attemptCount":3,

"correctCount":1,

"lastSolved":"2026-07-18",

"accuracy":33
}
```


---

# 7. Wrong Answer Data


예:


```json
{
"questionId":"Q_ACC_INV_001",

"patternId":"ACC_INV_001",

"wrongCount":4,

"lastWrong":"2026-07-18",

"wrongType":"concept_error"
}
```


---

# 8. Pattern Mastery Score


각 Pattern별 숙련도 계산:


```
Pattern Mastery Score

=

정답률

+

최근 학습

+

반복 횟수

+

난이도 보정

```


---

# 9. Weak Pattern Detection


취약 Pattern 조건:


예:


```
정답률 60% 이하

+

2회 이상 오답

+

S급 Pattern


↓

High Priority Weakness

```


---

# 10. Recommendation Score


추천 점수:


```
Recommendation Score

=

Importance Score

×

Weakness Score

×

Exam Priority

```


---

# 11. Learning Priority


추천 순서:


1순위


```
S급 Pattern

+

낮은 정답률

```


2순위


```
A급 Pattern

+

반복 오답
```


3순위


```
B급 Pattern

+

시험 임박
```


---

# 12. Daily Learning Recommendation


오늘의 학습:


Example:


```json
{
"date":"2026-07-18",

"recommendations":[

{
"patternId":"ACC_INV_001",

"reason":

"최근 3회 오답",

"priority":1

}

]

}
```


---

# 13. Review Algorithm


망각 곡선 기반 복습:


기본 주기:


```
1일

↓

3일

↓

7일

↓

14일

↓

30일
```


사용자 성취도에 따라 조정.


---

# 14. Wrong Answer Review


오답 우선순위:


계산:


```
Wrong Priority

=

Wrong Count

×

Pattern Importance

×

Recent Wrong Weight

```


---

# 15. Similar Question Recommendation


사용자가 틀린 문제:


```
Q_ACC_INV_001

```


검색:


```
same Pattern

+

same Wrong Type

+

similar Difficulty

```


추천:


```
Q_ACC_INV_002

Q_ACC_INV_005

```


---

# 16. Learning Roadmap Generation


시험일까지 계획 생성:


입력:


```
시험일

현재 진도

남은 Pattern

약점 데이터

```


출력:


```
Week 1

S급 Pattern 완성


Week 2

A급 Pattern


Week 3

오답 반복


Week 4

Mock Exam

```


---

# 17. Subject Expansion


과목 변경 시:


Recommendation Engine 변경 없음.


사용:


```
Subject Template

+

Pattern Database

+

User Data

```


---

# 18. AI Feedback Generation


피드백 예:


좋은 피드백:


```
재고자산 Pattern 3개 중

2개 숙달

FOB 조건 Pattern은

최근 3회 연속 오답입니다.

오늘 복습 추천합니다.
```


---

# 19. Dashboard Data


생성:


```
statistics-dashboard.json
```


포함:


```
전체 정답률

Pattern 숙련도

취약 단원

학습 시간

예상 점수

```


---

# 20. Recommendation Validation


검증:


□ 중요도 반영

□ 사용자 데이터 반영

□ 오답 데이터 반영

□ S/A/B 우선순위 적용

□ 추천 이유 제공


---

# 21. Privacy Rule


사용자 학습 데이터는:


Master Database와 분리한다.


Master DB:

```
시험 지식
```


User Data:

```
개인 학습 기록
```


혼합 금지.


---

# 22. Future AI Expansion


향후 가능 기능:


## AI Tutor


사용자의 오답 이유 분석


## Adaptive Test


약점 기반 문제 자동 생성


## Score Prediction


현재 상태 기반 예상 점수


---

# 23. Final Principle


AI 학습 플랫폼의 목표는

문제를 많이 보여주는 것이 아니다.


목표:


```
현재 상태 파악

↓

가장 필요한 공부 추천

↓

합격 가능성 증가

```


Recommendation Engine은

개인화 학습의 핵심 엔진이다.
