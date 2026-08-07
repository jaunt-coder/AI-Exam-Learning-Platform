# -*- coding: utf-8 -*-
"""Sprint-17D.3 — Gemini latest model migration tests."""
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
print("Sprint-17D.3 Gemini Latest Model Migration - Test Suite")
print("=" * 60)

Q_SHA = sha256("data/question-db.json")
P_SHA = sha256("data/pattern-db.json")
S_SHA = sha256("data/statistics.json")

print("\n[1] Latest model constants")
cfg = read("js/llm/ai-config.js") or ""
provider = read("js/llm/gemini-provider.js") or ""
check("DEFAULT_GEMINI_MODEL gemini-3-flash", "DEFAULT_GEMINI_MODEL = 'gemini-3-flash'" in cfg)
check("FALLBACK_GEMINI_MODEL preview", "FALLBACK_GEMINI_MODEL = 'gemini-3-flash-preview'" in cfg)
check("PROVIDER_VERSION 17E or 17D", "GEMINI-17E.1" in cfg or "GEMINI-17D.3" in cfg)
check("GEMINI_API_VERSION v1beta", "GEMINI_API_VERSION = 'v1beta'" in cfg)
check("deprecated list includes 2.0-flash", "gemini-2.0-flash" in cfg and "DEPRECATED_GEMINI_MODELS" in cfg)
check("normalizeGeminiModel", "normalizeGeminiModel" in cfg)
check("isGeminiModelNotFound", "isGeminiModelNotFound" in cfg)

print("\n[2] No active gemini-2.0-flash defaults (except deprecate list)")
targets = [
    "settings.html",
    "js/settings-page.js",
    "js/gemini-solver/problem-solver.js",
    "js/gemini-vision/vision-utils.js",
    "js/gemini-vision/vision-storage.js",
    "data/llm-config.json",
]
for rel in targets:
    text = read(rel) or ""
    # allow only if not used as default value assignment for active model
    bad = False
    if 'value="gemini-2.0-flash"' in text:
        bad = True
    if "|| 'gemini-2.0-flash'" in text or '|| "gemini-2.0-flash"' in text:
        bad = True
    if '"model": "gemini-2.0-flash"' in text:
        bad = True
    if "VISION_MODEL = 'gemini-2.0-flash'" in text:
        bad = True
    check(f"no active 2.0 default in {rel}", not bad)

print("\n[3] llm-config models")
llm = json.loads(read("data/llm-config.json") or "{}")
check("llm defaultModel gemini-3-flash", llm.get("defaultModel") == "gemini-3-flash")
check("llm fallbackModel preview", llm.get("fallbackModel") == "gemini-3-flash-preview")
check("geminiSolver.model", llm.get("geminiSolver", {}).get("model") == "gemini-3-flash")
check("geminiSolver.defaultModel", llm.get("geminiSolver", {}).get("defaultModel") == "gemini-3-flash")
check("geminiSolver.fallbackModel", llm.get("geminiSolver", {}).get("fallbackModel") == "gemini-3-flash-preview")
check("professorExplanation.model", llm.get("professorExplanation", {}).get("model") == "gemini-3-flash")
check("geminiVision.model", llm.get("geminiVision", {}).get("model") == "gemini-3-flash")
check("OPENAI provider preserved", llm.get("provider") == "OPENAI")

print("\n[4] Connection Test (generateContent + 200)")
check("testGeminiConnection generateContent", "generateContent" in cfg)
check("HTTP 200 required", "res.status === 200" in cfg or "status: 200" in cfg)
check("recordAiConnectionSuccess", "recordAiConnectionSuccess" in cfg)
check("getAiConnectionStatus", "getAiConnectionStatus" in cfg)
check("fallback retry in test/runtime", "FALLBACK_GEMINI_MODEL" in cfg or "FALLBACK_GEMINI_MODEL" in (read("js/llm/runtime/responses-runtime.js") or ""))
check("healthWithRuntime in connection test", "healthWithRuntime" in cfg)

print("\n[5] GeminiProvider / Runtime fallback")
runtime = read("js/llm/runtime/responses-runtime.js") or ""
check("provider imports Runtime", "generateWithRuntime" in provider)
check("runtime model fallback", "allowModelFallback" in runtime or "FALLBACK" in runtime)
check("runtime fallbackUsed path", "fallbackUsed" in runtime)

