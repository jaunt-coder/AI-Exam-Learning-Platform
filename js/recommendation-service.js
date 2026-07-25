/**
 * Sprint-10G — Recommendation Engine v1
 * Explainable, deterministic recommendations from Learning Strategy (+ weakness reason).
 * Reads Strategy / Plan / Weakness. Does not mutate Mastery / Plan / Strategy / Session / Selector / DBs.
 */

import { getItem, setItem, STORAGE_KEYS } from './storage.js';
import { loadStrategies } from './learning-strategy-service.js';

export const RECOMMENDATION_STORE_KEY =
  STORAGE_KEYS.LEARNING_RECOMMENDATION_V1 || 'learning.recommendation.v1';
export const RECOMMENDATION_SCHEMA_VERSION = 'v1';

/** Lower number = higher priority */
export const REASON_PRIORITY = Object.freeze({
  REPEATED_MISS: 1,
  LOW_ACCURACY: 2,
  CALCULATION_ERROR: 3,
  CONCEPT_ERROR: 4,
  SLOW_RESPONSE: 5,
});

export const REASON_COPY = Object.freeze({
  REPEATED_MISS: '최근 동일 Pattern을 반복해서 틀렸습니다.',
  LOW_ACCURACY: '최근 정확도가 기준 이하입니다.',
  CALCULATION_ERROR: '계산 실수가 반복됩니다.',
  CONCEPT_ERROR: '개념 복습이 필요합니다.',
  SLOW_RESPONSE: '풀이 시간이 길어졌습니다.',
});

export const ESTIMATED_MINUTES = Object.freeze({
  PATTERN_RETRY_SET: 15,
  CONCEPT_REVIEW_SET: 20,
  CALC_DRILL_SET: 25,
  TIMED_PRACTICE: 30,
});

export const STRATEGY_TO_ACTION = Object.freeze({
  PATTERN_RETRY_SET: 'RETRY_PATTERN',
  CONCEPT_REVIEW_SET: 'REVIEW_CONCEPT',
  CALC_DRILL_SET: 'PRACTICE_CALCULATION',
  TIMED_PRACTICE: 'MOCK_TEST',
});

export const STRATEGY_DEFAULT_REASON = Object.freeze({
  PATTERN_RETRY_SET: 'LOW_ACCURACY',
  CONCEPT_REVIEW_SET: 'CONCEPT_ERROR',
  CALC_DRILL_SET: 'CALCULATION_ERROR',
  TIMED_PRACTICE: 'SLOW_RESPONSE',
});

/**
 * @param {string} reasonCode
 * @returns {string}
 */
export function buildRecommendationReason(reasonCode) {
  return REASON_COPY[reasonCode] || '학습 전략에 따른 추천입니다.';
}

/**
 * @param {string} strategyType
 * @returns {number}
 */
export function estimatedMinutesForStrategy(strategyType) {
  return ESTIMATED_MINUTES[strategyType] || 20;
}

/**
 * Resolve reasonCode from strategy / plan / weakness signals.
 * @param {object} strategy
 * @param {object[]} [plans]
 * @param {object|null} [weaknessDiagnosis]
 * @returns {string}
 */
export function resolveReasonCode(strategy = {}, plans = [], weaknessDiagnosis = null) {
  const fromStrategy = strategy.reason || strategy.weaknessSignal || strategy.reasonCode;
  if (fromStrategy && REASON_PRIORITY[fromStrategy] != null) {
    return fromStrategy;
  }

  const patternId = strategy.patternId;
  const linkedPlan = (plans || []).find(
    (p) =>
      p &&
      p.patternId === patternId &&
      (p.actionType === STRATEGY_TO_ACTION[strategy.strategyType] ||
        !strategy.strategyType),
  );
  if (linkedPlan?.weaknessSignal && REASON_PRIORITY[linkedPlan.weaknessSignal] != null) {
    return linkedPlan.weaknessSignal;
  }

  const signals = Array.isArray(weaknessDiagnosis?.weaknessSignals)
    ? weaknessDiagnosis.weaknessSignals
    : Array.isArray(weaknessDiagnosis?.signals)
      ? weaknessDiagnosis.signals
      : [];
  if (signals.length && (!patternId || weaknessDiagnosis?.patternId === patternId)) {
    const ordered = signals
      .map((s) => s?.type)
      .filter((t) => REASON_PRIORITY[t] != null)
      .sort((a, b) => REASON_PRIORITY[a] - REASON_PRIORITY[b]);
    if (ordered[0]) return ordered[0];
  }

  return (
    STRATEGY_DEFAULT_REASON[strategy.strategyType] || 'LOW_ACCURACY'
  );
}

/**
 * Deterministic recommendation id (no Math.random).
 * @param {string} patternId
 * @param {string} strategyType
 * @param {string} reasonCode
 */
export function createRecommendationId(patternId, strategyType, reasonCode) {
  return `rec_${patternId || 'NA'}_${strategyType || 'NA'}_${reasonCode || 'NA'}`;
}

/**
 * Build recommendation objects from strategies.
 *
 * @param {{
 *   strategies?: object[],
 *   plans?: object[],
 *   weaknessDiagnosis?: object|null,
 *   createdAt?: string,
 * }} [input]
 * @returns {object[]}
 */
