# AI Exam Learning Platform v2

# MVP Fast Development Roadmap

Version 2.0


---

# 1. MVP Goal


본 MVP의 목표:


"감정평가사 회계학 기출 Pattern 기반 학습 플랫폼"


사용자가 실제 시험 공부에 사용할 수 있는 수준까지

최소 기능을 빠르게 완성한다.


---

# 2. MVP Scope


## 포함 기능


필수:


```
기출 문제 데이터

↓

Pattern 분류

↓

문제 풀이

↓

채점

↓

해설 확인

↓

오답 저장

↓

Pattern별 복습

```


---

## 제외 기능


MVP 이후:


```
회원가입

서버 DB

결제

커뮤니티

고급 AI Tutor

머신러닝 추천

통계 Dashboard

```


---

# 3. Development Priority


우선순위:


```
1. Data

2. Question Engine

3. Pattern Learning

4. Wrong Note

5. AI Explanation

```


---

# Phase 1
# Past Exam Data Processing


목표:


2018~2025 기출문제를

학습 가능한 데이터로 변환한다.


---

## Input


```
source/past-exams/

2018-2025.pdf

```


---

## Output


생성:


```
data/

├── master-db.json

├── pattern-db.json

├── question-db.json

└── statistics.json

```


---

## 분석 기준


각 문제:


필수 연결:


```
연도

과목

단원

Pattern

난이도

정답

해설

```


---

## 완료 기준


PASS:


```
JSON 정상 생성

문제 1개 이상 웹 출력 가능

Pattern 연결 완료

```


---

# Phase 2
# Question Solving Engine


목표:


사용자가 문제를 풀 수 있다.


---

## 구현 파일


```
question.html

question.js

question.css

```


---

## 기능


필수:


```
문제 표시

보기 선택

정답 확인

점수 표시

해설 표시

다음 문제

```


---

## 완료 기준


사용자가:


```
문제 선택

↓

답 선택

↓

채점

↓

해설 확인

```


가능해야 한다.


---

# Phase 3
# Pattern Learning System


목표:


문제가 아니라 출제 패턴을 학습한다.


---

## 화면


예:


```
재고자산

S급 Pattern


Pattern 01

기말재고 포함 여부 판단


출제:

2018

2020

2023

2025


중요도:

★★★★★


대표 문제:

5개

```


---

## 데이터


사용:


```
pattern-db.json

```


---

# Phase 4
# Wrong Answer System


목표:


약점 관리


---

## 저장 데이터


```
questionId

patternId

wrongCount

lastWrongDate

```


---

## 기능


```
오답 저장

↓

오답 다시 풀기

↓

Pattern 취약도 표시

```


---

# Phase 5
# AI Explanation


목표:


기본 AI 과외 기능


---

## 방식


초기:


문제별 AI 설명 버튼


입력:


```
문제

정답

해설

Pattern

사용자 오답

```


출력:


```
왜 틀렸는지

핵심 개념

암기 방법

```


---

# 4. MVP File Structure


```
project/


├── index.html


├── question.html


├── pattern.html


├── wrong-note.html


│

├── css/

│   └── style.css


│

├── js/

│   ├── app.js

│   ├── question.js

│   ├── pattern.js

│   ├── storage.js


│

├── data/

│   ├── master-db.json

│   ├── pattern-db.json

│   └── question-db.json


│

├── source/

│   └── past-exams/


│

└── docs/

```


---

# 5. Development Rule


기능 구현 순서:


```
하나의 Pattern 선택

↓

데이터 생성

↓

화면 구현

↓

문제 연결

↓

테스트

↓

다음 Pattern

```


한 번에 전체 개발하지 않는다.


---

# 6. First Target


첫 번째 완성 목표:


```
회계학

↓

재고자산

↓

Pattern 01

기말재고 포함 여부 판단

```


완료 후:


동일 방식으로 확장:


```
Pattern 02

Pattern 03

...

```


---

# 7. Cursor Development Command


Cursor 작업 요청:


```
현재 프로젝트는 MVP 개발 단계이다.

29-mvp-fast-development-roadmap.md를 기준으로 개발한다.

목표:

감정평가사 회계학 기출 Pattern 학습 플랫폼 완성


현재 작업:

Phase 1 데이터 구축부터 시작한다.


source/past-exams/2018-2025.pdf를 분석하여

data/question-db.json

data/pattern-db.json

data/master-db.json

을 생성한다.


분석 시:

docs/24-data-pipeline-spec.md

docs/25-database-implementation-spec.md

를 반드시 참고한다.


완료 후 보고:

1. 생성 파일
2. 데이터 개수
3. Pattern 분류 결과
4. 오류 사항
5. 다음 개발 단계

```


---

# 8. MVP Completion Definition


MVP 완료:


사용자가:


```
재고자산 선택

↓

Pattern 확인

↓

관련 기출 풀이

↓

채점

↓

해설 확인

↓

오답 저장

```


까지 가능하면 완료.


---

# Final Principle


MVP의 목표는

완벽한 플랫폼 제작이 아니다.


목표:


"시험 합격에 직접 도움이 되는

Pattern 기반 회계학 학습 도구를

가장 빠르게 완성하는 것"


이다.