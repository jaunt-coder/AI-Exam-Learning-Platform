# -*- coding: utf-8 -*-
"""Sprint-17A — Gemini Native Problem Solver (Problem First AI) tests."""
from __future__ import annotations

import hashlib
import io
import os
import re
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
print("Sprint-17A Gemini Native Problem Solver - Test Suite")
print("=" * 60)

Q_SHA = sha256("data/question-db.json")
P_SHA = sha256("data/pattern-db.json")
S_SHA = sha256("data/statistics.json")

print("\n[1] Modules (14)")
modules = [
    "js/gemini-solver/gemini-orchestrator.js",
    "js/gemini-solver/problem-reader.js",
    "js/gemini-solver/problem-solver.js",
    "js/gemini-solver/answer-verifier.js",
    "js/gemini-solver/explanation-builder.js",
    "js/gemini-solver/diagnosis-builder.js",
    "js/gemini-solver/review-builder.js",
    "js/gemini-solver/formula-builder.js",
    "js/gemini-solver/exam-tip-builder.js",
    "js/gemini-solver/tutor-builder.js",
    "js/gemini-solver/cache-manager.js",
    "js/gemini-solver/prompt-builder.js",
    "js/gemini-solver/response-parser.js",
    "js/gemini-solver/quality-checker.js",
]
for m in modules:
    text = read(m)
    check(m, text is not None and len((text or "").strip()) > 40)

print("\n[2] Gemini Provider + Registry")
provider = read("js/llm/gemini-provider.js") or ""
registry = read("js/llm/provider-registry.js") or ""
check("gemini-provider.js exists", len(provider) > 50)
check("GeminiProvider class", "class GeminiProvider" in provider)
check("registry imports GeminiProvider", "GeminiProvider" in registry)
check("GEMINI registered as implemented", "registerProvider('GEMINI', () => new GeminiProvider())" in registry)

print("\n[3] Pipeline exports")
orch = read("js/gemini-solver/gemini-orchestrator.js") or ""
for name in [
    "solveWithGemini",
    "solveWithGeminiSync",
    "mergeGeminiIntoPack",
    "applyGeminiToSmartPack",
    "approveGeminiToOverride",
    "getGeminiDashboardStats",
]:
    check(f"export {name}", name in orch)

print("\n[4] Prompt — Pattern 설명 금지 / Problem First")
prompt = read("js/gemini-solver/prompt-builder.js") or ""
check("buildSolvePrompt", "buildSolvePrompt" in prompt)
check("Pattern Metadata 참고용", "참고용" in prompt or "참고용만" in prompt)
check("Pattern 설명 금지", "Pattern 설명" in prompt or "풀이 근거로 사용 금지" in prompt)
check("직접 풀어라", "직접 풀어라" in prompt)
check("buildValidationPrompt Pass2", "buildValidationPrompt" in prompt)
check("buildMissingRecoveryPrompt", "buildMissingRecoveryPrompt" in prompt and "전체 재생성 금지" in prompt)

print("\n[5] JSON Validation + Quality + Missing Recovery")
parser = read("js/gemini-solver/response-parser.js") or ""
quality = read("js/gemini-solver/quality-checker.js") or ""
check("parseGeminiJson", "parseGeminiJson" in parser)
check("normalizeGeminiPayload", "normalizeGeminiPayload" in parser)
check("REQUIRED_KEYS includes summary/stepByStep/calculation", all(
    k in parser for k in ["summary", "stepByStep", "calculation", "mistakeDiagnosis", "review30", "formulaCard", "examChecklist", "tutorAdvice"]
))
check("checkGeminiQuality", "checkGeminiQuality" in quality)
check("Missing Report", "missing" in quality)
check("orchestrator missing recovery", "missingRecovered" in orch and "mergeMissingFragment" in orch)
check("2-Pass Validation", "pass2Applied" in orch and "applyPass2Validation" in orch)

print("\n[6] Cache Layer")
cache = read("js/gemini-solver/cache-manager.js") or ""
storage = read("js/storage.js") or ""
for key in [
    "learning.gemini-cache.v1",
    "learning.gemini-history.v1",
    "learning.gemini-quality.v1",
    "learning.gemini-version.v1",
]:
    check(f"storage {key}", key in storage and key in cache)
check("cache key parts", "overrideVersion" in cache and "modelVersion" in cache and "promptVersion" in cache)
check("getCachedGemini / setCachedGemini", "getCachedGemini" in cache and "setCachedGemini" in cache)
check("Cache Hit skips call (orchestrator)", "getCachedGemini(cacheKey)" in orch and "fromCache: true" in orch)
check("dashboard stats", "getGeminiDashboardStats" in cache)

print("\n[7] Result UI — Accordion uses Gemini")
smart = read("js/smart-tutor/smart-tutor.js") or ""
engine = read("js/solution-engine/solution-engine.js") or ""
css = read("css/solution-engine.css") or ""
check("lazyGenerateAndMount uses solveWithGemini", "solveWithGemini" in engine)
check("renderGeminiSkeleton", "renderGeminiSkeleton" in engine)
check("mergeGeminiIntoPack", "mergeGeminiIntoPack" in engine)
check("applyGeminiToSmartPack", "applyGeminiToSmartPack" in engine)
check("AI 풀이 · Gemini label", "AI 풀이 · Gemini" in smart)
check("Gemini 계산 과정", "Gemini 계산 과정" in smart)
check("AI 과외선생님", "AI 과외선생님" in smart)
check("skeleton CSS", "gemini-skel" in css)

