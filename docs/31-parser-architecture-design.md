# Parser Architecture Design Document

Version 1.0 — Parser Framework 재설계 (Compiler-style Multi-stage Pipeline)

> 본 문서는 기존 Parser를 Patch 하는 문서가 아니다.
> **유지보수 가능한 Parser Engine 을 처음부터 설계**하기 위한 아키텍처 명세다.
> 코드 작성 전 단계로, 승인 후 Phase 순서에 따라 구현한다.

---

## 0. 절대 원칙 (재확인)

| # | 원칙 | 설계 반영 |
|---|------|-----------|
| 1 | Source of Truth = `source/original-exams/` 원본. AI 추론으로 숫자/표/보기/문장 생성 금지 | Stage 3에서 숫자·단위·날짜를 **불변 Token** 으로 봉인, Stage 8이 원본 대비 recall 검증 |
| 2 | Frontend 수정 금지 (AI Tutor / Recommendation / Analytics / Wrong Note / Question·Pattern·Exam Engine / Storage) | 엔진은 `scripts/` 내부에서만 동작. JSON 산출물 경로·Key 동일 |
| 3 | JSON Schema 변경 금지 (`question-db-mvp.json` 구조·Key 유지) | Stage 9 Builder가 기존 record 구조를 1:1 재현 |
| 4 | 문항별 하드코딩 금지 (`if(questionId=="...")` 금지) | Rule Engine의 모든 Rule은 **Token/Layout 패턴 기반 일반 규칙**. 문항 ID 참조 불가 |
| 5 | Display Layer에서 데이터 수정 금지 | Parser 단계에서 올바른 JSON 생성 → `question-cleanup-overrides.js` 폐기, `data-cleaner.js` 최소화 |

---

## 1. 현재 Parser 구조 분석

### 1.1 현재 파이프라인 (실제 구조)

```
source/original-exams/{year}.hwp|pdf
        │
        ▼
scripts/exam_pipeline/source_loader.py     ← Loader + Extractor + OCR 판별을 한 파일에 혼재
        │  (fitz page.get_text() = 평문, 좌표 폐기)
        ▼
scripts/exam_pipeline/text_postprocess.py  ← 760줄 정규식 monolith
        │  rejoin_exam_line_fragments / normalize_rejoined_structure /
        │  collapse_soft_breaks / fix_glued_hangul_spacing ...
        ▼
scripts/exam_pipeline/question_parser.py   ← 900줄. 경계·보기·표·stem·검증·타입판정 전부 혼재
        │  (choice extractor 8종 + richness score 휴리스틱)
        ▼
scripts/build-question-db-v3.py            ← record 조립 + 통계 + 리포트
        ▼
data/question-db-mvp.json
        │
        ▼
js/data-cleaner.js + js/question-cleanup-overrides.js  ← Display에서 재-정규식 + 문항별 override
```

### 1.2 모듈별 책임과 문제점

| 파일 | 현재 하는 일 | 구조적 문제 |
|------|--------------|-------------|
| `source_loader.py` | PDF/HWP 로드, OCR fallback, 페이지 분리 | Loader·Extractor·OCR가 한 함수에 결합. **좌표·폰트·컬럼 정보를 버림** (`page.get_text()`) |
| `text_postprocess.py` | 줄 재결합, 구조 정규화, 한글 띄어쓰기, footer 제거 | 정규식 60+개. `포괄손`, `발행주식수는 주 이다`, `유통보통주` 등 **특정 문항 전용 정규식이 다수 은닉** → 원칙 4 위반. 숫자/날짜를 직접 치환 → 파괴 위험 |
| `question_parser.py` | 문항 마커·본문 분할·표 검출·보기 추출·stem 추출·truncation 분류·타입 분류·record 필드화 | Stage 4~9가 전부 한 파일. `extract_choices`가 8개 추출기 + score로 경쟁 → 결정 불가능·디버깅 불가. 표 검출과 보기 추출이 상호 호출 |
| `source_truth.py` / `repair_quality.py` | 원본 대비 fidelity·누락 숫자·중복 검사 | 검증이 **사후(repair queue)** 로만 존재. 파이프라인 내부 Gate가 아님 → 실패해도 그대로 산출 |
| `answer_loader.py` | 정답 로드(JSON/HWP/PDF/OCR) | 파서와 직교(orthogonal). 재사용 가능 |
| `pattern_classifier.py` | 키워드 기반 패턴 분류 | 직교. 재사용 가능 |
| `year_discovery.py` | 연도·원본 파일 탐색 | 직교. 재사용 가능 |
| `js/data-cleaner.js` | 화면 표시용 footer 제거·띄어쓰기·숫자 포맷 | Parser가 못 고친 것을 Display가 재수리 → 원칙 5 위반 |
| `js/question-cleanup-overrides.js` | 특정 문항(`ACC_2017_Q044` 등) 텍스트 수동 교체 | **문항 하드코딩** → 원칙 4·5 정면 위반 |

