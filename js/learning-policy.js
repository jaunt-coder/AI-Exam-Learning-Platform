/**
 * Sprint-10B — Learning Runtime Policy
 * Keep in sync with data/learning-policy.json
 * No AI / LLM. Thresholds must not be hardcoded in Mastery/Weakness/Plan services.
 */

/** @type {Readonly<object>} */
export const DEFAULT_LEARNING_POLICY = Object.freeze({
  schemaVersion: 'v1',
  sprint: 'Sprint-10B',
  description: 'Learning Runtime policy — mastery / weakness gating / plan dedupe',
  mastery: Object.freeze({
    learningMaxAttempts: 4,
    retryAccuracyBelow: 0.5,
    masteredMinAttempts: 8,
    masteredMinAccuracy: 0.85,
  }),
  weakness: Object.freeze({
    lowAccuracyMinAttempts: 3,
    lowAccuracyThreshold: 0.6,
    slowResponseMs: 120000,
    signalGates: Object.freeze({
      REPEATED_MISS: 2,
      CONCEPT_ERROR: 2,
      CALCULATION_ERROR: 2,
      LOW_ACCURACY: 3,
      SLOW_RESPONSE: 1,
    }),
  }),
  plan: Object.freeze({
    dedupeStatuses: Object.freeze(['GENERATED', 'ACTIVE']),
    defaultStatus: 'GENERATED',
  }),
});

let cachedPolicy = DEFAULT_LEARNING_POLICY;

/**
 * Normalize / merge partial policy with defaults.
 * @param {object|null|undefined} raw
 * @returns {object}
 */
export function normalizeLearningPolicy(raw) {
  const base = DEFAULT_LEARNING_POLICY;
  if (!raw || typeof raw !== 'object') {
    return {
      schemaVersion: base.schemaVersion,
      sprint: base.sprint,
      description: base.description,
      mastery: { ...base.mastery },
      weakness: {
        ...base.weakness,
        signalGates: { ...base.weakness.signalGates },
      },
      plan: {
        ...base.plan,
        dedupeStatuses: [...base.plan.dedupeStatuses],
      },
    };
  }

  const mastery = { ...base.mastery, ...(raw.mastery || {}) };
  const weaknessIn = raw.weakness || {};
  const weakness = {
    ...base.weakness,
    ...weaknessIn,
    signalGates: {
      ...base.weakness.signalGates,
      ...(weaknessIn.signalGates || {}),
    },
  };
  const planIn = raw.plan || {};
  const plan = {
    ...base.plan,
    ...planIn,
    dedupeStatuses: Array.isArray(planIn.dedupeStatuses)
      ? planIn.dedupeStatuses.slice()
      : [...base.plan.dedupeStatuses],
  };

  return {
    schemaVersion: raw.schemaVersion || base.schemaVersion,
    sprint: raw.sprint || base.sprint,
    description: raw.description || base.description,
    mastery,
    weakness,
    plan,
  };
}

/**
 * @returns {object}
 */
export function getLearningPolicy() {
  return cachedPolicy;
}

/**
 * Inject policy (tests / async hydrate). Does not mutate Question/Pattern/Master DB.
 * @param {object|null|undefined} policy
 * @returns {object}
 */
export function setLearningPolicy(policy) {
  cachedPolicy = normalizeLearningPolicy(policy);
  return cachedPolicy;
}

/**
 * Reset to built-in defaults (mirrors data/learning-policy.json).
 */
export function resetLearningPolicy() {
  cachedPolicy = normalizeLearningPolicy(DEFAULT_LEARNING_POLICY);
  return cachedPolicy;
}

/**
 * Load policy JSON from path (browser / runtime). Falls back to defaults on failure.
 * @param {string} [path]
 * @returns {Promise<object>}
 */
export async function loadLearningPolicyFromJson(
  path = 'data/learning-policy.json',
) {
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`policy_http_${res.status}`);
    const json = await res.json();
    return setLearningPolicy(json);
  } catch (_err) {
    return resetLearningPolicy();
  }
}

export default {
  DEFAULT_LEARNING_POLICY,
  getLearningPolicy,
  setLearningPolicy,
  resetLearningPolicy,
  normalizeLearningPolicy,
  loadLearningPolicyFromJson,
};
