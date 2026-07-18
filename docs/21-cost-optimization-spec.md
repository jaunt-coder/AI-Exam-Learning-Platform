# AI Exam Learning Platform

# Cost Optimization Specification

Version 2.0


---

# 1. Purpose


본 문서는 AI Exam Learning Platform 운영 시

AI API 비용과 인프라 비용을 효율적으로 관리하기 위한

비용 최적화 기준을 정의한다.


목표:


- AI 품질 유지
- API 비용 예측 가능성 확보
- 사용자 증가 대응
- 지속 가능한 서비스 운영


---

# 2. Cost Structure


전체 비용은 다음 구조로 관리한다.


```
Platform Cost

├── Hosting Cost

├── Database Cost

├── Storage Cost

└── AI API Cost

```


가장 큰 변동 비용:


```
AI API Cost

```


---

# 3. Cost Optimization Principle


기본 원칙:


```
모든 요청을 AI에게 보내지 않는다.

↓

이미 분석된 데이터는 재사용한다.

↓

AI는 판단과 설명에 집중한다.

```


---

# 4. AI Architecture


비효율 구조:


```
User Question

↓

AI API

↓

Answer

```


문제:


- 비용 증가
- 답변 품질 편차
- 시험 데이터 반영 부족


---

개선 구조:


```
Master DB

↓

Pattern Engine

↓

Knowledge Retrieval

↓

AI Tutor

↓

Response

```


---

# 5. AI Request Classification


모든 요청을 유형별 분류한다.


## Type A

# Static Response


예:


- 개념 설명
- 암기 포인트
- 기본 해설


처리:


```
Database Response

```


AI 호출:


```
0회

```


---

## Type B

# Assisted AI Response


예:


- 사용자 오답 분석
- 풀이 방향 설명


처리:


```
DB Data

+

AI Generation

```


AI 호출:


```
필요 시 1회

```


---

## Type C

# Advanced AI


예:


- 개인 학습 전략
- 복합 질문
- 새로운 문제 생성


처리:


```
AI Full Generation

```


AI 호출:


```
제한 적용

```


---

# 6. AI Cache System


목적:


동일 질문 반복 생성 방지


구조:


```
User Request

↓

Cache Search

↓

Existing Response?

↓

YES → Return

↓

NO → AI Call

```


---

# 7. Cache Data


저장:


```
Question ID

Pattern ID

Prompt

Response

Model Version

Created Date

```


---

# 8. Prompt Optimization


비효율:


```
전체 교재 전달

+
전체 문제 전달

+
전체 기록 전달

```


개선:


```
필요 Pattern

+

관련 Question

+

사용자 상태

```


목표:


Token 사용량 감소


---

# 9. Knowledge Base Strategy


AI 호출 전:


검색:


```
pattern-db

master-db

solution-db

statistics-db

```


AI 입력:


최소 데이터만 전달한다.


---

# 10. Model Routing


모든 요청을 동일 모델로 처리하지 않는다.


구조:


```
Simple Question

↓

Light Model


Complex Analysis

↓

Advanced Model

```


---

# 11. User AI Quota


무료 사용자:


예:


```
하루 AI 질문 3회

```


목적:


- 비용 예측
- Abuse 방지


---

Premium 사용자:


예:


```
월 AI Credit 제공

```


---

# 12. AI Credit System


사용량 관리:


```
User

↓

Credit Balance

↓

AI Request

↓

Credit Deduction

```


---

# 13. AI Generation Batch


예상 문제 생성:


실시간 생성 금지.


개선:


```
관리자 요청

↓

Batch Generation

↓

검수

↓

Database 저장

```


장점:


- 비용 절감
- 품질 관리


---

# 14. Database Optimization


저장 대상:


```
User Progress

Wrong Answer

Pattern Mastery

AI History Summary

```


저장 제한:


```
불필요한 대화 전체 저장 금지

```


---

# 15. AI Conversation Memory


비효율:


전체 대화 전달


개선:


요약 저장:


```
User Learning Profile

Weak Pattern

Preferred Explanation Level

```


---

# 16. Cost Monitoring


관리 항목:


```
Daily AI Request

Token Usage

Cost/User

Cost/Question

```


---

# 17. Budget Alert


설정:


예:


```
80%

↓

경고


100%

↓

제한 정책 실행

```


---

# 18. Service Plan Strategy


무료:


```
Basic Learning

Limited AI

```


Premium:


```
Unlimited Learning

Expanded AI Tutor

Personal Recommendation

```


---

# 19. Revenue-Cost Balance


핵심 지표:


```
ARPU

>

AI Cost/User

```


예:


사용료:


```
월 9,900원

```


AI 비용:


```
월 2,000원 이하 목표

```


---

# 20. Future Optimization


장기:


가능:


```
Fine Tuning Model

Private AI Model

Open Source Model

```


목적:


외부 API 의존 감소


---

# 21. Final Principle


AI Exam Learning Platform의 경쟁력은

AI를 많이 사용하는 것이 아니다.


핵심:


```
시험 데이터를 정확히 구조화하고

필요한 순간에만 AI를 사용하여

최고 효율의 개인 과외 경험을 제공하는 것

```


비용 최적화는

서비스 지속 가능성을 결정하는 핵심 시스템이다.