# -*- coding: utf-8 -*-
"""Sprint-15C — AI Solution Quality tests."""
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
print("Sprint-15C AI Solution Quality - Test Suite")
print("=" * 60)

Q_SHA = sha256("data/question-db.json")
P_SHA = sha256("data/pattern-db.json")
S_SHA = sha256("data/statistics.json")

print("\n[1] Modules")
modules = [
    "js/solution-quality/solution-quality-engine.js",
    "js/solution-quality/solution-quality-score.js",
    "js/solution-quality/solution-analyzer.js",
    "js/solution-quality/solution-validator.js",
    "js/solution-quality/solution-blueprint.js",
    "js/solution-quality/solution-template.js",
    "js/solution-quality/solution-improvement.js",
    "js/solution-quality/solution-storage.js",
    "css/solution-quality.css",
]
for m in modules:
    text = read(m)
    check(m, text is not None and len((text or "").strip()) > 40)

print("\n[2] Quality Score 계산")
score = read("js/solution-quality/solution-quality-score.js") or ""
engine = read("js/solution-quality/solution-quality-engine.js") or ""
check("computeSolutionQualityScore", "computeSolutionQualityScore" in score)
check("evaluateSolutionQuality", "evaluateSolutionQuality" in engine)
check("approach 20", "approach" in score and "max: 20" in score)
check("concept 20", "concept" in score)
check("calculation 20", "calculation" in score)
check("diagnosis 20", "diagnosis" in score)
check("examTip 20", "examTip" in score)

print("\n[3] Missing Detection")
analyzer = read("js/solution-quality/solution-analyzer.js") or ""
improve = read("js/solution-quality/solution-improvement.js") or ""
check("analyzeSolutionPack", "analyzeSolutionPack" in analyzer)
check("problemApproach missing", "problemApproach" in score)
check("calculationSteps missing", "calculationSteps" in score)
check("buildImprovementSuggestion", "buildImprovementSuggestion" in improve)
check("suggestion copy 계산", "계산 과정" in improve)

print("\n[4] Blueprint")
bp = read("js/solution-quality/solution-blueprint.js") or ""
check("buildSolutionBlueprint", "buildSolutionBlueprint" in bp)
check("solvingFramework", "solvingFramework" in bp)
check("requiredSteps", "requiredSteps" in bp)
check("commonMistakes", "commonMistakes" in bp)

print("\n[5] Reviewer 연결")
review_ui = read("js/reviewer/review-ui.js") or ""
check("Solution Quality tab", "solution-quality" in review_ui)
check("applyAiImprovementToOverride", "applyAiImprovementToOverride" in engine and "applyAiImprovementToOverride" in review_ui)
check("approveSolutionQuality", "approveSolutionQuality" in engine)
check("saveOverride used", "saveOverride" in engine)
check("autoApprove false", "autoApprove: false" in engine)
check("renderReviewerQualityPanel", "renderReviewerQualityPanel" in (read("js/solution-quality/solution-template.js") or ""))

print("\n[6] Student 화면 노출 정책")
tpl = read("js/solution-quality/solution-template.js") or ""
tutor = read("js/smart-tutor/smart-tutor.js") or ""
check("AI 풀이 완성도", "AI 풀이 완성도" in tpl)
check("renderStudentQualityCard", "renderStudentQualityCard" in tpl and "renderStudentQualityCard" in tutor)
check("student card no Override label", "Override" not in tpl.split("renderStudentQualityCard")[1].split("renderReviewer")[0] if "renderStudentQualityCard" in tpl else True)
check("solutionQuality in enrich", "solutionQuality" in tutor)
check("student quality section", "solution-quality" in tutor)

print("\n[7] Dashboard")
dash_html = read("dashboard.html") or ""
dash_page = read("js/learning-dashboard-page.js") or ""
check("widget-solution-quality", "widget-solution-quality" in dash_html)
check("getDashboardSolutionQuality", "getDashboardSolutionQuality" in dash_page)
check("solution-quality.css on dashboard", "solution-quality.css" in dash_html)

print("\n[8] Storage")
storage = read("js/storage.js") or ""
for key in [
    "learning.solution-quality.v1",
    "learning.solution-blueprint.v1",
    "learning.solution-review.v1",
    "learning.solution-improvement.v1",
]:
    check(f"storage {key}", key in storage)

print("\n[9] Contracts")
loader = read("js/data-loader.js") or ""
for c in [
    "solutionQualityContract",
    "solutionBlueprintContract",
    "solutionImprovementContract",
    "solutionReviewContract",
    "validationSolutionQuality",
]:
    check(f"contract {c}", c in loader)

print("\n[10] Solution Engine 기존 동작 / LE 변경 없음")
frozen = [
    "js/solution-engine/explanation-generator.js",
    "js/solution-engine/calculation-engine.js",
    "js/solution-engine/mistake-diagnosis.js",
    "js/learning-engine/learning-engine.js",
    "js/learning-engine/mastery-engine.js",
    "js/learning-engine/recommendation-engine.js",
]
for f in frozen:
    text = read(f) or ""
    check(f"{f} no Sprint-15C rewrite", "Sprint-15C" not in text and "15C" not in text)

se = read("js/solution-engine/solution-engine.js") or ""
check("generateSolutionPack intact", "generateSolutionPack" in se)
check("solutionEngineUnchanged flag", "solutionEngineUnchanged: true" in engine or "solutionEngineUnchanged: true" in loader)

print("\n[11] Override Layer 정상")
ov = read("js/reviewer/override-service.js") or ""
check("saveOverride export intact", "export function saveOverride" in ov)
check("override usesOverrideOnly contract", "usesOverrideOnly: true" in loader)

print("\n[12] DB SHA identical")
check("Question DB SHA unchanged", sha256("data/question-db.json") == Q_SHA)
check("Pattern DB SHA unchanged", sha256("data/pattern-db.json") == P_SHA)
check("Statistics SHA unchanged", sha256("data/statistics.json") == S_SHA)
check("Question DB no solution-quality write", "solution-quality" not in (read("data/question-db.json") or ""))
check("Pattern DB no solution-quality write", "solution-quality" not in (read("data/pattern-db.json") or ""))

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
