# -*- coding: utf-8 -*-
"""Sprint-14B — Student Learning Dashboard UI tests."""
from __future__ import annotations

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


print("=" * 60)
print("Sprint-14B Student Learning Dashboard UI - Test Suite")
print("=" * 60)

print("\n[1] Modules")
modules = [
    "js/dashboard/dashboard-engine.js",
    "js/dashboard/dashboard-widget.js",
    "js/dashboard/dashboard-chart.js",
    "js/dashboard/dashboard-filter.js",
    "js/dashboard/dashboard-cache.js",
    "js/dashboard/dashboard-animation.js",
    "js/dashboard/dashboard-layout.js",
    "js/dashboard/dashboard-utils.js",
]
for m in modules:
    check(m, read(m) is not None)

print("\n[2] Components")
components = [
    "js/components/dashboard/card.js",
    "js/components/dashboard/progress.js",
    "js/components/dashboard/chart.js",
    "js/components/dashboard/heatmap.js",
    "js/components/dashboard/recommendation.js",
    "js/components/dashboard/review.js",
    "js/components/dashboard/mastery.js",
    "js/components/dashboard/recent-activity.js",
    "js/components/dashboard/quick-start.js",
    "js/components/dashboard/weak-pattern.js",
]
for c in components:
    check(c, read(c) is not None)

print("\n[3] Dashboard Rendering")
html = read("dashboard.html") or ""
page = read("js/learning-dashboard-page.js") or ""
check("dashboard.html exists", bool(html))
check("Student Learning Dashboard title", "Student Learning Dashboard" in html)
for wid in [
    "widget-today-study",
    "widget-mastery-summary",
    "widget-weak-pattern",
    "widget-recommendation",
    "widget-todays-review",
    "widget-heatmap",
    "widget-recent-growth",
    "widget-weekly-stats",
    "widget-recent-activity",
    "widget-quick-start",
]:
    check(f"widget {wid}", wid in html)
check("mountWidgets used", "mountWidgets" in page)
check("buildStudentDashboardView used", "buildStudentDashboardView" in page)
check("10 widget sections", html.count("widget-") >= 10)

print("\n[4] Charts")
chart = read("js/dashboard/dashboard-chart.js") or ""
check("drawLineChart", "drawLineChart" in chart)
check("drawRadarChart", "drawRadarChart" in chart)
check("drawDonut", "drawDonut" in chart)
check("heatmap component", "renderHeatmap" in (read("js/components/dashboard/heatmap.js") or ""))
check("no D3", "d3." not in chart.lower() and "from 'd3'" not in chart.lower())

print("\n[5] Responsive")
css = read("css/learning-dashboard.css") or ""
check("1024 breakpoint", "1024px" in css)
check("768 breakpoint", "768px" in css)
check("480 breakpoint", "480px" in css)

print("\n[6] Accessibility")
check("ARIA live status", 'aria-live="polite"' in html)
check("progressbar role", "role=\"progressbar\"" in (read("js/components/dashboard/progress.js") or "") or "role='progressbar'" in (read("js/components/dashboard/progress.js") or ""))
check("focus-visible styles", "focus-visible" in css)
check("keyboard tabindex widgets", 'tabindex="-1"' in html)
check("heatmap aria-label", "aria-label" in (read("js/components/dashboard/heatmap.js") or ""))

print("\n[7] Storage")
storage = read("js/storage.js") or ""
for key in [
    "learning.dashboard-state.v1",
    "learning.dashboard-layout.v1",
    "learning.dashboard-filter.v1",
    "learning.dashboard-cache.v1",
]:
    check(f"storage {key}", key in storage)

print("\n[8] Contract")
loader = read("js/data-loader.js") or ""
for c in [
    "dashboardContract",
    "dashboardWidgetContract",
    "dashboardChartContract",
    "dashboardFilterContract",
    "dashboardCacheContract",
    "validationDashboard",
]:
    check(f"contract {c}", c in loader)

print("\n[9] Performance")
anim = read("js/dashboard/dashboard-animation.js") or ""
widget = read("js/dashboard/dashboard-widget.js") or ""
check("IntersectionObserver", "IntersectionObserver" in anim)
check("requestAnimationFrame", "requestAnimationFrame" in anim or "requestAnimationFrame" in widget)
check("lazy chart", "data-lazy-chart" in widget or "observeLazy" in widget)
check("cache module", "saveDashboardCache" in (read("js/dashboard/dashboard-cache.js") or ""))
check("skeleton loading", "skeleton" in anim)

print("\n[10] Non-Goals (frozen)")
for frozen in [
    "js/learning-engine/mastery-engine.js",
    "js/learning-engine/recommendation-engine.js",
    "js/reviewer/override-service.js",
    "js/recovery/ai-recovery-service.js",
    "js/student/student-resolver.js",
]:
    text = read(frozen) or ""
    # UI sprint must not rewrite engine algorithms: heuristic — no Sprint-14B markers in frozen cores
    check(f"{frozen} not Sprint-14B rewritten", "Sprint-14B" not in text)

print("\n[11] Loading / Animation")
check("fade animation class", "ld-anim-fade" in css)
check("progress animation", "animateProgress" in anim)
check("hover styles", ":hover" in css)

print("\n" + "=" * 60)
total = PASS + FAIL
print(f"Results: {PASS}/{total} PASS, {FAIL}/{total} FAIL")
if FAIL:
    print("STATUS: FAIL")
    sys.exit(1)
print("STATUS: PASS")
sys.exit(0)
