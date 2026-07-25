# Parser Emit Contract (Stage 7)

Version 1.0 — **Approved: YES** (2026-07-20)

> Stage 7 `QuestionBuilder`는 AST를 **절대 수정하지 않는** read-only Codegen이다.

---

## 0. 승인 상태

| 항목 | 상태 |
|------|------|
| 문서 상태 | **Approved: YES** (2026-07-20) |
| Builder 구현 | **허가** (아래 추가 조건 포함) |
| 제품 DB 스위치 | **기본 금지** — emit은 regression 경로만. 예외는 **Promotion Gate** (`docs/34-truth-split-migration-plan.md`) 통과 후에만 |

---

## 0.1 승인된 결정 패키지

| # | 항목 | 결정 |
|---|------|------|
| 1 | `table` 형식 | markdown 문자열 (Frontend 계약) |
| 2 | 다중 표 | primary만 JSON, `tables[1:]` → sidecar |
| 3 | stem/choice join | 제안 A — bbox/line 간격만. 교정 금지 |
| 4 | `difficulty` | `"medium"` 고정 |
| 5 | choices 마커 | 마커 제외 (본문만) |
| 6 | 셀 `\|` | emit 인코딩 `\\|` (내용 수리가 아님) |
| 7 | Sidecar | `data/regression/ast-sidecar/{year}.json` |
| 8 | Emit JSON | `data/regression/parser-emit/question-db-parser.json` |

---

## 0.2 추가 승인 조건 (필수)

1. Builder는 `ir_frozen=True` 에서만 실행한다.
2. Builder 내부에 데이터 수정 로직 금지: `replace` / `regex` / `trim` / `normalize` / `repair`  
   - 허용: Token.text 그대로 연결, markdown **직렬화 인코딩**(셀 `|` → `\|`), 직교 서비스(answer/pattern) **조회만**.
3. AST→JSON 손실 정보는 **반드시 sidecar AST**에 보존한다.
4. Stage 8 Diff가 Source / Layout / AST / JSON 4단 비교를 하도록 **provenance** 를 유지한다.  
   - 레코드: 경량 `provenance.layers`  
   - sidecar: 토큰·grid·bbox 전체
5. 기존 `question-db-mvp.json`과 동일하게 만드는 것이 목표가 **아니다**.  
   **Source Truth 기준 신규 JSON**을 생성한다 (old DB는 Diff의 참고 shadow일 뿐).

---

## 1. 절대 원칙

1. Source of Truth = Layout → Token → AST.
2. Read-only Codegen — AST 필드 대입 금지.
3. Freeze 필수.
4. 제품 Schema Key 집합은 기존과 호환 (추가 `provenance`는 Diff용, Frontend는 무시 가능).
5. 문항/연도 하드코딩 금지.

---

## 2. 파이프라인

```
… → IRIntegrityGate (6.9, freeze)
  → QuestionBuilder (7, read-only emit + sidecar)
  → DiffEngine (8, Source/Layout/AST/JSON — mutate 없음)
  → data/regression/parser-emit/…   (제품 DB 스위치는 별도 Gate)
```

---

## 3. 필드 매핑

| JSON Key | 규칙 |
|----------|------|
| `questionId` | `ACC_{year}_Q{number:03d}` |
| `question` | stem tokens − table tokens, join A |
| `originalQuestion` | question + `\n` + table_markdown (표 있을 때) |
| `choices` | 5개, CHOICE_MARKER 제외 join A |
| `table` | markdown string \| null |
| `hasTable` | geometry 표 존재 |
| `difficulty` | `"medium"` |
| `figure` | `false` (후속) |
| `provenance` | 4-layer 포인터 (Diff용) |

직교 조회: `answer_loader`, `pattern_classifier` (결과만 기록, AST 불변).

---

## 4. Sidecar / Provenance

- Sidecar: 전체 grid, extraTables, token 목록(type/bbox/page/immutable), contentHash
- Record `provenance.layers`: `source` / `layout` / `ast` / `json`

---

## 5. Builder 금지

- AST mutate, regex, trim/strip, normalize, repair, replace(내용 치환)
- `ir_frozen is False` emit
- `data/question-db-mvp.json` 직접 기록
