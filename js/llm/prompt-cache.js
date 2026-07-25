/**
 * Sprint-11A — Prompt Response Cache
 * Storage: learning.llm.cache.v1
 */

import { getItem, setItem, STORAGE_KEYS } from '../storage.js';
import { hashPromptSnapshot } from './prompt-hash.js';

export const LLM_CACHE_KEY =
  STORAGE_KEYS.LEARNING_LLM_CACHE_V1 || 'learning.llm.cache.v1';

/**
 * @returns {{ schemaVersion: string, entries: object }}
 */
export function loadPromptCache() {
  const raw = getItem(LLM_CACHE_KEY, null);
  if (!raw || typeof raw !== 'object') {
    return { schemaVersion: 'v1', entries: {} };
  }
  return {
    schemaVersion: raw.schemaVersion || 'v1',
    entries:
      raw.entries && typeof raw.entries === 'object' ? raw.entries : {},
  };
}

/**
 * @param {{ schemaVersion?: string, entries: object }} doc
 */
export function savePromptCache(doc) {
  return setItem(LLM_CACHE_KEY, {
    schemaVersion: doc?.schemaVersion || 'v1',
    entries: doc?.entries && typeof doc.entries === 'object' ? doc.entries : {},
    updatedAt: new Date().toISOString(),
  });
}

/**
 * @param {string} prompt
 * @param {object} snapshot
 * @returns {string|null}
 */
export function getCachedResponse(prompt, snapshot) {
  const hash = hashPromptSnapshot(prompt, snapshot);
  const doc = loadPromptCache();
  const hit = doc.entries[hash];
  if (!hit || typeof hit.response !== 'string') return null;
  return hit.response;
}

/**
 * @param {string} prompt
 * @param {object} snapshot
 * @param {string} response
 * @returns {string} hash
 */
export function setCachedResponse(prompt, snapshot, response) {
  const hash = hashPromptSnapshot(prompt, snapshot);
  const doc = loadPromptCache();
  doc.entries[hash] = {
    hash,
    response: String(response || ''),
    createdAt: new Date().toISOString(),
  };
  savePromptCache(doc);
  return hash;
}

export default {
  LLM_CACHE_KEY,
  loadPromptCache,
  savePromptCache,
  getCachedResponse,
  setCachedResponse,
  hashPromptSnapshot,
};
