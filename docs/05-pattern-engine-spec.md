# AI Exam Learning Platform

# Pattern Engine Specification

Version 2.0

---

# 1. Purpose

Pattern Engine은 기출문제를 단순 문제 단위가 아닌

"출제 패턴" 단위로 분석하고 관리하는 핵심 엔진이다.


목표:

- 반복 출제되는 핵심 유형 발견
- 중요도 평가
- 학습 우선순위 결정
- 예상 출제 분석
- 지식 연결 구조 생성


---

# 2. Core Concept


문제는 변하지만

출제 패턴은 반복된다.


Example:


문제 1

"기말재고 포함 여부"


문제 2

"FOB 조건에 따른 재고 귀속"


문제 3

"매입 운송 조건 판단"


각 문제는 다르지만


Pattern:
Inventory Ownership Recognition


으로 연결된다.


---

# 3. Pattern Hierarchy


Pattern 구조:


Subject
↓
Chapter
↓
Pattern Category
↓
Pattern
↓
Question
↓
Knowledge


Example:


회계학
↓
재고자산
↓
재고 귀속
↓
FOB 조건
↓
2025년 12번
↓
선적조건 개념


---

# 4. Pattern ID Rule


Pattern ID:


SUBJECT_CHAPTER_NUMBER


Example:


회계학 재고자산:


ACC_INV_001
ACC_INV_002
ACC_INV_003


경제학:


ECO_DEMAND_001


민법:


CIV_CONTRACT_001


---

# 5. Pattern Object


master-db.json 저장 구조:


```json
{
"id":"ACC_INV_001",

"name":"기말재고 귀속",

"subjectId":"ACCOUNTING",

"chapterId":"ACC_INVENTORY",

"type":"calculation",

"grade":"S",

"frequency":6,

"examYears":[
2018,
2020,
2023,
2025
],

"difficulty":"medium",

"importanceScore":95

}
6. Pattern Classification
Pattern Type은 Subject Template 영향을 받는다.
Accounting
calculation

journalEntry

standard

financialImpact
Economics
graph

formula

model

concept
Civil Law
article

precedent

case
7. Pattern Discovery Process
PDF 분석:
Raw Question

↓

Question Understanding

↓

Required Knowledge

↓

Solution Method

↓

Common Structure

↓

Pattern Extraction
8. Pattern Similarity Analysis
두 문제가 같은 Pattern인지 판단:
평가 기준:
1. 출제 목적
같은 개념 확인인가?
2. 풀이 알고리즘
같은 해결 절차인가?
3. 오답 유형
같은 함정인가?
4. 지식 요소
같은 Knowledge인가?
9. Importance Score
Pattern 중요도 계산:
Importance Score

=

Frequency Score

+

Recent Score

+

Difficulty Score

+

Combination Score

10. Frequency Score
출제 빈도:
Example:
8년 중

6회 출제

↓

High Frequency
저장:
{
"frequency":6
}
11. Recent Score
최근 출제 반영:
Example:
2024

2025

연속 출제

↓

높은 점수
12. Difficulty Score
난이도:
평가:
계산 단계

함정 존재

복합 개념

시간 소요
13. Combination Score
복합 출제 가능성:
Example:
재고자산
FOB

+

매출원가

+

오류수정
같이 출제 가능하면 상승.
14. S/A/B Classification
중요도 자동 분류:
S급
조건:
높은 빈도

+

높은 중요도

+

시험 영향력 높음
예:
상위 10~20%
A급
조건:
중요하지만

S급보다 낮음
B급
조건:
낮은 빈도

또는

지엽 영역
15. Pattern Roadmap Generation
학습 순서 자동 생성:
기준:
Importance Score

+

선행 지식

+

시험 전략
Example:
잘못된 순서:
쉬운 것부터
올바른 순서:
고득점 영향

↓

빈출

↓

기초 연결
16. Pattern Relationship
Pattern 간 관계 저장:

{
"from":"ACC_INV_001",

"to":"ACC_INV_002",

"type":"related",

"strength":0.85
}

관계:
requires

related

similar

opposite

frequentTogether
17. Pattern Learning Unit
하나의 Pattern 완료 기준:
필수:
Pattern Analysis

+

Past Questions

+

Solution Algorithm

+

Wrong Analysis

+

Memorization

+

Related Pattern
18. Prediction Engine Connection
Pattern Engine 데이터 제공:
Pattern Frequency

+

Recent Trend

+

Difficulty

+

Relation

↓

Prediction Score
19. Pattern Database Output
생성:
data/generated/

pattern-list.json

pattern-roadmap.json

pattern-statistics.json
20. Pattern Validation
검증:
□ Pattern ID 존재
□ Chapter 연결
□ Question 연결
□ Frequency 존재
□ Exam Year 존재
□ Importance 계산 가능
21. New Subject Expansion
새 과목 추가:
PDF 분석

↓

Pattern Extract

↓

Importance 계산

↓

Pattern DB 생성

↓

Learning Platform 연결
Core Engine 수정 없음.
22. Final Principle
시험 합격을 결정하는 것은
문제 개수가 아니다.
중요한 것은:
어떤 Pattern이

얼마나 자주

어떤 방식으로

출제되는지

이해하는 것
Pattern Engine은
AI Exam Learning Platform의 핵심 지능 모듈이다.