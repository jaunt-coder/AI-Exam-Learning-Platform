#!/usr/bin/env python3
"""Build / verify RC1 baseline SHA-256 manifest (RC2-E8).

Read-only by default (--verify). Does not modify Product, Pattern, or Parser trees.

Usage:
  py -3 scripts/regression/build-baseline-manifest.py
  py -3 scripts/regression/build-baseline-manifest.py --verify
  py -3 scripts/regression/build-baseline-manifest.py --write
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).resolve().parent))

from lib_hash import hash_target  # noqa: E402

MANIFEST_PATH = ROOT / "data" / "regression" / "rc1-baseline-manifest.json"

# Locked to docs/release/RC1-BASELINE.md (2026-07-20).
RC1_COMPONENTS: list[dict] = [
    {
        "id": "parser-core",
        "label": "Parser Core",
        "path": "scripts/parser",
        "kind": "directory",
        "expectedSha256": "dfaa7b50425789e2cc765c041dd7549eaa2c810e64fc3fed0f6972442b6ff031",
        "expectedFileCount": 19,
    },
    {
        "id": "emit",
        "label": "Emit",
        "path": "data/regression/parser-emit/question-db-parser.json",
        "kind": "file",
        "expectedSha256": "4aebf14eef76b47425605512163c97eb66a2a050ab25bbf570f28624385dd935",
        "expectedFileCount": 1,
    },
    {
        "id": "pattern-db",
        "label": "Pattern DB",
        "path": "data/pattern-db-mvp.json",
        "kind": "file",
        "expectedSha256": "0a97e796cefba51381ae3721e5d50bbb0e6c04714e5cdf861eeabe0fc18699fd",
        "expectedFileCount": 1,
    },
    {
        "id": "product-snapshot",
        "label": "Product Snapshot",
        "path": "data/question-db-mvp.json",
        "kind": "file",
        "expectedSha256": "0cfcaa317bc25c811cebb48e3b53218556b2320f9c3538b2d4583ba9d16a9629",
        "expectedFileCount": 1,
    },
    {
        "id": "coach-layer",
        "label": "Coach Layer",
        "path": "js/coach",
        "kind": "directory",
        "expectedSha256": "cf7325be3f8849cd99410901db47f121dbf343e5039c435e8e5949305c234db6",
        "expectedFileCount": 15,
    },
    {
        "id": "promotion-scripts",
        "label": "Promotion analysis scripts",
        "path": "scripts/promotion",
        "kind": "directory",
        "expectedSha256": "f9079a5dcb6ddc9c747714c12e06241b5dfeaf40cc4824668172a0d79b56a523",
        "expectedFileCount": 3,
        "auxiliary": True,
    },
]

ALGORITHM = {
    "file": "sha256(file bytes)",
    "directory": (
        "sha256 over sorted pairs: relativePath UTF-8 + NUL + fileSha256 hex ASCII + LF; "
        "exclude __pycache__ and *.pyc"
    ),
    "ref": "docs/release/RC1-BASELINE.md",
}


def compute_component(spec: dict) -> dict:
    path = ROOT / spec["path"]
    actual_sha, file_count = hash_target(path, spec["kind"])
    expected = spec["expectedSha256"]
    return {
        "id": spec["id"],
        "label": spec["label"],
        "path": spec["path"],
        "kind": spec["kind"],
        "sha256": actual_sha,
        "fileCount": file_count,
        "expectedSha256": expected,
        "expectedFileCount": spec["expectedFileCount"],
        "match": actual_sha == expected and file_count == spec["expectedFileCount"],
        "auxiliary": bool(spec.get("auxiliary")),
    }


def build_manifest(results: list[dict]) -> dict:
    return {
        "manifestId": "rc1-baseline",
        "version": "RC1",
        "captured": "2026-07-20",
        "spec": "docs/release/RC1-BASELINE.md",
        "workOrder": "WO-20260721-001",
        "sprint": "RC2-E8",
        "algorithm": ALGORITHM,
        "components": [
            {
                "id": r["id"],
                "label": r["label"],
                "path": r["path"],
                "kind": r["kind"],
                "sha256": r["expectedSha256"],
                "fileCount": r["expectedFileCount"],
                "auxiliary": r["auxiliary"],
            }
            for r in results
        ],
        "notes": [
            "Baseline is for drift detection only.",
            "Does not imply Promotion Apply or code freeze commit.",
            "PROMOTION_READY and ADR-001/G6 are out of scope for this harness.",
        ],
    }


def verify() -> int:
    print("=== RC1 Baseline Manifest Verify ===")
    print(f"root: {ROOT}")
    failures: list[str] = []
    results: list[dict] = []
    for spec in RC1_COMPONENTS:
        try:
            result = compute_component(spec)
        except (OSError, FileNotFoundError, ValueError) as exc:
            failures.append(f"{spec['id']}: {exc}")
            print(f"FAIL {spec['id']}: {exc}")
            continue
        results.append(result)
        status = "PASS" if result["match"] else "DRIFT"
        print(
            f"{status} {result['id']}: sha={result['sha256'][:12]}... "
            f"files={result['fileCount']} path={result['path']}"
        )
        if not result["match"]:
            failures.append(
                f"{result['id']}: expected {result['expectedSha256']} "
                f"(files={result['expectedFileCount']}), "
                f"got {result['sha256']} (files={result['fileCount']})"
            )

    if MANIFEST_PATH.is_file():
        try:
            locked = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
            by_id = {c["id"]: c for c in locked.get("components", [])}
            for result in results:
                locked_c = by_id.get(result["id"])
                if not locked_c:
                    failures.append(f"manifest missing component: {result['id']}")
                    continue
                if locked_c.get("sha256") != result["expectedSha256"]:
                    failures.append(
                        f"manifest lock drift for {result['id']}: "
                        f"file expectedSha != manifest sha256"
                    )
                if result["sha256"] != locked_c.get("sha256"):
                    failures.append(
                        f"working tree != locked manifest for {result['id']}"
                    )
        except (OSError, json.JSONDecodeError, TypeError) as exc:
            failures.append(f"manifest read failed: {exc}")
    else:
        print("NOTE: locked manifest file absent - comparing RC1-BASELINE constants only")

    if failures:
        print("RESULT: FAIL")
        for item in failures:
            print(" -", item)
        return 1
    print("RESULT: PASS")
    return 0


def write_manifest() -> int:
    results: list[dict] = []
    for spec in RC1_COMPONENTS:
        results.append(compute_component(spec))
    # Always lock to RC1 expected values (not current tree), so drift remains detectable.
    payload = build_manifest(results)
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print("wrote", MANIFEST_PATH.relative_to(ROOT).as_posix())
    drifted = [r["id"] for r in results if not r["match"]]
    if drifted:
        print("WARNING: working tree currently drifts from RC1 for:", ", ".join(drifted))
        print("Manifest locked to RC1 expected SHA values regardless.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="RC1 baseline SHA-256 manifest (read-only verify by default)"
    )
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument(
        "--verify",
        action="store_true",
        default=False,
        help="Verify working tree against RC1 SHA (default if no flag)",
    )
    mode.add_argument(
        "--write",
        action="store_true",
        help="Write data/regression/rc1-baseline-manifest.json locked to RC1 SHA",
    )
    args = parser.parse_args()
    if args.write:
        return write_manifest()
    return verify()


if __name__ == "__main__":
    sys.exit(main())
