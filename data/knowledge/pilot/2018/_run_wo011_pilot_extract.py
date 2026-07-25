#!/usr/bin/env python3
"""WO-20260722-011 — 2018 ACC Pilot Lossless Extraction (staging only).

- Reads source PDF/HWP bytes (no source mutation, no OCR, no Parser).
- Writes only under data/knowledge/pilot/2018/{raw,candidate,verify}/
"""
from __future__ import annotations

import hashlib
import json
import re
import zlib
from datetime import datetime, timezone
from pathlib import Path

import fitz
import olefile

ROOT = Path(__file__).resolve().parents[4]
YEAR = 2018
EXAM_PDF = ROOT / "source" / "past-exams" / "2018" / "exam_2.pdf"
ANSWER_HWP = ROOT / "source" / "past-exams" / "2018" / "answer.hwp"
OUT = ROOT / "data" / "knowledge" / "pilot" / "2018"
RAW = OUT / "raw"
CAND = OUT / "candidate"
VERIFY = OUT / "verify"

EXPECTED_EXAM_SHA = "18dd374b323cdc8aff8a3f7273b04eadf126fb05d7a621c904b4d9d10a23aadc"
EXPECTED_ANSWER_SHA = "1a67082b336e263b4b22873696be2d7e949027bbba4e6a5bcb9fc4d826ab2595"

# Choice markers as they appear in Korean exam PDFs
CHOICE_SPLIT = re.compile(r"(?=(①|②|③|④|⑤))")
Q_START = re.compile(r"(?m)^(?:\s*)(\d{1,2})\.\s+")
FOOTER_LINE = re.compile(
    r"(?m)^2018년도\s*제?\s*29회.*$|^-\s*\d+\s*-$|^제\s*\d+\s*교시.*$|"
    r"청렴한감정평가.*$|국민의행복지수.*$"
)


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def extract_pdf_pages(pdf_path: Path) -> list[dict]:
    doc = fitz.open(pdf_path)
    pages: list[dict] = []
    for i in range(doc.page_count):
        text = doc.load_page(i).get_text("text")
        pages.append(
            {
                "page": i + 1,
                "charCount": len(text),
                "text": text,
                "hasTextLayer": bool(text.strip()),
            }
        )
    doc.close()
    return pages


def try_extract_hwp_text(hwp_path: Path) -> dict:
    """Best-effort HWP body text for staging only (not saved into source/)."""
    result = {
        "ok": False,
        "method": "ole-zlib-section-scan",
        "note": "",
        "text": "",
        "streams": [],
    }
    try:
        ole = olefile.OleFileIO(str(hwp_path))
        names = ["/".join(p) for p in ole.listdir()]
        result["streams"] = names
        chunks: list[bytes] = []
        for name in names:
            if "Section" not in name and "BodyText" not in name:
                continue
            try:
                data = ole.openstream(name.split("/")).read()
            except OSError:
                # olefile wants list path
                parts = name.split("/")
                data = ole.openstream(parts).read()
            # HWP5 sections often start with header then zlib
            for offset in (0, 4, 8, 16, 32):
                try:
                    chunks.append(zlib.decompress(data[offset:]))
                    break
                except zlib.error:
                    continue
            else:
                # keep raw if looks like utf-16
                if b"\x00" in data[:200]:
                    chunks.append(data)
        ole.close()
        texts: list[str] = []
        for blob in chunks:
            for enc in ("utf-16-le", "utf-8", "cp949"):
                try:
                    s = blob.decode(enc, errors="ignore")
                    # keep if enough Hangul
                    hangul = sum(1 for ch in s if "가" <= ch <= "힣")
                    if hangul >= 20:
                        texts.append(s)
                        break
                except Exception:
                    continue
        merged = "\n".join(texts)
        # keep printable-ish lines
        cleaned_lines = []
        for line in merged.splitlines():
            line = line.strip("\x00").strip()
            if not line:
                continue
            if sum(1 for ch in line if ch.isprintable() or ch.isspace()) < len(line) * 0.7:
                continue
            cleaned_lines.append(line)
        result["text"] = "\n".join(cleaned_lines)
        result["ok"] = len(result["text"]) >= 50
        if not result["ok"]:
            result["note"] = (
                "HWP binary probe did not yield reliable answer key text. "
                "Answer join HOLD until Human VERIFY_EXPORT (WO-010 D-primary)."
            )
        else:
            result["note"] = "Provisional HWP probe text — Human VERIFY_EXPORT still required."
    except Exception as exc:  # noqa: BLE001
        result["note"] = f"HWP probe failed: {exc}"
    return result


