# AI Exam Learning Platform

# Learning Flow Specification

Version 2.0

---

# 1. Purpose

본 문서는 AI Exam Learning Platform의

전체 학습 사용자 경험(User Experience)을 정의한다.


목표:


- 사용자가 무엇을 공부해야 하는지 알 수 있다.
- Pattern 중심으로 학습한다.
- 문제 풀이 후 즉시 피드백을 받는다.
- 오답과 약점을 자동 관리한다.
- 시험일까지 최적 학습 흐름을 제공한다.


---

# 2. Learning Philosophy


기존 문제집:


```
문제 선택

↓

풀이

↓

정답 확인

```


AI Exam Platform:


```
현재 상태 분석

↓

추천 Pattern

↓

개념 학습

↓

기출 풀이

↓

오답 분석

↓

복습

↓

숙련도 상승

```


---

# 3. User Journey Overview


전체 흐름:


```
Dashboard

↓

Subject Selection

↓

Chapter Selection

↓

Pattern Learning

↓

Question Solving

↓

Solution Analysis

↓

Wrong Review

↓

Statistics

↓

Next Recommendation

```

---

# 4. First Visit Flow


처음 방문:


## Step 1

시험 선택


Example:


```
감정평가사

공인중개사

변리사

회계사

```


---

## Step 2

과목 선택


Example:


```
회계학

경제학

민법

```


---

## Step 3

학습 목표 설정


입력:


```
시험일

목표 점수

현재 수준

하루 공부 시간

```


---

# 5. Dashboard


메인 화면:


필수 표시:


```
오늘 학습 목표

현재 진도

취약 Pattern

최근 오답

추천 학습

```


---

# 6. Subject Flow


과목 선택:


```
Subject

↓

Chapter

↓

Pattern

```


Example:


```
회계학

↓

재고자산

↓

기말재고 귀속 Pattern

```


---

# 7. Chapter Screen


단원 화면:


표시:


```
단원 중요도

출제 빈도

완료 Pattern

남은 Pattern

예상 학습 시간

```


---

# 8. Pattern Learning Flow


Pattern 학습:


순서:


```
1. Pattern 소개

↓

2. 출제 빈도 확인

↓

3. 핵심 개념

↓

4. 풀이 알고리즘

↓

5. 대표 기출

↓

6. 연습 문제

```


---

# 9. Pattern Detail Screen


필수 정보:


```
Pattern 이름

중요도(S/A/B)

출제 횟수

출제 연도

난이도

관련 Pattern

```


---

# 10. Question Solving Flow


문제 풀이:


```
문제 표시

↓

선택

↓

제출

↓

채점

↓

정답 확인

↓

해설

```


---

# 11. Solution Screen


해설 구조:


```
정답

↓

출제 의도

↓

풀이 알고리즘

↓

계산 과정

↓

오답 분석

↓

암기 포인트

```


---

# 12. Wrong Answer Flow


오답 발생:


자동 저장:


```
Question ID

Pattern ID

Wrong Type

Wrong Count

Date

```


---

# 13. Wrong Review Screen


오답 화면:


표시:


```
최근 틀린 문제

반복 오답 Pattern

취약 단원

추천 복습

```


---

# 14. Bookmark Flow


즐겨찾기:


저장:


```
Question ID

Pattern ID

Memo

Date

```


활용:


시험 직전 빠른 복습.


---

# 15. Mock Exam Flow


실전 시험:


단계:


```
시험 선택

↓

시간 설정

↓

문제 풀이

↓

자동 채점

↓

결과 분석

```


---

# 16. Exam Result


결과:


표시:


```
총점

정답률

시간

약점 Pattern

예상 점수

```


---

# 17. AI Recommendation Screen


추천 화면:


예:


```
오늘 추천 학습

1.
재고자산 FOB 조건

추천 이유:
최근 3회 오답

예상 효과:
빈출 Pattern 보완

```


---

# 18. Daily Study Flow


하루 학습:


추천:


```
10분

오답 복습


30분

신규 Pattern


20분

기출 문제


10분

암기

```


---

# 19. Exam Preparation Mode


시험 직전:


변경:


```
새로운 Pattern 감소

↓

S급 Pattern 집중

↓

오답 반복

↓

실전 모드 증가

```


---

# 20. Mastery System


Pattern 완료 기준:


```
개념 이해

+

대표 문제 해결

+

정답률 80%

+

오답 수정

```


---

# 21. Navigation Structure


화면 구조:


```
/

Dashboard


/subject

과목 선택


/chapter

단원


/pattern

Pattern 학습


/question

문제 풀이


/review

오답


/exam

실전 시험


/statistics

통계

```


---

# 22. Mobile UX Rule


모바일:


필수:


```
큰 버튼

한 손 조작

짧은 학습 단위

빠른 이동

```


---

# 23. Accessibility Rule


지원:


```
키보드 이동

명확한 버튼

색상 대비

텍스트 대체

```


---

# 24. Performance Rule


목표:


```
초기 로딩 최소화

필요 데이터만 로딩

JSON Lazy Loading

```


---

# 25. Final Principle


좋은 학습 플랫폼은

많은 기능을 보여주는 것이 아니다.


사용자가 매 순간:


```
무엇을 공부해야 하는지

왜 공부해야 하는지

어떻게 공부해야 하는지

```


알 수 있어야 한다.


Learning Flow는

AI Exam Learning Platform의 사용자 경험 기준이다.
