#!/usr/bin/env python3
"""Unified read-only Regression / Gate runner (RC2-E8).

Steps:
  1. RC1 baseline SHA verify
  2. Promotion dry-run evidence reproduction
  3. Optional Coach C1-C3 validators (read-only flags only)

Never provides --apply. Never runs Path L / repair / parser recompile.

Usage:
  py -3 scripts/regression/run-regression-gates.py
"""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REGRESSION = Path(__file__).resolve().parent

STEPS = [
    {
        "id": "baseline-verify",
        "label": "RC1 baseline SHA verify",
        "argv": [sys.executable, str(REGRESSION / "build-baseline-manifest.py"), "--verify"],
    },
    {
        "id": "promotion-dry-run",
        "label": "Promotion dry-run evidence",
        "argv": [sys.executable, str(REGRESSION / "reproduce-promotion-evidence.py")],
    },
    {
        "id": "coach-c1",
        "label": "Coach C1 smoke",
        "argv": [sys.executable, str(ROOT / "scripts" / "validate-coach-phase1.py")],
        "optional": True,
    },
    {
        "id": "coach-c2",
        "label": "Coach C2 smoke",
        "argv": [sys.executable, str(ROOT / "scripts" / "validate-coach-phase2.py")],
        "optional": True,
    },
    {
        "id": "coach-c3",
        "label": "Coach C3 smoke",
        "argv": [sys.executable, str(ROOT / "scripts" / "validate-coach-phase3.py")],
        "optional": True,
    },
]


def run_step(step: dict) -> tuple[str, int]:
    script = Path(step["argv"][1])
    if step.get("optional") and not script.is_file():
        return "SKIP", 0
    # Absolute refuse if any forbidden flag sneaks into argv.
    forbidden = {"--apply", "--write-candidate", "--write-mock", "--write-baseline"}
    if forbidden.intersection(step["argv"]):
        print(f"REFUSED {step['id']}: forbidden flag in harness argv")
        return "REFUSED", 2
    proc = subprocess.run(
        step["argv"],
        cwd=str(ROOT),
        check=False,
    )
    status = "PASS" if proc.returncode == 0 else "FAIL"
    return status, proc.returncode


def main() -> int:
    parser = argparse.ArgumentParser(
        description="RC2-E8 regression/gate harness (read-only)"
    )
    parser.add_argument(
        "--skip-coach",
        action="store_true",
        help="Skip optional Coach C1-C3 smoke steps",
    )
    args = parser.parse_args()

    if "--apply" in sys.argv:
        print("REFUSED: --apply is not supported by this harness")
        return 2

    print("=== RC2-E8 Regression & Gate Harness (read-only) ===")
    print(f"root: {ROOT}")
    print("mode: verify + dry-run evidence (no Product/Pattern writes)")
    print()

    summary: list[tuple[str, str, int]] = []
    for step in STEPS:
        if args.skip_coach and step["id"].startswith("coach-"):
            summary.append((step["id"], "SKIP", 0))
            print(f"SKIP {step['id']}: {step['label']}")
            continue
        print(f"--- {step['id']}: {step['label']} ---")
        status, code = run_step(step)
        summary.append((step["id"], status, code))
        print(f"-> {status} (exit={code})")
        print()

    print("=== Summary ===")
    failed = 0
    for step_id, status, code in summary:
        print(f"{status:7} {step_id} (exit={code})")
        if status == "FAIL" or status == "REFUSED":
            failed += 1

    if failed:
        print("HARNESS: FAIL")
        return 1
    print("HARNESS: PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
