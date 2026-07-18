# MVP Quality Report

- 생성일: 2026-07-19
- 대상: `data/question-db-mvp.json` (240문항, read-only 분석)
- 범위: Question · Choice · Answer · Pattern · AI Tutor 샘플

## Executive Summary

| 항목 | 결과 |
|------|------|
| 총 문항 | 240 |
| Pattern | 18 |
| Critical | 0 |
| Warning | 698 |
| Info | 210 |
| QA 등급 | **C** |

### 핵심 소견

- Critical 이슈 없음 — 구조적으로 240문항 서비스 가능.
- PDF 추출 특성상 **띄어쓰기 누락·페이지 잡음·표 Markdown 손상**이 다수 Warning으로 집계됩니다.
- AI Tutor는 DB `solution`이 비어 있어도 Pattern Profile/Fallback으로 **과외 콘텐츠 생성**됩니다.

## 1. Question 품질

| 검사 | Critical | Warning | Info |
|------|----------|---------|------|
| question_short | 0 | 41 | 0 |
| ocr_glued_hangul | 0 | 369 | 0 |
| ocr_footer | 0 | 206 | 0 |
| ocr_fragment | 0 | 0 | 70 |
| ocr_currency | 0 | 0 | 137 |

### Question Warning 샘플

- 건수: **616**

- `ACC_2015_Q041` (warning): question 연속 한글 12자+ (띄어쓰기 누락 의심)
- `ACC_2015_Q041` (warning): originalQuestion footer/noise `A-\d{2}-\d`
- `ACC_2015_Q041` (warning): originalQuestion footer/noise `교시\s*-\[`
- `ACC_2015_Q041` (warning): originalQuestion 연속 한글 12자+ (띄어쓰기 누락 의심)
- `ACC_2015_Q041` (warning): choices[5] footer/noise `A-\d{2}-\d`
- `ACC_2015_Q041` (warning): choices[5] footer/noise `교시\s*-\[`
- `ACC_2015_Q042` (warning): question 연속 한글 12자+ (띄어쓰기 누락 의심)
- `ACC_2015_Q042` (warning): originalQuestion 연속 한글 12자+ (띄어쓰기 누락 의심)
- `ACC_2015_Q043` (warning): originalQuestion 연속 한글 12자+ (띄어쓰기 누락 의심)
- `ACC_2015_Q044` (warning): question 연속 한글 12자+ (띄어쓰기 누락 의심)
- `ACC_2015_Q044` (warning): originalQuestion 연속 한글 12자+ (띄어쓰기 누락 의심)
- `ACC_2015_Q045` (warning): question 연속 한글 12자+ (띄어쓰기 누락 의심)
- `ACC_2015_Q045` (warning): originalQuestion 연속 한글 12자+ (띄어쓰기 누락 의심)
- `ACC_2015_Q046` (warning): question 연속 한글 12자+ (띄어쓰기 누락 의심)
- `ACC_2015_Q046` (warning): originalQuestion footer/noise `A-\d{2}-\d`
- `ACC_2015_Q046` (warning): originalQuestion footer/noise `교시\s*-\[`
- `ACC_2015_Q046` (warning): originalQuestion 연속 한글 12자+ (띄어쓰기 누락 의심)
- `ACC_2015_Q046` (warning): choices[5] footer/noise `A-\d{2}-\d`
- `ACC_2015_Q046` (warning): choices[5] footer/noise `교시\s*-\[`
- `ACC_2015_Q047` (warning): question 연속 한글 12자+ (띄어쓰기 누락 의심)
- `ACC_2015_Q047` (warning): originalQuestion 연속 한글 12자+ (띄어쓰기 누락 의심)
- `ACC_2015_Q048` (warning): question 연속 한글 12자+ (띄어쓰기 누락 의심)
- `ACC_2015_Q048` (warning): originalQuestion 연속 한글 12자+ (띄어쓰기 누락 의심)
- `ACC_2015_Q049` (warning): originalQuestion 연속 한글 12자+ (띄어쓰기 누락 의심)
- `ACC_2015_Q050` (warning): originalQuestion 연속 한글 12자+ (띄어쓰기 누락 의심)
- ... 외 591건

