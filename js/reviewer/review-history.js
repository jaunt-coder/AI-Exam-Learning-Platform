/**
 * Sprint-12A — Review History (version log + undo).
 */

import {
  loadHistoryDoc,
  saveHistoryDoc,
  loadOverridesDoc,
  saveOverridesDoc,
} from './review-storage.js';

/**
 * @param {string} questionId
 * @returns {object[]}
 */
export function getReviewHistory(questionId) {
  if (!questionId) return [];
  const doc = loadHistoryDoc();
  const list = doc.byQuestion?.[questionId];
  return Array.isArray(list) ? list.slice() : [];
}

/**
 * Append a history version entry.
 * @param {{
 *   questionId: string,
 *   reviewer?: string,
 *   changedFields?: string[],
 *   overrideSnapshot?: object,
 *   note?: string,
 * }} entry
 */
export function appendReviewHistory(entry = {}) {
  const questionId = String(entry.questionId || '');
  if (!questionId) return null;

  const doc = loadHistoryDoc();
  const list = Array.isArray(doc.byQuestion[questionId])
    ? doc.byQuestion[questionId]
    : [];
  const version = list.length + 1;
  const record = {
    version,
    questionId,
    reviewer: entry.reviewer || 'local',
    time: new Date().toISOString(),
    changedFields: Array.isArray(entry.changedFields)
      ? entry.changedFields
      : [],
    overrideSnapshot: entry.overrideSnapshot
      ? JSON.parse(JSON.stringify(entry.overrideSnapshot))
      : null,
    note: entry.note || '',
  };
  doc.byQuestion[questionId] = [...list, record];
  saveHistoryDoc(doc);
  return record;
}

/**
 * Undo to previous history version (restore override snapshot).
 * @param {string} questionId
 * @returns {{ ok: boolean, version?: number, error?: string }}
 */
export function undoReview(questionId) {
  const id = String(questionId || '');
  if (!id) return { ok: false, error: 'missing_questionId' };

  const historyDoc = loadHistoryDoc();
  const list = Array.isArray(historyDoc.byQuestion[id])
    ? historyDoc.byQuestion[id]
    : [];
  if (list.length < 2) {
    /* single or empty — clear override if last remains */
    if (list.length === 1) {
      const overridesDoc = loadOverridesDoc();
      delete overridesDoc.overrides[id];
      saveOverridesDoc(overridesDoc);
      historyDoc.byQuestion[id] = [];
      saveHistoryDoc(historyDoc);
      return { ok: true, version: 0 };
    }
    return { ok: false, error: 'nothing_to_undo' };
  }

  const previous = list[list.length - 2];
  const overridesDoc = loadOverridesDoc();
  if (previous.overrideSnapshot) {
    overridesDoc.overrides[id] = previous.overrideSnapshot;
  } else {
    delete overridesDoc.overrides[id];
  }
  saveOverridesDoc(overridesDoc);

  historyDoc.byQuestion[id] = list.slice(0, -1);
  saveHistoryDoc(historyDoc);
  return { ok: true, version: previous.version };
}

export default {
  getReviewHistory,
  appendReviewHistory,
  undoReview,
};
