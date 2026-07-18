# Data Layer (MVP Phase 1)

## MVP Data Structure (docs/29)

Phase 1부터 MVP Roadmap 기준 flat 구조를 사용한다.

```
data/
├── master-db.json       # 플랫폼 통합 기준 데이터
├── pattern-db.json      # Pattern Database
├── question-db.json     # Question Database
└── statistics.json      # 출제 통계
```

## Architecture Reference (docs/02)

장기 아키텍처는 `data/master/`, `data/generated/` 구조를 유지한다.
MVP 완료 후 Phase 10 Deployment 시 통합 마이그레이션 예정.

## Single Source of Truth

MVP Phase 1~5: `data/master-db.json` + 분리 DB 파일
장기: `data/master/master-db.json` → generated 자동 생성

## Validation

```bash
node scripts/validate-phase1-data.js
```

## Schema Reference

| Entity | Spec |
|--------|------|
| Pattern | docs/05, docs/25 §8 |
| Question | docs/06, docs/25 §10 |
| Statistics | docs/25 §13 |
| Master DB | docs/25 §4 |
