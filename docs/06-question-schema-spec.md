# AI Exam Learning Platform

# Question Schema Specification

Version 2.0

---

# 1. Purpose

본 문서는 AI Exam Learning Platform에서 사용하는

Question Data Schema를 정의한다.

Question은 단순한 문제 저장 데이터가 아니다.

하나의 Question은 다음을 포함하는 학습 단위이다.

문제 원문

↓

출제 의도

↓

출제 Pattern

↓

풀이 방법

↓

오답 분석

↓

암기 지식

↓

관련 문제

2. Question Principle
기존 문제은행:
문제

↓

정답

AI 학습 플랫폼:
문제

↓

Pattern

↓

Knowledge

↓

Solution Strategy

↓

Personal Learning
3. Question Data Location
Master DB:
data/master/master-db.json
Question Collection:
{
"questions":[]
}
4. Question Object Structure
기본 구조:
{
"id":"Q_ACC_INV_001",

"source":{},

"classification":{},

"content":{},

"solution":{},

"analysis":{},

"learning":{},

"relation":{}

}
5. ID Rule
Question ID:
Q_SUBJECT_PATTERN_NUMBER
Example:
회계학 재고자산:
Q_ACC_INV_001
예상문제:
Q_EXPECT_ACC_INV_001
연습문제:
Q_PRACTICE_ACC_INV_001
6. Source Object
문제 출처 정보
Example:
{
"type":"past_exam",

"examId":"CERT_APPRAISER",

"year":2025,

"round":1,

"questionNumber":12,

"sourceFile":"2018-2025.pdf"
}

필드:
|Field|Description|
|-|-|
|type|출처 유형|
|examId|시험|
|year|출제 연도|
|round|시험 회차|
|questionNumber|문제 번호|
|sourceFile|원본 파일|

7. Source Type
문제 유형:
past_exam

expected

practice

generated

review
8. Classification Object
문제 분류:
Example:
{
"subjectId":"ACCOUNTING",

"chapterId":"ACC_INVENTORY",

"patternId":"ACC_INV_001",

"difficulty":"medium",

"grade":"S"
}
9. Content Object
문제 본문 데이터
Example:
{
"originalQuestion":"기출 원문",

"choices":[

"선택지1",

"선택지2",

"선택지3",

"선택지4"

],

"answer":2
}
10. Original Question Rule
기출 문제는 가능한 원문 보존.
저장:
originalQuestion
목적:
기출 복원
법적 출처 관리
AI 분석
11. Solution Object
풀이 데이터
구조:
{
"algorithm":"",

"calculationProcess":"",

"explanation":"",

"finalAnswer":""
}
12. Solution Algorithm
가장 중요한 학습 데이터.
예:
회계학:
1단계 거래 조건 확인

2단계 포함 여부 판단

3단계 계산

4단계 재무 영향 확인

경제학:
1단계 변수 확인

2단계 공식 선택

3단계 계산

4단계 경제적 의미 확인
민법:
1단계 쟁점 확인

2단계 조문 적용

3단계 판례 검토

4단계 결론 도출
13. Calculation Process
계산 과목 필수.
Example:
기초재고
+
당기매입
-
기말재고

=

매출원가
저장:
calculationProcess
14. Analysis Object
문제 분석 정보
Example:
{
"intent":"재고 귀속 판단 능력 확인",

"keyPoint":"FOB 조건",

"trap":"선적지와 도착지 혼동"
}
15. Wrong Answer Analysis
오답 분석.
필수 구조:
{
"wrongType":

"reason":

"correction":

}
예:
오답 유형:

FOB 조건 오류


원인:

소유권 이전 시점 혼동


수정:

FOB Shipping Point는 선적 시점 인식
16. Learning Object
학습 강화 데이터
Example:
{
"memorizationPoint":"",

"summary":"",

"keyword":[]
}
17. Memorization Point
시험 직전 복습용.
좋은 형태:
조건

↓

판단 기준

↓

결론

예:
기말재고 증가

↓

매출원가 감소

↓

순이익 증가
18. Relation Object
문제 연결.
Example:
{
"relatedQuestions":[

"Q_ACC_INV_002",

"Q_ACC_INV_005"

],

"relatedPatterns":[

"ACC_INV_002"

]
}
19. Complete Question Example
{
"id":"Q_ACC_INV_001",

"source":{

"type":"past_exam",

"year":2025

},

"classification":{

"patternId":"ACC_INV_001",

"difficulty":"medium"

},

"content":{

"originalQuestion":"",

"choices":[],

"answer":1

},

"solution":{

"algorithm":"",

"calculationProcess":"",

"explanation":""

},

"analysis":{

"intent":"",

"trap":""

},

"learning":{

"memorizationPoint":"",

"keyword":[]

}

}
20. AI Generated Question Rule
예상문제 생성 시:
기존 Question 분석:
Pattern

+

Knowledge

+

Wrong Type

+

Difficulty

↓
Expected Question 생성
21. Question Quality Score
문제 품질 평가:
Quality Score

=

Pattern 연결

+

Solution 완성도

+

Explanation 품질

+

Learning Value
22. Question Validation
검증:
□ Pattern 연결 존재
□ Chapter 존재
□ 정답 존재
□ 해설 존재
□ 풀이 알고리즘 존재
□ 오답 분석 존재
□ 암기 포인트 존재
23. Question Development Rule
문제 하나 구현 시:
반드시 완료:
JSON

+

문제 화면

+

채점

+

해설

+

오답 분석

+

암기 포인트

+

관련 문제 연결

24. Final Principle
좋은 문제 데이터란
문제를 많이 저장하는 것이 아니다.
하나의 문제에서
출제자의 의도

↓

반복되는 패턴

↓

풀이 전략

↓

합격자의 사고 과정
을 추출하는 것이다.
Question Schema는
AI Exam Learning Platform의 학습 콘텐츠 표준이다.

---



