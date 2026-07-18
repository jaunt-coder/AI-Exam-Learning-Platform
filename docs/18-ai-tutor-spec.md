# AI Exam Learning Platform

# AI Tutor Specification

Version 2.0


---

# 1. Purpose


본 문서는 AI Exam Learning Platform에서

사용자에게 개인 과외형 학습 경험을 제공하기 위한

AI Tutor 시스템 기준을 정의한다.


목표:


- 단순 정답 제공을 넘어 사고 과정 교정
- 사용자 수준별 설명 제공
- 반복 학습 효율 향상
- 개인별 약점 코칭


---

# 2. AI Tutor Principle


AI Tutor는

"정답을 알려주는 AI"

가 아니다.


목표:


```
사용자의 현재 이해 수준 파악

↓

오류 원인 분석

↓

맞춤 설명 제공

↓

재학습 유도

```


---

# 3. AI Tutor Architecture


구조:


```
User Answer

↓

Learning Data

↓

Pattern Analysis

↓

AI Tutor Engine

↓

Personal Explanation

↓

Recommendation

```


---

# 4. AI Tutor Input Data


AI Tutor가 사용하는 데이터:


## Question Data


```
Question ID

Pattern ID

Difficulty

Solution

Common Mistake

```


---

## User Data


```
Attempt History

Wrong Answer History

Mastery Level

Learning Speed

```


---

## Pattern Data


```
Exam Frequency

Importance

Required Concept

```


---

# 5. Explanation Level


사용자 수준에 따라 설명 변경


## Beginner


특징:


```
개념 중심

용어 설명

쉬운 예시

```


예:


"기말재고자산은 시험 종료 시점에 남아있는 재고입니다."


---

## Intermediate


특징:


```
풀이 과정

공식 적용

조건 분석

```


---

## Advanced


특징:


```
출제 의도

함정 분석

시간 절약 방법

```


---

# 6. Wrong Answer Diagnosis


오답 발생 시 분석:


유형:


## Concept Error


원인:


```
개념 이해 부족
```


AI:


```
핵심 개념 다시 설명
```


---

## Calculation Error


원인:


```
계산 과정 오류
```


AI:


```
계산 단계 재훈련
```


---

## Reading Error


원인:


```
조건 누락
```


AI:


```
문제 읽기 방법 제시
```


---

## Memory Error


원인:


```
암기 부족
```


AI:


```
암기법 제공
```


---

# 7. Socratic Learning


AI는 바로 답을 제공하지 않는다.


우선:


```
힌트 제공

↓

사용자 사고 유도

↓

필요 시 해설 제공

```


---

# 8. Hint System


힌트 단계:


Level 1


```
방향 제시
```


Level 2


```
핵심 공식 제공
```


Level 3


```
풀이 과정 일부 제공
```


Level 4


```
전체 해설 제공
```


---

# 9. Additional Question Generation


학습 후:


AI 생성:


```
유사 문제

난이도 상승 문제

개념 확인 문제

```


조건:


```
반드시 Pattern 연결

원본 출제 의도 유지

```


---

# 10. AI Feedback Format


응답 구조:


```
1. 왜 틀렸는가

2. 핵심 개념

3. 풀이 방법

4. 다시 풀 때 체크사항

5. 추가 연습 문제

```


---

# 11. Personalized Study Plan


AI 추천:


입력:


```
현재 점수

취약 Pattern

시험일까지 기간

학습 가능 시간

```


출력:


```
오늘 학습 목표

복습 목록

추천 문제

```


---

# 12. AI Memory


저장:


```
학습 Pattern

반복 오류

선호 설명 방식

```


금지:


```
불필요한 개인정보 저장

```


---

# 13. AI Hallucination Prevention


AI 답변 검증:


필수 연결:


```
Question

↓

Pattern

↓

Solution

↓

Source Data

```


AI가 근거 없는 문제 생성 금지.


---

# 14. AI Generated Question Flow


생성:


```
Pattern 선택

↓

난이도 설정

↓

문제 생성

↓

정답 검증

↓

해설 생성

↓

Quality Check

↓

등록

```


---

# 15. Voice Tutor Expansion


향후:


가능:


```
음성 질문

음성 답변

구술 시험 연습

```


---

# 16. Multi Subject Tutor


확장:


```
회계학 Tutor

경제학 Tutor

민법 Tutor

```


공통:


```
AI Tutor Engine

```


콘텐츠:


```
Subject Data

```


---

# 17. AI Tutor Quality Check


검증:


```
□ 설명 정확성

□ Pattern 연결

□ 출제 의도 유지

□ 사용자 수준 적합성

□ 잘못된 정보 없음

```


---

# 18. Commercial Expansion


가능:


```
AI 문제집

↓

AI 개인 과외

↓

AI 시험 코치 서비스

```


---

# 19. Final Principle


AI Tutor의 목적은

사용자를 대신해 문제를 푸는 것이 아니다.


목표:


```
사용자가 스스로 풀 수 있는 능력을 만드는 것

```


AI Tutor는

AI Exam Learning Platform의

개인 맞춤 학습 엔진이다.