### 1.3 근본 원인 (Root Cause)

> 증상(문항 잘림·중복·보기 합쳐짐·표 깨짐·숫자/단위/날짜 소실)은 개별 버그가 아니라 **두 개의 구조 결함**에서 파생된다.

1. **레이아웃 소실**: PDF를 평문으로 추출하는 순간 2단(2-column) 배치·표 셀 좌표가 사라진다. 그 뒤 어떤 정규식으로도 "왼쪽 열 보기"와 "오른쪽 열 보기", "표 셀"과 "본문"을 안정적으로 복원할 수 없다. → 보기 합쳐짐 / 표 깨짐 / 문항 섞임의 원인.
2. **불변 단위(Token) 부재**: 숫자·단위·날짜를 문자열 상태로 두고 정규식으로 계속 변형 → 소실·깨짐. → 숫자·단위·날짜 손상의 원인.

따라서 정규식 추가는 국소 증상만 억제하고 다른 곳을 깨뜨린다(회귀). **레이아웃을 초기에 보존하고, 의미 단위를 Token으로 봉인**하는 구조로 바꿔야 한다.

---

## 2. 새 Parser Architecture 설계

### 2.1 설계 철학 (Compiler 관점)

| 컴파일러 개념 | 본 Parser 대응 |
|---------------|----------------|
| Source File | 원본 PDF/HWP |
| Lexer / Token Stream | Stage 3 Tokenizer (typed, 불변) |
| Parser / AST | Stage 4~6 (Question / Choice / Table 구조 트리) |
| Semantic Analysis | Stage 7 Normalizer (의미 보존, 형태만 정리) |
| Type Checker / Diagnostics | Stage 8 Validator (Gate) |
| Code Generation | Stage 9 Builder (JSON emit) |
| Optimizer Passes | Rule Engine (독립 추가/제거 가능한 Rule) |

핵심 불변식(invariant):
- **단조성(monotonic)**: 각 Stage는 입력 구조를 소비하고 더 풍부한 구조를 생성하며, 앞 Stage의 정보를 **파괴하지 않는다**.
- **불변 Token**: NUMBER / CURRENCY / PERCENT / YEAR / DATE Token은 Stage 3 이후 내용 변경 불가(위치 이동만 허용).
- **결정성(deterministic)**: 동일 입력 → 동일 출력. 확률·AI 추론 없음.
- **추적성(traceable)**: 모든 Token/구조는 원본 offset·bbox·page를 보유 → 실패 지점 역추적 가능.

### 2.2 9-Stage Pipeline

```
Stage 1  DocumentLoader      RawDocument   (경로, kind, needs_ocr)
   │
Stage 2  TextExtractor       LayoutDocument(Page[] → Block[] → Line[] → Span{text,bbox,font,page})
   │                          ※ PDF는 fitz "dict"로 좌표 보존, OCR은 word-box, HWP는 표/그림 마커 보존
Stage 3  Tokenizer           TokenStream   (typed Token[], offset·bbox 유지, 원문 불변)
   │
Stage 4  QuestionBoundary    QuestionSegment[]  (41~80, 앞뒤 문항 절대 불혼입)
   │
Stage 5  ChoiceBoundary      Segment.choices[]  (inline/2열/줄바꿈 전부 지원, x좌표로 열 분리)
   │
Stage 6  TableDetector       Segment.table (Markdown)  (bbox 정렬로 셀 복원, 줄글화 금지)
   │
Stage 7  SemanticNormalizer  구조 유지, 형태만 정리 (공백/줄바꿈/footer 제거만)
   │
Stage 8  Validator           ValidationReport[]  (보기5·숫자·단위·stem중복·context중복·fidelity)
   │
Stage 9  QuestionBuilder     ParsedQuestion → JSON record (기존 schema 동일)
   │
   ▼
data/question-db-mvp.json
```

