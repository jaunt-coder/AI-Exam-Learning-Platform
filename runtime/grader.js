/**
 * M1 Runtime Grader
 * Compare student selected_answer to correct answer reference value.
 * Does NOT mutate Question DB / Answer SoT / Pattern DB.
 * Does NOT compute mastery or recommendations.
 */

/**
 * Normalize choice to 1-based integer when possible.
 * @param {unknown} value
 * @returns {number|string|null}
 */
export function normalizeAnswer(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isInteger(value) && value >= 1) {
    return value;
  }
  const s = String(value).trim();
  const circle = '①②③④⑤⑥⑦⑧⑨⑩';
  const ci = circle.indexOf(s);
  if (ci >= 0) return ci + 1;
  if (/^[1-9]\d*$/.test(s)) return Number(s);
  const m = s.match(/^([1-9])\s*[.．)）]/);
  if (m) return Number(m[1]);
  return s;
}

/**
 * Grade one attempt.
 * @param {object} input
 * @param {unknown} input.selectedAnswer - student choice
 * @param {unknown} input.correctAnswer - SoT answer (read-only value already resolved)
 * @returns {{ ok: boolean, result: 'correct'|'wrong'|null, selectedNormalized: *, correctNormalized: *, error?: string }}
 */
export function gradeAttempt(input = {}) {
  const selectedNormalized = normalizeAnswer(input.selectedAnswer);
  const correctNormalized = normalizeAnswer(input.correctAnswer);

  if (selectedNormalized === null) {
    return {
      ok: false,
      result: null,
      selectedNormalized,
      correctNormalized,
      error: 'selected_answer_missing',
    };
  }
  if (correctNormalized === null) {
    return {
      ok: false,
      result: null,
      selectedNormalized,
      correctNormalized,
      error: 'correct_answer_unresolved',
    };
  }

  const result =
    selectedNormalized === correctNormalized ? 'correct' : 'wrong';

  return {
    ok: true,
    result,
    selectedNormalized,
    correctNormalized,
    error: undefined,
  };
}

export default { normalizeAnswer, gradeAttempt };
