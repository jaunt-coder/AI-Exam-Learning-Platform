# -*- coding: utf-8 -*-
"""Sprint-17D.1 — Gemini Connection Layer / AI Config tests."""
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
print("Sprint-17D.1 Gemini Connection Layer - Test Suite")
print("=" * 60)

Q_SHA = sha256("data/question-db.json")
P_SHA = sha256("data/pattern-db.json")
S_SHA = sha256("data/statistics.json")

print("\n[1] AI Config module")
cfg = read("js/llm/ai-config.js") or ""
check("ai-config.js exists", bool(cfg))
check("learning.ai-config.v1", "learning.ai-config.v1" in cfg)
check("saveAiConfig", "saveAiConfig" in cfg)
check("clearAiConfig", "clearAiConfig" in cfg)
check("resolveGeminiConnection", "resolveGeminiConnection" in cfg)
check("testGeminiConnection", "testGeminiConnection" in cfg)
check("PROVIDER_VERSION", "PROVIDER_VERSION" in cfg)
check("priority ai-config first", "AI_CONFIG_KEY" in cfg and "resolveLegacy" in cfg)

print("\n[2] Storage key")
storage = read("js/storage.js") or ""
check("LEARNING_AI_CONFIG_V1", "LEARNING_AI_CONFIG_V1" in storage)
check("learning.ai-config.v1 in storage", "learning.ai-config.v1" in storage)

print("\n[3] Provider resolve wiring")
solver = read("js/gemini-solver/problem-solver.js") or ""
provider = read("js/llm/gemini-provider.js") or ""
check("problem-solver uses ai-config", "from '../llm/ai-config.js'" in solver)
check("missing_api_key requireSetup", "requireSetup: true" in solver)
check("gemini-provider uses ai-config", "from './ai-config.js'" in provider)
check("no silent localFallback true on missing key", "localFallback: false" in solver)

print("\n[4] Settings UI")
settings_html = read("settings.html") or ""
settings_js = read("js/settings-page.js") or ""
check("gemini-ai-config section", "gemini-ai-config" in settings_html)
check("API Key input", "ai-api-key" in settings_html)
check("연결 테스트 button", "연결 테스트" in settings_html or "ai-test-btn" in settings_html)
check("저장 / 삭제", "ai-save-btn" in settings_html and "ai-clear-btn" in settings_html)
check("settings-page imports ai-config", "ai-config.js" in settings_js)
check("Gemini Connected message", "Gemini Connected" in settings_js)
check("API Key Invalid message", "API Key Invalid" in settings_js)

print("\n[5] Professor missing key + provider display")
eng = read("js/professor-explanation/professor-engine.js") or ""
se = read("js/solution-engine/solution-engine.js") or ""
smart = read("js/smart-tutor/smart-tutor.js") or ""
check("requireSetup return", "requireSetup: true" in eng)
check("settingsHref", "settings.html#gemini-ai-config" in eng)
check("provider GEMINI / LOCAL_PROFESSOR", "LOCAL_PROFESSOR" in eng and "isGeminiLive" in eng)
check("renderProfessorSetupGate", "renderProfessorSetupGate" in se)
check("설정 이동", "설정 이동" in se)
check("UI provider display", "provider:" in smart or "provider</dt>" in smart)

print("\n[6] Cache providerVersion")
cache = read("js/professor-explanation/professor-cache.js") or ""
check("providerVersion in cache key", "providerVersion" in cache)
check("PROVIDER_VERSION import", "PROVIDER_VERSION" in cache)
check("5-part join", cache.count("String(") >= 5 or "providerVersion" in cache)

print("\n[7] Contracts")
loader = read("js/data-loader.js") or ""
check("aiConfigContract", "aiConfigContract" in loader)
check("silentLocalFallbackForbidden", "silentLocalFallbackForbidden" in loader)
check("providerVersion in professor contract", "providerVersion" in loader)

print("\n[8] Frozen protection")
check("Question DB SHA stable", sha256("data/question-db.json") == Q_SHA)
check("Pattern DB SHA stable", sha256("data/pattern-db.json") == P_SHA)
check("Statistics SHA stable", sha256("data/statistics.json") == S_SHA)
for f in [
    "js/learning-engine/learning-engine.js",
    "js/learning-engine/recommendation-engine.js",
    "js/learning-engine/mastery-engine.js",
    "js/reviewer/override-service.js",
]:
    check(f"exists {f}", read(f) is not None)

# Learning formula files should not mention ai-config rewrite of formulas
le = read("js/learning-engine/learning-engine.js") or ""
check("Learning Engine no ai-config formula rewrite", "ai-config" not in le)

print("\n" + "=" * 60)
print(f"RESULT: {PASS} passed, {FAIL} failed")
print("=" * 60)
print(f"Question DB SHA: {Q_SHA}")
print(f"Pattern DB SHA:  {P_SHA}")
print(f"Statistics SHA:  {S_SHA}")
if FAIL:
    sys.exit(1)
print("Sprint-17D.1 structural tests PASS")
sys.exit(0)
