# -*- coding: utf-8 -*-
"""Sprint-12F — Review UI toolbar visibility checks."""
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

MODULES = [
    "js/reviewer/review-entry.js",
    "js/reviewer/review-toolbar.js",
    "js/reviewer/review-modal.js",
    "js/reviewer/review-shortcut.js",
]


def check(desc: str, cond: bool) -> None:
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  PASS  {desc}")
    else:
        FAIL += 1
        print(f"  FAIL  {desc}")


def read(rel: str) -> str | None:
    path = os.path.join(ROOT, rel)
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def imports_module(source: str, module_basename: str) -> bool:
    """True if source imports the module by path or basename."""
    needles = (
        f"./{module_basename}",
        f"./{module_basename}.js",
        f"reviewer/{module_basename}",
        f"reviewer/{module_basename}.js",
        f"'{module_basename}.js'",
        f'"{module_basename}.js"',
        f"/{module_basename}.js",
    )
    return any(n in source for n in needles)


print("=" * 60)
print("Sprint-12F Review UI Visibility - Test Suite")
print("=" * 60)

print("\n[1] Modules exist")
module_texts: dict[str, str] = {}
for rel in MODULES:
    text = read(rel)
    module_texts[rel] = text or ""
    check(rel, text is not None and len((text or "").strip()) > 50)

entry = module_texts["js/reviewer/review-entry.js"]
toolbar = module_texts["js/reviewer/review-toolbar.js"]
modal = module_texts["js/reviewer/review-modal.js"]
shortcut = module_texts["js/reviewer/review-shortcut.js"]

qjs = read("js/question.js") or ""
lljs = read("js/learning-loop-page.js") or ""
ui = read("js/reviewer/review-ui.js") or ""
q_html = read("question.html") or ""
ll_html = read("learning-loop.html") or ""
css = read("css/reviewer.css") or ""

print("\n[2] Import chains (pages or review-entry)")
# Pages import review-entry; entry imports toolbar/modal; shortcut may be via entry or modal
check(
    "question.js imports review-entry",
    "review-entry.js" in qjs and ("initReviewEntry" in qjs or "renderReviewToolbar" in qjs),
)
check(
    "learning-loop-page.js imports review-entry",
    "review-entry.js" in lljs and ("initReviewEntry" in lljs or "renderReviewToolbar" in lljs),
)
check("review-entry imports review-toolbar", imports_module(entry, "review-toolbar"))
check("review-entry imports review-modal", imports_module(entry, "review-modal"))
check(
    "review-shortcut imported in chain",
    imports_module(entry, "review-shortcut")
    or imports_module(modal, "review-shortcut")
    or imports_module(toolbar, "review-shortcut")
    or "review-shortcut" in qjs
    or "review-shortcut" in lljs
    or "bindReviewShortcuts" in entry
    or "review-shortcut" in (read("js/reviewer/review-modal.js") or ""),
)

print("\n[3] initReviewEntry / renderReviewToolbar on both pages")
check("initReviewEntry in question.js", "initReviewEntry" in qjs)
check("renderReviewToolbar in question.js", "renderReviewToolbar" in qjs)
check("initReviewEntry in learning-loop-page.js", "initReviewEntry" in lljs)
check("renderReviewToolbar in learning-loop-page.js", "renderReviewToolbar" in lljs)

print("\n[4] HTML static toolbar buttons")
for label, html in (("question.html", q_html), ("learning-loop.html", ll_html)):
    check(f'{label} data-rv-tool="pdf"', 'data-rv-tool="pdf"' in html)
    check(f'{label} data-rv-tool="ai"', 'data-rv-tool="ai"' in html)
    check(f'{label} data-rv-tool="edit"', 'data-rv-tool="edit"' in html)
    check(f"{label} review-entry-toolbar host", 'id="review-entry-toolbar"' in html)

print("\n[5] Console / Modal / Approve paths")
check("Review Toolbar Mounted log", "Review Toolbar Mounted" in entry)
check("openReviewModal exists", "openReviewModal" in modal or "openReviewModal" in entry)
check(
    "saveOverride in approve/performSave path",
    "saveOverride" in ui and "performSave" in ui,
)
check("question.js onApprove rerender", "onApprove" in qjs and "renderSolveView" in qjs)
check(
    "learning-loop-page.js onApprove rerender",
    "onApprove" in lljs and ("renderQuestion" in lljs or "renderSolve" in lljs or "renderPanel" in lljs or "studentQuestionForDisplay" in lljs),
)

print("\n[6] CSS visibility")
check(".rv-entry-toolbar flex !important", "display: flex !important" in css)
check(".rv-entry-btn visible", "inline-flex !important" in css or ".rv-entry-btn" in css)
check(
    "panel/solve toolbar override",
    "#panel-question .rv-entry-toolbar" in css or "#question-solve-section .rv-entry-toolbar" in css,
)

print("\n[7] Frozen DB hashes unchanged")
for rel, expected in FROZEN.items():
    path = os.path.join(ROOT, rel)
    if not os.path.exists(path):
        check(f"{rel} exists", False)
        continue
    with open(path, "rb") as f:
        got = hashlib.sha256(f.read()).hexdigest()
    check(f"{rel} unchanged", got == expected)

print("\n" + "=" * 60)
print(f"Results: {PASS}/{PASS + FAIL} PASS, {FAIL}/{PASS + FAIL} FAIL")
print("STATUS: PASS" if FAIL == 0 else "STATUS: FAIL")
sys.exit(0 if FAIL == 0 else 1)
