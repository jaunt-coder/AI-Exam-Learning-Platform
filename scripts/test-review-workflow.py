# -*- coding: utf-8 -*-
"""Sprint-12D — Human Review Workflow tests."""
from __future__ import annotations

import hashlib
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPECTED_QSHA = "66c92f0b416a03cb0c58e942d8812dfd42f8fefc42c53fea54d7c4be4e8b3a20"

qpath = ROOT / "data/question-db-mvp.json"
assert hashlib.sha256(qpath.read_bytes()).hexdigest() == EXPECTED_QSHA

required = [
    "js/review-workflow/workflow-service.js",
    "js/review-workflow/review-queue.js",
    "js/review-workflow/review-state.js",
    "js/review-workflow/review-assignment.js",
    "js/review-workflow/review-decision.js",
    "js/review-workflow/review-history.js",
    "js/review-workflow/review-export.js",
    "js/review-workflow/review-page.js",
    "review.html",
    "css/review-workflow.css",
]
for rel in required:
    assert (ROOT / rel).exists(), rel

# Status / decision enums present
state_js = (ROOT / "js/review-workflow/review-state.js").read_text(encoding="utf-8")
for s in (
    "NEW",
    "NEEDS_REVIEW",
    "IN_PROGRESS",
    "WAITING_AI",
    "WAITING_HUMAN",
    "APPROVED",
    "REJECTED",
    "SKIPPED",
    "COMPLETED",
):
    assert s in state_js, s

decision_js = (ROOT / "js/review-workflow/review-decision.js").read_text(encoding="utf-8")
for d in (
    "APPROVE_OVERRIDE",
    "REJECT_OVERRIDE",
    "APPROVE_AI",
    "REJECT_AI",
    "KEEP_ORIGINAL",
    "NEED_MANUAL_FIX",
):
    assert d in decision_js, d
assert "saveOverride" in decision_js
assert "clearOverride" in decision_js

queue_js = (ROOT / "js/review-workflow/review-queue.js").read_text(encoding="utf-8")
assert "buildReviewQueueFromQuality" in queue_js
assert "OCR_MISSING" in queue_js
assert "TABLE_MISSING" in queue_js
assert "PATTERN_MISMATCH" in queue_js

export_js = (ROOT / "js/review-workflow/review-export.js").read_text(encoding="utf-8")
assert "exportReviewReportCsv" in export_js
assert "exportReviewReportJson" in export_js

storage = (ROOT / "js/storage.js").read_text(encoding="utf-8")
assert "learning.review-workflow.v1" in storage
assert "learning.review-queue.v1" in storage
assert "learning.review-history.v1" in storage
assert "learning.review-decision.v1" in storage

loader = (ROOT / "js/data-loader.js").read_text(encoding="utf-8")
assert "reviewWorkflowContract" in loader
assert "reviewQueueContract" in loader
assert "reviewDecisionContract" in loader
assert "reviewAssignmentContract" in loader
assert re.search(r"\breviewWorkflow\s*:", loader)

page = (ROOT / "review.html").read_text(encoding="utf-8")
assert "rw-queue-list" in page
assert "Human Review Workflow" in page

quality = (ROOT / "quality.html").read_text(encoding="utf-8")
assert "Open Review" in quality
assert "review.html" in quality

# Frozen systems not imported/mutated by workflow decision beyond override/recovery APIs
assert "question-db" not in decision_js.lower() or "Read" in decision_js
runtime = (ROOT / "runtime/learning-loop.js").read_text(encoding="utf-8")
assert "review-workflow" not in runtime
coach = (ROOT / "js/coach/ai-coach-service.js").read_text(encoding="utf-8")
assert "review-workflow" not in coach

assert hashlib.sha256(qpath.read_bytes()).hexdigest() == EXPECTED_QSHA
print("PASS Queue / Decision / Contracts / Dashboard link")
print("ALL PASS - Sprint-12D Human Review Workflow")