### 2.3 Stage 간 계약 (Interface)

모든 Stage는 동일한 시그니처를 따른다. Stage는 `ParseContext`(공유 상태)를 받아 갱신 후 반환한다.

```python
class Stage(Protocol):
    name: str
    def run(self, ctx: ParseContext) -> ParseContext: ...
```

`ParseContext`는 누적 상태를 담는다 (개념):

```
ParseContext
├─ raw: RawDocument | None            # Stage 1
├─ layout: LayoutDocument | None      # Stage 2
├─ tokens: TokenStream | None         # Stage 3
├─ segments: list[QuestionSegment]    # Stage 4~7 (점진적 강화)
├─ reports: list[ValidationReport]    # Stage 8
├─ questions: list[ParsedQuestion]    # Stage 9
├─ diagnostics: list[Diagnostic]      # 전 Stage 공통 (경고/실패 누적)
└─ config: ParserConfig               # 연도, ACC 범위, 과목 마커 등
```

Pipeline은 Stage 목록을 순서대로 실행하는 얇은 오케스트레이터다:

```python
class Pipeline:
    def __init__(self, stages: list[Stage]): ...
    def run(self, ctx: ParseContext) -> ParseContext:
        for stage in self.stages:
            ctx = stage.run(ctx)          # 각 Stage는 독립·교체 가능
        return ctx
```

---

## 3. 각 Stage 책임 정의

### Stage 1 — DocumentLoader
- **입력**: `year` (또는 파일 경로)
- **출력**: `RawDocument{ path, kind: "pdf"|"hwp", needs_ocr: bool, page_count }`
- **책임**:
  - PDF/HWP 통합 인터페이스 (`year_discovery` 재사용).
  - OCR 필요 여부 자동 판별: PDF 텍스트 레이어 존재(`fitz` 텍스트 길이) → text, 없으면 `needs_ocr=True`. HWP 배포용(distributable) 판별.
- **금지**: 텍스트 내용 가공.

### Stage 2 — TextExtractor
- **입력**: `RawDocument`
- **출력**: `LayoutDocument{ pages: [Page{ number, width, height, spans: [Span{text, bbox(x0,y0,x1,y1), font_size, is_bold}] }] }`
- **책임 (근본 개선의 핵심)**:
  - PDF: `page.get_text("dict")`로 **span 단위 좌표·폰트 보존**. (현재의 평문 추출 폐기)
  - OCR: EasyOCR `detail=1`로 word/line box 좌표 확보 → 동일 `Span` 구조로 정규화 (`source_loader`의 OCR 로직 재사용, 반환 형태만 변경).
  - HWP: 본문 텍스트 + `<표>`/`<그림>` 마커 보존. 좌표 없으면 line 단위 pseudo-bbox 부여.
  - 페이지 번호·페이지 경계 유지.
- **금지**: 병합/정규식 수정. "가능하면 좌표 유지" 요구를 여기서 충족.
- **백엔드 분리**: `extractors/pdf_layout.py`, `extractors/ocr_backend.py`, `extractors/hwp_text.py` — Stage 2는 backend를 선택만 한다.

### Stage 3 — Tokenizer
- **입력**: `LayoutDocument`
- **출력**: `TokenStream` = `Token{ type, text, page, bbox, line_id, offset }[]`
- **책임 (문장 수정 금지, 분리만)**:
  - Span을 순회하며 **타입 분류만** 수행. 텍스트를 변형하지 않는다.
  - Token type 사전(우선순위 순):
    - `QUESTION_NUMBER` — 행 시작·좌여백의 `\d{1,2}.`
    - `CHOICE_MARKER` — `① ② ③ ④ ⑤`
    - `YEAR` — `20[×xX]\d{1,2}(년)?`
    - `DATE` — `YEAR 월 일`
    - `NUMBER` — `\d{1,3}(,\d{3})+(.\d+)?` / `\d+.\d+` / `\d{3,}`
    - `CURRENCY` — `₩ W ￦ 원 천원 백만원 억원`
    - `PERCENT` — `\d+(.\d+)?%`
    - `HANGUL` / `LATIN` / `PUNCT` / `NEWLINE` / `WHITESPACE`
    - `FOOTER_CANDIDATE` — `A-\d{2}-\d{1,2}`, `한국산업`, `page(n)`, `제N회` 등
  - **불변 봉인**: `YEAR/DATE/NUMBER/CURRENCY/PERCENT`는 이후 Stage에서 내용 변경 불가로 마킹(`immutable=True`). → "숫자/단위/날짜 소실" 원천 차단.
