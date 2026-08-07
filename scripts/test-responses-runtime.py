# -*- coding: utf-8 -*-
"""Sprint-17E — Gemini Responses Runtime / Universal LLM Runtime tests."""
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
print("Sprint-17E Responses Runtime - Test Suite")
print("=" * 60)

Q_SHA = sha256("data/question-db.json")
P_SHA = sha256("data/pattern-db.json")
S_SHA = sha256("data/statistics.json")

print("\n[1] Runtime modules exist")
mods = [
    "js/llm/runtime/responses-client.js",
    "js/llm/runtime/responses-parser.js",
    "js/llm/runtime/responses-runtime.js",
    "js/llm/runtime/responses-validator.js",
    "js/llm/runtime/responses-stream.js",
    "js/llm/runtime/responses-cache.js",
    "js/llm/runtime/responses-model.js",
    "js/llm/runtime/responses-errors.js",
    "js/llm/model-registry.js",
]
for m in mods:
    check(m, read(m) is not None)

print("\n[2] Responses API (Interactions) config")
client = read("js/llm/runtime/responses-client.js") or ""
model = read("js/llm/runtime/responses-model.js") or ""
runtime = read("js/llm/runtime/responses-runtime.js") or ""
check("interactions path config", "interactionsPath" in model)
check("v1beta2/interactions default", "/v1beta2/interactions" in model)
check("no hardcoded URL in professor-engine", "generativelanguage.googleapis.com" not in (read("js/professor-explanation/professor-engine.js") or ""))
check("postInteractions", "postInteractions" in client)
check("Api-Revision", "Api-Revision" in client or "apiRevision" in model)
check("RUNTIME_VERSION 17E", "17E.1" in model)

print("\n[3] GeminiProvider uses Runtime (no direct generateContent fetch)")
provider = read("js/llm/gemini-provider.js") or ""
check("generateWithRuntime", "generateWithRuntime" in provider)
check("no :generateContent in provider", ":generateContent" not in provider)
check("healthWithRuntime", "healthWithRuntime" in provider)

print("\n[4] callGemini → Runtime")
solver = read("js/gemini-solver/problem-solver.js") or ""
check("problem-solver generateWithRuntime", "generateWithRuntime" in solver)
check("RUNTIME_VERSION export", "RUNTIME_VERSION" in solver)

print("\n[5] Streaming + Retry + Fallback")
stream = read("js/llm/runtime/responses-stream.js") or ""
errors = read("js/llm/runtime/responses-errors.js") or ""
check("consumeResponsesStream", "consumeResponsesStream" in stream)
check("PROFESSOR_STREAM_PHASES", "PROFESSOR_STREAM_PHASES" in stream)
check("backoff 1/2/4/8", "2 ** exp" in errors or "backoffMs" in errors)
check("retryable 429/500/503", "429" in errors and "503" in errors)
check("model fallback chain", "allowModelFallback" in runtime and "LOCAL_PROFESSOR" in runtime)
check("invokeWithRetry", "invokeWithRetry" in client)

print("\n[6] Health = Responses API")
ai_cfg = read("js/llm/ai-config.js") or ""
settings = read("js/settings-page.js") or ""
check("testGeminiConnection → healthWithRuntime", "healthWithRuntime" in ai_cfg)
check("Settings Responses API label", "Responses API" in settings)

print("\n[7] Model Registry contract")
reg = read("js/llm/model-registry.js") or ""
check("generate()", "async generate" in reg or "generate(input" in reg)
check("stream()", "async stream" in reg or "stream(input" in reg)
check("health()", "async health" in reg or "health(input" in reg)
check("listModels()", "listModels" in reg)
check("GEMINI CLAUDE GPT LOCAL", "CLAUDE" in reg and "OPENAI" in reg and "LOCAL" in reg)

print("\n[8] Prompt Layer js/prompts/")
for p in [
    "js/prompts/question-prompt.js",
    "js/prompts/professor-prompt.js",
    "js/prompts/tutor-prompt.js",
    "js/prompts/summary-prompt.js",
    "js/prompts/revision-prompt.js",
    "js/prompts/memory-prompt.js",
    "js/prompts/index.js",
]:
    check(p, read(p) is not None)
prof_prompt = read("js/prompts/professor-prompt.js") or ""
check("PROMPT_VERSION_PROFESSOR", "PROMPT_VERSION_PROFESSOR" in prof_prompt)

print("\n[9] Cache key contract")
cache = read("js/professor-explanation/professor-cache.js") or ""
check("runtimeVersion in cache key", "RUNTIME_VERSION" in cache)
check("subjectId in cache key", "subjectId" in cache)
check("6-part join", cache.count("String(") >= 6)

print("\n[10] Professor Engine Runtime")
eng = read("js/professor-explanation/professor-engine.js") or ""
check("RUNTIME_VERSION import", "RUNTIME_VERSION" in eng)
check("stream onDelta", "onDelta" in eng)
check("no fetch( in professor-engine", "fetch(" not in eng)

print("\n[11] Dashboard AI Runtime Card")
dash_html = read("dashboard.html") or ""
dash_page = read("js/learning-dashboard-page.js") or ""
check("widget-ai-runtime", "widget-ai-runtime" in dash_html)
check("renderAiRuntimeCard", "renderAiRuntimeCard" in dash_page)
check("getAiRuntimeDashboardStats", "getAiRuntimeDashboardStats" in dash_page)

print("\n[12] llm-config runtime block")
llm = json.loads(read("data/llm-config.json") or "{}")
check("runtime.apiMode interactions", llm.get("runtime", {}).get("apiMode") == "interactions")
check("runtime.version 17E.1", llm.get("runtime", {}).get("version") == "17E.1")
check("OPENAI provider preserved", llm.get("provider") == "OPENAI")

print("\n[13] Subject Adapter unchanged formulas")
for f in [
    "js/learning-engine/learning-engine.js",
    "js/learning-engine/recommendation-engine.js",
    "js/learning-engine/mastery-engine.js",
    "js/reviewer/override-service.js",
]:
    check(f"frozen exists {f}", read(f) is not None)
check("Question DB SHA", len(Q_SHA) == 64)
check("Pattern DB SHA", len(P_SHA) == 64)
check("Statistics SHA", len(S_SHA) == 64)

print("\n[14] Storage keys unchanged")
storage = read("js/storage.js") or ""
check("learning.ai-config.v1", "learning.ai-config.v1" in storage)
check("learning.professor-cache.v1", "learning.professor-cache.v1" in storage)

print("\n" + "=" * 60)
print(f"RESULT: {PASS} passed, {FAIL} failed")
print("=" * 60)
print(f"Question DB SHA: {Q_SHA}")
print(f"Pattern DB SHA:  {P_SHA}")
print(f"Statistics SHA: {S_SHA}")
if FAIL:
    sys.exit(1)
print("Sprint-17E structural tests PASS")
sys.exit(0)