export function buildRecommendations(input = {}) {
  const strategies = Array.isArray(input.strategies)
    ? input.strategies
    : loadStrategies().strategies || [];
  const plans = Array.isArray(input.plans) ? input.plans : [];
  const createdAt = input.createdAt || new Date().toISOString();

  const out = [];
  const seen = new Set();

  for (const strategy of strategies) {
    if (!strategy?.strategyType || !strategy?.patternId) continue;
    const reasonCode = resolveReasonCode(
      strategy,
      plans,
      input.weaknessDiagnosis || null,
    );
    const recommendationId = createRecommendationId(
      strategy.patternId,
      strategy.strategyType,
      reasonCode,
    );
    if (seen.has(recommendationId)) continue;
    seen.add(recommendationId);

    out.push({
      recommendationId,
      patternId: strategy.patternId,
      strategyType: strategy.strategyType,
      actionType: STRATEGY_TO_ACTION[strategy.strategyType] || null,
      priority: REASON_PRIORITY[reasonCode] || 99,
      reason: buildRecommendationReason(reasonCode),
      reasonCode,
      estimatedMinutes: estimatedMinutesForStrategy(strategy.strategyType),
      createdAt,
      status: 'ACTIVE',
      sourceStrategyId: strategy.strategyId || null,
    });
  }

  return out;
}

/**
 * Rank: priority ASC → estimatedMinutes ASC → patternId ASC
 * @param {object[]} recommendations
 * @returns {object[]}
 */
export function rankRecommendations(recommendations = []) {
  return (recommendations || []).slice().sort(
    (a, b) =>
      (Number(a.priority) || 99) - (Number(b.priority) || 99) ||
      (Number(a.estimatedMinutes) || 0) - (Number(b.estimatedMinutes) || 0) ||
      String(a.patternId || '').localeCompare(String(b.patternId || '')) ||
      String(a.recommendationId || '').localeCompare(
        String(b.recommendationId || ''),
      ),
  );
}

/**
 * @returns {{ schemaVersion: string, recommendations: object[], updatedAt?: string|null }}
 */
export function loadRecommendations() {
  const raw = getItem(RECOMMENDATION_STORE_KEY, null);
  if (!raw || typeof raw !== 'object') {
    return { schemaVersion: RECOMMENDATION_SCHEMA_VERSION, recommendations: [] };
  }
  return {
    schemaVersion: raw.schemaVersion || RECOMMENDATION_SCHEMA_VERSION,
    recommendations: Array.isArray(raw.recommendations)
      ? raw.recommendations
      : [],
    updatedAt: raw.updatedAt || null,
  };
}

/**
 * @param {{ schemaVersion?: string, recommendations: object[] }} doc
 */
export function saveRecommendations(doc) {
  return setItem(RECOMMENDATION_STORE_KEY, {
    schemaVersion: doc?.schemaVersion || RECOMMENDATION_SCHEMA_VERSION,
    recommendations: Array.isArray(doc?.recommendations)
      ? doc.recommendations
      : [],
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Dashboard / API summary projection.
 * @param {object[]} [recommendations]
 */
export function buildRecommendationSummary(recommendations) {
  const list = Array.isArray(recommendations)
    ? recommendations
    : loadRecommendations().recommendations;
  const active = list.filter((r) => r && r.status === 'ACTIVE');
  const ranked = rankRecommendations(active);
  const estimatedMinutes = active.reduce(
    (sum, r) => sum + (Number(r.estimatedMinutes) || 0),
    0,
  );
  return {
    total: list.length,
    active: active.length,
    estimatedMinutes,
    highestPriority: ranked[0] || null,
    recommendations: ranked,
  };
}

/**
 * Build + rank + persist Today's Recommendation.
 *
 * @param {{
 *   studentId?: string,
 *   strategies?: object[],
 *   plans?: object[],
 *   weaknessDiagnosis?: object|null,
 *   createdAt?: string,
 * }} [input]
 * @returns {{
 *   ok: boolean,
 *   recommendation: object|null,
 *   recommendations: object[],
 *   summary: object,
 *   skipped?: boolean,
 *   error?: string
 * }}
 */
export function buildTodayRecommendation(input = {}) {
  const built = buildRecommendations(input);
  if (!built.length) {
    return {
      ok: true,
      recommendation: null,
      recommendations: [],
      summary: buildRecommendationSummary([]),
      skipped: true,
    };
  }

  const ranked = rankRecommendations(built);
  const saved = saveRecommendations({
    schemaVersion: RECOMMENDATION_SCHEMA_VERSION,
    recommendations: ranked,
  });
  if (!saved) {
    return {
      ok: false,
      recommendation: null,
      recommendations: [],
      summary: buildRecommendationSummary([]),
      error: 'storage_write_failed',
    };
  }

  const summary = buildRecommendationSummary(ranked);
  return {
    ok: true,
    recommendation: ranked[0],
    recommendations: ranked,
    summary,
    skipped: false,
  };
}

export default {
  RECOMMENDATION_STORE_KEY,
  RECOMMENDATION_SCHEMA_VERSION,
  REASON_PRIORITY,
  REASON_COPY,
  ESTIMATED_MINUTES,
  buildRecommendations,
  buildRecommendationReason,
  rankRecommendations,
  buildTodayRecommendation,
  buildRecommendationSummary,
  loadRecommendations,
  saveRecommendations,
};
