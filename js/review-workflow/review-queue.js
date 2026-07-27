/**
 * Sprint-12D — Review Queue (auto from 12C Quality Priority)
 */

import {
  loadQueueDoc,
  saveQueueDoc,
  loadWorkflowDoc,
  saveWorkflowDoc,
  REVIEW_REASONS,
} from './review-state.js';
import { appendWorkflowHistory } from './review-history.js';
import { LOW_QUALITY_THRESHOLD } from '../quality/quality-score.js';

/**
 * Derive reasons from a quality row.
 * @param {object} row
 * @returns {string[]}
 */
export function deriveReviewReasons(row = {}) {
  const reasons = [];
  const flags = row.flags || {};
  if (flags.ocrError) reasons.push('OCR_MISSING');
  if (flags.tableMissing) reasons.push('TABLE_MISSING');
  if (flags.patternMismatch) reasons.push('PATTERN_MISMATCH');
  if (flags.solutionOk === false) reasons.push('SOLUTION_MISMATCH');
  if (flags.broken) reasons.push('CHOICE_BROKEN');
  if (
    typeof row.confidence === 'number' &&
    row.confidence > 0 &&
    row.confidence < 0.9
  ) {
    reasons.push('CONFIDENCE_LOW');
  }
  if (typeof row.score === 'number' && row.score <= LOW_QUALITY_THRESHOLD) {
    reasons.push('LOW_QUALITY');
  }
  return [...new Set(reasons)].filter((r) => REVIEW_REASONS.includes(r));
}

/**
 * Priority: lower quality score first, then more reasons.
 * @param {object} item
 */
export function computeQueuePriority(item = {}) {
  const score = Number(item.qualityScore);
  const base = Number.isFinite(score) ? 100 - score : 50;
  const reasonBoost = (item.reasons || []).length * 5;
  return base + reasonBoost;
}

/**
 * Build / merge queue from quality snapshot rows.
 * @param {object[]} qualityRows
 * @param {{ replace?: boolean, limit?: number }} [options]
 */
export function buildReviewQueueFromQuality(qualityRows = [], options = {}) {
  const rows = Array.isArray(qualityRows) ? qualityRows : [];
  const candidates = rows
    .map((row) => {
      const reasons = deriveReviewReasons(row);
      if (!reasons.length && (row.score ?? 100) > LOW_QUALITY_THRESHOLD) {
        return null;
      }
      if (!reasons.length) return null;
      const item = {
        questionId: row.questionId,
        patternId: row.patternId || null,
        year: row.year || null,
        qualityScore: row.score,
        status: 'NEEDS_REVIEW',
        reasons,
        confidence: row.confidence ?? null,
        qualityStatus: row.status || null,
      };
      item.priority = computeQueuePriority(item);
      return item;
    })
    .filter(Boolean)
    .sort((a, b) => b.priority - a.priority || a.qualityScore - b.qualityScore);

  const limit = Number(options.limit) || 100;
  const nextItems = candidates.slice(0, limit);

  const qdoc = loadQueueDoc();
  if (options.replace) {
    qdoc.items = nextItems;
  } else {
    const map = new Map((qdoc.items || []).map((i) => [i.questionId, i]));
    for (const item of nextItems) {
      const prev = map.get(item.questionId);
      map.set(item.questionId, {
        ...prev,
        ...item,
        status: prev?.status && prev.status !== 'NEEDS_REVIEW' ? prev.status : item.status,
      });
    }
    qdoc.items = [...map.values()].sort(
      (a, b) => (b.priority || 0) - (a.priority || 0),
    );
  }
  saveQueueDoc(qdoc);

  const wdoc = loadWorkflowDoc();
  for (const item of qdoc.items) {
    if (!wdoc.byQuestion[item.questionId]) {
      wdoc.byQuestion[item.questionId] = {
        questionId: item.questionId,
        status: 'NEEDS_REVIEW',
        reasons: item.reasons,
        qualityScore: item.qualityScore,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      appendWorkflowHistory({
        questionId: item.questionId,
        decision: 'ENQUEUE',
        status: 'NEEDS_REVIEW',
        comment: `Auto queue: ${(item.reasons || []).join(', ')}`,
      });
    }
  }
  wdoc.stats = {
    ...(wdoc.stats || {}),
    queued: qdoc.items.length,
  };
  saveWorkflowDoc(wdoc);

  return {
    ok: true,
    count: qdoc.items.length,
    items: qdoc.items,
  };
}

export function getReviewQueue() {
  return loadQueueDoc().items.slice();
}

/**
 * @param {string} questionId
 * @param {string} status
 */
export function updateQueueItemStatus(questionId, status) {
  const qdoc = loadQueueDoc();
  qdoc.items = qdoc.items.map((item) =>
    item.questionId === questionId ? { ...item, status } : item,
  );
  saveQueueDoc(qdoc);
  return qdoc.items.find((i) => i.questionId === questionId) || null;
}

export default {
  deriveReviewReasons,
  computeQueuePriority,
  buildReviewQueueFromQuality,
  getReviewQueue,
  updateQueueItemStatus,
};
