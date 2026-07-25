/**
 * Sprint-09M — Learning Plan Contract Foundation
 * Sprint-10B — Plan dedupe (patternId + actionType + active status).
 * Deterministic Weakness → Learning Plan mapping.
 * No AI / LLM / recommendation model.
 */

import { getItem, setItem, STORAGE_KEYS } from './storage.js';
import { getLearningPolicy } from './learning-policy.js';

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
 * Active statuses used for dedupe (from policy).
 * @returns {string[]}
 */
export function getPlanDedupeStatuses() {
  const statuses = getLearningPolicy().plan?.dedupeStatuses;
  return Array.isArray(statuses) && statuses.length
    ? statuses.slice()
    : ['GENERATED', 'ACTIVE'];
}

/**
 * Find existing active plan for patternId + actionType.
 * @param {object[]} plans
 * @param {string} patternId
 * @param {string} actionType
 * @returns {object|null}
 */
export function findActivePlan(plans, patternId, actionType) {
  const active = new Set(getPlanDedupeStatuses());
  return (
    (plans || []).find(
      (p) =>
        p &&
        p.patternId === patternId &&
        p.actionType === actionType &&
        active.has(p.status),
    ) || null
  );
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

  const status =
    getLearningPolicy().plan?.defaultStatus || 'GENERATED';
  const now = new Date().toISOString();

  return {
    planId: createPlanId(patternId, signal.type),
    patternId,
    weaknessSignal: signal.type,
    priority: priorityFromSeverity(signal.severity),
    actionType,
    target: patternId,
    status,
    signalCount: Number(signal.count) || 1,
    attemptCount: 1,
    lastSeen: now,
    createdAt: now,
  };
}

/**
 * Create learning plan(s) from weakness diagnosis (pure; no storage).
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
  const seenActions = new Set();
  for (const signal of signals) {
    const plan = buildPlanFromSignal(patternId, signal);
    if (!plan) continue;
    /* same actionType from multiple signals → one candidate plan */
    if (seenActions.has(plan.actionType)) {
      const prev = plans.find((p) => p.actionType === plan.actionType);
      if (prev && plan.priority > prev.priority) {
        prev.priority = plan.priority;
        prev.weaknessSignal = plan.weaknessSignal;
        prev.signalCount = plan.signalCount;
      }
      continue;
    }
    seenActions.add(plan.actionType);
    plans.push(plan);
  }

  if (!plans.length) {
    return { ok: true, plan: null, plans: [], skipped: true };
  }

  plans.sort(
    (a, b) =>
      b.priority - a.priority || a.actionType.localeCompare(b.actionType),
  );
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
 * Upsert plans with dedupe: same patternId + actionType + active status
 * → update attemptCount / priority / lastSeen only (no new plan).
 *
 * @param {{ weaknessDiagnosis: object, studentId?: string }} input
 * @returns {{
 *   ok: boolean,
 *   plan?: object|null,
 *   plans?: object[],
 *   createdPlans?: object[],
 *   updatedPlans?: object[],
 *   skipped?: boolean,
 *   error?: string,
 *   totalStored?: number
 * }}
 */
export function recordLearningPlansFromWeakness(input = {}) {
  const created = createLearningPlanFromWeakness(input);
  if (!created.ok) return created;
  if (created.skipped || !created.plans?.length) {
    return {
      ok: true,
      plan: null,
      plans: [],
      createdPlans: [],
      updatedPlans: [],
      skipped: true,
    };
  }

  const doc = loadLearningPlans();
  const nextPlans = doc.plans.slice();
  const createdPlans = [];
  const updatedPlans = [];
  const now = new Date().toISOString();

  for (const candidate of created.plans) {
    const existing = findActivePlan(
      nextPlans,
      candidate.patternId,
      candidate.actionType,
    );
    if (existing) {
      existing.attemptCount = (Number(existing.attemptCount) || 1) + 1;
      existing.priority = Math.max(
        Number(existing.priority) || 0,
        Number(candidate.priority) || 0,
      );
      existing.lastSeen = now;
      if (
        (Number(candidate.signalCount) || 0) >
        (Number(existing.signalCount) || 0)
      ) {
        existing.signalCount = candidate.signalCount;
      }
      updatedPlans.push(existing);
      continue;
    }
    nextPlans.push(candidate);
    createdPlans.push(candidate);
  }

  if (!createdPlans.length && !updatedPlans.length) {
    return {
      ok: true,
      plan: null,
      plans: [],
      createdPlans: [],
      updatedPlans: [],
      skipped: true,
    };
  }

  const saved = saveLearningPlans({
    schemaVersion: PLAN_SCHEMA_VERSION,
    plans: nextPlans,
  });
  if (!saved) {
    return { ok: false, plan: null, plans: [], error: 'storage_write_failed' };
  }

  const touched = createdPlans.concat(updatedPlans).sort(
    (a, b) =>
      (Number(b.priority) || 0) - (Number(a.priority) || 0) ||
      String(a.actionType).localeCompare(String(b.actionType)),
  );

  return {
    ok: true,
    plan: touched[0] || null,
    /* Only newly created plans flow to Strategy (prevent strategy spam) */
    plans: createdPlans,
    createdPlans,
    updatedPlans,
    skipped: createdPlans.length === 0 && updatedPlans.length === 0,
    deduped: updatedPlans.length > 0,
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
  findActivePlan,
  getPlanDedupeStatuses,
  loadLearningPlans,
  saveLearningPlans,
};
