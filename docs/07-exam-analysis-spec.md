# AI Exam Learning Platform

# Exam Analysis Specification

Version 2.0

---

# 1. Purpose

본 문서는 시험 기출 데이터를 분석하여

AI Exam Learning Platform의 핵심 데이터인

- Exam Index
- Pattern Database
- Frequency Database
- Master Database

를 생성하는 분석 기준을 정의한다.

---

# 2. Analysis Principle


기출 PDF는 원본 데이터(Source Data)이다.


데이터 흐름:


```

Past Exam PDF

↓

Exam Analysis

↓

Pattern Extraction

↓

Master Database

↓

Learning Platform

```


---

# 3. PDF Analysis Rule


원칙:


## PDF 최초 1회 분석


분석 대상:


```
source/past-exams/

2018-2025.pdf

```


분석 완료 후:


PDF 재참조 금지.


이후 개발:


```
master-db.json

pattern-db.json

exam-index.json

frequency.json

```


만 사용한다.


---

# 4. Analysis Pipeline


전체 과정:


```

PDF Input

↓

Text Extraction

↓

Question Segmentation

↓

Question Classification

↓

Pattern Identification

↓

Frequency Analysis

↓

Importance Calculation

↓

Database Generation


```


---

# 5. Step 1 - Question Extraction


각 문제에서 추출:


필수:


```
examYear

questionNumber

originalQuestion

choices

answer

```


추가:


```
pageNumber

sourceLocation

```


---

# 6. Step 2 - Question Classification


문제별 분류:


```
Subject

↓

Chapter

↓

Pattern

↓

Knowledge

```


예:


```

회계학

↓

재고자산

↓

기말재고 귀속

↓

FOB 조건


```


---

# 7. Exam Index Schema


파일:


```
data/generated/exam-index.json

```


목적:


연도별 출제 위치 관리



구조:


```json
{
"examId":"CERT_APPRAISER",

"years":[

{
"year":2025,

"questions":[

{
"number":1,

"id":"Q_ACC_INV_001"

}

]

}

]

}
```


---

# 8. Pattern Database Schema


파일:


```
data/generated/pattern-db.json

```


목적:


출제 패턴 관리


구조:


```json
{
"patterns":[

{

"id":"ACC_INV_001",

"name":"기말재고 귀속",

"chapter":"재고자산",

"frequency":6,

"years":[

2018,

2020,

2023,

2025

]

}

]

}
```


---

# 9. Frequency Database Schema


파일:


```
data/generated/frequency.json

```


목적:


출제 빈도 분석



구조:


```json
{

"patterns":[

{

"patternId":"ACC_INV_001",

"count":6,

"lastExam":2025,

"trend":"increase"

}

]

}
```


---

# 10. Pattern Extraction Rule


패턴 판단 기준:


## 1. 출제 목적


같은 개념을 평가하는가?


## 2. 풀이 과정


같은 알고리즘을 사용하는가?


## 3. 오답 유형


같은 실수를 유발하는가?


## 4. 지식 연결


같은 Knowledge를 요구하는가?



---

# 11. Importance Calculation


패턴 중요도 계산:


```

Importance Score

=

Frequency

+

Recent Trend

+

Difficulty

+

Combination

```


---

# 12. Frequency Score


출제 횟수:


예:


```

2018~2025

8년 중

6회 출제


High Frequency

```


---

# 13. Recent Trend


최근 출제 가중치:


예:


```

2024 출제

+

2025 출제


↓

Trend 상승

```


---

# 14. Difficulty Analysis


난이도 평가:


기준:


```

계산 단계

개념 결합

시간 소요

함정 여부

```


등급:


```
easy

medium

hard

```


---

# 15. S/A/B Classification


중요도 분류:


## S급


조건:


```

높은 출제 빈도

+

높은 배점 영향

+

반복 가능성 높음


```


---

## A급


조건:


```

중요하지만

S급보다 낮음


```


---

## B급


조건:


```

출제 빈도 낮음

지엽 영역


```


---

# 16. Chapter Importance


단원 중요도:


계산:


```

Chapter Score

=

소속 Pattern Score 합산


```


결과:


```

S Chapter

A Chapter

B Chapter

```


---

# 17. Analysis Output


분석 완료 후 생성:


```

data/

├── master/

│   └── master-db.json


├── generated/

│
├── exam-index.json
│
├── pattern-db.json
│
├── frequency.json


docs/

├── exam-analysis.md

├── pattern-analysis.md

└── statistics.md

```


---

# 18. exam-analysis.md 생성 규칙


포함:


```

시험 개요

분석 기간

총 문제 수

과목별 출제 비중

단원별 출제 비중

주요 Pattern

```


---

# 19. pattern-analysis.md 생성 규칙


포함:


```

Pattern 목록

출제 연도

출제 빈도

난이도

중요도

관련 Pattern

```


---

# 20. statistics.md 생성 규칙


포함:


```

빈출 Top 20

상승 Pattern

감소 Pattern

예상 중요 Pattern

```


---

# 21. PDF 재분석 조건


PDF 재분석 필요:


```

새로운 시험 추가

↓

새 PDF 추가

↓

Analysis 실행

```


그 외:

기존 PDF 다시 읽지 않는다.


---

# 22. Cursor Development Rule


콘텐츠 개발 시:


금지:


```

PDF 직접 참조

문제 임의 생성

Pattern 임의 생성


```


허용:


```

master-db.json

pattern-db.json

frequency.json

exam-index.json


```


---

# 23. Quality Validation


분석 완료 검사:


□ 모든 문제 ID 생성

□ 모든 문제 Pattern 연결

□ 모든 Pattern Chapter 연결

□ 출제 빈도 계산 완료

□ S/A/B 분류 완료

□ 연도 정보 보존


---

# 24. Final Principle


기출 PDF는 한 번 분석한다.


그 이후 플랫폼은


```

문제 데이터

↓

Pattern Database

↓

Knowledge Database

↓

AI Learning Engine


```


으로 동작한다.


기출 분석 결과가

AI Exam Learning Platform의 지식 기반이다.
