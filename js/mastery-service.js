/**
 * Sprint-09K — Mastery Runtime Integration
 * Sprint-10B — Mastery thresholds from learning-policy (no hardcoded promotion).
 * Deterministic Pattern Mastery updates from Attempt events.
 * No AI recommendation. Does not mutate Question / Pattern / Evidence SoT.
 */

import { getItem, setItem, STORAGE_KEYS } from './storage.js';
import { getLearningPolicy } from './learning-policy.js';

export const MASTERY_STORE_KEY =
  STORAGE_KEYS.LEARNING_MASTERY_V1 || 'learning.mastery.v1';
export const MASTERY_SCHEMA_VERSION = 'v1';

/**
 * @param {number} attempts
 * @param {number|null} accuracy
 * @param {object} [policy]
 * @returns {'UNKNOWN'|'LEARNING'|'DEVELOPING'|'MASTERED'|'RETRY_REQUIRED'}
 */
export function computeMasteryLevel(attempts, accuracy, policy) {
  const mastery = (policy || getLearningPolicy()).mastery || {};
  const learningMax = Number(mastery.learningMaxAttempts) || 4;
  const retryBelow = Number(mastery.retryAccuracyBelow);
  const retryThreshold = Number.isFinite(retryBelow) ? retryBelow : 0.5;
  const masteredMinAttempts = Number(mastery.masteredMinAttempts) || 8;
  const masteredMinAccuracy = Number(mastery.masteredMinAccuracy);
  const masteredAcc = Number.isFinite(masteredMinAccuracy)
    ? masteredMinAccuracy
    : 0.85;

  const n = Number(attempts) || 0;
  if (n === 0) return 'UNKNOWN';
  if (n < learningMax) return 'LEARNING';

  const acc = typeof accuracy === 'number' ? accuracy : 0;
  if (acc < retryThreshold) return 'RETRY_REQUIRED';
  if (n >= masteredMinAttempts && acc >= masteredAcc) return 'MASTERED';
  if (acc < masteredAcc) return 'DEVELOPING';
  /* accuracy meets mastered bar but attempts below min */
  return 'DEVELOPING';
}

/**
 * @returns {{ version: string, patterns: object[], updatedAt?: string }}
 */
export function loadMasteryState() {
  const raw = getItem(MASTERY_STORE_KEY, null);
  if (!raw || typeof raw !== 'object') {
    return { version: MASTERY_SCHEMA_VERSION, patterns: [] };
  }
  const patterns = Array.isArray(raw.patterns) ? raw.patterns : [];
  return {
    version: raw.version || MASTERY_SCHEMA_VERSION,
    patterns,
    updatedAt: raw.updatedAt || null,
  };
}

/**
 * @param {{ version?: string, patterns: object[] }} state
 * @returns {boolean}
 */
export function saveMasteryState(state) {
  return setItem(MASTERY_STORE_KEY, {
    version: state?.version || MASTERY_SCHEMA_VERSION,
    patterns: Array.isArray(state?.patterns) ? state.patterns : [],
    updatedAt: new Date().toISOString(),
  });
}

/**
 * @param {object[]} patterns
 * @param {string} studentId
 * @param {string} patternId
 * @returns {object|null}
 */
function findEntry(patterns, studentId, patternId) {
  return (
    patterns.find(
      (p) => p && p.studentId === studentId && p.patternId === patternId,
    ) || null
  );
}

/**
 * Create empty patternMastery slot.
 * @param {string} studentId
 * @param {string} patternId
 */
export function createEmptyPatternMastery(studentId, patternId) {
  return {
    patternId,
    studentId,
    attempts: 0,
    correctCount: 0,
    incorrectCount: 0,
    accuracy: null,
    masteryLevel: 'UNKNOWN',
    lastAttemptAt: null,
    weaknessSignals: [],
  };
}

/**
 * Apply one attempt to a patternMastery object (pure).
 * @param {object} entry
 * @param {{ correct: boolean, timestamp?: string }} event
 * @returns {object}
 */
export function updatePatternMastery(entry, event = {}) {
  const next = {
    ...(entry || {}),
    weaknessSignals: Array.isArray(entry?.weaknessSignals)
      ? entry.weaknessSignals.slice()
      : [],
  };

  const correct = Boolean(event.correct);
  next.attempts = (Number(next.attempts) || 0) + 1;
  if (correct) {
    next.correctCount = (Number(next.correctCount) || 0) + 1;
  } else {
    next.incorrectCount = (Number(next.incorrectCount) || 0) + 1;
  }

  next.correctCount = Number(next.correctCount) || 0;
  next.incorrectCount = Number(next.incorrectCount) || 0;
  next.accuracy =
    next.attempts > 0 ? next.correctCount / next.attempts : null;
  next.masteryLevel = computeMasteryLevel(next.attempts, next.accuracy);
  next.lastAttemptAt = event.timestamp || new Date().toISOString();

  return next;
}

/**
 * Record an attempt into learning.mastery.v1.
 * @param {{
 *   questionId: string,
 *   patternId: string,
 *   correct: boolean,
 *   timestamp?: string,
 *   studentId?: string
 * }} event
 * @returns {{ ok: boolean, entry?: object, error?: string }}
 */
export function recordAttempt(event = {}) {
  const questionId = event.questionId;
  const patternId = event.patternId;
  const studentId = event.studentId || 'm1_demo_student';
  const timestamp = event.timestamp || new Date().toISOString();

  if (!questionId || !patternId) {
    return { ok: false, error: 'missing_question_or_pattern' };
  }

  const state = loadMasteryState();
  const patterns = state.patterns.slice();
  let entry = findEntry(patterns, studentId, patternId);
  if (!entry) {
    entry = createEmptyPatternMastery(studentId, patternId);
    patterns.push(entry);
  }

  const beforeLevel = entry.masteryLevel;
  const updated = updatePatternMastery(entry, {
    correct: Boolean(event.correct),
    timestamp,
  });

  const idx = patterns.findIndex(
    (p) => p && p.studentId === studentId && p.patternId === patternId,
  );
  if (idx >= 0) patterns[idx] = updated;
  else patterns.push(updated);

  const saved = saveMasteryState({
    version: MASTERY_SCHEMA_VERSION,
    patterns,
  });
  if (!saved) {
    return { ok: false, error: 'storage_write_failed' };
  }

  return {
    ok: true,
    entry: updated,
    questionId,
    beforeLevel,
    afterLevel: updated.masteryLevel,
  };
}

/**
 * @param {string} studentId
 * @param {string} patternId
 * @returns {object|null}
 */
export function getPatternMastery(studentId, patternId) {
  const state = loadMasteryState();
  return findEntry(state.patterns, studentId, patternId);
}

export default {
  MASTERY_STORE_KEY,
  MASTERY_SCHEMA_VERSION,
  computeMasteryLevel,
  loadMasteryState,
  saveMasteryState,
  createEmptyPatternMastery,
  updatePatternMastery,
  recordAttempt,
  getPatternMastery,
};
