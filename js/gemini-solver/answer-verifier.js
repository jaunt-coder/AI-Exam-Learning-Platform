/**
 * Sprint-17A — Answer Verifier (local + Pass-2 Gemini validation merge)
 */

/**
 * Local verification against resolved correct answer / choices.
 * @param {object} payload — Gemini JSON
 * @param {{ correctAnswer?: number, choices?: string[] }} context
 */
export function verifyAnswerLocally(payload = {}, context = {}) {
  const expected = Number(context.correctAnswer);
  const reported = Number(payload.correctAnswer);
  const choiceCount = Array.isArray(context.choices) ? context.choices.length : 5;
  const inRange =
    Number.isFinite(reported) && reported >= 1 && reported <= Math.max(choiceCount, 5);
  const choiceMatched =
    Number.isFinite(expected) && Number.isFinite(reported) && expected === reported;

  const verification = {
    choiceMatched,
    calculationCorrect: Boolean(payload.verification?.calculationCorrect ?? true),
    localPass: choiceMatched && inRange,
    expectedAnswer: Number.isFinite(expected) ? expected : null,
    reportedAnswer: Number.isFinite(reported) ? reported : null,
  };

  return {
    ok: verification.localPass,
    verification,
    payload: {
      ...payload,
      correctAnswer: Number.isFinite(expected) ? expected : reported,
      verification: {
        choiceMatched: verification.choiceMatched,
        calculationCorrect: verification.calculationCorrect,
      },
    },
  };
}

/**
 * Merge Pass-2 Gemini validation result into payload.
 * @param {object} payload
 * @param {object} pass2
 */
export function applyPass2Validation(payload = {}, pass2 = {}) {
  const issues = Array.isArray(pass2.issues) ? pass2.issues : [];
  const calculationCorrect =
    typeof pass2.calculationCorrect === 'boolean'
      ? pass2.calculationCorrect
      : Boolean(payload.verification?.calculationCorrect);

  const choiceMatched =
    typeof pass2.choiceMatched === 'boolean'
      ? pass2.choiceMatched
      : Boolean(payload.verification?.choiceMatched);

  const next = {
    ...payload,
    verification: {
      choiceMatched,
      calculationCorrect,
    },
    pass2: {
      issues,
      confidence: Number(pass2.confidence) || null,
      applied: true,
    },
  };

  if (
    !calculationCorrect
    && Array.isArray(pass2.correctedCalculation)
    && pass2.correctedCalculation.length
  ) {
    next.calculation = pass2.correctedCalculation.map((s) => String(s ?? ''));
  }

  return next;
}

export default {
  verifyAnswerLocally,
  applyPass2Validation,
};
