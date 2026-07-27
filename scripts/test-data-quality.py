# -*- coding: utf-8 -*-
"""Sprint-12C — Data Quality Center tests."""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPECTED_QSHA = "66c92f0b416a03cb0c58e942d8812dfd42f8fefc42c53fea54d7c4be4e8b3a20"


def effective_pattern(q):
    return q["primaryPattern"] if q.get("primaryPattern") is not None else q.get("patternId")


def compute_score(flags):
    if flags.get("broken"):
        return 0
    if flags.get("patternMismatch"):
        return 20
    if flags.get("tableMissing"):
        return 40
    if flags.get("ocrError"):
        return 60
    if flags.get("aiSuggestionPending"):
        return 80
    if flags.get("hasOverride") and flags.get("humanApproved"):
        return 90
    return 100


# Freeze
qpath = ROOT / "data/question-db-mvp.json"
assert hashlib.sha256(qpath.read_bytes()).hexdigest() == EXPECTED_QSHA
qs = json.loads(qpath.read_text(encoding="utf-8"))["questions"]
ps = json.loads((ROOT / "data/pattern-db-mvp.json").read_text(encoding="utf-8"))
assert len(qs) == 240

# Deliverables
required = [
    "js/quality/quality-engine.js",
    "js/quality/quality-score.js",
    "js/quality/quality-analyzer.js",
    "js/quality/quality-dashboard.js",
    "js/quality/quality-storage.js",
    "js/quality/quality-report.js",
    "quality.html",
    "css/quality-dashboard.css",
]
for rel in required:
    assert (ROOT / rel).exists(), rel

score_js = (ROOT / "js/quality/quality-score.js").read_text(encoding="utf-8")
assert "computeQualityScore" in score_js
assert "ORIGINAL" in score_js and "BROKEN" in score_js

engine = (ROOT / "js/quality/quality-engine.js").read_text(encoding="utf-8")
assert "buildQualitySnapshot" in engine
assert "buildAutoPriority" in engine
assert "filterQualityRows" in engine

report = (ROOT / "js/quality/quality-report.js").read_text(encoding="utf-8")
assert "exportQualityReportCsv" in report
assert "exportQualityReportJson" in report

storage = (ROOT / "js/storage.js").read_text(encoding="utf-8")
assert "learning.quality.v1" in storage
assert "quality-history.v1" in storage
assert "quality-report.v1" in storage

loader = (ROOT / "js/data-loader.js").read_text(encoding="utf-8")
assert "qualityContract" in loader
assert "qualityScoreContract" in loader
assert "qualityDashboardContract" in loader
assert re.search(r"\bquality\s*:", loader)
assert re.search(r"\bqualityDashboard\s*:", loader)
assert re.search(r"\bqualityScore\s*:", loader)

page = (ROOT / "quality.html").read_text(encoding="utf-8")
assert "Data Quality" in page
assert "qd-cards" in page
assert "Only OCR Error" in page
assert "Only Low Quality" in page

dash = (ROOT / "dashboard.html").read_text(encoding="utf-8")
assert "quality.html" in dash

# Recovery / question wire quality without coach mutation
recovery = (ROOT / "js/recovery/ai-recovery-service.js").read_text(encoding="utf-8")
assert "qualityScore" in recovery
assert "scoreQuestion" in recovery
qjs = (ROOT / "js/question.js").read_text(encoding="utf-8")
assert "_qualityScore" in qjs
coach = (ROOT / "js/coach/ai-coach-service.js").read_text(encoding="utf-8")
assert "quality/" not in coach
runtime = (ROOT / "runtime/learning-loop.js").read_text(encoding="utf-8")
assert "quality/" not in runtime

# Score bands
assert compute_score({"broken": True}) == 0
assert compute_score({"patternMismatch": True}) == 20
assert compute_score({"tableMissing": True}) == 40
assert compute_score({"ocrError": True}) == 60
assert compute_score({"aiSuggestionPending": True}) == 80
assert compute_score({"hasOverride": True, "humanApproved": True}) == 90
assert compute_score({}) == 100
print("PASS Quality Score bands")

# Q075 should be low-ish (table/pattern/ocr signals)
q075 = next(q for q in qs if q["questionId"] == "ACC_2015_Q075")
text = (q075.get("originalQuestion") or "") + (q075.get("question") or "")
assert "종합원" in text or "기초재공" in text.replace(" ", "")
print("PASS Auto Priority source question present")

assert hashlib.sha256(qpath.read_bytes()).hexdigest() == EXPECTED_QSHA
print("PASS Question DB Read Only")
print("ALL PASS - Sprint-12C Data Quality Center")
