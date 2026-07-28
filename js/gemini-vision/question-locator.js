/**
 * Sprint-17B — Question Locator
 * Question ID → Source → PDF → Page → Question Number → Crop target
 */

import { getSourceEntry, buildPdfUrl } from '../source-viewer.js';
import { buildPdfCompareMeta } from '../recovery/ai-recovery-service.js';
import { simpleHash } from './vision-utils.js';

/**
 * Sync locate from question.source (no fetch).
 * @param {object} question
 */
export function locateQuestionSync(question = {}) {
  const source = question.source || {};
  const meta = buildPdfCompareMeta(question);
  const questionId = question.questionId || question.id || null;
  const questionNumber =
    source.questionNumber
    ?? meta.questionNumber
    ?? extractQuestionNumber(questionId);
  const pdfPath = meta.sourceFile || null;
  const page = meta.page;
  const pdfUrl = meta.pdfUrl || (pdfPath ? buildPdfUrl({ pdf: pdfPath, page }) : null);
  const pdfHash = simpleHash(
    [pdfPath || '', page || '', questionNumber || '', questionId || ''].join('|'),
  );

  return {
    questionId,
    pdfPath,
    pdfUrl,
    page,
    questionNumber,
    year: meta.year || question.year || source.year || null,
    available: Boolean(pdfPath && page),
    pdfHash,
    sourceKind: source.sourceKind || source.type || null,
  };
}

/**
 * Async locate — merges question-source-map when available.
 * @param {object} question
 */
export async function locateQuestion(question = {}) {
  const base = locateQuestionSync(question);
  const qid = base.questionId;
  if (!qid) return base;
  try {
    const entry = await getSourceEntry(qid);
    if (entry?.available && entry.pdf) {
      const page = Number(entry.page) || base.page;
      const questionNumber =
        entry.questionNumber ?? entry.questionNo ?? base.questionNumber;
      const pdfPath = String(entry.pdf).replace(/\\/g, '/');
      const pdfUrl = buildPdfUrl({ pdf: pdfPath, page });
      const pdfHash = simpleHash(
        [pdfPath, page || '', questionNumber || '', qid].join('|'),
      );
      return {
        ...base,
        pdfPath,
        pdfUrl,
        page,
        questionNumber,
        available: true,
        pdfHash,
        fromSourceMap: true,
      };
    }
  } catch (_err) {
    /* keep sync base */
  }
  return base;
}

function extractQuestionNumber(questionId) {
  const m = String(questionId || '').match(/Q(\d+)$/i);
  return m ? Number(m[1]) : null;
}

export default {
  locateQuestionSync,
  locateQuestion,
};
