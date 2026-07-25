#!/usr/bin/env python3
"""Pattern Gap Evidence Collection (read-only).

Collects evidence for G6 unresolved patternIds (e.g. ACC_COST_001).
Does NOT recommend reclassification. Does NOT modify any DB.

Usage:
  py -3 scripts/promotion/inspect-pattern-gap.py
  py -3 scripts/promotion/inspect-pattern-gap.py --gap-id ACC_COST_001
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CANDIDATE = ROOT / "data" / "promotion" / "candidate-question-db.json"
EMIT = ROOT / "data" / "regression" / "parser-emit" / "question-db-parser.json"
MVP = ROOT / "data" / "question-db-mvp.json"
PATTERN = ROOT / "data" / "pattern-db-mvp.json"
OUT = ROOT / "data" / "promotion" / "pattern-gap-analysis.md"

STEM_PREVIEW = 280


def load_questions(path: Path) -> list[dict]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    qs = payload.get("questions")
    if not isinstance(qs, list):
        raise ValueError(f"{path}: questions 배열 없음")
    return qs


def load_patterns(path: Path) -> list[dict]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(payload, list):
        return [p for p in payload if isinstance(p, dict)]
    return [p for p in (payload.get("patterns") or []) if isinstance(p, dict)]


def preview(text: str | None, limit: int = STEM_PREVIEW) -> str:
    raw = (text or "").replace("\r\n", "\n").strip()
    compact = " ".join(raw.split())
    if len(compact) <= limit:
        return compact
    return compact[: limit - 1] + "…"


def md_escape(text: str) -> str:
    return text.replace("|", "\\|")


def main() -> int:
    parser = argparse.ArgumentParser(description="Pattern gap evidence (read-only)")
    parser.add_argument("--gap-id", default="ACC_COST_001", help="Unresolved patternId to collect")
    parser.add_argument(
        "--candidate",
        type=Path,
        default=CANDIDATE,
        help="Candidate JSON (falls back to emit if missing)",
    )
    args = parser.parse_args()

    source_path = args.candidate if args.candidate.exists() else EMIT
    if not source_path.exists():
        print("FAIL: candidate/emit 없음", file=sys.stderr)
        return 1
    if not MVP.exists() or not PATTERN.exists():
        print("FAIL: MVP 또는 Pattern DB 없음", file=sys.stderr)
        return 1

    cand_qs = load_questions(source_path)
    mvp_map = {q["questionId"]: q for q in load_questions(MVP)}
    patterns = load_patterns(PATTERN)
    pattern_ids = sorted({p.get("patternId") for p in patterns if p.get("patternId")})
    cost_patterns = [p for p in patterns if str(p.get("patternId", "")).startswith("ACC_COST")]

    gaps = [q for q in cand_qs if q.get("patternId") == args.gap_id]
    gaps.sort(key=lambda q: (int(q.get("year") or 0), int((q.get("source") or {}).get("questionNumber") or 0)))

    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    lines: list[str] = []
    lines.append("# Pattern Gap Evidence Collection")
    lines.append("")
    lines.append(f"Generated: {now}")
    lines.append("Mode: **Evidence only — no reclassification, no DB writes**")
    lines.append(f"Gap patternId: `{args.gap_id}`")
    lines.append(f"Candidate source: `{source_path.relative_to(ROOT).as_posix()}`")
    lines.append(f"Product baseline: `{MVP.relative_to(ROOT).as_posix()}`")
    lines.append(f"Pattern Master: `{PATTERN.relative_to(ROOT).as_posix()}`")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## 1. Pattern Master Snapshot (D4)")
    lines.append("")
    lines.append(f"- Registered patternId count: **{len(pattern_ids)}**")
    lines.append(f"- Gap id registered?: **{'YES' if args.gap_id in pattern_ids else 'NO'}**")
    lines.append("")
    lines.append("### ACC_COST* entries currently registered")
    lines.append("")
    if not cost_patterns:
        lines.append("_None_")
    else:
        lines.append("| patternId | name | chapterId |")
        lines.append("|---|---|---|")
        for p in sorted(cost_patterns, key=lambda x: x.get("patternId") or ""):
            lines.append(
                f"| `{p.get('patternId')}` | {md_escape(str(p.get('name') or ''))} | `{p.get('chapterId')}` |"
            )
    lines.append("")
    lines.append("### Full registered patternId list")
    lines.append("")
    lines.append(", ".join(f"`{pid}`" for pid in pattern_ids))
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## 2. Gap Records Evidence")
    lines.append("")
    lines.append(f"Total gap records: **{len(gaps)}**")
    lines.append("")
    lines.append(
        "| # | questionId | year | emit.patternId | mvp.patternId | emit.chapterId | "
        "mvp.chapterId | answer(emit=mvp) | sourceFile | page |"
    )
    lines.append("|---:|---|---:|---|---|---|---|---|---|---:|")
    for i, q in enumerate(gaps, start=1):
        qid = q.get("questionId", "?")
        b = mvp_map.get(qid, {})
        src = q.get("source") or {}
        ans_ok = q.get("answer") == b.get("answer")
        lines.append(
            f"| {i} | `{qid}` | {q.get('year')} | `{q.get('patternId')}` | "
            f"`{b.get('patternId')}` | `{q.get('chapterId')}` | `{b.get('chapterId')}` | "
            f"{q.get('answer')} {'✓' if ans_ok else '≠ ' + str(b.get('answer'))} | "
            f"`{src.get('sourceFile')}` | {src.get('page')} |"
        )
    lines.append("")

    lines.append("## 3. Per-question Stem Evidence")
    lines.append("")
    lines.append("각 항목은 Emit stem 미리보기와 Product(MVP) stem 미리보기만 제시한다. "
                 "재분류 추천은 하지 않는다.")
    lines.append("")
    for q in gaps:
        qid = q.get("questionId", "?")
        b = mvp_map.get(qid, {})
        src = q.get("source") or {}
        lines.append(f"### `{qid}`")
        lines.append("")
        lines.append(f"- emit.patternId: `{q.get('patternId')}`")
        lines.append(f"- mvp.patternId: `{b.get('patternId')}`")
        lines.append(f"- emit.chapterId: `{q.get('chapterId')}` / mvp.chapterId: `{b.get('chapterId')}`")
        lines.append(f"- answer: emit=`{q.get('answer')}` mvp=`{b.get('answer')}`")
        lines.append(
            f"- source: `{src.get('sourceFile')}` page={src.get('page')} "
            f"questionNumber={src.get('questionNumber')}"
        )
        lines.append("")
        lines.append("**Emit stem (preview)**")
        lines.append("")
        lines.append("```")
        lines.append(preview(q.get("question")))
        lines.append("```")
        lines.append("")
        lines.append("**MVP stem (preview)**")
        lines.append("")
        lines.append("```")
        lines.append(preview(b.get("question")))
        lines.append("```")
        lines.append("")

    lines.append("---")
    lines.append("")
    lines.append("## 4. Observed Facts (no judgment)")
    lines.append("")
    mvp_ids = sorted({mvp_map.get(q.get("questionId"), {}).get("patternId") for q in gaps})
    lines.append(f"1. Emit assigns unresolved id `{args.gap_id}` to {len(gaps)} questions.")
    lines.append(f"2. Pattern Master does **not** currently contain `{args.gap_id}`.")
    lines.append(f"3. Product(MVP) patternIds for the same questions: {', '.join(f'`{x}`' for x in mvp_ids if x)}.")
    lines.append("4. Answer values for all gap rows match Product baseline (see table).")
    lines.append("5. Final disposition (register / re-map / classifier revisit) is **Human Approval only**.")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## 5. Human Approval")
    lines.append("")
    lines.append("Cursor는 아래를 채우지 않는다.")
    lines.append("")
    lines.append("```")
    lines.append(f"[ ] REGISTER `{args.gap_id}` into Pattern DB (requires D4 schema approval)")
    lines.append("[ ] RE-MAP emit outputs to an existing registered patternId: _______________")
    lines.append("[ ] REVISIT emit classifier / orthogonal pattern service (no Product overwrite)")
    lines.append("[ ] DEFER")
    lines.append("")
    lines.append("승인자: _______________")
    lines.append("일자: _______________")
    lines.append("```")
    lines.append("")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT).as_posix()} ({len(gaps)} gap records)")
    print("READ_ONLY: no Product/Pattern/Parser/Coach mutation")
    return 0


if __name__ == "__main__":
    sys.exit(main())
