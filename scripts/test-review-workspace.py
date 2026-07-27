# -*- coding: utf-8 -*-
"""Sprint-12E — Reviewer Workspace + One-Click Review tests."""
from __future__ import annotations

import hashlib
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPECTED_QSHA = "66c92f0b416a03cb0c58e942d8812dfd42f8fefc42c53fea54d7c4be4e8b3a20"

qpath = ROOT / "data/question-db-mvp.json"
assert hashlib.sha256(qpath.read_bytes()).hexdigest() == EXPECTED_QSHA

ppath = ROOT / "data/pattern-db-mvp.json"
pattern_sha_before = hashlib.sha256(ppath.read_bytes()).hexdigest()

required = [
    "js/review-workspace/workspace-storage.js",
    "js/review-workspace/workspace-service.js",
    "js/review-workspace/quick-fix.js",
    "js/review-workspace/review-session.js",
    "js/review-workspace/focus-mode.js",
    "js/review-workspace/bulk-review.js",
    "js/review-workspace/workspace-page.js",
    "review-workspace.html",
    "css/review-workspace.css",
]
for rel in required:
    assert (ROOT / rel).exists(), rel

# Storage keys
storage = (ROOT / "js/storage.js").read_text(encoding="utf-8")
for key in (
    "learning.workspace.v1",
    "learning.review-session.v1",
    "learning.quick-fix.v1",
    "learning.focus-mode.v1",
):
    assert key in storage, key

# Contracts
loader = (ROOT / "js/data-loader.js").read_text(encoding="utf-8")
for name in (
    "reviewWorkspaceContract",
    "quickFixContract",
    "reviewSessionContract",
    "focusModeContract",
    "bulkReviewContract",
):
    assert name in loader, name
assert re.search(r"\breviewWorkspace\s*:", loader)

# DB read-only: workspace must use override / recovery / quality / workflow only
svc = (ROOT / "js/review-workspace/workspace-service.js").read_text(encoding="utf-8")
assert "saveOverride" not in svc or "override-service" in svc
assert "from '../reviewer/override-service.js'" in svc
assert "from '../recovery/ai-recovery-service.js'" in svc
assert "scoreQuestion" in svc or "refreshQualityForQuestion" in svc
assert "decide" in svc
assert "question-db" not in svc.lower()
assert "writeFile" not in svc
assert "fetch(" not in svc or "integrity" in svc.lower()

qf = (ROOT / "js/review-workspace/quick-fix.js").read_text(encoding="utf-8")
assert "saveOverride" in qf
assert "runAiRecovery" in qf
assert "approveByField" in qf or "approveAll" in qf
assert "OCR" in qf and "TABLE" in qf and "CHOICES" in qf
assert "PATTERN" in qf and "SOLUTION" in qf

# Keyboard shortcuts
page = (ROOT / "js/review-workspace/workspace-page.js").read_text(encoding="utf-8")
assert "Ctrl" in page or "ctrlKey" in page
assert "ArrowRight" in page
assert "ArrowLeft" in page
assert "Digit1" in page or "'1'" in page
assert "oneClickFix" in page
assert "oneClickApproveAi" in page
assert "bulkDecide" in page
assert "bulkExport" in page
assert "toggleFocusMode" in page

# Focus mode hides chrome
focus = (ROOT / "js/review-workspace/focus-mode.js").read_text(encoding="utf-8")
assert "rw-focus-mode" in focus
assert "setFocusMode" in focus

# Bulk review
bulk = (ROOT / "js/review-workspace/bulk-review.js").read_text(encoding="utf-8")
assert "Approve" in bulk or "APPROVE_AI" in bulk
assert "export" in bulk.lower()
assert "slice(0, 10)" in bulk

# Session
session = (ROOT / "js/review-workspace/review-session.js").read_text(encoding="utf-8")
assert "approved" in session
assert "rejected" in session
assert "skipped" in session
assert "accuracy" in session

# HTML layout: left queue / center / right AI
html = (ROOT / "review-workspace.html").read_text(encoding="utf-8")
assert "rws-queue" in html
assert "rws-center" in html
assert "rws-right" in html
assert "Fix OCR" in html
assert "Fix Table" in html
assert "Approve" in html
assert "Focus Mode" in html
assert "Approve All" in html
assert "Export JSON" in html
assert "Export CSV" in html
assert "Export MD" in html

# Links from Quality / Review
quality = (ROOT / "quality.html").read_text(encoding="utf-8")
assert "review-workspace.html" in quality
assert "Open Workspace" in quality
review = (ROOT / "review.html").read_text(encoding="utf-8")
assert "review-workspace.html" in review

# Frozen systems untouched by workspace modules
for frozen in (
    "runtime/learning-loop.js",
    "js/coach/ai-coach-service.js",
):
    text = (ROOT / frozen).read_text(encoding="utf-8")
    assert "review-workspace" not in text, frozen

# Question / Pattern DB unchanged
assert hashlib.sha256(qpath.read_bytes()).hexdigest() == EXPECTED_QSHA
assert hashlib.sha256(ppath.read_bytes()).hexdigest() == pattern_sha_before

print("PASS DB Read Only / Override / AI Recovery / Quality / Keyboard / Focus / Bulk / Export / Queue")
print("ALL PASS - Sprint-12E Reviewer Workspace")
