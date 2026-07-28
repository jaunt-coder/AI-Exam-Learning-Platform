/**
 * Sprint-19B — Question Builder
 * Builds subject-scoped Question JSON records (candidate, not product DB).
 */

export const QUESTION_BUILDER_VERSION = '19B';

/**
 * Stable short hash for content.
 * @param {string} value
 */
export function hashText(value) {
  const s = String(value || '');
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (`0000000${(h >>> 0).toString(16)}`).slice(-8);
}

/**
 * Build questionId: ACC-2018-Q41 style (universal prefix by subject).
 * @param {{ subjectId: string, year: number, number: number, session?: string }} meta
 */
export function buildQuestionId(meta = {}) {
  const prefix = {
    accounting: 'ACC',
    economics: 'ECO',
    civil: 'CIV',
    realestate: 'REA',
    law: 'LAW',
  }[meta.subjectId] || String(meta.subjectId || 'SUB').slice(0, 3).toUpperCase();
  const year = meta.year || '0000';
  const num = String(meta.number || 0).padStart(2, '0');
  return `${prefix}-${year}-Q${num}`;
}

/**
 * @param {object} parsed — from question-parser + answer match
 * @param {object} ctx
 */
export function buildQuestionRecord(parsed = {}, ctx = {}) {
  const subjectId = ctx.subjectId || 'accounting';
  const year = Number(ctx.year) || null;
  const session = ctx.session || null;
  const exam = ctx.examName || '감정평가사';
  const number = Number(parsed.number) || 0;
  const question = String(parsed.question || '');
  const choices = Array.isArray(parsed.choices) ? parsed.choices : [];
  const sourcePdf = ctx.sourcePath || null;
  const page = parsed.page || null;
  const payload = [
    subjectId,
    year,
    number,
    question,
    choices.join('|'),
    parsed.answer ?? '',
  ].join('::');

  return {
    questionId: buildQuestionId({ subjectId, year, number, session }),
    subjectId,
    year,
    exam,
    session,
    number,
    question,
    table: parsed.table || null,
    choices,
    answer: parsed.answer ?? null,
    ocrQuality: parsed.ocrQualityHint ?? ctx.ocrQuality ?? null,
    sourcePdf,
    page,
    hash: hashText(payload),
    hasTable: Boolean(parsed.hasTable),
    hasCalculation: Boolean(parsed.hasCalculation),
    answerMatched: Boolean(parsed.answerMatched),
    geminiReady: Boolean(
      question.trim()
      && choices.length >= 2
      && parsed.answer != null,
    ),
    importVersion: QUESTION_BUILDER_VERSION,
    status: 'candidate',
  };
}

/**
 * @param {object[]} parsedQuestions
 * @param {object} ctx
 */
export function buildQuestionDb(parsedQuestions = [], ctx = {}) {
  const questions = (parsedQuestions || []).map((q) => buildQuestionRecord(q, ctx));
  return {
    schemaVersion: 'v1',
    subjectId: ctx.subjectId || null,
    exam: ctx.examName || '감정평가사',
    generatedAt: new Date().toISOString(),
    importVersion: QUESTION_BUILDER_VERSION,
    status: 'candidate',
    productDbWriteForbidden: true,
    count: questions.length,
    geminiReadyCount: questions.filter((q) => q.geminiReady).length,
    questions,
  };
}

export default {
  QUESTION_BUILDER_VERSION,
  hashText,
  buildQuestionId,
  buildQuestionRecord,
  buildQuestionDb,
};
