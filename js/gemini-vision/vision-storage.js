/**
 * Sprint-17B — Vision Storage (LocalStorage + IndexedDB durable layer)
 * Additive keys only. Never touches Constitution / Learning Engine keys.
 */

import { getItem, setItem, STORAGE_KEYS } from '../storage.js';

export const VISION_CACHE_KEY =
  STORAGE_KEYS.LEARNING_VISION_CACHE_V1 || 'learning.vision-cache.v1';
export const VISION_HISTORY_KEY =
  STORAGE_KEYS.LEARNING_VISION_HISTORY_V1 || 'learning.vision-history.v1';
export const VISION_QUALITY_KEY =
  STORAGE_KEYS.LEARNING_VISION_QUALITY_V1 || 'learning.vision-quality.v1';
export const VISION_CONFIG_KEY =
  STORAGE_KEYS.LEARNING_VISION_CONFIG_V1 || 'learning.vision-config.v1';
export const VISION_IDB_NAME = 'aielp-vision-cache-v1';
export const VISION_IDB_STORE = 'blobs';

function touch(doc) {
  doc.updatedAt = new Date().toISOString();
  return doc;
}

export function emptyVisionCacheDoc() {
  return {
    schemaVersion: 'v1',
    byKey: {},
    stats: {
      hits: 0,
      misses: 0,
      visionCalls: 0,
      apiSaved: 0,
      recoveries: 0,
      ocrUsed: 0,
      tableRecoveries: 0,
      formulaRecoveries: 0,
      monthKey: monthKeyNow(),
      monthApiSaved: 0,
    },
    updatedAt: null,
  };
}

export function emptyVisionHistoryDoc() {
  return { schemaVersion: 'v1', entries: [], updatedAt: null };
}

export function emptyVisionQualityDoc() {
  return {
    schemaVersion: 'v1',
    byQuestion: {},
    totals: {
      ocrScoreSum: 0,
      ocrScoreN: 0,
      visionScoreSum: 0,
      visionScoreN: 0,
      recoveries: 0,
      tableOk: 0,
      formulaOk: 0,
    },
    updatedAt: null,
  };
}

export function monthKeyNow() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function loadVisionCacheDoc() {
  return getItem(VISION_CACHE_KEY, emptyVisionCacheDoc()) || emptyVisionCacheDoc();
}

export function saveVisionCacheDoc(doc) {
  return setItem(VISION_CACHE_KEY, touch(doc || emptyVisionCacheDoc()));
}

export function loadVisionHistoryDoc() {
  return getItem(VISION_HISTORY_KEY, emptyVisionHistoryDoc()) || emptyVisionHistoryDoc();
}

export function saveVisionHistoryDoc(doc) {
  return setItem(VISION_HISTORY_KEY, touch(doc || emptyVisionHistoryDoc()));
}

export function loadVisionQualityDoc() {
  return getItem(VISION_QUALITY_KEY, emptyVisionQualityDoc()) || emptyVisionQualityDoc();
}

export function saveVisionQualityDoc(doc) {
  return setItem(VISION_QUALITY_KEY, touch(doc || emptyVisionQualityDoc()));
}

export function loadVisionConfig() {
  const raw = getItem(VISION_CONFIG_KEY, null);
  return {
    schemaVersion: 'v1',
    ocrThreshold: Number(raw?.ocrThreshold) || 70,
    visionModel: raw?.visionModel || 'gemini-3-flash',
    promptVersion: raw?.promptVersion || '17B.1',
    backgroundPrewarm: raw?.backgroundPrewarm !== false,
    ...((raw && typeof raw === 'object') ? raw : {}),
  };
}

export function saveVisionConfig(patch = {}) {
  const next = { ...loadVisionConfig(), ...patch, updatedAt: new Date().toISOString() };
  setItem(VISION_CONFIG_KEY, next);
  return next;
}

/**
 * IndexedDB open helper (durable image / large payload cache).
 * @returns {Promise<IDBDatabase|null>}
 */
export function openVisionIdb() {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') {
        resolve(null);
        return;
      }
      const req = indexedDB.open(VISION_IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(VISION_IDB_STORE)) {
          db.createObjectStore(VISION_IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch (_err) {
      resolve(null);
    }
  });
}

/**
 * @param {string} key
 * @param {object} value
 */
export async function idbSet(key, value) {
  const db = await openVisionIdb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(VISION_IDB_STORE, 'readwrite');
      tx.objectStore(VISION_IDB_STORE).put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch (_err) {
      resolve(false);
    }
  });
}

/**
 * @param {string} key
 */
export async function idbGet(key) {
  const db = await openVisionIdb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(VISION_IDB_STORE, 'readonly');
      const req = tx.objectStore(VISION_IDB_STORE).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    } catch (_err) {
      resolve(null);
    }
  });
}

export default {
  VISION_CACHE_KEY,
  VISION_HISTORY_KEY,
  VISION_QUALITY_KEY,
  VISION_CONFIG_KEY,
  loadVisionCacheDoc,
  saveVisionCacheDoc,
  loadVisionHistoryDoc,
  saveVisionHistoryDoc,
  loadVisionQualityDoc,
  saveVisionQualityDoc,
  loadVisionConfig,
  saveVisionConfig,
  idbSet,
  idbGet,
  monthKeyNow,
  emptyVisionCacheDoc,
};
