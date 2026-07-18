# Phase 1 Database Freeze

**Freeze ID:** `phase1-v1.0`  
**Freeze Date:** 2026-07-18  
**Status:** 공식 데이터 (Official)

---

## 1. Purpose

Phase 1 PDF 기반 Database 구축 완료 후, 이후 모든 개발은 **본 Freeze 버전**을 기준으로 한다.

---

## 2. Frozen Files

| File | Role |
|------|------|
| `data/frozen/phase1-v1.0/master-db.json` | Master 메타·연결 정보 |
| `data/frozen/phase1-v1.0/pattern-db.json` | Pattern 6종 |
| `data/frozen/phase1-v1.0/question-db.json` | Question 32종 (PDF 검증) |
| `data/frozen/phase1-v1.0/statistics.json` | Pattern 통계 |

**Working copy (런타임):** `data/*.json` — Freeze와 동일 내용 유지

**Manifest:** `data/phase1-freeze-manifest.json` (SHA256 checksum)

---

## 3. Change Policy

### 금지 (Phase 2 Frontend 개발 중)

- `question-db.json` 필드 구조 **임의 변경**
- `pattern-db.json` / `statistics.json` 스키마 **임의 변경**
- Phase 1 Freeze 파일 **직접 수정**

### 변경이 필요한 경우

1. `docs/02-database-spec.md` 또는 `docs/06-question-schema-spec.md` 업데이트
2. `docs/25-database-implementation-spec.md` 동기화
3. 버전 증가 (예: `phase1-v1.1`) 및 Freeze manifest 갱신
4. **사용자 승인 후** 진행

---

## 4. Source Provenance

- **PDF:** `source/past-exams/2018-2025.pdf`
- **pdfVerified:** `true`
- **Questions:** 32 (재고자산, 2018~2025)
- **Patterns:** 6

---

## 5. Backup

합성 데이터 (폐기 대상): `data/backup/phase1-generated/`

---

## 6. Verification

```bash
python scripts/validate-phase1-data.py
```

Freeze 무결성은 `data/phase1-freeze-manifest.json`의 SHA256과 대조한다.
