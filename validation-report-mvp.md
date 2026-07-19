# Question DB MVP Validation Report

- 생성일: 2026-07-19
- 데이터 소스: `source/original-exams/` (HWP > PDF > OCR)
- 출력: `data/question-db-mvp.json`, `pattern-db-mvp.json`, `statistics-mvp.json`
- Phase 1 Freeze (`data/question-db.json` 등) 미수정
- MVP 범위: 2015, 2017, 2018, 2020, 2024, 2025 (240문항)

## 요약

| 항목 | 값 |
|------|-----|
| 대상 연도 | 2015, 2017, 2018, 2020, 2024, 2025 |
| 기대 문항 | 240 |
| 추출 문항 | 240 |
| Question 인식률 | 100.0% |
| 보기 인식률 (5지) | 100.0% |
| 정답 연결률 | 100.0% |
| Pattern 연결률 | 100.0% |
| 표 문제 | 12 |
| 계산 문제 | 227 |
| Phase 1 MVP | PASS |

## 연도별 추출 결과

| 연도 | 원본 | 방식 | OCR | 문항 | 5지 보기 | 정답 | 상태 |
|------|------|------|-----|------|----------|------|------|
| 2015 | `source/original-exams/2015.pdf` | pdf | N | 40/40 | 40 | 40 | ok |
| 2017 | `source/original-exams/2017.pdf` | pdf | N | 40/40 | 40 | 40 | ok |
| 2018 | `source/original-exams/2018.pdf` | pdf | N | 40/40 | 40 | 40 | ok |
| 2020 | `source/original-exams/2020.pdf` | pdf | N | 40/40 | 40 | 40 | ok |
| 2024 | `source/original-exams/2024.pdf` | pdf | N | 40/40 | 40 | 40 | ok |
| 2025 | `source/original-exams/2025.pdf` | pdf | N | 40/40 | 40 | 40 | ok |

## Validation 결과

- [PASS] 40문항/연도: 240/240
- [PASS] 보기 5개: 240/240
- [PASS] question 존재: 240건
- [PASS] answer 존재: 240/240
- [PASS] Pattern 연결: 240/240

## 기존 DB 대비 개선

- StudyPiter 2단 합본 PDF 대신 `source/original-exams` 원본(HWP 우선) 사용
- 회계학 41~80번 전체 40문항 추출 구조
- 표 문제 Markdown/grid 보존, 계산 문제 줄바꿈·수식 유지
- `answers/{year}.json` 및 원본 정답 HWP/PDF 자동 연결
