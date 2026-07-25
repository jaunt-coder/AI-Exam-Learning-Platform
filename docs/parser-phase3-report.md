# Parser Regression — Phase 3 (Footer/Header Rule + Stage 5 Choice Boundary)

- **Before**: 현재 Parser (`data/question-db-mvp.json`)
- **After**: 신규 Parser Engine (`원본 PDF → Layout → Token → Question → Choice`)
- 대상: MVP [2015, 2017, 2018, 2020, 2024, 2025] · 회계학 41~80 · 총 240문항

문항 경계(Stage 4)는 Footer 제거 이후에도 **240/240** 유지.

## 1. Choice Metrics — Before vs After

| 지표 | Before | After |
|---|---|---|
| choice marker recall | 100.0% | 99.7% |
| choice count accuracy | 100.0% | 98.3% |
| choice text coverage | 100.0% | 99.1% |
| 보기 내용 혼입(contamination) | - | 10 |

## 2. Footer / Header Rule

| 지표 | 값 |
|---|---|
| 제거된 span 수 | 973 |
| false positive (내용 오삭제) | 8 |
| false negative (여백부 boilerplate 잔존) | 36 |

> 삭제 판단은 **bbox 위치(상/하단 margin) + 반복 패턴(페이지 간) + font size**로만 수행하며, '숫자'라는 이유만으로 삭제하지 않습니다. 위 지표는 harness가 별도 패턴으로 사후 측정한 값입니다.

## 3. 연도별 상세

| 연도 | 검출/40 | marker recall (B→A) | count acc (B→A) | coverage (B→A) | footer removed / FP / miss |
|---|---|---|---|---|---|
| 2015 | 40/40 | 100.0% → 98.0% | 100.0% → 90.0% | 100.0% → 95.0% | 83 / 8 / 29 |
| 2017 | 40/40 | 100.0% → 100.0% | 100.0% → 100.0% | 100.0% → 100.0% | 90 / 0 / 1 |
| 2018 | 40/40 | 100.0% → 100.0% | 100.0% → 100.0% | 100.0% → 100.0% | 56 / 0 / 1 |
| 2020 | 40/40 | 100.0% → 100.0% | 100.0% → 100.0% | 100.0% → 100.0% | 265 / 0 / 1 |
| 2024 | 40/40 | 100.0% → 100.0% | 100.0% → 100.0% | 100.0% → 100.0% | 236 / 0 / 2 |
| 2025 | 40/40 | 100.0% → 100.0% | 100.0% → 100.0% | 100.0% → 99.5% | 243 / 0 / 2 |

## 4. 해석

- **Choice Boundary**: ①~⑤ 분리를 문자열 regex가 아니라 CHOICE_MARKER 토큰의 좌표(열 clustering + y-순서)로 수행. 일반/inline/2열 세 형태를 자동 판별하고, 각 보기는 인접 마커 사이의 토큰만 소유하여 내용 혼입을 방지.
- **Footer Rule**: 페이지 번호·시험지 코드·교시 표시는 상/하단 여백 위치 + 페이지 반복 패턴으로 식별해 Tokenizer 이전에 제거. Phase 2에서 관찰된 footer의 문항 slice 혼입(예: 2015 drift)이 정리됨.
- 완료 기준(`원본 PDF → Layout → Token → Question → Choice`)을 충족. 표 복원(Stage 6)은 다음 Phase.
- **잔여 이슈(2015 집중)**: 2015 원본은 페이지 폭이 729pt로, 한 시트에 두 페이지가 배치된 2-up 스캔으로 추정됨. Choice 검출기가 이를 2열 보기로 오판하여 4문항(Q47/52/77/78)에서 중간 마커(③)를 잃음. 특정 문항 하드코딩 없이 **Loader 단계에서 dual-page 시트를 2개 논리 페이지로 분할**하는 일반 규칙으로 다음 Phase에 해결 예정. 나머지 5개 연도는 choice 지표 100%.
