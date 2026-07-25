/**
 * Coach Phase C2 — Question Engine adapter (non-invasive)
 *
 * Does NOT modify js/question-engine.js.
 * Maps a submit/grade result object → QuestionAttempt event.
 */

import {
  createQuestionAttempt,
  validateQuestionAttempt,
} from '../models/question-attempt.js';
import { addAttempt } from '../stores/attemptStore.js';

/**
 * @typedef {object} QuestionEngineSubmitInput
 * @property {string} questionId
 * @property {string} [patternId]
 * @property {number|null} [selectedAnswer]
 * @property {number|null} [answer] alias of selectedAnswer
 * @property {number|null} correctAnswer
 * @property {number} [elapsed]
 * @property {number} [elapsedSeconds]
 * @property {'practice'|'exam'|'review'} [attemptType]
 * @property {string} [timestamp]
 * @property {string} [id]
 */

/**
 * Build a QuestionAttempt from a Question Engine style result.
 * Does not persist — caller may pass to addAttempt / recordAttemptFromEngine.
 *
 * @param {QuestionEngineSubmitInput} input
 * @returns {{ ok: boolean, errors: string[], attempt?: object }}
 */
export function toQuestionAttempt(input) {
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: ['input must be an object'] };
  }
  const selected =
    input.selectedAnswer !== undefined ? input.selectedAnswer : input.answer;
  const elapsed =
    input.elapsedSeconds !== undefined ? input.elapsedSeconds : input.elapsed;

  const attempt = createQuestionAttempt({
    id: input.id,
    questionId: input.questionId,
    patternId: input.patternId,
    timestamp: input.timestamp,
    answer: selected === undefined ? null : selected,
    correctAnswer: input.correctAnswer === undefined ? null : input.correctAnswer,
    elapsedSeconds: elapsed === undefined ? 0 : elapsed,
    attemptType: input.attemptType || 'practice',
    source: 'question-engine',
  });

  const result = validateQuestionAttempt(attempt);
  if (!result.ok) {
    return result;
  }
  return { ok: true, errors: [], attempt };
}

/**
 * Convert + append-only persist into coach.attempts.v1.
 * @param {QuestionEngineSubmitInput} input
 * @returns {{ ok: boolean, errors: string[], attempt?: object }}
 */
export function recordAttemptFromEngine(input) {
  const built = toQuestionAttempt(input);
  if (!built.ok) {
    return built;
  }
  return addAttempt(built.attempt);
}
