# AI Exam Learning Platform

# Deployment & Operation Specification

Version 2.0


---

# 1. Purpose


본 문서는 AI Exam Learning Platform의

배포, 운영, 업데이트, 유지보수 기준을 정의한다.


목표:


- 안정적인 서비스 제공
- 데이터 손실 방지
- 빠른 콘텐츠 업데이트
- 과목 확장 가능한 운영 구조 확보


---

# 2. Deployment Principle


플랫폼은 초기 단계에서

정적 웹 기반 배포를 우선한다.


기본 구조:


```
HTML

+

CSS

+

JavaScript

+

JSON Database

```


장점:


- 서버 비용 최소화
- 빠른 배포
- Git 기반 관리
- 과목 추가 용이


---

# 3. Deployment Architecture


초기:


```
Git Repository

↓

GitHub Pages

↓

User Browser

```


데이터:


```
JSON File

↓

Fetch

↓

Browser Memory

```


---

# 4. Recommended Hosting


MVP:


```
GitHub Pages

```


향후:


```
Cloudflare Pages

Vercel

AWS

```


확장 가능.


---

# 5. Project Structure


배포 기준:


```
/

index.html

style.css

app.js


/assets

/css

/js

/data

/docs

```


---

# 6. Production Build Rule


배포 전 확인:


```
□ 모든 파일 경로 확인

□ JSON Fetch 정상

□ Console Error 없음

□ Mobile 확인

□ Desktop 확인

```


---

# 7. Git Management


Repository 구조:


```
main

|

production

```


개발:


```
feature branch

↓

review

↓

merge

```


---

# 8. Commit Convention


형식:


```
type: description
```


예:


기능 추가:


```
feat: add pattern learning page
```


버그 수정:


```
fix: correct json loading error
```


문서:


```
docs: update question schema
```


---

# 9. Version Management


버전:


```
Major.Minor.Patch
```


예:


```
v1.0.0

```


의미:


Major:

대규모 구조 변경


Minor:

기능 추가


Patch:

오류 수정


---

# 10. Data Update Process


기출 추가:


```
New Exam PDF

↓

Exam Analysis

↓

Pattern Update

↓

Master DB Update

↓

Quality Check

↓

Deploy

```


---

# 11. New Subject Deployment


새 과목 추가:


Step 1


Subject 등록


```
subjects.json
```


↓

Step 2


기출 분석


```
exam-index

pattern-db

frequency

```


↓

Step 3


Question 생성


↓

Step 4


Pattern 연결


↓

Step 5


서비스 배포


---

# 12. Database Backup


백업 대상:


```
master-db.json

pattern-db.json

question database

user statistics

```


주기:


```
정기 Backup

변경 전 Backup

```


---

# 13. User Data Management


사용자 데이터:


초기:


```
LocalStorage

```


향후:


```
Database

Authentication

Cloud Sync

```


---

# 14. LocalStorage Migration


저장 구조 변경:


금지:


```
기존 key 삭제

```


필수:


```
schemaVersion

migration function

```


예:


```json
{
"schemaVersion":2
}
```


---

# 15. Performance Management


관리 항목:


```
JSON 크기

초기 로딩 시간

이미지 용량

JavaScript 실행 시간

```


---

# 16. Progressive Web App


향후 지원:


```
manifest.json

service worker

offline cache

```


목표:


앱처럼 사용 가능.


---

# 17. Monitoring


확인:


```
오류 발생

사용자 행동

학습 완료율

추천 효과

```


---

# 18. Release Checklist


배포 전:


## Function


□ 기능 정상


## Data


□ JSON 검증


## UI


□ 반응형 확인


## Quality


□ Quality Management 통과


## Documentation


□ README 업데이트


---

# 19. Rollback Policy


문제 발생:


```
현재 버전 중단

↓

이전 안정 버전 복구

↓

원인 분석

↓

수정 배포

```


---

# 20. Long Term Expansion


향후:


```
Static Web App

↓

Backend API

↓

User Account

↓

AI Cloud Service

↓

Commercial Platform

```


---

# 21. Final Principle


배포의 목적은

코드를 공개하는 것이 아니다.


목표:


```
안정적인 학습 환경 제공

+

지속적인 콘텐츠 업데이트

+

확장 가능한 플랫폼 유지

```


AI Exam Learning Platform은

한 번 만드는 프로그램이 아니라

계속 성장하는 학습 시스템이다.
