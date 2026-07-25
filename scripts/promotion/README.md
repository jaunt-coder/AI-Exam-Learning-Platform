# Promotion scripts (read-only analysis)

Decision support tools for docs/34 Promotion Gate.

Rules:

- Do **not** import or modify `scripts/parser/`
- Do **not** modify Product Snapshot / Pattern DB / Coach
- Outputs go under `data/promotion/` only

| Script | Output |
|--------|--------|
| `inspect-pattern-gap.py` | `data/promotion/pattern-gap-analysis.md` |
| `display-acceptance-sampler.py` | `display-acceptance-sample.md`, `hastable-regression-candidates.md` |