## 2. Choice 품질

| 검사 | Critical | Warning |
|------|----------|---------|
| choice_marker | 0 | 1 |
| choice_footer | 0 | 81 |
### Choice Warning 샘플

- 건수: **82**

- `ACC_2015_Q041` (warning): ⑤ 보기에 페이지 잡음 포함
- `ACC_2015_Q046` (warning): ⑤ 보기에 페이지 잡음 포함
- `ACC_2015_Q051` (warning): ⑤ 보기에 페이지 잡음 포함
- `ACC_2015_Q056` (warning): ⑤ 보기에 페이지 잡음 포함
- `ACC_2015_Q061` (warning): ⑤ 보기에 페이지 잡음 포함
- `ACC_2015_Q066` (warning): ⑤ 보기에 페이지 잡음 포함
- `ACC_2015_Q071` (warning): ⑤ 보기에 페이지 잡음 포함
- `ACC_2015_Q076` (warning): ⑤ 보기에 페이지 잡음 포함
- `ACC_2015_Q077` (warning): 보기 1 내부 기호 ['①']
- `ACC_2017_Q042` (warning): ⑤ 보기에 페이지 잡음 포함
- `ACC_2017_Q045` (warning): ⑤ 보기에 페이지 잡음 포함
- `ACC_2017_Q048` (warning): ⑤ 보기에 페이지 잡음 포함
- `ACC_2017_Q050` (warning): ⑤ 보기에 페이지 잡음 포함
- `ACC_2017_Q052` (warning): ⑤ 보기에 페이지 잡음 포함
- `ACC_2017_Q054` (warning): ⑤ 보기에 페이지 잡음 포함
- `ACC_2017_Q057` (warning): ⑤ 보기에 페이지 잡음 포함
- `ACC_2017_Q060` (warning): ⑤ 보기에 페이지 잡음 포함
- `ACC_2017_Q062` (warning): ⑤ 보기에 페이지 잡음 포함
- `ACC_2017_Q064` (warning): ⑤ 보기에 페이지 잡음 포함
- `ACC_2017_Q066` (warning): ⑤ 보기에 페이지 잡음 포함
- `ACC_2017_Q069` (warning): ⑤ 보기에 페이지 잡음 포함
- `ACC_2017_Q072` (warning): ⑤ 보기에 페이지 잡음 포함
- `ACC_2017_Q074` (warning): ⑤ 보기에 페이지 잡음 포함
- `ACC_2017_Q076` (warning): ⑤ 보기에 페이지 잡음 포함
- `ACC_2017_Q079` (warning): ⑤ 보기에 페이지 잡음 포함
- ... 외 57건

## 3. Answer 품질

- 240/240 문항 answer 1~5, answerIndex 일치, 정답 보기 연결 **PASS**

## 4. Pattern 품질

### Pattern 이슈

- 건수: **3**

- `ACC_INV_001` (info): Pattern 문항 2개 (< 3)
- `ACC_LEASE_001` (info): Pattern 문항 2개 (< 3)
- `ACC_COST_002` (info): Pattern 문항 1개 (< 3)

## 5. AI Tutor 품질 (Pattern별 3문항 샘플)

- Note: Node.js unavailable

- Sampling engine: `python-fallback`
- 샘플 수: 50 (Pattern 18개, Pattern당 최대 3문항)

- Python fallback은 `buildFallbackProfile` 동작을 시뮬레이션합니다. 실제 엔진 검증은 Node.js 필요.

