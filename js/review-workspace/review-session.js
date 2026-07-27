/**
 * Sprint-12E — Review Session stats (today)
 */

import {
  loadReviewSessionDoc,
  saveReviewSessionDoc,
} from './workspace-storage.js';

/**
 * @param {'approved'|'rejected'|'skipped'} kind
 * @param {number} [elapsedMs]
 */
export function recordSessionAction(kind, elapsedMs = 0) {
  const doc = loadReviewSessionDoc();
  const key =
    kind === 'approved'
      ? 'approved'
      : kind === 'rejected'
        ? 'rejected'
        : 'skipped';
  doc[key] = (doc[key] || 0) + 1;
  doc.processed = (doc.processed || 0) + 1;
  doc.totalMs = (doc.totalMs || 0) + Math.max(0, Number(elapsedMs) || 0);
  doc.actions = [
    ...(doc.actions || []),
    { kind: key, at: new Date().toISOString(), elapsedMs: elapsedMs || 0 },
  ].slice(-300);
  saveReviewSessionDoc(doc);
  return doc;
}

export function setSessionRemaining(count) {
  const doc = loadReviewSessionDoc();
  doc.remaining = Math.max(0, Number(count) || 0);
  saveReviewSessionDoc(doc);
  return doc;
}

export function getSessionSummary() {
  const doc = loadReviewSessionDoc();
  const processed = doc.processed || 0;
  const avgMs = processed ? Math.round((doc.totalMs || 0) / processed) : 0;
  const decided = (doc.approved || 0) + (doc.rejected || 0);
  const accuracy = decided
    ? Math.round(((doc.approved || 0) / decided) * 1000) / 10
    : 0;
  return {
    date: doc.date,
    remaining: doc.remaining || 0,
    processed,
    approved: doc.approved || 0,
    rejected: doc.rejected || 0,
    skipped: doc.skipped || 0,
    averageMs: avgMs,
    averageSeconds: Math.round(avgMs / 100) / 10,
    accuracy,
  };
}

export default {
  recordSessionAction,
  setSessionRemaining,
  getSessionSummary,
};
