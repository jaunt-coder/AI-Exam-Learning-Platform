/**
 * Coach Phase C2 — append-only QuestionAttempt store
 *
 * LocalStorage key: coach.attempts.v1 (additive only)
 * Does NOT touch progress / wrongAnswers / bookmarks / examHistory.
 */

import { getItem, setItem, removeItem, STORAGE_KEYS } from '../../storage.js';
import {
  createQuestionAttempt,
  validateQuestionAttempt,
} from '../models/question-attempt.js';

export const COACH_ATTEMPTS_KEY = STORAGE_KEYS.COACH_ATTEMPTS_V1;

/**
 * @returns {{ version: number, appendOnly: true, attempts: object[] }}
 */
function emptyDoc() {
  return {
    version: 1,
    appendOnly: true,
    attempts: [],
  };
}

/**
 * @returns {{ version: number, appendOnly: true, attempts: object[] }}
 */
function readDoc() {
  const raw = getItem(COACH_ATTEMPTS_KEY, null);
  if (!raw || !Array.isArray(raw.attempts)) {
    return emptyDoc();
  }
  return {
    version: Number(raw.version) || 1,
    appendOnly: true,
    attempts: raw.attempts.map((row) => createQuestionAttempt(row)),
  };
}

/**
 * @param {{ version: number, attempts: object[] }} doc
 * @returns {boolean}
 */
function writeDoc(doc) {
  return setItem(COACH_ATTEMPTS_KEY, {
    version: doc.version || 1,
    appendOnly: true,
    attempts: doc.attempts,
  });
}

/**
 * Append one validated attempt. Never updates existing rows.
 * @param {object} input
 * @returns {{ ok: boolean, errors: string[], attempt?: object }}
 */
export function addAttempt(input) {
  const attempt = createQuestionAttempt(input);
  const result = validateQuestionAttempt(attempt);
  if (!result.ok) {
    return result;
  }
  const doc = readDoc();
  // append-only: push only
  doc.attempts.push(attempt);
  if (!writeDoc(doc)) {
    return { ok: false, errors: ['LocalStorage write failed'] };
  }
  return { ok: true, errors: [], attempt };
}

/**
 * @returns {object[]}
 */
export function getAttempts() {
  return readDoc().attempts.slice();
}

/**
 * @param {string} questionId
 * @returns {object[]}
 */
export function getQuestionHistory(questionId) {
  return getAttempts().filter((a) => a.questionId === questionId);
}

/**
 * @param {string} patternId
 * @returns {object[]}
 */
export function getPatternHistory(patternId) {
  return getAttempts().filter((a) => a.patternId === patternId);
}

/**
 * Clears ONLY coach.attempts.v1. Never touches legacy learning keys.
 * @returns {boolean}
 */
export function clearCoachData() {
  try {
    removeItem(COACH_ATTEMPTS_KEY);
    return true;
  } catch (_err) {
    return false;
  }
}

/**
 * Seed from mock array (test only). Replaces coach.attempts.v1 document
 * as a whole — not used by production append path.
 * @param {object[]} mocks
 * @returns {{ ok: boolean, errors: string[], count: number }}
 */
export function seedAttempts(mocks) {
  if (!Array.isArray(mocks)) {
    return { ok: false, errors: ['mocks must be array'], count: 0 };
  }
  const attempts = [];
  const errors = [];
  for (const row of mocks) {
    const attempt = createQuestionAttempt(row);
    const v = validateQuestionAttempt(attempt);
    if (!v.ok) {
      errors.push(`${attempt.id}: ${v.errors.join('; ')}`);
      continue;
    }
    attempts.push(attempt);
  }
  if (errors.length) {
    return { ok: false, errors, count: 0 };
  }
  const ok = writeDoc({ version: 1, attempts });
  return { ok, errors: ok ? [] : ['LocalStorage write failed'], count: attempts.length };
}

export const attemptStore = {
  addAttempt,
  getAttempts,
  getQuestionHistory,
  getPatternHistory,
  clearCoachData,
  seedAttempts,
  KEY: COACH_ATTEMPTS_KEY,
};
