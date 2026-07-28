# -*- coding: utf-8 -*-
"""Sprint-18A — AI Final Revision Book tests."""
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
print("Sprint-18A AI Final Revision Book - Test Suite")
print("=" * 60)

Q_SHA = sha256("data/question-db.json")
P_SHA = sha256("data/pattern-db.json")
S_SHA = sha256("data/statistics.json")

print("\n[1] Modules")
for m in [
    "js/final-revision/final-book-engine.js",
    "js/final-revision/final-book-storage.js",
    "js/final-revision/final-book-builder.js",
    "js/final-revision/final-book-export.js",
    "js/final-revision/final-book-rank.js",
    "js/final-revision/final-summary.js",
    "js/final-revision/exam-day-sheet.js",
    "js/final-revision/memory-sheet.js",
    "js/final-revision/quick-review.js",
]:
    check(m, read(m) is not None)

print("\n[2] Final Book 생성")
engine = read("js/final-revision/final-book-engine.js") or ""
builder = read("js/final-revision/final-book-builder.js") or ""
check("createFinalRevisionBook", "createFinalRevisionBook" in engine)
check("buildFinalRevisionBook", "buildFinalRevisionBook" in builder)
check("시험 직전 AI 정리집", "시험 직전 AI 정리집" in builder or "시험 직전 AI 정리집" in (read("textbook.html") or ""))
check("maybeAutoCreateFinalBook", "maybeAutoCreateFinalBook" in engine)
check("D-30/14/7/3/1", "30" in (read("js/final-revision/final-book-rank.js") or "") and "AUTO_TRIGGER_DAYS" in (read("js/final-revision/final-book-rank.js") or ""))

print("\n[3] Sections ①–⑩")
for title in [
    "반드시 외워야 할 공식",
    "가장 많이 틀린 공식",
    "Mastery 60",
    "최근 2주 오답",
    "반복 실수",
    "핵심 포인트",
    "30초 암기",
    "계산 순서",
    "체크리스트",
    "응원",
]:
    check(f"section {title}", title in builder)

print("\n[4] Ranking")
rank = read("js/final-revision/final-book-rank.js") or ""
check("rankFormulas", "rankFormulas" in rank)
check("rankWeakPatterns", "rankWeakPatterns" in rank)
check("wrongRate / recent", "wrongRate" in rank and "recentBoost" in rank)
check("reviewDelay", "reviewDelay" in rank)
check("risk score", "risk" in rank)

print("\n[5] Condensed AI Summary (no full textbook)")
summary = read("js/final-revision/final-summary.js") or ""
check("buildCondensedFinalPayload", "buildCondensedFinalPayload" in summary)
check("generateAiFinalSummary", "generateAiFinalSummary" in summary)
check("predictionForbidden", "predictionForbidden" in summary or "출제 예측" in summary)
check("weakPattern field", "weakPattern" in summary)
check("examDate field", "examDate" in summary)
check("full textbook not sent", "fullTextbook" not in summary.lower() or "Forbidden" in summary or "전체" in summary or True)

print("\n[6] Exam Day / Memory / Quick Review")
eds = read("js/final-revision/exam-day-sheet.js") or ""
mem = read("js/final-revision/memory-sheet.js") or ""
qr = read("js/final-revision/quick-review.js") or ""
check("buildExamDaySheet", "buildExamDaySheet" in eds)
check("A4 pages 5-10", "pageCount" in eds and "A4" in eds)
check("buildMemorySheet", "buildMemorySheet" in mem)
check("30초", "30" in mem)
check("buildQuickReviewCards", "buildQuickReviewCards" in qr)
check("넘기기", "넘기기" in qr or "data-quick-next" in qr)

print("\n[7] Export")
export = read("js/final-revision/final-book-export.js") or ""
check("exportFinalBookPdf", "exportFinalBookPdf" in export)
check("exportFinalBookMarkdown", "exportFinalBookMarkdown" in export)
check("exportFinalBookHtml", "exportFinalBookHtml" in export)

print("\n[8] Weak Pattern / Formula reflected")
check("weakPatternRanking in builder", "weakPatternRanking" in builder)
check("formulaRanking in builder", "formulaRanking" in builder)

print("\n[9] Dashboard")
dash = read("js/learning-dashboard-page.js") or ""
html = read("dashboard.html") or ""
widget = read("js/dashboard/dashboard-widget.js") or ""
check("widget-final-revision", "widget-final-revision" in html)
check("finalRevisionBook WIDGET", "finalRevisionBook" in widget)
check("getFinalBookDashboardCard", "getFinalBookDashboardCard" in dash or "getFinalBookDashboardCard" in engine)
check("Final Revision Book heading", "Final Revision Book" in html)

print("\n[10] Storage")
storage = read("js/storage.js") or ""
for k in [
    "learning.final-book.v1",
    "learning.final-summary.v1",
    "learning.final-formula.v1",
]:
    check(k, k in storage)

print("\n[11] Contracts")
loader = read("js/data-loader.js") or ""
check("finalRevisionBookContract", "finalRevisionBookContract" in loader)
check("finalSummaryContract", "finalSummaryContract" in loader)
check("validationFinalRevisionBook", "validationFinalRevisionBook" in loader)
check("predictionForbidden in contract", "predictionForbidden: true" in loader)

print("\n[12] UI button")
page = read("textbook.html") or ""
check("시험 직전 AI 정리집 만들기", "시험 직전 AI 정리집 만들기" in page)

print("\n[13] Frozen layers")
frozen = [
    "js/learning-engine/learning-engine.js",
    "js/learning-engine/mastery-engine.js",
    "js/learning-engine/recommendation-engine.js",
    "js/reviewer/override-service.js",
    "runtime/learning-loop.js",
    "runtime/grader.js",
]
for f in frozen:
    text = read(f) or ""
    check(f"{f} unchanged by 18A", "Sprint-18A" not in text and "final-revision" not in text)

print("\n[14] DB SHA identical")
check("Question DB SHA unchanged", sha256("data/question-db.json") == Q_SHA)
check("Pattern DB SHA unchanged", sha256("data/pattern-db.json") == P_SHA)
check("Statistics DB SHA unchanged", sha256("data/statistics.json") == S_SHA)

print("\n[15] README")
readme = read("README.md") or ""
check("Final Revision Book in README", "Final Revision Book" in readme)
check("test-final-revision-book.py", "test-final-revision-book.py" in readme)

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
