# Architecture (Sprint-14A)

## Resolved Question Architecture

```text
Original Question DB
        │
        ▼
Override Layer
        │
        ▼
Resolved Question
        │
 ┌──────┴──────┐
 ▼             ▼
Student     Reviewer
Workspace   Workspace
        │
        ▼
Learning Engine
        │
        ▼
Dashboard / Tutor / Exam
```

## 계층 설명

- Original Question DB: 문제 원본 데이터(Read Only)
- Override Layer: Reviewer 승인 결과 저장 계층
- Resolved Question: 학생 노출용 최신 문제 뷰
- Student Workspace: 문제/패턴/시험/튜터의 학생 학습 화면
- Reviewer Workspace: 검토/승인/일괄 수정 워크스페이스
- Learning Engine: Mastery/Recommendation/Review Cycle 분석
- Dashboard / Tutor / Exam: 학습 분석 결과 소비 계층

## 핵심 제약

- Question DB, Pattern DB, Statistics 직접 수정 금지
- Override Layer는 원본 DB 대체가 아니라 추가 계층
- Student Resolver 구조 유지
- Learning Layer는 additive 방식 유지
