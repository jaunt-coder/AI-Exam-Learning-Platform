/**
 * Sprint-12A — Review Service (status, flags, notes, dashboard summary).
 */

import {
  loadReviewDoc,
  saveReviewDoc,
  REVIEW_STATUSES,
  REVIEW_FLAGS,
  exportOverridesJson,
  importOverridesJson,
} from './review-storage.js';
import {
  getOverride,
  saveOverride,
  hasOverride,
  getOverrideSummary,
  resolveQuestion,
} from './override-service.js';
import { getReviewHistory, undoReview } from './review-history.js';

/**
 * @param {string} questionId
 */
export function getReviewRecord(questionId) {
  const doc = loadReviewDoc();
  const row = doc.byQuestion?.[questionId];
  const ov = getOverride(questionId);
  return {
    questionId,
    status: row?.status || ov?.status || 'NOT_REVIEWED',
    flags: row?.flags || ov?.override?.reviewFlags || [],
    note: row?.note || ov?.override?.reviewerNote || '',
    reviewer: row?.reviewer || ov?.override?.reviewer || null,
    updatedAt: row?.updatedAt || ov?.override?.reviewDate || null,
    hasOverride: hasOverride(questionId),
  };
}

/**
 * @param {string} questionId
 * @param {{
 *   status?: string,
 *   flags?: string[],
 *   note?: string,
 *   reviewer?: string,
 * }} patch
 */
export function upsertReviewRecord(questionId, patch = {}) {
  const id = String(questionId || '');
  if (!id) return { ok: false, error: 'missing_questionId' };

  const doc = loadReviewDoc();
  const prev = doc.byQuestion[id] || {};
  let status = patch.status || prev.status || 'REVIEWED';
  if (!REVIEW_STATUSES.includes(status)) status = 'REVIEWED';

  let flags = Array.isArray(patch.flags)
    ? patch.flags.filter((f) => REVIEW_FLAGS.includes(f) || typeof f === 'string')
    : prev.flags || [];

  const record = {
    questionId: id,
    status,
    flags,
    note: patch.note !== undefined ? String(patch.note) : prev.note || '',
    reviewer: patch.reviewer || prev.reviewer || 'local',
    updatedAt: new Date().toISOString(),
  };
  doc.byQuestion[id] = record;
  saveReviewDoc(doc);

  /* keep override metadata in sync when override exists or note/flags set */
  if (hasOverride(id) || flags.length || record.note) {
    saveOverride(
      id,
      {
        reviewFlags: flags,
        reviewerNote: record.note,
        reviewed: status === 'REVIEWED' || status === 'APPROVED',
      },
      { status, reviewer: record.reviewer, changedFields: ['reviewStatus', 'reviewFlags', 'reviewerNote'] },
    );
  }

  return { ok: true, record };
}

/**
 * Badge state for Question UI.
 * @param {object} question - preferably resolved
 */
export function getQuestionBadge(question) {
  if (!question) {
    return { code: 'ORIGINAL', label: '🔵 Original', tone: 'original' };
  }
  const status = question._reviewStatus || getReviewRecord(question.questionId).status;
  const overridden = question._hasOverride || hasOverride(question.questionId);

  if (status === 'NEEDS_VERIFY') {
    return { code: 'VERIFY', label: '⚠ Verify', tone: 'verify' };
  }
  if (status === 'APPROVED' || status === 'REVIEWED') {
    return { code: 'REVIEWED', label: '✓ Reviewed', tone: 'reviewed' };
  }
  if (overridden) {
    return { code: 'OVERRIDE', label: '🟠 Override', tone: 'override' };
  }
  return { code: 'ORIGINAL', label: '🔵 Original', tone: 'original' };
}

/**
 * Dashboard Reviewer Mode card payload.
 */
export function buildReviewerDashboardCard() {
  const summary = getOverrideSummary();
  const reviewDoc = loadReviewDoc();
  const reviewCount = Object.keys(reviewDoc.byQuestion || {}).length;
  const needsVerify = Object.values(reviewDoc.byQuestion || {}).filter(
    (r) => r.status === 'NEEDS_VERIFY',
  ).length;
  return {
    enabled: true,
    connected: true,
    totalOverrides: summary.totalOverrides,
    reviewRecords: reviewCount,
    needsVerify,
    byStatus: summary.byStatus,
    updatedAt: summary.updatedAt || reviewDoc.updatedAt,
    storageKeys: [
      'learning.review.v1',
      'question-overrides.v1',
      'review-history.v1',
    ],
  };
}

export function exportReviewPack() {
  return exportOverridesJson();
}

export function importReviewPack(raw) {
  return importOverridesJson(raw);
}

export {
  resolveQuestion,
  undoReview,
  getReviewHistory,
  REVIEW_STATUSES,
  REVIEW_FLAGS,
};

export default {
  getReviewRecord,
  upsertReviewRecord,
  getQuestionBadge,
  buildReviewerDashboardCard,
  exportReviewPack,
  importReviewPack,
  resolveQuestion,
  undoReview,
  getReviewHistory,
  REVIEW_STATUSES,
  REVIEW_FLAGS,
};