def find_accounting_start(pages: list[dict]) -> tuple[int, int]:
    """Return (page_index_0based, char_offset_in_page_text) for 회계학 start."""
    for idx, page in enumerate(pages):
        text = page["text"]
        # Prefer explicit subject header near Q41
        m = re.search(r"회계학", text)
        if not m:
            continue
        # ensure Q41 exists on this or next pages
        window = text + (pages[idx + 1]["text"] if idx + 1 < len(pages) else "")
        if re.search(r"(?m)^41\.\s+", window):
            return idx, m.start()
    # fallback: first page containing ^41.
    for idx, page in enumerate(pages):
        m = re.search(r"(?m)^41\.\s+", page["text"])
        if m:
            return idx, m.start()
    raise RuntimeError("Accounting section start (Q41 / 회계학) not found")


def build_accounting_raw_text(pages: list[dict], start_page_idx: int, start_offset: int) -> str:
    parts: list[str] = []
    for i, page in enumerate(pages):
        if i < start_page_idx:
            continue
        text = page["text"]
        if i == start_page_idx:
            text = text[start_offset:]
        parts.append(f"<<<PAGE {page['page']}>>>\n{text}")
    return "\n\n".join(parts)


def strip_page_headers(block: str) -> str:
    lines = []
    for line in block.splitlines():
        if FOOTER_LINE.search(line):
            continue
        if re.match(r"^<<<PAGE\s+\d+>>>$", line.strip()):
            continue
        lines.append(line)
    return "\n".join(lines)


def split_questions(raw_acc_text: str) -> list[dict]:
    """Split ACC stream into Q41–Q80 lossless blocks with page attribution."""
    # Map char ranges to pages via markers
    page_spans: list[tuple[int, int, int]] = []  # start, end, page
    pos = 0
    pieces = re.split(r"(<<<PAGE\s+(\d+)>>>)", raw_acc_text)
    # re.split keeps markers: text, marker, page, text, ...
    rebuilt = ""
    i = 0
    while i < len(pieces):
        part = pieces[i]
        if part.startswith("<<<PAGE"):
            page_no = int(pieces[i + 1])
            body = pieces[i + 2] if i + 2 < len(pieces) else ""
            start = len(rebuilt)
            rebuilt += body
            end = len(rebuilt)
            page_spans.append((start, end, page_no))
            i += 3
        else:
            # leading text without marker
            start = len(rebuilt)
            rebuilt += part
            end = len(rebuilt)
            if end > start:
                page_spans.append((start, end, page_spans[-1][2] if page_spans else 0))
            i += 1

    def page_at(offset: int) -> int:
        for a, b, p in page_spans:
            if a <= offset < b:
                return p
        return page_spans[-1][2] if page_spans else 0

    plain = rebuilt
    matches = list(Q_START.finditer(plain))
    questions: list[dict] = []
    for idx, m in enumerate(matches):
        number = int(m.group(1))
        if number < 41 or number > 80:
            continue
        start = m.start()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(plain)
        body = plain[start:end].strip()
        body = strip_page_headers(body).strip()
        questions.append(
            {
                "number": number,
                "page": page_at(start),
                "rawBlock": body,
            }
        )
    # de-dupe by number keeping first occurrence
    seen = set()
    uniq = []
    for q in questions:
        if q["number"] in seen:
            continue
        seen.add(q["number"])
        uniq.append(q)
    return uniq


