/**
 * Sprint-14B — Dashboard filter / chart metric state
 */

import { getItem, setItem, STORAGE_KEYS } from '../storage.js';

export const DASHBOARD_FILTER_KEY =
  STORAGE_KEYS.LEARNING_DASHBOARD_FILTER_V1 || 'learning.dashboard-filter.v1';

const DEFAULTS = Object.freeze({
  growthMetric: 'accuracy', // mastery | accuracy | studyTime
  weeklyView: 'radar',
  weakLimit: 10,
});

export function loadDashboardFilter() {
  const raw = getItem(DASHBOARD_FILTER_KEY, null);
  if (!raw || typeof raw !== 'object') return { ...DEFAULTS };
  return {
    growthMetric: raw.growthMetric || DEFAULTS.growthMetric,
    weeklyView: raw.weeklyView || DEFAULTS.weeklyView,
    weakLimit: Number(raw.weakLimit) || DEFAULTS.weakLimit,
  };
}

export function saveDashboardFilter(filter) {
  return setItem(DASHBOARD_FILTER_KEY, {
    ...DEFAULTS,
    ...(filter || {}),
    updatedAt: new Date().toISOString(),
  });
}

export function setGrowthMetric(metric) {
  const next = loadDashboardFilter();
  next.growthMetric = metric;
  saveDashboardFilter(next);
  return next;
}

export default {
  DASHBOARD_FILTER_KEY,
  loadDashboardFilter,
  saveDashboardFilter,
  setGrowthMetric,
};
