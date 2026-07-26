# -*- coding: utf-8 -*-
"""Generate data/question-integrity-report.json (read-only over Question DB)."""
from __future__ import annotations

import json
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

CHAPTER_SIGNATURES = {
    "ACC_COST": {
        "keywords": [
            "종합원가계산",
            "완성품환산량",
            "가중평균법",
            "선입선출법",
            "환산량",
            "기초재공품",
            "기말재공품",
            "당기투입량",
            "당기완성량",
            "가공원가",
            "전환원가",
        ],
        "minHits": 2,
    },
    "ACC_INV": {
        "keywords": [
            "재고자산",
            "매출원가",
            "저가법",
            "재고평가",
            "재고평가손실",
            "재고감모",
            "상품매입",
            "원재료",
            "재고자산감모손실",
        ],
        "minHits": 1,
    },
    "ACC_PPE": {
        "keywords": ["유형자산", "감가상각", "취득원가", "내용연수", "잔존가치"],
        "minHits": 2,
    },
    "ACC_REV": {
        "keywords": ["수익인식", "매출", "이행의무", "계약부채"],
        "minHits": 2,
    },
}

PATTERN_FAMILY_SIGNATURES = {
    "COST_PROCESS": {
        "keywords": [
            "종합원가계산",
            "완성품환산량",
            "가중평균법",
            "선입선출법",
            "환산량",
        ],
        "minHits": 2,
        "expectedChapter": "ACC_COST",
        "allowedPatternPrefixes": ["COST_PROCESS", "ACC_COST"],
    },
    "ACC_INV": {
        "keywords": ["재고자산", "저가법", "재고평가", "매출원가"],
        "minHits": 1,
        "expectedChapter": "ACC_INV",
        "allowedPatternPrefixes": ["ACC_INV"],
    },
}


def normalize_exam_text(text: str) -> str:
    return re.sub(r"\s+", "", unicodedata.normalize("NFKC", str(text or "")))


def count_hits(normalized: str, keywords):
    hits = []
    for kw in keywords:
        needle = normalize_exam_text(kw)
        if needle and needle in normalized:
            hits.append(kw)
    return hits


def effective_pattern(q):
    if q.get("primaryPattern") not in (None, ""):
        return str(q["primaryPattern"])
    if q.get("patternId") not in (None, ""):
        return str(q["patternId"])
    return None


def pattern_allowed(pattern_id, prefixes):
    if not pattern_id:
        return False
    pid = str(pattern_id)
    for p in prefixes:
        if pid == p or pid.startswith(p + "_") or pid.startswith(p):
            return True
    return False


def validate_question_classification(question):
    qid = str(question.get("questionId") or question.get("id") or "UNKNOWN")
    current_chapter = (
        str(question["chapterId"]) if question.get("chapterId") is not None else None
    )
    current_pattern = effective_pattern(question)
    raw = "\n".join(
        [
            str(question.get("originalQuestion") or ""),
            str(question.get("question") or ""),
            str(question.get("title") or ""),
        ]
    )
    normalized = normalize_exam_text(raw)

    chapter_hits = {}
    best_chapter, best_c_hits = None, []
    for cid, sig in CHAPTER_SIGNATURES.items():
        hits = count_hits(normalized, sig["keywords"])
        chapter_hits[cid] = hits
        if len(hits) >= sig["minHits"] and (
            best_chapter is None or len(hits) > len(best_c_hits)
        ):
            best_chapter, best_c_hits = cid, hits

    best_family, best_f_hits, best_sig = None, [], None
    for fam, sig in PATTERN_FAMILY_SIGNATURES.items():
        hits = count_hits(normalized, sig["keywords"])
        if len(hits) >= sig["minHits"] and (
            best_family is None or len(hits) > len(best_f_hits)
        ):
            best_family, best_f_hits, best_sig = fam, hits, sig

    detected_chapter = best_chapter
    if best_family == "COST_PROCESS":
        detected_chapter = best_sig["expectedChapter"]

    flags = []
    if detected_chapter and current_chapter and detected_chapter != current_chapter:
        flags.append("CHAPTER_MISMATCH")
    if best_family and best_sig:
        if not pattern_allowed(current_pattern, best_sig["allowedPatternPrefixes"]):
            flags.append("PATTERN_MISMATCH")

    q_type = str(question.get("questionType") or "")
    has_calc = question.get("hasCalculation") is True
    if best_family == "COST_PROCESS" and q_type and q_type != "calculation" and not has_calc:
        flags.append("QUESTION_TYPE_MISMATCH")

    subject = str(question.get("subjectId") or "")
    chapter = str(question.get("chapterId") or "")
    if subject == "ACC" and chapter and not (
        chapter.startswith("ACC_") or chapter.startswith("COST")
    ):
        flags.append("SUBJECT_CHAPTER_MISMATCH")

    if (
        current_pattern
        and current_chapter
        and str(current_pattern).startswith("COST_")
        and str(current_chapter).startswith("ACC_INV")
    ):
        if "CHAPTER_MISMATCH" not in flags:
            flags.append("CHAPTER_MISMATCH")
            if not detected_chapter:
                detected_chapter = "ACC_COST"

    hit_count = max(len(best_c_hits), len(best_f_hits))
    if not flags:
        confidence = "none"
    elif hit_count >= 4 or (hit_count >= 3 and len(flags) >= 2):
        confidence = "high"
    elif hit_count >= 2:
        confidence = "medium"
    else:
        confidence = "low"

    return {
        "questionId": qid,
        "currentChapter": current_chapter,
        "currentPattern": current_pattern,
        "detectedChapter": detected_chapter,
        "detectedPatternFamily": best_family,
        "confidence": confidence,
        "flags": flags,
        "keywordHits": {
            "chapter": best_c_hits,
            "patternFamily": best_f_hits,
        },
    }


def main():
    qs = json.loads((ROOT / "data/question-db-mvp.json").read_text(encoding="utf-8"))[
        "questions"
    ]
    verdicts = [validate_question_classification(q) for q in qs]
    mismatched = [v for v in verdicts if v["flags"]]
    high_risk = [v for v in mismatched if v["confidence"] == "high"]
    review = [v for v in mismatched if v["confidence"] in ("high", "medium")]
    report = {
        "generatedAt": datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z"),
        "totalChecked": len(qs),
        "mismatchCount": len(mismatched),
        "highRiskQuestions": high_risk,
        "reviewRequired": review,
        "schemaVersion": "v1",
        "sprint": "Sprint-11D",
    }
    out = ROOT / "data/question-integrity-report.json"
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        f"Wrote {out} total={report['totalChecked']} mismatch={report['mismatchCount']} high={len(high_risk)}"
    )


if __name__ == "__main__":
    main()
