# AI Exam Learning Platform

# Learning Algorithm Specification

Version 2.0


---

# 1. Purpose


본 문서는 AI Exam Learning Platform에서

사용자의 학습 상태를 분석하고

최적의 학습 순서를 추천하는

Learning Algorithm을 정의한다.


목표:


- Pattern 중심 학습
- 개인별 약점 분석
- 효율적인 복습 제공
- 시험 합격 가능성 향상


---

# 2. Core Principle


본 플랫폼은 문제 개수보다

Pattern 숙련도를 관리한다.


기존 방식:

100문제 풀이
↓
점수 확인


플랫폼 방식:


문제 풀이
↓
Pattern 분석
↓
숙련도 계산
↓
학습 추천


---

# 3. Learning Data Input


알고리즘 입력 데이터:


Question Result

Pattern Information

User History

Exam Statistics


---

# 4. Pattern Mastery Model


모든 Pattern은 숙련도를 가진다.


구조:


Pattern
{
masteryScore,
attemptCount,
correctRate,
lastStudyDate,
reviewLevel
}


---

# 5. Mastery Score Calculation


기본 점수:


Mastery Score
=
정답률

반복 학습

최근 학습

출제 중요도


가중치:


정답률       40%
반복 횟수     20%
최근 학습     20%
Pattern 중요도 20%


---

# 6. Mastery Level


숙련 단계:


## Level 0

미학습


0~19점


---

## Level 1

기초 부족


20~39점


---

## Level 2

학습 진행


40~59점


---

## Level 3

안정


60~79점


---

## Level 4

완성


80점 이상


---

# 7. Grade Priority


Pattern 등급 반영:


## S급


가중치:


1.5


이유:


고빈도 핵심


---

## A급


가중치:


1.3


---

## B급


가중치:


1.0


---

## C급


가중치:


0.7


---

# 8. Weak Pattern Detection


취약 Pattern 조건:


다음 중 하나:


정답률 < 60%
또는
최근 3회 중 2회 이상 오답
또는
S급인데 미학습


---

# 9. Review Algorithm


복습 주기:


## 최초 학습 후


1일 후


---

## 1회 정답


3일 후


---

## 2회 연속 정답


7일 후


---

## 완전 숙련


30일 후


---

# 10. Daily Recommendation


오늘 학습 추천 순서:


1순위
S급 취약 Pattern
↓
2순위
최근 오답 Pattern
↓
3순위
시험 임박 Pattern
↓
4순위
새로운 Pattern


---

# 11. Recommendation Score


계산:


Recommendation Score
=
Importance

Weakness

Recency

Exam Probability


가중치:


중요도       40%
취약도       30%
최근성       20%
출제가능성   10%


---

# 12. Wrong Answer Analysis


오답 발생 시:


저장:


Question ID
Pattern ID
Wrong Count
Wrong Type


---

# 13. Wrong Type Classification


오답 유형:


## Concept Error


개념 부족


---

## Calculation Error


계산 실수


---

## Reading Error


조건 해석 실패


---

## Memory Error


암기 부족


---

# 14. Learning Path Generation


사용자별:


Current Level
↓
Weak Pattern
↓
Recommended Pattern
↓
Question Set


자동 생성


---

# 15. Exam D-Day Adjustment


시험까지 남은 기간 반영:


## 90일 이상


Pattern 전체 학습


---

## 30~90일


S/A급 집중


---

## 30일 이하


오답 제거
실전 문제


---

# 16. Difficulty Adjustment


문제 난이도 조절:


사용자 수준:


낮음
↓
기본 문제
중간
↓
응용 문제
높음
↓
고난도 문제


---

# 17. Pattern Relationship Learning


연관 Pattern 활용:


예:


ACC_INV_001
↓
ACC_INV_002


취약 Pattern 발견:


관련 Pattern 추천


---

# 18. AI Tutor Connection


AI Tutor 입력:


User Profile

Pattern Mastery

Wrong Analysis

Question


AI는:


현재 부족한 부분

개선 방법


설명한다.


---

# 19. Statistics Update


학습 후:


업데이트:


Pattern Accuracy
User Mastery
Question Difficulty


---

# 20. Algorithm Expansion


향후:


가능:


Machine Learning Model

Prediction Model

Adaptive Learning


---

# 21. Final Principle


AI Exam Learning Platform의 핵심 알고리즘:


많이 공부시키는 시스템
↓
아니다
가장 필요한 것을
가장 적절한 시간에
학습시키는 시스템


Pattern 기반 개인 맞춤 학습을 목표로 한다.
