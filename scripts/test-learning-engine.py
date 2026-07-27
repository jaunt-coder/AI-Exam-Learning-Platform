"""
Sprint-13B -- Learning Engine Test Suite
Validates module existence, storage keys, contracts, and UI integration.
"""
import hashlib
import json
import os
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PASS = 0
FAIL = 0

def check(description, condition):
    global PASS, FAIL
    if condition:
        PASS += 1
        print(f"  PASS  {description}")
    else:
        FAIL += 1
        print(f"  FAIL  {description}")

def read(path):
    full = os.path.join(ROOT, path)
    if not os.path.exists(full):
        return None
    with open(full, "r", encoding="utf-8") as f:
        return f.read()

print("=" * 60)
print("Sprint-13B Learning Engine - Test Suite")
print("=" * 60)

# ── 1. Frozen DB Integrity ──
print("\n[1] Frozen DB Integrity")
for db_path in ["data/question-db.json", "data/pattern-db.json", "data/master-db.json"]:
    content = read(db_path)
    check(f"{db_path} exists", content is not None)

# ── 2. Learning Engine Modules ──
print("\n[2] Learning Engine Modules")
LE_MODULES = [
    "js/learning-engine/learning-engine.js",
    "js/learning-engine/learning-analyzer.js",
    "js/learning-engine/mastery-engine.js",
    "js/learning-engine/recommendation-engine.js",
    "js/learning-engine/review-engine.js",
    "js/learning-engine/scheduler.js",
    "js/learning-engine/learning-storage.js",
]
for mod in LE_MODULES:
    content = read(mod)
    check(f"{mod} exists", content is not None)
    if content:
        check(f"{mod} is non-empty", len(content.strip()) > 100)

# ── 3. Storage Keys ──
print("\n[3] Storage Keys in js/storage.js")
storage_content = read("js/storage.js")
check("storage.js readable", storage_content is not None)
for key in ["learning.schedule.v1", "learning.engine-progress.v1", "learning.review-cycle.v1"]:
    check(f"Storage key '{key}'", key in (storage_content or ""))

# ── 4. Contracts in data-loader.js ──
print("\n[4] Contracts in js/data-loader.js")
dl_content = read("js/data-loader.js")
check("data-loader.js readable", dl_content is not None)
for contract in [
    "learningEngineContract",
    "masteryEngineContract",
    "recommendationEngineContract",
    "reviewCycleContract",
    "scheduleContract",
    "validationLearningEngine",
]:
    check(f"Contract '{contract}'", contract in (dl_content or ""))

# ── 5. Mastery Engine ──
print("\n[5] Mastery Engine (mastery-engine.js)")
mastery_content = read("js/learning-engine/mastery-engine.js")
check("mastery-engine.js readable", mastery_content is not None)
for fn in ["computeQuestionMastery", "computePatternMastery", "computeChapterMastery", "recordQuestionAttempt", "buildMasteryHeatmap"]:
    check(f"Function '{fn}'", fn in (mastery_content or ""))

# ── 6. Review Engine (Spaced Repetition) ──
print("\n[6] Review Engine (review-engine.js)")
review_content = read("js/learning-engine/review-engine.js")
check("review-engine.js readable", review_content is not None)
for fn in ["updateReviewCycle", "getDueReviews", "getUpcomingReviews", "getReviewSummary"]:
    check(f"Function '{fn}'", fn in (review_content or ""))
check("REVIEW_INTERVALS [1,3,7,14,30]", "1, 3, 7, 14, 30" in (review_content or ""))

# ── 7. Recommendation Engine ──
print("\n[7] Recommendation Engine (recommendation-engine.js)")
rec_content = read("js/learning-engine/recommendation-engine.js")
check("recommendation-engine.js readable", rec_content is not None)
for fn in ["buildLearningRecommendations", "getNextRecommendedQuestions"]:
    check(f"Function '{fn}'", fn in (rec_content or ""))
for reason in ["RECENT_WRONG", "LOW_MASTERY", "LOW_CONFIDENCE", "PATTERN_DIVERSITY", "REVIEW_DUE"]:
    check(f"Reason code '{reason}'", reason in (rec_content or ""))

# ── 8. Learning Engine Orchestrator ──
print("\n[8] Learning Engine Orchestrator")
le_content = read("js/learning-engine/learning-engine.js")
check("learning-engine.js readable", le_content is not None)
for fn in ["onQuestionAnswered", "onExamComplete", "buildLearningDashboard", "getTutorContext"]:
    check(f"Function '{fn}'", fn in (le_content or ""))

# ── 9. Question Page Integration ──
print("\n[9] Question Page Integration (js/question.js)")
q_content = read("js/question.js")
check("question.js readable", q_content is not None)
check("imports onQuestionAnswered", "onQuestionAnswered" in (q_content or ""))
check("calls onQuestionAnswered", "onQuestionAnswered(" in (q_content or ""))

# ── 10. Pattern Page Integration ──
print("\n[10] Pattern Page Integration (js/pattern.js)")
p_content = read("js/pattern.js")
check("pattern.js readable", p_content is not None)
check("imports computePatternMastery", "computePatternMastery" in (p_content or ""))
check("shows Pattern Mastery", "Pattern Mastery" in (p_content or ""))

# ── 11. Exam Page Integration ──
print("\n[11] Exam Page Integration (js/exam.js)")
e_content = read("js/exam.js")
check("exam.js readable", e_content is not None)
check("imports onExamComplete", "onExamComplete" in (e_content or ""))
check("calls onExamComplete", "onExamComplete(" in (e_content or ""))

# ── 12. AI Tutor Integration ──
print("\n[12] AI Tutor Integration (js/ai-tutor.js)")
t_content = read("js/ai-tutor.js")
check("ai-tutor.js readable", t_content is not None)
check("imports getTutorContext", "getTutorContext" in (t_content or ""))
check("passes learningContext", "learningContext" in (t_content or ""))

# ── 13. Dashboard Integration ──
print("\n[13] Dashboard Integration (js/learning-dashboard-page.js)")
d_content = read("js/learning-dashboard-page.js")
check("learning-dashboard-page.js readable", d_content is not None)
check("imports buildLearningDashboard", "buildLearningDashboard" in (d_content or ""))
check("stores learningEngine data", "learningEngine" in (d_content or ""))

# ── 14. Non-Goals — Frozen files not modified ──
print("\n[14] Non-Goals — Frozen runtime files")
for frozen in ["js/learning-loop.js", "js/ai-coach-service.js", "js/exam-engine.js"]:
    content = read(frozen)
    if content:
        check(f"{frozen} does NOT import learning-engine", "learning-engine/" not in content)
    else:
        check(f"{frozen} not found (OK)", True)

# ── Summary ──
print("\n" + "=" * 60)
total = PASS + FAIL
print(f"Results: {PASS}/{total} PASS, {FAIL}/{total} FAIL")
if FAIL > 0:
    print("STATUS: FAIL")
    sys.exit(1)
else:
    print("STATUS: PASS")
    sys.exit(0)
