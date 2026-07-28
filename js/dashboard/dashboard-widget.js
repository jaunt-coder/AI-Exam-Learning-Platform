/**
 * Sprint-14B — Dashboard Widget registry / mount helpers
 */

import { fadeIn, observeLazy, skeleton } from './dashboard-animation.js';
import { DEFAULT_WIDGET_ORDER } from './dashboard-layout.js';

export const WIDGET_IDS = Object.freeze({
  todayStudy: 'widget-today-study',
  masterySummary: 'widget-mastery-summary',
  weakPattern: 'widget-weak-pattern',
  recommendation: 'widget-recommendation',
  todaysReview: 'widget-todays-review',
  heatmap: 'widget-heatmap',
  recentGrowth: 'widget-recent-growth',
  weeklyStats: 'widget-weekly-stats',
  recentActivity: 'widget-recent-activity',
  quickStart: 'widget-quick-start',
  /* Sprint-16A Exam Strategy */
  examDailyPlan: 'widget-exam-daily-plan',
  examMasteryMap: 'widget-exam-mastery-map',
  examDangerPatterns: 'widget-exam-danger',
  examReadiness: 'widget-exam-readiness',
  examStrategy: 'widget-exam-strategy',
  examPatternRisk: 'widget-exam-pattern-risk',
  /* Sprint-16B Exam Goal */
  examModeCard: 'widget-exam-mode-card',
  examGoalForm: 'widget-exam-goal-form',
  examCountdown: 'widget-exam-countdown',
  examGoalProgress: 'widget-exam-goal-progress',
  examTodayMission: 'widget-exam-today-mission',
  examRiskAlert: 'widget-exam-risk-alert',
  examCompletionStreak: 'widget-exam-completion-streak',
  /* Sprint-15C Solution Quality */
  solutionQuality: 'widget-solution-quality',
  /* Sprint-17A Gemini Native Problem Solver */
  geminiSolver: 'widget-gemini-solver',
  /* Sprint-17B Gemini Vision OCR Recovery */
  visionOcr: 'widget-vision-ocr',
});

export function showSkeletons(root = document) {
  Object.values(WIDGET_IDS).forEach((id) => {
    const el = root.getElementById?.(id) || document.getElementById(id);
    if (el) el.innerHTML = skeleton();
  });
}

/**
 * Mount widgets with lazy chart rendering via IntersectionObserver.
 * @param {object} renderers — map of widgetKey -> mount(el, view)
 * @param {object} view
 */
export function mountWidgets(renderers, view) {
  const chartWidgets = new Set(['heatmap', 'recentGrowth', 'weeklyStats', 'masterySummary']);
  const order = DEFAULT_WIDGET_ORDER;

  order.forEach((key) => {
    const id = WIDGET_IDS[key];
    const el = document.getElementById(id);
    const render = renderers[key];
    if (!el || typeof render !== 'function') return;

    if (chartWidgets.has(key)) {
      el.setAttribute('data-lazy-chart', '1');
      el.innerHTML = skeleton('차트 준비 중…');
      observeLazy([el], (node) => {
        requestAnimationFrame(() => {
          render(node, view);
          fadeIn(node);
        });
      });
    } else {
      render(el, view);
      fadeIn(el);
    }
  });
}

export function widgetCount() {
  return Object.keys(WIDGET_IDS).length;
}

export default {
  WIDGET_IDS,
  showSkeletons,
  mountWidgets,
  widgetCount,
};
