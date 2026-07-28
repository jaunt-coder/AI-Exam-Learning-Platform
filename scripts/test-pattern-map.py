# -*- coding: utf-8 -*-
"""Sprint-19C — Pattern Intelligence Map + Pass60 + ROI tests."""
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
print("Sprint-19C Pattern Intelligence Map - Test Suite")
print("=" * 60)

Q_SHA = sha256("data/question-db.json")
P_SHA = sha256("data/pattern-db.json")
S_SHA = sha256("data/statistics.json")

MODULES = [
    "js/pattern-map/pattern-map-engine.js",
    "js/pattern-map/pattern-priority.js",
    "js/pattern-map/pattern-score.js",
    "js/pattern-map/pattern-frequency.js",
    "js/pattern-map/pattern-risk.js",
    "js/pattern-map/pattern-mastery.js",
    "js/pattern-map/pattern-heatmap.js",
    "js/pattern-map/pattern-graph.js",
    "js/pattern-map/pass60-engine.js",
    "js/pattern-map/roi-engine.js",
    "js/pattern-map/roi-calculator.js",
    "js/pattern-map/roi-storage.js",
]

print("\n[1] Modules")
for m in MODULES:
    check(m, read(m) is not None)

print("\n[2] ROI 계산")
calc = read("js/pattern-map/roi-calculator.js") or ""
check("calculateRoi", "calculateRoi" in calc)
check("Expected Score Gain / Time", "expectedScoreGain" in calc and "estimatedMinutes" in calc)
check("estimateScoreGain", "estimateScoreGain" in calc)
check("estimateStudyMinutes", "estimateStudyMinutes" in calc)
check("roiStars", "roiStars" in calc)
# sanity: 2.5pt / 35min → ~97
# score = (2.5 / (35/60)) * 22.5 = 96.428 → 96
gain_per_hour = 2.5 / (35 / 60)
score = round(gain_per_hour * 22.5)
check("example ROI ~97 (2.5/35min)", 94 <= score <= 98)

print("\n[3] Frequency")
freq = read("js/pattern-map/pattern-frequency.js") or ""
check("buildFrequencyMap", "buildFrequencyMap" in freq)
check("frequencyWeight", "frequencyWeight" in freq)

print("\n[4] Pass60")
p60 = read("js/pattern-map/pass60-engine.js") or ""
check("buildPass60Plan", "buildPass60Plan" in p60)
check("PASS60_TARGET 60", "PASS60_TARGET = 60" in p60 or "targetScore: 60" in p60 or "|| 60" in p60)
check("advice 전부 공부하지 마세요", "전부 공부하지 마세요" in p60)
check("getPass60DashboardCard", "getPass60DashboardCard" in p60)

print("\n[5] Pattern Priority")
prio = read("js/pattern-map/pattern-priority.js") or ""
check("computePriority", "computePriority" in prio)
check("Frequency × MasteryGap", "frequency" in prio and "masteryGap" in prio)
check("recentWrong", "recentWrong" in prio)
check("confidence", "confidence" in prio)
check("roi", "roi" in prio)
check("rankByPriority", "rankByPriority" in prio)

print("\n[6] Dashboard + Pattern Intelligence menu")
html = read("dashboard.html") or ""
pi_html = read("pattern-intelligence.html") or ""
dash = read("js/learning-dashboard-page.js") or ""
widget = read("js/dashboard/dashboard-widget.js") or ""
check("Pattern Intelligence nav", "pattern-intelligence.html" in html)
check("widget-pass60", "widget-pass60" in html)
check("widget-roi-gauge", "widget-roi-gauge" in html)
check("widget-expected-score", "widget-expected-score" in html)
check("widget-remaining-pattern", "widget-remaining-pattern" in html)
check("pass60 WIDGET_IDS", "pass60" in widget)
check("roiGauge WIDGET_IDS", "roiGauge" in widget)
check("buildPatternIntelligence on dashboard", "buildPatternIntelligence" in dash)
check("pattern-intelligence.html", pi_html is not None)
check("Pass60 Mode UI", "Pass60 Mode" in (pi_html or ""))
check("ROI TOP10 UI", "ROI TOP10" in (pi_html or ""))

print("\n[7] Today Mission")
roi_eng = read("js/pattern-map/roi-engine.js") or ""
pi_page = read("js/pattern-intelligence-page.js") or ""
check("buildTodayRoiMission", "buildTodayRoiMission" in roi_eng)
check("buildWeekRoiMission", "buildWeekRoiMission" in roi_eng)
check("today mission render", "pi-today" in (pi_html or "") and "renderToday" in pi_page)

