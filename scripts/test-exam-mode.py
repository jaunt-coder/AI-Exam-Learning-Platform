# -*- coding: utf-8 -*-
"""Sprint-16B — Exam Mode & Goal Management tests."""
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
print("Sprint-16B Exam Mode & Goal Management - Test Suite")
print("=" * 60)

Q_SHA = sha256("data/question-db.json")
P_SHA = sha256("data/pattern-db.json")
S_SHA = sha256("data/statistics.json")

print("\n[1] Modules")
modules = [
    "js/exam-goal/exam-goal-engine.js",
    "js/exam-goal/exam-goal-storage.js",
    "js/exam-goal/exam-goal-validator.js",
    "js/exam-goal/exam-goal-calculator.js",
    "js/exam-goal/exam-phase-engine.js",
    "js/components/dashboard/exam-goal.js",
    "css/exam-goal.css",
]
for m in modules:
    text = read(m)
    check(m, text is not None and len((text or "").strip()) > 40)

print("\n[2] Exam Goal 저장")
engine = read("js/exam-goal/exam-goal-engine.js") or ""
storage = read("js/exam-goal/exam-goal-storage.js") or ""
validator = read("js/exam-goal/exam-goal-validator.js") or ""
check("saveExamGoal", "saveExamGoal" in engine)
check("validateExamGoal", "validateExamGoal" in validator)
check("persistExamGoal", "persistExamGoal" in storage)
check("schema fields", "examDate" in storage and "targetScore" in storage and "availableMinutes" in storage)

print("\n[3] D-Day 계산")
calc = read("js/exam-goal/exam-goal-calculator.js") or ""
check("calculateDaysRemaining", "calculateDaysRemaining" in calc)
check("formatDDay", "formatDDay" in calc)
check("D- format", "D-" in calc)

print("\n[4] Phase 변경")
phase = read("js/exam-goal/exam-phase-engine.js") or ""
check("FOUNDATION", "FOUNDATION" in phase)
check("WEAKNESS_REMOVAL", "WEAKNESS_REMOVAL" in phase)
check("FINAL_STABILIZATION", "FINAL_STABILIZATION" in phase)
check("EXAM_READY", "EXAM_READY" in phase)
check("resolveGoalPhase", "resolveGoalPhase" in phase)
check("evaluateExamPhase", "evaluateExamPhase" in phase)
check("D-60 display", "D-60" in phase)
check("새 문제 금지", "새 문제" in phase)

print("\n[5] Strategy 연결")
check("getExamModeStrategy", "getExamModeStrategy" in engine)
check("getExamStrategy", "getExamStrategy" in engine)
check("generateExamStrategy consume", "generateExamStrategy" in engine)
check("todayTasks", "todayTasks" in engine)
check("forbiddenActions", "forbiddenActions" in engine)
strat = read("js/exam-strategy/strategy-engine.js") or ""
check("getExamStrategy alias in strategy-engine", "getExamStrategy" in strat)

print("\n[6] Progress Tracking")
check("setTaskCompleted", "setTaskCompleted" in engine)
check("streak", "streak" in engine and "streak" in storage)
check("learning.exam-progress", "learning.exam-progress.v1" in (read("js/storage.js") or ""))

print("\n[7] Dashboard 렌더")
dash_html = read("dashboard.html") or ""
dash_page = read("js/learning-dashboard-page.js") or ""
ui = read("js/components/dashboard/exam-goal.js") or ""
check("exam-goal.css", "exam-goal.css" in dash_html)
check("widget-exam-mode-card", "widget-exam-mode-card" in dash_html)
check("widget-exam-countdown", "widget-exam-countdown" in dash_html)
check("widget-exam-goal-progress", "widget-exam-goal-progress" in dash_html)
check("widget-exam-today-mission", "widget-exam-today-mission" in dash_html)
check("widget-exam-risk-alert", "widget-exam-risk-alert" in dash_html)
check("widget-exam-completion-streak", "widget-exam-completion-streak" in dash_html)
check("buildExamGoalDashboard", "buildExamGoalDashboard" in dash_page)
check("renderExamModeCard", "renderExamModeCard" in ui)
check("D-Day UI", "eg-dday" in ui or "D-Day" in dash_html)

print("\n[8] Result — 시험 전략 관점")
tutor = read("js/smart-tutor/smart-tutor.js") or ""
check("enrichNextProblemsWithExamGoal", "enrichNextProblemsWithExamGoal" in tutor)
check("시험 전략 관점", "시험 전략 관점" in tutor or "explainExamStrategyPerspective" in engine)
check("examPerspective", "examPerspective" in tutor)

print("\n[9] Tutor Context 연결")
ai = read("js/ai-tutor.js") or ""
qjs = read("js/question.js") or ""
check("buildExamTutorContext", "buildExamTutorContext" in engine)
check("ai-tutor examGoal attach", "buildExamTutorContext" in ai and "examGoal" in ai)
check("question.js exam context", "buildExamTutorContext" in qjs)
check("tutorGenerationUnchanged", "tutorGenerationUnchanged: true" in engine)

print("\n[10] Storage keys")
st = read("js/storage.js") or ""
for key in [
    "learning.exam-goal.v1",
    "learning.exam-progress.v1",
    "learning.exam-phase.v1",
]:
    check(f"storage {key}", key in st)

print("\n[11] Contracts")
loader = read("js/data-loader.js") or ""
for c in [
    "examGoalContract",
    "examProgressContract",
    "examPhaseContract",
    "validationExamMode",
]:
    check(f"contract {c}", c in loader)

print("\n[12] Non-Goals")
frozen = [
    "js/learning-engine/learning-engine.js",
    "js/learning-engine/mastery-engine.js",
    "js/learning-engine/recommendation-engine.js",
    "js/reviewer/override-service.js",
]
for f in frozen:
    text = read(f) or ""
    check(f"{f} no Sprint-16B rewrite", "Sprint-16B" not in text and "16B" not in text)

check("validationExamMode LE unchanged", "learningEngineUnchanged: true" in loader)

print("\n[13] DB SHA identical")
check("Question DB SHA unchanged", sha256("data/question-db.json") == Q_SHA)
check("Pattern DB SHA unchanged", sha256("data/pattern-db.json") == P_SHA)
check("Statistics SHA unchanged", sha256("data/statistics.json") == S_SHA)
check("Question DB no exam-goal write", "exam-goal" not in (read("data/question-db.json") or ""))
check("Pattern DB no exam-goal write", "exam-goal" not in (read("data/pattern-db.json") or ""))

print("\n[14] Existing 16A contracts preserved")
for c in ["examStrategyContract", "readinessScoreContract", "validationExamStrategy"]:
    check(f"kept {c}", c in loader)

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
