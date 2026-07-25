#!/usr/bin/env python3
"""Phase 2.5 — Parser Quality Completion pipeline."""
from __future__ import annotations

import json
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

from exam_pipeline.repair_quality import (  # noqa: E402
    EXPECTED_TOTAL,
    MVP_YEARS,
    build_repair_queue,
    compute_regression_metrics,
    metrics_to_dict,
    write_layer_reports,
    write_regression_report,
    write_repair_queue,
)

DATA = ROOT / "data"
REPAIR = DATA / "repair"
QUESTION_DB = DATA / "question-db-mvp.json"
QUEUE_JSON = REPAIR / "repair-queue.json"
BEFORE_JSON = REPAIR / "regression-before.json"
AFTER_JSON = REPAIR / "regression-after.json"
LAYER_DIR = REPAIR / "layer-analysis"
REPORT_MD = ROOT / "docs" / "parser-quality-regression.md"


def load_questions() -> list[dict]:
    payload = json.loads(QUESTION_DB.read_text(encoding="utf-8"))
    return payload if isinstance(payload, list) else payload.get("questions") or []


def save_metrics(path: Path, metrics) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(
            {"generatedAt": date.today().isoformat(), "metrics": metrics_to_dict(metrics)},
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )


def print_metrics(label: str, metrics) -> None:
    print(f"\n{label}")
    print(f"  repair_queue_size: {metrics.repair_queue_size}")
    print(f"  stem_truncated: {metrics.stem_truncated}")
    print(f"  missing_numbers: {metrics.missing_numbers}")
    print(f"  missing_units: {metrics.missing_units}")
    print(f"  choice_split: {metrics.choice_split}")
    print(f"  duplicate_context: {metrics.duplicate_context}")
    print(f"  table_parse: {metrics.table_parse}")
    print(f"  ocr_glued_hangul: {metrics.ocr_glued_hangul}")
    print(f"  source_fidelity_avg: {metrics.source_fidelity_avg:.2%}")
    print(f"  fidelity_below_99%: {metrics.source_fidelity_below_99}")


def run_snapshot(label: str, out_path: Path) -> object:
    questions = load_questions()
    if len(questions) != EXPECTED_TOTAL:
        print(f"FAIL: expected {EXPECTED_TOTAL} questions, got {len(questions)}")
        sys.exit(1)
    metrics = compute_regression_metrics(questions)
    save_metrics(out_path, metrics)
    print_metrics(label, metrics)
    return metrics


def run_queue() -> list[dict]:
    questions = load_questions()
    queue = build_repair_queue(questions)
    summary = {
        "total": EXPECTED_TOTAL,
        "queueSize": len(queue),
        "byYear": {},
    }
    for item in queue:
        summary["byYear"][item["year"]] = summary["byYear"].get(item["year"], 0) + 1
    write_repair_queue(QUEUE_JSON, queue, summary)
    print(f"\nRepair Queue: {len(queue)}/{EXPECTED_TOTAL} → {QUEUE_JSON}")
    for year in MVP_YEARS:
        count = summary["byYear"].get(year, 0)
        if count:
            print(f"  {year}: {count}")
    return queue


def run_layer_analysis(queue: list[dict]) -> None:
    questions = load_questions()
    by_id = {q["questionId"]: q for q in questions}
    write_layer_reports(queue, by_id, LAYER_DIR)
    print(f"Layer analysis written: {LAYER_DIR} ({len(queue)} files)")


def main() -> int:
    import argparse

    parser = argparse.ArgumentParser(description="Parser quality repair pipeline")
    parser.add_argument(
        "command",
        choices=["snapshot-before", "queue", "layers", "rebuild", "snapshot-after", "report", "all"],
        help="pipeline step",
    )
    args = parser.parse_args()

    if args.command == "snapshot-before":
        run_snapshot("BEFORE metrics", BEFORE_JSON)
        return 0

    if args.command == "queue":
        run_queue()
        return 0

    if args.command == "layers":
        if not QUEUE_JSON.exists():
            queue = run_queue()
        else:
            queue = json.loads(QUEUE_JSON.read_text(encoding="utf-8"))["questions"]
        run_layer_analysis(queue)
        return 0

    if args.command == "rebuild":
        import subprocess

        result = subprocess.run(
            [sys.executable, str(ROOT / "scripts" / "build-question-db-v3.py")],
            cwd=str(ROOT),
            check=False,
        )
        return result.returncode

    if args.command == "snapshot-after":
        run_snapshot("AFTER metrics", AFTER_JSON)
        return 0

    if args.command == "report":
        if not BEFORE_JSON.exists() or not AFTER_JSON.exists():
            print("FAIL: run snapshot-before and snapshot-after first")
            return 1
        before_payload = json.loads(BEFORE_JSON.read_text(encoding="utf-8"))["metrics"]
        after_payload = json.loads(AFTER_JSON.read_text(encoding="utf-8"))["metrics"]
        from exam_pipeline.repair_quality import RegressionMetrics

        before = RegressionMetrics(**before_payload)
        after = RegressionMetrics(**after_payload)
        write_regression_report(REPORT_MD, before, after)
        print(f"Report: {REPORT_MD}")
        print_metrics("BEFORE", before)
        print_metrics("AFTER", after)
        print(
            f"\nRepair Queue: {before.repair_queue_size} → {after.repair_queue_size} "
            f"(Δ {after.repair_queue_size - before.repair_queue_size:+d})"
        )
        return 0

    if args.command == "all":
        before = run_snapshot("BEFORE metrics", BEFORE_JSON)
        queue = run_queue()
        run_layer_analysis(queue)
        import subprocess

        code = subprocess.run(
            [sys.executable, str(ROOT / "scripts" / "build-question-db-v3.py")],
            cwd=str(ROOT),
            check=False,
        ).returncode
        if code != 0:
            return code
        after = run_snapshot("AFTER metrics", AFTER_JSON)
        write_regression_report(REPORT_MD, before, after)
        print(f"\nReport: {REPORT_MD}")
        print(
            f"Repair Queue: {before.repair_queue_size} → {after.repair_queue_size} "
            f"(Δ {after.repair_queue_size - before.repair_queue_size:+d})"
        )
        return 0

    return 1


if __name__ == "__main__":
    sys.exit(main())
