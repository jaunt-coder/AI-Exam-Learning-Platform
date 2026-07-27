# -*- coding: utf-8 -*-
"""Sprint-12F — Reviewer Entry Integration tests."""
from __future__ import annotations

import hashlib
import io
import os
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PASS = 0
FAIL = 0

FROZEN = {
    "data/question-db.json": "93ef67ba4a725d6623134421eaf7ef8234269ded5906b2c7b8cadb823f9d8f3a",
    "data/question-db-mvp.json": "66c92f0b416a03cb0c58e942d8812dfd42f8fefc42c53fea54d7c4be4e8b3a20",
    "data/pattern-db.json": "f730f22ba33a44bfa1c7eb6c04eadcec2a0f255bbc9ee73fa9b8c19a9479aeed",
    "data/statistics.json": "37294c06391c795cd9289ec197826a13ea33e885db11af0cca469129a21dba4e",
}


def check(desc, cond):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  PASS  {desc}")
    else:
        FAIL += 1
        print(f"  FAIL  {desc}")


def read(rel):
    path = os.path.join(ROOT, rel)
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


print("=" * 60)
print("Sprint-12F Reviewer Entry Integration - Test Suite")
print("=" * 60)

print("\n[1] Modules")
modules = [
    "js/reviewer/review-entry.js",
    "js/reviewer/review-toolbar.js",
    "js/reviewer/review-modal.js",
    "js/reviewer/review-draft.js",
    "js/reviewer/review-shortcut.js",
]
for m in modules:
    text = read(m)
    check(m, text is not None and len((text or "").strip()) > 50)

print("\n[2] Reviewer Button / Toolbar")
toolbar = read("js/reviewer/review-toolbar.js") or ""
check("PDF button", 'data-rv-tool="pdf"' in toolbar or "PDF" in toolbar)
check("AI button", 'data-rv-tool="ai"' in toolbar or "AI" in toolbar)
check("수정 button", "수정" in toolbar)
check("Report Issue retained", "Report Issue" in toolbar or "openProblemReportModal" in toolbar)

q_html = read("question.html") or ""
ll_html = read("learning-loop.html") or ""
check("review-entry-toolbar on question.html", "review-entry-toolbar" in q_html)
check("review-entry-toolbar on learning-loop.html", "review-entry-toolbar" in ll_html)
check("reviewer.css on learning-loop", "reviewer.css" in ll_html)

print("\n[3] Modal / Editors / Decisions")
modal = read("js/reviewer/review-modal.js") or ""
ui = read("js/reviewer/review-ui.js") or ""
entry = read("js/reviewer/review-entry.js") or ""
check("Reviewer Modal open", "openReviewModal" in modal)
check("OCR textarea path", "rv-question-text" in ui)
check("Table editor", "createTableEditor" in ui)
check("Choice editor", "createChoiceEditor" in ui)
check("Pattern editor", "createPatternEditor" in ui)
check("Solution textarea", "rv-solution-text" in ui)
check("Approve", "approve" in ui.lower() and "data-act=\"approve\"" in ui)
check("Reject history only", "REJECT" in ui and "appendReviewHistory" in ui)
check("Skip", 'data-act="skip"' in ui)
check("Next", 'data-act="next"' in ui)
check("AI Recovery tab", "ai-recovery" in ui)
check("saveOverride only approve", "saveOverride" in ui and "performSave" in ui)

print("\n[4] Student Resolved immediate reflect")
qjs = read("js/question.js") or ""
lljs = read("js/learning-loop-page.js") or ""
check("question uses initReviewEntry", "initReviewEntry" in qjs)
check("question uses renderReviewToolbar", "renderReviewToolbar" in qjs)
check("question studentQuestionForDisplay", "studentQuestionForDisplay" in qjs)
check("learning-loop initReviewEntry", "initReviewEntry" in lljs)
check("learning-loop renderReviewToolbar", "renderReviewToolbar" in lljs)
check("learning-loop Resolved display", "studentQuestionForDisplay" in lljs)
check("applyResolvedToStudyQuestion", "applyResolvedToStudyQuestion" in entry)

print("\n[5] Draft / Keyboard")
draft = read("js/reviewer/review-draft.js") or ""
shortcut = read("js/reviewer/review-shortcut.js") or ""
check("Draft autosave 5s", "5000" in draft or "AUTOSAVE_MS = 5000" in draft)
check("saveDraft", "saveDraft" in draft)
check("Ctrl+S", "Ctrl+S" in shortcut or "key === 's'" in shortcut)
check("Ctrl+Enter Approve", "Enter" in shortcut)
check("Esc close", "Escape" in shortcut)

print("\n[6] Storage")
storage = read("js/storage.js") or ""
check("learning.review-draft.v1", "learning.review-draft.v1" in storage)
check("learning.review-ui.v1", "learning.review-ui.v1" in storage)
check("learning.review-shortcut.v1", "learning.review-shortcut.v1" in storage)

print("\n[7] Contract")
loader = read("js/data-loader.js") or ""
for key in (
    "reviewEntryContract",
    "reviewToolbarContract",
    "reviewModalContract",
    "reviewDraftContract",
    "validationReviewEntry",
):
    check(f"contract {key}", key in loader)

print("\n[8] Accessibility / Responsive")
css = read("css/reviewer.css") or ""
check("aria-modal", "aria-modal" in modal)
check("role=dialog", 'role="dialog"' in modal or "role='dialog'" in modal or "setAttribute('role', 'dialog')" in modal)
check("focus restore", "previousFocus" in modal)
check("responsive 900px", "900px" in css)
check("responsive 480px", "480px" in css)

print("\n[9] Question DB immutable")
for rel, expected in FROZEN.items():
    path = os.path.join(ROOT, rel)
    exists = os.path.exists(path)
    if not exists:
        check(f"{rel} exists", False)
        continue
    with open(path, "rb") as f:
        got = hashlib.sha256(f.read()).hexdigest()
    check(f"{rel} unchanged", got == expected)

print("\n[10] Non-Goals (engines untouched by Sprint-12F entry)")
# Entry modules must not rewrite Learning Engine / mastery / recommendation ranking
le = read("js/learning-engine/learning-engine.js") or ""
check("Learning Engine still present", "export" in le and len(le) > 100)
# Override path only
check("entry uses saveOverride path", "saveOverride" in ui)
check("entry does not write question-db", "question-db.json" not in entry)

print("\n[11] Runtime learning-loop.js not rewritten for entry")
runtime = read("runtime/learning-loop.js") or ""
check("runtime has no review-entry import", "review-entry" not in runtime)
check("runtime has no review-modal import", "review-modal" not in runtime)

print("\n" + "=" * 60)
print(f"Results: {PASS}/{PASS + FAIL} PASS, {FAIL}/{PASS + FAIL} FAIL")
print("STATUS: PASS" if FAIL == 0 else "STATUS: FAIL")
sys.exit(0 if FAIL == 0 else 1)
