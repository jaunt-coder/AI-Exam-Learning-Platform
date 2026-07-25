/**
 * Sprint-09L — Weakness Detection Layer
 * Deterministic signals from Pattern Mastery (+ optional attempt context).
 * No AI / LLM / recommendation.
 */

import { getItem, setItem, STORAGE_KEYS } from './storage.js';

export const WEAKNESS_STORE_KEY =
  STORAGE_KEYS.LEARNING_WEAKNESS_V1 || 'learning.weakness.v1';
export const WEAKNESS_SCHEMA_VERSION = 'v1';

/** @typedef {'LOW_ACCURACY'|'CALCULATION_ERROR'|'CONCEPT_ERROR'|'REPEATED_MISS'|'SLOW_RESPONSE'} WeaknessSignalType */
/** @typedef {'low'|'medium'|'high'} WeaknessSeverity */

export const SIGNAL_TYPES = Object.freeze([
  'LOW_ACCURACY',
  'CALCULATION_ERROR',
  'CONCEPT_ERROR',
  'REPEATED_MISS',
  'SLOW_RESPONSE',
]);

/** Policy thresholds (deterministic) */
export const WEAKNESS_POLICY = Object.freeze({
  lowAccuracyMinAttempts: 3,
  lowAccuracyThreshold: 0.6,
  repeatedMissMinIncorrect: 3,
  slowResponseMs: 120000,
});

/**
 * @param {string|null|undefined} patternId
 * @returns {'cost'|'concept'}
 */
export function resolveErrorDomain(patternId) {
  if (typeof patternId === 'string' && patternId.startsWith('COST_')) {
    return 'cost';
  }
  return 'concept';
}

/**
 * @param {number} attempts
 * @param {number|null} accuracy
 * @returns {WeaknessSeverity}
 */
function severityForAccuracy(attempts, accuracy) {
  if (accuracy == null) return 'low';
  if (accuracy < 0.4 || attempts >= 8) return 'high';
  if (accuracy < 0.6) return 'medium';
  return 'low';
}

/**
 * Detect weakness signals from a patternMastery snapshot.
 * Optional context: { lastCorrect?: boolean, durationMs?: number }
 *
 * @param {object} patternMastery
 * @param {{ lastCorrect?: boolean, durationMs?: number }} [context]
 * @returns {{ patternId: string, weaknessSignals: object[] }}
 */
export function detectWeakness(patternMastery = {}, context = {}) {
  const patternId = patternMastery.patternId || '';
  const attempts = Number(patternMastery.attempts) || 0;
  const incorrectCount = Number(patternMastery.incorrectCount) || 0;
  const accuracy =
    typeof patternMastery.accuracy === 'number' ? patternMastery.accuracy : null;

  /** @type {object[]} */
  const signals = [];

  if (
    attempts >= WEAKNESS_POLICY.lowAccuracyMinAttempts &&
    accuracy != null &&
    accuracy < WEAKNESS_POLICY.lowAccuracyThreshold
  ) {
    signals.push({
      type: 'LOW_ACCURACY',
      count: Math.max(1, incorrectCount),
      severity: severityForAccuracy(attempts, accuracy),
    });
  }

  if (incorrectCount >= WEAKNESS_POLICY.repeatedMissMinIncorrect) {
    signals.push({
      type: 'REPEATED_MISS',
      count: incorrectCount,
      severity:
        incorrectCount >= 5 ? 'high' : incorrectCount >= 3 ? 'medium' : 'low',
    });
  }

  /* Last attempt wrong → domain-typed miss (no LLM) */
  if (context.lastCorrect === false && patternId) {
    const domain = resolveErrorDomain(patternId);
    if (domain === 'cost') {
      signals.push({
        type: 'CALCULATION_ERROR',
        count: 1,
        severity: 'medium',
      });
    } else {
      signals.push({
        type: 'CONCEPT_ERROR',
        count: 1,
        severity: 'medium',
      });
    }
  }

  const durationMs = Number(context.durationMs);
  if (
    Number.isFinite(durationMs) &&
    durationMs >= WEAKNESS_POLICY.slowResponseMs
  ) {
    signals.push({
      type: 'SLOW_RESPONSE',
      count: 1,
      severity: durationMs >= WEAKNESS_POLICY.slowResponseMs * 2 ? 'high' : 'medium',
    });
  }

  return {
    patternId,
    weaknessSignals: signals,
  };
}

/**
 * Merge per-attempt domain miss counts into stored signals.
 * @param {object[]} existing
 * @param {object[]} incoming
 * @returns {object[]}
 */
