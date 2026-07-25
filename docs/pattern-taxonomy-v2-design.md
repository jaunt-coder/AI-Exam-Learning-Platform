# Pattern Taxonomy V2 Design

Sprint-09C · Pattern Architect  
Date: 2026-07-26  
Status: **DESIGN ONLY** — Migration / Runtime / UI / SoT 변경 없음

근거 Audit: [pattern-boundary-audit.md](pattern-boundary-audit.md)  
후보 저장소: `data/pattern-taxonomy-candidates.json` (**Pattern DB 아님**)

---

## 1. V1 문제점

### 1.1 Chapter First = Pattern First 혼동

V1은 사실상:

```text
Question → patternId → chapterId
```

목차(Chapter)가 Pattern의 상위처럼 동작한다.  
시험장 사고(Algorithm)와 Chapter 라벨이 어긋나면 학습 경로가 왜곡된다.

### 1.2 재고 Chapter에 원가 Algorithm 혼입

Sprint-09B 사례:

| 현상 | 예 |
|------|-----|
| `ACC_INV_006`(FIFO·매출원가) ← 종합원가·환산량 | `ACC_2020_Q073`, `ACC_2018_Q079` |
| `ACC_INV_003` ← 유형자산/리스 | `ACC_2025_Q051`, `ACC_2025_Q065` |
| `ACC_TAX_001` ← CVP | `ACC_2024_Q077` |

위험: 학생이 재고 Pattern을 학습하다 FIFO/평가로 오해 → 실제 필요 사고는 환산량·원가배분.

### 1.3 Single Pattern Only

V1은 Question당 Pattern 1개.  
제조·재고 경계, 관리회계·재무 경계 문항에서 **Primary + Related**를 표현할 수 없다.

### 1.4 Domain 부재

`financial` / `cost` 구분이 없어 Chapter 라벨만으로 추천·학습 큐가 구성된다.

### 1.5 ACC_GEN·ACC_TAX 버킷

- `ACC_GEN_001` (55문항): 세부분류 유예 버킷
- `tax_accounting` Domain 신설은 **금지** (감정평가사 회계학 Taxonomy V2 정책)

---

## 2. V2 Schema

### 2.1 Domain (2개만)

| Domain | 의미 |
|--------|------|
| `financial_accounting` | 재무회계 (재고·유형·금융·수익·자본·법인세 chapter 포함) |
| `cost_accounting` | 원가·관리회계 (종합원가·결합·표준·ABC·CVP 등) |

**금지:** `tax_accounting` Domain 생성.  
`ACC_TAX_*`는 **chapter/patternId 라벨로만** 유지하고 `domain`은 `financial_accounting`.

### 2.2 Pattern Metadata

```json
{
  "patternId": "COST_PROCESS_001",
  "domain": "cost_accounting",
  "chapter": "종합원가계산",
  "title": "완성품환산량 기반 원가 배분",
  "algorithm": "환산량 계산 → 원가 배분 → 완성품/재공품 원가",
  "trigger": "종합원가계산·환산량·재공품 완성도",
  "relatedPatterns": ["ACC_INV_006"],
  "status": "draft"
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `patternId` | Y | 기존 ID 변경 금지. 신규는 `COST_*` draft만 후보 저장소 |
| `domain` | Y | `financial_accounting` \| `cost_accounting` |
| `chapter` | Y | 목차 라벨 (Pattern의 부모 아님) |
| `title` | Y | 학습 노출명 |
| `algorithm` | Y | 시험장 사고 절차 요약 |
| `trigger` | Y | 문항 인식 트리거 |
| `relatedPatterns` | Y | 인접 Pattern ID 목록 (빈 배열 허용) |
| `status` | Y | `verified` \| `legacy_bucket` \| `draft` \| `deprecated` |

### 2.3 Question Relation (런타임 미적용)

```json
{
  "questionId": "ACC_2020_Q073",
  "primaryPattern": "COST_PROCESS_001",
  "relatedPatterns": ["ACC_INV_006"]
}
```

| Field | Meaning |
|-------|---------|
| `primaryPattern` | 풀이 Algorithm의 주 Pattern (학습 본선) |
| `relatedPatterns` | 혼동·선수·인접 Pattern (보조 학습) |

V1 호환: `question.patternId` ≡ 현재 SoT 값 **유지**.  
V2 관계는 **후보 저장소 / 향후 매핑 오버레이**에만 둔다.

### 2.4 구조 전환

```text
V1:  Question ──1──► Pattern ──► Chapter

