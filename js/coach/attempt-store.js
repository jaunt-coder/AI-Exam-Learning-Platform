/**
 * QuestionAttempt LocalStorage store (Coach Phase C1)
 * Key: questionAttempts — additive.
 */

import { getItem, setItem, STORAGE_KEYS } from '../storage.js';
import { createQuestionAttempt, validateQuestionAttempt } from './models.js';

const KEY = STORAGE_KEYS.QUESTION_ATTEMPTS;

/**
 * @returns {{ version: number, attempts: object[] }}
 */
function emptyStore() {
  return { version: 1, attempts: [] };
}

/**
 * @returns {{ version: number, attempts: object[] }}
 */
export function loadAttemptStore() {
  const raw = getItem(KEY, null);
  if (!raw || !Array.isArray(raw.attempts)) {
    return emptyStore();
  }
  return {
    version: Number(raw.version) || 1,
    attempts: raw.attempts.map((item) => createQuestionAttempt(item)),
  };
}

/**
 * @param {{ version?: number, attempts: object[] }} store
 * @returns {boolean}
 */
function persist(store) {
  return setItem(KEY, {
    version: store.version || 1,
    attempts: store.attempts,
  });
}

/**
 * @returns {object[]}
 */
export function listQuestionAttempts() {
  return loadAttemptStore().attempts;
}

/**
 * @param {string} userId
 * @returns {object[]}
 */
export function listAttemptsByUser(userId) {
  return listQuestionAttempts().filter((a) => a.userId === userId);
}

/**
 * @param {object} input
 * @returns {{ ok: boolean, errors: string[], attempt?: object }}
 */
export function appendQuestionAttempt(input) {
  const attempt = createQuestionAttempt(input);
  const result = validateQuestionAttempt(attempt);
  if (!result.ok) {
    return result;
  }
  const store = loadAttemptStore();
  store.attempts.push(attempt);
  if (!persist(store)) {
    return { ok: false, errors: ['LocalStorage write failed'] };
  }
  return { ok: true, errors: [], attempt };
}

/**
 * Replace store with mock list (test/seed only).
 * @param {object[]} mocks
 * @returns {{ ok: boolean, errors: string[], count: number }}
 */
export function seedAttemptsFromMock(mocks) {
  if (!Array.isArray(mocks)) {
    return { ok: false, errors: ['mock must be array'], count: 0 };
  }
  const attempts = [];
  const errors = [];
  for (const item of mocks) {
    const attempt = createQuestionAttempt(item);
    const v = validateQuestionAttempt(attempt);
    if (!v.ok) {
      errors.push(...v.errors.map((e) => `${attempt.attemptId}: ${e}`));
      continue;
    }
    attempts.push(attempt);
  }
  if (errors.length) {
    return { ok: false, errors, count: 0 };
  }
  const written = persist({ version: 1, attempts });
  return {
    ok: written,
    errors: written ? [] : ['LocalStorage write failed'],
    count: attempts.length,
  };
}