- **금지**: 오탈자 교정·문자 치환·병합. (예: `20X2`→`20×2` 같은 정규화는 Stage 7에서 Token 단위로만).

### Stage 4 — QuestionBoundaryDetector
- **입력**: `TokenStream`
- **출력**: `QuestionSegment{ number, tokens[], page, bbox_range }[]`
- **책임 (앞뒤 문항 절대 불혼입)**:
  - `QUESTION_NUMBER` Token 중 **행 시작 + 좌여백 x좌표 + 41~80 범위 + 단조 증가**를 만족하는 것만 실제 문항 경계로 채택.
  - 본문 내 인용 숫자(`41.` 형태 오탐)를 좌표·문맥으로 배제.
  - 2단 편집 시 열(column) 순서를 y→열 정렬로 재구성해 번호 순서 보장.
  - 누락 번호는 위치 보간(현 `fill_missing_markers` 로직 이관)하되 **경계 겹침 금지 불변식** 검사.
- **불변식**: `segments`는 번호 오름차순, 서로 offset 구간이 겹치지 않는다.

### Stage 5 — ChoiceBoundaryDetector
- **입력**: `QuestionSegment`
- **출력**: `Segment.choices: Choice{ marker, tokens[], bbox }[]`
- **책임 (모든 형태 지원)**:
  - `CHOICE_MARKER` 기준으로 1차 분리.
  - **형태 자동 판정 (Rule로 구현)**:
    - inline: 한 줄에 ①~⑤ 연속.
    - single-column: 줄바꿈으로 1개씩.
    - 2-column: bbox x좌표로 좌/우 열 군집화 → 열 우선 순서로 ①②③④⑤ 복원 (현재 "보기 합쳐짐"의 정면 해결).
    - multi-line: 한 보기가 여러 줄(금액·연도 그리드)일 때 다음 marker 전까지 묶음.
  - 각 보기의 원본 Token 순서 보존, 숫자/통화 Token 유지.
- **불변식**: 정상 문항은 정확히 5개. 5개가 아니면 `diagnostics`에 사유 기록(축약·병합 금지).

### Stage 6 — TableDetector
- **입력**: `QuestionSegment` (+ layout bbox)
- **출력**: `Segment.table: str (Markdown)`, `Segment.has_table`
- **책임 (표 → Markdown 보존, 줄글화 금지)**:
  - bbox 기반 표 인식: 같은 x-범위를 공유하는 Span = 열, 같은 y-범위 = 행 → 셀 그리드 재구성.
  - HWP `[TABLE]` 마커·좌표 없는 경우: 열 정렬(다중 공백/탭)로 fallback (현 `_split_table_cells` 이관).
  - Markdown 표로 직렬화. 표 영역은 stem에서 제거하되 원본 Token은 `table` 필드로 이동(소실 아님).
- **금지**: 표를 문장으로 평탄화. 셀 숫자 소실.

### Stage 7 — SemanticNormalizer
- **입력**: 구조가 완성된 `QuestionSegment[]`
- **출력**: 동일 구조, 형태만 정리
- **허용**: 연속 공백 축소, 과다 줄바꿈 축소, footer Token 제거, 심볼 표준화(`￦→₩`, `20X2→20×2`)를 **Token 단위**로만.
- **금지 (엄격)**: 숫자 수정, 단위 수정, 문장 생성/삭제, 의미 변경. immutable Token 내용 변경 불가.
- **원칙**: "허용 목록(whitelist)"에 없는 변형은 수행하지 않는다. 현 `text_postprocess.py`의 문항 전용 정규식은 **전량 폐기**(이관 대상 아님).

### Stage 8 — Validator (Gate)
- **입력**: `QuestionSegment[]` + 원본 `TokenStream`
- **출력**: `ValidationReport{ question_number, passed, issues[], fidelity, coverage }[]`
- **검사 항목** (현 `source_truth`/`repair_quality` 로직을 **파이프라인 내부 Gate로 승격**):
  - 보기 5개 여부
  - 숫자 recall: 원본 NUMBER Token ⊆ 산출 (누락 0 목표)
  - 단위 recall: CURRENCY/PERCENT/YEAR 누락 0 목표
  - stem 중복 / context 중복 (`has_duplicate_context` 이관)
  - Source Fidelity ≥ 임계값 (숫자·단위·stem·choice 가중 recall)
