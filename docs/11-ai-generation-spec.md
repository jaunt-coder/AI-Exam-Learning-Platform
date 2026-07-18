# AI Exam Learning Platform

# AI Generation Specification

Version 2.0


---

# 1. Purpose


본 문서는 AI Exam Learning Platform에서

AI를 활용한 문제 생성, 해설 생성, 학습 콘텐츠 확장 기준을 정의한다.


목표:


- 기출 기반 예상문제 생성
- 부족한 Pattern 보완 문제 생성
- 사용자 약점 맞춤 문제 생성
- AI 해설 자동 생성
- 반복 학습 콘텐츠 자동 확장


---

# 2. AI Generation Principle


AI는 새로운 지식을 임의 생성하지 않는다.


생성 기준:


```

Past Exam Data

+

Pattern Database

+

Question Schema

+

Knowledge Database

+

User Weakness Data


↓

AI Generated Content

```


---

# 3. Generation Architecture


구조:


```

Master DB

↓

Pattern Engine

↓

AI Generation Engine

↓

Question Validator

↓

Question Database


```


---

# 4. AI Generation Input Data


AI 생성에 사용하는 데이터:


## Required


```
Pattern

Difficulty

Question History

Solution Algorithm

Wrong Answer Type

```


## Optional


```
User Performance

Exam Date

Learning Goal

```


---

# 5. Generated Question Type


AI가 생성하는 문제 유형:


## Type 1

Expected Question


목적:

다음 시험 대비


생성 기준:


```
최근 출제 Pattern

+

반복 가능성 높은 개념

```


---

## Type 2

Similar Question


목적:

오답 교정


기준:


```
같은 Pattern

같은 Wrong Type

비슷한 Difficulty

```


---

## Type 3

Difficulty Adjustment Question


목적:

난이도 조절


생성:


```
Easy

↓

Medium

↓

Hard

```


---

## Type 4

Concept Reinforcement Question


목적:

개념 부족 보완


생성:


```
Wrong Concept

↓

Basic Question

```


---

# 6. Expected Question Generation


예상문제 생성 과정:


```

Pattern Selection

↓

Historical Analysis

↓

Important Element Extraction

↓

Question Generation

↓

Solution Generation

↓

Validation


```


---

# 7. Pattern Based Generation Rule


AI는 반드시 Pattern을 기준으로 생성한다.


잘못된 방식:


```
회계 문제 하나 만들어줘

```


허용 방식:


```
재고자산

FOB 조건 Pattern

최근 8년 5회 출제

난이도 Medium

기존 오답 유형 반영


문제 생성


```


---

# 8. Question Generation Schema


생성 문제:


```json
{

"id":"Q_AI_ACC_INV_001",

"source":{

"type":"generated"

},


"classification":{

"patternId":"ACC_INV_001",

"difficulty":"medium"

},


"content":{

"question":"",

"choices":[],

"answer":1

},


"solution":{

"algorithm":"",

"explanation":""

}

}

```


---

# 9. AI Explanation Generation


해설 생성 기준:


반드시 포함:


```
1. 정답 이유

2. 풀이 과정

3. 핵심 개념

4. 자주 틀리는 이유

5. 암기 포인트

```


---

# 10. Wrong Answer Prediction


AI는 예상 오답 유형 생성 가능.


예:


문제:


```
FOB Shipping Point
```


예상 오류:


```
FOB Destination으로 착각

매입 시점 오류

재고 포함 오류

```


저장:


```
wrongAnswerAnalysis

```


---

# 11. Difficulty Control


난이도 조절 기준:


## Easy


특징:


```
단일 개념

짧은 계산

직접 적용

```


---

## Medium


특징:


```
2개 이상 개념 결합

계산 필요

함정 존재

```


---

## Hard


특징:


```
복합 Pattern

여러 조건

시간 압박

```


---

# 12. AI Generated Question Validation


생성 후 검증 필수:


## Pattern Validation


□ 기존 Pattern 존재


## Answer Validation


□ 정답 논리 검증


## Solution Validation


□ 풀이 과정 존재


## Difficulty Validation


□ 난이도 적합


## Duplicate Validation


□ 기존 문제 중복 확인


---

# 13. Human Review Rule


중요 시험 콘텐츠:


최종 공개 전 검토:


```

AI 생성

↓

자동 검증

↓

관리자 검토

↓

서비스 반영


```


---

# 14. User Adaptive Generation


사용자별 문제 생성:


입력:


```
사용자 약점 Pattern

최근 오답

학습 속도

시험일까지 기간

```


출력:


```
개인 맞춤 문제 세트

```


---

# 15. Daily AI Study Set


매일 생성:


예:


```

오늘 목표:

재고자산


생성:

기출 유사 3문제

약점 보완 2문제

실전 문제 5문제


```


---

# 16. AI Tutor Expansion


향후:


사용자 질문:


```
왜 이 답인가?

```


AI:


```
Pattern 설명

풀이 과정

비슷한 문제 제공

```


---

# 17. Prediction System


향후 기능:


시험 예측:


```

현재 Pattern 숙련도

+

최근 점수

+

학습량


↓

예상 점수

```


---

# 18. AI Safety Rule


AI는:


하지 않는다.


```
근거 없는 출제 예상

잘못된 법률 해석

확인되지 않은 공식

```


반드시:


```
Source Data

+

Pattern

+

Knowledge

```


기반으로 생성한다.


---

# 19. AI Generation Workflow


전체:


```

User Need

↓

Recommendation Engine

↓

Pattern Selection

↓

AI Generation

↓

Validation

↓

Question DB 저장

↓

Learning Flow 연결


```


---

# 20. Final Principle


AI Exam Learning Platform의 AI는

문제를 만드는 AI가 아니다.


목표:


```

시험 데이터 분석

↓

출제 패턴 이해

↓

학습 부족 영역 발견

↓

가장 필요한 문제 제공


```


AI Generation Engine은

합격 가능성을 높이는 콘텐츠 확장 엔진이다.
