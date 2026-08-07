/**
 * Sprint-14B — Dashboard layout / widget order state
 */

import { getItem, setItem, STORAGE_KEYS } from '../storage.js';

export const DASHBOARD_LAYOUT_KEY =
  STORAGE_KEYS.LEARNING_DASHBOARD_LAYOUT_V1 || 'learning.dashboard-layout.v1';

export const DEFAULT_WIDGET_ORDER = Object.freeze([
  'examModeCard',
  'examGoalForm',
  'examCountdown',
  'examGoalProgress',
  'examTodayMission',
  'examRiskAlert',
  'examCompletionStreak',
  'aiStatus',
  'aiRuntime',
  'solutionQuality',
  'geminiSolver',
  'professorQuality',
  'visionOcr',
  'personalTextbook',
  'finalRevisionBook',
  'importProgress',
  'pass60',
  'roiGauge',
  'expectedScore',
  'remainingPattern',
  'examDailyPlan',
  'examMasteryMap',
  'examDangerPatterns',
  'examReadiness',
  'examStrategy',
  'examPatternRisk',
  'todayStudy',
  'masterySummary',
  'weakPattern',
  'recommendation',
  'todaysReview',
  'heatmap',
  'recentGrowth',
  'weeklyStats',
  'recentActivity',
  'quickStart',
]);

export function loadDashboardLayout() {
  const raw = getItem(DASHBOARD_LAYOUT_KEY, null);
  if (!raw || typeof raw !== 'object') {
    return { schemaVersion: 'v1', order: [...DEFAULT_WIDGET_ORDER] };
  }
  const order = Array.isArray(raw.order) && raw.order.length
    ? raw.order
    : [...DEFAULT_WIDGET_ORDER];
  return { schemaVersion: 'v1', order };
}

export function saveDashboardLayout(layout) {
  return setItem(DASHBOARD_LAYOUT_KEY, {
    schemaVersion: 'v1',
    order: Array.isArray(layout?.order) ? layout.order : [...DEFAULT_WIDGET_ORDER],
    updatedAt: new Date().toISOString(),
  });
}

export default {
  DASHBOARD_LAYOUT_KEY,
  DEFAULT_WIDGET_ORDER,
  loadDashboardLayout,
  saveDashboardLayout,
};
