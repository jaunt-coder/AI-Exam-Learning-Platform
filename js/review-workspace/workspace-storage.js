/**
 * Sprint-12E — Reviewer Workspace storage
 */

import { getItem, setItem, STORAGE_KEYS } from '../storage.js';

export const WORKSPACE_KEYS = Object.freeze({
  WORKSPACE: STORAGE_KEYS.LEARNING_WORKSPACE_V1 || 'learning.workspace.v1',
  SESSION:
    STORAGE_KEYS.LEARNING_REVIEW_SESSION_V1 || 'learning.review-session.v1',
  QUICK_FIX: STORAGE_KEYS.LEARNING_QUICK_FIX_V1 || 'learning.quick-fix.v1',
  FOCUS: STORAGE_KEYS.LEARNING_FOCUS_MODE_V1 || 'learning.focus-mode.v1',
});

function empty(extra = {}) {
  return {
    schemaVersion: 'v1',
    sprint: 'Sprint-12E',
    updatedAt: null,
    ...extra,
  };
}

export function loadWorkspaceDoc() {
  const doc = getItem(WORKSPACE_KEYS.WORKSPACE, null);
  if (!doc || typeof doc !== 'object') {
    return empty({
      currentQuestionId: null,
      selectedIds: [],
      lastAction: null,
    });
  }
  return {
    ...empty(),
    ...doc,
    selectedIds: Array.isArray(doc.selectedIds) ? doc.selectedIds : [],
  };
}

export function saveWorkspaceDoc(doc) {
  const next = {
    ...(doc || loadWorkspaceDoc()),
    schemaVersion: 'v1',
    updatedAt: new Date().toISOString(),
  };
  return setItem(WORKSPACE_KEYS.WORKSPACE, next);
}

export function loadReviewSessionDoc() {
  const doc = getItem(WORKSPACE_KEYS.SESSION, null);
  const today = new Date().toISOString().slice(0, 10);
  if (!doc || typeof doc !== 'object' || doc.date !== today) {
    return empty({
      date: today,
      remaining: 0,
      processed: 0,
      approved: 0,
      rejected: 0,
      skipped: 0,
      totalMs: 0,
      actions: [],
    });
  }
  return {
    ...empty(),
    ...doc,
    actions: Array.isArray(doc.actions) ? doc.actions : [],
  };
}

export function saveReviewSessionDoc(doc) {
  const next = {
    ...(doc || loadReviewSessionDoc()),
    schemaVersion: 'v1',
    updatedAt: new Date().toISOString(),
  };
  return setItem(WORKSPACE_KEYS.SESSION, next);
}

export function loadQuickFixDoc() {
  const doc = getItem(WORKSPACE_KEYS.QUICK_FIX, null);
  if (!doc || typeof doc !== 'object') {
    return empty({ byQuestion: {}, history: [] });
  }
  return {
    ...empty(),
    ...doc,
    byQuestion: doc.byQuestion || {},
    history: Array.isArray(doc.history) ? doc.history : [],
  };
}

export function saveQuickFixDoc(doc) {
  const next = {
    ...(doc || loadQuickFixDoc()),
    schemaVersion: 'v1',
    updatedAt: new Date().toISOString(),
  };
  return setItem(WORKSPACE_KEYS.QUICK_FIX, next);
}

export function loadFocusModeDoc() {
  const doc = getItem(WORKSPACE_KEYS.FOCUS, null);
  if (!doc || typeof doc !== 'object') {
    return empty({ enabled: false });
  }
  return { ...empty(), enabled: Boolean(doc.enabled), ...doc };
}

export function saveFocusModeDoc(doc) {
  const next = {
    ...(doc || loadFocusModeDoc()),
    schemaVersion: 'v1',
    updatedAt: new Date().toISOString(),
  };
  return setItem(WORKSPACE_KEYS.FOCUS, next);
}

export default {
  WORKSPACE_KEYS,
  loadWorkspaceDoc,
  saveWorkspaceDoc,
  loadReviewSessionDoc,
  saveReviewSessionDoc,
  loadQuickFixDoc,
  saveQuickFixDoc,
  loadFocusModeDoc,
  saveFocusModeDoc,
};
