# AI Exam Learning Platform

# Development Roadmap Specification

Version 2.0


---

# 1. Purpose

본 문서는 AI Exam Learning Platform의

실제 개발 순서와 완료 기준을 정의한다.


목표:


- 빠른 MVP 완성
- 구조적 확장 가능성 확보
- 과목 추가 비용 최소화
- Cursor 기반 개발 효율 극대화


---

# 2. Development Principle


개발 원칙:


```
데이터 설계

↓

핵심 학습 기능

↓

개인화 기능

↓

AI 기능

↓

서비스 확장

```


기능보다 데이터 구조를 우선한다.


---

# 3. Development Strategy


전체 전략:


## Phase 0

Foundation


목표:

플랫폼 기반 구축


완료 조건:


□ Repository 생성

□ Cursor Rule 설정

□ docs 구조 완성

□ 데이터 규격 확정



---

# Phase 1

Core Platform MVP


목표:


문제 풀이 가능한 플랫폼 완성


구현:


```
Dashboard

Subject

Chapter

Pattern

Question

Solution

```


필수 기능:


□ 문제 표시

□ 선택지

□ 자동 채점

□ 해설 표시

□ 진도 저장



완료 기준:


하나의 과목 하나의 Chapter가

완전하게 학습 가능해야 한다.


---

# Phase 2

Past Exam Data Integration


목표:


기출 기반 학습 플랫폼화


구현:


```
PDF Analysis

↓

Master DB

↓

Pattern DB

↓

Question DB

```


필수:


□ 기출 원문 저장

□ 연도 저장

□ 출제 빈도 계산

□ Pattern 연결


---

# Phase 3

Pattern Learning System


목표:


문제집이 아닌 Pattern 학습 플랫폼 구현


구현:


Pattern Page:


```
출제 빈도

중요도

핵심 개념

풀이 알고리즘

대표 문제

```


완료 기준:


사용자가 문제보다 Pattern 중심으로 학습 가능


---

# Phase 4

Learning Record System


목표:


사용자 학습 데이터 축적


구현:


```
Progress

Wrong Answer

Bookmark

History

```


저장:


LocalStorage

또는

Database


---

# Phase 5

Personal Recommendation


목표:


AI 개인화 학습


구현:


```
약점 분석

↓

추천 Pattern

↓

복습 일정

```


필수:


□ 정답률 분석

□ 오답 분석

□ 우선순위 추천



---

# Phase 6

Mock Exam System


목표:


실전 시험 대비


구현:


```
시험 생성

↓

시간 제한

↓

채점

↓

분석

```


필수:


□ 실제 시험 시간

□ 점수 계산

□ 취약 Pattern 분석



---

# Phase 7

AI Tutor


목표:


AI 학습 보조


기능:


```
왜 틀렸는지 분석

풀이 설명

추가 문제 생성

학습 계획 수정

```


---

# Phase 8

Multi Subject Expansion


목표:


다른 시험 적용


예:


```
감정평가사

↓

공인중개사

↓

세무사

↓

회계사

```


필요 작업:


Subject Template 적용


변경:


최소화


유지:


```
Question Schema

Pattern Engine

Recommendation Engine

```


---

# 4. Recommended Implementation Order


실제 Cursor 작업 순서:


## Step 1

데이터 준비


```
master-db.json

pattern-db.json

question.json

```


완성


↓


## Step 2

학습 화면


```
Pattern Page

Question Page

Solution Page

```


완성


↓


## Step 3

사용자 기록


```
Progress

Wrong Answer

Bookmark

```


완성


↓


## Step 4

추천 시스템


```
Weakness

Recommendation

Dashboard

```


완성



---

# 5. MVP Definition


MVP는 아래 조건을 만족하면 완료:


```
하나의 시험

하나의 과목

하나의 Chapter

10개 이상의 Pattern

100개 이상의 Question

```


사용자가:


```
학습

↓

문제풀이

↓

오답복습

↓

진도확인

```


가능해야 한다.


---

# 6. Feature Priority


우선순위:


## Priority 1


시험 합격에 직접 영향:


```
기출 데이터

Pattern

Question

Solution

```


---

## Priority 2


학습 효율:


```
오답

진도

추천

통계

```


---

## Priority 3


서비스 확장:


```
AI Tutor

커뮤니티

PWA

```


---

# 7. Cursor Development Rule


모든 개발 작업은:


1.

현재 docs 확인


2.

관련 Schema 확인


3.

데이터 구조 유지


4.

기능 구현


5.

코드 리뷰


6.

문서 업데이트



순서로 진행한다.


---

# 8. Feature Completion Report


기능 완료 시 반드시 보고:


```
1. 구현 기능

2. 변경 파일

3. 데이터 변경

4. 코드 리뷰 결과

5. 테스트 결과

6. 다음 작업

```


---

# 9. Git Management


Commit 단위:


기능 단위


예:


```
feat:
add inventory pattern learning


fix:
storage validation error


docs:
update question schema

```


---

# 10. New Subject Addition Process


새 과목 추가:


Step 1


Subject 생성


```
subject-template.json
```


↓


Step 2


기출 분석


```
exam-analysis

pattern-db

```


↓


Step 3


Question 생성


↓


Step 4


Pattern 연결


↓


Step 5


Learning Flow 적용


---

# 11. Quality Gate


각 Phase 완료 검사:


□ 기능 정상 작동

□ 데이터 Schema 준수

□ 기존 기능 유지

□ Responsive 확인

□ Accessibility 확인

□ README 업데이트


---

# 12. Final Principle


개발 목표는

기능이 많은 플랫폼이 아니다.


목표:


```
시험 분석

↓

패턴 발견

↓

개인 학습

↓

합격 최적화

```


가 가능한

AI Exam Learning Platform 구축이다.
