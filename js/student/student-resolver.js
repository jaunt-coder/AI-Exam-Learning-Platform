/**
 * Sprint-13A — Student Resolver Layer
 * All student screens consume Resolved Question only (never raw DB for display).
 * Question DB remains read-only; uses Override Layer (12A) under the hood.
 */

import { resolveQuestion, getOverride } from '../reviewer/override-service.js';
import {
  loadStudentCacheDoc,
  saveStudentCacheDoc,
} from './student-storage.js';

const META_KEYS = [
  '_resolvedFrom',
  '_hasOverride',
  '_reviewStatus',
  '_reviewFlags',
  '_reviewer',
  '_reviewDate',
  '_patternMemo',
  '_reviewerNote',
];

/**
 * Strip reviewer / override meta so students never see Original vs Override.
 * @param {object|null} resolved
 * @returns {object|null}
 */
export function toStudentQuestion(resolved) {
  if (!resolved || typeof resolved !== 'object') return resolved;
  const out = { ...resolved };
  for (const key of META_KEYS) {
    delete out[key];
  }
  return out;
}

/**
 * Drop cached student projection so next resolve reads fresh Override.
 * @param {string|null} [questionId] — omit to clear all
 */
export function invalidateStudentCache(questionId = null) {
  const doc = loadStudentCacheDoc();
  if (!questionId) {
    doc.byQuestion = {};
  } else if (doc.byQuestion?.[questionId]) {
    delete doc.byQuestion[questionId];
  }
  saveStudentCacheDoc(doc);
  return true;
}

/**
 * @param {object|null} original — DB question (read-only input)
 * @param {{ useCache?: boolean }} [options]
 */
export function questionResolver(original, options = {}) {
  if (!original || typeof original !== 'object') return original;
  const qid = original.questionId || original.id;
  if (options.useCache !== false && qid) {
    const cached = loadStudentCacheDoc().byQuestion?.[qid];
    if (cached?.student && cached.overrideUpdatedAt) {
      const ov = getOverride(qid);
      const stamp = ov?.override?.reviewDate || ov?.updatedAt || null;
      if (stamp && stamp === cached.overrideUpdatedAt) {
        return { ...cached.student };
      }
    }
  }

  const merged = resolveQuestion(original);
  const student = toStudentQuestion(merged);
  if (qid) {
    const ov = getOverride(qid);
    const doc = loadStudentCacheDoc();
    if (!doc.byQuestion) doc.byQuestion = {};
    doc.byQuestion[qid] = {
      student,
      overrideUpdatedAt: ov?.override?.reviewDate || null,
      cachedAt: new Date().toISOString(),
    };
    saveStudentCacheDoc(doc);
  }
  return student;
}

/**
 * Resolve patternId (and optional pattern record) after Override.
 * @param {object|null} originalQuestion
 * @param {object[]|null} [patterns]
 */
export function patternResolver(originalQuestion, patterns = null) {
  if (!originalQuestion) return null;
  const student = questionResolver(originalQuestion);
  const patternId = student?.patternId || null;
  const pattern = Array.isArray(patterns)
    ? patterns.find((p) => p.patternId === patternId) || null
    : null;
  return {
    patternId,
    pattern,
    question: student,
  };
}

/**
 * @param {object|null} original
 */
export function tableResolver(original) {
  const student = questionResolver(original);
  return student?.table ?? null;
}

/**
 * @param {object|null} original
 */
export function solutionResolver(original) {
  const student = questionResolver(original);
  return student?.solution ?? null;
}

/**
 * Choices with Override applied.
 * @param {object|null} original
 */
export function choicesResolver(original) {
  const student = questionResolver(original);
  return Array.isArray(student?.choices) ? student.choices : [];
}

/**
 * Map a list of DB questions → student-facing resolved questions.
 * @param {object[]} originals
 */
export function resolveQuestionList(originals = []) {
  return (Array.isArray(originals) ? originals : [])
    .map((q) => questionResolver(q))
    .filter(Boolean);
}

/**
 * Questions belonging to a pattern after Override remaps patternId.
 * @param {string} patternId
 * @param {object[]} originals
 */
export function resolveQuestionsForPattern(patternId, originals = []) {
  const pid = String(patternId || '');
  return resolveQuestionList(originals).filter((q) => q.patternId === pid);
}

/**
 * Lookup helper: original list → student question by id.
 * @param {object[]} originals
 * @param {string} questionId
 */
export function getResolvedQuestionById(originals, questionId) {
  if (!questionId) return null;
  const original = (originals || []).find(
    (q) => (q.questionId || q.id) === questionId,
  );
  return original ? questionResolver(original) : null;
}

export default {
  toStudentQuestion,
  invalidateStudentCache,
  questionResolver,
  patternResolver,
  tableResolver,
  solutionResolver,
  choicesResolver,
  resolveQuestionList,
  resolveQuestionsForPattern,
  getResolvedQuestionById,
};