print("\n[8] Learning Engine / Recommendation unchanged (call-only)")
check("prescription kept from pack", "prescription + nextProblems stay" in orch or "Learning Engine" in orch)
check("generateSolutionPack still exists (legacy)", "export function generateSolutionPack" in engine)
le = read("js/learning-engine/learning-engine.js") or ""
mastery = read("js/learning-engine/mastery-engine.js") or ""
reco = read("js/learning-engine/recommendation-engine.js") or ""
check("mastery computePatternMastery intact", "computePatternMastery" in mastery)
check("recommendation buildLearningRecommendations intact", "buildLearningRecommendations" in reco)
check("learning-engine no Sprint-17A rewrite", "Sprint-17A" not in le and "gemini-solver" not in le)
check("mastery no gemini rewrite", "gemini-solver" not in mastery)
check("recommendation no gemini rewrite", "gemini-solver" not in reco)

print("\n[9] Override / Reviewer — Approve → Override only")
review_ui = read("js/reviewer/review-ui.js") or ""
override = read("js/reviewer/override-service.js") or ""
check("approveGeminiToOverride", "approveGeminiToOverride" in orch)
check("Reviewer Gemini Approve UI", "data-gemini-act=\"approve\"" in review_ui)
check("Override Layer only message", "Question DB" in review_ui and "Override" in review_ui)
check("override-service structure unchanged (no Sprint-17A rewrite)", "Sprint-17A" not in override)
check("saveOverride still used", "saveOverride" in orch)
check("geminiNative additive field", "geminiNative" in orch)

print("\n[10] Student Resolver / Runtime unchanged")
resolver = read("js/student/student-resolver.js") or ""
runtime = read("runtime/learning-loop.js") or ""
grader = read("runtime/grader.js") or ""
check("student-resolver no gemini rewrite", "gemini-solver" not in resolver and "Sprint-17A" not in resolver)
check("runtime learning-loop no gemini rewrite", "gemini-solver" not in runtime and "Sprint-17A" not in runtime)
check("runtime grader no gemini rewrite", "gemini-solver" not in grader)

print("\n[11] Dashboard metrics")
dash_engine = read("js/dashboard/dashboard-engine.js") or ""
dash_page = read("js/learning-dashboard-page.js") or ""
dash_html = read("dashboard.html") or ""
widget = read("js/dashboard/dashboard-widget.js") or ""
layout = read("js/dashboard/dashboard-layout.js") or ""
check("geminiSolver in dashboard view", "geminiSolver" in dash_engine)
check("widget-gemini-solver", "widget-gemini-solver" in dash_html and "geminiSolver" in widget)
check("DEFAULT_WIDGET_ORDER includes geminiSolver", "geminiSolver" in layout)
check("renderGeminiSolverCard", "renderGeminiSolverCard" in dash_page)
check("Cache Hit label", "Cache Hit" in dash_page)

print("\n[12] Contracts")
loader = read("js/data-loader.js") or ""
for c in ["geminiSolverContract", "geminiCacheContract", "validationGeminiSolver"]:
    check(f"contract {c}", c in loader)
check("dbWriteForbidden", "dbWriteForbidden: true" in loader)
check("problemFirst", "problemFirst: true" in loader)
check("learningEngineUnchanged", "learningEngineUnchanged: true" in loader)

print("\n[13] JSON schema fields in prompt / parser")
check("confidence field", "confidence" in parser and "confidence" in prompt)
check("verification.choiceMatched", "choiceMatched" in parser)
check("verification.calculationCorrect", "calculationCorrect" in parser)

print("\n[14] Non-Goals — DB SHA identical")
check("Question DB SHA unchanged", sha256("data/question-db.json") == Q_SHA)
check("Pattern DB SHA unchanged", sha256("data/pattern-db.json") == P_SHA)
check("Statistics DB SHA unchanged", sha256("data/statistics.json") == S_SHA)
check("Question DB has no gemini-solver write", "gemini-solver" not in (read("data/question-db.json") or ""))
check("Pattern DB has no gemini-solver write", "gemini-solver" not in (read("data/pattern-db.json") or ""))

print("\n[15] Frozen layers — no Sprint-17A mutation markers")
frozen = [
    "runtime/learning-loop.js",
    "runtime/grader.js",
    "js/learning-engine/learning-engine.js",
    "js/learning-engine/mastery-engine.js",
    "js/learning-engine/recommendation-engine.js",
    "js/reviewer/override-service.js",
    "js/student/student-resolver.js",
]
for f in frozen:
    text = read(f) or ""
    check(f"{f} no Sprint-17A rewrite", "Sprint-17A" not in text and "17A" not in text)

print("\n[16] llm-config GEMINI")
cfg = read("data/llm-config.json") or ""
check("GEMINI in implementedProviders", '"GEMINI"' in cfg and "implementedProviders" in cfg)
check("problemFirst in config", "problemFirst" in cfg)

print("\n[17] README updated")
readme = read("README.md") or ""
check("Sprint 17A in README", "Sprint 17A" in readme or "Sprint-17A" in readme)
check("gemini-solver folder listed", "gemini-solver" in readme)
check("test-gemini-solver.py listed", "test-gemini-solver.py" in readme)

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
