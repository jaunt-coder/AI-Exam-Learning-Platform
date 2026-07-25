#!/usr/bin/env python3
"""Tests for RC2-E8 baseline hash / manifest harness (offline, deterministic).

Run:
  py -3 tests/regression/test_baseline_manifest.py
"""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REGRESSION = ROOT / "scripts" / "regression"
sys.path.insert(0, str(REGRESSION))

from lib_hash import (  # noqa: E402
    collect_file_digests,
    sha256_directory,
    sha256_file,
)


class TestLibHash(unittest.TestCase):
    def test_file_hash_deterministic(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "a.bin"
            path.write_bytes(b"rc2-e8")
            self.assertEqual(sha256_file(path), sha256_file(path))
            self.assertEqual(
                sha256_file(path),
                hashlib.sha256(b"rc2-e8").hexdigest(),
            )

    def test_directory_algorithm_matches_rc1_formula(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "b.txt").write_text("b", encoding="utf-8")
            (root / "a.txt").write_text("a", encoding="utf-8")
            sub = root / "sub"
            sub.mkdir()
            (sub / "c.txt").write_text("c", encoding="utf-8")
            (root / "__pycache__").mkdir()
            (root / "__pycache__" / "x.pyc").write_bytes(b"ignore")
            (root / "skip.pyc").write_bytes(b"ignore")

            pairs = collect_file_digests(root)
            rels = [r for r, _ in pairs]
            self.assertEqual(rels, ["a.txt", "b.txt", "sub/c.txt"])

            expected = hashlib.sha256()
            for rel, dig in pairs:
                expected.update(rel.encode("utf-8") + b"\0" + dig.encode("ascii") + b"\n")
            self.assertEqual(sha256_directory(root), expected.hexdigest())

    def test_rc1_parser_directory_hash_locked(self) -> None:
        """Working tree scripts/parser must match RC1-BASELINE directory SHA."""
        parser_dir = ROOT / "scripts" / "parser"
        if not parser_dir.is_dir():
            self.skipTest("scripts/parser missing")
        got = sha256_directory(parser_dir)
        self.assertEqual(
            got,
            "dfaa7b50425789e2cc765c041dd7549eaa2c810e64fc3fed0f6972442b6ff031",
        )


class TestHarnessGuards(unittest.TestCase):
    def test_reproduce_script_source_forbids_apply(self) -> None:
        text = (REGRESSION / "reproduce-promotion-evidence.py").read_text(encoding="utf-8")
        self.assertIn("Never passes --apply", text)
        self.assertIn("cmd = [sys.executable, str(PROMOTE)]", text)
        self.assertIn("forbiddenFlags", text)
        self.assertIn(
            'flag in sys.argv for flag in ("--apply", "--write-candidate")',
            text,
        )

    def test_runner_has_no_apply_argument(self) -> None:
        text = (REGRESSION / "run-regression-gates.py").read_text(encoding="utf-8")
        self.assertIn("Never provides --apply", text)
        proc = subprocess.run(
            [sys.executable, str(REGRESSION / "run-regression-gates.py"), "--help"],
            cwd=str(ROOT),
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            check=False,
        )
        self.assertEqual(proc.returncode, 0, msg=proc.stderr or proc.stdout)
        # argparse must not expose an --apply option (mention in epilog/docs is ok in source).
        help_opts = [
            line.strip()
            for line in (proc.stdout or "").splitlines()
            if line.strip().startswith("--")
        ]
        self.assertFalse(any(opt.startswith("--apply") for opt in help_opts))

    def test_locked_manifest_shape(self) -> None:
        path = ROOT / "data" / "regression" / "rc1-baseline-manifest.json"
        if not path.is_file():
            self.skipTest("manifest not written yet")
        data = json.loads(path.read_text(encoding="utf-8"))
        self.assertEqual(data.get("manifestId"), "rc1-baseline")
        ids = {c["id"] for c in data["components"]}
        self.assertTrue(
            {
                "parser-core",
                "emit",
                "pattern-db",
                "product-snapshot",
                "coach-layer",
            }.issubset(ids)
        )
        by_id = {c["id"]: c for c in data["components"]}
        self.assertEqual(
            by_id["product-snapshot"]["sha256"],
            "0cfcaa317bc25c811cebb48e3b53218556b2320f9c3538b2d4583ba9d16a9629",
        )


if __name__ == "__main__":
    unittest.main()
