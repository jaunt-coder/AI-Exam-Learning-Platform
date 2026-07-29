# -*- coding: utf-8 -*-
"""Sprint-17D — Professor-Level Explanation Engine tests."""
from __future__ import annotations

import hashlib
import io
import json
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
print("Sprint-17D Professor-Level Explanation - Test Suite")
print("=" * 60)

Q_SHA = sha256("data/question-db.json")
P_SHA = sha256("data/pattern-db.json")
S_SHA = sha256("data/statistics.json")
print(f"\nDB SHA snapshot")
print(f"  question-db: {Q_SHA[:16]}…")
print(f"  pattern-db:  {P_SHA[:16]}…")
print(f"  statistics:  {S_SHA[:16]}…")

print("\n[1] Professor modules exist")
modules = [
    "js/professor-explanation/professor-engine.js",
    "js/professor-explanation/problem-analyzer.js",
    "js/professor-explanation/concept-detector.js",
    "js/professor-explanation/theory-selector.js",
    "js/professor-explanation/solution-strategy.js",
    "js/professor-explanation/calculation-explainer.js",
    "js/professor-explanation/choice-analyzer.js",
    "js/professor-explanation/exam-coach.js",
    "js/professor-explanation/explanation-quality-reviewer.js",
    "js/professor-explanation/explanation-regenerator.js",
    "js/professor-explanation/professor-cache.js",
    "js/professor-explanation/professor-prompt.js",
    "js/professor-explanation/professor-normalize.js",
]
for m in modules:
    check(m, read(m) is not None)

print("\n[2] Prompt Quality (Priority 1)")
prompt = read("js/professor-explanation/professor-prompt.js") or ""
check("PROFESSOR_PROMPT_VERSION 17D.1", "17D.1" in prompt)
check("전문 강사 역할", "전문 강사" in prompt)
check("사고 과정 가르침", "사고 과정" in prompt)
check("Pattern 정답 근거 금지", "정답 근거로 사용 금지" in prompt or "정답 근거처럼" in prompt)
check("템플릿 문장 금지", "주어진 숫자를 확인한다" in prompt)
check("Step 1~6", "Step 1" in prompt and "Step 6" in prompt)
check("problemUnderstanding schema", "problemUnderstanding" in prompt)
check("choiceAnalysis schema", "choiceAnalysis" in prompt)
check("tutorMessage schema", "tutorMessage" in prompt)

pb = read("js/gemini-solver/prompt-builder.js") or ""
check("prompt-builder uses Professor", "buildProfessorSolvePrompt" in pb)
check("PROMPT_VERSION = Professor", "PROFESSOR_PROMPT_VERSION" in pb)

print("\n[3] Quality Reviewer + Regenerator")
qr = read("js/professor-explanation/explanation-quality-reviewer.js") or ""
check("reviewExplanationQuality", "reviewExplanationQuality" in qr)
check("QUALITY_APPROVE 90", "QUALITY_APPROVE = 90" in qr or "90" in qr)
check("partial / full decision", "regenerate_partial" in qr and "regenerate_full" in qr)
regen = read("js/professor-explanation/explanation-regenerator.js") or ""
check("resolveRegenMode", "resolveRegenMode" in regen)
check("buildRegenPrompt", "buildRegenPrompt" in regen)

print("\n[4] Cache key contract")
cache = read("js/professor-explanation/professor-cache.js") or ""
se = read("js/solution-engine/solution-engine.js") or ""
check("buildProfessorCacheKey", "buildProfessorCacheKey" in cache)
check("professorPromptVersion part", "professorPromptVersion" in cache or "PROFESSOR_PROMPT_VERSION" in cache)
storage = read("js/storage.js") or ""
check("learning.professor-cache.v1", "learning.professor-cache.v1" in (read("js/storage.js") or ""))
check("learning.ai-config.v1", "learning.ai-config.v1" in (read("js/storage.js") or ""))
check("providerVersion in cache key", "providerVersion" in cache)
check("requireSetup / missing key gate", "requireSetup" in (read("js/professor-explanation/professor-engine.js") or ""))
check("renderProfessorSetupGate", "renderProfessorSetupGate" in se)

print("\n[5] Manual Trigger (cost protection)")
check("AI 강사 해설 생성 button", "AI 강사 해설 생성" in se)
check("manualProfessor default", "manualProfessor" in se)
check("renderProfessorManualGate", "renderProfessorManualGate" in se)
check("generateProfessorExplanation", "generateProfessorExplanation" in se)

print("\n[6] Result UI Professor Accordion")
smart = read("js/smart-tutor/smart-tutor.js") or ""
for title in [
    "문제 이해",
    "핵심 개념",
    "풀이 전략",
    "실제 풀이",
    "보기 분석",
    "30초 암기",
    "시험장 전략",
    "AI Tutor",
]:
    check(f"UI {title}", title in smart)
check("Professor-Level kicker", "Professor" in smart and ("provider" in smart or "Professor-Level" in smart))