- **동작**: 실패해도 데이터를 **수정하지 않는다**. 실패는 `diagnostics`/repair queue로 보고 → 원인 Rule을 수정해 재빌드. (검증과 수리의 분리)

### Stage 9 — QuestionBuilder
- **입력**: 검증 통과 `QuestionSegment` + answer + pattern
- **출력**: 기존 스키마 record (Key 완전 동일):
  - `questionId, year, subjectId, chapterId, patternId, difficulty, originalQuestion, question, choices, answer, answerIndex, questionType, hasTable, hasCalculation, figure, table, formula, source{...}, solution{...}`
- **책임**: `answer_loader`·`pattern_classifier` 결과 결합, record 조립. `build-question-db-v3.py`의 `build_question_record`를 이관.
- **금지**: 스키마 Key 추가/변경/삭제.

---

## 4. Rule Engine 구조

정규식 덩어리 대신, Stage 4~7의 판단 로직을 **독립 Rule**로 분해한다.

### 4.1 Rule 계약

```python
class Rule(Protocol):
    name: str                 # 고유 이름
    stage: str                # "question" | "choice" | "table" | "normalize"
    priority: int             # 낮을수록 먼저
    def applies(self, ctx: RuleContext) -> bool: ...   # 적용 조건 (Token/Layout 패턴)
    def apply(self, ctx: RuleContext) -> None: ...     # 구조 변경 (부수효과)
```

- **독립성**: Rule은 서로를 호출하지 않는다. 공유 `RuleContext`(현재 segment의 tokens/bbox/emerging structure)만 읽고 쓴다.
- **등록/해제**: `RuleRegistry.register(rule)` / `unregister(name)`. Stage는 자신에 속한 Rule을 priority 순으로 실행.
- **문항 하드코딩 금지 (강제)**: Rule은 `question_number`/`questionId`로 분기 불가. 오직 **Token 타입·순서·bbox·문자 패턴**에만 의존. (린트로 `questionId ==` 사용을 차단)

### 4.2 초기 Rule 목록

| Rule | Stage | 역할 |
|------|-------|------|
| `QuestionNumberRule` | question | 좌여백·행시작·범위·단조 조건으로 경계 확정 |
| `QuestionBleedGuardRule` | question | 인용 숫자 오탐 배제, 구간 겹침 방지 |
| `ChoiceInlineRule` | choice | 한 줄 ①~⑤ 분리 |
| `ChoiceSingleColumnRule` | choice | 줄바꿈 1개씩 |
| `ChoiceTwoColumnRule` | choice | bbox x좌표로 2열 복원 |
| `ChoiceMultilineRule` | choice | 금액/연도 그리드 다중행 묶음 |
| `TableGridRule` | table | bbox 셀 그리드 → Markdown |
| `TableFallbackRule` | table | 좌표 없을 때 공백/탭 정렬 |
| `YearHeaderRule` | normalize | 보기 위 연도 헤더 행 정리(Token 단위) |
| `FooterRule` | normalize | footer Token 제거 |
| `SpacingRule` | normalize | 공백/줄바꿈 정리 (immutable Token 보호) |
| `CurrencyJoinRule` | normalize | 분리된 통화기호+숫자 Token 인접 결합 (내용 불변, 위치만) |

> 신규 시험지 특성이 나오면 **새 Rule 파일을 추가**하면 되고, 기존 Rule/Stage는 건드리지 않는다. 이것이 "정규식 덧붙이기"와의 본질적 차이다.

---

## 5. 폴더 구조 제안

기존 `scripts/exam_pipeline/`은 **이관 완료 전까지 보존**(fallback). 신규 엔진은 병행 디렉토리로 만든다.

