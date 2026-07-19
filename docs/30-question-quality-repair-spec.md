# Question Quality Repair Phase

Version 1.0 · 2026-07-19

---

## 1. 목적

MVP 240문항을 **원본 PDF/HWP 시험지와 100% 동일**하게 복원한다.

**현재 우선순위 (2026-07-19): Parser Upgrade Phase**

- verified JSON **수작업 작성 중단**
- `scripts/exam_pipeline/` parser 규칙 개선 → `build-question-db-v3.py` 자동 재생성
- 품질 메트릭: `parser-upgrade-report.py` before/after 비교
- verified JSON은 parser 자동 복원 한계에 도달한 문항만 **최후 수단**

본 Phase에서 **중단**하는 작업:

- AI Tutor 기능 확장
- Recommendation 기능 확장
- Analytics 신규 기능
- 240문항 verified JSON 일괄 수작업

---

## 2. 절대 원칙

| 원칙 | 설명 |
|------|------|
| **Source First** | `source/original-exams/` 원본만 기준. AI 추론·임의 보완 금지 |
| **One-by-One** | 240문항 각각 원본과 1:1 대조 후 승인 |
| **No Guess** | 원본에 없는 숫자·단위·보기·표 셀 추가 금지 |
| **Verify Gate** | Repair 적용 전·후 `validate-question-repair.py` PASS |
| **Traceable** | 모든 수정은 `source.page` · raw body hash · diff 기록 |

---

## 3. Repair 대상 필드

| 필드 | Repair | 유지 (변경 금지) |
|------|--------|------------------|
| `question` | ✅ | |
| `originalQuestion` | ✅ | |
| `choices` | ✅ | |
| `table` / `hasTable` | ✅ | |
| `questionType` / `hasCalculation` | ✅ (원본 기준 재분류) | |
| `answer` / `answerIndex` | | ✅ (answers JSON 기준) |
| `patternId` | | ✅ (Pattern 분류 유지) |
| `questionId` / `source.*` | | ✅ |

---

## 4. 품질 Repair 항목

1. **중복 문장 제거** — OCR/파서 중복 블록
2. **누락 숫자 복원** — raw body 숫자 집합 ⊆ DB 텍스트
3. **단위 복원** — `W`, `￦`, `%`, `㎡`, `원`, `천원`, `백만원`, `×`, `20×1` 등
4. **보기 ①~⑤ 완전 복원** — raw 5개 마커 + 텍스트
5. **표(Table) 원본 복원** — Markdown/그리드 구조
6. **OCR 자동 수정** — footer, glued hangul, `#`→`①` 등 **규칙 기반만**
7. **원본 대조 검증** — Repair 후 raw segment diff

---

## 5. 데이터 흐름 (Parser Upgrade 우선)

```
source/original-exams/{year}.pdf|hwp  (2010~2026 분석)
        ↓ load_exam_document (HWP > PDF > OCR)
        ↓ question_parser.py + text_postprocess.py
        ↓ build-question-db-v3.py
data/question-db-mvp.json              ← 자동 재생성 (240문항)
        ↓ parser-upgrade-report.py     ← before/after 메트릭
        ↓ analyze-parser-upgrade.py    ← 연도별 truncation 원인 분류
docs/parser-upgrade-report.md
docs/parser-upgrade-analysis.md
        ↓ (한계 문항만) verified JSON
data/repair/verified/{questionId}.json
        ↓ apply-question-repair.py (후속)
        ↓ validate-question-repair.py
```

---

## 6. Baseline (2026-07-19)

`compare-questions-with-source.py` 1차 실행 결과:

| 이슈 | 건수 | 설명 |
|------|------|------|
| stem_truncated | ~198 | DB stem이 raw 본문 대비 과도하게 짧음 |
| ocr_glued_hangul | ~131 | 12자+ 연속 한글 |
| ocr_footer | ~38 | `A-15-8`, `교시` 등 |
| missing_numbers | ~2+ | raw 숫자 미포함 |
| table_damaged | 2 | `hasTable` Markdown 손상 |

**현재 parser 출력 = DB** 이므로, parser 자체 개선 + verified override가 필요하다.

---

## 7. 작업 순서 (240문항)

### Phase Q1 — Parser Upgrade (진행 중)

- [x] `text_postprocess.py` — footer·glued hangul·단위·숫자 보호
- [x] `question_parser.py` — full stem, 표 grid, truncation 원인 분류
- [x] `build-question-db-v3.py` — MVP 240 재생성
- [x] `analyze-parser-upgrade.py` — 2010~2026 분석
- [x] `parser-upgrade-report.py` — before/after 메트릭
- [ ] parser 추가 규칙 (2021~2023 choice_start_fail, OCR glued 잔여)

### Phase Q2 — verified JSON (최후 수단)

parser 자동 복원 후에도 stem_truncated·표 손상이 남는 문항만:

1. baseline 이슈 문항 목록 출력
2. PDF/HWP 화면 대조
3. `data/repair/verified/ACC_YYYY_QNNN.json` 작성
4. `apply-question-repair.py` 반영

### Phase Q3 — 전체 240 PASS

- stem/choices/table raw 대비 100% coverage
- footer/glued 0건
- Alpha Test Question 품질 재실행

---

## 8. Verified Record Schema

`data/repair/verified/ACC_2017_Q044.json`:

```json
{
  "questionId": "ACC_2017_Q044",
  "verifiedAt": "2026-07-19",
  "sourceFile": "source/original-exams/2017.pdf",
  "sourcePage": 15,
  "rawBodyHash": "abc123",
  "question": "...",
  "originalQuestion": "...",
  "choices": ["...", "...", "...", "...", "..."],
  "table": "| ... |",
  "hasTable": true,
  "reviewerNote": "PDF p.15 대조 완료"
}
```

---

## 9. 금지 사항

- OpenAI/LLM으로 지문·보기 **생성** 금지
- 원본 없이 숫자·단위 **추정** 금지
- `question-db.json` (Phase 1 Freeze) 수정 금지
- Tutor/Recommendation 코드 변경 금지

---

## 10. 관련 스크립트

| 스크립트 | 용도 |
|----------|------|
| `scripts/compare-questions-with-source.py` | 원본 대비 baseline·이슈 리포트 |
| `scripts/validate-question-repair.py` | Repair 진행률·품질 게이트 |
| `scripts/exam_pipeline/source_truth.py` | raw body·diff 엔진 |
| `scripts/analyze-parser-upgrade.py` | 2010~2026 parser·truncation 원인 분류 |
| `scripts/parser-upgrade-report.py` | parser upgrade before/after 메트릭 |
| `scripts/build-question-db-v3.py` | parser 개선 후 MVP DB 재빌드 |

---

## 11. 완료 기준

| 항목 | 기준 |
|------|------|
| verified records | 240/240 |
| stem_truncated | 0 |
| missing_numbers | 0 |
| choice mismatch vs raw | 0 |
| table vs PDF | 100% (표 문항) |
| footer/glued | 0 |
| `validate-question-repair.py` | PASS |
