#!/usr/bin/env python3
"""WO-20260722-009: read-only SHA256 inventory. Does not modify source/."""
from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
PAST = ROOT / "source" / "past-exams"
ORIG = ROOT / "source" / "original-exams"
OUT = ROOT / "data" / "knowledge" / "inventory"
WO_ID = "WO-20260722-009"
SPRINT = "KS-ACC-LOSSLESS-GOLDEN"


def rel_posix(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def role_for_name(name: str) -> str:
    if re.match(r"^exam_1\.", name, re.I):
        return "exam_1"
    if re.match(r"^exam_2\.", name, re.I):
        return "exam_2"
    if re.match(r"^answer\.", name, re.I):
        return "answer"
    return "other"


def inventory_root(abs_root: Path, root_id: str, root_path: str) -> dict:
    entries: list[dict] = []
    preflight: list[tuple[str, int]] = []
    if not abs_root.exists():
        return {
            "entries": [],
            "gaps": [],
            "preflight": [],
            "rootMissing": True,
        }

    files = sorted(p for p in abs_root.rglob("*") if p.is_file())
    for p in files:
        r = rel_posix(p)
        size = p.stat().st_size
        preflight.append((r, size))
        parent = p.parent.name
        year = None
        role = "other"
        if re.fullmatch(r"\d{4}", parent):
            year = int(parent)
            role = role_for_name(p.name)
        else:
            role = "legacy_root"
            m = re.match(r"((?:19|20)\d{2})", p.name)
            if m:
                year = int(m.group(1))
        ext = p.suffix.lstrip(".").lower()
        mtime = datetime.fromtimestamp(p.stat().st_mtime, tz=timezone.utc).isoformat()
        entries.append(
            {
                "path": r,
                "year": year,
                "role": role,
                "ext": ext,
                "bytes": size,
                "sha256": sha256_file(p),
                "mtimeUtc": mtime,
            }
        )

    gaps: list[dict] = []
    if root_id == "past_exams":
        for y in range(2017, 2027):
            folder = abs_root / str(y)
            missing: list[str] = []
            if not folder.is_dir():
                missing = ["folder", "exam_1", "exam_2", "answer"]
            else:
                for slot in ("exam_1", "exam_2", "answer"):
                    hits = list(folder.glob(f"{slot}.*"))
                    if not hits:
                        missing.append(slot)
            if missing:
                gaps.append({"year": y, "missing": missing})

    return {
        "entries": entries,
        "gaps": gaps,
        "preflight": preflight,
        "rootMissing": False,
    }


def postflight(abs_root: Path, preflight: list[tuple[str, int]]) -> tuple[bool, list[str]]:
    if not abs_root.exists():
        return (len(preflight) == 0), []
    pre_map = dict(preflight)
    details: list[str] = []
    ok = True
    seen: set[str] = set()
    for p in abs_root.rglob("*"):
        if not p.is_file():
            continue
        r = rel_posix(p)
        seen.add(r)
        size = p.stat().st_size
        if r not in pre_map:
            ok = False
            details.append(f"new:{r}")
        elif pre_map[r] != size:
            ok = False
            details.append(f"bytes_changed:{r}")
    for r in pre_map:
        if r not in seen:
            ok = False
            details.append(f"missing:{r}")
    return ok, details


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    started = datetime.now(timezone.utc).isoformat()
    past = inventory_root(PAST, "past_exams", "source/past-exams")
    orig = inventory_root(ORIG, "original_exams", "source/original-exams")
    pf_past_ok, pf_past_details = postflight(PAST, past["preflight"])
    pf_orig_ok, pf_orig_details = postflight(ORIG, orig["preflight"])
    finished = datetime.now(timezone.utc).isoformat()
    source_unchanged = pf_past_ok and pf_orig_ok

    past_doc = {
        "schemaVersion": "1.0.0",
        "generatedAt": finished,
        "sprintId": SPRINT,
        "woId": WO_ID,
        "rootId": "past_exams",
        "rootPath": "source/past-exams",
        "algorithm": "SHA-256",
        "entryCount": len(past["entries"]),
        "entries": past["entries"],
        "gaps": past["gaps"],
    }
    orig_doc = {
        "schemaVersion": "1.0.0",
        "generatedAt": finished,
        "sprintId": SPRINT,
        "woId": WO_ID,
        "rootId": "original_exams",
        "rootPath": "source/original-exams",
        "algorithm": "SHA-256",
        "entryCount": len(orig["entries"]),
        "entries": orig["entries"],
        "gaps": [],
        "rootMissing": orig["rootMissing"],
    }
    manifest = {
        "schemaVersion": "1.0.0",
        "woId": WO_ID,
        "startedAt": started,
        "finishedAt": finished,
        "mode": "read_only_sha256",
        "rootsScanned": ["source/past-exams", "source/original-exams"],
        "outputs": [
            "data/knowledge/inventory/past-exams-inventory.json",
            "data/knowledge/inventory/original-exams-inventory.json",
        ],
        "sourceWriteCount": 0,
        "forbiddenActionsExecuted": [],
        "counts": {
            "pastExams": len(past["entries"]),
            "originalExams": len(orig["entries"]),
        },
        "proof": {
            "method": "preflight_file_list + postflight_identical_paths_bytes",
            "sourceUnchanged": source_unchanged,
            "pastExamsPostflightOk": pf_past_ok,
            "originalExamsPostflightOk": pf_orig_ok,
            "details": pf_past_details + pf_orig_details,
            "notes": "No files created/modified/deleted under source/",
        },
    }

    (OUT / "past-exams-inventory.json").write_text(
        json.dumps(past_doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (OUT / "original-exams-inventory.json").write_text(
        json.dumps(orig_doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (OUT / "inventory-run-manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    print(
        json.dumps(
            {
                "past": len(past["entries"]),
                "orig": len(orig["entries"]),
                "unchanged": source_unchanged,
                "gaps": past["gaps"],
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
