# AI Exam Learning Platform
# Platform Constitution

Version 2.0

---

# 1. Platform Identity

본 프로젝트는 특정 과목을 위한 문제집이 아니다.

AI 기반 시험 학습 플랫폼이다.

목표:

기출 데이터를 분석하여

출제 패턴을 발견하고

학습자의 약점을 분석하며

개인별 최적 학습 경로를 제공하는

AI Exam Learning Platform 구축

---

# 2. Core Philosophy

플랫폼의 핵심 원칙은 다음이다.

## Rule 1

문제 중심이 아니라

출제 패턴 중심으로 학습한다.

---

## Rule 2

기출문제는 단순 저장하지 않는다.

분석한다.

저장 구조:

기출

↓

출제 영역

↓

출제 패턴

↓

지식 요소

↓

문제

↓

학습 전략

---

## Rule 3

모든 과목은 동일한 Core Engine을 사용한다.

하지만

Subject Template을 통해 전문성을 유지한다.

---

# 3. System Concept

전체 구조:

```
Exam

↓

Subject

↓

Chapter

↓

Pattern

↓

Knowledge

↓

Question

↓

Learning

↓

Statistics

↓

Prediction
```

---

# 4. Source of Truth

모든 데이터의 원본은

master-db.json

이다.

원칙:

Master DB 수정

↓

자동 생성

↓

JSON

↓

Markdown

↓

Web

---

Generated File 직접 수정 금지.

---

# 5. Subject Independence

Core Engine은 특정 과목을 알지 못한다.

예:

회계학

경제학

민법

관계법규

부동산학원론

모두 동일한 Engine 사용.

---

# 6. Subject Template Principle

전문성은 Template에서 관리한다.

예:

Accounting Template

```
계산
분개
재무회계 기준
수치 분석
```

Economics Template

```
그래프
함수
탄력성
경제모형
```

Civil Law Template

```
조문
판례
법리
사례
```

---

# 7. AI Learning Principle

학습자는 모두 다르다.

따라서 플랫폼은

단순 문제 제공이 아니라

개인화 학습을 목표로 한다.

분석 요소:

- 정답률
- 오답 유형
- 반복 실수
- 학습 시간
- 패턴 이해도
- 최근 학습 기록

---

# 8. Pattern First Principle

모든 개발 단위는 Pattern이다.

기능보다 Pattern 완성을 우선한다.

Pattern 하나는:

- 기출 분석
- JSON
- 문제
- 해설
- 풀이 알고리즘
- 암기 포인트
- 오답 분석
- 관련 문제
- 통계 연결

까지 포함한다.

---

# 9. Data Lifecycle

데이터 흐름:

```
Past Exam PDF

↓

PDF Analyzer

↓

Master Database

↓

Pattern Database

↓

Question Database

↓

Learning Engine

↓

Web Application
```

---

# 10. PDF Principle

PDF는 반복 분석하지 않는다.

최초 분석:

PDF

↓

Master DB 생성

이후:

Master DB 사용

---

# 11. AI Prediction Principle

예상문제는

임의 생성하지 않는다.

근거:

- 출제 빈도
- 최근 출제 경향
- 패턴 반복
- 난이도 변화
- 출제 주기

기반으로 생성한다.

---

# 12. Quality Standard

모든 콘텐츠는 다음을 만족해야 한다.

## Question

문제 존재

## Explanation

상세 해설 존재

## Algorithm

풀이 순서 존재

## Mistake

오답 원인 존재

## Memorization

암기 포인트 존재

## Relation

관련 문제 연결 존재

---

# 13. Development Rules

모든 개발 작업은:

설계 문서 확인

↓

데이터 구조 확인

↓

구현

↓

테스트

↓

리뷰

↓

문서 업데이트

순서로 진행한다.

---

# 14. Expansion Principle

새로운 시험 추가 방법:

새 플랫폼 제작 금지.

추가:

1. Subject 추가
2. Subject Template 추가
3. PDF 분석
4. Master DB 생성

---

# 15. Ultimate Goal

최종 목표:

하나의 AI 시험 학습 플랫폼에서

다양한 시험과 과목을 지원하는

지능형 학습 시스템 구축

```