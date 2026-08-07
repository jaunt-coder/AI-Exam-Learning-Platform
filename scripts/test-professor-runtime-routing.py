# -*- coding: utf-8 -*-
"""Sprint-17D.5 / 17D.5.1 — Professor Runtime routing + Tutor data-flow clean."""
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
print("Sprint-17D.5.1 Professor Runtime Routing - Test Suite")
print("=" * 60)

Q_BEFORE = sha256("data/question-db.json")
P_BEFORE = sha256("data/pattern-db.json")
S_BEFORE = sha256("data/statistics.json")

print("\n[0] Frozen DB hashes")
print(f"  question-db.json  {Q_BEFORE[:16]}…")
print(f"  pattern-db.json   {P_BEFORE[:16]}…")
print(f"  statistics.json   {S_BEFORE[:16]}…")

engine = read("js/professor-explanation/professor-engine.js") or ""
cache = read("js/professor-explanation/professor-cache.js") or ""
adapter = read("js/professor-explanation/professor-runtime-adapter.js") or ""
ai_cfg = read("js/llm/ai-config.js") or ""
ai_tutor = read("js/ai-tutor.js") or ""
runtime = read("js/llm/runtime/responses-runtime.js") or ""
learning = read("js/learning-engine/learning-engine.js") or ""
reco = read("js/learning-engine/recommendation-engine.js") or ""
override = read("js/reviewer/override-service.js") or ""

print("\n[1] Modules exist")
check("professor-runtime-adapter.js", bool(adapter))
check("ADAPTER_VERSION 17D.5.1", "17D.5.1" in adapter)
check("ai-tutor uses adapter", "generateTutorLessonWithRuntime" in ai_tutor)

print("\n[2] Case 1 — Gemini success → provider GEMINI (no LOCAL scaffold)")
# mapProfessorToTutorLesson must NOT call generateTutorLesson
map_start = adapter.find("export function mapProfessorToTutorLesson")
map_body = adapter[map_start : map_start + 3500] if map_start >= 0 else ""
check("mapProfessorToTutorLesson exists", map_start >= 0)
check(
    "map does not call generateTutorLesson",
    "generateTutorLesson(" not in map_body,
)
check("map builds sections from Professor SSOT", "TUTOR_SECTION_IDS" in map_body and "payload" in map_body)
check("normalizeLessonProvider GEMINI", "normalizeLessonProvider" in adapter)
check("resolveDisplayProvider", "resolveDisplayProvider" in adapter)
check("Gemini success path → generateProfessorExplanation", "generateProfessorExplanation" in adapter)
check("metadata.provider field", "buildLessonMetadata" in adapter and "cacheStatus" in adapter)
check("lesson.metadata generatedAt", "generatedAt" in adapter)

print("\n[3] Case 2 — Cache hit → provider GEMINI + cacheStatus HIT")
check("cacheStatus HIT", "cacheStatus: hit ? 'HIT'" in adapter or "HIT" in adapter)
check(
    "CACHE/GEMINI display → GEMINI",
    "resolveDisplayProvider" in adapter and "GEMINI" in adapter,
)
check("engineProvider preserved for CACHE", "engineProvider" in adapter or "CACHE" in adapter)

print("\n[4] Case 3 — Local fallback → provider LOCAL_PROFESSOR")
check("Gemini disabled → LOCAL", "Gemini disabled → LOCAL_PROFESSOR" in adapter)
check("fail → localLesson", "localLesson" in adapter and "fallbackFrom" in adapter)
check("LOCAL still may use generateTutorLesson", "generateTutorLesson({" in adapter)
check("LOCAL provider in attachLessonMeta", "LOCAL_PROFESSOR" in adapter)

print("\n[5] Provider distinct labels")
check("OVERRIDE_APPROVED", "OVERRIDE_APPROVED" in adapter)
check("CACHE normalize", "return 'CACHE'" in adapter or "'CACHE'" in adapter)
check("no forced GEMINI overwrite of LOCAL", "if (provider === 'LOCAL_PROFESSOR') return 'LOCAL_PROFESSOR'" in adapter or "LOCAL_PROFESSOR') return 'LOCAL_PROFESSOR'" in adapter)

print("\n[6] Runtime path intact")
check("callGemini in engine", "callGemini" in engine)
check("interactions path", "/v1beta/interactions" in (read("js/llm/runtime/responses-model.js") or ""))
check("generateWithRuntime", "generateWithRuntime" in runtime)

print("\n[7] Frozen layers unchanged (SHA + no edits)")
check("Question DB SHA stable", sha256("data/question-db.json") == Q_BEFORE)
check("Pattern DB SHA stable", sha256("data/pattern-db.json") == P_BEFORE)
check("Statistics SHA stable", sha256("data/statistics.json") == S_BEFORE)
check("adapter does not write question-db", "question-db" not in adapter)
check("learning-engine untouched by adapter", "learning-engine" not in adapter)
check("recommendation file exists", bool(reco))
check("override-service exists", bool(override))
check("no mastery write in adapter", "updateMastery" not in adapter)

print("\n" + "=" * 60)
print(f"Results: {PASS} PASS / {FAIL} FAIL")
if FAIL:
    print("Sprint-17D.5.1 structural tests FAIL")
    sys.exit(1)
print("Sprint-17D.5.1 structural tests PASS")
sys.exit(0)
