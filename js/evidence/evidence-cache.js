/**
 * Sprint-14C — Evidence cache (memoization + LocalStorage)
 */

import {
  loadEvidenceCacheDoc,
  saveEvidenceCacheDoc,
} from './evidence-storage.js';

const memory = new Map();
const TTL_MS = 5 * 60 * 1000;

export function getCachedEvidence(key) {
  if (!key) return null;
  const mem = memory.get(key);
  if (mem && Date.now() - mem.at < TTL_MS) return mem.value;

  const doc = loadEvidenceCacheDoc();
  const entry = doc.entries?.[key];
  if (!entry) return null;
  if (entry.expiresAt && Date.parse(entry.expiresAt) < Date.now()) return null;
  memory.set(key, { at: Date.now(), value: entry.payload });
  return entry.payload;
}

export function setCachedEvidence(key, payload) {
  if (!key) return false;
  memory.set(key, { at: Date.now(), value: payload });
  const doc = loadEvidenceCacheDoc();
  doc.entries[key] = {
    payload,
    expiresAt: new Date(Date.now() + TTL_MS).toISOString(),
  };
  /* keep cache bounded */
  const keys = Object.keys(doc.entries);
  if (keys.length > 200) {
    keys.slice(0, keys.length - 200).forEach((k) => delete doc.entries[k]);
  }
  return saveEvidenceCacheDoc(doc);
}

export function clearEvidenceMemoryCache() {
  memory.clear();
}

export default {
  getCachedEvidence,
  setCachedEvidence,
  clearEvidenceMemoryCache,
};
