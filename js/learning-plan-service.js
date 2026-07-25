/**
 * Sprint-09M — Learning Plan Contract Foundation
 * Deterministic Weakness → Learning Plan mapping.
 * No AI / LLM / recommendation model.
 */

import { getItem, setItem, STORAGE_KEYS } from './storage.js';

export const PLAN_STORE_KEY =
  STORAGE_KEYS.LEARNING_PLAN_V1 || 'learning.plan.v1';
export const PLAN_SCHEMA_VERSION = 'v1';

export const ACTION_TYPES = Object.freeze([
  'REVIEW_CONCEPT',
  'RETRY_PATTERN',
  'PRACTICE_CALCULATION',
  'MEMORIZE_RULE',
  'MOCK_TEST',
]);

export const PLAN_STATUSES = Object.freeze([
  'GENERATED',
  'ACTIVE',
  'COMPLETED',
]);

/** Weakness signal → actionType (deterministic) */
export const SIGNAL_TO_ACTION = Object.freeze({
  LOW_ACCURACY: 'RETRY_PATTERN',
  REPEATED_MISS: 'REVIEW_CONCEPT',
  CALCULATION_ERROR: 'PRACTICE_CALCULATION',
  CONCEPT_ERROR: 'REVIEW_CONCEPT',
  SLOW_RESPONSE: 'MOCK_TEST',
});

const SEVERITY_PRIORITY = Object.freeze({
  high: 3,
  medium: 2,
  low: 1,
});

/**
 * @param {string} signalType
 * @returns {string|null}
 */
export function mapSignalToAction(signalType) {
  return SIGNAL_TO_ACTION[signalType] || null;
}

/**
 * @param {string} severity
 * @returns {number}
 */
export function priorityFromSeverity(severity) {
  return SEVERITY_PRIORITY[severity] || 1;
}

/**
 * @returns {string}
 */
export function createPlanId(patternId, signalType) {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return `plan_${patternId}_${signalType}_${t}_${r}`;
}

/**
 * Build one plan from a single weakness signal.
 * @param {string} patternId
 * @param {{ type: string, count?: number, severity?: string }} signal
 * @returns {object|null}
 */
export function buildPlanFromSignal(patternId, signal) {
  if (!patternId || !signal?.type) return null;
  const actionType = mapSignalToAction(signal.type);
  if (!actionType) return null;

  return {
    planId: createPlanId(patternId, signal.type),
    patternId,
    weaknessSignal: signal.type,
    priority: priorityFromSeverity(signal.severity),
    actionType,
    target: patternId,
    status: 'GENERATED',
    signalCount: Number(signal.count) || 1,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Create learning plan(s) from weakness diagnosis.
 * Returns the highest-priority plan as primary `plan`.
 * Skips when no weakness signals (no unnecessary plan).
 *
 * @param {{ weaknessDiagnosis?: object, patternId?: string, weaknessSignals?: object[] }} input
 * @returns {{
 *   ok: boolean,
 *   plan: object|null,
 *   plans: object[],
 *   skipped?: boolean,
 *   error?: string
 * }}
 */
export function createLearningPlanFromWeakness(input = {}) {
  const diagnosis = input.weaknessDiagnosis || input;
  const patternId = diagnosis.patternId || input.patternId;
  const signals = Array.isArray(diagnosis.weaknessSignals)
    ? diagnosis.weaknessSignals
    : Array.isArray(diagnosis.signals)
      ? diagnosis.signals
      : Array.isArray(input.weaknessSignals)
        ? input.weaknessSignals
        : [];

  if (!patternId) {
    return { ok: false, plan: null, plans: [], error: 'missing_pattern_id' };
  }

  if (!signals.length) {
    return { ok: true, plan: null, plans: [], skipped: true };
  }

  const plans = [];
  for (const signal of signals) {
    const plan = buildPlanFromSignal(patternId, signal);
    if (plan) plans.push(plan);
  }

  if (!plans.length) {
    return { ok: true, plan: null, plans: [], skipped: true };
  }

  plans.sort((a, b) => b.priority - a.priority || a.actionType.localeCompare(b.actionType));
  return {
    ok: true,
    plan: plans[0],
    plans,
    skipped: false,
  };
}

/**
 * @returns {{ schemaVersion: string, plans: object[], updatedAt?: string|null }}
 */
export function loadLearningPlans() {
  const raw = getItem(PLAN_STORE_KEY, null);
  if (!raw || typeof raw !== 'object') {
    return { schemaVersion: PLAN_SCHEMA_VERSION, plans: [] };
  }
  return {
    schemaVersion: raw.schemaVersion || PLAN_SCHEMA_VERSION,
    plans: Array.isArray(raw.plans) ? raw.plans : [],
    updatedAt: raw.updatedAt || null,
  };
}

/**
 * @param {{ schemaVersion?: string, plans: object[] }} doc
 */
export function saveLearningPlans(doc) {
  return setItem(PLAN_STORE_KEY, {
    schemaVersion: doc?.schemaVersion || PLAN_SCHEMA_VERSION,
    plans: Array.isArray(doc?.plans) ? doc.plans : [],
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Detect plans from weakness and append to learning.plan.v1.
 * @param {{ weaknessDiagnosis: object, studentId?: string }} input
 * @returns {{ ok: boolean, plan?: object|null, plans?: object[], skipped?: boolean, error?: string }}
 */
export function recordLearningPlansFromWeakness(input = {}) {
  const created = createLearningPlanFromWeakness(input);
  if (!created.ok) return created;
  if (created.skipped || !created.plans?.length) {
    return { ok: true, plan: null, plans: [], skipped: true };
  }

  const doc = loadLearningPlans();
  const nextPlans = doc.plans.concat(created.plans);
  const saved = saveLearningPlans({
    schemaVersion: PLAN_SCHEMA_VERSION,
    plans: nextPlans,
  });
  if (!saved) {
    return { ok: false, plan: null, plans: [], error: 'storage_write_failed' };
  }

  return {
    ok: true,
    plan: created.plan,
    plans: created.plans,
    skipped: false,
    totalStored: nextPlans.length,
  };
}

export default {
  PLAN_STORE_KEY,
  PLAN_SCHEMA_VERSION,
  ACTION_TYPES,
  PLAN_STATUSES,
  SIGNAL_TO_ACTION,
  mapSignalToAction,
  createLearningPlanFromWeakness,
  recordLearningPlansFromWeakness,
  loadLearningPlans,
  saveLearningPlans,
};
