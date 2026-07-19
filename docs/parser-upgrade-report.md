# Parser Upgrade Report

- 생성일: 2026-07-19
- 비교: parser upgrade 전후 `question-db-mvp.json`
- 백업: `data/repair/question-db-mvp.pre-parser-upgrade.json`

## Quality Metrics

| Metric | Before | After | Reduction |
|--------|--------|-------|-----------|
| stem_truncated | 198 | 16 | 91.9% |
| ocr_footer | 39 | 0 | 100.0% |
| ocr_glued_hangul | 0 | 124 | +124 |
| missing_numbers | 2 | 0 | 100.0% |
| missing_units | 84 | 0 | 100.0% |
| table_restore_rate | 100.0% | 100.0% | - |

## Notes

- stem_truncated: raw source segment 대비 stem coverage < 75%
- table_restore_rate: hasTable 문항 중 valid markdown/grid 비율
- missing_numbers/units: footer·문항번호 제거 후 원본 숫자·단위 집합 비교
- ocr_glued_hangul: DB stem 연속 한글이 원본 stem 대비 2자 이상 길 때만 집계 (절대 12자+만 세면 stem 전체 복원 후 false positive 증가)
- verified JSON 수작업 없이 parser 규칙 개선만 적용
- 백업: `data/repair/question-db-mvp.pre-parser-upgrade.json`
