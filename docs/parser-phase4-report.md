# Parser Regression — Phase 4-1 (Dual-Page / 2-up Split)

두 결과 모두 신규 Parser Engine이며, 차이는 **페이지 처리 단위**뿐입니다.

- **Before**: Physical Page 단위 (`build_parse(year, split=False)`)
- **After**: Logical Page 단위 (`build_parse(year, split=True)` — DualPageSplitter 적용)
- 대상: MVP [2015, 2017, 2018, 2020, 2024, 2025] · 회계학 41~80 · 총 240문항

## 1. 종합 — Before vs After

| 지표 | Before (Physical) | After (Logical) |
|---|---|---|
| question boundary accuracy | 240/240 | 240/240 |
| choice marker recall | 99.7% | 100.0% |
| choice count accuracy | 98.3% | 100.0% |
| 2015 오류 문항 수 (Q47/52/77/78) | 4 | 0 |

## 2. 2015 목표 문항 (특정 ID 하드코딩 없이 2-up 일반 규칙으로 해결)

| 문항 | Before (5보기) | After (5보기) |
|---|---|---|
| ACC_2015_Q047 | X | O |
| ACC_2015_Q052 | X | O |
| ACC_2015_Q077 | X | O |
| ACC_2015_Q078 | X | O |

## 3. 연도별 상세 (Before → After)

| 연도 | 페이지 | 검출/40 | marker recall | count acc | 비고 |
|---|---|---|---|---|---|
| 2015 | 15→30 | 40→40/40 | 98.0%→100.0% | 90.0%→100.0% | 2-up 분할 |
| 2017 | 30→30 | 40→40/40 | 100.0%→100.0% | 100.0%→100.0% | 변화 없음 |
| 2018 | 28→28 | 40→40/40 | 100.0%→100.0% | 100.0%→100.0% | 변화 없음 |
| 2020 | 29→29 | 40→40/40 | 100.0%→100.0% | 100.0%→100.0% | 변화 없음 |
| 2024 | 26→26 | 40→40/40 | 100.0%→100.0% | 100.0%→100.0% | 변화 없음 |
| 2025 | 27→27 | 40→40/40 | 100.0%→100.0% | 100.0%→100.0% | 변화 없음 |

## 4. 해석

- **원인**: 2015 원본은 폭 729pt 시트에 두 페이지가 나란히 인쇄된 2-up 스캔이다. 단일 페이지로 처리하면 Stage 4의 열(column) 앵커가 좌/우 페이지의 QUESTION_NUMBER x좌표(≈49, ≈362)로 잡혀, 좌측 페이지 중앙(x≈259)의 보기 마커 ③이 우측 앵커에 더 가깝다고 오판되어 다른 문항으로 귀속된다(③ 유실).
- **해결**: Loader 직후 `DualPageSplitter`가 **geometry만으로** 2-up 시트를 감지한다. 페이지별 중앙 gutter(빈 세로 띠)·좌우 content 밀도·양쪽 span 균형을 보고, 이 gutter가 문서의 다수 페이지에서 반복될 때만(document-level 판정) 2-up으로 확정한다. 확정 시 각 시트를 좌/우 논리 페이지로 분할하고 좌표계를 페이지 원점 기준으로 이동한다.
- **하드코딩 없음**: `year == 2015`, `page == N` 같은 분기는 없다. 판정은 폭·gutter·밀도·반복성(문서 단위 비율)만 사용한다. 그 결과 2015는 15시트 → 30 논리 페이지로 분할되고, 나머지 5개 연도는 소수 페이지에만 2열 gutter가 나타나 임계값 미만 → 분할되지 않는다.
- **원본 보존**: 분할된 span은 이동된 `bbox`와 함께 원본 좌표를 `source_bbox`에 유지하며, Page는 `physical_number`(원본 PDF 페이지)와 `logical_index`(0/1)를 보존한다.
- **기존 Stage 영향**: FooterRule·Tokenizer·QuestionBoundary·ChoiceBoundary는 페이지 목록을 그대로 소비하므로 코드 변경이 없다(논리 페이지가 곧 페이지). 2015 외 연도는 분할이 일어나지 않아 Phase 3 결과와 동일하게 유지된다.
- 다음 단계: Stage 6 Table Parser.
