/**
 * Sprint-12A — Override Layer + Runtime Resolvers
 * Question DB remains read-only. Overrides live in LocalStorage only.
 */

import {
  loadOverridesDoc,
  saveOverridesDoc,
  REVIEW_STATUSES,
} from './review-storage.js';
import { appendReviewHistory } from './review-history.js';

/**
 * @param {string} questionId
 * @returns {object|null}
 */
export function getOverride(questionId) {
  if (!questionId) return null;
  const doc = loadOverridesDoc();
  const row = doc.overrides?.[questionId];
  return row && typeof row === 'object' ? row : null;
}

/**
 * @param {string} questionId
 * @returns {boolean}
 */
export function hasOverride(questionId) {
  return Boolean(getOverride(questionId));
}

/**
 * Deep-merge patch into override.override payload.
 * @param {string} questionId
 * @param {object} patch
 * @param {{ reviewer?: string, changedFields?: string[], status?: string }} [meta]
 */
export function saveOverride(questionId, patch = {}, meta = {}) {
  const id = String(questionId || '');
  if (!id) return { ok: false, error: 'missing_questionId' };

  const doc = loadOverridesDoc();
  const prev = doc.overrides[id] || {
    questionId: id,
    override: {},
  };
  const prevOverride =
    prev.override && typeof prev.override === 'object' ? prev.override : {};

  const nextOverride = {
    ...prevOverride,
    ...patch,
    reviewed: patch.reviewed !== undefined ? Boolean(patch.reviewed) : true,
    reviewer: meta.reviewer || patch.reviewer || prevOverride.reviewer || 'local',
    reviewDate: new Date().toISOString(),
  };

  if (Array.isArray(patch.reviewFlags)) {
    nextOverride.reviewFlags = patch.reviewFlags.slice();
  } else if (!Array.isArray(nextOverride.reviewFlags)) {
    nextOverride.reviewFlags = [];
  }

  const record = {
    questionId: id,
    status: meta.status || prev.status || 'REVIEWED',
    override: nextOverride,
  };

  if (!REVIEW_STATUSES.includes(record.status)) {
    record.status = 'REVIEWED';
  }

  doc.overrides[id] = record;
  saveOverridesDoc(doc);

  const changedFields =
    meta.changedFields ||
    Object.keys(patch).filter((k) => !['reviewed', 'reviewer', 'reviewDate'].includes(k));

  appendReviewHistory({
    questionId: id,
    reviewer: nextOverride.reviewer,
    changedFields,
    overrideSnapshot: record,
  });

  return { ok: true, record };
}

/**
 * Remove override for a question.
 * @param {string} questionId
 */
export function clearOverride(questionId) {
  const id = String(questionId || '');
  if (!id) return { ok: false };
  const doc = loadOverridesDoc();
  if (!doc.overrides[id]) return { ok: true, cleared: false };
  delete doc.overrides[id];
  saveOverridesDoc(doc);
  appendReviewHistory({
    questionId: id,
    changedFields: ['cleared'],
    overrideSnapshot: null,
    note: 'override_cleared',
  });
  return { ok: true, cleared: true };
}

/**
 * @param {object|null} original
 * @returns {object|null}
 */
export function resolveTable(original) {
  if (!original || typeof original !== 'object') return null;
  const ov = getOverride(original.questionId || original.id);
  if (ov?.override && Object.prototype.hasOwnProperty.call(ov.override, 'table')) {
    return ov.override.table;
  }
  return original.table ?? null;
}

/**
 * @param {object|null} original
 * @returns {string[]|null}
 */
export function resolveChoices(original) {
  if (!original || typeof original !== 'object') return null;
  const ov = getOverride(original.questionId || original.id);
  if (ov?.override && Array.isArray(ov.override.choices)) {
    return ov.override.choices.slice();
  }
  return Array.isArray(original.choices) ? original.choices.slice() : null;
}

/**
 * @param {object|null} original
 * @returns {object|null}
 */
export function resolveSolution(original) {
  if (!original || typeof original !== 'object') return null;
  const ov = getOverride(original.questionId || original.id);
  if (ov?.override?.solution && typeof ov.override.solution === 'object') {
    return {
      ...(original.solution && typeof original.solution === 'object'
        ? original.solution
        : {}),
      ...ov.override.solution,
    };
  }
  return original.solution && typeof original.solution === 'object'
    ? { ...original.solution }
    : null;
}

/**
 * Resolve question for Runtime / Renderer / Coach.
 * Override wins field-by-field; original DB object is never mutated.
 * @param {object|null} original
 * @returns {object|null}
 */
export function resolveQuestion(original) {
  if (!original || typeof original !== 'object') return original;
  const qid = original.questionId || original.id;
  const ov = getOverride(qid);
  if (!ov?.override) {
    return {
      ...original,
      _resolvedFrom: 'original',
      _hasOverride: false,
      _reviewStatus: 'NOT_REVIEWED',
    };
  }

  const o = ov.override;
  const resolved = {
    ...original,
    question:
      o.question !== undefined && o.question !== null
        ? o.question
        : original.question,
    originalQuestion:
      o.originalQuestion !== undefined && o.originalQuestion !== null
        ? o.originalQuestion
        : original.originalQuestion,
    table: resolveTable(original),
    choices: resolveChoices(original) || original.choices,
    solution: resolveSolution(original) || original.solution,
    patternId:
      o.patternId !== undefined && o.patternId !== null && o.patternId !== ''
        ? o.patternId
        : original.patternId,
    primaryPattern:
      o.primaryPattern !== undefined
        ? o.primaryPattern
        : original.primaryPattern,
    hasTable:
      o.hasTable !== undefined
        ? Boolean(o.hasTable)
        : o.table !== undefined
          ? Boolean(o.table)
          : original.hasTable,
    answer: o.answer !== undefined ? o.answer : original.answer,
    answerIndex: o.answerIndex !== undefined ? o.answerIndex : original.answerIndex,
    _resolvedFrom: 'override',
    _hasOverride: true,
    _reviewStatus: ov.status || 'REVIEWED',
    _reviewFlags: Array.isArray(o.reviewFlags) ? o.reviewFlags.slice() : [],
    _reviewer: o.reviewer || 'local',
    _reviewDate: o.reviewDate || null,
    _patternMemo: o.patternMemo || o.patternNote || '',
    _reviewerNote: o.reviewerNote || o.note || '',
  };
  return resolved;
}

/**
 * Summary stats for dashboard.
 */
export function getOverrideSummary() {
  const doc = loadOverridesDoc();
  const entries = Object.values(doc.overrides || {});
  const byStatus = {
    NOT_REVIEWED: 0,
    REVIEWED: 0,
    NEEDS_VERIFY: 0,
    APPROVED: 0,
    REJECTED: 0,
  };
  for (const row of entries) {
    const s = row.status || 'REVIEWED';
    if (byStatus[s] !== undefined) byStatus[s] += 1;
    else byStatus.REVIEWED += 1;
  }
  return {
    totalOverrides: entries.length,
    byStatus,
    updatedAt: doc.updatedAt || null,
  };
}

export default {
  getOverride,
  hasOverride,
  saveOverride,
  clearOverride,
  resolveTable,
  resolveChoices,
  resolveSolution,
  resolveQuestion,
  getOverrideSummary,
};
