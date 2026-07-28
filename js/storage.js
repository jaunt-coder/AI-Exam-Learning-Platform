/**
 * AI Exam Learning Platform v2
 * Storage — LocalStorage 관리
 */

const STORAGE_KEYS = {
  PROGRESS: 'progress',
  WRONG_ANSWERS: 'wrongAnswers',
  BOOKMARKS: 'bookmarks',
  RECENT_STUDY: 'recentStudy',
  LEARNING_EVENTS: 'learningEvents',
  THEME: 'theme',
  SETTINGS: 'settings',
  EXAM_HISTORY: 'examHistory',
  // Coach Agent Layer (additive — do not rename existing keys)
  USER_PROFILE: 'userProfile',
  QUESTION_ATTEMPTS: 'questionAttempts',
  WEAKNESS_REPORTS: 'weaknessReports',
  // Phase C2 append-only attempts (does not replace legacy keys)
  COACH_ATTEMPTS_V1: 'coach.attempts.v1',
  // Phase C3 weakness diagnosis snapshot
  COACH_WEAKNESS_V1: 'coach.weakness.v1',
  // M1 Learning Loop (additive — do not rename existing Constitution keys)
  LEARNING_ATTEMPTS_V1: 'learning.attempts.v1',
  LEARNING_STATE_V1: 'learning.state.v1',
  // Sprint-09K Pattern Mastery runtime (additive — do not rename)
  LEARNING_MASTERY_V1: 'learning.mastery.v1',
  // Sprint-09L Weakness Detection (additive — do not rename Constitution keys)
  LEARNING_WEAKNESS_V1: 'learning.weakness.v1',
  // Sprint-09M Learning Plan Contract (additive — do not rename Constitution keys)
  LEARNING_PLAN_V1: 'learning.plan.v1',
  // Sprint-09N Learning Strategy Resolver (additive — do not rename Constitution keys)
  LEARNING_STRATEGY_V1: 'learning.strategy.v1',
  // Sprint-10G Recommendation Engine v1 (additive — do not rename Constitution keys)
  LEARNING_RECOMMENDATION_V1: 'learning.recommendation.v1',
  // Sprint-11A LLM Adapter prompt cache (additive — do not rename Constitution keys)
  LEARNING_LLM_CACHE_V1: 'learning.llm.cache.v1',
  // Sprint-10C legacy Study Session queue (migration read — do not rename)
  LEARNING_STUDY_SESSION_V1: 'learning.study-session.v1',
  // M2.6 Evidence Pad (append-only observation log — do not rename)
  LEARNING_EVIDENCE_V1: 'learning.evidence.v1',
  // Sprint-07 UI session + Sprint-10D Study Session Runtime (same key; merge-safe)
  LEARNING_SESSION_V1: 'learning.session.v1',
  LEARNING_RETRIEVAL_V1: 'learning.retrieval.v1',
  LEARNING_PROGRESS_V1: 'learning.progress.v1',
  LEARNING_SYNC_META_V1: 'learning.sync.meta.v1',
  // Sprint-12A Reviewer Mode / Override Layer (additive — do not rename)
  LEARNING_REVIEW_V1: 'learning.review.v1',
  QUESTION_OVERRIDES_V1: 'question-overrides.v1',
  REVIEW_HISTORY_V1: 'review-history.v1',
  // Sprint-12B AI Recovery Assistant (additive — do not rename)
  LEARNING_RECOVERY_V1: 'learning.recovery.v1',
  LEARNING_SUGGESTION_V1: 'learning.suggestion.v1',
  LEARNING_CONFIDENCE_V1: 'learning.confidence.v1',
  // Sprint-12C Data Quality Center (additive — do not rename)
  LEARNING_QUALITY_V1: 'learning.quality.v1',
  QUALITY_HISTORY_V1: 'quality-history.v1',
  QUALITY_REPORT_V1: 'quality-report.v1',
  // Sprint-12D Human Review Workflow (additive — do not rename)
  LEARNING_REVIEW_WORKFLOW_V1: 'learning.review-workflow.v1',
  LEARNING_REVIEW_QUEUE_V1: 'learning.review-queue.v1',
  LEARNING_REVIEW_HISTORY_V1: 'learning.review-history.v1',
  LEARNING_REVIEW_DECISION_V1: 'learning.review-decision.v1',
  // Sprint-12E Reviewer Workspace (additive — do not rename)
  LEARNING_WORKSPACE_V1: 'learning.workspace.v1',
  LEARNING_REVIEW_SESSION_V1: 'learning.review-session.v1',
  LEARNING_QUICK_FIX_V1: 'learning.quick-fix.v1',
  LEARNING_FOCUS_MODE_V1: 'learning.focus-mode.v1',
  // Sprint-13A Student Learning Workspace (additive — do not rename)
  LEARNING_STUDENT_SESSION_V1: 'learning.student-session.v1',
  LEARNING_STUDENT_CACHE_V1: 'learning.student-cache.v1',
  // Sprint-13B Learning Engine (additive — do not rename)
  LEARNING_SCHEDULE_V1: 'learning.schedule.v1',
  LEARNING_ENGINE_PROGRESS_V1: 'learning.engine-progress.v1',
  LEARNING_REVIEW_CYCLE_V1: 'learning.review-cycle.v1',
  // Sprint-14B Student Learning Dashboard (additive — do not rename)
  LEARNING_DASHBOARD_STATE_V1: 'learning.dashboard-state.v1',
  LEARNING_DASHBOARD_LAYOUT_V1: 'learning.dashboard-layout.v1',
  LEARNING_DASHBOARD_FILTER_V1: 'learning.dashboard-filter.v1',
  LEARNING_DASHBOARD_CACHE_V1: 'learning.dashboard-cache.v1',
  // Sprint-14C Evidence System (additive — do not rename; PAD key remains Evidence Pad SoT)
  LEARNING_EVIDENCE_CACHE_V1: 'learning.evidence-cache.v1',
  LEARNING_EVIDENCE_HISTORY_V1: 'learning.evidence-history.v1',
  LEARNING_EVIDENCE_SUMMARY_V1: 'learning.evidence-summary.v1',
  // Sprint-15A+ AI Dynamic Solution Engine (additive — do not rename)
  LEARNING_SOLUTION_CACHE_V1: 'learning.solution-cache.v1',
  LEARNING_SOLUTION_HISTORY_V1: 'learning.solution-history.v1',
  LEARNING_MISTAKE_PROFILE_V1: 'learning.mistake-profile.v1',
  LEARNING_DIAGNOSIS_V1: 'learning.diagnosis.v1',
  LEARNING_PRESCRIPTION_V1: 'learning.prescription.v1',
  // Sprint-15B AI Learning Loop & Smart Tutor (additive — do not rename)
  LEARNING_SMART_REVIEW_V1: 'learning.smart-review.v1',
  LEARNING_WEAK_MEMORY_V1: 'learning.weak-memory.v1',
  LEARNING_FORMULA_CARD_V1: 'learning.formula-card.v1',
  LEARNING_MINI_RETRY_V1: 'learning.mini-retry.v1',
  LEARNING_SMART_TUTOR_V1: 'learning.smart-tutor.v1',
  // Sprint-16A AI Exam Strategy (additive — do not rename)
  LEARNING_EXAM_READINESS_V1: 'learning.exam-readiness.v1',
  LEARNING_STRATEGY_STATE_V1: 'learning.strategy-state.v1',
  LEARNING_DAILY_PLAN_V1: 'learning.daily-plan.v1',
  LEARNING_PATTERN_RISK_V1: 'learning.pattern-risk.v1',
  LEARNING_EXAM_MODE_V1: 'learning.exam-mode.v1',
  // Sprint-16B Exam Mode & Goal Management (additive — do not rename)
  LEARNING_EXAM_GOAL_V1: 'learning.exam-goal.v1',
  LEARNING_EXAM_PROGRESS_V1: 'learning.exam-progress.v1',
  LEARNING_EXAM_PHASE_V1: 'learning.exam-phase.v1',
  // Sprint-15C AI Solution Quality (additive — do not rename)
  LEARNING_SOLUTION_QUALITY_V1: 'learning.solution-quality.v1',
  LEARNING_SOLUTION_BLUEPRINT_V1: 'learning.solution-blueprint.v1',
  LEARNING_SOLUTION_REVIEW_V1: 'learning.solution-review.v1',
  LEARNING_SOLUTION_IMPROVEMENT_V1: 'learning.solution-improvement.v1',
  // Sprint-17A Gemini Native Problem Solver (additive — do not rename)
  LEARNING_GEMINI_CACHE_V1: 'learning.gemini-cache.v1',
  LEARNING_GEMINI_HISTORY_V1: 'learning.gemini-history.v1',
  LEARNING_GEMINI_QUALITY_V1: 'learning.gemini-quality.v1',
  LEARNING_GEMINI_VERSION_V1: 'learning.gemini-version.v1',
  // Sprint-12F Reviewer Entry Integration (additive — do not rename)
  LEARNING_REVIEW_DRAFT_V1: 'learning.review-draft.v1',
  LEARNING_REVIEW_UI_V1: 'learning.review-ui.v1',
  LEARNING_REVIEW_SHORTCUT_V1: 'learning.review-shortcut.v1',
};

/**
 * LocalStorage에서 JSON 데이터를 안전하게 읽는다.
 * @param {string} key - Storage key
 * @param {*} defaultValue - 기본값
 * @returns {*}
 */
export function getItem(key, defaultValue = null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return defaultValue;
    return JSON.parse(raw);
  } catch (error) {
    console.error(`[Storage] Failed to read key "${key}":`, error.message);
    return defaultValue;
  }
}

/**
 * LocalStorage에 JSON 데이터를 안전하게 저장한다.
 * @param {string} key - Storage key
 * @param {*} value - 저장할 값
 * @returns {boolean}
 */
export function setItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`[Storage] Failed to write key "${key}":`, error.message);
    return false;
  }
}

/**
 * LocalStorage에서 항목을 제거한다.
 * @param {string} key - Storage key
 */
export function removeItem(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`[Storage] Failed to remove key "${key}":`, error.message);
  }
}

/**
 * 등록된 Storage Key 목록을 반환한다.
 * @returns {object}
 */
export function getStorageKeys() {
  return { ...STORAGE_KEYS };
}

export { STORAGE_KEYS };