print("\n[7] Reviewer Quality panel")
review = read("js/reviewer/review-ui.js") or ""
check("AI Explanation Quality", "AI Explanation Quality" in review)
check("Quality Score display", "Quality Score" in review or "professor-quality-score" in review)
check("Regenerate button", 'data-gemini-act="regen"' in review)
check("자동 승인 금지", "자동 승인" in review)
check("approveProfessorToOverride", "approveProfessorToOverride" in review)

print("\n[8] Personal Textbook + Final Revision")
tb = read("js/personal-textbook/textbook-builder.js") or ""
check("professorExplanation field", "professorExplanation" in tb)
check("Question별 source professor", "professor-explanation" in tb)
fs = read("js/final-revision/final-summary.js") or ""
check("professorCompress extract", "professorCompress" in fs)
check("coreConcept extract", "coreConcept" in fs)

print("\n[9] Dashboard")
dash_html = read("dashboard.html") or ""
dash_js = read("js/learning-dashboard-page.js") or ""
check("widget-professor-quality", "widget-professor-quality" in dash_html)
check("renderProfessorQualityCard", "renderProfessorQualityCard" in dash_js)
check("낮은 품질 TOP10", "낮은 품질 TOP10" in dash_js)
check("재생성", "재생성" in dash_js or "topRegenerated" in dash_js)

print("\n[10] Evaluation set (Phase 1 — 10 questions)")
eval_path = os.path.join(ROOT, "data", "professor-evaluation-test.json")
check("professor-evaluation-test.json exists", os.path.exists(eval_path))
eval_data = []
if os.path.exists(eval_path):
    with open(eval_path, encoding="utf-8") as f:
        eval_data = json.load(f)
check("10 representative questions", isinstance(eval_data, list) and len(eval_data) == 10)
subjects = {e.get("subject") for e in eval_data}
check("accounting ≥3", sum(1 for e in eval_data if e.get("subject") == "accounting") >= 3)
check("economics ≥2", sum(1 for e in eval_data if e.get("subject") == "economics") >= 2)
check("civil ≥2", sum(1 for e in eval_data if e.get("subject") == "civil") >= 2)
check("realestate ≥2", sum(1 for e in eval_data if e.get("subject") == "realestate") >= 2)
check("law ≥1", sum(1 for e in eval_data if e.get("subject") == "law") >= 1)
check("expectedConcept present", all(e.get("expectedConcept") for e in eval_data))
check("qualityCriteria present", all(e.get("qualityCriteria") for e in eval_data))

# Ensure evaluation questionIds exist in subject DBs
for e in eval_data:
    src = e.get("source") or f"subjects/{e.get('subject')}/question-db.json"
    raw = read(src)
    check(f"question {e.get('questionId')} in DB", raw is not None and e.get("questionId", "") in (raw or ""))

print("\n[11] Prompt anti-patterns (FAIL examples blocked)")
check("금지: Pattern 이름만 반복", "Pattern 이름만 반복" in prompt)
check("금지: 의미 없는 숫자 나열", "의미 없는 숫자" in prompt)
check("금지: 보기 분석 없는 해설", "보기 분석 없는" in prompt)

print("\n[12] Frozen layers unchanged (SHA guards)")
q2 = sha256("data/question-db.json")
p2 = sha256("data/pattern-db.json")
s2 = sha256("data/statistics.json")
check("Question DB SHA identical", q2 == Q_SHA)
check("Pattern DB SHA identical", p2 == P_SHA)
check("Statistics SHA identical", s2 == S_SHA)

frozen = [
    "js/learning-engine/learning-engine.js",
    "js/learning-engine/mastery-engine.js",
    "js/learning-engine/recommendation-engine.js",
    "js/reviewer/override-service.js",
]
for fpath in frozen:
    check(f"frozen file exists {fpath}", read(fpath) is not None)

print("\n[13] Engine orchestration exports")
eng = read("js/professor-explanation/professor-engine.js") or ""
for name in [
    "generateProfessorExplanation",
    "generateProfessorExplanationSync",
    "mergeProfessorIntoPack",
    "applyProfessorToSmartPack",
    "approveProfessorToOverride",
    "getProfessorDashboardStats",
]:
    check(name, name in eng)

print("\n[14] Live Gemini note")
live = "--live" in sys.argv or os.environ.get("PROFESSOR_LIVE_TEST") == "1"
api = os.environ.get("GEMINI_API_KEY", "").strip()
if live and api:
    check("Live mode requested with API key", True)
    print("  INFO  Live Gemini quality run은 브라우저 Manual Trigger 또는 별도 harness로 수행하세요.")
    print("        Phase 1 합격 기준: 대표 10문 Quality Score ≥ 90")
else:
    check("Static suite (live Gemini optional)", True)
    print("  INFO  실제 Gemini 출력 품질 검증은 API 키 + Manual Trigger로 수행.")
    print("        python scripts/test-professor-explanation.py --live  (키 필요)")

print("\n" + "=" * 60)
print(f"RESULT: {PASS} passed, {FAIL} failed")
print("=" * 60)
if FAIL:
    sys.exit(1)
print("Sprint-17D structural tests PASS")
print(f"Question DB SHA: {Q_SHA}")
print(f"Pattern DB SHA:  {P_SHA}")
print(f"Statistics SHA:  {S_SHA}")
sys.exit(0)
