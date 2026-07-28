# -*- coding: utf-8 -*-
"""Sprint-17B — Gemini Vision OCR Recovery Layer tests."""
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
print("Sprint-17B Gemini Vision OCR Recovery - Test Suite")
print("=" * 60)

Q_SHA = sha256("data/question-db.json")
P_SHA = sha256("data/pattern-db.json")
S_SHA = sha256("data/statistics.json")

print("\n[1] Modules (12)")
modules = [
    "js/gemini-vision/vision-engine.js",
    "js/gemini-vision/vision-cache.js",
    "js/gemini-vision/vision-storage.js",
    "js/gemini-vision/vision-parser.js",
    "js/gemini-vision/vision-validator.js",
    "js/gemini-vision/vision-quality.js",
    "js/gemini-vision/vision-reader.js",
    "js/gemini-vision/pdf-crop.js",
    "js/gemini-vision/question-locator.js",
    "js/gemini-vision/ocr-quality.js",
    "js/gemini-vision/vision-recovery.js",
    "js/gemini-vision/vision-utils.js",
]
for m in modules:
    text = read(m)
    check(m, text is not None and len((text or "").strip()) > 40)

print("\n[2] OCR Quality Engine")
ocr = read("js/gemini-vision/ocr-quality.js") or ""
check("scoreOcrQuality", "scoreOcrQuality" in ocr)
check("LINEBREAK deduction", "LINEBREAK" in ocr or "줄바꿈" in ocr)
check("MISSING_TABLE -25", "MISSING_TABLE" in ocr and "-25" in ocr)
check("CHOICES_SHORT -20", "CHOICES_SHORT" in ocr and "-20" in ocr)
check("FORMULA_BROKEN -10", "FORMULA_BROKEN" in ocr and "-10" in ocr)
check("threshold default 70", "70" in ocr or "DEFAULT_OCR_THRESHOLD" in ocr)
check("useVision when below threshold", "useVision" in ocr)

print("\n[3] Vision Prompt — restore only")
reader = read("js/gemini-vision/vision-reader.js") or ""
check("VISION_RESTORE_PROMPT", "VISION_RESTORE_PROMPT" in reader)
check("추론 금지", "추론 금지" in reader)
check("표는 HTML Table", "HTML Table" in reader)
check("Markdown 사용 금지", "Markdown 사용 금지" in reader)
check("수식은 Latex", "Latex" in reader)
check("JSON 외 출력 금지", "JSON 외 출력 금지" in reader)
check("callGeminiVision", "callGeminiVision" in reader)
check("inline_data image part", "inline_data" in reader)

print("\n[4] Vision JSON + HTML Table + Formula")
parser = read("js/gemini-vision/vision-parser.js") or ""
validator = read("js/gemini-vision/vision-validator.js") or ""
check("normalizeVisionPayload", "normalizeVisionPayload" in parser)
check("choices schema", "choices" in parser and "tableHtml" in parser)
check("isHtmlTable", "isHtmlTable" in validator)
check("markdownTableToHtml", "markdownTableToHtml" in validator)
check("<table><tr><td>", "<table" in validator and "<tr" in validator and "<td" in validator)
check("validateVisionPayload", "validateVisionPayload" in validator)

print("\n[5] Crop + Locator")
crop = read("js/gemini-vision/pdf-crop.js") or ""
locate = read("js/gemini-vision/question-locator.js") or ""
check("computeCropRegion", "computeCropRegion" in crop)
check("current → next question", "nextQuestionNumber" in crop or "next question" in crop)
check("cropQuestionImage", "cropQuestionImage" in crop)
check("locateQuestion", "locateQuestion" in locate)
check("locateQuestionSync", "locateQuestionSync" in locate)
check("pdfHash", "pdfHash" in locate)

print("\n[6] Vision Cache")
cache = read("js/gemini-vision/vision-cache.js") or ""
storage_js = read("js/storage.js") or ""
stor = read("js/gemini-vision/vision-storage.js") or ""
for key in [
    "learning.vision-cache.v1",
    "learning.vision-history.v1",
    "learning.vision-quality.v1",
]:
    check(f"storage {key}", key in storage_js)
check("vision-config key", "learning.vision-config.v1" in storage_js)
check("cache key parts", all(k in cache for k in ["questionId", "pdfHash", "visionModel", "promptVersion"]))
check("getVisionCache / setVisionCache", "getVisionCache" in cache and "setVisionCache" in cache)
check("IndexedDB durable", "idbSet" in stor and "indexedDB" in stor)
check("monthApiSaved cost", "monthApiSaved" in cache and "estimateCostSavedUsd" in cache)

print("\n[7] Hybrid Recovery + Fallback")
recovery = read("js/gemini-vision/vision-recovery.js") or ""
engine = read("js/gemini-vision/vision-engine.js") or ""
check("recoverQuestionWithVision", "recoverQuestionWithVision" in recovery)
check("applyVisionOverlaySync", "applyVisionOverlaySync" in recovery)
check("OCR_FALLBACK", "OCR_FALLBACK" in recovery or "ocr-fallback" in recovery)
check("approveVisionToOverride", "approveVisionToOverride" in recovery)
check("prewarmVisionCache", "prewarmVisionCache" in recovery)
check("runWhenIdle / requestIdleCallback", "runWhenIdle" in recovery or "requestIdleCallback" in (read("js/gemini-vision/vision-utils.js") or ""))
check("runVisionRestore", "runVisionRestore" in engine)
check("restoreFromOcrLocally", "restoreFromOcrLocally" in engine)

