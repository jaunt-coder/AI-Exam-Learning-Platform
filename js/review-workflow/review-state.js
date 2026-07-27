/**
 * Sprint-12D — Review Workflow storage helpers
 */

import { getItem, setItem, STORAGE_KEYS } from '../storage.js';

export const WORKFLOW_KEYS = Object.freeze({
  WORKFLOW:
    STORAGE_KEYS.LEARNING_REVIEW_WORKFLOW_V1 || 'learning.review-workflow.v1',
  QUEUE: STORAGE_KEYS.LEARNING_REVIEW_QUEUE_V1 || 'learning.review-queue.v1',
  HISTORY:
    STORAGE_KEYS.LEARNING_REVIEW_HISTORY_V1 || 'learning.review-history.v1',
  DECISION:
    STORAGE_KEYS.LEARNING_REVIEW_DECISION_V1 || 'learning.review-decision.v1',
});

export const WORKFLOW_STATUSES = Object.freeze([
  'NEW',
  'NEEDS_REVIEW',
  'IN_PROGRESS',
  'WAITING_AI',
  'WAITING_HUMAN',
  'APPROVED',
  'REJECTED',
  'SKIPPED',
  'COMPLETED',
]);

export const REVIEW_REASONS = Object.freeze([
  'OCR_MISSING',
  'TABLE_MISSING',
  'PATTERN_MISMATCH',
  'SOLUTION_MISMATCH',
  'CHOICE_BROKEN',
  'CONFIDENCE_LOW',
  'LOW_QUALITY',
]);

function emptyDoc(extra = {}) {
  return {
    schemaVersion: 'v1',
    sprint: 'Sprint-12D',
    updatedAt: null,
    ...extra,
  };
}

export function loadWorkflowDoc() {
  const doc = getItem(WORKFLOW_KEYS.WORKFLOW, null);
  if (!doc || typeof doc !== 'object') {
    return emptyDoc({ byQuestion: {}, stats: {} });
  }
  return {
    ...emptyDoc(),
    ...doc,
    byQuestion: doc.byQuestion || {},
    stats: doc.stats || {},
  };
}

export function saveWorkflowDoc(doc) {
  const next = {
    ...(doc || loadWorkflowDoc()),
    schemaVersion: 'v1',
    updatedAt: new Date().toISOString(),
  };
  return setItem(WORKFLOW_KEYS.WORKFLOW, next);
}

export function loadQueueDoc() {
  const doc = getItem(WORKFLOW_KEYS.QUEUE, null);
  if (!doc || typeof doc !== 'object') {
    return emptyDoc({ items: [] });
  }
  return {
    ...emptyDoc(),
    ...doc,
    items: Array.isArray(doc.items) ? doc.items : [],
  };
}

export function saveQueueDoc(doc) {
  const next = {
    ...(doc || loadQueueDoc()),
    schemaVersion: 'v1',
    updatedAt: new Date().toISOString(),
  };
  return setItem(WORKFLOW_KEYS.QUEUE, next);
}

export function loadWorkflowHistoryDoc() {
  const doc = getItem(WORKFLOW_KEYS.HISTORY, null);
  if (!doc || typeof doc !== 'object') {
    return emptyDoc({ events: [] });
  }
  return {
    ...emptyDoc(),
    ...doc,
    events: Array.isArray(doc.events) ? doc.events : [],
  };
}

export function saveWorkflowHistoryDoc(doc) {
  const next = {
    ...(doc || loadWorkflowHistoryDoc()),
    schemaVersion: 'v1',
    updatedAt: new Date().toISOString(),
  };
  return setItem(WORKFLOW_KEYS.HISTORY, next);
}

export function loadDecisionDoc() {
  const doc = getItem(WORKFLOW_KEYS.DECISION, null);
  if (!doc || typeof doc !== 'object') {
    return emptyDoc({ byQuestion: {} });
  }
  return {
    ...emptyDoc(),
    ...doc,
    byQuestion: doc.byQuestion || {},
  };
}

export function saveDecisionDoc(doc) {
  const next = {
    ...(doc || loadDecisionDoc()),
    schemaVersion: 'v1',
    updatedAt: new Date().toISOString(),
  };
  return setItem(WORKFLOW_KEYS.DECISION, next);
}

export default {
  WORKFLOW_KEYS,
  WORKFLOW_STATUSES,
  REVIEW_REASONS,
  loadWorkflowDoc,
  saveWorkflowDoc,
  loadQueueDoc,
  saveQueueDoc,
  loadWorkflowHistoryDoc,
  saveWorkflowHistoryDoc,
  loadDecisionDoc,
  saveDecisionDoc,
};
