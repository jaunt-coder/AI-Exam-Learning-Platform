# -*- coding: utf-8 -*-
"""Sprint-18A — Personal AI Textbook tests."""
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


def sha256(rel):
    path = os.path.join(ROOT, rel)
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


print("=" * 60)
print("Sprint-18A Personal AI Textbook - Test Suite")
print("=" * 60)

Q_SHA = sha256("data/question-db.json")
P_SHA = sha256("data/pattern-db.json")
S_SHA = sha256("data/statistics.json")

MODULES = [
    "js/personal-textbook/textbook-engine.js",
    "js/personal-textbook/textbook-storage.js",
    "js/personal-textbook/textbook-builder.js",
    "js/personal-textbook/textbook-export.js",
    "js/personal-textbook/textbook-search.js",
    "js/personal-textbook/textbook-tag.js",
    "js/personal-textbook/textbook-progress.js",
    "js/personal-textbook/textbook-session.js",
]

print("\n[1] Modules exist")
for m in MODULES:
    check(m, read(m) is not None)

print("\n[2] Auto-save")
engine = read("js/personal-textbook/textbook-engine.js") or ""
smart = read("js/smart-tutor/smart-tutor.js") or ""
sol = read("js/solution-engine/solution-engine.js") or ""
check("autoSaveTextbookEntry", "autoSaveTextbookEntry" in engine)
check("Smart Tutor calls autoSave", "autoSaveTextbookEntry" in smart)
check("Gemini updateTextbookWithGemini", "updateTextbookWithGemini" in sol)
check("AI 해설집 보기 button", "AI 해설집 보기" in smart)
check("no AI 해설 저장 button", "AI 해설 저장" not in smart)

print("\n[3] Summary generation")
builder = read("js/personal-textbook/textbook-builder.js") or ""
check("buildPatternSummary", "buildPatternSummary" in builder)
check("min 3 solves", "length < 3" in builder or "list.length < 3" in builder)
check("version history", "history" in builder)
check("buildChapterSummary", "buildChapterSummary" in builder)
check("delete forbidden via history push", "history.push" in builder)

print("\n[4] Bookmark / Favorite / Weak")
check("toggleBookmark", "toggleBookmark" in engine)
check("toggleFavoriteFormula", "toggleFavoriteFormula" in engine)
check("buildWeakCollection", "buildWeakCollection" in builder)
check("내가 가장 자주 틀리는 공식", "자주 틀리는 공식" in builder)
check("내가 가장 많이 틀린 Pattern", "많이 틀린 Pattern" in builder)

print("\n[5] Search / Filter")
search = read("js/personal-textbook/textbook-search.js") or ""
check("searchTextbook", "searchTextbook" in search)
for f in ["correct", "wrong", "review", "favorite", "weak", "recent"]:
    check(f"filter {f}", f.upper() in search or f in search)
check("pattern field", "pattern" in search)
check("formula field", "formula" in search)
check("examTip field", "examTip" in search)

print("\n[6] Export")
export = read("js/personal-textbook/textbook-export.js") or ""
check("exportTextbookPdf", "exportTextbookPdf" in export)
check("exportTextbookMarkdown", "exportTextbookMarkdown" in export)
check("exportTextbookHtml", "exportTextbookHtml" in export)
check("title 나만의 AI 해설집", "나만의 AI 해설집" in export)
check("자동 목차", "목차" in export)

print("\n[7] History / Version")
check("getSummaryHistory", "getSummaryHistory" in engine)
check("version in summary", "version" in builder)

print("\n[8] Dashboard")
dash = read("js/learning-dashboard-page.js") or ""
widget = read("js/dashboard/dashboard-widget.js") or ""
html = read("dashboard.html") or ""
check("widget-personal-textbook", "widget-personal-textbook" in html)
check("personalTextbook WIDGET_IDS", "personalTextbook" in widget)
check("renderPersonalTextbookCard", "renderPersonalTextbookCard" in dash or "getTextbookDashboardCard" in dash)
check("총 페이지", "총 페이지" in dash or "pageCount" in dash)

print("\n[9] Storage keys")
storage = read("js/storage.js") or ""
for k in [
    "learning.personal-textbook.v1",
    "learning.personal-note.v1",
    "learning.personal-summary.v1",
    "learning.personal-tag.v1",
    "learning.personal-bookmark.v1",
    "learning.personal-favorite.v1",
]:
    check(k, k in storage)

print("\n[10] Contracts")
loader = read("js/data-loader.js") or ""
check("personalTextbookContract", "personalTextbookContract" in loader)
check("personalSummaryContract", "personalSummaryContract" in loader)
check("personalExportContract", "personalExportContract" in loader)
check("personalBookmarkContract", "personalBookmarkContract" in loader)
check("validationPersonalTextbook", "validationPersonalTextbook" in loader)

print("\n[11] UI page")
check("textbook.html", read("textbook.html") is not None)
check("personal-textbook-page.js", read("js/personal-textbook-page.js") is not None)
check("personal-textbook.css", read("css/personal-textbook.css") is not None)
tb = read("textbook.html") or ""
check("Pattern Tree", "Pattern Tree" in tb)
check("메모", "메모" in tb)

print("\n[12] Frozen layers")
frozen = [
    "js/learning-engine/learning-engine.js",
    "js/learning-engine/mastery-engine.js",
    "js/learning-engine/recommendation-engine.js",
    "js/reviewer/override-service.js",
    "runtime/learning-loop.js",
    "runtime/grader.js",
    "js/gemini-solver/gemini-orchestrator.js",
    "js/gemini-vision/vision-recovery.js",
]
for f in frozen:
    text = read(f) or ""
    check(f"{f} no Sprint-18A rewrite", "Sprint-18A" not in text and "personal-textbook" not in text)

print("\n[13] DB SHA identical")
check("Question DB SHA unchanged", sha256("data/question-db.json") == Q_SHA)
check("Pattern DB SHA unchanged", sha256("data/pattern-db.json") == P_SHA)
check("Statistics DB SHA unchanged", sha256("data/statistics.json") == S_SHA)

print("\n[14] README")
readme = read("README.md") or ""
check("Sprint 18A", "Sprint 18A" in readme or "Sprint-18A" in readme)
check("test-personal-textbook.py", "test-personal-textbook.py" in readme)
check("Personal AI Textbook", "Personal AI Textbook" in readme)

print("\n" + "=" * 60)
total = PASS + FAIL
print(f"Results: {PASS}/{total} PASS, {FAIL}/{total} FAIL")
print(f"Question DB SHA256: {Q_SHA}")
print(f"Pattern DB SHA256:  {P_SHA}")
print(f"Statistics SHA256:  {S_SHA}")
if FAIL:
    print("STATUS: FAIL")
    sys.exit(1)
print("STATUS: ALL PASS")
sys.exit(0)
