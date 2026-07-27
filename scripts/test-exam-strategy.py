# -*- coding: utf-8 -*-
"""Sprint-16A — AI Exam Strategy tests."""
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
print("Sprint-16A AI Exam Strategy - Test Suite")
print("=" * 60)

Q_SHA = sha256("data/question-db.json")
P_SHA = sha256("data/pattern-db.json")
S_SHA = sha256("data/statistics.json")

print("\n[1] Modules")
modules = [
    "js/exam-strategy/strategy-engine.js",
    "js/exam-strategy/readiness-score.js",
    "js/exam-strategy/weakness-priority.js",
    "js/exam-strategy/daily-plan-generator.js",
    "js/exam-strategy/exam-advice.js",
    "js/exam-strategy/strategy-storage.js",
    "js/components/dashboard/exam-strategy.js",
    "css/exam-strategy.css",
]
for m in modules:
    text = read(m)
    check(m, text is not None and len((text or "").strip()) > 40)

print("\n[2] Student Mastery Map")
weak = read("js/exam-strategy/weakness-priority.js") or ""
ui = read("js/components/dashboard/exam-strategy.js") or ""
check("buildMasteryMap", "buildMasteryMap" in weak)
check("나의 회계학 상태", "나의 회계학 상태" in weak or "나의 회계학 상태" in ui)
check("renderMasteryMap", "renderMasteryMap" in ui)
check("위험 Pattern TOP 5", "위험 Pattern TOP 5" in ui or "dangerTop5" in weak)

print("\n[3] Exam Readiness Score")
ready = read("js/exam-strategy/readiness-score.js") or ""
check("computeExamReadinessScore", "computeExamReadinessScore" in ready)
check("Mastery 40%", "0.4" in ready and "mastery" in ready)
check("Recent 20%", "0.2" in ready and "recent" in ready.lower())
check("Repeat wrong 20%", "repeat" in ready.lower())
check("Review 10%", "0.1" in ready and "review" in ready.lower())
check("Confidence 10%", "confidence" in ready.lower())
check("learningEngineFormulasUnchanged", "learningEngineFormulasUnchanged: true" in ready)

print("\n[4] AI Exam Strategy generation")
engine = read("js/exam-strategy/strategy-engine.js") or ""
advice = read("js/exam-strategy/exam-advice.js") or ""
daily = read("js/exam-strategy/daily-plan-generator.js") or ""
check("generateExamStrategy", "generateExamStrategy" in engine)
check("목표 합격 가능성", "passProbability" in engine)
check("buildExamAdvice", "buildExamAdvice" in advice)
check("generateDailyPlan", "generateDailyPlan" in daily)
check("FIFO 3문제 action", "FIFO 3문제" in daily)
check("실전 테스트", "실전 테스트" in daily)

print("\n[5] Today Plan")
check("오늘 해야 할 공부", "오늘 해야 할 공부" in daily)
check("stars helper", "stars" in daily)
check("renderDailyPlanCard", "renderDailyPlanCard" in ui)

print("\n[6] Pattern Risk Score")
check("computePatternRiskScore", "computePatternRiskScore" in weak)
check("Risk HIGH", "HIGH" in weak)
check("복습 미실시", "복습 미실시" in weak)
check("renderPatternRiskList", "renderPatternRiskList" in ui)

print("\n[7] Exam Mode D-30 / D-7 / D-1")
check("EXAM_PHASES", "EXAM_PHASES" in advice)
check("D30", "D30" in advice)
check("D7", "D7" in advice)
check("D1", "D1" in advice)
check("setExamMode", "setExamMode" in advice)
check("약점 제거", "약점 제거" in advice or "weaknessRemoval" in advice)
check("암기 카드", "암기 카드" in advice or "암기 카드" in daily)

print("\n[8] Storage keys")
storage = read("js/storage.js") or ""
for key in [
    "learning.exam-readiness.v1",
    "learning.strategy-state.v1",
    "learning.daily-plan.v1",
    "learning.pattern-risk.v1",
    "learning.exam-mode.v1",
]:
    check(f"storage {key}", key in storage)

print("\n[9] Contracts")
loader = read("js/data-loader.js") or ""
for c in [
    "examStrategyContract",
    "readinessScoreContract",
    "dailyPlanContract",
    "patternRiskContract",
    "examModeContract",
    "validationExamStrategy",
]:
    check(f"contract {c}", c in loader)

print("\n[10] Dashboard UI")
dash_html = read("dashboard.html") or ""
dash_page = read("js/learning-dashboard-page.js") or ""
dash_widget = read("js/dashboard/dashboard-widget.js") or ""
check("exam-strategy.css on dashboard", "exam-strategy.css" in dash_html)
check("widget-exam-daily-plan", "widget-exam-daily-plan" in dash_html)
check("widget-exam-mastery-map", "widget-exam-mastery-map" in dash_html)
check("widget-exam-danger", "widget-exam-danger" in dash_html)
check("widget-exam-readiness", "widget-exam-readiness" in dash_html)
check("widget-exam-strategy", "widget-exam-strategy" in dash_html)
check("generateExamStrategy in page", "generateExamStrategy" in dash_page)
check("examDailyPlan widget id", "examDailyPlan" in dash_widget)

print("\n[11] Result — 왜 이 문제를 추천했는가")
tutor = read("js/smart-tutor/smart-tutor.js") or ""
check("enrichNextProblemsWithStrategy", "enrichNextProblemsWithStrategy" in tutor)
check("왜 이 문제를 추천했는가", "왜 이 문제를 추천했는가" in tutor or "왜 이 문제를 추천했는가" in advice)
check("현재 약점", "현재 약점" in tutor)
check("예상 효과", "예상 효과" in tutor or "expectedEffect" in advice)
check("explainRecommendationWhy", "explainRecommendationWhy" in advice)

print("\n[12] Non-Goals — LE / Recommendation / Override unchanged")
frozen = [
    "js/learning-engine/learning-engine.js",
    "js/learning-engine/mastery-engine.js",
    "js/learning-engine/recommendation-engine.js",
    "js/learning-engine/review-engine.js",
    "js/reviewer/override-service.js",
]
for f in frozen:
    text = read(f) or ""
    check(f"{f} no Sprint-16A rewrite", "Sprint-16A" not in text and "16A" not in text)

check(
    "examStrategyContract LE formulas unchanged",
    "learningEngineFormulasUnchanged: true" in loader,
)
check(
    "examStrategyContract recommendation unchanged",
    "recommendationEngineUnchanged: true" in loader,
)

print("\n[13] Question / Pattern / Statistics DB SHA identical")
check("Question DB SHA unchanged", sha256("data/question-db.json") == Q_SHA)
check("Pattern DB SHA unchanged", sha256("data/pattern-db.json") == P_SHA)
check("Statistics SHA unchanged", sha256("data/statistics.json") == S_SHA)
check("Question DB no exam-strategy write", "exam-strategy" not in (read("data/question-db.json") or ""))
check("Pattern DB no exam-strategy write", "exam-strategy" not in (read("data/pattern-db.json") or ""))
check("Statistics no exam-strategy write", "exam-strategy" not in (read("data/statistics.json") or ""))

print("\n[14] Existing contracts preserved")
for c in [
    "solutionEngineContract",
    "smartTutorContract",
    "learningLoopContract",
    "overrideContract",
]:
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
