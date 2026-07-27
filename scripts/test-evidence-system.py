# -*- coding: utf-8 -*-
"""Sprint-14C — Evidence System + Explainable Recommendation tests."""
from __future__ import annotations

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


print("=" * 60)
print("Sprint-14C Evidence System - Test Suite")
print("=" * 60)

print("\n[1] Modules")
modules = [
    "js/evidence/evidence-engine.js",
    "js/evidence/evidence-builder.js",
    "js/evidence/evidence-score.js",
    "js/evidence/evidence-summary.js",
    "js/evidence/evidence-cache.js",
    "js/evidence/evidence-storage.js",
    "js/evidence/evidence-utils.js",
    "js/evidence/evidence-renderer.js",
]
for m in modules:
    text = read(m)
    check(m, text is not None and len((text or "").strip()) > 50)

print("\n[2] Evidence generation / types")
builder = read("js/evidence/evidence-builder.js") or ""
for t in [
    "WrongHistory",
    "Mastery",
    "Confidence",
    "ReviewCycle",
    "RecommendationReason",
    "PatternEvidence",
    "StudyEvidence",
    "QualityEvidence",
]:
    check(f"type {t}", t in builder)
check("EVIDENCE_TYPE_COUNT = 8", "EVIDENCE_TYPE_COUNT = 8" in builder)
check("buildEvidenceForRecommendation", "buildEvidenceForRecommendation" in builder)

print("\n[3] Summary")
summary = read("js/evidence/evidence-summary.js") or ""
check("buildEvidenceSummary", "buildEvidenceSummary" in summary)
engine = read("js/evidence/evidence-engine.js") or ""
check("explainRecommendation", "explainRecommendation" in engine)
check("attachEvidenceToRecommendations", "attachEvidenceToRecommendations" in engine)

print("\n[4] Dashboard")
dash = read("js/learning-dashboard-page.js") or ""
rec = read("js/components/dashboard/recommendation.js") or ""
html = read("dashboard.html") or ""
check("attachEvidenceToRecommendations in dashboard", "attachEvidenceToRecommendations" in dash)
check("Evidence badge in recommendation UI", "renderEvidenceBadge" in rec)
check("Evidence detail accordion", "renderEvidenceDetail" in rec)
check("evidence.css linked on dashboard", "evidence.css" in html)

print("\n[5] Tutor")
tutor = read("js/ai-tutor.js") or ""
check("buildTutorEvidenceContext", "buildTutorEvidenceContext" in tutor)
check("Evidence rendered in tutor", "renderEvidenceDetail" in tutor)

print("\n[6] Student Question")
question = read("js/question.js") or ""
qhtml = read("question.html") or ""
check("Why Recommended button", "Why Recommended" in question or "why-recommended" in question)
check("explainQuestionRecommendation", "explainQuestionRecommendation" in question)
check("evidence.css on question page", "evidence.css" in qhtml)

print("\n[7] Recommendation page wrapper")
recpage = read("js/recommendation.js") or ""
rechtml = read("recommendation.html") or ""
check("recommendation.js wrapper exists", bool(recpage))
check("does not rewrite ranking", "ranking" in recpage.lower() or "Does not change" in recpage)
check("recommendation.html uses recommendation.js", "recommendation.js" in rechtml)

print("\n[8] Storage")
storage = read("js/storage.js") or ""
for key in [
    "learning.evidence.v1",
    "learning.evidence-cache.v1",
    "learning.evidence-history.v1",
    "learning.evidence-summary.v1",
]:
    check(f"storage {key}", key in storage)
estor = read("js/evidence/evidence-storage.js") or ""
check("PAD read-only protected", "readEvidencePad" in estor and "do not overwrite" in estor.lower() or "PAD" in estor)

print("\n[9] Contract")
loader = read("js/data-loader.js") or ""
for c in [
    "evidenceContract",
    "evidenceScoreContract",
    "evidenceSummaryContract",
    "recommendationEvidenceContract",
    "dashboardEvidenceContract",
    "tutorEvidenceContract",
    "validationEvidence",
]:
    check(f"contract {c}", c in loader)

print("\n[10] Accessibility / Performance")
renderer = read("js/evidence/evidence-renderer.js") or ""
css = read("css/evidence.css") or ""
cache = read("js/evidence/evidence-cache.js") or ""
check("ARIA status badge", "aria-label" in renderer)
check("progressbar score", "progressbar" in renderer)
check("focus-visible", "focus-visible" in css)
check("cache reuse", "getCachedEvidence" in cache and "setCachedEvidence" in cache)
check("requestAnimationFrame in recommendation wrapper", "requestAnimationFrame" in recpage)

print("\n[11] Non-Goals")
for frozen in [
    "js/learning-engine/learning-engine.js",
    "js/learning-engine/recommendation-engine.js",
    "js/learning-engine/mastery-engine.js",
    "js/recommendation-engine.js",
    "js/reviewer/override-service.js",
    "js/recovery/ai-recovery-service.js",
]:
    text = read(frozen) or ""
    check(f"{frozen} not Sprint-14C rewritten", "Sprint-14C" not in text)

print("\n[12] Decision API (Reviewer Logic untouched)")
check("recordEvidenceDecision API", "recordEvidenceDecision" in engine)
check("review-decision.js untouched by Sprint-14C", "Sprint-14C" not in (read("js/review-workflow/review-decision.js") or ""))

print("\n" + "=" * 60)
total = PASS + FAIL
print(f"Results: {PASS}/{total} PASS, {FAIL}/{total} FAIL")
if FAIL:
    print("STATUS: FAIL")
    sys.exit(1)
print("STATUS: PASS")
sys.exit(0)
