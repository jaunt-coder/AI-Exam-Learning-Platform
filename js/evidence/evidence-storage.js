/**
 * Sprint-14C — Evidence storage
 * Writes ONLY to evidence-cache / evidence-history / evidence-summary.
 * learning.evidence.v1 remains Evidence Pad SoT (read-only here).
 */

import { getItem, setItem, STORAGE_KEYS } from '../storage.js';

export const EVIDENCE_KEYS = Object.freeze({
  PAD: STORAGE_KEYS.LEARNING_EVIDENCE_V1 || 'learning.evidence.v1',
  CACHE: STORAGE_KEYS.LEARNING_EVIDENCE_CACHE_V1 || 'learning.evidence-cache.v1',
  HISTORY: STORAGE_KEYS.LEARNING_EVIDENCE_HISTORY_V1 || 'learning.evidence-history.v1',
  SUMMARY: STORAGE_KEYS.LEARNING_EVIDENCE_SUMMARY_V1 || 'learning.evidence-summary.v1',
});

function empty(extra = {}) {
  return {
    schemaVersion: 'v1',
    sprint: 'Sprint-14C',
    updatedAt: null,
    ...extra,
  };
}

/** Evidence Pad log — read only (do not overwrite). */
export function readEvidencePad() {
  const raw = getItem(EVIDENCE_KEYS.PAD, null);
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.events)) return raw.events;
  return [];
}

export function loadEvidenceHistory() {
  const doc = getItem(EVIDENCE_KEYS.HISTORY, null);
  if (!doc || typeof doc !== 'object') return empty({ byRecommendation: {}, decisions: [] });
  return {
    ...empty(),
    ...doc,
    byRecommendation: doc.byRecommendation || {},
    decisions: Array.isArray(doc.decisions) ? doc.decisions : [],
  };
}

export function saveEvidenceHistory(doc) {
  return setItem(EVIDENCE_KEYS.HISTORY, {
    ...(doc || loadEvidenceHistory()),
    schemaVersion: 'v1',
    sprint: 'Sprint-14C',
    updatedAt: new Date().toISOString(),
  });
}

export function loadEvidenceSummaryDoc() {
  const doc = getItem(EVIDENCE_KEYS.SUMMARY, null);
  if (!doc || typeof doc !== 'object') return empty({ byId: {} });
  return { ...empty(), ...doc, byId: doc.byId || {} };
}

export function saveEvidenceSummaryDoc(doc) {
  return setItem(EVIDENCE_KEYS.SUMMARY, {
    ...(doc || loadEvidenceSummaryDoc()),
    schemaVersion: 'v1',
    sprint: 'Sprint-14C',
    updatedAt: new Date().toISOString(),
  });
}

export function loadEvidenceCacheDoc() {
  const doc = getItem(EVIDENCE_KEYS.CACHE, null);
  if (!doc || typeof doc !== 'object') return empty({ entries: {} });
  return { ...empty(), ...doc, entries: doc.entries || {} };
}

export function saveEvidenceCacheDoc(doc) {
  return setItem(EVIDENCE_KEYS.CACHE, {
    ...(doc || loadEvidenceCacheDoc()),
    schemaVersion: 'v1',
    sprint: 'Sprint-14C',
    updatedAt: new Date().toISOString(),
  });
}

export default {
  EVIDENCE_KEYS,
  readEvidencePad,
  loadEvidenceHistory,
  saveEvidenceHistory,
  loadEvidenceSummaryDoc,
  saveEvidenceSummaryDoc,
  loadEvidenceCacheDoc,
  saveEvidenceCacheDoc,
};