print("\n[8] Student Resolver hook (formulas intact)")
resolver = read("js/student/student-resolver.js") or ""
check("applyVisionOverlaySync hooked", "applyVisionOverlaySync" in resolver)
check("resolveQuestion still used", "resolveQuestion(original)" in resolver)
check("toStudentQuestion intact", "export function toStudentQuestion" in resolver)
check("META_KEYS intact", "_resolvedFrom" in resolver and "_hasOverride" in resolver)
check("no Learning Engine import", "learning-engine" not in resolver)
check("no mastery import", "mastery-engine" not in resolver)

print("\n[9] Reviewer PASS")
review_ui = read("js/reviewer/review-ui.js") or ""
override = read("js/reviewer/override-service.js") or ""
check("Vision Approve UI", 'data-vision-act="approve"' in review_ui)
check("Vision run UI", 'data-vision-act="run"' in review_ui)
check("approveVisionToOverride wired", "approveVisionToOverride" in review_ui)
check("override-service no Sprint-17B rewrite", "Sprint-17B" not in override and "vision-recovery" not in override)
check("visionOcr additive field", "visionOcr" in recovery)

print("\n[10] Dashboard metrics")
dash_engine = read("js/dashboard/dashboard-engine.js") or ""
dash_page = read("js/learning-dashboard-page.js") or ""
dash_html = read("dashboard.html") or ""
widget = read("js/dashboard/dashboard-widget.js") or ""
layout = read("js/dashboard/dashboard-layout.js") or ""
check("visionOcr in dashboard view", "visionOcr" in dash_engine)
check("widget-vision-ocr", "widget-vision-ocr" in dash_html and "visionOcr" in widget)
check("DEFAULT_WIDGET_ORDER visionOcr", "visionOcr" in layout)
check("renderVisionOcrCard", "renderVisionOcrCard" in dash_page)
check("이번 달 절감", "이번 달 절감" in dash_page or "monthApiSaved" in dash_page)
check("예상 비용 절감", "예상 비용 절감" in dash_page or "estimatedCostSavedUsd" in dash_page)
check("prewarmVisionCache on dashboard", "prewarmVisionCache" in dash_page)

print("\n[11] Contracts")
loader = read("js/data-loader.js") or ""
for c in [
    "visionEngineContract",
    "visionQualityContract",
    "visionCacheContract",
    "ocrQualityContract",
    "visionRecoveryContract",
    "validationVision",
]:
    check(f"contract {c}", c in loader)

print("\n[12] Frozen layers — Learning / Runtime / Mastery / Recommendation")
frozen = [
    "runtime/learning-loop.js",
    "runtime/grader.js",
    "js/learning-engine/learning-engine.js",
    "js/learning-engine/mastery-engine.js",
    "js/learning-engine/recommendation-engine.js",
    "js/reviewer/override-service.js",
]
for f in frozen:
    text = read(f) or ""
    check(
        f"{f} no Sprint-17B rewrite",
        "Sprint-17B" not in text and "gemini-vision" not in text,
    )
mastery = read("js/learning-engine/mastery-engine.js") or ""
reco = read("js/learning-engine/recommendation-engine.js") or ""
check("mastery computePatternMastery intact", "computePatternMastery" in mastery)
check("recommendation buildLearningRecommendations intact", "buildLearningRecommendations" in reco)

print("\n[13] DB SHA identical")
check("Question DB SHA unchanged", sha256("data/question-db.json") == Q_SHA)
check("Pattern DB SHA unchanged", sha256("data/pattern-db.json") == P_SHA)
check("Statistics DB SHA unchanged", sha256("data/statistics.json") == S_SHA)
check("Question DB no vision write", "gemini-vision" not in (read("data/question-db.json") or ""))
check("Pattern DB no vision write", "gemini-vision" not in (read("data/pattern-db.json") or ""))

print("\n[14] README")
readme = read("README.md") or ""
check("Sprint 17B in README", "Sprint 17B" in readme or "Sprint-17B" in readme)
check("gemini-vision folder", "gemini-vision" in readme)
check("test-gemini-vision.py", "test-gemini-vision.py" in readme)
check("Vision Cache mentioned", "Vision Cache" in readme or "vision-cache" in readme)
check("Hybrid OCR mentioned", "Hybrid OCR" in readme or "OCR Quality" in readme)

print("\n[15] Gemini Solver uses Resolved (17A intact)")
solver = read("js/solution-engine/solution-engine.js") or ""
orch = read("js/gemini-solver/gemini-orchestrator.js") or ""
check("17A solveWithGemini still present", "solveWithGemini" in orch)
check("lazyGenerateAndMount still present", "lazyGenerateAndMount" in solver)

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
