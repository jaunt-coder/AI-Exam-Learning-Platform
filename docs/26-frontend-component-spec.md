# AI Exam Learning Platform

# Frontend Component Specification

Version 2.0


---

# 1. Purpose


본 문서는 AI Exam Learning Platform의

Frontend 화면 구조와 컴포넌트 개발 기준을 정의한다.


목표:


- Pattern 중심 학습 UX 구현
- 데이터 기반 화면 구성
- 재사용 가능한 Component 구조
- 과목 확장 가능 UI


---

# 2. Frontend Principle


핵심 원칙:


```
Data

↓

Component

↓

User Experience

```


HTML은 화면 구조,

JavaScript는 상태 관리,

JSON은 콘텐츠 데이터를 담당한다.


---

# 3. Screen Architecture


전체 화면 흐름:


```
Home

↓

Exam Dashboard

↓

Subject Dashboard

↓

Chapter Dashboard

↓

Pattern Learning

↓

Question Solving

↓

Result

↓

Wrong Note

↓

AI Tutor

```


---

# 4. Folder Structure


```
pages/


├── index.html


├── exam.html


├── subject.html


├── chapter.html


├── pattern.html


├── question.html


├── result.html


├── wrong-note.html


└── ai-tutor.html


```


---

# 5. Home Screen


파일:


```
index.html
```


목적:


사용자가 시험을 선택하는 첫 화면


구성:


```
Header

↓

Exam Card

↓

Recent Learning

↓

Recommended Study

```


데이터:


```
exams.json

```


---

# 6. Exam Dashboard


목적:


시험 전체 현황 표시


표시:


```
시험명

전체 과목

진행률

D-Day

추천 학습

```


데이터:


```
exam

statistics

userProgress

```


---

# 7. Subject Dashboard


목적:


과목별 학습 진입


UI:


```
Subject Card


회계학

경제학

민법

```


표시:


```
완료율

Pattern 개수

취약도

```


---

# 8. Chapter Dashboard


목적:


단원 선택


UI:


```
Chapter List

```


표시:


```
Chapter Name

Grade(S/A/B/C)

출제 빈도

숙련도

```


데이터:


```
chapters.json

pattern-db.json

```


---

# 9. Pattern Learning Component


가장 중요한 화면


목적:


출제 패턴 학습


구성:


```
Pattern Title

↓

출제 빈도

↓

출제 연도

↓

핵심 개념

↓

암기 Point

↓

대표 문제

```


데이터:


```
pattern-db.json

```


---

# 10. Pattern Card


Component:


```
<PatternCard>

```


Props:


```
patternId

name

grade

frequency

importance

```


표시:


```
S급

★★★★★

최근 출제

```


---

# 11. Question Component


파일:


```
question.html

```


구성:


```
Question Header

↓

Question Content

↓

Choices

↓

Submit Button

```


---

# 12. Answer Component


목적:


답안 처리


기능:


```
선택 저장

정답 확인

점수 계산

```


---

# 13. Solution Component


정답 후 표시:


```
Correct Answer

↓

풀이 과정

↓

암기 Point

↓

오답 원인

```


데이터:


```
question.solution

```


---

# 14. Wrong Note Component


목적:


사용자의 약점 관리


표시:


```
틀린 문제

관련 Pattern

오답 횟수

추천 복습

```


---

# 15. Progress Component


표시:


```
전체 진도

Pattern 숙련도

정답률

```


데이터:


```
userProgress

```


---

# 16. AI Tutor Component


목적:


AI 과외 기능


화면:


```
질문 입력

↓

AI 답변

↓

추가 질문

```


입력 데이터:


```
Pattern

Question

User History

```


---

# 17. Recommendation Component


목적:


오늘 학습 추천


표시:


```
오늘 공부할 Pattern

복습 문제

취약 영역

```


---

# 18. Global Components


공통:


```
Header

Navigation

Footer

Loading

Error Message

```


---

# 19. JavaScript Component Rule


원칙:


화면별 JS 분리


예:


```
pattern-page.js

question-page.js

tutor-page.js

```


---

# 20. State Management


초기:


```
LocalStorage

```


저장:


```
현재 학습 위치

답안 기록

오답 기록

진도

```


---

# 21. Responsive Design


지원:


```
Mobile

Tablet

Desktop

```


기준:


```
480px

768px

1024px

1440px

```


---

# 22. Accessibility


필수:


```
Semantic HTML

Keyboard Navigation

Alt Text

Button Label

```


---

# 23. Performance Rule


금지:


```
전체 Database 한번에 Loading

```


원칙:


```
필요한 Pattern만 Loading

```


---

# 24. Component Development Order


구현 순서:


```
1. Layout

↓

2. Data Loading

↓

3. Pattern Card

↓

4. Question

↓

5. Result

↓

6. Wrong Note

↓

7. AI Tutor

```


---

# 25. Final Principle


Frontend의 목적은

많은 기능을 보여주는 것이 아니다.


목표:


```
사용자가

다음에 무엇을 공부해야 하는지

즉시 알 수 있는 화면

```


Pattern 중심 학습 경험을 제공한다.