# AI Exam Learning Platform

# Development Environment Specification

Version 2.0


---

# 1. Purpose


본 문서는 AI Exam Learning Platform 개발 환경과
코딩 규칙을 정의한다.


목표:


- Cursor 개발 일관성 유지
- 파일 구조 표준화
- 유지보수성 확보
- GitHub Pages 배포 가능 구조 유지


---

# 2. Development Philosophy


개발 원칙:

Simple
↓
Stable
↓
Expandable


초기 MVP에서는 복잡한 Framework 사용을 지양한다.


우선:


HTML
CSS
JavaScript
JSON


기반으로 개발한다.


---

# 3. Technology Stack


## Frontend


사용:


HTML5
CSS3
JavaScript ES6+


---

## Data


사용:


JSON


목적:


콘텐츠와 프로그램 분리


---

## Storage


초기:


LocalStorage


확장:


Cloud Database


---

## Deployment


초기:


GitHub Pages


확장:


Vercel
Cloud Server


---

# 4. Project Structure


기본 구조:


project/
├── index.html
├── README.md
│
├── css/
│   └── style.css
│
├── js/
│   ├── app.js
│   ├── data-loader.js
│   ├── storage.js
│   └── ui.js
│
├── data/
│   ├── exams.json
│   ├── subjects.json
│   ├── patterns.json
│   └── questions/
│
├── docs/
│
└── assets/


---

# 5. File Naming Rule


규칙:


## HTML


소문자 사용:


chapter.html
question.html


---

## JavaScript


kebab-case:


data-loader.js
question-engine.js


---

## JSON


kebab-case:


pattern-db.json
question-db.json


---

# 6. JavaScript Development Rule


## Module Principle


하나의 파일은 하나의 책임만 가진다.


예:


storage.js
↓
저장 기능
question-engine.js
↓
문제 처리


---

# 7. Function Rule


함수:


좋은 예:


loadQuestions()
saveProgress()
calculateScore()


나쁜 예:


doEverything()


---

# 8. Error Handling


모든 데이터 로딩:


필수:


try/catch


예:


JSON 로딩 실패
↓
사용자 안내
↓
Console 기록


---

# 9. Data Rule


JSON은 코드와 분리한다.


금지:


JavaScript 내부 문제 데이터 작성


허용:


JSON
↓
Loader
↓
Rendering


---

# 10. HTML Rule


원칙:


Semantic HTML 사용


예:


header
main
section
article
button


---

# 11. CSS Rule


원칙:


재사용 가능한 Class 사용


예:


.card
.button
.question-box


금지:


과도한 Inline Style


---

# 12. Responsive Rule


지원:


Mobile
Tablet
Desktop


기준:


480px
768px
1024px
1440px


---

# 13. Git Rule


Commit 단위:


기능 단위


예:


feat: add inventory FOB pattern
fix: correct answer validation
docs: update database spec


---

# 14. Cursor Development Rule


Cursor 작업 순서:


관련 docs 확인

기존 코드 분석

변경 계획 작성

구현

테스트

결과 보고



---

# 15. Code Modification Rule


기존 기능 삭제 금지.


수정 전:


영향 범위 분석


필수.


---

# 16. Testing Rule


기능 완료 후:


확인:


JSON Load
UI Display
Answer Check
Storage Save
Mobile View


---

# 17. Documentation Rule


기능 추가 시:


반드시:


README 업데이트
관련 docs 업데이트


---

# 18. Performance Rule


초기:


단순 구조 유지


주의:


불필요한 라이브러리 추가 금지
대용량 데이터 중복 로딩 금지


---

# 19. Security Rule


금지:


API Key 공개
개인정보 저장


---

# 20. Final Principle


AI Exam Learning Platform 개발 기준:


데이터 중심
패턴 중심
확장 가능
검증 가능


구조를 유지한다.


개발자는 코드를 만드는 것이 아니라

확장 가능한 학습 시스템을 만든다.

