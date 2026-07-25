# Table Missing Report

Date: 2026-07-26  
Corpus: MVP Inventory (`ACC_INV_*`) FAIL subset  
Related: [`question-fidelity-audit.md`](question-fidelity-audit.md)

---

## Definition

**FAIL — Table / Calc materials missing** means:

- 원본(L1)에 행·열 구조의 자료 표가 있는데  
- MVP DB에서 `hasTable:false` 이거나  
- `table`이 **보기(choice) 그리드만** 담고 자료 표는 stem에 한 줄로 붕괴된 상태.

학생은 표 형태로 읽지 못하고, 숫자 열을 재구성해야 한다 → **교육적 완전성 실패**.

---

## FAIL Detail

### ACC_2017_Q066 — 소매재고법 표 붕괴

| Layer | Observation |
|-------|-------------|
| L1 (layer-analysis) | `구분 / 매가 / 원가` + 기초·매입·매출·인상·인하 행 |
| MVP | `hasTable: false`, `table: null` · stem에 `"구분 매 가 원 가 기초재고자산 W1,000,000…"` flatten |
| Renderer | `[table] (none)` |

**Missing elements:** 매가·원가 2열 표 전체, 행 라벨(기초재고자산, 당기매입액, …)

---

### ACC_2017_Q080 — 월별 원가 표 붕괴

| Layer | Observation |
|-------|-------------|
| MVP stem | `구분 1월 2월 최대생산가능량 … 변동제조원가 …` 열 구조 붕괴 |
| Flags | `hasTable: false` |

**Missing elements:** 1월/2월 컬럼 헤더 표, 변동·고정 원가 행 정렬

---

### ACC_2018_Q066 — 소매재고 표 붕괴

| Layer | Observation |
|-------|-------------|
| Pilot candidate stem | 행 단위 (`원가` / `매가` / 기초… / 당기매입…) |
| MVP | flatten 한 줄 · `hasTable: false` |

**Missing elements:** 원가·매가 열 표

---

### ACC_2018_Q068 — 자료 표 누락 + 잘못된 table 필드

| Layer | Observation |
|-------|-------------|
| Stem | `20×1~20×3 기말재고·당기순이익` 수치가 **문장형 flatten** |
| `table` | 보기 ①~⑤ 그리드만 (`| ① | W23,500 |`) — **자료 표 아님** |
| `hasTable` | `true` (오신호: choice-grid) |

**Missing elements:** 평가방법별 기말재고·순이익 **자료 표**  
**Wrong element stored:** choice grid as `table`

---

### ACC_2020_Q066 — 상품별 저가법 표

| Layer | Observation |
|-------|-------------|
| Stem | `A 800개 W100 W120 B 250개 …` flatten |
| Flags | `hasTable: false` |

**Missing elements:** 상품×수량×원가×NRV 표 · ○ 자료 줄바꿈

---

### ACC_2024_Q043 — NRV/대체원가 표

| Layer | Observation |
|-------|-------------|
| Stem | `항목 원가 확정판매계약가격 … 제품A W1,000 …` flatten |
| Flags | `hasTable: false` |

**Missing elements:** 제품/원재료 행 × 가격 열 표

---

### ACC_2024_Q044 — 소매재고 표 + choice 오염

| Layer | Observation |
|-------|-------------|
| Stem | `항목 원가 판매가 기초재고액…` flatten · `hasTable: false` |
| choices[5] | `"W7,375 2024년도제35회감정평가사1차2교시A형( 26 - 15 )"` — **footer 혼입** |

**Missing elements:** 소매재고 자료 표  
**Extra defect:** 선택지 5번에 시험지 바닥글

---

### ACC_2024_Q075 · ACC_2024_Q076 · ACC_2025_Q043 · ACC_2025_Q044 · ACC_2025_Q073

공통 패턴:

- stem 내 `구분/항목/원가/매가` + 다수 `W` 금액이 **비표 형태**로 나열  
- `hasTable: false`, `table: null`  
- 계산에 필요한 열 정렬이 교육적으로 복원되지 않음  

문항별 L1 PDF 페이지는 Human Checklist로 재확인.

---

## Not FAIL (for this report)

| ID | Note |
|----|------|
| `ACC_2020_Q049` | 표보다는 서술형 수치 · Audit 본편 WARNING |
| `hasTable:true` 38건 중 다수 | 실제로 **보기 연도쌍/초이스 그리드** — 자료 표 fidelity와 별개 |

---

## Counts

| Category | Count |
|----------|------:|
| Inventory FAIL (table/calc structure) | **12** |
| Confirmed via layer-analysis / pilot (strong) | ≥4 (`Q066`×2, `Q068`, `Q080`) |
| Heuristic + pattern (needs PDF confirm) | 8 |

---

## Impact on Learning

표가 붕괴된 재고 Pattern 문항은:

1. 원가율·기말재고 계산의 **입력 행렬**을 학생이 재구성해야 함  
2. `question.html` table mount가 있어도 **데이터가 없어** 표시 불가  
3. Pattern First 학습의 “자료 읽기 → 알고리즘 적용” 흐름이 끊김  

**권고 (수정 아님 · 후속 WO):** Parser table recovery / SemanticRepair 우선 큐에 위 12 ID 등록.
