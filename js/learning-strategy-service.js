/**
 * Sprint-09N — Learning Strategy Resolver Foundation
 * Deterministic Learning Plan → Strategy mapping.
 * No AI / LLM / question auto-selection.
 */

import { getItem, setItem, STORAGE_KEYS } from './storage.js';

export const STRATEGY_STORE_KEY =
  STORAGE_KEYS.LEARNING_STRATEGY_V1 || 'learning.strategy.v1';
export const STRATEGY_SCHEMA_VERSION = 'v1';

export const STRATEGY_TYPES = Object.freeze([
  'PATTERN_RETRY_SET',
  'CONCEPT_REVIEW_SET',
  'CALC_DRILL_SET',
  'TIMED_PRACTICE',
]);

/** actionType → strategy payload (deterministic) */
export const ACTION_TO_STRATEGY = Object.freeze({
  RETRY_PATTERN: {
    strategyType: 'PATTERN_RETRY_SET',
    nextAction: 'SOLVE_PATTERN_SET',
    questionCount: 5,
    reviewAfterDays: 3,
  },
  REVIEW_CONCEPT: {
    strategyType: 'CONCEPT_REVIEW_SET',
    nextAction: 'REVIEW_CONCEPT_CARD',
    questionCount: 3,
    reviewAfterDays: 2,
  },
  PRACTICE_CALCULATION: {
    strategyType: 'CALC_DRILL_SET',
    nextAction: 'SOLVE_CALCULATION_DRILL',
    questionCount: 5,
    reviewAfterDays: 3,
  },
  MOCK_TEST: {
    strategyType: 'TIMED_PRACTICE',
    nextAction: 'MINI_TEST',
    questionCount: 10,
    reviewAfterDays: 7,
  },
});

/**
 * @returns {string}
 */
export function createStrategyId(patternId, strategyType) {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return `strat_${patternId || 'NA'}_${strategyType}_${t}_${r}`;
}

/**
 * Resolve execution strategy from a Learning Plan.
 *
 * @param {{
 *   planId?: string,
 *   patternId?: string,
 *   actionType?: string,
 *   priority?: number,
 *   reason?: string,
 *   weaknessSignal?: string
 * }} plan
 * @returns {{
 *   strategyId: string,
 *   patternId: string,
 *   sourcePlanId: string|null,
 *   strategyType: string,
 *   nextAction: string,
 *   questionCount: number,
 *   reviewAfterDays: number,
 *   priority?: number,
 *   reason?: string|null,
 *   createdAt: string
 * }|null}
 */
export function resolveStrategyFromPlan(plan = {}) {
  const actionType = plan.actionType;
  const mapping = ACTION_TO_STRATEGY[actionType];
  if (!mapping) return null;

  const patternId = plan.patternId || plan.target || '';
  if (!patternId) return null;

  return {
    strategyId: createStrategyId(patternId, mapping.strategyType),
    patternId,
    sourcePlanId: plan.planId || null,
    strategyType: mapping.strategyType,
    nextAction: mapping.nextAction,
    questionCount: mapping.questionCount,
    reviewAfterDays: mapping.reviewAfterDays,
    priority: Number(plan.priority) || 1,
    reason: plan.reason || plan.weaknessSignal || null,
    createdAt: new Date().toISOString(),
  };
}

/**
 * @returns {{ schemaVersion: string, strategies: object[], updatedAt?: string|null }}
 */
export function loadStrategies() {
  const raw = getItem(STRATEGY_STORE_KEY, null);
  if (!raw || typeof raw !== 'object') {
    return { schemaVersion: STRATEGY_SCHEMA_VERSION, strategies: [] };
  }
  return {
    schemaVersion: raw.schemaVersion || STRATEGY_SCHEMA_VERSION,
    strategies: Array.isArray(raw.strategies) ? raw.strategies : [],
    updatedAt: raw.updatedAt || null,
  };
}

/**
 * @param {{ schemaVersion?: string, strategies: object[] }} doc
 */
export function saveStrategies(doc) {
  return setItem(STRATEGY_STORE_KEY, {
    schemaVersion: doc?.schemaVersion || STRATEGY_SCHEMA_VERSION,
    strategies: Array.isArray(doc?.strategies) ? doc.strategies : [],
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Persist one strategy to learning.strategy.v1.
 * @param {object} strategy
 * @returns {{ ok: boolean, strategy?: object, error?: string }}
 */
export function recordStrategy(strategy) {
  if (!strategy?.strategyId || !strategy?.patternId || !strategy?.strategyType) {
    return { ok: false, error: 'invalid_strategy' };
  }
  const doc = loadStrategies();
  const strategies = doc.strategies.concat([
    {
      strategyId: strategy.strategyId,
      patternId: strategy.patternId,
      sourcePlanId: strategy.sourcePlanId || null,
      strategyType: strategy.strategyType,
      nextAction: strategy.nextAction,
      questionCount: strategy.questionCount,
      reviewAfterDays: strategy.reviewAfterDays,
      priority: strategy.priority,
      reason: strategy.reason || null,
      createdAt: strategy.createdAt || new Date().toISOString(),
    },
  ]);
  const saved = saveStrategies({
    schemaVersion: STRATEGY_SCHEMA_VERSION,
    strategies,
  });
  if (!saved) return { ok: false, error: 'storage_write_failed' };
  return { ok: true, strategy: strategies[strategies.length - 1], totalStored: strategies.length };
}

/**
 * Resolve + persist strategies from Learning Plan list.
 * Skips when no plans (no unnecessary strategy).
 *
 * @param {{ plans?: object[], plan?: object|null, studentId?: string }} input
 * @returns {{
 *   ok: boolean,
 *   strategy: object|null,
 *   strategies: object[],
 *   skipped?: boolean,
 *   error?: string
 * }}
 */
export function recordStrategiesFromPlans(input = {}) {
  const plans = Array.isArray(input.plans)
    ? input.plans
    : input.plan
      ? [input.plan]
      : [];

  if (!plans.length) {
    return { ok: true, strategy: null, strategies: [], skipped: true };
  }

  const created = [];
  for (const plan of plans) {
    const strategy = resolveStrategyFromPlan(plan);
    if (!strategy) continue;
    const recorded = recordStrategy(strategy);
    if (!recorded.ok) {
      return {
        ok: false,
        strategy: null,
        strategies: created,
        error: recorded.error,
      };
    }
    created.push(recorded.strategy);
  }

  if (!created.length) {
    return { ok: true, strategy: null, strategies: [], skipped: true };
  }

  created.sort(
    (a, b) =>
      (Number(b.priority) || 0) - (Number(a.priority) || 0) ||
      String(a.strategyType).localeCompare(String(b.strategyType)),
  );

  return {
    ok: true,
    strategy: created[0],
    strategies: created,
    skipped: false,
  };
}

export default {
  STRATEGY_STORE_KEY,
  STRATEGY_SCHEMA_VERSION,
  STRATEGY_TYPES,
  ACTION_TO_STRATEGY,
  resolveStrategyFromPlan,
  recordStrategy,
  recordStrategiesFromPlans,
  loadStrategies,
  saveStrategies,
};
