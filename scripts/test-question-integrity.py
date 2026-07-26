# -*- coding: utf-8 -*-
"""Sprint-11D — Question Classification Integrity Gate tests."""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPECTED_QSHA = "66c92f0b416a03cb0c58e942d8812dfd42f8fefc42c53fea54d7c4be4e8b3a20"

# Import generator validators
import importlib.util

spec = importlib.util.spec_from_file_location(
    "gen_integrity",
    ROOT / "scripts/generate-question-integrity-report.py",
)
gen = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(gen)


def effective_pattern(q):
    return q["primaryPattern"] if q.get("primaryPattern") is not None else q.get("patternId")


# Freeze DB
qpath = ROOT / "data/question-db-mvp.json"
assert hashlib.sha256(qpath.read_bytes()).hexdigest() == EXPECTED_QSHA
qs = json.loads(qpath.read_text(encoding="utf-8"))["questions"]
ps = json.loads((ROOT / "data/pattern-db-mvp.json").read_text(encoding="utf-8"))
assert len(qs) == 240
assert sum(1 for q in qs if q.get("primaryPattern")) == 20
assert (
    sum(
        1
        for p in ps
        if p.get("frequency")
        != sum(1 for q in qs if effective_pattern(q) == p["patternId"])
    )
    == 0
)

# Deliverables
validator_js = (ROOT / "js/validation/question-classification-validator.js").read_text(
    encoding="utf-8"
)
assert "export function validateQuestionClassification" in validator_js
assert "CHAPTER_MISMATCH" in validator_js
assert "PATTERN_MISMATCH" in validator_js
assert "종합원가계산" in validator_js
assert "재고자산" in validator_js

report_path = ROOT / "data/question-integrity-report.json"
assert report_path.exists()
report = json.loads(report_path.read_text(encoding="utf-8"))
for key in (
    "generatedAt",
    "totalChecked",
    "mismatchCount",
    "highRiskQuestions",
    "reviewRequired",
):
    assert key in report
assert report["totalChecked"] == 240
assert isinstance(report["highRiskQuestions"], list)
assert isinstance(report["reviewRequired"], list)

dash_html = (ROOT / "dashboard.html").read_text(encoding="utf-8")
dash_page = (ROOT / "js/learning-dashboard-page.js").read_text(encoding="utf-8")
assert "Integrity Monitor" in dash_html or "integrity-heading" in dash_html
assert "card-integrity" in dash_html
assert "question-integrity-report" in dash_page or "loadIntegrityReport" in dash_page

# Runtime / frozen paths untouched by validator (no writes)
assert "setItem(" not in validator_js
runtime = (ROOT / "runtime/learning-loop.js").read_text(encoding="utf-8")
assert "question-classification-validator" not in runtime

# ACC_2015_Q075 detection
q075 = next(q for q in qs if q.get("questionId") == "ACC_2015_Q075")
assert q075["chapterId"] == "ACC_INV"
assert q075["patternId"] == "ACC_INV_006"

verdict = gen.validate_question_classification(q075)
assert verdict["questionId"] == "ACC_2015_Q075"
assert verdict["currentChapter"] == "ACC_INV"
assert verdict["currentPattern"] == "ACC_INV_006"
assert verdict["detectedChapter"] == "ACC_COST"
assert "CHAPTER_MISMATCH" in verdict["flags"]
print("PASS CHAPTER_MISMATCH")
assert "PATTERN_MISMATCH" in verdict["flags"]
print("PASS PATTERN_MISMATCH")
assert verdict["confidence"] == "high"
print("PASS ACC_2015_Q075 detection (high confidence)")

# Report includes Q075
high_ids = {v["questionId"] for v in report["highRiskQuestions"]}
review_ids = {v["questionId"] for v in report["reviewRequired"]}
assert "ACC_2015_Q075" in high_ids or "ACC_2015_Q075" in review_ids
q075_report = next(
    v
    for v in report["highRiskQuestions"] + report["reviewRequired"]
    if v["questionId"] == "ACC_2015_Q075"
)
assert "CHAPTER_MISMATCH" in q075_report["flags"]
assert "PATTERN_MISMATCH" in q075_report["flags"]
print("PASS report contains ACC_2015_Q075")

assert report["mismatchCount"] >= 1
print("ALL PASS - Sprint-11D Question Classification Integrity Gate")
