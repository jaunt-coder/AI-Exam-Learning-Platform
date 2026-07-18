# AI Exam Learning Platform

# Data Pipeline Specification

Version 2.0


---

# 1. Purpose


본 문서는 AI Exam Learning Platform에서

시험 기출 데이터를 수집하고 분석하여

학습 데이터베이스로 변환하는 전체 과정을 정의한다.


목표:


- PDF 재분석 최소화
- 기출 데이터 구조화
- 출제 Pattern 데이터 생성
- AI 학습 데이터 구축


---

# 2. Core Principle


기출 PDF는 원본 데이터(Source Data)이다.


개발 과정:

PDF
↓
Analysis
↓
Structured Database
↓
Learning Platform


이후 개발은 PDF가 아니라

Database를 기준으로 진행한다.


---

# 3. Data Flow Architecture


전체 흐름:


source/
└── past-exams/
└── 2018-2025.pdf


    ↓
PDF Analysis
    ↓
analysis/
├── exam-analysis.md
├── pattern-analysis.md
└── question-analysis.md
    ↓
data/
├── master-db.json
├── pattern-db.json
├── question-db.json
└── statistics.json
    ↓
Web Platform


---

# 4. Source Data Management


원본:


source/past-exams/


규칙:


원본 PDF는 수정하지 않는다.


파일명:


YYYY-YYYY.pdf


예:


2018-2025-accounting.pdf


---

# 5. PDF Analysis Process


분석 단계:


## Step 1

Question Extraction


추출:


문제 번호
출제 연도
과목
단원
문제 내용
선택지
정답


---

## Step 2

Solution Analysis


추출:


풀이 방법
핵심 공식
출제 의도
오답 포인트


주의:


기존 해설은 참고 자료이다.

절대 정답 기준으로만 사용하지 않는다.


---

# 6. Pattern Extraction Rule


모든 문제는 반드시 Pattern을 가진다.


구조:


Subject
↓
Chapter
↓
Pattern
↓
Question


예:


회계학
↓
재고자산
↓
기말재고 귀속
↓
2019-01


---

# 7. Pattern ID Rule


Pattern ID는 변경하지 않는다.


형식:


SUBJECT_CHAPTER_NUMBER


예:


ACC_INV_001


의미:


ACC
Accounting
INV
Inventory
001
Pattern Number


---

# 8. Pattern Classification


출제 중요도:


## S급


조건:


반복 출제
높은 배점 가능성
기본 필수 개념


학습 우선순위:


최우선


---

## A급


조건:


출제 가능성 높음
중요 응용


---

## B급


조건:


가끔 출제
확장 개념


---

## C급


조건:


희귀 출제
시간 부족 시 후순위


---

# 9. Frequency Calculation


출제 빈도:


계산:


출제 횟수

최근 출제 여부

배점 영향


예:


Frequency Score
=
출제횟수 × 50%

최근성 × 30%

중요도 × 20%


---

# 10. Pattern Database Creation


생성:


data/pattern-db.json


필드:


patternId
subjectId
chapterId
name
grade
frequency
years
relatedQuestions


---

# 11. Question Database Creation


생성:


data/question-db.json


필드:


questionId
year
subject
chapter
patternId
question
choices
answer
solution
difficulty


---

# 12. Master Database


최종 통합:


data/master-db.json


포함:


Exam
Subject
Chapter
Pattern
Question
Statistics


역할:


플랫폼 전체 기준 데이터


---

# 13. Analysis Documents


자동 생성:


docs/exam-analysis.md
docs/pattern-db.md
docs/statistics.md


목적:


사람이 분석 결과 검토 가능


---

# 14. Validation Rule


DB 생성 후 검사:


## Pattern


Pattern ID 중복 확인
Chapter 연결 확인


---

## Question


정답 존재
Pattern 연결
출처 존재


---

## Statistics


출제 연도 확인
빈도 계산 확인


---

# 15. PDF Reanalysis Rule


원칙:


PDF는 매번 읽지 않는다.


재분석 상황:


새 시험 연도 추가
원본 오류 발견


---

# 16. AI Usage Rule


AI 분석 시:


입력:


PDF

Analysis Instruction

Database Schema


출력:


Structured JSON


AI가 자유롭게 해석하지 않는다.


---

# 17. Human Review Rule


AI 분석 후:


검토:


Pattern 분류
중요도
정답
해설


최종 승인:


Human


---

# 18. Data Version Management


변경 시:


기록:


version
date
change
author


예:


pattern-db v1.1
재고자산 Pattern 수정


---

# 19. Expansion Rule


새 과목 추가:


동일 과정:


PDF
↓
Analysis
↓
Pattern DB
↓
Question DB


예:


경제학
민법
관계법규


---

# 20. Final Principle


AI Exam Learning Platform의 핵심 경쟁력은


문제를 많이 저장하는 것이 아니다.


핵심:


기출을 분석하고
출제 패턴을 구조화하여
AI가 학습 방향을 제시할 수 있는 데이터 생성


Data Pipeline은

플랫폼의 지식 기반이다.