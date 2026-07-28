/**
 * Sprint-17A — Gemini Cache Manager
 * Keys: learning.gemini-cache.v1 | history | quality | version
 * Cache key = questionId + overrideVersion + modelVersion + promptVersion
 */

import { getItem, setItem, STORAGE_KEYS } from '../storage.js';
import { MODEL_VERSION } from './problem-solver.js';
import { PROMPT_VERSION } from './prompt-builder.js';

export const GEMINI_CACHE_KEY =
  STORAGE_KEYS.LEARNING_GEMINI_CACHE_V1 || 'learning.gemini-cache.v1';
export const GEMINI_HISTORY_KEY =
  STORAGE_KEYS.LEARNING_GEMINI_HISTORY_V1 || 'learning.gemini-history.v1';
export const GEMINI_QUALITY_KEY =
  STORAGE_KEYS.LEARNING_GEMINI_QUALITY_V1 || 'learning.gemini-quality.v1';
export const GEMINI_VERSION_KEY =
  STORAGE_KEYS.LEARNING_GEMINI_VERSION_V1 || 'learning.gemini-version.v1';

function emptyCache() {
  return {
    schemaVersion: 'v1',
    byKey: {},
    stats: { hits: 0, misses: 0, generations: 0, totalMs: 0 },
    updatedAt: null,
  };
}

function emptyHistory() {
  return { schemaVersion: 'v1', entries: [], updatedAt: null };
}

function emptyQuality() {
  return {
    schemaVersion: 'v1',
    byQuestion: {},
    totals: { missingCount: 0, qualitySum: 0, qualityN: 0, confidenceSum: 0, confidenceN: 0 },
    updatedAt: null,
  };
}

function touch(doc) {
  doc.updatedAt = new Date().toISOString();
  return doc;
}

/**
 * @param {string} questionId
 * @param {string|number} overrideVersion
 * @param {string} [modelVersion]
 * @param {string} [promptVersion]
 */
export function buildGeminiCacheKey(
  questionId,
  overrideVersion,
  modelVersion = MODEL_VERSION,
  promptVersion = PROMPT_VERSION,
) {
  return [
    String(questionId || 'na'),
    String(overrideVersion ?? '0'),
    String(modelVersion || MODEL_VERSION),
    String(promptVersion || PROMPT_VERSION),
  ].join('::');
}

export function loadGeminiCache() {
  return getItem(GEMINI_CACHE_KEY, emptyCache()) || emptyCache();
}

export function saveGeminiCache(doc) {
  return setItem(GEMINI_CACHE_KEY, touch(doc || emptyCache()));
}

export function getCachedGemini(key) {
  const doc = loadGeminiCache();
  const hit = doc.byKey?.[key] || null;
  if (hit?.payload) {
    doc.stats = doc.stats || { hits: 0, misses: 0, generations: 0, totalMs: 0 };
    doc.stats.hits = (doc.stats.hits || 0) + 1;
    saveGeminiCache(doc);
    return { ...hit, fromCache: true };
  }
  doc.stats = doc.stats || { hits: 0, misses: 0, generations: 0, totalMs: 0 };
  doc.stats.misses = (doc.stats.misses || 0) + 1;
  saveGeminiCache(doc);
  return null;
}

/**
 * Peek without mutating hit/miss counters.
 */
export function peekCachedGemini(key) {
  const doc = loadGeminiCache();
  return doc.byKey?.[key] || null;
}

export function setCachedGemini(key, entry = {}) {
  const doc = loadGeminiCache();
  if (!doc.byKey) doc.byKey = {};
  doc.byKey[key] = {
    ...entry,
    cachedAt: new Date().toISOString(),
  };
  doc.stats = doc.stats || { hits: 0, misses: 0, generations: 0, totalMs: 0 };
  doc.stats.generations = (doc.stats.generations || 0) + 1;
  if (typeof entry.durationMs === 'number') {
    doc.stats.totalMs = (doc.stats.totalMs || 0) + entry.durationMs;
  }
  saveGeminiCache(doc);
  return doc.byKey[key];
}

