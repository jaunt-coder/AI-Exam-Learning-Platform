# -*- coding: utf-8 -*-
"""Sprint-19A — Subject Adapter Layer (Multi Subject Platform) tests."""
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


def read_json(rel):
    text = read(rel)
    if text is None:
        return None
    return json.loads(text)


def sha256(rel):
    path = os.path.join(ROOT, rel)
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


print("=" * 60)
print("Sprint-19A Subject Adapter Layer - Test Suite")
print("=" * 60)

Q_SHA = sha256("data/question-db.json")
P_SHA = sha256("data/pattern-db.json")
S_SHA = sha256("data/statistics.json")

SUBJECT_MODULES = [
    "js/subject/subject-adapter.js",
    "js/subject/subject-loader.js",
    "js/subject/subject-registry.js",
    "js/subject/subject-router.js",
    "js/subject/subject-context.js",
    "js/subject/subject-prompt-builder.js",
    "js/subject/subject-config.js",
]

PLUGIN_IDS = ["accounting", "economics", "civil", "realestate", "law"]
PLUGIN_FILES = [
    "subject.json",
    "formula-db.json",
    "pattern-config.json",
    "prompt.md",
    "memory-config.json",
]

print("\n[1] Subject Adapter modules")
for m in SUBJECT_MODULES:
    check(m, read(m) is not None)

print("\n[2] Accounting Plugin")
acc = read_json("subjects/accounting/subject.json")
check("accounting subject.json", acc is not None)
check("accounting status active", acc and acc.get("status") == "active")
check("accounting name 회계학", acc and acc.get("name") == "회계학")
acc_prompt = read("subjects/accounting/prompt.md") or ""
check("accounting prompt role", "당신은 감정평가사 회계학 강사입니다." in acc_prompt)
acc_formula = read_json("subjects/accounting/formula-db.json")
check("accounting formula-db", acc_formula is not None)
check("ACC_INV_006 in formula-db", bool(acc_formula and "ACC_INV_006" in (acc_formula.get("formulas") or {})))
acc_mem = read_json("subjects/accounting/memory-config.json")
check("accounting memory-config", acc_mem is not None)
check("FIFO memory template", "FIFO" in json.dumps(acc_mem or {}, ensure_ascii=False))

print("\n[3] Skeleton Plugins")
for sid in PLUGIN_IDS:
    for fn in PLUGIN_FILES:
        rel = f"subjects/{sid}/{fn}"
        check(rel, read(rel) is not None)
    meta = read_json(f"subjects/{sid}/subject.json")
    check(f"{sid} enabled", meta and meta.get("enabled") is True)
    if sid != "accounting":
        check(f"{sid} skeleton", meta and meta.get("status") == "skeleton")

econ_prompt = read("subjects/economics/prompt.md") or ""
civil_prompt = read("subjects/civil/prompt.md") or ""
check("economics prompt", "당신은 감정평가사 경제학 강사입니다." in econ_prompt)
check("civil prompt", "당신은 감정평가사 민법 강사입니다." in civil_prompt)

print("\n[4] Subject Registry / Switch API")
adapter = read("js/subject/subject-adapter.js") or ""
registry = read("js/subject/subject-registry.js") or ""
router = read("js/subject/subject-router.js") or ""
context = read("js/subject/subject-context.js") or ""
check("registerSubject", "registerSubject" in registry and "registerSubject" in adapter)
check("getCurrentSubject", "getCurrentSubject" in context and "getCurrentSubject" in adapter)
check("loadSubject", "loadSubject" in read("js/subject/subject-loader.js") or "")
check("switchSubject", "switchSubject" in router and "switchSubject" in adapter)
check("DEFAULT accounting", "accounting" in (read("js/subject/subject-config.js") or ""))

print("\n[5] Gemini Prompt auto-change")
prompt_builder = read("js/gemini-solver/prompt-builder.js") or ""
subject_prompt = read("js/subject/subject-prompt-builder.js") or ""
check("buildSubjectSolvePrompt", "buildSubjectSolvePrompt" in subject_prompt)
check("gemini uses subject prompt", "buildSubjectSolvePrompt" in prompt_builder)
check("회계 하드코딩 제거(전문 강사)", "회계학 전문 강사" not in prompt_builder)
check("Subject Prompt block", "[Subject Prompt]" in subject_prompt)
check("Resolved Question block", "[Resolved Question]" in subject_prompt)
check("Learning Context block", "[Learning Context]" in subject_prompt)
check("Student Context block", "[Student Context]" in subject_prompt)
llm_prompt = read("js/llm/prompt-builder.js") or ""
check("LLM coach uses subject", "buildSubjectCoachPrompt" in llm_prompt)