| 필드 | PASS | 비율 |
|------|------|------|
| explanation | 50 | 100.0% |
| solvingAlgorithm | 50 | 100.0% |
| wrongAnswerAnalysis (>=4) | 50 | 100.0% |
| memoryTip | 50 | 100.0% |
| 4종 모두 충족 | 50 | 100.0% |

### Pattern별 샘플

| Pattern | 샘플 수 | explanation | algorithm | wrongAnalysis | memoryTip |
|---------|---------|-------------|-----------|---------------|-----------|
| 원가계산 (`ACC_COST_001`) | 3 | 3/3 | 3/3 | 3/3 | 3/3 |
| 관리회계 (`ACC_COST_002`) | 1 | 1/1 | 1/1 | 1/1 | 1/1 |
| 자본·배당 (`ACC_EQ_001`) | 3 | 3/3 | 3/3 | 3/3 | 3/3 |
| 금융상품 (`ACC_FIN_001`) | 3 | 3/3 | 3/3 | 3/3 | 3/3 |
| 사채·채권 (`ACC_FIN_002`) | 3 | 3/3 | 3/3 | 3/3 | 3/3 |
| 재무제표 일반 (`ACC_FS_001`) | 3 | 3/3 | 3/3 | 3/3 | 3/3 |
| 회계학 일반 (`ACC_GEN_001`) | 3 | 3/3 | 3/3 | 3/3 | 3/3 |
| 무형자산 (`ACC_INT_001`) | 3 | 3/3 | 3/3 | 3/3 | 3/3 |
| 기말재고 포함 여부 판단 (`ACC_INV_001`) | 2 | 2/2 | 2/2 | 2/2 | 2/2 |
| 운반비·부대비용과 재고원가 (`ACC_INV_003`) | 3 | 3/3 | 3/3 | 3/3 | 3/3 |
| 매출원가 계산 (PER법) (`ACC_INV_004`) | 3 | 3/3 | 3/3 | 3/3 | 3/3 |
| FIFO·총평균법 매출원가 (`ACC_INV_006`) | 3 | 3/3 | 3/3 | 3/3 | 3/3 |
| LCM·순실현가능가치 평가 (`ACC_INV_007`) | 3 | 3/3 | 3/3 | 3/3 | 3/3 |
| 리스 (`ACC_LEASE_001`) | 2 | 2/2 | 2/2 | 2/2 | 2/2 |
| 유형자산·감가상각 (`ACC_PPE_001`) | 3 | 3/3 | 3/3 | 3/3 | 3/3 |
| 재평가·손상 (`ACC_PPE_002`) | 3 | 3/3 | 3/3 | 3/3 | 3/3 |
| 수익인식 (`ACC_REV_001`) | 3 | 3/3 | 3/3 | 3/3 | 3/3 |
| 법인세 (`ACC_TAX_001`) | 3 | 3/3 | 3/3 | 3/3 | 3/3 |

## 6. 연도별 분포

| 연도 | 문항 |
|------|------|
| 2015 | 40 |
| 2017 | 40 |
| 2018 | 40 |
| 2020 | 40 |
| 2024 | 40 |
| 2025 | 40 |

## 7. 수험생 관점 권장 조치 (다음 품질 Phase)

1. **OCR 후처리**: `originalQuestion`/`choices` 띄어쓰기·페이지 푸터(`A-15-8`, `교시`) 제거
2. **표 문항**: `hasTable` 2건 Markdown 재추출 — 현재 separator/행 구조 손상
3. **AI Tutor**: MVP Pattern 전용 Profile 확장 (현재 Fallback 비율 높음)
4. **solution 필드**: DB 해설은 Phase 후속 — Tutor/추천은 Profile 기반 유지

## 부록: 카테고리별 전체 건수

- `ocr_glued_hangul`: 369
- `ocr_footer`: 206
- `ocr_currency`: 137
- `choice_footer`: 81
- `ocr_fragment`: 70
- `question_short`: 41
- `pattern_sparse`: 3
- `choice_marker`: 1
