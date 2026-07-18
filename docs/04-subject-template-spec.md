# AI Exam Learning Platform

# Subject Template Specification

Version 2.0

---

# 1. Purpose

본 문서는 AI Exam Learning Platform에서 과목별 전문성을 유지하기 위한

Subject Template 구조를 정의한다.

Core Engine은 모든 과목에 공통 적용하지만,

각 과목의 학습 방식, 문제 유형, 해설 방식, 필수 콘텐츠는

Subject Template에서 관리한다.

---

# 2. Core Principle

플랫폼은 특정 과목을 알지 않는다.

Core Engine:

Subject
↓
Chapter
↓
Pattern
↓
Question
↓
Learning

만 처리한다.


과목별 차이는 Template이 담당한다.

---

# 3. Architecture


AI Exam Platform
    |

    |
   Core Engine
    |

    |
 Subject Template
    |

    |
 Content Generation

---

# 4. Template Structure


저장 위치:

templates/
├── accounting/
├── economics/
├── civil-law/
├── real-estate/
└── law/


각 Template 구성:

subject-template.json
content-rule.md
question-rule.md
explanation-rule.md

---

# 5. Subject Template Schema


Example:

```json
{
"id":"ACCOUNTING_TEMPLATE",

"name":"회계학",

"category":"calculation",

"features":[

"calculation",

"journalEntry",

"financialStatement"

],

"requiredContents":[

"solutionAlgorithm",

"calculationProcess",

"wrongAnswerAnalysis",

"memorizationPoint"

],

"questionTypes":[

"multipleChoice",

"calculation"

]

}
6. Template Required Fields
모든 Template은 다음 정보를 가진다.
Basic
id

name

category
Learning Feature
features

requiredContents

questionTypes
AI Feature
predictionRules

difficultyRules

recommendationRules
7. Accounting Template
회계학 특징
학습 핵심:
개념 이해

↓

계산 구조 이해

↓

분개

↓

재무제표 영향

↓

문제 적용
Accounting Features
{
"features":[

"calculation",

"journalEntry",

"accountingStandard",

"financialStatement"

]
}
Accounting Required Contents
모든 문제는 포함:
풀이 알고리즘
예:
1단계 거래 조건 확인

2단계 계산 기준 결정

3단계 금액 계산

4단계 재무제표 영향 확인
계산 과정
필수:
공식

계산식

중간 과정

결과
오답 분석
예:
오답 유형:

FOB 조건 혼동

원가 포함 오류

기간 귀속 오류
암기 포인트
예:
기말재고 증가

↓

매출원가 감소

↓

당기순이익 증가
8. Economics Template
경제학 특징
핵심:
개념

↓

그래프

↓

함수

↓

계산

↓

경제적 의미
Economics Features
{
"features":[

"graph",

"formula",

"economicModel",

"elasticity"

]
}

Economics Required Contents
문제에는:
그래프 분석
필수:
곡선 이동

균형 변화

가격 변화
공식
필수:
공식

변수 의미

계산 과정
경제적 해석
필수:
왜 변화하는가

결과 의미
9. Civil Law Template
민법 특징
핵심:
조문

↓

요건

↓

판례

↓

사례 적용

↓

결론
Civil Features
{
"features":[

"article",

"precedent",

"caseAnalysis",

"legalReasoning"

]
}
Civil Required Contents
법리 구조
필수:
법적 쟁점

↓

적용 조문

↓

판례 기준

↓

결론
사례 분석
필수:
사실관계

쟁점

판단

결론
10. Real Estate Template
부동산학원론 특징
핵심:
개념

↓

이론

↓

계산

↓

사례
Features:
concept

calculation

theory

case
11. Question Generation Rule
문제 생성 시:
Core Engine:
공통 처리
Template:
전문 처리
예:
Core:
문제 생성

선택지 생성

채점
Accounting:
계산 과정

분개

회계 기준
Economics:
그래프

공식

해석
Civil:
판례

법리

사례
12. Explanation Generation Rule
해설 구조:
Core:
정답

해설

오답
Template:
추가:
Accounting:
계산 알고리즘

분개

재무 영향
Economics:
그래프

경제 의미
Civil:
법리

판례
13. Pattern Classification Rule
Pattern은 과목별 방식으로 분류한다.
Accounting:
계산 Pattern

분개 Pattern

기준서 Pattern
Economics:
그래프 Pattern

계산 Pattern

이론 Pattern
Civil:
판례 Pattern

조문 Pattern

사례 Pattern
14. Difficulty Assessment
난이도 평가 기준은 Template별로 다르게 적용한다.
Accounting:
계산 단계 수

함정 여부

복합 기준 적용
Economics:
수식 난이도

그래프 복잡도

개념 결합
Civil:
판례 복잡도

쟁점 수

법리 적용 난이도
15. Adding New Subject
새 과목 추가 절차:
1. Subject Template 생성

↓

2. Feature 정의

↓

3. Question Rule 정의

↓

4. Explanation Rule 정의

↓

5. Pattern 분석

↓

6. Master DB 등록
Core Engine 수정 금지.
16. Template Validation
새 Template 추가 시 확인:
□ Core Engine과 독립
□ 필수 필드 존재
□ 문제 생성 규칙 존재
□ 해설 규칙 존재
□ 난이도 기준 존재
□ AI 분석 기준 존재
17. Final Principle
범용 플랫폼의 전문성은
Core Engine에서 나오지 않는다.
전문성은
Subject Template

Pattern Database

Knowledge Graph
에서 결정된다.
따라서:
범용성

전문성
두 가지를 동시에 유지한다.