export function mergeWeaknessSignals(existing = [], incoming = []) {
  const map = new Map();
  for (const s of existing || []) {
    if (!s?.type) continue;
    map.set(s.type, {
      type: s.type,
      count: Number(s.count) || 0,
      severity: s.severity || 'low',
    });
  }

  for (const s of incoming || []) {
    if (!s?.type) continue;
    const prev = map.get(s.type);
    if (!prev) {
      map.set(s.type, {
        type: s.type,
        count: Number(s.count) || 1,
        severity: s.severity || 'low',
      });
      continue;
    }

    /* Replace snapshot signals; accumulate typed miss counters */
    if (s.type === 'CALCULATION_ERROR' || s.type === 'CONCEPT_ERROR') {
      prev.count = (Number(prev.count) || 0) + (Number(s.count) || 1);
    } else {
      prev.count = Number(s.count) || prev.count;
    }
    prev.severity = pickHigherSeverity(prev.severity, s.severity);
    map.set(s.type, prev);
  }

  /* Drop domain miss types that are not in incoming and are snapshot-only? keep accumulated */
  /* Refresh LOW_ACCURACY / REPEATED_MISS / SLOW from incoming when present */
  for (const type of ['LOW_ACCURACY', 'REPEATED_MISS', 'SLOW_RESPONSE']) {
    const inc = (incoming || []).find((x) => x.type === type);
    if (!inc) {
      /* recompute clears: remove if not in incoming snapshot */
      map.delete(type);
    }
  }
  for (const s of incoming || []) {
    if (
      s?.type === 'LOW_ACCURACY' ||
      s?.type === 'REPEATED_MISS' ||
      s?.type === 'SLOW_RESPONSE'
    ) {
      map.set(s.type, {
        type: s.type,
        count: Number(s.count) || 1,
        severity: s.severity || 'low',
      });
    }
  }

  return [...map.values()].sort((a, b) => a.type.localeCompare(b.type));
}

/**
 * @param {string} a
 * @param {string} b
 */
function pickHigherSeverity(a, b) {
  const rank = { low: 1, medium: 2, high: 3 };
  const ra = rank[a] || 0;
  const rb = rank[b] || 0;
  if (rb >= ra) return b || a || 'low';
  return a || 'low';
}

/**
 * @returns {{ version: string, patterns: object[], updatedAt?: string|null }}
 */
export function loadWeaknessState() {
  const raw = getItem(WEAKNESS_STORE_KEY, null);
  if (!raw || typeof raw !== 'object') {
    return { version: WEAKNESS_SCHEMA_VERSION, patterns: [] };
  }
  return {
    version: raw.version || WEAKNESS_SCHEMA_VERSION,
    patterns: Array.isArray(raw.patterns) ? raw.patterns : [],
    updatedAt: raw.updatedAt || null,
  };
}

/**
 * @param {{ version?: string, patterns: object[] }} state
 */
export function saveWeaknessState(state) {
  return setItem(WEAKNESS_STORE_KEY, {
    version: state?.version || WEAKNESS_SCHEMA_VERSION,
    patterns: Array.isArray(state?.patterns) ? state.patterns : [],
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Detect + persist weakness for a mastery entry after an attempt.
 *
 * @param {{
 *   studentId?: string,
 *   patternMastery: object,
 *   lastCorrect?: boolean,
 *   durationMs?: number
 * }} input
 * @returns {{ ok: boolean, diagnosis?: object, error?: string }}
 */
export function recordWeaknessDiagnosis(input = {}) {
  const mastery = input.patternMastery;
  if (!mastery?.patternId) {
    return { ok: false, error: 'missing_pattern_mastery' };
  }

  const studentId = input.studentId || mastery.studentId || 'm1_demo_student';
  const detected = detectWeakness(mastery, {
    lastCorrect: input.lastCorrect,
    durationMs: input.durationMs,
  });

  const state = loadWeaknessState();
  const patterns = state.patterns.slice();
  const idx = patterns.findIndex(
    (p) => p && p.studentId === studentId && p.patternId === mastery.patternId,
  );
  const prev = idx >= 0 ? patterns[idx] : null;
  const mergedSignals = mergeWeaknessSignals(
    prev?.signals || [],
    detected.weaknessSignals,
  );

  const entry = {
    patternId: mastery.patternId,
    studentId,
    signals: mergedSignals,
    updatedAt: new Date().toISOString(),
  };

  if (idx >= 0) patterns[idx] = entry;
  else patterns.push(entry);

  const saved = saveWeaknessState({
    version: WEAKNESS_SCHEMA_VERSION,
    patterns,
  });
  if (!saved) return { ok: false, error: 'storage_write_failed' };

  return {
    ok: true,
    diagnosis: {
      patternId: mastery.patternId,
      weaknessSignals: mergedSignals,
    },
    entry,
  };
}

export default {
  WEAKNESS_STORE_KEY,
  WEAKNESS_SCHEMA_VERSION,
  SIGNAL_TYPES,
  WEAKNESS_POLICY,
  resolveErrorDomain,
  detectWeakness,
  mergeWeaknessSignals,
  loadWeaknessState,
  saveWeaknessState,
  recordWeaknessDiagnosis,
};
