#!/usr/bin/env python3
"""Display Acceptance sampler + hasTable regression extractor (read-only).

Usage:
  py -3 scripts/promotion/display-acceptance-sampler.py
  py -3 scripts/promotion/display-acceptance-sampler.py --seed 20260720 --per-year 5
"""
from __future__ import annotations

import argparse
import json
import random
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CANDIDATE = ROOT / "data" / "promotion" / "candidate-question-db.json"
EMIT = ROOT / "data" / "regression" / "parser-emit" / "question-db-parser.json"
MVP = ROOT / "data" / "question-db-mvp.json"
SAMPLE_OUT = ROOT / "data" / "promotion" / "display-acceptance-sample.md"
HASTABLE_OUT = ROOT / "data" / "promotion" / "hastable-regression-candidates.md"

MVP_YEARS = [2015, 2017, 2018, 2020, 2024, 2025]
PREVIEW = 420


def load_questions(path: Path) -> list[dict]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    qs = payload.get("questions")
    if not isinstance(qs, list):
        raise ValueError(f"{path}: questions 배열 없음")
    return qs


def preview(text: object, limit: int = PREVIEW) -> str:
    if text is None:
        return "(null)"
    if isinstance(text, list):
        raw = " | ".join(str(x) for x in text)
    else:
        raw = str(text)
    compact = " ".join(raw.replace("\r\n", "\n").split())
    if len(compact) <= limit:
        return compact
    return compact[: limit - 1] + "…"


def field_differs(a: object, b: object) -> bool:
    return a != b


