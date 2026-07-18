#!/usr/bin/env python3
"""Verify working data/*.json matches phase1-v1.0 freeze checksums."""
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "data" / "phase1-freeze-manifest.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    failed = 0

    print("\n=== Phase 1 Freeze Integrity Check ===\n")

    for name, meta in manifest["files"].items():
        working = ROOT / meta["path"]
        frozen = ROOT / meta["frozenPath"]

        for label, path in [("working", working), ("frozen", frozen)]:
            if not path.exists():
                print(f"  FAIL: {label} missing {path}")
                failed += 1
                continue
            digest = sha256(path)
            if digest != meta["sha256"]:
                print(f"  FAIL: {label}/{name} checksum mismatch")
                failed += 1
            else:
                print(f"  PASS: {label}/{name}")

    print(f"\n=== Result: {'PASS' if failed == 0 else f'{failed} failed'} ===\n")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
