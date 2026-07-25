# Sprint Report — 09C Pattern Taxonomy V2 Design

Date: 2026-07-26  
Role: Pattern Architect  
Type: **Design only** (No Migration · No Runtime · No UI · No SoT mutation)

---

## Goal

Sprint-09B Boundary Audit 결과(KEEP 176 / MOVE 18 / LINK 29 / NEW_CANDIDATE 17)를  
**Pattern Taxonomy V2** 스키마·정책·후보 저장소로 확정한다.

---

## Deliverables

| File | Status |
|------|--------|
| `docs/pattern-taxonomy-v2-design.md` | **Created** |
| `data/pattern-taxonomy-candidates.json` | **Created** (후보 저장소 · Pattern DB 아님) |
| `docs/sprint-09C-pattern-taxonomy-v2-report.md` | This file |
| `data/analysis/_build_taxonomy_v2_candidates.py` | 재현 빌더 (SoT 미수정) |

---

## Taxonomy V2 Schema (요약)

### Domain (2 only)

- `financial_accounting`
- `cost_accounting`
- **금지:** `tax_accounting` (`ACC_TAX_*`는 chapter/ID 유지, domain=financial)

### Pattern Metadata

`patternId`, `domain`, `chapter`, `title`, `algorithm`, `trigger`, `relatedPatterns`, `status`

### Question Relation (미적용)

`primaryPattern` + `relatedPatterns`  
V1 `question.patternId`는 SoT에서 동결.

---

## Audit → Candidate 반영

| Decision | Count | Candidate handling |
|----------|------:|--------------------|
| KEEP | 176 | 엔트리 없음 · 현행 유지 |
| MOVE | 18 | `proposedPattern` |
| LINK | 29 | `primaryPattern` + `relatedPatterns` |
| NEW_CANDIDATE | 17 | `COST_*` draft · `status: draft` |

### Draft Patterns (미승격)

| ID | Domain |
|----|--------|
| `COST_PROCESS_001` | cost_accounting |
| `COST_JOINT_001` | cost_accounting |
| `COST_STD_001` | cost_accounting |
| `COST_ABC_001` | cost_accounting |
| `COST_CVP_001` | cost_accounting |
| `COST_MFG_001` | cost_accounting |

기존 `ACC_*` Pattern ID **전부 유지**. Overlay로 domain만 기록.

---

## Acceptance

| Criterion | Result |
|-----------|--------|
| 기존 Pattern ID 유지 | **PASS** |
| Question Mapping 유지 | **PASS** |
| Domain 2개만 사용 | **PASS** |
| Multiple Pattern 구조 정의 | **PASS** |
| Migration 계획 존재 | **PASS** (Phase 0–5 in design doc) |
| Runtime 영향 없음 | **PASS** |

---

## Frozen Guarantees

- Question DB / Answer DB / Pattern DB: **미수정**
- Learning Loop / UI / Parser / OCR: **미수정**
- AI / Recommendation / Mastery: **미구현 유지**

---

## Next Sprint Recommendation

### Recommended: Sprint-09D — Human Review Gate (Cost Process Pack)

1. Source=Y 인 `NEW_CANDIDATE`·`LINK` 문항 원본 PDF 육안 확정  
2. 우선 대상: `COST_PROCESS_001` evidence (종합원가·환산량)  
3. 후보 JSON에 `reviewStatus: approved|rejected|needs_split`만 추가  
4. 여전히 SoT/Runtime 변경 금지

### Following options

| Sprint | Scope |
|--------|--------|
| 09E Schema Overlay | domain overlay 파일 고정 (런타임 미연결) |
| 09F Draft Promotion | 승인된 `COST_*`만 Pattern DB append (소량) |
| 09G Mapping Fix | MOVE/LINK 최소 패치 큐 적용 (승인 필수) |

**비권장 즉시 실행:** Mapping Fix + Runtime 동시 적용 (롤백 비용 큼)

---

## References

- [pattern-taxonomy-v2-design.md](pattern-taxonomy-v2-design.md)
- [pattern-boundary-audit.md](pattern-boundary-audit.md)
- `data/pattern-taxonomy-candidates.json`