export function appendGeminiHistory(entry = {}) {
  const doc = getItem(GEMINI_HISTORY_KEY, emptyHistory()) || emptyHistory();
  if (!Array.isArray(doc.entries)) doc.entries = [];
  doc.entries.push({ ...entry, recordedAt: new Date().toISOString() });
  if (doc.entries.length > 300) doc.entries = doc.entries.slice(-300);
  setItem(GEMINI_HISTORY_KEY, touch(doc));
  return doc;
}

export function recordGeminiQuality(questionId, quality = {}, confidence = 0) {
  const doc = getItem(GEMINI_QUALITY_KEY, emptyQuality()) || emptyQuality();
  if (!doc.byQuestion) doc.byQuestion = {};
  if (!doc.totals) {
    doc.totals = {
      missingCount: 0,
      qualitySum: 0,
      qualityN: 0,
      confidenceSum: 0,
      confidenceN: 0,
    };
  }
  const missingCount = Number(quality.missingCount) || (quality.missing?.length ?? 0);
  doc.byQuestion[questionId] = {
    ...quality,
    confidence,
    savedAt: new Date().toISOString(),
  };
  doc.totals.missingCount = (doc.totals.missingCount || 0) + missingCount;
  doc.totals.qualitySum = (doc.totals.qualitySum || 0) + (Number(quality.score) || 0);
  doc.totals.qualityN = (doc.totals.qualityN || 0) + 1;
  doc.totals.confidenceSum = (doc.totals.confidenceSum || 0) + (Number(confidence) || 0);
  doc.totals.confidenceN = (doc.totals.confidenceN || 0) + 1;
  setItem(GEMINI_QUALITY_KEY, touch(doc));
  return doc;
}

export function loadGeminiVersionDoc() {
  return (
    getItem(GEMINI_VERSION_KEY, null) || {
      schemaVersion: 'v1',
      modelVersion: MODEL_VERSION,
      promptVersion: PROMPT_VERSION,
      updatedAt: new Date().toISOString(),
    }
  );
}

export function saveGeminiVersionDoc(doc = {}) {
  const next = {
    schemaVersion: 'v1',
    modelVersion: doc.modelVersion || MODEL_VERSION,
    promptVersion: doc.promptVersion || PROMPT_VERSION,
    updatedAt: new Date().toISOString(),
  };
  setItem(GEMINI_VERSION_KEY, next);
  return next;
}

/**
 * Dashboard metrics (read-only projection).
 */
export function getGeminiDashboardStats() {
  const cache = loadGeminiCache();
  const quality = getItem(GEMINI_QUALITY_KEY, emptyQuality()) || emptyQuality();
  const version = loadGeminiVersionDoc();
  const stats = cache.stats || {};
  const hits = Number(stats.hits) || 0;
  const misses = Number(stats.misses) || 0;
  const generations = Number(stats.generations) || 0;
  const totalMs = Number(stats.totalMs) || 0;
  const q = quality.totals || {};
  return {
    schemaVersion: 'v1',
    cacheHit: hits,
    cacheMiss: misses,
    averageGenerationTime: generations ? Math.round(totalMs / generations) : 0,
    averageConfidence: q.confidenceN
      ? Math.round(q.confidenceSum / q.confidenceN)
      : 0,
    averageQuality: q.qualityN ? Math.round(q.qualitySum / q.qualityN) : 0,
    missingCount: Number(q.missingCount) || 0,
    modelVersion: version.modelVersion,
    promptVersion: version.promptVersion,
  };
}

export default {
  buildGeminiCacheKey,
  getCachedGemini,
  peekCachedGemini,
  setCachedGemini,
  appendGeminiHistory,
  recordGeminiQuality,
  getGeminiDashboardStats,
  loadGeminiVersionDoc,
  saveGeminiVersionDoc,
  GEMINI_CACHE_KEY,
  GEMINI_HISTORY_KEY,
  GEMINI_QUALITY_KEY,
  GEMINI_VERSION_KEY,
};
