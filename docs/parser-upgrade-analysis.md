# Parser Upgrade Analysis (2010-2026)

- 생성일: 2026-07-19
- 범위: `source/original-exams/` 전 연도 parser 출력

## Summary

| 항목 | 값 |
|------|-----|
| 분석 연도 | 16 |
| 추출 question | 434 |
| 5지 보기 | 393 |
| stem OK | 359 |
| stem truncated | 81 |

## Truncation Cause Classification

| Cause | Count | 설명 |
|-------|-------|------|
| `choice_start_fail` | 66 | 보기 시작 ① 인식 실패 |
| `linebreak_handling` | 11 | PDF 줄바꿈 처리 문제 |
| `question_end_fail` | 3 | 문항 종료 인식 실패 (마지막 ? 문장만 취함 등) |
| `table_handling` | 1 | 표 블록 분리/복원 문제 |

## 연도별

| Year | Kind | Parsed | 5-choice | Truncated |
|------|------|--------|----------|-----------|
| 2010 | hwp | 0/40 | 0 | 0 |
| 2011 | hwp | 0/40 | 0 | 0 |
| 2012 | pdf | 40/40 | 40 | 0 |
| 2013 | hwp | 0/40 | 0 | 0 |
| 2014 | hwp | 0/40 | 0 | 0 |
| 2015 | pdf | 40/40 | 40 | 0 |
| 2016 | - | - | - | missing |
| 2017 | pdf | 40/40 | 40 | 1 |
| 2018 | pdf | 40/40 | 40 | 0 |
| 2019 | hwp | 0/40 | 0 | 0 |
| 2020 | pdf | 40/40 | 40 | 0 |
| 2021 | pdf | 40/40 | 16 | 30 |
| 2022 | pdf | 35/40 | 23 | 31 |
| 2023 | pdf | 39/40 | 34 | 18 |
| 2024 | pdf | 40/40 | 40 | 1 |
| 2025 | pdf | 40/40 | 40 | 0 |
| 2026 | pdf | 40/40 | 40 | 0 |
