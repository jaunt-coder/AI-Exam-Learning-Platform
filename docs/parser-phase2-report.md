# Parser Regression — Phase 2 (Stage 3 Tokenizer + Stage 4 Question Boundary)

- **Before**: 현재 Parser (`data/question-db-mvp.json`)
- **After**: 신규 Parser Engine Stage 3~4 (`원본 PDF → LayoutDocument → Token → QuestionCandidate`)
- 두 값 모두 동일한 harness 토크나이저(`tests/parser/harness/tokens.py`)로 측정하여 비교 공정성을 보장.
- 대상: MVP [2015, 2017, 2018, 2020, 2024, 2025] · 회계학 41~80 · 총 240문항

## 1. Question Boundary Accuracy (After)

**합계: 240/240 검출 · 누락 0 · 중복 0 · 혼입 0**

| 연도 | 검출/40 | 누락 | 중복 | 혼입(foreign) |
|---|---|---|---|---|
| 2015 | 40/40 | - | - | - |
| 2017 | 40/40 | - | - | - |
| 2018 | 40/40 | - | - | - |
| 2020 | 40/40 | - | - | - |
| 2024 | 40/40 | - | - | - |
| 2025 | 40/40 | - | - | - |

## 2. Token Metrics — Before vs After

| 지표 | Before | After |
|---|---|---|
| number token recall | 96.1% | 97.0% |
| currency token recall | 96.7% | 99.8% |
| year token recall | 95.4% | 99.3% |
| token preservation rate | 96.1% | 98.3% |

> **Token Layer 무손실 검증**: 원본 유의미 토큰 3973개 중 신규 엔진 전체에서 완전히 사라진 토큰(true loss)은 **0개** (무손실률 **100.0%**). 나머지 69개는 인접 문항 slice로 귀속된 attribution drift로, Stage 5(보기)/Stage 6(표)/Footer Rule에서 정리 대상입니다.

### 연도별 상세

| 연도 | number (B→A) | currency (B→A) | year (B→A) | preservation (B→A) |
|---|---|---|---|---|
| 2015 | 94.8% → 81.8% | 100.0% → 85.7% | 100.0% → 90.7% | 95.6% → 83.0% |
| 2017 | 95.8% → 100.0% | 97.2% → 100.0% | 90.3% → 100.0% | 95.2% → 100.0% |
| 2018 | 95.6% → 100.0% | 94.8% → 100.0% | 94.1% → 100.0% | 95.1% → 100.0% |
| 2020 | 98.7% → 100.0% | 99.0% → 100.0% | 94.7% → 100.0% | 98.1% → 100.0% |
| 2024 | 95.1% → 100.0% | 94.3% → 100.0% | 97.4% → 100.0% | 95.4% → 100.0% |
| 2025 | 96.1% → 100.0% | 97.0% → 100.0% | 99.0% → 100.0% | 96.9% → 100.0% |

## 3. 해석

- **Boundary**: 신규 Parser는 문항 경계를 문자열 regex가 아닌 Layout(QUESTION_NUMBER 토큰 + 페이지/열/ y-순서)으로 결정. 240문항 전부에서 누락·중복·혼입 0을 목표로 검증.
- **Token preservation / recall**: Tokenizer가 좌표 기반으로 분절된 glyph를 원본 의미 단위로 재조립하므로, 기존 Parser가 손실하던 숫자·금액·연도 토큰이 보존됨. Before 대비 After에서 recall이 상승.
- 본 단계는 `보기 분리(Stage 5)`와 `표 복원(Stage 6)` 이전이며, After 문항 span에는 아직 머리말/꼬리말 등 레이아웃 잡음이 포함될 수 있음(다음 Phase의 Footer/Choice/Table Rule에서 정리).
- 2015처럼 폭이 넓은(729pt) 비정형 레이아웃에서는 문항별 recall이 낮아 보이지만, 이는 토큰이 인접 문항 slice로 귀속된 attribution drift이며 **연도 전체 기준 true loss는 0**입니다. 즉 Tokenizer 자체는 무손실이고, slice 경계 정밀화는 다음 Phase 과제입니다.