V2:  Domain
      ├─ financial_accounting
      └─ cost_accounting

     Pattern { domain, chapter, trigger, algorithm, relatedPatterns, status }

     Question
      ├─ primaryPattern   (V2 overlay)
      └─ relatedPatterns  (V2 overlay)
      └─ patternId        (V1 SoT, frozen until migration)
```

---

## 3. Primary / Related 관계 정의

### 3.1 Primary Pattern

- 해당 문항을 **시험장에서 푸는 주 Algorithm**을 담는 Pattern
- Learning Loop의 기본 학습 타깃 (향후 적용 시)
- Domain은 Primary 기준

### 3.2 Related Patterns

다음 중 하나 이상일 때 등록:

1. **혼동 인접** — 재고 FIFO vs 종합원가 환산량
2. **선수 개념** — 제조원가 흐름 ↔ 매출원가
3. **V1 잔존 매핑** — 현재 `patternId`가 Primary와 다를 때 보존용으로 related에 보관

### 3.3 규칙

- Primary ≠ Related (동일 ID 중복 금지)
- Related는 0..N
- Related만으로 Domain을 바꾸지 않음
- AI 자동 생성 Related 금지 — Audit/Human Gate만

---

## 4. MOVE 처리 정책

Audit `MOVE` (18): Chapter/Pattern 재배치가 필요하나 **SoT는 당장 수정하지 않음**.

### 정책

| 항목 | 규칙 |
|------|------|
| SoT `question.patternId` | **유지** |
| 후보 필드 | `proposedPattern` only |
| Domain | V2 2-domain으로 기록 (`tax` → `financial_accounting`) |
| Runtime | 미적용 |
| 승인 후 | Mapping Fix Sprint에서 `patternId` ← `proposedPattern` 최소 패치 |

### 후보 레코드 형태

```json
{
  "questionId": "ACC_2025_Q051",
  "currentPattern": "ACC_INV_003",
  "proposedPattern": "ACC_PPE_001",
  "domain": "financial_accounting",
  "status": "proposed_move",
  "runtimeApplied": false
}
```

### 우선순위

1. Source PDF = Y 인 MOVE
2. `ACC_INV_*` ← 비재고 재무 (자본/유형/리스)
3. `ACC_GEN_001` → 구체 Pattern
4. 법인세 Algorithm → `ACC_TAX_001` (domain=financial)

---

## 5. LINK 처리 정책

Audit `LINK` (29): Multiple Pattern 필요.

### 정책

| 항목 | 규칙 |
|------|------|
| SoT mapping | **유지** |
| 후보 | `primaryPattern` + `relatedPatterns` |
| 전형 | Primary = `COST_*` draft, Related = 현재 `ACC_*` |
| Runtime | 미적용 |

### 후보 레코드 형태

```json
{
  "questionId": "ACC_2020_Q076",
  "currentPattern": "ACC_INV_006",
  "primaryPattern": "COST_CVP_001",
  "relatedPatterns": ["ACC_INV_006"],
  "domain": "cost_accounting",
  "status": "proposed_link",
  "runtimeApplied": false
}
```

### LINK ≠ MOVE

- MOVE: Primary가 **기존 verified Pattern**으로 바뀌면 충분
- LINK: Primary가 **원가 draft**이거나, 재무·원가 경계를 동시에 가르쳐야 함

---

## 6. NEW Candidate 승인 기준

Audit `NEW_CANDIDATE` (17): Pattern DB에 추가하지 않음. `status: draft`만.

### Draft ID (후보, 미발급 SoT)

| Candidate ID | Domain | Title |
|--------------|--------|-------|
| `COST_PROCESS_001` | cost_accounting | 완성품환산량 기반 원가 배분 |
| `COST_JOINT_001` | cost_accounting | 결합원가·주부산품 배분 |
| `COST_STD_001` | cost_accounting | 표준원가 차이분석 |
| `COST_ABC_001` | cost_accounting | 활동기준·개별원가 배분 |
| `COST_CVP_001` | cost_accounting | 전부/변동원가·CVP·성과평가 |
| `COST_MFG_001` | cost_accounting | 제조원가 흐름·제품원가 |

기존 `ACC_*` Pattern ID는 **변경·재사용 금지 위반 없음** (신규는 `COST_*` prefix).

### Promotion Gate (모두 충족 시만 Pattern DB 반영 검토)

1. Human PDF Review (Source=Y 우선; Source=N은 stem+해설 이중 확인)
2. Evidence Question ≥ 2 (동일 Algorithm)
3. Domain ∈ {financial_accounting, cost_accounting}
4. 기존 Pattern과 Algorithm 중복 없음 (중복 시 LINK/MOVE로 강등)
5. Pattern Architect + 콘텐츠 승인자 서명
6. 별도 **Promotion Sprint** (이번 Sprint 아님)

### 금지

- AI 자동 Pattern 대량 생성
- draft의 즉시 Runtime 노출
- Question stem/Answer 수정으로 Pattern을 “맞추는” 행위

---

## 7. Migration Plan

이번 Sprint는 Migration을 **설계만** 한다. 실행 금지.

### Phase 0 — Design (본 Sprint) ✅

- Taxonomy V2 문서
- `pattern-taxonomy-candidates.json` 후보 저장소
- SoT / Runtime / UI 무변경

### Phase 1 — Human Review Gate

- MOVE 18 · LINK 29 · NEW 17 육안 확정
- Source=Y 종합원가 문항 우선
- 결과: `approved` / `rejected` / `needs_split` 플래그만 후보 저장소에 추가

### Phase 2 — Schema Overlay (Still no SoT rewrite)

- `data/pattern-domain-overlay.json` (또는 candidates 승격 섹션)
- `existingPatternDomainOverlay`를 런타임이 읽지 않음 (문서·툴링만)

### Phase 3 — Draft Pattern Pack (승인 후)

- `COST_*` draft → Pattern DB **소량** append (삭제·ID 변경 없음)
- Question mapping은 아직 유지

### Phase 4 — Mapping Fix Sprint (최소 패치)

- MOVE: `patternId` ← `proposedPattern`
- LINK: Question 오버레이에 `primaryPattern` / `relatedPatterns` 기록  
  (또는 `patternId`=primary, related는 별도 맵)
- KEEP: 무변경
- Answer / stem / OCR / Parser 금지

### Phase 5 — Runtime Adoption (별도 Sprint)

- Learning Loop가 Primary 우선, Related는 “같이 보면 좋은 Pattern”
- Recommendation / AI / Mastery 여전히 금지 범위면 스킵

### Rollback

- 후보 저장소만 삭제/무시하면 V1과 동일
- SoT를 수정한 Phase 4 이후만 git revert 필요 → Phase 4는 승인·체크섬 필수

---

## 8. Audit Decision → V2 처리 요약

| Audit | Count | V2 처리 | SoT |
|-------|------:|---------|-----|
| KEEP | 176 | 현행 `patternId` 유지 | 변경 없음 |
| MOVE | 18 | `proposedPattern`만 후보 관리 | 변경 없음 |
| LINK | 29 | `primaryPattern` + `relatedPatterns` 후보 | 변경 없음 |
| NEW_CANDIDATE | 17 | `COST_*` draft + evidence | 변경 없음 |

---

## 9. Acceptance (Design Sprint)

| Criterion | Status |
|-----------|--------|
| 기존 Pattern ID 유지 | PASS |
| Question Mapping 유지 | PASS |
| Domain 2개만 사용 | PASS (`tax_accounting` 금지) |
| Multiple Pattern 구조 정의 | PASS |
| Migration 계획 존재 | PASS (Phase 0–5) |
| Runtime 영향 없음 | PASS |

---

## 10. Related Docs

- [pattern-boundary-audit.md](pattern-boundary-audit.md)
- [sprint-pattern-boundary-audit-report.md](sprint-pattern-boundary-audit-report.md)
- [sprint-09C-pattern-taxonomy-v2-report.md](sprint-09C-pattern-taxonomy-v2-report.md)
- 후보: `data/pattern-taxonomy-candidates.json`