def parse_choices(raw_block: str) -> tuple[str, list[str], float]:
    """Return (stem, choices[5], confidence). Preserve wording; minimal structural split."""
    # Remove leading "NN. "
    body = re.sub(r"^\d{1,2}\.\s*", "", raw_block, count=1).strip()
    parts = CHOICE_SPLIT.split(body)
    # parts like ['stem...', '①', 'text', '②', 'text', ...]
    if "①" not in body:
        return body, [], 0.45

    stem_parts: list[str] = []
    choices: list[str] = []
    current_label = None
    buf: list[str] = []
    for part in parts:
        if part in {"①", "②", "③", "④", "⑤"}:
            if current_label is None:
                stem_parts.append("".join(buf))
            else:
                choices.append("".join(buf).strip())
            current_label = part
            buf = []
        else:
            buf.append(part)
    if current_label is not None:
        choices.append("".join(buf).strip())
    else:
        stem_parts.append("".join(buf))

    stem = "".join(stem_parts).strip()
    # Keep choice text without forcing rewrite; retain label in separate field only via order
    # If more/less than 5, confidence drops
    conf = 0.92
    if len(choices) != 5:
        conf = 0.55
    if not stem:
        conf = min(conf, 0.5)
    # Strip accidental leading labels left inside choice text
    cleaned = []
    for i, c in enumerate(choices):
        c2 = re.sub(r"^[①②③④⑤]\s*", "", c).strip()
        c2 = FOOTER_LINE.sub("", c2).strip()
        c2 = re.sub(r"청렴한감정평가.*?$", "", c2).strip()
        cleaned.append(c2)
    return stem, cleaned[:5] if len(cleaned) >= 5 else cleaned, conf


def parse_answer_key_from_hwp_text(text: str) -> dict[int, int]:
    """Parse questionNo -> answerIndex(1-5) if possible."""
    mapping: dict[int, int] = {}
    # patterns like "41. ③" or "41 3" or "41.\t3"
    for m in re.finditer(
        r"(?m)(?:^|\s)(4\d|5\d|6\d|7\d|80)\s*[\.:)]\s*([1-5①②③④⑤])",
        text,
    ):
        num = int(m.group(1))
        ans = m.group(2)
        circ = {"①": 1, "②": 2, "③": 3, "④": 4, "⑤": 5}
        val = circ.get(ans, int(ans))
        if 41 <= num <= 80:
            mapping[num] = val
    return mapping


