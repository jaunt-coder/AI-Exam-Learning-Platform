# Promotion Workspace

Parser Emit → Product Snapshot 승격 작업 공간.

명세: [`docs/34-truth-split-migration-plan.md`](../../docs/34-truth-split-migration-plan.md)

## 규칙

- Parser Core / Coach Layer 수정 금지
- 기본은 dry-run — `question-db-mvp.json` 자동 덮어쓰기 금지
- `--apply` 는 `APPROVAL.md`에 `APPROVED: YES` 가 있을 때만

## 명령

```bash
py -3 scripts/promote-parser-emit.py
py -3 scripts/promote-parser-emit.py --write-candidate
py -3 scripts/promote-parser-emit.py --apply --approval data/promotion/APPROVAL.md
```

## Rollback

`baselines/mvp-before-*.json` → `data/question-db-mvp.json` 복구 후 검증·커밋.
