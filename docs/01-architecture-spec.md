# AI Exam Learning Platform
# Architecture Specification

Version 2.0

---

# 1. Document Purpose

본 문서는 AI Exam Learning Platform의 전체 시스템 구조를 정의한다.

모든 개발자는 기능 추가 전 본 문서를 확인해야 한다.

목표:

- 다양한 시험 지원
- 다양한 과목 지원
- 기출 분석 자동화
- 출제 패턴 기반 학습
- AI 개인화 학습 제공

---

# 2. Architecture Overview

전체 구조:

```
                    User

                     │

                     ▼

              Web Application

                     │

                     ▼

              Learning Engine

                     │

       ┌─────────────┼─────────────┐

       ▼             ▼             ▼

 Pattern Engine  Statistics   Recommendation

       │             │             │

       └─────────────┼─────────────┘

                     │

                     ▼

              Master Database

                     │

       ┌─────────────┼─────────────┐

       ▼             ▼             ▼

 PDF Analyzer   Generator    Subject Template

                     │

                     ▼

              Source Data
```

---

# 3. Layer Architecture

시스템은 6개 Layer로 구성한다.

---

# Layer 1

# Source Layer

역할:

원본 데이터를 관리한다.

입력:

- 기출 PDF
- 해설 PDF
- 시험 정보
- 사용자 입력 데이터


구조:

```
data/source/

├── exams/

├── solutions/

└── metadata/
```

---

# Layer 2

# Analysis Layer

역할:

기출 데이터를 분석한다.

구성:

## PDF Analyzer

기능:

- PDF 텍스트 추출
- 문제 분리
- 연도 분석
- 단원 분류
- 출제패턴 분석


출력:

```
analysis-result.json
```

---

## Pattern Extractor

역할:

문제를 Pattern 단위로 변환한다.

예:

원본:

"기말재고 포함 여부 판단"

↓

Pattern:

```
Inventory Closing Inventory Recognition
```

---

# Layer 3

# Data Layer

시스템의 핵심 데이터 저장 영역.

최상위 원본:

```
master-db.json
```


구조:

```
data/

├── master/

│
├── generated/

│
├── cache/

│
└── source/
```

---

# Master Database Principle

모든 데이터 수정은:

master-db

에서 시작한다.


금지:

generated 파일 직접 수정


허용:

master-db 수정

↓

자동 생성

↓

서비스 반영

---

# Layer 4

# Intelligence Layer

AI 기능 담당 영역.


---

# Pattern Engine

역할:

출제 패턴 관리


기능:

- Pattern 생성
- Pattern 분류
- S/A/B 등급 관리
- 관련 Pattern 연결


예:

```
Inventory

├── INV-01
├── INV-02
└── INV-03
```

---

# Statistics Engine

역할:

출제 분석


관리:

- 출제 빈도
- 최근 출제
- 반복 주기
- 중요도


예:

```
Pattern

frequency: 8

importance: S

predictionScore: 92
```

---

# Prediction Engine

역할:

예상문제 생성


입력:

- 출제 빈도
- 패턴 변화
- 최근 시험


출력:

- 예상 Pattern
- 예상 Question


---

# Recommendation Engine

역할:

개인 맞춤 학습 추천


입력:

사용자 데이터

- 정답률
- 오답
- 학습시간


출력:

오늘 학습 추천

---

# Learning Engine

역할:

학습 흐름 관리


관리:

- 진도
- 오답
- 복습
- 반복학습


---

# Layer 5

# Subject Layer

과목별 전문 영역.


Core Engine과 분리한다.


구조:

```
subjects/

├── accounting/

├── economics/

├── civil/

└── law/
```


---

# Subject Template

각 과목 특성을 정의한다.


예:

## Accounting

```
calculation

journalEntry

financialStandard

```

---

## Economics

```
graph

formula

model

elasticity
```

---

## Civil Law

```
article

precedent

caseAnalysis
```

---

# Layer 6

# Application Layer

사용자가 사용하는 영역.


구조:

```
apps/

└── web/

    ├── pages/

    ├── components/

    ├── styles/

    └── scripts/
```


---

# 4. Data Flow

전체 데이터 흐름:


```
PDF

↓

PDF Analyzer

↓

Pattern Extractor

↓

Master DB

↓

Engine Processing

↓

Generated Data

↓

Web Application

↓

User Learning Data

↓

Learning Engine

↓

Recommendation
```

---

# 5. Development Order

개발 순서:


## Phase 1

Core Foundation

완료:

- Constitution
- Architecture
- Database


---

## Phase 2

Data System

구현:

- Master DB
- Subject Template
- Pattern Schema


---

## Phase 3

Analysis System

구현:

- PDF Analyzer
- Pattern Extractor


---

## Phase 4

Learning Platform

구현:

- Question UI
- Quiz
- Progress
- Wrong Answer


---

## Phase 5

AI Engine

구현:

- Recommendation
- Prediction
- Statistics


---

# 6. Coding Principle

## Dependency Rule


상위 Layer는 하위 Layer에 의존한다.

반대 방향 의존 금지.


예:

가능:

```
Web

↓

Learning Engine

↓

Database
```


금지:

```
Database

↓

Web UI
```

---

# 7. Expansion Rule


새 시험 추가:


금지:

새 프로젝트 생성


허용:


```
Subject 추가

↓

Template 추가

↓

PDF 분석

↓

Master DB 생성
```

---

# 8. Current First Implementation

첫 번째 Subject:

```
Certification

└── 감정평가사

    └── 회계학
```


목표:

회계학 완성 후

동일 Engine으로

경제학 확장

---

# 9. Architecture Review Checklist


기능 추가 전 확인:


□ Constitution 준수

□ Architecture 준수

□ Master DB 중심 개발

□ Subject 독립성 유지

□ Pattern 중심 개발

□ 확장 가능 구조 유지

□ 기존 기능 영향 검토


---

# 10. Final Goal


AI Exam Learning Platform은

단순 문제은행이 아니다.


목표:

```
기출 분석

↓

출제 패턴 발견

↓

개인 맞춤 학습

↓

합격 가능성 향상
```


을 제공하는

AI 기반 시험 학습 운영체제 구축이다.