def write_sample_report(
    cand_map: dict[str, dict],
    mvp_map: dict[str, dict],
    samples: list[str],
    seed: int,
    per_year: int,
    source_path: Path,
) -> None:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    lines: list[str] = []
    lines.append("# Display Acceptance Sample Report")
    lines.append("")
    lines.append(f"Generated: {now}")
    lines.append("Mode: **Read-only stratified sample — no Product overwrite**")
    lines.append(f"Seed: `{seed}` / per-year: `{per_year}` / total samples: `{len(samples)}`")
    lines.append(f"Candidate: `{source_path.relative_to(ROOT).as_posix()}`")
    lines.append(f"Product: `{MVP.relative_to(ROOT).as_posix()}`")
    lines.append("")
    lines.append("표본은 `question`/`choices`/`table` 중 하나라도 다른 questionId에서만 추출했다.")
    lines.append("최종 Display Acceptance는 Human Review.")
    lines.append("")

    by_year: dict[int, list[str]] = {y: [] for y in MVP_YEARS}
    for qid in samples:
        year = int(cand_map[qid].get("year") or 0)
        by_year.setdefault(year, []).append(qid)

    for year in MVP_YEARS:
        lines.append(f"## Year {year}")
        lines.append("")
        year_ids = by_year.get(year) or []
        if not year_ids:
            lines.append("_No samples_")
            lines.append("")
            continue
        for qid in year_ids:
            c = cand_map[qid]
            b = mvp_map[qid]
            src = c.get("source") or {}
            diffs = []
            for f in ("question", "choices", "table", "hasTable", "patternId", "originalQuestion"):
                if field_differs(c.get(f), b.get(f)):
                    diffs.append(f)
            lines.append(f"### `{qid}`")
            lines.append("")
            lines.append(
                f"- source: `{src.get('sourceFile')}` page={src.get('page')} "
                f"q#={src.get('questionNumber')}"
            )
            lines.append(f"- differing fields: {', '.join(f'`{d}`' for d in diffs) or '(none)'}")
            lines.append(f"- answer: MVP=`{b.get('answer')}` Candidate=`{c.get('answer')}`")
            lines.append("")
            lines.append("| Field | MVP (OLD) | Candidate (NEW) |")
            lines.append("|---|---|---|")
            for f in ("question", "choices", "table", "hasTable", "patternId"):
                lines.append(
                    f"| `{f}` | `{preview(b.get(f), 200)}` | `{preview(c.get(f), 200)}` |"
                )
            lines.append("")
            lines.append("<details><summary>Longer previews</summary>")
            lines.append("")
            lines.append("**MVP question**")
            lines.append("")
            lines.append("```")
            lines.append(preview(b.get("question"), 800))
            lines.append("```")
            lines.append("")
            lines.append("**Candidate question**")
            lines.append("")
            lines.append("```")
            lines.append(preview(c.get("question"), 800))
            lines.append("```")
            lines.append("")
            lines.append("**MVP choices**")
            lines.append("")
            lines.append("```")
            lines.append(preview(b.get("choices"), 800))
            lines.append("```")
            lines.append("")
            lines.append("**Candidate choices**")
            lines.append("")
            lines.append("```")
            lines.append(preview(c.get("choices"), 800))
            lines.append("```")
            lines.append("")
            lines.append("</details>")
            lines.append("")

    lines.append("---")
    lines.append("")
    lines.append("## Human Approval")
    lines.append("")
    lines.append("```")
    lines.append("[ ] SAMPLE REVIEWED — Display Acceptance 진행 가능 의견: _______________")
    lines.append("[ ] NEED MORE SAMPLES")
    lines.append("[ ] BLOCK PROMOTION")
    lines.append("")
    lines.append("승인자: _______________")
    lines.append("일자: _______________")
    lines.append("```")
    lines.append("")

    SAMPLE_OUT.parent.mkdir(parents=True, exist_ok=True)
    SAMPLE_OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_hastable_report(
    cand_map: dict[str, dict],
    mvp_map: dict[str, dict],
    removals: list[str],
    source_path: Path,
) -> None:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    lines: list[str] = []
    lines.append("# hasTable Regression Candidates (MVP True → Candidate False)")
    lines.append("")
    lines.append(f"Generated: {now}")
    lines.append("Mode: **Full enumeration (not a sample) — read-only**")
    lines.append(f"Count: **{len(removals)}**")
    lines.append(f"Candidate: `{source_path.relative_to(ROOT).as_posix()}`")
    lines.append(f"Product: `{MVP.relative_to(ROOT).as_posix()}`")
    lines.append("")
    lines.append("학생 화면에서 표가 사라질 수 있는 후보. Human Review 필수.")
    lines.append("")
    lines.append("| # | questionId | year | page | sourceFile | MVP hasTable | Candidate hasTable | MVP table preview |")
    lines.append("|---:|---|---:|---:|---|---|---|---|")
    for i, qid in enumerate(removals, start=1):
        c = cand_map[qid]
        b = mvp_map[qid]
        src = c.get("source") or {}
        lines.append(
            f"| {i} | `{qid}` | {c.get('year')} | {src.get('page')} | "
            f"`{src.get('sourceFile')}` | `{b.get('hasTable')}` | `{c.get('hasTable')}` | "
            f"`{preview(b.get('table'), 120)}` |"
        )
    lines.append("")

    for qid in removals:
        c = cand_map[qid]
        b = mvp_map[qid]
        src = c.get("source") or {}
        lines.append(f"## `{qid}`")
        lines.append("")
        lines.append(
            f"- source: `{src.get('sourceFile')}` page={src.get('page')} "
            f"q#={src.get('questionNumber')}"
        )
        lines.append(f"- MVP hasTable=`{b.get('hasTable')}` tablePresent={bool(b.get('table'))}")
        lines.append(f"- Candidate hasTable=`{c.get('hasTable')}` tablePresent={bool(c.get('table'))}")
        lines.append("")
        lines.append("**MVP table**")
        lines.append("")
        lines.append("```")
        lines.append(preview(b.get("table"), 1200))
        lines.append("```")
        lines.append("")
        lines.append("**Candidate table**")
        lines.append("")
        lines.append("```")
        lines.append(preview(c.get("table"), 400))
        lines.append("```")
        lines.append("")
        lines.append("**MVP question preview**")
        lines.append("")
        lines.append("```")
        lines.append(preview(b.get("question"), 400))
        lines.append("```")
        lines.append("")
        lines.append("**Candidate question preview**")
        lines.append("")
        lines.append("```")
        lines.append(preview(c.get("question"), 400))
        lines.append("```")
        lines.append("")

    lines.append("---")
    lines.append("")
    lines.append("## Human Approval")
    lines.append("")
    lines.append("```")
    lines.append("[ ] ALL 25 REVIEWED — true regressions: _____ / false alarms: _____")
    lines.append("[ ] BLOCK until table removals resolved")
    lines.append("[ ] ACCEPT with known exceptions (list IDs): _______________")
    lines.append("")
    lines.append("승인자: _______________")
    lines.append("일자: _______________")
    lines.append("```")
    lines.append("")

    HASTABLE_OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Display acceptance sampler (read-only)")
    parser.add_argument("--seed", type=int, default=20260720)
    parser.add_argument("--per-year", type=int, default=5)
    parser.add_argument("--candidate", type=Path, default=CANDIDATE)
    args = parser.parse_args()

    source_path = args.candidate if args.candidate.exists() else EMIT
    if not source_path.exists() or not MVP.exists():
        print("FAIL: candidate/emit 또는 MVP 없음", file=sys.stderr)
        return 1

    cand_qs = load_questions(source_path)
    mvp_qs = load_questions(MVP)
    cand_map = {q["questionId"]: q for q in cand_qs}
    mvp_map = {q["questionId"]: q for q in mvp_qs}

    # Stratified pool: IDs with content diffs
    pools: dict[int, list[str]] = {y: [] for y in MVP_YEARS}
    removals: list[str] = []
    for qid, c in cand_map.items():
        b = mvp_map.get(qid)
        if not b:
            continue
        year = int(c.get("year") or 0)
        content_diff = any(
            field_differs(c.get(f), b.get(f)) for f in ("question", "choices", "table")
        )
        if content_diff and year in pools:
            pools[year].append(qid)
        if b.get("hasTable") is True and c.get("hasTable") is False:
            removals.append(qid)

    rng = random.Random(args.seed)
    samples: list[str] = []
    for year in MVP_YEARS:
        pool = sorted(pools[year])
        if len(pool) <= args.per_year:
            chosen = pool
        else:
            chosen = sorted(rng.sample(pool, args.per_year))
        samples.extend(chosen)

    removals = sorted(
        removals,
        key=lambda qid: (
            int(cand_map[qid].get("year") or 0),
            int((cand_map[qid].get("source") or {}).get("questionNumber") or 0),
        ),
    )

    write_sample_report(cand_map, mvp_map, samples, args.seed, args.per_year, source_path)
    write_hastable_report(cand_map, mvp_map, removals, source_path)

    print(f"wrote {SAMPLE_OUT.relative_to(ROOT).as_posix()} ({len(samples)} samples)")
    print(f"wrote {HASTABLE_OUT.relative_to(ROOT).as_posix()} ({len(removals)} removals)")
    print("READ_ONLY: no Product/Pattern/Parser/Coach mutation")
    return 0


if __name__ == "__main__":
    sys.exit(main())
