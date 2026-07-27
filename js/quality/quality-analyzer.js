/**
 * Sprint-12C — Quality Analyzer (signals from DB + Override + Recovery + Integrity)
 * Read-only over Question / Pattern DBs.
 */

import { getOverride } from '../reviewer/override-service.js';
import { getReviewRecord } from '../reviewer/review-service.js';
import {
  loadRecoveryDoc,
  loadSuggestionDoc,
} from '../recovery/recovery-cache.js';

/**
 * Detect if solution payload is effectively empty.
 * @param {object} question
 */
export function hasSolutionContent(question = {}) {
  const s = question.solution;
  if (!s || typeof s !== 'object') return false;
  const parts = [
    s.summary,
    s.explanation,
    s.algorithm,
    s.calculationProcess,
    Array.isArray(s.steps) ? s.steps.join(' ') : '',
  ];
  return parts.some((p) => String(p || '').trim().length > 0);
}

/**
 * Heuristic OCR / table signals from question text.
 * @param {object} question
 */
export function analyzeQuestionSignals(question = {}) {
  const text = [
    question.originalQuestion,
    question.question,
  ]
    .filter(Boolean)
    .join('\n');
  const compact = String(text).replace(/\s+/g, '');

  const ocrError =
    /[가-힣]\s+[가-힣]/.test(text) ||
    /종합원\s*가/.test(text) ||
    /단위완성\s*도/.test(text);

  const processLike =
    /기초재공품|당기투입|당기완성|기말재공|완성품환산|종합원가/.test(compact);
  const hasTableMd =
    typeof question.table === 'string' &&
    question.table.includes('|') &&
    question.table.split('\n').length >= 3;
  const tableMissing = processLike && !hasTableMd && !question.hasTable;

  const choicesOk =
    Array.isArray(question.choices) && question.choices.length === 5;
  const broken =
    !question.questionId ||
    !String(question.question || question.originalQuestion || '').trim() ||
    !choicesOk;

  const solutionOk = hasSolutionContent(question);

  return {
    ocrError,
    tableMissing,
    tableOk: hasTableMd || (!processLike && !tableMissing),
    ocrOk: !ocrError,
    solutionOk,
    choicesOk,
    broken,
    processLike,
  };
}

/**
 * Pattern mismatch from integrity report row or heuristic.
 * @param {object} question
 * @param {Set<string>} mismatchIds
 */
export function analyzePatternMismatch(question, mismatchIds) {
  const qid = question.questionId || question.id;
  if (mismatchIds && mismatchIds.has(qid)) return true;
  const chapter = String(question.chapterId || '');
  const text = String(question.originalQuestion || question.question || '').replace(
    /\s+/g,
    '',
  );
  if (
    chapter.startsWith('ACC_INV') &&
    /종합원가계산|완성품환산량|가중평균법|선입선출법/.test(text)
  ) {
    return true;
  }
  return false;
}

/**
 * Build analyzer flags for one question.
 * @param {object} question
 * @param {{ mismatchIds?: Set<string> }} [ctx]
 */
export function analyzeQuestionQuality(question = {}, ctx = {}) {
  const qid = question.questionId || question.id;
  const signals = analyzeQuestionSignals(question);
  const ov = getOverride(qid);
  const review = getReviewRecord(qid);
  const suggestion = loadSuggestionDoc().byQuestion?.[qid] || null;
  const recoveryDoc = loadRecoveryDoc();
  const recoveryRow = recoveryDoc.byQuestion?.[qid];

  const hasOverride = Boolean(ov?.override);
  const reviewed =
    review.status === 'REVIEWED' ||
    review.status === 'APPROVED' ||
    ov?.status === 'REVIEWED';
  const humanApproved =
    review.status === 'APPROVED' ||
    recoveryRow?.status === 'APPROVED' ||
    ov?.status === 'APPROVED';
  const verifyRequired =
    review.status === 'NEEDS_VERIFY' ||
    (Array.isArray(review.flags) &&
      review.flags.some((f) =>
        ['NEED_VERIFICATION', 'PATTERN_MISMATCH', 'TABLE_ERROR', 'OCR_ERROR'].includes(
          f,
        ),
      ));

  const aiSuggestionPending =
    Boolean(suggestion?.changes?.length) &&
    suggestion.status === 'PENDING' &&
    recoveryRow?.status !== 'APPROVED' &&
    recoveryRow?.status !== 'REJECTED';

  const patternMismatch = analyzePatternMismatch(question, ctx.mismatchIds);

  const confidence =
    suggestion?.confidence ??
    recoveryRow?.confidence ??
    null;

  return {
    questionId: qid,
    patternId: question.patternId || question.primaryPattern || null,
    ...signals,
    patternMismatch,
    patternOk: !patternMismatch,
    hasOverride,
    reviewed,
    humanApproved,
    approved: humanApproved,
    verifyRequired,
    aiSuggestionPending,
    confidence,
    recoveryStatus: recoveryRow?.status || null,
    reviewStatus: review.status || 'NOT_REVIEWED',
    overrideFlags: ov?.override?.reviewFlags || [],
  };
}

export default {
  hasSolutionContent,
  analyzeQuestionSignals,
  analyzePatternMismatch,
  analyzeQuestionQuality,
};