```
scripts/parser/
├─ __init__.py
├─ pipeline.py              # Pipeline 오케스트레이터
├─ context.py               # ParseContext, RuleContext, Diagnostic
├─ model.py                 # RawDocument, LayoutDocument, Page, Span,
│                           #   Token, TokenType, QuestionSegment, Choice,
│                           #   Table, ParsedQuestion, ValidationReport
├─ config.py                # ParserConfig (ACC 범위, 연도, 과목 마커, 임계값)
├─ tokens.py                # TokenType enum + token spec (typed 패턴 정의)
├─ stages/
│  ├─ __init__.py
│  ├─ s1_loader.py          # DocumentLoader
│  ├─ s2_extractor.py       # TextExtractor (backend 선택)
│  ├─ s3_tokenizer.py       # Tokenizer
│  ├─ s4_question_boundary.py
│  ├─ s5_choice_boundary.py
│  ├─ s6_table_detector.py
│  ├─ s7_normalizer.py
│  ├─ s8_validator.py
│  └─ s9_builder.py
├─ extractors/              # Stage 2 backends
│  ├─ __init__.py
│  ├─ pdf_layout.py         # fitz "dict" → Span (좌표 보존)
│  ├─ ocr_backend.py        # EasyOCR word-box → Span
│  └─ hwp_text.py           # HWP 본문 + 표/그림 마커
├─ rules/
│  ├─ __init__.py
│  ├─ base.py               # Rule ABC + RuleRegistry
│  ├─ question_rules.py
│  ├─ choice_rules.py
│  ├─ table_rules.py
│  ├─ number_rules.py
│  ├─ footer_rules.py
│  └─ spacing_rules.py
├─ validators/
│  ├─ __init__.py
│  └─ checks.py             # 개별 검증 함수 (fidelity, recall, duplicate)
├─ services/               # 파서와 직교하는 재사용 서비스 (기존 코드 이동/참조)
│  ├─ answer_loader.py      # 기존 재사용
│  ├─ pattern_classifier.py # 기존 재사용
│  └─ year_discovery.py     # 기존 재사용
└─ cli.py                   # build 엔트리포인트 → data/question-db-mvp.json

tests/parser/
├─ fixtures/                # 연도·문항별 golden 입력/기대 출력
├─ test_s3_tokenizer.py
├─ test_s4_boundary.py
├─ test_s5_choices.py
├─ test_s6_table.py
├─ test_s8_validator.py
└─ test_pipeline_regression.py   # old vs new fidelity 비교
```

- 산출물 경로는 **동일**: `data/question-db-mvp.json`, `pattern-db-mvp.json`, `statistics-mvp.json`.
- `build-question-db-v3.py`는 최종 단계에서 `scripts/parser/cli.py`를 호출하도록 교체.

---

## 6. Migration(이관) 설계

### 6.1 이관 원칙
- **병행(parallel-run)**: `exam_pipeline`을 지우지 않고, 새 엔진과 동시에 돌려 산출물을 비교한다.
- **회귀 게이트**: 기존 `data/repair/question-db-mvp.pre-parser-upgrade.json`을 baseline으로, `repair_quality.py`의 메트릭(stem_truncated / missing_numbers / missing_units / choice_split / duplicate_context / table_parse / source_fidelity)을 old vs new로 비교. **새 엔진이 모든 지표에서 열세가 아니어야** 스위치.
- **원칙 준수 확인**: 이관 중 문항 하드코딩(`questionId ==`) 도입 여부를 린트로 차단.

### 6.2 구코드 → 신구조 매핑

| 기존 | 이관 대상 | 처리 |
|------|-----------|------|
| `source_loader.load_exam_document` | `stages/s1_loader` + `stages/s2_extractor` + `extractors/*` | **분해 이관**. 평문 추출 → 좌표 보존 추출로 교체 |
| `text_postprocess`: `remove_footer_noise`, `collapse_soft_breaks`(비파괴 부분), 심볼 표준화 | `stages/s7_normalizer` + `rules/footer_rules` + `rules/spacing_rules` | **선별 이관** (안전 규칙만) |
| `text_postprocess`: `rejoin_exam_line_fragments`, `normalize_rejoined_structure`, 문항 전용 정규식 | — | **폐기**. Stage 2 좌표 + Stage 3 Token으로 대체 |
| `question_parser`: `collect_question_markers`, `split_question_bodies`, `fill_missing_markers`, `find_accounting_start` | `stages/s4_question_boundary` + `rules/question_rules` | 이관 (Token/좌표 기반으로 재작성) |
| `question_parser`: choice 추출기 8종 + `_choice_richness_score` | `stages/s5_choice_boundary` + `rules/choice_rules` | **통합 재작성** (좌표 기반 열 분리로 단일화) |
| `question_parser`: `detect_table_block`, `_split_table_cells`, `_rows_to_markdown` | `stages/s6_table_detector` + `rules/table_rules` | 이관 (bbox 우선, 공백정렬 fallback) |
| `question_parser`: `classify_truncation_cause`, `classify_question_type` | `stages/s8_validator`, `stages/s9_builder` | 분리 이관 |
| `source_truth.py` / `repair_quality.py` 검사 로직 | `stages/s8_validator` + `validators/checks.py` | **Gate로 승격** (사후→내부) |
| `build-question-db-v3.build_question_record` | `stages/s9_builder` | 이관 (스키마 동일) |
| `answer_loader`, `pattern_classifier`, `year_discovery` | `services/*` | **그대로 재사용** |
| `js/question-cleanup-overrides.js` | — | **폐기** (문항 하드코딩) |
| `js/data-cleaner.js` | 최소화 | JSON이 정확해지므로 표시 포맷만 남기거나 no-op화 (Frontend 계약 유지 위해 export는 유지, 내부는 passthrough) |

