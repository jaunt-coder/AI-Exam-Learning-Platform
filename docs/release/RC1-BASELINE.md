# RC1 Architecture Baseline

Version: **RC1**  
Captured: 2026-07-20  
Method: SHA-256 of file bytes; directory = Merkle-style hash over `(relativePath, fileSha256)` pairs, excluding `__pycache__` / `*.pyc`

> Baseline은 **변경 감지용**이다. Promotion Apply나 코드 freeze commit을 수행하지 않았다.

---

## Summary

| Component | Path | SHA-256 |
|-----------|------|---------|
| **Parser Core** | `scripts/parser/` (19 files) | `dfaa7b50425789e2cc765c041dd7549eaa2c810e64fc3fed0f6972442b6ff031` |
| **Emit** | `data/regression/parser-emit/question-db-parser.json` | `4aebf14eef76b47425605512163c97eb66a2a050ab25bbf570f28624385dd935` |
| **Pattern DB** | `data/pattern-db-mvp.json` | `0a97e796cefba51381ae3721e5d50bbb0e6c04714e5cdf861eeabe0fc18699fd` |
| **Product Snapshot** | `data/question-db-mvp.json` | `0cfcaa317bc25c811cebb48e3b53218556b2320f9c3538b2d4583ba9d16a9629` |
| **Coach Layer** | `js/coach/` (15 files) | `cf7325be3f8849cd99410901db47f121dbf343e5039c435e8e5949305c234db6` |

### Auxiliary (RC1 reference)

| Component | Path | SHA-256 |
|-----------|------|---------|
| Promotion analysis scripts | `scripts/promotion/` (3 files) | `f9079a5dcb6ddc9c747714c12e06241b5dfeaf40cc4824668172a0d79b56a523` |

---

## Integrity notes

1. Product Snapshot sha는 Promotion Decision Support Sprint 시작·종료와 **동일** (`0cfcaa31…`) — RC1 기간 Apply 없음.
2. Pattern DB sha 동일 (`0a97e796…`) — D4 미변경.
3. Emit sha 동일 (`4aebf14e…`) — Parser 재Emit 없음.
4. Coach tree는 C1–C3 모듈 포함; **C4 파일 없음**.
5. Working tree에 Legacy `scripts/exam_pipeline/` 등 **미커밋 변경이 별도로 존재할 수 있음** — 그 경로는 RC1 Baseline에 **포함하지 않음** (docs/31 폐기 대상 / ADR-004 관할).

---

## How to re-verify

```bash
py -3 -c "import hashlib; from pathlib import Path; p=Path('data/question-db-mvp.json'); print(hashlib.sha256(p.read_bytes()).hexdigest())"
```

Directory hash는 RC1 준비 시 사용한 동일 알고리즘(상대경로 + 파일 digest 연결)으로 재계산한다.

---

## Sign-off

```
RC1 Baseline acknowledged: [ ]
Name: _______________
Date: _______________
```
