# Source Map Spec

Sprint-09 · Sprint-09A  
Status: **ACTIVE**  
File: `data/question-source-map.json`  
Version: **1.1.0**  
Date: 2026-07-26

---

## Purpose

Question ID → Official PDF path + page + **questionNo** 매핑.  
학생이 Navigator에서 연도·페이지·문항 번호를 즉시 확인한다.

**Question DB를 수정하지 않는다.**

---

## Schema

```json
{
  "schema": "learning.question-source-map.v1",
  "version": "1.1.0",
  "count": 240,
  "linked": 160,
  "unlinked": 80,
  "entries": {
    "ACC_2018_Q066": {
      "pdf": "source/past-exams/2018/exam_2.pdf",
      "page": 23,
      "year": 2018,
      "questionNumber": 66,
      "questionNo": 66,
      "available": true,
      "declaredSourceFile": "source/original-exams/2018.pdf"
    },
    "ACC_2015_Q041": {
      "pdf": null,
      "page": 7,
      "year": 2015,
      "questionNumber": 41,
      "questionNo": 41,
      "available": false,
      "reason": "pdf_missing"
    }
  }
}
```

### Entry fields

| Field | Required | Meaning |
|-------|----------|---------|
| `pdf` | when available | Relative path to PDF |
| `page` | when known | 1-based page for `#page=` |
| `year` | when known | Exam year |
| `questionNo` | yes (09A) | 문항 번호 (Finder / Navigator) |
| `questionNumber` | legacy alias | Same as `questionNo` |
| `available` | yes | PDF open enable flag |
| `declaredSourceFile` | no | DB `source.sourceFile` (read-only mirror) |
| `reason` | when unavailable | `pdf_missing` \| `page_missing` \| `not_in_map` |

---

## Generation Rule (read-only from DB)

1. Read `question.source.page` / `sourceFile` / `year` from MVP DB (**no write**)
2. Derive `questionNo` from ID suffix `Q###` or DB field
3. Resolve first existing file among:
   - declared `sourceFile`
   - `source/past-exams/{year}/exam_2.pdf` (회계학 2교시)
   - `source/past-exams/{year}/exam_1.pdf`
   - `source/original-exams/{year}.pdf`
4. If PDF + page exist → `available: true`
5. Else → `available: false` · UI shows **원본 연결 준비중**

---

## Current Workspace Coverage

| Year | Linked | Note |
|------|-------:|------|
| 2015 | 0 | past/original PDF 부재 |
| 2017 | 0 | past/original PDF 부재 |
| 2018 | 40 | `exam_2.pdf` |
| 2020 | 40 | `exam_2.pdf` |
| 2024 | 40 | `exam_2.pdf` |
| 2025 | 40 | `exam_2.pdf` |

---

## Non-Goals

- Question DB mutation
- OCR / Parser repair
- Answer / Pattern / Knowledge SoT edits
- Auto page discovery beyond declared source metadata
