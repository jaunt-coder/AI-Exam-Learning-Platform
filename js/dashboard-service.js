/**
 * Sprint-10E — Learning Dashboard (UI Layer)
 * Read-only projection from LocalStorage learning.* keys.
 * No AI / Recommendation / Runtime mutation / DB mutation.
 */

import { getItem, STORAGE_KEYS } from './storage.js';

export const DASHBOARD_SCHEMA_VERSION = 'v1';

const ACTIVE_PLAN_STATUSES = new Set(['GENERATED', 'ACTIVE']);

/**
 * Map runtime masteryLevel → dashboard display bucket.
 * Runtime: UNKNOWN | LEARNING | DEVELOPING | MASTERED | RETRY_REQUIRED
 * Dashboard: MASTERED | PROFICIENT | PRACTICING | LEARNING | RETRY_REQUIRED
 *
 * @param {object} entry
 * @returns {string}
 */
export function mapMasteryBucket(entry = {}) {
  const level = entry.masteryLevel || 'UNKNOWN';
  if (level === 'MASTERED') return 'MASTERED';
  if (level === 'RETRY_REQUIRED') return 'RETRY_REQUIRED';
  if (level === 'LEARNING' || level === 'UNKNOWN') return 'LEARNING';
  if (level === 'DEVELOPING') {
    const acc = typeof entry.accuracy === 'number' ? entry.accuracy : 0;
    return acc >= 0.8 ? 'PROFICIENT' : 'PRACTICING';
  }
  return 'LEARNING';
}

/**
 * @param {object|null} session
 * @returns {{
 *   completed: number,
 *   total: number,
 *   remaining: number,
 *   percent: number,
 *   label: string,
 *   estimatedMinutesRemaining: number,
 *   estimatedMinutes: number,
 *   active: boolean,
 *   strategyType: string|null,
 *   status: string|null
 * }}
 */
export function calculateStudyProgress(session) {
  if (!session || typeof session !== 'object') {
    return {
      completed: 0,
      total: 0,
      remaining: 0,
      percent: 0,
      label: '0 / 0',
      estimatedMinutesRemaining: 0,
      estimatedMinutes: 0,
      active: false,
      strategyType: null,
      status: null,
    };
  }

  const questionIds = Array.isArray(session.questionIds)
    ? session.questionIds
    : Array.isArray(session.questions)
      ? session.questions.map((q) => q.questionId || q).filter(Boolean)
      : [];

  const completedList = Array.isArray(session.completedQuestions)
    ? session.completedQuestions
    : Array.isArray(session.completed)
      ? session.completed
      : [];

  const remainingList = Array.isArray(session.remainingQuestions)
    ? session.remainingQuestions
    : questionIds.filter((id) => !completedList.includes(id));

  const total = questionIds.length || completedList.length + remainingList.length;
  const completed = Math.min(completedList.length, total || completedList.length);
  const remaining =
    remainingList.length || Math.max(0, total - completed);
  const percent =
    total > 0 ? Math.round((completed / total) * 100) : 0;
  const estimatedMinutes =
    Number(session.estimatedMinutes) || remaining * 3 + completed * 3 || 0;
  const minutesPer =
    total > 0 && estimatedMinutes > 0
      ? estimatedMinutes / total
      : 3;
  const estimatedMinutesRemaining = Math.round(remaining * minutesPer);

  return {
    completed,
    total,
    remaining,
    percent,
    label: `${completed} / ${total}`,
    estimatedMinutesRemaining,
    estimatedMinutes: Number(session.estimatedMinutes) || Math.round(total * minutesPer),
    active: session.status === 'ACTIVE',
    strategyType: session.strategyType || null,
    status: session.status || null,
  };
}

/**
 * Build dashboard summary from raw storage snapshots.
 *
 * @param {{
 *   mastery?: object|null,
 *   weakness?: object|null,
 *   plans?: object|null,
 *   strategies?: object|null,
 *   session?: object|null
 * }} stores
 * @returns {object}
 */
