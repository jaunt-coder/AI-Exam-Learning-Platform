/**
 * Sprint-12D — Review History (workflow events)
 */

import {
  loadWorkflowHistoryDoc,
  saveWorkflowHistoryDoc,
} from './review-state.js';

/**
 * @param {{
 *   questionId: string,
 *   reviewer?: string,
 *   decision?: string,
 *   comment?: string,
 *   status?: string,
 *   meta?: object,
 * }} entry
 */
export function appendWorkflowHistory(entry = {}) {
  const questionId = String(entry.questionId || '');
  if (!questionId) return null;
  const doc = loadWorkflowHistoryDoc();
  const event = {
    id: `rw_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    questionId,
    reviewer: entry.reviewer || 'local',
    decision: entry.decision || null,
    comment: entry.comment || '',
    status: entry.status || null,
    meta: entry.meta || null,
  };
  doc.events = [...doc.events, event];
  if (doc.events.length > 2000) doc.events = doc.events.slice(-2000);
  saveWorkflowHistoryDoc(doc);
  return event;
}

/**
 * @param {string} questionId
 */
export function getWorkflowHistory(questionId) {
  const doc = loadWorkflowHistoryDoc();
  if (!questionId) return doc.events.slice();
  return doc.events.filter((e) => e.questionId === questionId);
}

export default {
  appendWorkflowHistory,
  getWorkflowHistory,
};
