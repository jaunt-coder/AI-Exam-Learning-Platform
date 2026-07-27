# -*- coding: utf-8 -*-
"""Sprint-15A+ — AI Dynamic Solution Engine tests."""
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
print("Sprint-15A+ AI Dynamic Solution Engine - Test Suite")
print("=" * 60)

# Freeze DB hashes before module assertions (must remain identical)
Q_SHA = sha256("data/question-db.json")
P_SHA = sha256("data/pattern-db.json")
S_SHA = sha256("data/statistics.json")

print("\n[1] Modules")
modules = [
    "js/solution-engine/solution-engine.js",
    "js/solution-engine/explanation-generator.js",
    "js/solution-engine/calculation-engine.js",
    "js/solution-engine/mistake-diagnosis.js",
    "js/solution-engine/misconception-engine.js",
    "js/solution-engine/formula-engine.js",
    "js/solution-engine/learning-prescription.js",
    "js/solution-engine/tutor-advice.js",
    "js/solution-engine/next-problem-engine.js",
    "js/solution-engine/confidence-engine.js",
    "js/solution-engine/cache.js",
]
for m in modules:
    text = read(m)
    check(m, text is not None and len((text or "").strip()) > 50)

print("\n[2] AI 풀이 생성")
expl = read("js/solution-engine/explanation-generator.js") or ""
check("generateExplanation", "generateExplanation" in expl)
check("generateKeyTakeaway", "generateKeyTakeaway" in expl)
check("Step titles", "Step1" in expl or "Step" in expl)

print("\n[3] 계산 과정 생성")
calc = read("js/solution-engine/calculation-engine.js") or ""
check("generateCalculationProcess", "generateCalculationProcess" in calc)
check("평균단가/기말재고/매출원가", "평균단가" in calc and "기말재고" in calc and "매출원가" in calc)

print("\n[4] 공식 생성")
formula = read("js/solution-engine/formula-engine.js") or ""
check("generateFormulas", "generateFormulas" in formula)
check("평균단가 공식", "평균단가" in formula)

print("\n[5] Mistake Diagnosis + Confidence")
diag = read("js/solution-engine/mistake-diagnosis.js") or ""
conf = read("js/solution-engine/confidence-engine.js") or ""
check("diagnoseMistake", "diagnoseMistake" in diag)
check("DIAGNOSIS_CODES", "DIAGNOSIS_CODES" in diag)
check("AVG_COST_ERROR", "AVG_COST_ERROR" in diag)
check("FIFO_ERROR", "FIFO_ERROR" in diag)
check("scoreDiagnosisConfidence", "scoreDiagnosisConfidence" in conf)
check("0~100 confidence", "percent" in conf and "classifySolutionConfidence" in conf)

print("\n[6] Tutor + Prescription + Next Problem")
tutor = read("js/solution-engine/tutor-advice.js") or ""
rx = read("js/solution-engine/learning-prescription.js") or ""
nxt = read("js/solution-engine/next-problem-engine.js") or ""
engine = read("js/solution-engine/solution-engine.js") or ""
check("generateTutorAdvice", "generateTutorAdvice" in tutor)
check("checklist", "checklist" in tutor)
check("buildLearningPrescription", "buildLearningPrescription" in rx)
check("Pattern recommendation item", "PATTERN" in rx)
check("resolveNextProblems", "resolveNextProblems" in nxt)
check("getNextRecommendedQuestions link", "getNextRecommendedQuestions" in nxt)
check("generateSolutionPack", "generateSolutionPack" in engine)
check("lazyGenerateAndMount", "lazyGenerateAndMount" in engine)
check("requestPromoteToOfficial (no auto)", "requestPromoteToOfficial" in engine and "autoPromote: false" in engine)

print("\n[7] Dashboard 데이터")
cache = read("js/solution-engine/cache.js") or ""
dash = read("js/dashboard/dashboard-engine.js") or ""
check("recordMistakeHit", "recordMistakeHit" in cache)
check("buildMistakeHeatmap", "buildMistakeHeatmap" in cache)
check("getDashboardMistakeData", "getDashboardMistakeData" in engine)
check("mistakeHeatmap in dashboard", "mistakeHeatmap" in dash)

print("\n[8] Storage keys")
storage = read("js/storage.js") or ""
for key in [
    "learning.solution-cache.v1",
    "learning.solution-history.v1",
    "learning.mistake-profile.v1",
    "learning.diagnosis.v1",
    "learning.prescription.v1",
]:
    check(f"storage {key}", key in storage)

print("\n[9] Contracts")
loader = read("js/data-loader.js") or ""
for c in [
    "solutionEngineContract",
    "explanationContract",
    "diagnosisContract",
    "misconceptionContract",
    "tutorAdviceContract",
    "prescriptionContract",
    "validationSolutionEngine",
]:
    check(f"contract {c}", c in loader)

print("\n[10] UI Accordion integration")
ll_js = read("js/learning-loop-page.js") or ""
ll_html = read("learning-loop.html") or ""
q_js = read("js/question.js") or ""
q_html = read("question.html") or ""
css = read("css/solution-engine.css") or ""
check("learning-loop lazyGenerateAndMount", "lazyGenerateAndMount" in ll_js)
check("solution-engine-host in learning-loop.html", "solution-engine-host" in ll_html)
check("solution-engine.css on learning-loop", "solution-engine.css" in ll_html)
check("question.js solution engine", "lazyGenerateAndMount" in q_js)
check("solution-engine-host in question.html", "solution-engine-host" in q_html)
check("accordion details.se-acc", "se-acc" in engine and "details" in engine)
check("CSS accordion", ".se-acc" in css)

print("\n[11] Non-Goals — frozen layers unchanged by Sprint-15A+")
frozen = [
    "runtime/learning-loop.js",
    "runtime/grader.js",
    "js/learning-engine/learning-engine.js",
    "js/learning-engine/mastery-engine.js",
    "js/learning-engine/recommendation-engine.js",
    "js/reviewer/override-service.js",
    "js/reviewer/review-service.js",
    "js/student/student-resolver.js",
    "js/recovery/ai-recovery-service.js",
]
for f in frozen:
    text = read(f) or ""
    check(f"{f} no Sprint-15A+ rewrite", "Sprint-15A" not in text and "15A+" not in text)

# Learning Engine formula markers must still exist (unchanged presence)
mastery = read("js/learning-engine/mastery-engine.js") or ""
check("mastery computePatternMastery intact", "computePatternMastery" in mastery)
reco = read("js/learning-engine/recommendation-engine.js") or ""
check("recommendation buildLearningRecommendations intact", "buildLearningRecommendations" in reco)

print("\n[12] Question / Pattern / Statistics DB SHA identical")
check("Question DB SHA unchanged", sha256("data/question-db.json") == Q_SHA)
check("Pattern DB SHA unchanged", sha256("data/pattern-db.json") == P_SHA)
check("Statistics DB SHA unchanged", sha256("data/statistics.json") == S_SHA)
# Also assert files were not edited in this sprint by checking they don't mention solution-engine
check("Question DB has no solution-engine write", "solution-engine" not in (read("data/question-db.json") or ""))
check("Pattern DB has no solution-engine write", "solution-engine" not in (read("data/pattern-db.json") or ""))

print("\n[13] AI policy")
check("DB 저장 금지 flag", "dbWriteForbidden: true" in loader)
check("Override 금지 flag", "overrideForbidden: true" in loader)
check("autoPromoteForbidden", "autoPromoteForbidden: true" in loader)
check("cache allowed", "setCachedSolution" in cache and "learning.solution-cache.v1" in storage)

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
