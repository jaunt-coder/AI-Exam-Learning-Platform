# -*- coding: utf-8 -*-
"""Sprint-19B — Universal Import runner (writes subjects/*/candidates only).

Never writes data/question-db.json · pattern-db.json · statistics.json.
Never modifies subjects/*/formula-db.json (official).
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAST = ROOT / "source" / "past-exams"
SUBJECTS = ROOT / "subjects"
YEAR_FROM, YEAR_TO = 2018, 2025

APPRAISER = {
    "exam_1": [
        {"subjectId": "civil", "name": "민법", "markers": ["민법"], "hint": (1, 40)},
        {"subjectId": "economics", "name": "경제학", "markers": ["경제학"], "hint": (1, 40)},
        {
            "subjectId": "realestate",
            "name": "부동산학",
            "markers": ["부동산학원론", "부동산학"],
            "hint": (1, 40),
        },
    ],
    "exam_2": [
        {
            "subjectId": "law",
            "name": "관계법규",
            "markers": ["감정평가관계법규", "관계법규"],
            "hint": (1, 40),
        },
        {"subjectId": "accounting", "name": "회계학", "markers": ["회계학"], "hint": (41, 80)},
    ],
}

PATTERN_SEEDS = {
    "accounting": [
        ("ACC_INV", "재고자산", ["재고", "매출원가", "FIFO", "총평균", "저가법"]),
        ("ACC_PPE", "유형자산", ["유형자산", "감가상각", "취득원가"]),
        ("ACC_PROV", "충당부채", ["충당부채", "충당금"]),
    ],
    "economics": [
        ("ECO_DEM", "수요", ["수요"]),
        ("ECO_SUP", "공급", ["공급"]),
        ("ECO_ELA", "탄력성", ["탄력"]),
        ("ECO_EQ", "시장균형", ["균형"]),
        ("ECO_NI", "국민소득", ["국민소득", "GDP"]),
    ],
    "civil": [
        ("CIV_CAN", "취소", ["취소"]),
        ("CIV_VOI", "무효", ["무효"]),
        ("CIV_POS", "점유", ["점유"]),
        ("CIV_PRE", "시효", ["시효"]),
    ],
    "realestate": [
        ("REA_VAL", "부동산평가", ["감정평가", "공시지가"]),
        ("REA_MKT", "부동산시장", ["부동산시장"]),
    ],
    "law": [
        ("LAW_ACT", "감정평가법", ["감정평가"]),
        ("LAW_LAND", "부동산공시", ["공시"]),
        ("LAW_REG", "등기", ["등기"]),
    ],
}

FORMULA_HINTS = {
    "accounting": [
        ("재고 항등식", re.compile(r"매출원가|기말재고"), "기초재고 + 당기매입 − 기말재고 = 매출원가"),
        ("총평균법", re.compile(r"평균단가|총평균"), "평균단가 = (기초원가 + 매입원가) ÷ (기초수량 + 매입수량)"),
    ],
    "economics": [
        ("탄력성", re.compile(r"탄력"), "탄력성 = %ΔQ / %ΔP"),
        ("GDP", re.compile(r"GDP|국민소득"), "GDP = C + I + G + (X − M)"),
    ],
    "civil": [("소멸시효", re.compile(r"시효"), "권리 불행사 기간 경과 → 소멸시효 완성")],
    "realestate": [("수익환원", re.compile(r"환원|수익률"), "가치 = 순영업이익 ÷ 환원율")],
    "law": [("공시지가", re.compile(r"공시"), "공시지가 = 표준지 단위면적당 적정가격")],
}

PREFIX = {
    "accounting": "ACC",
    "economics": "ECO",
    "civil": "CIV",
    "realestate": "REA",
    "law": "LAW",
}


def sha_short(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:8]


def role_of(name: str) -> str:
    low = name.lower()
    if low.startswith("exam_1."):
        return "exam_1"
    if low.startswith("exam_2."):
        return "exam_2"
    if low.startswith("answer."):
        return "answer"
    return "other"


def extract_pdf_text(path: Path) -> tuple[str, float]:
    try:
        import fitz  # type: ignore

        doc = fitz.open(str(path))
        pages = [(page.get_text() or "") for page in doc]
        doc.close()
        text = "\n".join(pages)
        if text.strip():
            return text, min(100.0, 50 + len(text) / 5000)
    except Exception:
        pass
    try:
        from pypdf import PdfReader  # type: ignore

        reader = PdfReader(str(path))
        pages = [(p.extract_text() or "") for p in reader.pages]
        text = "\n".join(pages)
        if text.strip():
            return text, min(100.0, 45 + len(text) / 5000)
    except Exception:
        pass
    # Metadata-only fallback (no OCR deps): keep pipeline alive
    return f"[UNEXTRACTED:{path.name}]", 10.0


def extract_answer_text(path: Path) -> str:
    if path.suffix.lower() == ".pdf":
        text, _ = extract_pdf_text(path)
        return text
    if path.suffix.lower() in {".txt", ".json"}:
        return path.read_text(encoding="utf-8", errors="replace")
    # hwp: try attested/raw exports
    year = path.parent.name
    candidates = [
        ROOT / "data/knowledge/raw/hwp-export" / year / "answer" / "_extract_utf8.txt",
        ROOT / "data/knowledge/raw/hwp-export" / year / "answer" / "answer.export.json",
    ]
    for c in candidates:
        if c.exists():
            return c.read_text(encoding="utf-8", errors="replace")
    return ""


def parse_answers(text: str) -> dict[int, int]:
    circle = {"①": 1, "②": 2, "③": 3, "④": 4, "⑤": 5}
    out: dict[int, int] = {}
    if text.strip().startswith("{"):
        try:
            payload = json.loads(text)
            for k, v in payload.items():
                if str(k).startswith("_"):
                    continue
                try:
                    out[int(k)] = int(v)
                except Exception:
                    pass
            return out
        except Exception:
            pass
    for m in re.finditer(r"(\d{1,3})\s*[\.．:\-–—)]?\s*([①②③④⑤1-5])", text):
        num = int(m.group(1))
        raw = m.group(2)
        ans = circle.get(raw) or int(raw)
        if 1 <= ans <= 5:
            out[num] = ans
    return out


def split_subjects(text: str, session: str) -> list[dict]:
    specs = APPRAISER[session]
    hits = []
    for spec in specs:
        idx = -1
        marker = None
        for mk in spec["markers"]:
            i = text.find(mk)
            if i >= 0 and (idx < 0 or i < idx):
                idx, marker = i, mk
        hits.append({**spec, "start": idx if idx >= 0 else 10**12, "found": idx >= 0, "marker": marker})
    hits.sort(key=lambda x: x["start"])
    blocks = []
    for i, h in enumerate(hits):
        start = h["start"] if h["found"] else (0 if i == 0 else hits[i - 1]["start"])
        end = hits[i + 1]["start"] if i + 1 < len(hits) and hits[i + 1]["found"] else len(text)
        if not h["found"]:
            start = 0 if i == 0 else end
        blocks.append(
            {
                "subjectId": h["subjectId"],
                "name": h["name"],
                "hint": h["hint"],
                "found": h["found"],
                "text": text[start:end] if h["found"] else text,
            }
        )
    return blocks


def parse_questions(text: str, hint: tuple[int, int] | None) -> list[dict]:
    markers = []
    for m in re.finditer(r"(?:^|\n)\s*(\d{1,3})\s*[\.．。]\s+", text):
        n = int(m.group(1))
        if hint and not (hint[0] <= n <= hint[1]):
            continue
        if any(x["number"] == n for x in markers):
            continue
        markers.append({"number": n, "start": m.start()})
    if not markers and hint:
        for m in re.finditer(r"(?:^|\n)\s*(\d{1,3})\s*[\.．。]\s+", text):
            n = int(m.group(1))
            if any(x["number"] == n for x in markers):
                continue
            markers.append({"number": n, "start": m.start()})
    markers.sort(key=lambda x: x["start"])
    out = []
    for i, mk in enumerate(markers):
        end = markers[i + 1]["start"] if i + 1 < len(markers) else len(text)
        raw = text[mk["start"] : end].strip()
        body = re.sub(r"^\s*\d{1,3}\s*[\.．。]\s*", "", raw)
        choices = []
        parts = re.split(r"(?=[①②③④⑤])", body)
        for p in parts:
            if re.match(r"^[①②③④⑤]", p.strip()):
                choices.append(re.sub(r"^[①②③④⑤]\s*", "", p.strip()))
        choices = choices[:5]
        stem = body
        mchoice = re.search(r"[①②③④⑤]", body)
        if mchoice:
            stem = body[: mchoice.start()].strip()
        out.append(
            {
                "number": mk["number"],
                "question": stem,
                "choices": choices,
                "table": None,
                "page": 1,
                "ocrQuality": 90 if len(choices) >= 4 else 60,
            }
        )
    return out


def build_qid(subject_id: str, year: int, number: int) -> str:
    return f"{PREFIX.get(subject_id, 'SUB')}-{year}-Q{number:02d}"


def main() -> int:
    by_subject: dict[str, list[dict]] = {s: [] for s in PREFIX}
    discovery = []
    total_pdf = completed = failed = 0
    ocr_sum = 0.0
    ocr_n = 0

    for year in range(YEAR_FROM, YEAR_TO + 1):
        folder = PAST / str(year)
        row = {"year": year, "exam_1": None, "exam_2": None, "answer": None}
        if folder.is_dir():
            for p in sorted(folder.iterdir()):
                if not p.is_file():
                    continue
                role = role_of(p.name)
                if role in row and row[role] is None:
                    row[role] = p
        discovery.append(row)
        for role in ("exam_1", "exam_2", "answer"):
            if row[role]:
                total_pdf += 1

        answers: dict[int, int] = {}
        if row["answer"]:
            answers = parse_answers(extract_answer_text(row["answer"]))

        for session in ("exam_1", "exam_2"):
            pdf = row[session]
            if not pdf:
                continue
            try:
                text, quality = extract_pdf_text(pdf)
                ocr_sum += quality
                ocr_n += 1
                blocks = split_subjects(text, session)
                for block in blocks:
                    qs = parse_questions(block["text"], block["hint"])
                    for q in qs:
                        ans = answers.get(q["number"])
                        rec = {
                            "questionId": build_qid(block["subjectId"], year, q["number"]),
                            "subjectId": block["subjectId"],
                            "year": year,
                            "exam": "감정평가사",
                            "session": session,
                            "number": q["number"],
                            "question": q["question"],
                            "table": q["table"],
                            "choices": q["choices"],
                            "answer": ans,
                            "ocrQuality": round(quality),
                            "sourcePdf": str(pdf.relative_to(ROOT)).replace("\\", "/"),
                            "page": q["page"],
                            "hash": sha_short(
                                f"{block['subjectId']}::{year}::{q['number']}::{q['question']}"
                            ),
                            "answerMatched": ans is not None,
                            "geminiReady": bool(
                                q["question"].strip() and len(q["choices"]) >= 2 and ans is not None
                            ),
                            "status": "candidate",
                            "importVersion": "19B",
                        }
                        by_subject[block["subjectId"]].append(rec)
                completed += 1
            except Exception as exc:  # noqa: BLE001
                failed += 1
                print(f"FAIL {year} {session}: {exc}", file=sys.stderr)

    now = datetime.now(timezone.utc).isoformat()
    for subject_id, questions in by_subject.items():
        out_dir = SUBJECTS / subject_id
        out_dir.mkdir(parents=True, exist_ok=True)

        qdb = {
            "schemaVersion": "v1",
            "subjectId": subject_id,
            "exam": "감정평가사",
            "generatedAt": now,
            "importVersion": "19B",
            "status": "candidate",
            "productDbWriteForbidden": True,
            "count": len(questions),
            "geminiReadyCount": sum(1 for q in questions if q.get("geminiReady")),
            "questions": questions,
        }
        (out_dir / "question-db.json").write_text(
            json.dumps(qdb, ensure_ascii=False, indent=2), encoding="utf-8"
        )

        patterns = []
        for pid, name, kws in PATTERN_SEEDS.get(subject_id, []):
            hits = [
                q["questionId"]
                for q in questions
                if any(k in (q.get("question") or "") + " ".join(q.get("choices") or []) for k in kws)
            ]
            patterns.append(
                {
                    "patternCandidateId": f"{pid}_CAND",
                    "subjectId": subject_id,
                    "name": name,
                    "keywords": kws,
                    "questionIds": hits,
                    "hitCount": len(hits),
                    "status": "candidate",
                    "productPatternDbWriteForbidden": True,
                }
            )
        pdb = {
            "schemaVersion": "v1",
            "subjectId": subject_id,
            "generatedAt": now,
            "importVersion": "19B",
            "status": "candidate",
            "productDbWriteForbidden": True,
            "count": len(patterns),
            "patterns": patterns,
        }
        (out_dir / "pattern-candidate.json").write_text(
            json.dumps(pdb, ensure_ascii=False, indent=2), encoding="utf-8"
        )

        formulas = []
        for name, rx, formula in FORMULA_HINTS.get(subject_id, []):
            hits = [
                q["questionId"]
                for q in questions
                if rx.search((q.get("question") or "") + " ".join(q.get("choices") or []))
            ]
            formulas.append(
                {
                    "formulaCandidateId": f"FC-{subject_id}-{len(formulas)+1}",
                    "subjectId": subject_id,
                    "name": name,
                    "formula": formula,
                    "questionIds": hits,
                    "hitCount": len(hits),
                    "status": "candidate",
                    "officialFormulaDbWriteForbidden": True,
                }
            )
        fdb = {
            "schemaVersion": "v1",
            "subjectId": subject_id,
            "generatedAt": now,
            "importVersion": "19B",
            "status": "candidate",
            "officialFormulaDbWriteForbidden": True,
            "count": len(formulas),
            "formulas": formulas,
        }
        (out_dir / "formula-candidate.json").write_text(
            json.dumps(fdb, ensure_ascii=False, indent=2), encoding="utf-8"
        )

    report = {
        "sprint": "Sprint-19B",
        "generatedAt": now,
        "yearFrom": YEAR_FROM,
        "yearTo": YEAR_TO,
        "totalPdf": total_pdf,
        "completed": completed,
        "failed": failed,
        "ocrQualityAvg": round(ocr_sum / ocr_n) if ocr_n else 0,
        "questionCount": sum(len(v) for v in by_subject.values()),
        "subjectCount": len(by_subject),
        "subjects": {k: len(v) for k, v in by_subject.items()},
        "discovery": [
            {
                "year": r["year"],
                "exam_1": bool(r["exam_1"]),
                "exam_2": bool(r["exam_2"]),
                "answer": bool(r["answer"]),
            }
            for r in discovery
        ],
        "productDbWriteForbidden": True,
    }
    (SUBJECTS / "import-report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
