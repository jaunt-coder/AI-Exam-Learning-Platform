# Past Exam Source Data

## Source File

| 항목 | 값 |
|------|-----|
| 파일명 | `2018-2025.pdf` |
| 시험 | 감정평가사 1차 |
| 과목 | 회계학 |
| 연도 범위 | 2018 ~ 2025 |
| 분석 범위 (MVP) | 재고자산 단원 |

## Placement Rule (docs/24-data-pipeline-spec)

```
source/past-exams/2018-2025.pdf
```

원본 PDF는 수정하지 않는다. 분석 완료 후 개발은 Database 기준으로 진행한다.

## Analysis Status

| 항목 | 상태 |
|------|------|
| PDF 원본 | **미배치** — 실물 PDF는 사용자가 본 디렉터리에 추가 |
| 구조화 데이터 | `data/master-db.json`, `pattern-db.json`, `question-db.json`, `statistics.json` 생성 완료 |
| 분석 문서 | `docs/exam-analysis.md`, `docs/pattern-db.md`, `docs/statistics.md` |

## Analysis Metadata

```json
{
  "analysisVersion": "1.0",
  "analysisDate": "2026-07-18",
  "analyzer": "MVP Phase 1 — Structured Data Pipeline",
  "subjectId": "ACC",
  "chapterId": "ACC_INV",
  "chapterName": "재고자산",
  "yearRange": [2018, 2025],
  "note": "PDF 미배치 상태에서 감정평가사 회계학 재고자산 기출 유형을 Pattern 단위로 구조화. PDF 추가 시 sourceFile 필드로 재검증 가능."
}
```

## Reanalysis Rule (docs/24 §15)

PDF 재분석은 다음 경우에만 수행:

- 새 연도 기출 추가
- Pattern 분류 오류 발견
- Schema 버전 변경
