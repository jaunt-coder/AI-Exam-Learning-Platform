/**
 * Sprint-17D.6 — Exam Reconstruction overlay storage
 * Additive LocalStorage only — never touches Question DB.
 */

import { getItem, setItem, STORAGE_KEYS } from '../storage.js';

export const RECONSTRUCTION_CACHE_KEY =
  STORAGE_KEYS.LEARNING_EXAM_RECONSTRUCTION_V1
  || 'learning.exam-reconstruction.v1';

function emptyDoc() {
  return {
    schemaVersion: '17D.6',
    byKey: {},
    stats: { hits: 0, misses: 0, writes: 0 },
    updatedAt: null,
  };
}

function touch(doc) {
  doc.updatedAt = new Date().toISOString();
  return doc;
}

/**
 * @param {string} questionId
 * @param {string} [pdfHash]
 * @param {string} [promptVersion]
 */
export function buildReconstructionCacheKey(
  questionId,
  pdfHash = '0',
  promptVersion = '17D.6',
) {
  return [String(questionId || 'na'), String(pdfHash || '0'), String(promptVersion || '17D.6')].join('::');
}

export function loadReconstructionCache() {
  return getItem(RECONSTRUCTION_CACHE_KEY, emptyDoc()) || emptyDoc();
}

export function getReconstructionCached(cacheKey) {
  const doc = loadReconstructionCache();
  const hit = doc.byKey?.[cacheKey] || null;
  if (hit) {
    doc.stats.hits = (doc.stats.hits || 0) + 1;
    setItem(RECONSTRUCTION_CACHE_KEY, touch(doc));
    return hit;
  }
  doc.stats.misses = (doc.stats.misses || 0) + 1;
  setItem(RECONSTRUCTION_CACHE_KEY, touch(doc));
  return null;
}

export function peekReconstructionCached(cacheKey) {
  const doc = loadReconstructionCache();
  return doc.byKey?.[cacheKey] || null;
}

export function setReconstructionCached(cacheKey, entry) {
  const doc = loadReconstructionCache();
  doc.byKey = doc.byKey || {};
  doc.byKey[cacheKey] = {
    ...entry,
    cachedAt: new Date().toISOString(),
  };
  doc.stats.writes = (doc.stats.writes || 0) + 1;
  setItem(RECONSTRUCTION_CACHE_KEY, touch(doc));
  return { ok: true };
}

export default {
  RECONSTRUCTION_CACHE_KEY,
  buildReconstructionCacheKey,
  getReconstructionCached,
  peekReconstructionCached,
  setReconstructionCached,
  loadReconstructionCache,
};