### 6.3 Phase 계획 (한 번에 한 Phase, 완료 후 보고 → 승인)

| Phase | 내용 | 완료 기준 |
|-------|------|-----------|
| **P0** | 회귀 하니스 구축 (baseline 스냅샷 + old 메트릭 산출) | old 메트릭 표 확보 |
| **P1** | `scripts/parser/` 골격 + `model`/`context`/`pipeline` + Stage 1·2(좌표 추출) | LayoutDocument 좌표 덤프 검증 |
| **P2** | Stage 3 Tokenizer + Stage 4 Boundary + `rules/question_rules` | 연도별 40문항 경계 100%, 구간 무겹침 |
| **P3** | Stage 5 Choice + Stage 6 Table (좌표 기반) | 2단/표 문항 golden 통과, choice_split·table_parse 개선 |
| **P4** | Stage 7 Normalizer(안전 규칙만) + Stage 8 Validator + Stage 9 Builder | 스키마 동일 산출, Gate 동작 |
| **P5** | 병행 실행 + 회귀 비교 + Rule 보강 | 모든 메트릭 old 대비 ≥, fidelity 게이트 통과 |
| **P6** | `build-question-db-v3` 스위치, `overrides.js` 폐기·`data-cleaner.js` 최소화, `exam_pipeline` deprecate | 최종 산출 검증, Frontend 무수정 확인 |

### 6.4 롤백 전략
- 산출 경로 동일 + git 스냅샷 → 문제 시 `build-question-db-v3.py`가 `exam_pipeline`을 호출하도록 1줄 되돌리기.
- `exam_pipeline`은 P6 이후 최소 1 릴리스 유지 후 제거.

---

## 7. 품질 게이트 (수용 기준)

| Gate | Target |
|------|--------|
| 연도별 문항 수 | 40/40 (경계 무혼입) |
| 보기 5지 | 100% |
| missing_numbers | 0 |
| missing_units | 0 |
| duplicate_context | 0 |
| choice_split | 0 |
| stem_truncated | 0 |
| table_parse 손상 | 0 |
| Source Fidelity ≥ 99% | 240/240 |
| 문항 하드코딩 | 0건 (린트) |
| Frontend 파일 변경 | 0건 |
| JSON Schema Key 변경 | 0건 |

---

## 8. 테스트 전략

- **Stage 단위 golden test**: 각 Stage 입력→출력을 fixture로 고정. Stage 교체 시 회귀 즉시 검출.
- **Property test**: 불변식 검증 (경계 무겹침, immutable Token 불변, 숫자 recall 단조성).
- **Regression test**: old vs new 메트릭 비교 (`tests/parser/test_pipeline_regression.py`).
- **원칙 린트**: `questionId ==`, `question_number ==` 등 하드코딩 패턴 CI 차단.

---

## 9. 다음 단계

본 문서 승인 시 **Phase 0 → Phase 1** 순으로 코드 작성을 시작한다.
Phase마다 (구현 내용 / 생성·수정 파일 / 테스트 결과 / 리뷰 PASS·FAIL / 다음 Phase 진행 여부)를 보고한다.

> 승인 요청: (1) 본 아키텍처, (2) `scripts/parser/` 폴더 구조, (3) 좌표 보존 추출(fitz "dict") 채택, (4) Migration Phase 순서.