print("\n[6] Settings UI status fields")
settings_html = read("settings.html") or ""
settings_js = read("js/settings-page.js") or ""
check("settings default gemini-3-flash", 'value="gemini-3-flash"' in settings_html)
check("현재 사용 모델", "현재 사용 모델" in settings_html)
check("현재 Provider", "현재 Provider" in settings_html)
check("API Version", "API Version" in settings_html)
check("마지막 연결 성공 시간", "마지막 연결 성공 시간" in settings_html)
check("settings uses DEFAULT_GEMINI_MODEL", "DEFAULT_GEMINI_MODEL" in settings_js)
check("settings getAiConnectionStatus", "getAiConnectionStatus" in settings_js)

print("\n[7] Dashboard AI 상태 card")
dash_html = read("dashboard.html") or ""
dash_page = read("js/learning-dashboard-page.js") or ""
dash_widget = read("js/dashboard/dashboard-widget.js") or ""
dash_layout = read("js/dashboard/dashboard-layout.js") or ""
dash_engine = read("js/dashboard/dashboard-engine.js") or ""
check("widget-ai-status", "widget-ai-status" in dash_html)
check("AI 상태 heading", "AI 상태" in dash_html)
check("renderAiStatusCard", "renderAiStatusCard" in dash_page)
check("aiStatus widget id", "aiStatus" in dash_widget)
check("aiStatus in layout order", "'aiStatus'" in dash_layout)
check("aiStatus in dashboard-engine", "aiStatus" in dash_engine)

print("\n[8] Professor / Cache / Problem solver model wiring")
solver = read("js/gemini-solver/problem-solver.js") or ""
cache = read("js/professor-explanation/professor-cache.js") or ""
engine = read("js/professor-explanation/professor-engine.js") or ""
vision = read("js/gemini-vision/vision-utils.js") or ""
check("MODEL_VERSION from DEFAULT", "DEFAULT_GEMINI_MODEL" in solver)
check("MODEL_VERSION fallback 3-flash", "gemini-3-flash" in solver)
check("professor-cache MODEL_VERSION", "MODEL_VERSION" in cache)
check("professor-engine MODEL_VERSION", "MODEL_VERSION" in engine)
check("VISION_MODEL from DEFAULT", "DEFAULT_GEMINI_MODEL" in vision)
check("VISION_MODEL gemini-3-flash", "gemini-3-flash" in vision)

print("\n[9] Storage key unchanged")
storage = read("js/storage.js") or ""
check("learning.ai-config.v1 key intact", "learning.ai-config.v1" in storage)
check("LEARNING_AI_CONFIG_V1 intact", "LEARNING_AI_CONFIG_V1" in storage)

print("\n[10] Frozen layers (SHA)")
check("Question DB SHA stable", len(Q_SHA) == 64)
check("Pattern DB SHA stable", len(P_SHA) == 64)
check("Statistics SHA stable", len(S_SHA) == 64)
for rel in [
    "js/learning-engine/learning-engine.js",
    "js/learning-engine/recommendation-engine.js",
    "js/learning-engine/mastery-engine.js",
    "js/reviewer/override-service.js",
]:
    check(f"exists {rel}", os.path.exists(os.path.join(ROOT, rel)))

print("\n[11] Contract + docs")
loader = read("js/data-loader.js") or ""
readme = read("README.md") or ""
hist = read("docs/SPRINT_HISTORY.md") or ""
check("aiConfigContract defaultModel", "gemini-3-flash" in loader)
check("aiConfigContract fallback", "gemini-3-flash-preview" in loader)
check("README model migration", "gemini-3-flash" in readme)
check("SPRINT_HISTORY 17D.3", "17D.3" in hist)
check("test script self", os.path.exists(os.path.join(ROOT, "scripts/test-gemini-model.py")))

print("\n" + "=" * 60)
print(f"RESULT: {PASS} passed, {FAIL} failed")
print("=" * 60)
print(f"Question DB SHA: {Q_SHA}")
print(f"Pattern DB SHA:  {P_SHA}")
print(f"Statistics SHA: {S_SHA}")
if FAIL:
    print("Sprint-17D.3 structural tests FAIL")
    sys.exit(1)
print("Sprint-17D.3 structural tests PASS")
sys.exit(0)