def main() -> int:
    RAW.mkdir(parents=True, exist_ok=True)
    CAND.mkdir(parents=True, exist_ok=True)
    VERIFY.mkdir(parents=True, exist_ok=True)

    exam_sha = sha256_file(EXAM_PDF)
    answer_sha = sha256_file(ANSWER_HWP)
    assert exam_sha == EXPECTED_EXAM_SHA, "exam_2.pdf SHA mismatch vs WO-009/011"
    assert answer_sha == EXPECTED_ANSWER_SHA, "answer.hwp SHA mismatch vs WO-009/011"

    pages = extract_pdf_pages(EXAM_PDF)
    assert all(p["hasTextLayer"] for p in pages), "OCR forbidden — missing text layer"

    # raw page dumps
    for p in pages:
        (RAW / f"exam_2-page-{p['page']:02d}.txt").write_text(p["text"], encoding="utf-8")
    full = "\n\n".join(f"<<<PAGE {p['page']}>>>\n{p['text']}" for p in pages)
    (RAW / "exam_2.full.txt").write_text(full, encoding="utf-8")

    hwp = try_extract_hwp_text(ANSWER_HWP)
    (RAW / "answer.hwp.probe.txt").write_text(hwp.get("text") or "", encoding="utf-8")
    write_json(
        RAW / "answer.hwp.probe-meta.json",
        {
            "ok": hwp["ok"],
            "method": hwp["method"],
            "note": hwp["note"],
            "streamCount": len(hwp.get("streams") or []),
            "charCount": len(hwp.get("text") or ""),
            "humanVerifyExportRequired": True,
            "sourcePath": "source/past-exams/2018/answer.hwp",
            "sourceSha256": answer_sha,
        },
    )

    start_idx, start_off = find_accounting_start(pages)
    acc_raw = build_accounting_raw_text(pages, start_idx, start_off)
    (RAW / "exam_2.accounting-stream.txt").write_text(acc_raw, encoding="utf-8")

    blocks = split_questions(acc_raw)
    answer_map = parse_answer_key_from_hwp_text(hwp.get("text") or "")

    candidates = []
    for block in blocks:
        stem, choices, conf = parse_choices(block["rawBlock"])
        number = block["number"]
        ans = answer_map.get(number)
        if ans is None:
            conf = min(conf, 0.75)
        qid = f"ACC_{YEAR}_Q{number:03d}"
        rec = {
            "questionId": qid,
            "year": YEAR,
            "subject": "회계학",
            "number": number,
            "page": block["page"],
            "stem": stem,
            "choices": choices,
            "answer": ans,
            "extractionConfidence": round(conf, 3),
            "verified": False,
            # lossless aids for Human Verify (non-product)
            "rawBlock": block["rawBlock"],
            "source": {
                "examPath": "source/past-exams/2018/exam_2.pdf",
                "examSha256": exam_sha,
                "answerPath": "source/past-exams/2018/answer.hwp",
                "answerSha256": answer_sha,
                "extractMethod": "pymupdf-text-layer",
                "ocrUsed": False,
            },
        }
        candidates.append(rec)
        write_json(CAND / f"{qid}.json", rec)

    write_json(
        CAND / "ACC_2018_pilot-index.json",
        {
            "year": YEAR,
            "subject": "회계학",
            "count": len(candidates),
            "expectedRange": {"start": 41, "end": 80},
            "questionIds": [c["questionId"] for c in candidates],
            "answerJoinedCount": sum(1 for c in candidates if c["answer"] is not None),
            "answerJoinStatus": "PARTIAL_OR_HOLD" if len(answer_map) < 40 else "JOINED_PROVISIONAL",
        },
    )

    metadata = {
        "workOrder": "WO-20260722-011",
        "createdAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "pilotYear": YEAR,
        "session": "2교시",
        "examRound": 29,
        "inputs": [
            {
                "role": "exam_2",
                "path": "source/past-exams/2018/exam_2.pdf",
                "sha256": exam_sha,
                "bytes": EXAM_PDF.stat().st_size,
                "pages": len(pages),
                "textLayer": True,
            },
            {
                "role": "answer",
                "path": "source/past-exams/2018/answer.hwp",
                "sha256": answer_sha,
                "bytes": ANSWER_HWP.stat().st_size,
                "humanExportRequired": True,
                "probeOk": hwp["ok"],
            },
        ],
        "outputsRoot": "data/knowledge/pilot/2018",
        "forbiddenHonored": [
            "source-unchanged",
            "no-ocr",
            "no-parser-edit",
            "no-question-db-product",
            "no-pattern-db",
            "no-d3-d4-persist",
            "no-convert-into-source",
        ],
        "accountingStart": {
            "page": pages[start_idx]["page"],
            "offsetInPageText": start_off,
        },
        "candidateCount": len(candidates),
        "notes": [
            "exam_2 mixes 관계법 + 회계학; pilot candidates are ACC Q41–Q80 only.",
            "Lossless rule: stem/choices taken from text-layer split; no paraphrase.",
            hwp["note"],
        ],
    }
    write_json(OUT / "source-metadata.json", metadata)
    write_json(
        RAW / "extraction-result.json",
        {
            "engine": "pymupdf.get_text(text)",
            "ocrUsed": False,
            "pages": [{"page": p["page"], "charCount": p["charCount"], "hasTextLayer": p["hasTextLayer"]} for p in pages],
            "accountingStreamChars": len(acc_raw),
            "questionBlocksFound": len(blocks),
            "answerProbeJoined": len(answer_map),
        },
    )

    # Human verify checklist
    lines = [
        "# Human Verify Checklist — ACC 2018 Pilot (WO-20260722-011)",
        "",
        f"Generated: {metadata['createdAt']}",
        "",
        "## Source lock",
        "",
        f"- [ ] `exam_2.pdf` sha256 = `{exam_sha}` (unchanged)",
        f"- [ ] `answer.hwp` sha256 = `{answer_sha}` (unchanged)",
        "- [ ] No OCR used; text-layer extract only",
        "",
        "## VERIFY_EXPORT (answer)",
        "",
        "- [ ] Human exported answer key from HWP via official ingress (WO-010)",
        "- [ ] Attested answer join by question number 41–80",
        f"- [ ] Probe join count now: **{len(answer_map)}/40** (provisional)",
        "",
        "## Per-question VERIFY_QUESTION",
        "",
        "| Q | questionId | page | choices=5 | answer | confidence | lossless OK | verified |",
        "|---|------------|------|-----------|--------|------------|-------------|----------|",
    ]
    for c in candidates:
        lines.append(
            f"| {c['number']} | `{c['questionId']}` | {c['page']} | "
            f"{'Y' if len(c['choices']) == 5 else 'N('+str(len(c['choices']))+')'} | "
            f"{c['answer'] if c['answer'] is not None else 'HOLD'} | {c['extractionConfidence']} | [ ] | [ ] |"
        )
    lines.extend(
        [
            "",
            "## Validation criteria (WO-011)",
            "",
            "1. [ ] Question numbers preserved (41–80)",
            "2. [ ] Choices preserved (①–⑤, no rewrite)",
            "3. [ ] Numbers/formulas preserved (no rounding/summary)",
            "4. [ ] Answers joinable by question number",
            "5. [ ] Human verify slots present (`verified:false` until signed)",
            "",
            "## Student solvability smoke",
            "",
            "- [ ] Open a mid-confidence item stem+choices and solve without opening PDF",
            "- [ ] Cross-check one table/number-heavy item against PDF page cited",
            "",
            "## Sign-off",
            "",
            "```",
            "Verifier: _______________",
            "Date: _______________",
            "Pilot Accept: YES / NO",
            "```",
            "",
        ]
    )
    (VERIFY / "human-verify-checklist.md").write_text("\n".join(lines), encoding="utf-8")

    # compact extraction summary for pilot root
    write_json(
        OUT / "extraction-result.json",
        {
            "workOrder": "WO-20260722-011",
            "status": "STAGING_COMPLETE",
            "candidateCount": len(candidates),
            "choice5Count": sum(1 for c in candidates if len(c["choices"]) == 5),
            "answerJoinedCount": sum(1 for c in candidates if c["answer"] is not None),
            "missingNumbers": [n for n in range(41, 81) if n not in {c["number"] for c in candidates}],
            "paths": {
                "metadata": "data/knowledge/pilot/2018/source-metadata.json",
                "raw": "data/knowledge/pilot/2018/raw/",
                "candidate": "data/knowledge/pilot/2018/candidate/",
                "verify": "data/knowledge/pilot/2018/verify/human-verify-checklist.md",
            },
        },
    )

    print(
        json.dumps(
            {
                "candidates": len(candidates),
                "choice5": sum(1 for c in candidates if len(c["choices"]) == 5),
                "answers": sum(1 for c in candidates if c["answer"] is not None),
                "missing": [n for n in range(41, 81) if n not in {c["number"] for c in candidates}],
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
