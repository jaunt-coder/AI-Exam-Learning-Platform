# AI Exam Learning Platform

# Content Expansion Specification

Version 2.0


---

# 1. Purpose


본 문서는 AI Exam Learning Platform을

하나의 시험 전용 서비스가 아닌

여러 전문자격 시험에 적용 가능한

범용 학습 플랫폼으로 확장하기 위한 기준을 정의한다.


목표:


- 신규 시험 추가 비용 최소화
- 기존 플랫폼 구조 재사용
- 과목별 콘텐츠 독립 관리
- AI 분석 엔진 재활용


---

# 2. Expansion Principle


플랫폼과 콘텐츠를 분리한다.


잘못된 구조:

회계학 코드
↓
회계학 화면
↓
회계학 문제


올바른 구조:


Platform Engine
↓
Subject Data
↓
Pattern Data
↓
Question Data


---

# 3. Core Separation


분리 대상:


## Platform Layer


공통:


UI
Learning Flow
Statistics
Recommendation
AI Engine
Storage


---

## Content Layer


시험별:


Exam
Subject
Chapter
Pattern
Question
Solution


---

# 4. New Exam Addition Principle


새 시험 추가 시:


수정:


Data


최소화:


Core Code


---

# 5. Subject Hierarchy


데이터 구조:


Exam
↓
Subject
↓
Chapter
↓
Pattern
↓
Question


예:


감정평가사
↓
회계학
↓
재고자산
↓
FOB 조건
↓
문제


---

# 6. Subject Template


모든 시험은 동일 Template 사용:


필수:


subject.json
chapter.json
pattern.json
question.json


---

# 7. Exam Configuration


시험별 설정:


예:


```json
{
"examId":"appraiser",

"name":"감정평가사",

"subjects":[
"accounting",
"economics"
]
}
8. Subject Configuration
예:
{
"subjectId":"accounting",

"name":"회계학",

"examId":"appraiser",

"chapters":[
"inventory",
"lease"
]
}
9. Pattern Expansion
Pattern Engine은 시험별 변경 없이 사용한다.
입력:
Pattern Data

처리:
출제빈도 분석

중요도 계산

추천

10. Question Expansion
문제 Schema 유지:
모든 시험:
Question ID

Pattern ID

Difficulty

Answer

Solution

변경:
Content
11. Example Expansion
Existing
감정평가사

회계학

재고자산

New Addition
감정평가사

경제학

수요와 공급


필요:
economics-pattern.json

economics-question.json

코드는 유지.
12. AI Expansion
AI Engine 재사용:
입력 변경:
Subject

Pattern

Question History

출력:
예상문제

유사문제

해설

13. Difficulty Standardization
모든 시험 공통:
Easy

Medium

Hard

시험별:
Pattern Complexity

Calculation Level

Memory Level

14. Ranking System
과목별 중요도:
S

A

B

C

사용:
Study Priority

Recommendation

Dashboard

15. New Subject Workflow
새 과목 추가:
Step 1
기출 수집
↓
Step 2
PDF 분석
↓
Step 3
Pattern DB 생성
↓
Step 4
Question DB 생성
↓
Step 5
Quality Check
↓
Step 6
서비스 연결
16. Existing Code Protection
새 과목 추가 시 금지:
기존 UI 복사

새로운 JS 작성

별도 Logic 생성

권장:
Data Driven Development

17. Content Version Management
과목별:
accounting-v1

economics-v1

관리:
Pattern 변경

Question 추가

난이도 변경

18. Cross Subject Analysis
향후 가능:
사용자 약점 분석

↓

비슷한 학습 유형 발견

↓

다른 과목 추천


예:
회계 계산 오류

↓

경제 계산 문제 추천

19. Commercial Expansion
가능:
개인 학습

↓

프리미엄 서비스

↓

시험별 구독

↓

B2B 교육 서비스

20. Final Principle
AI Exam Learning Platform의 핵심은
문제집 제작 시스템이 아니다.
목표:
시험 데이터를 분석하고

출제 패턴을 발견하며

사용자에게 최적 학습 경로를 제공하는

범용 시험 학습 엔진

Content Expansion은
플랫폼 성장의 핵심 전략이다.