export function buildDashboardSummary(stores = {}) {
  const masteryDoc = stores.mastery || { patterns: [] };
  const weaknessDoc = stores.weakness || { patterns: [] };
  const plansDoc = stores.plans || { plans: [] };
  const strategiesDoc = stores.strategies || { strategies: [] };
  const session = stores.session || null;

  const masteryCounts = {
    MASTERED: 0,
    PROFICIENT: 0,
    PRACTICING: 0,
    LEARNING: 0,
    RETRY_REQUIRED: 0,
  };
  const masteryPatterns = Array.isArray(masteryDoc.patterns)
    ? masteryDoc.patterns
    : [];
  for (const entry of masteryPatterns) {
    const bucket = mapMasteryBucket(entry);
    if (masteryCounts[bucket] != null) masteryCounts[bucket] += 1;
  }

  const weaknessCounts = {
    LOW_ACCURACY: 0,
    REPEATED_MISS: 0,
    CALCULATION_ERROR: 0,
    CONCEPT_ERROR: 0,
    SLOW_RESPONSE: 0,
  };
  const weaknessPatterns = Array.isArray(weaknessDoc.patterns)
    ? weaknessDoc.patterns
    : [];
  for (const entry of weaknessPatterns) {
    const signals = Array.isArray(entry.activeSignals)
      ? entry.activeSignals
      : Array.isArray(entry.signals)
        ? entry.signals
        : Array.isArray(entry.weaknessSignals)
          ? entry.weaknessSignals
          : [];
    for (const s of signals) {
      if (s?.type && weaknessCounts[s.type] != null) {
        weaknessCounts[s.type] += 1;
      }
    }
  }

  const allPlans = Array.isArray(plansDoc.plans) ? plansDoc.plans : [];
  const todaysPlans = allPlans
    .filter((p) => p && ACTIVE_PLAN_STATUSES.has(p.status || 'GENERATED'))
    .slice()
    .sort(
      (a, b) =>
        (Number(b.priority) || 0) - (Number(a.priority) || 0) ||
        String(a.actionType || '').localeCompare(String(b.actionType || '')),
    )
    .map((p) => ({
      planId: p.planId || null,
      patternId: p.patternId || p.target || null,
      actionType: p.actionType || null,
      priority: Number(p.priority) || 0,
      attemptCount: Number(p.attemptCount) || 1,
      status: p.status || 'GENERATED',
    }));

  const allStrategies = Array.isArray(strategiesDoc.strategies)
    ? strategiesDoc.strategies
    : [];
  const todaysStrategies = allStrategies.map((s) => ({
    strategyId: s.strategyId || null,
    patternId: s.patternId || null,
    strategyType: s.strategyType || null,
    status: s.status || 'READY',
    createdAt: s.createdAt || null,
  }));

  const progress = calculateStudyProgress(session);

  return {
    schemaVersion: DASHBOARD_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    todayStudy: {
      activeSession: Boolean(progress.active && session),
      sessionId: session?.sessionId || null,
      remainingQuestions: progress.remaining,
      completedQuestions: progress.completed,
      estimatedMinutes: progress.estimatedMinutes,
      estimatedMinutesRemaining: progress.estimatedMinutesRemaining,
      strategyType: progress.strategyType || session?.strategyType || null,
      status: progress.status,
    },
    masterySummary: masteryCounts,
    masteryPatternCount: masteryPatterns.length,
    weaknessSummary: weaknessCounts,
    weaknessPatternCount: weaknessPatterns.length,
    todaysPlans,
    todaysStrategies,
    studySession: {
      session,
      progress,
    },
    storageKeys: {
      mastery: 'learning.mastery.v1',
      weakness: 'learning.weakness.v1',
      plan: 'learning.plan.v1',
      strategy: 'learning.strategy.v1',
      session: 'learning.session.v1',
    },
  };
}

/**
 * Load all learning stores and build dashboard summary.
 * @returns {{ ok: boolean, dashboard: object }}
 */
export function loadDashboard() {
  const mastery = getItem(
    STORAGE_KEYS.LEARNING_MASTERY_V1 || 'learning.mastery.v1',
    null,
  );
  const weakness = getItem(
    STORAGE_KEYS.LEARNING_WEAKNESS_V1 || 'learning.weakness.v1',
    null,
  );
  const plans = getItem(
    STORAGE_KEYS.LEARNING_PLAN_V1 || 'learning.plan.v1',
    null,
  );
  const strategies = getItem(
    STORAGE_KEYS.LEARNING_STRATEGY_V1 || 'learning.strategy.v1',
    null,
  );
  const session = getItem(
    STORAGE_KEYS.LEARNING_SESSION_V1 || 'learning.session.v1',
    null,
  );

  const dashboard = buildDashboardSummary({
    mastery,
    weakness,
    plans,
    strategies,
    session,
  });

  return { ok: true, dashboard };
}

export default {
  DASHBOARD_SCHEMA_VERSION,
  loadDashboard,
  buildDashboardSummary,
  calculateStudyProgress,
  mapMasteryBucket,
};
