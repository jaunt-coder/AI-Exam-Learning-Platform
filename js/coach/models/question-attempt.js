/**
 * Coach Phase C2 — QuestionAttempt event schema (append-only contract)
 *
 * Canonical patternId only (e.g. ACC_INV_003). UI short ids forbidden.
 */

export const ATTEMPT_TYPES = Object.freeze(['practice', 'exam', 'review']);
export const ATTEMPT_SOURCES = Object.freeze(['question-engine', 'mock', 'import']);

const PATTERN_RE = /^ACC_[A-Z]+_\d{3}$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

/**
 * @param {string} patternId
 * @returns {boolean}
 */
export function isCanonicalPatternId(patternId) {
  return typeof patternId === 'string' && PATTERN_RE.test(patternId);
}

/**
 * @returns {string}
 */
export function createAttemptId() {
  return `att_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * @param {object} [input]
 * @returns {object}
 */
export function createQuestionAttempt(input = {}) {
  const answer = input.answer === undefined || input.answer === null ? null : Number(input.answer);
  const correctAnswer =
    input.correctAnswer === undefined || input.correctAnswer === null
      ? null
      : Number(input.correctAnswer);
  let isCorrect = input.isCorrect;
  if (typeof isCorrect !== 'boolean') {
    isCorrect =
      answer !== null && correctAnswer !== null && Number.isFinite(answer) && answer === correctAnswer;
  }

  return {
    id: input.id ?? createAttemptId(),
    questionId: input.questionId ?? '',
    patternId: input.patternId ?? '',
    timestamp: input.timestamp ?? new Date().toISOString(),
    answer,
    correctAnswer,
    isCorrect: Boolean(isCorrect),
    elapsedSeconds: Number(input.elapsedSeconds) || 0,
    attemptType: input.attemptType ?? 'practice',
    source: input.source ?? 'mock',
  };
}

/**
 * @param {object} attempt
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateQuestionAttempt(attempt) {
  const errors = [];
  if (!attempt || typeof attempt !== 'object' || Array.isArray(attempt)) {
    return { ok: false, errors: ['attempt must be an object'] };
  }
  if (typeof attempt.id !== 'string' || !attempt.id) {
    errors.push('id required');
  }
  if (typeof attempt.questionId !== 'string' || !attempt.questionId) {
    errors.push('questionId required');
  }
  if (!isCanonicalPatternId(attempt.patternId)) {
    errors.push(`patternId must be Canonical ACC_*: ${attempt.patternId}`);
  }
  if (typeof attempt.timestamp !== 'string' || !ISO_RE.test(attempt.timestamp)) {
    errors.push('timestamp must be ISO-8601 UTC (…Z)');
  }
  if (attempt.answer !== null && typeof attempt.answer !== 'number') {
    errors.push('answer must be number or null');
  }
  if (attempt.correctAnswer !== null && typeof attempt.correctAnswer !== 'number') {
    errors.push('correctAnswer must be number or null');
  }
  if (typeof attempt.isCorrect !== 'boolean') {
    errors.push('isCorrect must be boolean');
  }
  if (typeof attempt.elapsedSeconds !== 'number' || attempt.elapsedSeconds < 0) {
    errors.push('elapsedSeconds must be non-negative number');
  }
  if (!ATTEMPT_TYPES.includes(attempt.attemptType)) {
    errors.push(`attemptType must be one of ${ATTEMPT_TYPES.join('|')}`);
  }
  if (!ATTEMPT_SOURCES.includes(attempt.source)) {
    errors.push(`source must be one of ${ATTEMPT_SOURCES.join('|')}`);
  }
  return { ok: errors.length === 0, errors };
}
