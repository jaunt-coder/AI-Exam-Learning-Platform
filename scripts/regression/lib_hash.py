"""SHA-256 helpers matching docs/release/RC1-BASELINE.md.

File: sha256(file bytes)
Directory: Merkle-style over sorted (relativePath, fileSha256) pairs:
  for each pair: update( relativePath UTF-8 + NUL + fileSha256 hex ASCII + LF )
Excludes: __pycache__ directories, *.pyc files.
"""
from __future__ import annotations

import hashlib
from pathlib import Path


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def iter_dir_files(directory: Path) -> list[Path]:
    """Return sorted files under directory, excluding pycache / *.pyc."""
    files: list[Path] = []
    if not directory.is_dir():
        raise FileNotFoundError(f"directory not found: {directory}")
    for path in sorted(directory.rglob("*")):
        if not path.is_file():
            continue
        if "__pycache__" in path.parts:
            continue
        if path.suffix == ".pyc":
            continue
        files.append(path)
    return files


def collect_file_digests(directory: Path) -> list[tuple[str, str]]:
    """Return sorted (relativePath posix, sha256 hex) pairs."""
    pairs: list[tuple[str, str]] = []
    for path in iter_dir_files(directory):
        rel = path.relative_to(directory).as_posix()
        pairs.append((rel, sha256_file(path)))
    return pairs


def sha256_directory(directory: Path) -> str:
    """RC1 directory hash: path\\0hex\\n for each sorted relative file."""
    digest = hashlib.sha256()
    for rel, file_sha in collect_file_digests(directory):
        digest.update(rel.encode("utf-8") + b"\0" + file_sha.encode("ascii") + b"\n")
    return digest.hexdigest()


def hash_target(path: Path, kind: str) -> tuple[str, int]:
    """Hash a file or directory. Returns (sha256, file_count)."""
    if kind == "file":
        if not path.is_file():
            raise FileNotFoundError(f"file not found: {path}")
        return sha256_file(path), 1
    if kind == "directory":
        pairs = collect_file_digests(path)
        return sha256_directory(path), len(pairs)
    raise ValueError(f"unknown kind: {kind}")
