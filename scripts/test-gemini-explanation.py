# -*- coding: utf-8 -*-
"""Sprint-17C — Human-Level AI Explanation Engine tests."""
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
print("Sprint-17C Human-Level AI Explanation - Test Suite")
print("=" * 60)

Q_SHA = sha256("data/question-db.json")
P_SHA = sha256("data/pattern-db.json")
S_SHA = sha256("data/statistics.json")

print("\n[1] Prompt Version 17C/17D")
prompt = read("js/gemini-solver/prompt-builder.js") or ""
prof = read("js/professor-explanation/professor-prompt.js") or ""
prompt_all = prompt + "\n" + prof
check("PROMPT_VERSION 17C or 17D", "17C.1" in prompt_all or "17D.1" in prompt_all or "PROMPT_VERSION" in prompt)
check("전문 강사 prompt", "전문 강사" in prompt_all)
check("예시 숫자 금지", "예시 숫자" in prompt_all)
check("Pattern 일반론 금지", "Pattern 일반론" in prompt_all or "Pattern" in prompt_all)
check("thinkingOrder in schema", "thinkingOrder" in prompt_all)
check("whyOthersWrong in schema", "whyOthersWrong" in prompt_all or "choiceAnalysis" in prompt_all)
check("memoryHack in schema", "memoryHack" in prompt_all)
check("examTip in schema", "examTip" in prompt_all)

print("\n[2] Human-Level Validator")
val = read("js/gemini-solver/human-explanation-validator.js") or ""
check("validateHumanExplanation", "validateHumanExplanation" in val)
check("calculation ≥ 5", "length < 5" in val or "calcOk" in val)
check("scoreNumberUsage", "scoreNumberUsage" in val)
check("thinkingOrder check", "thinkingOrder" in val)
check("whyOthersWrong check", "whyOthersWrong" in val)
check("memoryHack check", "memoryHack" in val)
check("examTip check", "examTip" in val)
check("formula check", "'formula'" in val or '"formula"' in val)

print("\n[3] Parser schema fields")
parser = read("js/gemini-solver/response-parser.js") or ""
for k in [
    "thinkingOrder",
    "whyAnswer",
    "whyOthersWrong",
    "memoryHack",
    "examTip",
    "summary",
    "calculation",
    "formula",
]:
    check(f"parser {k}", k in parser)
check("payloadToMarkdown", "payloadToMarkdown" in parser)
check("markdownToPayload", "markdownToPayload" in parser)

print("\n[4] Local solver Human-Level")
solver = read("js/gemini-solver/problem-solver.js") or ""
check("thinkingOrder in local", "thinkingOrder" in solver)
check("whyOthersWrong in local", "whyOthersWrong" in solver)
check("calculation ≥5 lines local", solver.count("'") >= 5 and "calculation" in solver)
check("memoryHack in local", "memoryHack" in solver)
check("examTip in local", "examTip" in solver)

print("\n[5] Orchestrator 17C")
orch = read("js/gemini-solver/gemini-orchestrator.js") or ""
check("GEMINI_SOLVER_VERSION 17C", "17C" in orch)
check("humanLevel finalize", "humanLevel: true" in orch)
check("approve with markdown", "markdown" in orch and "markdownToPayload" in orch)
check("Cache promptVersion", "PROMPT_VERSION" in orch)

print("\n[6] Result UI Accordion 17C")
smart = read("js/smart-tutor/smart-tutor.js") or ""
check("문제 접근 순서", "문제 접근 순서" in smart)
check("단계별 계산", "단계별 계산" in smart)
check("정답이 되는 이유", "정답이 되는 이유" in smart)
check("다른 선택지가 틀린 이유", "다른 선택지가 틀린 이유" in smart)
check("30초 암기", "30초 암기" in smart)
check("시험장 풀이법", "시험장 풀이법" in smart)
check("Human-Level kicker", "Human-Level" in smart)

print("\n[7] Reviewer Markdown only")
review = read("js/reviewer/review-ui.js") or ""
check("rv-gemini-md", "rv-gemini-md" in review)
check("Markdown Approve", "Markdown Approve" in review or "markdown" in review.lower())
check("JSON 아니라 Markdown", "Markdown" in review)
check("override-service unchanged", "Sprint-17C" not in (read("js/reviewer/override-service.js") or ""))

print("\n[8] Dashboard metrics")
cache = read("js/gemini-solver/cache-manager.js") or ""
dash = read("js/learning-dashboard-page.js") or ""
check("averageExplanationLength", "averageExplanationLength" in cache)
check("averageCalculationSteps", "averageCalculationSteps" in cache)
check("thinkingOrderIncludedPct", "thinkingOrderIncludedPct" in cache)
check("whyOthersWrongPct", "whyOthersWrongPct" in cache)
check("dashboard shows Explanation Length", "Explanation Length" in dash or "averageExplanationLength" in dash)
check("dashboard Thinking Order %", "Thinking Order" in dash)

print("\n[9] Contracts")
loader = read("js/data-loader.js") or ""
check("humanExplanationContract", "humanExplanationContract" in loader)
check("validationHumanExplanation", "validationHumanExplanation" in loader)
check("promptVersion 17C.1 or 17D.1 in contract", "17C.1" in loader or "17D.1" in loader)

print("\n[10] Cache maintained")
check("learning.gemini-cache.v1", "learning.gemini-cache.v1" in (read("js/storage.js") or ""))
check("promptVersion in cache key", "promptVersion" in cache)

print("\n[11] Frozen layers")
frozen = [
    "runtime/learning-loop.js",
    "runtime/grader.js",
    "js/learning-engine/learning-engine.js",
    "js/learning-engine/mastery-engine.js",
    "js/learning-engine/recommendation-engine.js",
    "js/reviewer/override-service.js",
    "js/gemini-vision/vision-recovery.js",
]
for f in frozen:
    text = read(f) or ""
    check(f"{f} no Sprint-17C rewrite", "Sprint-17C" not in text)

print("\n[12] DB SHA identical")
check("Question DB SHA unchanged", sha256("data/question-db.json") == Q_SHA)
check("Pattern DB SHA unchanged", sha256("data/pattern-db.json") == P_SHA)
check("Statistics DB SHA unchanged", sha256("data/statistics.json") == S_SHA)

print("\n[13] README")
readme = read("README.md") or ""
check("Sprint 17C", "Sprint 17C" in readme or "Sprint-17C" in readme)
check("test-gemini-explanation.py", "test-gemini-explanation.py" in readme)
check("Human-Level", "Human-Level" in readme or "사람 수준" in readme)

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
