#!/usr/bin/env python3
"""WO-012 Phase B-join: normalize Human answer.tsv and join ACC Q41-Q80."""
from __future__ import annotations

import hashlib
import json
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[5]
# file at data/knowledge/raw/hwp-export/2018/answer/_run_wo012_join.py -> parents[5]=repo?
# answer=0, 2018=1, hwp-export=2, raw=3, knowledge=4, data=5, ROOT=6
ROOT = Path(__file__).resolve().parents[6]

ANS_DIR = ROOT / "data/knowledge/raw/hwp-export/2018/answer"
CAND_DIR = ROOT / "data/knowledge/pilot/2018/candidate"
ATT_DIR = ROOT / "data/knowledge/raw/attested/2018/answer"
TSV_PATH = ANS_DIR / "answer.tsv"
CIRCLE = {1: "①", 2: "②", 3: "③", 4: "④", 5: "⑤"}


def parse_choice(raw: str | None) -> int | None:
    if raw is None:
        return None
    s = str(raw).strip()
    if not s:
        return None
    if re.fullmatch(r"[①②③④⑤]", s):
        return "①②③④⑤".index(s) + 1
    if re.fullmatch(r"[1-9]", s):
        return int(s)
    return None


def main() -> None:
    text = TSV_PATH.read_text(encoding="utf-8-sig")
    lines = [ln for ln in text.splitlines() if ln.strip()]
    parsed: list[dict] = []
    issues: list[dict] = []

    for ln in lines[1:]:
        parts = ln.split("\t")
        while len(parts) < 4:
            parts.append("")
        qno = int(parts[0].strip())
        a_raw = parts[1].strip()
        label_raw = parts[2].strip()
        notes = parts[3].strip()
        choice = parse_choice(a_raw) if a_raw else parse_choice(label_raw)
        source_col = "answer" if a_raw else ("answerLabel" if label_raw else None)
        status = "ok"
        if choice is None:
            status = "missing"
            issues.append(
                {
                    "questionNo": qno,
                    "issue": "missing_or_unparseable",
                    "raw": [a_raw, label_raw],
                }
            )
        elif choice < 1 or choice > 5:
            status = "out_of_range"
            issues.append(
                {"questionNo": qno, "issue": "out_of_range", "value": choice}
            )
        parsed.append(
            {
                "questionNo": qno,
                "questionId": f"ACC_2018_Q{qno:03d}",
                "answer": choice,
                "answerLabel": CIRCLE.get(choice) if choice in CIRCLE else (
                    str(choice) if choice is not None else None
                ),
                "status": status,
                "sourceColumn": source_col,
                "notes": notes,
                "rawAnswer": a_raw,
                "rawLabel": label_raw,
            }
        )

    if len(parsed) != 40:
        raise SystemExit(f"expected 40 rows, got {len(parsed)}")

    norm_rows = ["questionNo\tanswer\tanswerLabel\tnotes"]
    for e in parsed:
        a = "" if e["answer"] is None else str(e["answer"])
        lab = e["answerLabel"] or ""
        note = e["notes"]
        if e["status"] == "out_of_range":
            extra = "OUT_OF_RANGE needs Human confirm"
            note = f"{note}; {extra}" if note else extra
        norm_rows.append(f"{e['questionNo']}\t{a}\t{lab}\t{note}")
    norm_body = "\n".join(norm_rows) + "\n"
    TSV_PATH.write_text(norm_body, encoding="utf-8")
    tsv_sha = hashlib.sha256(norm_body.encode("utf-8")).hexdigest()

    joined: list[int] = []
    for e in parsed:
        qp = CAND_DIR / f"{e['questionId']}.json"
        if not qp.exists():
            raise SystemExit(f"missing candidate {qp}")
        doc = json.loads(qp.read_text(encoding="utf-8"))
        if e["status"] == "ok":
            doc["answer"] = e["answer"]
            doc["answerLabel"] = e["answerLabel"]
            doc["answerJoin"] = {
                "woId": "WO-20260722-012",
                "manifest": "data/knowledge/raw/hwp-export/2018/answer/answer-manifest.json",
                "tsv": "data/knowledge/raw/hwp-export/2018/answer/answer.tsv",
                "ocrUsed": False,
                "joinedAt": datetime.now(timezone.utc).isoformat(),
                "status": "joined",
            }
            joined.append(e["questionNo"])
        else:
            doc["answer"] = None
            doc["answerJoin"] = {
                "woId": "WO-20260722-012",
                "status": e["status"],
                "rawValue": e["answer"],
                "ocrUsed": False,
                "note": "Not joined pending Human confirm",
            }
        qp.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    idx_path = CAND_DIR / "ACC_2018_pilot-index.json"
    idx = json.loads(idx_path.read_text(encoding="utf-8"))
    idx["answerJoinedCount"] = len(joined)
    idx["answerJoinStatus"] = "COMPLETE" if len(joined) == 40 else "PARTIAL"
    idx["answerJoinIssues"] = issues
    idx["answerManifest"] = (
        "data/knowledge/raw/hwp-export/2018/answer/answer-manifest.json"
    )
    idx_path.write_text(json.dumps(idx, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    inv = json.loads(
        (ROOT / "data/knowledge/inventory/past-exams-inventory.json").read_text(
            encoding="utf-8"
        )
    )
    src = next(x for x in inv["entries"] if x["path"].endswith("2018/answer.hwp"))
    src_path = ROOT / src["path"]
    cur_sha = hashlib.sha256(src_path.read_bytes()).hexdigest()
    source_unchanged = cur_sha == src["sha256"]

    manifest = {
        "schemaVersion": "1.0.0",
        "manifestType": "human_answer_manifest",
        "sprintId": "KS-ACC-LOSSLESS-GOLDEN",
        "woId": "WO-20260722-012",
        "phase": "B-join",
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "scope": {
            "year": 2018,
            "subject": "회계학",
            "questionNoStart": 41,
            "questionNoEnd": 80,
            "expectedCount": 40,
        },
        "source": {
            "path": src["path"],
            "sha256": src["sha256"],
            "bytes": src["bytes"],
            "inventoryRef": "data/knowledge/inventory/past-exams-inventory.json",
            "rehashAtJoin": cur_sha,
            "sourceUnchanged": source_unchanged,
        },
        "files": {
            "tsv": {
                "path": "data/knowledge/raw/hwp-export/2018/answer/answer.tsv",
                "sha256": tsv_sha,
                "bytes": len(norm_body.encode("utf-8")),
                "encoding": "utf-8",
                "columns": ["questionNo", "answer", "answerLabel", "notes"],
                "note": "Normalized from answerLabel column into answer",
            },
            "relatedPdfExport": {
                "path": "data/knowledge/raw/hwp-export/2018/answer/answer-export.pdf",
                "role": "human_visual_reference_only",
                "goldenEvidence": False,
                "ocrUsed": False,
            },
        },
        "fillRules": {
            "answer": "integer 1-5",
            "ocr": "FORBIDDEN",
            "parserProductCopy": "FORBIDDEN as Human SoT",
        },
        "entries": parsed,
        "counts": {
            "total": 40,
            "filledDeclared": 40,
            "joined": len(joined),
            "outOfRange": sum(1 for e in parsed if e["status"] == "out_of_range"),
            "missing": sum(1 for e in parsed if e["status"] == "missing"),
        },
        "issues": issues,
        "verification": {
            "status": "attested_partial" if issues else "attested",
            "attested": len(issues) == 0,
            "ocrUsed": False,
            "joinEligible": True,
            "humanDeclared": {
                "filled": "40/40",
                "sourceUnchanged": True,
                "ocr": False,
            },
            "notes": (
                "Q69 value 6 out of range 1-5; not joined until Human confirm"
                if issues
                else "40/40 joined"
            ),
        },
    }
    man_path = ANS_DIR / "answer-manifest.json"
    man_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    ATT_DIR.mkdir(parents=True, exist_ok=True)
    shutil.copy2(TSV_PATH, ATT_DIR / "answer.tsv")
    shutil.copy2(man_path, ATT_DIR / "answer-manifest.json")
    (ATT_DIR / "attestation.json").write_text(
        json.dumps(
            {
                "woId": "WO-20260722-012",
                "promotedAt": datetime.now(timezone.utc).isoformat(),
                "from": "data/knowledge/raw/hwp-export/2018/answer/",
                "verificationStatus": manifest["verification"]["status"],
                "sourceSha256": src["sha256"],
                "sourceUnchanged": source_unchanged,
                "ocrUsed": False,
                "joinedCount": len(joined),
                "issues": issues,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    exp_path = ANS_DIR / "answer.export.json"
    doc = json.loads(exp_path.read_text(encoding="utf-8")) if exp_path.exists() else {}
    doc["verification"] = {
        "status": manifest["verification"]["status"],
        "verifiedAt": datetime.now(timezone.utc).isoformat(),
        "verifiedBy": "Human+Engineer-join",
        "attestedDir": "data/knowledge/raw/attested/2018/answer/",
        "ocrUsed": False,
        "checklist": {
            "sourceHashMatchesInventory": source_unchanged,
            "exportFilesPresent": True,
            "machineReadableForJoin": True,
            "spotCheckAgainstSource": None,
        },
        "issues": issues,
    }
    doc["manifestRef"] = (
        "data/knowledge/raw/hwp-export/2018/answer/answer-manifest.json"
    )
    exp_path.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(
        json.dumps(
            {
                "joined": len(joined),
                "issues": issues,
                "sourceUnchanged": source_unchanged,
                "joinStatus": idx["answerJoinStatus"],
                "root": str(ROOT),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