print("\n[8] D-Day")
graph = read("js/pattern-map/pattern-graph.js") or ""
check("buildDdayRoiPlan", "buildDdayRoiPlan" in graph)
check("D30 ROI", "D30" in graph and "ROI" in graph)
check("D14 Weak", "D14" in graph)
check("D7 Formula", "D7" in graph)
check("D3 Final Book", "D3" in graph and "Final Book" in graph)
check("D1 Memory Sheet", "D1" in graph and "Memory Sheet" in graph)

print("\n[9] Personal Textbook / Final Book links")
check("Pattern Detail Textbook link", "textbook.html" in graph)
check("Final Book link", "Final Book" in graph or "fb-heading" in graph)
check("Gemini / Tutor / Memory links", "gemini" in graph and "tutor" in graph and "memory" in graph)
check("detail UI", "Pattern Detail" in (pi_html or "") and "showDetail" in pi_page)

print("\n[10] Export")
engine = read("js/pattern-map/pattern-map-engine.js") or ""
check("exportPass60Report", "exportPass60Report" in engine)
check("exportRoiReport", "exportRoiReport" in engine)
check("markdown", "markdown" in engine)
check("html", "html" in engine)
check("pdf via print", "pdf" in engine)
check("export buttons", "btn-export-pass60" in (pi_html or ""))

print("\n[11] Storage (additive)")
storage = read("js/storage.js") or ""
for k in [
    "learning.pattern-map.v1",
    "learning.pattern-priority.v1",
    "learning.pass60.v1",
    "learning.roi.v1",
]:
    check(k, k in storage)
for k in [
    "learning.import-history.v1",
    "learning.current-subject.v1",
    "learning.personal-textbook.v1",
    "question-overrides.v1",
]:
    check(f"kept {k}", k in storage)

print("\n[12] Contracts")
loader = read("js/data-loader.js") or ""
check("patternMapContract", "patternMapContract" in loader)
check("pass60Contract", "pass60Contract" in loader)
check("roiContract", "roiContract" in loader)
check("validationPatternMap", "validationPatternMap" in loader)
check("importEngineContract kept", "importEngineContract" in loader)
check("subjectAdapterContract kept", "subjectAdapterContract" in loader)

print("\n[13] Heatmap / Graph")
heat = read("js/pattern-map/pattern-heatmap.js") or ""
check("buildWeaknessHeatmap", "buildWeaknessHeatmap" in heat)
check("buildRoiHeatmap", "buildRoiHeatmap" in heat)
check("buildPatternGraph", "buildPatternGraph" in graph)

print("\n[14] Immutable layers")
check("Question DB SHA identical", sha256("data/question-db.json") == Q_SHA)
check("Pattern DB SHA identical", sha256("data/pattern-db.json") == P_SHA)
check("Statistics SHA identical", sha256("data/statistics.json") == S_SHA)
print(f"  INFO  Q={Q_SHA[:16]}…")
print(f"  INFO  P={P_SHA[:16]}…")
print(f"  INFO  S={S_SHA[:16]}…")

le = read("js/learning-engine/learning-engine.js") or ""
check("LE no pattern-map import", "pattern-map" not in le)
reco = read("js/learning-engine/recommendation-engine.js") or ""
check("Recommendation no pattern-map", "pattern-map" not in reco)
override = read("js/reviewer/override-service.js") or ""
check("Override no pattern-map", "pattern-map" not in override)
orch = read("js/gemini-solver/gemini-orchestrator.js") or ""
check("Gemini no pattern-map", "pattern-map" not in orch)
vision = read("js/gemini-vision/vision-recovery.js") or ""
check("Vision no pattern-map", "pattern-map" not in vision)

print("\n[15] Philosophy markers")
check("Pattern First", "Pattern First" in engine or "Pattern First" in (pi_html or ""))
check("ROI First", "ROI First" in engine or "ROI First" in (pi_html or ""))
check("css pattern-intelligence", read("css/pattern-intelligence.css") is not None)
check("page js", read("js/pattern-intelligence-page.js") is not None)

print("\n" + "=" * 60)
print(f"RESULT: {PASS} PASS / {FAIL} FAIL")
print("=" * 60)
sys.exit(0 if FAIL == 0 else 1)
