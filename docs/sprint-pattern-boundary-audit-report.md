# Sprint Report — Pattern Boundary Audit

Date: 2026-07-26
Type: **Audit only** (no runtime / no SoT mutation)

## Goal

Question Mapping과 시험장 사고 Pattern(Algorithm/Domain) 불일치를 240문항 전수 식별한다.

## Deliverables

| File | Status |
|------|--------|
| `docs/pattern-boundary-audit.md` | **Created** |
| `docs/sprint-pattern-boundary-audit-report.md` | This file |
| `data/analysis/_run_pattern_boundary_audit.py` | Reproducible assist (read-only vs SoT) |

## Results

- Coverage: **240 / 240**
- Source PDF available: **160** / unavailable: **80**
- KEEP 176 · MOVE 18 · LINK 29 · NEW_CANDIDATE 17
- Domain: financial 188 · cost 48 · tax 4

### Headline mismatches

1. **ACC_INV* ← cost Algorithm**: 11문항 (종합원가·CVP·결합원가 등)
   - `ACC_2015_Q075` → 종합원가·환산량 → NEW_CANDIDATE
   - `ACC_2017_Q077` → 종합원가·환산량 → NEW_CANDIDATE
   - `ACC_2017_Q080` → 종합원가·환산량 → NEW_CANDIDATE
   - `ACC_2018_Q079` → 종합원가·환산량 → NEW_CANDIDATE
   - `ACC_2020_Q073` → 종합원가·환산량 → NEW_CANDIDATE
   - `ACC_2020_Q076` → 전부·변동원가·CVP → LINK
   - `ACC_2024_Q073` → 종합원가·환산량 → NEW_CANDIDATE
   - `ACC_2024_Q075` → 전부·변동원가·CVP → LINK
   - … +3 more
2. **ACC_TAX_001 Domain 오류**: 1문항
   - `ACC_2024_Q077` → 전부·변동원가·CVP (cost_accounting)
3. **ACC_INV* ← 비재고 재무주제**: 7문항
   - `ACC_2017_Q069` → 자본·EPS → MOVE
   - `ACC_2020_Q063` → 자본·EPS → MOVE
   - `ACC_2024_Q047` → 자본·EPS → MOVE
   - `ACC_2025_Q051` → 유형자산·감가상각 → MOVE
   - `ACC_2025_Q053` → 유형자산·감가상각 → MOVE
   - `ACC_2025_Q063` → 자본·EPS → MOVE

## Acceptance

| Criterion | Result |
|-----------|--------|
| 240문항 Audit Coverage | **PASS** |
| 원본 확인 가능 표기 | **PASS** |
| Pattern 오류 후보 목록 | **PASS** |
| Multiple Pattern 후보 | **PASS** |
| SoT 변경 없음 | **PASS** |

## Next Action 제안

1. **Human Review Gate** — NEW_CANDIDATE / LINK 문항을 원본 PDF(Source=Y)로 육안 확정 (우선 종합원가 문항).
2. **Taxonomy V2 Schema Sprint** — `pattern.domain` · `primaryPattern` / `relatedPatterns` 스키마만 설계·문서화 (런타임 미적용).
3. **Cost Pattern Draft Pack** — `COST_PROCESS_001` 등 후보를 draft로만 정의 (ID 발급·DB 대량 추가 금지 또는 별도 승인).
4. **Mapping Fix Sprint (승인 후)** — MOVE/LINK만 최소 패치 큐로 반영 (Question stem 수정 없음).
5. **ACC_GEN 세분화 Audit** — 55문항 별도 패스 (이번 키워드 KEEP 잔여분).

## Non-Goals Confirmed

- Question / Answer / Pattern DB 수정 없음
- Runtime / Learning Loop / UI 변경 없음
- AI Pattern 자동 생성 없음

