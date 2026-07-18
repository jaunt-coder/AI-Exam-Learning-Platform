# AI Exam Learning Platform
# Database Specification

Version 2.0

---

# 1. Purpose

본 문서는 AI Exam Learning Platform의 전체 데이터 구조를 정의한다.

모든 데이터는 Master Database를 중심으로 관리한다.

원칙:

Source Data

↓

Master Database

↓

Generated Data

↓

Application

순서로 데이터가 흐른다.

---

# 2. Database Principle

## Single Source of Truth

모든 핵심 데이터의 원본은

master-db.json

이다.

금지:

- 생성 파일 직접 수정
- 화면용 데이터 직접 작성
- 중복 데이터 저장


허용:

master-db 수정

↓

자동 생성

↓

서비스 반영

---

# 3. Database Architecture

data/
├── source/
│   ├── exams/
│   └── pdf/
│
├── master/
│   └── master-db.json
│
├── generated/
│   ├── questions.json
│   ├── patterns.json
│   ├── statistics.json
│   └── roadmap.json
│
└── cache/


---

# 4. Master Database Structure


master-db.json


최상위 구조:

```json
{
  "version": "2.0",

  "exams": [],

  "subjects": [],

  "chapters": [],

  "patterns": [],

  "questions": [],

  "knowledge": [],

  "statistics": [],

  "predictions": []
}

5. Exam Schema
시험 정보를 저장한다.
Example:
{
"id":"CERT_APPRAISER",

"name":"감정평가사",

"level":"professional",

"years":[2018,2019,2020]

}

필드:
|Field|Description|
|-|-|
|id|시험 ID|
|name|시험명|
|level|시험 난이도|
|years|분석 연도|


6. Subject Schema
과목 정보를 저장한다.
Example:
{
"id":"ACCOUNTING",

"examId":"CERT_APPRAISER",

"name":"회계학",

"template":"accounting",

"importance":"high"
}

필드:
|Field|설명|
|-|-|
|id|과목 ID|
|examId|시험 연결|
|template|전문 템플릿|
|importance|중요도|

7. Chapter Schema
단원 데이터.
Example:

{
"id":"ACC_INVENTORY",

"subjectId":"ACCOUNTING",

"name":"재고자산",

"grade":"S",

"frequency":8
}

필드:
|Field|설명|
|-|-|
|id|단원 ID|
|subjectId|과목 연결|
|grade|S/A/B 등급|
|frequency|출제 횟수|

8. Importance System
중요도는 고정값이 아니다.
기출 분석 결과로 결정한다.
Grade:
S

A

B

예:

frequency

+

recentExam

+

difficulty

+

predictionScore

↓

importance

9. Pattern Schema
가장 중요한 데이터.
Pattern은 학습 최소 단위이다.
Example:
{
"id":"ACC_INV_001",

"chapterId":"ACC_INVENTORY",

"name":"기말재고 귀속",

"grade":"S",

"frequency":6,

"years":[2018,2020,2023],

"difficulty":"hard",

"relatedPatterns":[

"ACC_INV_002"

]

}
필드:
|Field|설명|
|-|-|
|id|패턴 ID|
|chapterId|단원 연결|
|grade|중요도|
|frequency|출제 빈도|
|years|출제 연도|
|difficulty|난이도|
|relatedPatterns|연관 패턴|

10. Knowledge Schema
지식 요소 저장.
Pattern보다 작은 개념 단위.
Example:
{
"id":"KNOW_INV_FOB",

"name":"FOB 조건",

"type":"concept",

"relatedPatterns":[

"ACC_INV_002"

]

}
11. Question Schema
실제 문제.
Example:
{
"id":"Q_ACC_INV_001",

"patternId":"ACC_INV_001",

"type":"multipleChoice",

"year":2025,

"difficulty":"medium",

"question":"",

"choices":[],

"answer":1,

"solution":"",

"algorithm":"",

"mistakes":[]

}

12. Question Content Requirement
모든 문제는 다음 데이터를 가진다.
필수:
question

choices

answer

explanation

solutionAlgorithm

calculationProcess

wrongAnalysis

memorizationPoint

relatedQuestions

13. Statistics Schema
출제 분석 데이터.
Example:
{
"patternId":"ACC_INV_001",

"frequency":6,

"lastExam":2025,

"trend":"increasing",

"predictionScore":92
}

14. Prediction Schema
AI 예상문제 데이터.
Example:
{
"id":"PRED_ACC_INV_001",

"patternId":"ACC_INV_001",

"score":92,

"reason":[

"high frequency",

"recent trend"

]

}

15. User Learning Data
사용자 데이터는 별도 관리한다.

user-data/

progress

wrong-answer

bookmark

history

Master DB와 분리한다.

16. ID Naming Rule
규칙:
시험:

EXAM_xxx
과목:
SUBJECT_xxx
단원:
SUBJECT_CHAPTER_xxx
패턴:
SUBJECT_CHAPTER_PATTERN
문제:
Q_SUBJECT_PATTERN_NUMBER
17. Data Validation
모든 데이터 생성 후 검사한다.
검사:
□ ID 중복 없음
□ 연결 관계 정상
□ 필수 필드 존재
□ Pattern 없는 Question 없음
□ Chapter 없는 Pattern 없음
□ Subject 없는 Chapter 없음
18. Expansion Rule
새 과목 추가:
하지 않는 것:
새 DB 생성
새 엔진 생성
하는 것:
Subject 추가

↓

Template 추가

↓

Chapter 생성

↓

Pattern 생성

↓

Question 생성

19. Migration Rule
데이터 구조 변경 시
version 증가
예:
1.0

↓

2.0
기존 데이터 삭제 금지.
20. Final Principle
좋은 플랫폼은
많은 문제를 가진 플랫폼이 아니다.
좋은 플랫폼은
문제
↓
패턴
↓
지식
↓
학습전략
↓
개인화
까지 연결하는 플랫폼이다.


---




