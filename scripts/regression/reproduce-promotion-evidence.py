#!/usr/bin/env python3
"""Reproduce Promotion Gate dry-run evidence (RC2-E8).

Invokes scripts/promote-parser-emit.py with NO flags (dry-run only).
Never passes --apply or --write-candidate.
Does not modify PROMOTION_READY semantics — records stdout as evidence only.

Usage:
  py -3 scripts/regression/reproduce-promotion-evidence.py
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PROMOTE = ROOT / "scripts" / "promote-parser-emit.py"
EVIDENCE_DIR = ROOT / "data" / "regression" / "gate-evidence"

PROMOTION_READY_RE = re.compile(r"^PROMOTION_READY:\s*(YES|NO)\s*$", re.MULTILINE)
GATE_HARD_RE = re.compile(r"^GATE HARD CHECKS:\s*(PASS|FAIL).*$", re.MULTILINE)


def run_dry_run() -> tuple[int, str]:
    if not PROMOTE.is_file():
        raise FileNotFoundError(f"missing promotion script: {PROMOTE}")
    # Explicit argv: script path only — never --apply / --write-candidate.
    cmd = [sys.executable, str(PROMOTE)]
    proc = subprocess.run(
        cmd,
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
    )
    combined = (proc.stdout or "") + (("\n" + proc.stderr) if proc.stderr else "")
    return proc.returncode, combined


def parse_markers(stdout: str) -> dict:
    ready_m = PROMOTION_READY_RE.search(stdout)
    hard_m = GATE_HARD_RE.search(stdout)
    return {
        "promotionReadyObserved": ready_m.group(1) if ready_m else None,
        "gateHardChecksObserved": hard_m.group(1) if hard_m else None,
    }


def emit_console(text: str) -> None:
    """Print without crashing on Windows cp949 consoles."""
    payload = text if text.endswith("\n") else text + "\n"
    try:
        sys.stdout.write(payload)
    except UnicodeEncodeError:
        encoding = getattr(sys.stdout, "encoding", None) or "utf-8"
        raw = payload.encode(encoding, errors="replace")
        buf = getattr(sys.stdout, "buffer", None)
        if buf is not None:
            buf.write(raw)
        else:
            sys.stdout.write(raw.decode(encoding, errors="replace"))


def write_evidence(returncode: int, stdout: str) -> Path:
    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    markers = parse_markers(stdout)
    meta = {
        "workOrder": "WO-20260721-001",
        "sprint": "RC2-E8",
        "timestamp": ts,
        "mode": "dry-run",
        "command": ["py", "-3", "scripts/promote-parser-emit.py"],
        "forbiddenFlags": ["--apply", "--write-candidate"],
        "returncode": returncode,
        "productTouched": False,
        "patternTouched": False,
        "notes": [
            "Evidence reproduction only.",
            "Does not change PROMOTION_READY policy or resolve G6/ADR-001.",
            "Observed READY value is recorded, not rewritten.",
        ],
        **markers,
    }
    md_path = EVIDENCE_DIR / f"promotion-dry-run-{ts}.md"
    json_path = EVIDENCE_DIR / f"promotion-dry-run-{ts}.json"

    lines = [
        "# Promotion Dry-Run Evidence",
        "",
        f"Generated: {ts}",
        f"Work Order: WO-20260721-001 (RC2-E8)",
        "",
        "## Command",
        "",
        "```",
        "py -3 scripts/promote-parser-emit.py",
        "```",
        "",
        "- `--apply`: **not invoked**",
        "- `--write-candidate`: **not invoked**",
        "",
        "## Observed Markers",
        "",
        f"- GATE HARD CHECKS: `{markers['gateHardChecksObserved']}`",
        f"- PROMOTION_READY (observed only): `{markers['promotionReadyObserved']}`",
        f"- process returncode: `{returncode}`",
        "",
        "## Stdout",
        "",
        "```",
        stdout.rstrip(),
        "```",
        "",
    ]
    md_path.write_text("\n".join(lines), encoding="utf-8")
    json_path.write_text(
        json.dumps(meta, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    # Keep a stable pointer for CI-assist.
    latest = EVIDENCE_DIR / "promotion-dry-run-latest.json"
    latest.write_text(
        json.dumps({**meta, "markdown": md_path.name}, ensure_ascii=False, indent=2)
        + "\n",
        encoding="utf-8",
    )
    return md_path


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Reproduce promotion dry-run evidence (no apply)"
    )
    parser.add_argument(
        "--no-write",
        action="store_true",
        help="Print stdout only; do not write evidence files",
    )
    args = parser.parse_args()

    # Hard guard: reject if someone wraps this script with apply somehow.
    if any(flag in sys.argv for flag in ("--apply", "--write-candidate")):
        print("REFUSED: --apply / --write-candidate are forbidden in this harness")
        return 2

    try:
        code, stdout = run_dry_run()
    except (OSError, FileNotFoundError) as exc:
        print("FAIL:", exc)
        return 1

    if not args.no_write:
        path = write_evidence(code, stdout)
        emit_console(stdout)
        emit_console(f"evidence: {path.relative_to(ROOT).as_posix()}")
    else:
        emit_console(stdout)

    # promote-parser-emit dry-run returns 0 even when READY=NO (analysis success).
    # Harness treats process failure as failure; READY=NO is expected evidence, not a harness fail.
    return 0 if code == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
