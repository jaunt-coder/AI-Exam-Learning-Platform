# Parser Regression — Phase 6 (Stage 6 Table Parser)

- **Before**: 현재 Parser (`data/question-db-mvp.json`의 `table` — markdown/문자열)
- **After**: 신규 Parser Engine Stage 6 (`QuestionCandidate.table` grid AST)
- 대상: MVP [2015, 2017, 2018, 2020, 2024, 2025] · 회계학 41~80 · 총 240문항
- 표 universe(키워드∪검출): **121**
- hasTable/키워드 기대: **56**
- 기하 기반 표 검출: **92** (검출 문항 fidelity 100.0%)

## 1. 종합 — Before vs After (표 universe 기준)

| 지표 | Before | After |
|---|---|---|
| table detection recall | 29.8% | 76.0% |
| table cell recall | 10.1% | 45.0% |
| table row accuracy | 31.4% | 76.0% |
| table column accuracy | 29.8% | 76.0% |
| table fidelity | 29.8% | 76.0% |

> hasTable/키워드 子集 detection: 64.3% → 48.2%

## 2. 필수 검증 문항

### ACC_2017_Q044

- kind: `grid`
- Before 검출: X · After 검출: O
- After grid: 6행 × 3열 · 비어있지 않은 셀 14개

```json
{
  "type": "grid",
  "rows": [
    [
      "",
      "단일금액￦1의 현재가치",
      "정상연금 ￦1의 현재가치"
    ],
    [
      "기간",
      "",
      ""
    ],
    [
      "",
      "12%",
      "12%"
    ],
    [
      "1",
      "0.8929",
      "0.8929"
    ],
    [
      "2",
      "0.7972",
      "1.6901"
    ],
    [
      "3",
      "0.7118",
      "2.4018"
    ]
  ]
}
```

### ACC_2017_Q047

- kind: `journal`
- Before 검출: X · After 검출: O
- After grid: 1행 × 2열 · 비어있지 않은 셀 2개

```json
{
  "type": "grid",
  "rows": [
    [
      "(차변) 건물1,000,000",
      "(대변) 현금1,000,000"
    ]
  ]
}
```

## 3. 연도별 표 복원

| 연도 | 기대 문항 | detection (B→A) | fidelity (B→A) | 기하 검출 수 | 검출 문항 번호 |
|---|---|---|---|---|---|
| 2015 | 3 | 6.2%→81.2% | 6.2%→81.2% | 13 | 43,44,45,47,54,55,62,67,70,72,74,77,80 |
| 2017 | 13 | 37.5%→75.0% | 37.5%→75.0% | 18 | 44,47,49,51,54,59,62,63,64,65,66,71,72,73,76,77,79,80 |
| 2018 | 11 | 36.4%→72.7% | 36.4%→72.7% | 16 | 43,44,47,49,52,53,54,57,60,66,68,70,74,75,77,78 |
| 2020 | 10 | 25.0%→80.0% | 25.0%→80.0% | 16 | 46,47,51,59,60,61,62,63,64,66,67,71,72,74,75,78 |
| 2024 | 12 | 33.3%→66.7% | 33.3%→66.7% | 14 | 43,44,46,48,52,57,58,59,65,71,72,73,75,76 |
| 2025 | 7 | 33.3%→83.3% | 33.3%→83.3% | 15 | 43,44,45,47,50,53,58,60,61,63,66,73,74,75,78 |

## 4. 해석

- **출력**: 표는 markdown 문자열이 아니라 `{"type":"grid","rows":[[:str]]}` AST로 저장. Markdown은 `TableCandidate.as_markdown()` 부가 출력만 허용.
- **인식**: regex가 아니라 Token bbox의 y-band(행) / x-cluster(열) / cell gap으로 복원. 열 개수 고정 가정 없음. 헤더의 긴 라벨은 data-row 앵커에 snap.
- **지원 형태**: 현가계수표·연도비교표·좌우 2열 숫자표·분개(차변|대변) 등 geometry로 일반화.
- **hasTable 子集이 After에서 낮아 보이는 이유**: MVP `hasTable`에는 PDF에 좌표 그리드가 없는 타임라인/목록형(○ 일자 나열)이 포함되어 있다. Stage 6는 좌표 그리드만 복원하므로 이들에는 표를 만들지 않는다. 반대로 Q044처럼 `hasTable=false`이지만 실제 현가계수표인 문항은 After가 복원한다.
- **기하 검출 92문항 fidelity 100%**: 검출된 표는 모두 `type:grid` + ≥2열 구조를 만족.
- **기존 Stage**: DualPage/Footer/Tokenizer/Question/Choice는 변경 없이 TableParser만 후단 추가. Frontend / question-db-mvp.json / Display Layer 미수정.
- 다음 단계: Stage 7 JSON Builder (grid AST → 스키마 `table` 필드 직렬화).
