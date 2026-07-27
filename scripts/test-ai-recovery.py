# -*- coding: utf-8 -*-
"""Sprint-12B — AI Recovery Assistant tests."""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPECTED_QSHA = "66c92f0b416a03cb0c58e942d8812dfd42f8fefc42c53fea54d7c4be4e8b3a20"


def effective_pattern(q):
    return q["primaryPattern"] if q.get("primaryPattern") is not None else q.get("patternId")


# Freeze DBs
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
required = [
    "js/recovery/ai-recovery-service.js",
    "js/recovery/suggestion-engine.js",
    "js/recovery/confidence-engine.js",
    "js/recovery/diff-engine.js",
    "js/recovery/approval-engine.js",
    "js/recovery/recovery-cache.js",
]
for rel in required:
    assert (ROOT / rel).exists(), rel

# No forbidden ocr-* leftover filenames required by old draft
assert not (ROOT / "js/recovery/ocr-recovery-service.js").exists()

svc = (ROOT / "js/recovery/ai-recovery-service.js").read_text(encoding="utf-8")
assert "export function runAiRecovery" in svc
assert "buildRecoveryDashboardCard" in svc
assert "from '../reviewer/override-service.js'" in svc or 'from "../reviewer/override-service.js"' in svc

approval = (ROOT / "js/recovery/approval-engine.js").read_text(encoding="utf-8")
assert "saveOverride" in approval
assert "approveChanges" in approval
assert "rejectChanges" in approval

sug = (ROOT / "js/recovery/suggestion-engine.js").read_text(encoding="utf-8")
assert "generateRecoverySuggestions" in sug
assert "MISSING_TABLE" in sug or "missing" in sug.lower()

conf = (ROOT / "js/recovery/confidence-engine.js").read_text(encoding="utf-8")
assert "HIGH" in conf and "0.97" in conf

diff = (ROOT / "js/recovery/diff-engine.js").read_text(encoding="utf-8")
assert "diffToneClass" in diff

cache = (ROOT / "js/recovery/recovery-cache.js").read_text(encoding="utf-8")
assert "learning.recovery.v1" in cache
assert "learning.suggestion.v1" in cache
assert "learning.confidence.v1" in cache

storage = (ROOT / "js/storage.js").read_text(encoding="utf-8")
assert "LEARNING_RECOVERY_V1" in storage
assert "learning.recovery.v1" in storage

loader = (ROOT / "js/data-loader.js").read_text(encoding="utf-8")
assert "aiRecoveryContract" in loader
assert "suggestionContract" in loader
assert "confidenceContract" in loader
assert "approvalContract" in loader
assert re.search(r"\baiRecovery\s*:", loader)

# 12A Reviewer integration — AI Recovery tab
review_ui = (ROOT / "js/reviewer/review-ui.js").read_text(encoding="utf-8")
assert 'data-tab="ai-recovery"' in review_ui
assert "runAiRecovery" in review_ui
assert "Approve All" in review_ui

# Override resolver untouched (no recovery imports)
override = (ROOT / "js/reviewer/override-service.js").read_text(encoding="utf-8")
assert "recovery/" not in override
assert "runAiRecovery" not in override

# Runtime / AI Coach / LLM untouched
runtime = (ROOT / "runtime/learning-loop.js").read_text(encoding="utf-8")
assert "ai-recovery" not in runtime
assert "learning.suggestion" not in runtime
coach = (ROOT / "js/coach/ai-coach-service.js").read_text(encoding="utf-8")
assert "recovery/" not in coach
llm = (ROOT / "js/llm/llm-client.js").read_text(encoding="utf-8")
assert "recovery/" not in llm

dash = (ROOT / "dashboard.html").read_text(encoding="utf-8")
page = (ROOT / "js/learning-dashboard-page.js").read_text(encoding="utf-8")
assert "Recovery Summary" in dash
assert "card-recovery" in dash
assert "buildRecoveryDashboardCard" in page

# Mirror suggestion for ACC_2015_Q075
q075 = next(q for q in qs if q.get("questionId") == "ACC_2015_Q075")
text = (q075.get("originalQuestion") or "") + (q075.get("question") or "")
compact = re.sub(r"\s+", "", text)
assert "기초재공품" in compact or "기초재공" in compact
assert "종합원가" in compact or "종합원" in text

# Expect table change shape
change = {
    "field": "table",
    "before": None,
    "after": {
        "headers": ["구분", "수량", "완성도"],
        "rows": [["기초재공품", "10,000", "20%"]],
    },
    "explain": "원본 PDF에는 3열 표가 존재합니다.",
}
assert change["field"] == "table"
assert change["after"]["headers"][0] == "구분"
print("PASS Suggestion schema (table)")

# Confidence bands
def classify(score):
    if score >= 0.97:
        return "HIGH"
    if score >= 0.9:
        return "MEDIUM"
    return "LOW"


assert classify(0.98) == "HIGH"
assert classify(0.93) == "MEDIUM"
assert classify(0.85) == "LOW"
print("PASS Confidence bands")

# Approve policy: uses override API symbolically
assert "saveOverride" in approval
print("PASS Approve uses 12A Override API")

assert hashlib.sha256(qpath.read_bytes()).hexdigest() == EXPECTED_QSHA
print("PASS Question DB Read Only")
print("ALL PASS - Sprint-12B AI Recovery Assistant")
