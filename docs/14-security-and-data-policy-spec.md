# AI Exam Learning Platform

# Security and Data Policy Specification

Version 2.0


---

# 1. Purpose


본 문서는 AI Exam Learning Platform에서 사용하는

데이터 보호, 보안 관리, 저작권 관리, 사용자 정보 관리 기준을 정의한다.


목표:


- 사용자 데이터 보호
- 시험 콘텐츠 안전 관리
- AI 생성 데이터 신뢰성 확보
- 서비스 확장 대비 보안 구조 확보


---

# 2. Security Principle


플랫폼 보안 원칙:


```
Data Protection

>

Accessibility

>

Convenience

```


데이터는 필요한 범위에서만 사용한다.


---

# 3. Data Classification


모든 데이터는 중요도에 따라 관리한다.


## Level 1

Public Data


예:


```
과목명

단원명

학습 화면

공개 설명

```


---

## Level 2

Educational Data


예:


```
문제 데이터

Pattern 정보

해설

학습 콘텐츠

```


관리:


수정 권한 제한


---

## Level 3

User Data


예:


```
학습 기록

오답 기록

진도

통계

```


관리:


개인별 보호


---

## Level 4

Sensitive System Data


예:


```
API Key

Authentication 정보

운영 설정

```


관리:


외부 공개 금지


---

# 4. Exam Content Copyright Policy


기출 문제 데이터는 반드시 출처를 관리한다.


저장:


```
Exam Source

Exam Year

Publisher

License Status

```


---

# 5. PDF Management Rule


원본 PDF:


권장 위치:


```
source/

└── past-exams/

```


원칙:


```
개발 데이터와 분리

↓

분석용 원본 유지

↓

서비스 공개 데이터 별도 관리

```


---

# 6. Copyright Protection Rule


서비스 공개 시:


주의:


```
원본 PDF 전체 공개 금지

저작권 확인 필요

출처 표시

```


가능:


```
패턴 분석

학습 메타데이터

자체 제작 해설

```


---

# 7. User Data Policy


사용자 데이터:


관리:


```
최소 수집 원칙

```


필요 데이터:


```
학습 진행

문제 결과

오답 기록

즐겨찾기

```


---

# 8. LocalStorage Security


초기 버전:


저장:


```
Browser LocalStorage

```


저장 가능:


```
학습 기록

환경 설정

```


저장 금지:


```
비밀번호

개인 인증 정보

API Key

```


---

# 9. Cloud Migration Policy


향후 서버 전환:


구조:


```
LocalStorage

↓

User Account

↓

Cloud Database

```


필요:


```
Migration System

Data Version

Backup

```


---

# 10. Authentication Policy


계정 기능 추가 시:


관리:


```
Email

Social Login

Token

Session

```


원칙:


```
Password 직접 저장 금지

암호화 저장 사용

```


---

# 11. AI Data Usage Policy


AI 입력 데이터:


허용:


```
Pattern Data

Question Data

Learning Statistics

```


금지:


```
개인 식별 정보

불필요한 개인정보

```


---

# 12. AI Generated Content Security


AI 생성 콘텐츠:


검증:


```
Source 확인

Pattern 연결

Quality Check

```


금지:


```
근거 없는 출제 예측

허위 기출 생성

```


---

# 13. API Security


API 사용 시:


관리:


```
API Key 환경 변수 관리

코드 직접 입력 금지

사용량 제한

```


---

# 14. Repository Security


Git 저장 금지:


```
.env

API Key

개인 데이터

원본 개인정보 파일

```


---

# 15. Backup Policy


백업 대상:


```
Master DB

Pattern DB

Question DB

Documentation

```


주기:


```
주요 변경 전

정기 Backup

```


---

# 16. Version Control


모든 데이터 변경:


기록:


```
Version

Date

Author

Change Reason

```


예:


```
v1.2.0

2026-08-01

Inventory Pattern Update

```


---

# 17. Access Control


권한:


## Developer


가능:


```
Code 수정

Schema 수정

```


---

## Content Manager


가능:


```
Question 수정

Pattern 수정

```


---

## User


가능:


```
학습

개인 기록 관리

```


---

# 18. Security Checklist


배포 전:


```
□ API Key 제거

□ 개인정보 제거

□ Git 공개 파일 확인

□ 데이터 권한 확인

□ Backup 완료

□ Copyright 확인

```


---

# 19. Incident Response


문제 발생:


절차:


```
발견

↓

서비스 영향 확인

↓

수정

↓

Version Update

↓

재배포

```


---

# 20. Long Term Security Expansion


향후:


```
Authentication

↓

Cloud Database

↓

Encrypted Storage

↓

Enterprise Security

```


---

# 21. Final Principle


AI Exam Learning Platform은

많은 데이터를 모으는 서비스가 아니다.


목표:


```
필요한 데이터를 안전하게 관리하고

정확한 학습 경험을 제공하는 시스템

```


Security는 기능이 아니라

플랫폼 신뢰도의 기반이다.