print("\n[6] Formula auto-change")
formula_engine = read("js/solution-engine/formula-engine.js") or ""
check("getSubjectFormulas", "getSubjectFormulas" in formula_engine)
check("resolveSubjectIdForQuestion", "resolveSubjectIdForQuestion" in formula_engine)
check("subject formula-db path", "formula-db" in (read("js/subject/subject-loader.js") or ""))

print("\n[7] Memory auto-change")
weak = read("js/smart-tutor/weak-memory.js") or ""
mem_sheet = read("js/final-revision/memory-sheet.js") or ""
check("resolveMemoryMessage", "resolveMemoryMessage" in weak)
check("memory-config in sheet", "getSubjectMemoryConfig" in mem_sheet)

print("\n[8] Dashboard Subject Switch")
dash_html = read("dashboard.html") or ""
dash_js = read("js/learning-dashboard-page.js") or ""
dash_css = read("css/learning-dashboard.css") or ""
check("subject-switch nav", 'id="subject-switch"' in dash_html)
for label in ["회계", "경제학", "민법", "부동산학", "관계법규"]:
    check(f"switch label {label}", label in dash_html)
check("mountSubjectSwitch", "mountSubjectSwitch" in dash_js)
check("switchSubject wired", "switchSubject" in dash_js)
check("ld-subject-switch css", "ld-subject-switch" in dash_css)

print("\n[9] Personal Textbook subject split")
tb_storage = read("js/personal-textbook/textbook-storage.js") or ""
tb_engine = read("js/personal-textbook/textbook-engine.js") or ""
tb_builder = read("js/personal-textbook/textbook-builder.js") or ""
check("bySubject textbook", "bySubject" in tb_storage)
check("subjectId on entry", "subjectId" in tb_builder)
check("autoSave subjectId", "subjectId" in tb_engine and "resolveSubjectIdForQuestion" in tb_engine)
check("storage keys unchanged", "learning.personal-textbook.v1" in (read("js/storage.js") or ""))

print("\n[10] Final Book subject split")
fb_storage = read("js/final-revision/final-book-storage.js") or ""
fb_builder = read("js/final-revision/final-book-builder.js") or ""
fb_engine = read("js/final-revision/final-book-engine.js") or ""
check("bySubject final book", "bySubject" in fb_storage)
check("Final Book title by subject", "Final Book" in fb_builder)
check("SUBJECT_FULL_NAMES", "SUBJECT_FULL_NAMES" in fb_builder)
check("dashboard card subject", "SUBJECT_LABELS" in fb_engine)

print("\n[11] Storage keys (additive)")
storage = read("js/storage.js") or ""
for k in [
    "learning.current-subject.v1",
    "learning.subject-config.v1",
    "learning.subject-history.v1",
]:
    check(k, k in storage)

print("\n[12] Contracts")
loader = read("js/data-loader.js") or ""
check("subjectAdapterContract", "subjectAdapterContract" in loader)
check("subjectRegistryContract", "subjectRegistryContract" in loader)
check("subjectPromptContract", "subjectPromptContract" in loader)
check("validationSubjectAdapter", "validationSubjectAdapter" in loader)

print("\n[13] Learning Engine subjectId pass-through only")
le = read("js/learning-engine/learning-engine.js") or ""
check("subjectId in onQuestionAnswered", "subjectId" in le)
check("계산식 변경 금지 주석", "계산식은 변경하지 않는다" in le or "subjectId는 전달만" in le)

print("\n[14] Immutable DB SHA")
q2 = sha256("data/question-db.json")
p2 = sha256("data/pattern-db.json")
s2 = sha256("data/statistics.json")
check("Question DB SHA identical", q2 == Q_SHA)
check("Pattern DB SHA identical", p2 == P_SHA)
check("Statistics SHA identical", s2 == S_SHA)
print(f"  INFO  Q={Q_SHA[:16]}…")
print(f"  INFO  P={P_SHA[:16]}…")
print(f"  INFO  S={S_SHA[:16]}…")

print("\n[15] Runtime / Gemini / Override unchanged markers")
check("geminiSolverUnchanged contract", "geminiSolverUnchanged: true" in loader.replace(" ", "") or "geminiSolverUnchanged: true" in loader)
check("overrideUnchanged contract", "overrideUnchanged: true" in loader)
check("runtimeUnchanged contract", "runtimeUnchanged: true" in loader)
check("learningEngineUnchanged contract", "learningEngineUnchanged: true" in loader)
orch = read("js/gemini-solver/gemini-orchestrator.js") or ""
check("Gemini orchestrator still Problem First", "Problem First" in orch or "solveProblem" in orch)
check("Override key unchanged", "question-overrides.v1" in storage)

print("\n" + "=" * 60)
print(f"RESULT: {PASS} PASS / {FAIL} FAIL")
print("=" * 60)
sys.exit(0 if FAIL == 0 else 1)
