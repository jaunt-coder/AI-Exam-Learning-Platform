# AI Exam Learning Platform

# Database Implementation Specification

Version 2.0


---

# 1. Purpose


본 문서는 AI Exam Learning Platform에서 사용하는

실제 데이터베이스(JSON) 구조를 정의한다.


목표:


- 시험별 확장 가능 구조
- Pattern 중심 학습 구조
- AI Tutor 연동 가능 구조
- 데이터와 코드 분리


---

# 2. Database Principle


본 플랫폼의 핵심 데이터 구조:

Exam
↓
Subject
↓
Chapter
↓
Pattern
↓
Question
↓
Learning Record


모든 Question은 반드시 Pattern과 연결된다.


---

# 3. Data Folder Structure


data/
├── master-db.json
├── exams.json
├── subjects.json
├── chapters.json
├── pattern-db.json
├── question-db.json
├── statistics.json
└── user/
└── progress.json


---

# 4. master-db.json


## Purpose


플랫폼 전체 데이터를 연결하는 Main Database


## Structure


```json
{
  "version": "1.0",

  "examId": "APPRAISER",

  "subjects": [],

  "chapters": [],

  "patterns": [],

  "questions": []
}
5. Exam Schema
시험 정보
{
  "examId": "APPRAISER",

  "name": "감정평가사",

  "description": "전문자격시험",

  "years": [
    2018,
    2019,
    2020
  ]
}
6. Subject Schema
과목 정보
{
  "subjectId": "ACC",

  "name": "회계학",

  "examId": "APPRAISER",

  "order": 1
}
7. Chapter Schema
단원 정보
{
  "chapterId": "ACC_INV",

  "subjectId": "ACC",

  "name": "재고자산",

  "grade": "S",

  "order": 1
}
8. Pattern Database
파일:
pattern-db.json
역할:
출제 패턴 관리
구조:
{
  "patternId": "ACC_INV_001",

  "subjectId": "ACC",

  "chapterId": "ACC_INV",

  "name": "기말재고 포함 여부 판단",

  "grade": "S",

  "frequency": 8,

  "years": [
    2018,
    2019,
    2021,
    2023
  ],

  "importance": 95
}
9. Pattern Grade Rule
S
반복 출제

고득점 핵심

필수 학습
A
중요 응용

출제 가능성 높음
B
보조 개념
C
낮은 빈도
10. Question Database
파일:
question-db.json
역할:
문제 저장
구조:
{
 "questionId":"ACC_INV_Q001",

 "year":2023,

 "subjectId":"ACC",

 "chapterId":"ACC_INV",

 "patternId":"ACC_INV_001",

 "difficulty":"medium",

 "question":"문제 내용",

 "choices":[
  "보기1",
  "보기2"
 ],

 "answer":1,

 "solution":{

   "summary":"풀이 요약",

   "steps":[],

   "memoryPoint":"암기 포인트"

 }

}
11. Solution Schema
해설 데이터
{
 "summary":"핵심 설명",

 "steps":[

 {
  "step":1,

  "description":"조건 확인"

 }

 ],

 "wrongAnalysis":[

 "조건 누락",

 "개념 혼동"

 ]

}
12. AI Tutor Data
AI Tutor가 사용하는 데이터:
{
 "patternId":

 "concept":

 "commonMistake":

 "hint":

 "advancedTip":

}
13. Statistics Database
파일:
statistics.json
역할:
출제 분석
구조:
{
 "patternId":"ACC_INV_001",

 "totalCount":8,

 "recentYears":[
  2022,
  2023,
  2025
 ],

 "averageScoreImpact":9,

 "priority":"HIGH"

}
14. User Progress Schema
사용자 학습 기록
{
"userId":"user001",

"patternProgress":[

 {

 "patternId":"ACC_INV_001",

 "correctRate":80,

 "attemptCount":10,

 "mastery":"GOOD"

 }

]

}
15. Pattern Relationship Schema
연관 학습:
{
"from":"ACC_INV_001",

"to":"ACC_INV_002",

"type":"related",

"strength":0.85
}
16. Question Validation Rule
모든 문제:
필수:
questionId 존재

patternId 존재

answer 존재

solution 존재

17. Pattern Validation Rule
모든 Pattern:
필수:
patternId

chapterId

grade

frequency

years

18. Multi Subject Expansion
새 과목 추가:
기존 구조 유지:
NEW_SUBJECT

↓

NEW_CHAPTER

↓

NEW_PATTERN

↓

NEW_QUESTION

코드 수정 최소화.
19. Version Management
데이터 변경:
기록:
{
"version":"1.1",

"date":"2026-08-01",

"change":"재고자산 Pattern 추가"

}
20. Final Principle
본 플랫폼의 데이터 구조 핵심:
Question 중심 ❌


Pattern 중심 ⭕


문제는 변경될 수 있다.
하지만 출제 Pattern은 시험의 본질이다.
따라서 모든 데이터는 Pattern을 중심으로 설계한다.