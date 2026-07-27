/**
 * Sprint-12B — Approval Engine
 * Approve → 12A Override API only. Reject/Skip → discard (no DB write).
 */

import { saveOverride } from '../reviewer/override-service.js';
import { serializeMarkdownTable } from '../reviewer/table-editor.js';
import {
  loadRecoveryDoc,
  saveRecoveryDoc,
  appendRecoveryHistory,
} from './recovery-cache.js';

/**
 * Convert approved changes → override patch for 12A saveOverride.
 * @param {object[]} changes
 */
export function changesToOverridePatch(changes = []) {
  const patch = {
    reviewFlags: ['OCR_ERROR', 'NEED_VERIFICATION'],
    reviewed: true,
    reviewer: 'local-ai-recovery',
  };
  const changedFields = [];

  for (const c of changes) {
    const field = String(c.field || '').toLowerCase();
    if (field === 'table' && c.after) {
      patch.table =
        c.afterMarkdown ||
        (c.after.headers
          ? serializeMarkdownTable(c.after.headers, c.after.rows || [])
          : typeof c.after === 'string'
            ? c.after
            : null);
      patch.hasTable = Boolean(patch.table);
      if (!patch.reviewFlags.includes('TABLE_FIXED')) {
        patch.reviewFlags.push('TABLE_FIXED');
      }
      changedFields.push('table');
    }
    if (field === 'question' && typeof c.after === 'string') {
      patch.question = c.after;
      patch.originalQuestion = c.after;
      if (!patch.reviewFlags.includes('TEXT_FIXED')) {
        patch.reviewFlags.push('TEXT_FIXED');
      }
      changedFields.push('question');
    }
    if (field === 'choices' && Array.isArray(c.after)) {
      patch.choices = c.after.slice();
      if (!patch.reviewFlags.includes('CHOICE_FIXED')) {
        patch.reviewFlags.push('CHOICE_FIXED');
      }
      changedFields.push('choices');
    }
    if (field === 'number' || field === 'formula' || field === 'layout') {
      patch.recoveryMeta = {
        ...(patch.recoveryMeta || {}),
        [field]: c.after,
      };
      changedFields.push(field);
    }
  }

  return { patch, changedFields };
}

/**
 * @param {{
 *   questionId: string,
 *   changes: object[],
 *   confidence?: number,
 *   scope?: string,
 *   reviewer?: string,
 * }} input
 */
export function approveChanges(input = {}) {
  const questionId = String(input.questionId || '');
  if (!questionId) return { ok: false, error: 'missing_questionId' };
  const list = Array.isArray(input.changes) ? input.changes : [];
  if (!list.length) return { ok: false, error: 'no_changes' };

  const { patch, changedFields } = changesToOverridePatch(list);
  const overrideResult = saveOverride(questionId, patch, {
    status: 'REVIEWED',
    reviewer: input.reviewer || 'local-ai-recovery',
    changedFields: changedFields.length ? changedFields : ['ai_recovery'],
  });

  const doc = loadRecoveryDoc();
  doc.byQuestion[questionId] = {
    status: 'APPROVED',
    updatedAt: new Date().toISOString(),
    confidence: input.confidence ?? null,
    scope: input.scope || 'SELECTED',
  };
  doc.stats.approved = (doc.stats.approved || 0) + 1;
  doc.stats.pending = Math.max(0, (doc.stats.pending || 0) - 1);
  saveRecoveryDoc(doc);

  appendRecoveryHistory('approve', {
    questionId,
    reviewer: input.reviewer || 'local-ai-recovery',
    confidence: input.confidence ?? null,
    changedFields,
    scope: input.scope || 'SELECTED',
  });

  return { ok: true, override: overrideResult, changedFields };
}

export function rejectChanges(input = {}) {
  const questionId = String(input.questionId || '');
  if (!questionId) return { ok: false, error: 'missing_questionId' };
  const doc = loadRecoveryDoc();
  doc.byQuestion[questionId] = {
    status: 'REJECTED',
    updatedAt: new Date().toISOString(),
    confidence: input.confidence ?? null,
  };
  doc.stats.rejected = (doc.stats.rejected || 0) + 1;
  doc.stats.pending = Math.max(0, (doc.stats.pending || 0) - 1);
  saveRecoveryDoc(doc);
  appendRecoveryHistory('reject', {
    questionId,
    reviewer: input.reviewer || 'local',
    confidence: input.confidence ?? null,
    changedFields: [],
  });
  return { ok: true };
}

export function skipChanges(input = {}) {
  const questionId = String(input.questionId || '');
  if (!questionId) return { ok: false, error: 'missing_questionId' };
  const doc = loadRecoveryDoc();
  doc.byQuestion[questionId] = {
    status: 'SKIPPED',
    updatedAt: new Date().toISOString(),
  };
  doc.stats.skipped = (doc.stats.skipped || 0) + 1;
  doc.stats.pending = Math.max(0, (doc.stats.pending || 0) - 1);
  saveRecoveryDoc(doc);
  return { ok: true };
}

export function approveByField(questionId, pack, field, confidence) {
  const list = (pack?.changes || []).filter(
    (c) => String(c.field).toLowerCase() === String(field).toLowerCase(),
  );
  return approveChanges({
    questionId,
    changes: list,
    confidence,
    scope: `APPROVE_${String(field).toUpperCase()}`,
  });
}

export function approveAll(questionId, pack, confidence) {
  return approveChanges({
    questionId,
    changes: pack?.changes || [],
    confidence,
    scope: 'APPROVE_ALL',
  });
}

export function getApprovalSummary() {
  const doc = loadRecoveryDoc();
  return {
    pending: doc.stats.pending || 0,
    approved: doc.stats.approved || 0,
    rejected: doc.stats.rejected || 0,
    skipped: doc.stats.skipped || 0,
    history: doc.history,
    updatedAt: doc.updatedAt,
  };
}

export default {
  changesToOverridePatch,
  approveChanges,
  rejectChanges,
  skipChanges,
  approveByField,
  approveAll,
  getApprovalSummary,
};
