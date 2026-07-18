# AI Exam Learning Platform

# Final Implementation Plan

Version 2.0


---

# 1. Purpose


본 문서는 AI Exam Learning Platform v2의

전체 설계를 실제 개발 단계로 변환하기 위한

최종 실행 계획서이다.


목표:


- Cursor 기반 개발 진행
- 기능 단위 완성
- 데이터 중심 확장
- 품질 검증 자동화


---

# 2. Development Principle


개발 원칙:

Design First
↓
Data First
↓
Feature Complete
↓
Quality Check
↓
Expansion


한 번에 많은 기능을 만들지 않는다.


하나의 기능 단위가 완성될 때까지

다음 기능으로 이동하지 않는다.


---

# 3. Development Priority


우선순위:


데이터 구조

문제 학습 기능

Pattern 학습

학습 기록

통계

AI 기능

관리자 기능

확장 기능



---

# Phase 0

## Project Foundation


목표:


프로젝트 기본 구조 완성


생성:


README.md
docs/
data/
assets/
css/
js/


검증:


□ 구조 정상
□ 문서 연결
□ Git 관리 가능


완료 기준:


프로젝트 확장 가능한 상태


---

# Phase 1

# Core Data System


목표:


데이터 기반 플랫폼 구축


생성:


exam.json
subject.json
chapter.json
pattern-db.json
question-db.json


구현:


- JSON Loader
- Data Validation
- Storage Module


완료 기준:


JSON 변경만으로 콘텐츠 변경 가능


---

# Phase 2

# Learning Engine


목표:


문제 풀이 시스템 완성


구현:


문제 표시
선택지 입력
자동 채점
해설 표시
다음 문제 이동


필수 연결:


Question
↓
Pattern
↓
Solution


완료 기준:


하나의 단원 학습 가능


---

# Phase 3

# First Subject Complete


목표:


감정평가사 회계학 재고자산 완성


구현:


기출 Pattern 등록
문제 추가
출제 빈도 표시
중요도 표시
암기 Point
오답 분석


완료 기준:


재고자산 전체 학습 가능


---

# Phase 4

# Learning Record System


구현:


진도
오답노트
즐겨찾기
최근 학습
학습 통계


저장:


LocalStorage


완료 기준:


사용자의 학습 기록 유지 가능


---

# Phase 5

# Analytics System


구현:


Pattern별 정답률
취약 Pattern
Chapter 분석
Mastery Level


완료 기준:


사용자별 약점 분석 가능


---

# Phase 6

# Recommendation Engine


구현:


입력:


오답
정답률
Pattern 중요도
시험 일정


출력:


오늘 학습 추천
복습 추천
추가 문제


---

# Phase 7

# AI Tutor


구현:


오답 원인 분석
수준별 설명
힌트
유사 문제 생성


검증:


반드시 Pattern 연결


---

# Phase 8

# Content Expansion


목표:


새 과목 추가 가능 구조


예:


경제학
민법
관계법규


완료 기준:


코드 변경 최소화


---

# Phase 9

# Admin System


구현:


문제 관리
Pattern 관리
검수
Version 관리


---

# Phase 10

# Deployment


검증:


Responsive
Performance
Security
Copyright


배포:


GitHub Pages


---

# 4. Feature Development Rule


새 기능 개발 시 반드시:


1.

관련 문서 확인


2.

필요 데이터 정의


3.

JSON Schema 확인


4.

HTML 구현


5.

CSS 구현


6.

JavaScript 구현


7.

Quality Check


8.

README 업데이트


순서로 진행한다.


---

# 5. Cursor Development Prompt Template


기능 개발 시작:


현재 docs 설계 문서를 모두 참조한다.
이번 작업 목표:
[기능명]
구현 범위:
JSON
HTML
CSS
JavaScript
README
완료 후 보고:
구현 내용
수정 파일
코드 리뷰 PASS/FAIL
테스트 결과
다음 작업 추천


---

# 6. Code Review Standard


모든 기능 완료 후:


## HTML


Semantic HTML
Accessibility


## CSS


Responsive
Duplicate Check


## JavaScript


Error Handling
Storage Safety
Data Validation


## Data


Schema Match
Pattern Connection


---

# 7. MVP Completion Criteria


MVP 완료:


□ 하나의 시험 지원
□ 하나의 과목 완성
□ Pattern 학습 가능
□ 문제 풀이 가능
□ 오답 관리 가능
□ 학습 기록 저장
□ GitHub Pages 배포 가능


---

# 8. Expansion Criteria


다음 단계:


MVP
↓
Multiple Subject
↓
Multiple Exam
↓
AI Tutor
↓
Commercial Platform


---

# 9. Final Development Rule


중요:


기능 수보다

데이터 구조와 확장성이 우선이다.


좋은 플랫폼:


새로운 시험 추가 시
새로운 코드를 만드는 것이 아니라
새로운 데이터를 추가하는 구조


---

# 10. Final Goal


AI Exam Learning Platform의 목표:


기출 분석

출제 패턴 분석

AI 학습 추천

개인 맞춤 코칭
을 제공하는
범용 시험 학습 플랫폼 구축

