/**
 * Sprint-12B — Recovery cache (LocalStorage only).
 * Keys: learning.recovery.v1 / learning.suggestion.v1 / learning.confidence.v1
 */

import { getItem, setItem, STORAGE_KEYS } from '../storage.js';

export const RECOVERY_KEYS = Object.freeze({
  RECOVERY: STORAGE_KEYS.LEARNING_RECOVERY_V1 || 'learning.recovery.v1',
  SUGGESTION: STORAGE_KEYS.LEARNING_SUGGESTION_V1 || 'learning.suggestion.v1',
  CONFIDENCE: STORAGE_KEYS.LEARNING_CONFIDENCE_V1 || 'learning.confidence.v1',
});

function emptyDoc(extra = {}) {
  return {
    schemaVersion: 'v1',
    sprint: 'Sprint-12B',
    updatedAt: null,
    byQuestion: {},
    ...extra,
  };
}

export function loadRecoveryDoc() {
  const doc = getItem(RECOVERY_KEYS.RECOVERY, null);
  if (!doc || typeof doc !== 'object') {
    return emptyDoc({
      history: { suggestion: [], approve: [], reject: [], confidence: [] },
      stats: { pending: 0, approved: 0, rejected: 0, skipped: 0 },
    });
  }
  return {
    ...emptyDoc(),
    ...doc,
    byQuestion: doc.byQuestion || {},
    history: {
      suggestion: [],
      approve: [],
      reject: [],
      confidence: [],
      ...(doc.history || {}),
    },
    stats: {
      pending: 0,
      approved: 0,
      rejected: 0,
      skipped: 0,
      ...(doc.stats || {}),
    },
  };
}

export function saveRecoveryDoc(doc) {
  const next = {
    ...(doc || loadRecoveryDoc()),
    schemaVersion: 'v1',
    updatedAt: new Date().toISOString(),
  };
  return setItem(RECOVERY_KEYS.RECOVERY, next);
}

export function loadSuggestionDoc() {
  const doc = getItem(RECOVERY_KEYS.SUGGESTION, null);
  if (!doc || typeof doc !== 'object') return emptyDoc();
  return { ...emptyDoc(), ...doc, byQuestion: doc.byQuestion || {} };
}

export function saveSuggestionDoc(doc) {
  const next = {
    ...(doc || emptyDoc()),
    schemaVersion: 'v1',
    updatedAt: new Date().toISOString(),
  };
  return setItem(RECOVERY_KEYS.SUGGESTION, next);
}

export function loadConfidenceDoc() {
  const doc = getItem(RECOVERY_KEYS.CONFIDENCE, null);
  if (!doc || typeof doc !== 'object') {
    return emptyDoc({
      aggregate: { averageConfidence: 0, totalChecked: 0 },
    });
  }
  return {
    ...emptyDoc(),
    ...doc,
    byQuestion: doc.byQuestion || {},
    aggregate: {
      averageConfidence: 0,
      totalChecked: 0,
      ...(doc.aggregate || {}),
    },
  };
}

export function saveConfidenceDoc(doc) {
  const next = {
    ...(doc || loadConfidenceDoc()),
    schemaVersion: 'v1',
    updatedAt: new Date().toISOString(),
  };
  return setItem(RECOVERY_KEYS.CONFIDENCE, next);
}

/**
 * Append typed history entry.
 * @param {'suggestion'|'approve'|'reject'|'confidence'} kind
 * @param {object} entry
 */
export function appendRecoveryHistory(kind, entry = {}) {
  const doc = loadRecoveryDoc();
  const key = String(kind || 'suggestion');
  if (!Array.isArray(doc.history[key])) doc.history[key] = [];
  doc.history[key].push({
    ...entry,
    time: entry.time || new Date().toISOString(),
  });
  if (doc.history[key].length > 200) {
    doc.history[key] = doc.history[key].slice(-200);
  }
  saveRecoveryDoc(doc);
  return doc;
}

export function exportSuggestionsJson() {
  return JSON.stringify(loadSuggestionDoc(), null, 2);
}

export function importSuggestionsJson(raw) {
  let parsed;
  try {
    parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (_err) {
    return { ok: false, error: 'invalid_json' };
  }
  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: 'invalid_object' };
  }
  const byQuestion =
    parsed.byQuestion && typeof parsed.byQuestion === 'object'
      ? parsed.byQuestion
      : parsed;
  if (!byQuestion || typeof byQuestion !== 'object' || Array.isArray(byQuestion)) {
    return { ok: false, error: 'invalid_suggestions' };
  }
  const doc = {
    schemaVersion: 'v1',
    sprint: 'Sprint-12B',
    updatedAt: new Date().toISOString(),
    byQuestion,
  };
  saveSuggestionDoc(doc);
  return { ok: true, count: Object.keys(byQuestion).length, doc };
}

export default {
  RECOVERY_KEYS,
  loadRecoveryDoc,
  saveRecoveryDoc,
  loadSuggestionDoc,
  saveSuggestionDoc,
  loadConfidenceDoc,
  saveConfidenceDoc,
  appendRecoveryHistory,
  exportSuggestionsJson,
  importSuggestionsJson,
};
