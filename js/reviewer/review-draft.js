/**
 * Sprint-12F — Review Entry Draft (auto-save every 5s)
 * Override Layer only. Does not touch Question DB.
 */

import { getItem, setItem, STORAGE_KEYS } from '../storage.js';

const DRAFT_KEY =
  STORAGE_KEYS.LEARNING_REVIEW_DRAFT_V1 || 'learning.review-draft.v1';

const AUTOSAVE_MS = 5000;

let autosaveTimer = null;
let autosaveQuestionId = null;
let autosaveGetter = null;

function emptyDoc() {
  return {
    schemaVersion: 'v1',
    byQuestion: {},
    updatedAt: null,
  };
}

/**
 * @returns {{ schemaVersion: string, byQuestion: object, updatedAt: string|null }}
 */
export function loadDraftDoc() {
  try {
    const doc = getItem(DRAFT_KEY, null);
    if (!doc || typeof doc !== 'object') return emptyDoc();
    if (!doc.byQuestion || typeof doc.byQuestion !== 'object') {
      return { ...emptyDoc(), ...doc, byQuestion: {} };
    }
    return doc;
  } catch (_err) {
    return emptyDoc();
  }
}

/**
 * @param {object} doc
 * @returns {boolean}
 */
export function saveDraftDoc(doc) {
  try {
    const next = {
      schemaVersion: 'v1',
      byQuestion:
        doc?.byQuestion && typeof doc.byQuestion === 'object'
          ? doc.byQuestion
          : {},
      updatedAt: new Date().toISOString(),
    };
    return setItem(DRAFT_KEY, next);
  } catch (_err) {
    return false;
  }
}

/**
 * @param {string} questionId
 * @returns {object|null}
 */
export function loadDraft(questionId) {
  const id = String(questionId || '');
  if (!id) return null;
  const row = loadDraftDoc().byQuestion?.[id];
  return row && typeof row === 'object' ? { ...row } : null;
}

/**
 * @param {string} questionId
 * @param {object} draft
 * @returns {boolean}
 */
export function saveDraft(questionId, draft = {}) {
  const id = String(questionId || '');
  if (!id) return false;
  const doc = loadDraftDoc();
  doc.byQuestion[id] = {
    questionId: id,
    ...draft,
    savedAt: new Date().toISOString(),
  };
  return saveDraftDoc(doc);
}

/**
 * @param {string} questionId
 * @returns {boolean}
 */
export function clearDraft(questionId) {
  const id = String(questionId || '');
  if (!id) return false;
  const doc = loadDraftDoc();
  if (!doc.byQuestion?.[id]) return true;
  delete doc.byQuestion[id];
  return saveDraftDoc(doc);
}

/**
 * Start 5-second draft autosave.
 * @param {string} questionId
 * @param {() => object|null} getSnapshot
 */
export function startDraftAutosave(questionId, getSnapshot) {
  stopDraftAutosave();
  autosaveQuestionId = String(questionId || '');
  autosaveGetter = typeof getSnapshot === 'function' ? getSnapshot : null;
  if (!autosaveQuestionId || !autosaveGetter) return;

  autosaveTimer = window.setInterval(() => {
    try {
      const snap = autosaveGetter();
      if (snap && typeof snap === 'object') {
        saveDraft(autosaveQuestionId, snap);
      }
    } catch (_err) {
      /* ignore autosave errors */
    }
  }, AUTOSAVE_MS);
}

export function stopDraftAutosave() {
  if (autosaveTimer != null) {
    window.clearInterval(autosaveTimer);
    autosaveTimer = null;
  }
  autosaveQuestionId = null;
  autosaveGetter = null;
}

export const REVIEW_DRAFT_INTERVAL_MS = AUTOSAVE_MS;

export default {
  loadDraftDoc,
  saveDraftDoc,
  loadDraft,
  saveDraft,
  clearDraft,
  startDraftAutosave,
  stopDraftAutosave,
  REVIEW_DRAFT_INTERVAL_MS,
};
