/**
 * Sprint-19B — Import Validator
 */

export const IMPORT_VALIDATOR_VERSION = '19B';

const REQUIRED_QUESTION_FIELDS = [
  'questionId',
  'subjectId',
  'year',
  'exam',
  'session',
  'number',
  'question',
  'choices',
  'answer',
  'ocrQuality',
  'sourcePdf',
  'page',
  'hash',
];

/**
 * @param {object} question
 */
export function validateQuestionRecord(question = {}) {
  const missing = REQUIRED_QUESTION_FIELDS.filter((k) => {
    const v = question[k];
    if (k === 'answer' || k === 'ocrQuality' || k === 'page' || k === 'table' || k === 'sourcePdf') {
      return false; // nullable allowed
    }
    if (k === 'choices') return !Array.isArray(v);
    return v == null || v === '';
  });
  return {
    ok: missing.length === 0,
    missing,
    geminiReady: Boolean(question.geminiReady),
  };
}

/**
 * @param {object} questionDb
 */
export function validateQuestionDb(questionDb = {}) {
  const questions = Array.isArray(questionDb.questions) ? questionDb.questions : [];
  const results = questions.map(validateQuestionRecord);
  const invalid = results.filter((r) => !r.ok).length;
  return {
    ok: Boolean(questionDb.productDbWriteForbidden) && invalid === 0,
    count: questions.length,
    invalid,
    productDbWriteForbidden: Boolean(questionDb.productDbWriteForbidden),
    version: IMPORT_VALIDATOR_VERSION,
  };
}

/**
 * @param {object} patternDb
 */
export function validatePatternCandidate(patternDb = {}) {
  return {
    ok: Boolean(patternDb.productDbWriteForbidden) && Array.isArray(patternDb.patterns),
    count: patternDb.patterns?.length || 0,
    productDbWriteForbidden: Boolean(patternDb.productDbWriteForbidden),
  };
}

/**
 * @param {object} formulaDb
 */
export function validateFormulaCandidate(formulaDb = {}) {
  return {
    ok: Boolean(formulaDb.officialFormulaDbWriteForbidden) && Array.isArray(formulaDb.formulas),
    count: formulaDb.formulas?.length || 0,
    officialFormulaDbWriteForbidden: Boolean(formulaDb.officialFormulaDbWriteForbidden),
  };
}

/**
 * Ensure product paths are never targeted.
 * @param {string} path
 */
export function isForbiddenProductPath(path) {
  const p = String(path || '').replace(/\\/g, '/');
  return (
    p === 'data/question-db.json'
    || p === 'data/pattern-db.json'
    || p === 'data/statistics.json'
    || /\/data\/question-db\.json$/.test(p)
    || /\/data\/pattern-db\.json$/.test(p)
    || /\/data\/statistics\.json$/.test(p)
  );
}

export default {
  IMPORT_VALIDATOR_VERSION,
  REQUIRED_QUESTION_FIELDS,
  validateQuestionRecord,
  validateQuestionDb,
  validatePatternCandidate,
  validateFormulaCandidate,
  isForbiddenProductPath,
};
