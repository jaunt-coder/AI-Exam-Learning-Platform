#!/usr/bin/env python3
"""Promotion Gate for Parser Emit → Product Snapshot (docs/34).

Default: dry-run only (no writes).
Does NOT import or modify scripts/parser or js/coach.

Usage:
  py -3 scripts/promote-parser-emit.py
  py -3 scripts/promote-parser-emit.py --write-candidate
  py -3 scripts/promote-parser-emit.py --apply --approval data/promotion/APPROVAL.md
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EMIT_PATH = ROOT / "data" / "regression" / "parser-emit" / "question-db-parser.json"
MVP_PATH = ROOT / "data" / "question-db-mvp.json"
PATTERN_PATH = ROOT / "data" / "pattern-db-mvp.json"
PROMOTION_DIR = ROOT / "data" / "promotion"
CANDIDATE_PATH = PROMOTION_DIR / "candidate-question-db.json"
BASELINES_DIR = PROMOTION_DIR / "baselines"
MANIFESTS_DIR = PROMOTION_DIR / "manifests"
DEFAULT_APPROVAL = PROMOTION_DIR / "APPROVAL.md"

MVP_YEARS = [2015, 2017, 2018, 2020, 2024, 2025]
EXPECTED_PER_YEAR = 40
EXPECTED_TOTAL = len(MVP_YEARS) * EXPECTED_PER_YEAR

REQUIRED_FIELDS = [
    "questionId",
    "year",
    "subjectId",
    "chapterId",
    "patternId",
    "originalQuestion",
    "question",
    "choices",
    "answer",
    "answerIndex",
    "source",
]


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return h.hexdigest()


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def questions_of(payload: dict) -> list[dict]:
    qs = payload.get("questions")
    if not isinstance(qs, list):
        raise ValueError(f"{payload!r}: questions 배열 없음")
    return qs


def build_candidate(emit: dict) -> dict:
    """Normalize emit envelope for product snapshot. Records kept as-is (incl. provenance)."""
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    questions = questions_of(emit)
    return {
        "version": "mvp-parser-emit-1.0",
        "generatedAt": now,
        "sourceRoot": "source/original-exams",
        "subject": "회계학",
        "questionRange": {"start": 41, "end": 80},
        "metadata": {
            "pipeline": "parser-emit-promotion",
            "emitVersion": emit.get("version"),
            "emitGoal": emit.get("goal"),
            "mvpYears": MVP_YEARS,
            "promotionSpec": "docs/34-truth-split-migration-plan.md",
            "legacySourceDeprecated": "source/past-exams (StudyPiter)",
        },
        "count": len(questions),
        "questions": questions,
    }


def gate_schema(questions: list[dict], pattern_ids: set[str]) -> list[str]:
    failures: list[str] = []
    by_year: dict[int, int] = {y: 0 for y in MVP_YEARS}
    for q in questions:
        qid = q.get("questionId", "?")
        for field in REQUIRED_FIELDS:
            if q.get(field) in (None, "", []):
                failures.append(f"G3 {qid}: `{field}` 누락")
        choices = q.get("choices") or []
        if len(choices) != 5:
            failures.append(f"G3 {qid}: choices={len(choices)}")
        if q.get("answer") != q.get("answerIndex"):
            failures.append(f"G3 {qid}: answer/answerIndex 불일치")
        if q.get("patternId") not in pattern_ids:
            failures.append(f"G6 {qid}: pattern 미연결 ({q.get('patternId')})")
        year = int(q.get("year") or 0)
        if year in by_year:
            by_year[year] += 1
        source = q.get("source") or {}
        for sf in ("sourceFile", "page", "questionNumber"):
            if source.get(sf) in (None, ""):
                failures.append(f"G3 {qid}: source.{sf} 누락")
    if len(questions) != EXPECTED_TOTAL:
        failures.append(f"G2 count={len(questions)} expected={EXPECTED_TOTAL}")
    for year, count in by_year.items():
        if count != EXPECTED_PER_YEAR:
            failures.append(f"G2 {year}년 {count}/{EXPECTED_PER_YEAR}")
    return failures


def gate_answer_invariant(baseline: list[dict], candidate: list[dict]) -> list[str]:
    base = {q["questionId"]: q.get("answer") for q in baseline}
    failures: list[str] = []
    for q in candidate:
        qid = q["questionId"]
        if qid not in base:
            failures.append(f"G5 {qid}: baseline에 없음")
            continue
        if q.get("answer") != base[qid]:
            failures.append(f"G5 {qid}: answer drift {base[qid]} → {q.get('answer')}")
    return failures


def diff_stats(baseline: list[dict], candidate: list[dict]) -> dict[str, int]:
    fields = ["question", "choices", "table", "hasTable", "patternId", "answer", "originalQuestion"]
    bm = {q["questionId"]: q for q in baseline}
    stats = {f: 0 for f in fields}
    for q in candidate:
        b = bm.get(q["questionId"])
        if not b:
            continue
        for f in fields:
            if b.get(f) != q.get(f):
                stats[f] += 1
    return stats


def approval_ok(path: Path) -> bool:
    if not path.exists():
        return False
    text = path.read_text(encoding="utf-8")
    return "APPROVED: YES" in text


def ensure_dirs() -> None:
    BASELINES_DIR.mkdir(parents=True, exist_ok=True)
    MANIFESTS_DIR.mkdir(parents=True, exist_ok=True)


def main() -> int:
    parser = argparse.ArgumentParser(description="Parser Emit Promotion Gate (docs/34)")
    parser.add_argument("--write-candidate", action="store_true", help="Write candidate JSON")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Replace question-db-mvp.json (requires approval)",
    )
    parser.add_argument(
        "--approval",
        type=Path,
        default=DEFAULT_APPROVAL,
        help="Approval file path (must contain APPROVED: YES)",
    )
    parser.add_argument(
        "--diff-errors",
        type=int,
        default=0,
        help="Stage 8 diff error count input (G4). Default 0 assumes clean emit metrics.",
    )
    args = parser.parse_args()

    ensure_dirs()
    failures: list[str] = []

    if not EMIT_PATH.exists():
        print("FAIL G1: emit 파일 없음:", EMIT_PATH)
        return 1
    if not MVP_PATH.exists():
        print("FAIL: MVP 파일 없음:", MVP_PATH)
        return 1
    if not PATTERN_PATH.exists():
        print("FAIL G6: pattern-db-mvp.json 없음")
        return 1

    try:
        emit = load_json(EMIT_PATH)
        mvp = load_json(MVP_PATH)
        patterns = load_json(PATTERN_PATH)
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        print("FAIL G1: JSON 로드 실패:", exc)
        return 1

    pattern_list = patterns if isinstance(patterns, list) else patterns.get("patterns") or []
    pattern_ids = {p.get("patternId") for p in pattern_list if isinstance(p, dict)}

    candidate = build_candidate(emit)
    cand_qs = questions_of(candidate)
    base_qs = questions_of(mvp)

    failures.extend(gate_schema(cand_qs, pattern_ids))
    failures.extend(gate_answer_invariant(base_qs, cand_qs))

    if args.diff_errors != 0:
        failures.append(f"G4 Stage8 diff errors={args.diff_errors} (0 필요)")

    stats = diff_stats(base_qs, cand_qs)
    soft_notes = [
        f"S1 field diffs vs current MVP: {stats}",
        "NOTE: high question/choices/table diffs → Display Acceptance 미달. T4/T5 금지.",
    ]

    print("=== Promotion Gate (docs/34) ===")
    print(f"emit: {EMIT_PATH.relative_to(ROOT)}")
    print(f"mvp:  {MVP_PATH.relative_to(ROOT)}")
    print(f"candidate count: {len(cand_qs)}")
    for note in soft_notes:
        print(note)

    ready = len(failures) == 0
    if failures:
        print("GATE HARD CHECKS: FAIL")
        for item in failures[:40]:
            print(" -", item)
        if len(failures) > 40:
            print(f" - … +{len(failures) - 40} more")
    else:
        print("GATE HARD CHECKS: PASS (G1–G6, G4 via --diff-errors)")

    if stats.get("question", 0) > 0 or stats.get("choices", 0) > 0:
        print("DISPLAY ACCEPTANCE: NOT READY (stem/choices still diverge from current MVP)")
    else:
        print("DISPLAY ACCEPTANCE: soft stem/choices match current MVP")

    print(f"PROMOTION_READY: {'YES' if ready else 'NO'}")

    # Candidate write allowed for inspection even when not ready (T3 shadow).
    if args.write_candidate and not args.apply:
        CANDIDATE_PATH.write_text(
            json.dumps(candidate, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        print("wrote", CANDIDATE_PATH.relative_to(ROOT), "(shadow only)")

    if args.apply:
        if not ready:
            print("apply 거부: hard gate 실패")
            return 1
        if not approval_ok(args.approval):
            print("FAIL G7: approval 없음 또는 'APPROVED: YES' 미포함:", args.approval)
            return 1
        if stats.get("question", 0) > 0:
            print(
                "FAIL: refusing apply while question text differs from MVP. "
                "Pass Display Acceptance (docs/34 §4.3) first, or use future canary flags."
            )
            return 1
        CANDIDATE_PATH.write_text(
            json.dumps(candidate, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        baseline = BASELINES_DIR / f"mvp-before-{ts}.json"
        shutil.copy2(MVP_PATH, baseline)
        print("backup", baseline.relative_to(ROOT))
        tmp = MVP_PATH.with_suffix(".json.tmp")
        tmp.write_text(
            json.dumps(candidate, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        tmp.replace(MVP_PATH)
        manifest = {
            "timestamp": ts,
            "emitSha256": sha256_file(EMIT_PATH),
            "mvpSha256": sha256_file(MVP_PATH),
            "baseline": str(baseline.relative_to(ROOT)),
            "diffStatsVsPreviousMvp": stats,
            "approval": str(args.approval),
            "spec": "docs/34-truth-split-migration-plan.md",
        }
        manifest_path = MANIFESTS_DIR / f"promotion-{ts}.json"
        manifest_path.write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        print("APPLY OK →", MVP_PATH.relative_to(ROOT))
        print("manifest", manifest_path.relative_to(ROOT))
        print("Next: validate-question-db-mvp.py → git commit → release")
        return 0

    print("MODE: dry-run (no product change). Use --write-candidate or --apply when ready.")
    # T1 analysis succeeds even when not promotion-ready.
    return 0


if __name__ == "__main__":
    sys.exit(main())
