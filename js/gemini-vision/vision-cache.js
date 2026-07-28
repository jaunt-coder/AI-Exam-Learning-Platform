/**
 * Sprint-17B — Vision Cache Manager
 * Cache key = questionId + pdfHash + visionModel + promptVersion
 */

import {
  loadVisionCacheDoc,
  saveVisionCacheDoc,
  loadVisionHistoryDoc,
  saveVisionHistoryDoc,
  loadVisionQualityDoc,
  saveVisionQualityDoc,
  loadVisionConfig,
  idbSet,
  idbGet,
  monthKeyNow,
  emptyVisionCacheDoc,
} from './vision-storage.js';
import {
  VISION_MODEL,
  VISION_PROMPT_VERSION,
  estimateCostSavedUsd,
} from './vision-utils.js';

/**
 * @param {string} questionId
 * @param {string} pdfHash
 * @param {string} [visionModel]
 * @param {string} [promptVersion]
 */
export function buildVisionCacheKey(
  questionId,
  pdfHash,
  visionModel = VISION_MODEL,
  promptVersion = VISION_PROMPT_VERSION,
) {
  return [
    String(questionId || 'na'),
    String(pdfHash || '0'),
    String(visionModel || VISION_MODEL),
    String(promptVersion || VISION_PROMPT_VERSION),
  ].join('::');
}

export function peekVisionCache(key) {
  const doc = loadVisionCacheDoc();
  return doc.byKey?.[key] || null;
}

/**
 * Cache hit increments hits + apiSaved (Vision call avoided).
 */
export function getVisionCache(key) {
  const doc = loadVisionCacheDoc();
  ensureMonthStats(doc);
  const hit = doc.byKey?.[key] || null;
  if (hit?.payload) {
    doc.stats.hits = (doc.stats.hits || 0) + 1;
    doc.stats.apiSaved = (doc.stats.apiSaved || 0) + 1;
    doc.stats.monthApiSaved = (doc.stats.monthApiSaved || 0) + 1;
    saveVisionCacheDoc(doc);
    return { ...hit, fromCache: true };
  }
  doc.stats.misses = (doc.stats.misses || 0) + 1;
  saveVisionCacheDoc(doc);
  return null;
}

export function setVisionCache(key, entry = {}) {
  const doc = loadVisionCacheDoc();
  ensureMonthStats(doc);
  if (!doc.byKey) doc.byKey = {};
  doc.byKey[key] = {
    ...entry,
    cachedAt: new Date().toISOString(),
  };
  if (entry.provider === 'GEMINI_VISION') {
    doc.stats.visionCalls = (doc.stats.visionCalls || 0) + 1;
  }
  if (entry.recovered) {
    doc.stats.recoveries = (doc.stats.recoveries || 0) + 1;
  }
  if (entry.tableRecovered) {
    doc.stats.tableRecoveries = (doc.stats.tableRecoveries || 0) + 1;
  }
  if (entry.formulaRecovered) {
    doc.stats.formulaRecoveries = (doc.stats.formulaRecoveries || 0) + 1;
  }
  if (entry.source === 'ocr') {
    doc.stats.ocrUsed = (doc.stats.ocrUsed || 0) + 1;
  }
  saveVisionCacheDoc(doc);
  /* durable twin in IndexedDB (best-effort) */
  idbSet(key, doc.byKey[key]).catch(() => {});
  return doc.byKey[key];
}

/**
 * Prefer LocalStorage; fall back to IndexedDB for durability.
 */
export async function getVisionCacheDurable(key) {
  const local = peekVisionCache(key);
  if (local?.payload) return getVisionCache(key);
  const idb = await idbGet(key);
  if (idb?.payload) {
    setVisionCache(key, { ...idb, restoredFromIdb: true });
    return getVisionCache(key);
  }
  return getVisionCache(key);
}

export function appendVisionHistory(entry = {}) {
  const doc = loadVisionHistoryDoc();
  if (!Array.isArray(doc.entries)) doc.entries = [];
  doc.entries.push({ ...entry, recordedAt: new Date().toISOString() });
  if (doc.entries.length > 400) doc.entries = doc.entries.slice(-400);
  saveVisionHistoryDoc(doc);
  return doc;
}

export function recordVisionQuality(questionId, row = {}) {
  const doc = loadVisionQualityDoc();
  if (!doc.byQuestion) doc.byQuestion = {};
  if (!doc.totals) {
    doc.totals = {
      ocrScoreSum: 0,
      ocrScoreN: 0,
      visionScoreSum: 0,
      visionScoreN: 0,
      recoveries: 0,
      tableOk: 0,
      formulaOk: 0,
    };
  }
  doc.byQuestion[questionId] = { ...row, savedAt: new Date().toISOString() };
  if (typeof row.ocrScore === 'number') {
    doc.totals.ocrScoreSum += row.ocrScore;
    doc.totals.ocrScoreN += 1;
  }
  if (typeof row.visionScore === 'number') {
    doc.totals.visionScoreSum += row.visionScore;
    doc.totals.visionScoreN += 1;
  }
  if (row.recovered) doc.totals.recoveries += 1;
  if (row.tableOk) doc.totals.tableOk += 1;
  if (row.formulaOk) doc.totals.formulaOk += 1;
  saveVisionQualityDoc(doc);
  return doc;
}

function ensureMonthStats(doc) {
  if (!doc.stats) doc.stats = emptyVisionCacheDoc().stats;
  const mk = monthKeyNow();
  if (doc.stats.monthKey !== mk) {
    doc.stats.monthKey = mk;
    doc.stats.monthApiSaved = 0;
  }
}

/**
 * Dashboard projection — includes monthly API savings.
 */
export function getVisionDashboardStats() {
  const cache = loadVisionCacheDoc();
  const quality = loadVisionQualityDoc();
  const config = loadVisionConfig();
  ensureMonthStats(cache);
  const s = cache.stats || {};
  const t = quality.totals || {};
  const hits = Number(s.hits) || 0;
  const misses = Number(s.misses) || 0;
  const recoveries = Number(s.recoveries) || 0;
  const totalDecisions = hits + misses || recoveries + (Number(s.ocrUsed) || 0);
  const visionCalls = Number(s.visionCalls) || 0;
  const apiSaved = Number(s.apiSaved) || 0;
  const monthApiSaved = Number(s.monthApiSaved) || 0;
  const tableRecoveries = Number(s.tableRecoveries) || 0;
  const formulaRecoveries = Number(s.formulaRecoveries) || 0;

  return {
    schemaVersion: 'v1',
    visionCacheHit: hits,
    visionCacheMiss: misses,
    visionRecoveryPct: totalDecisions
      ? Math.round((recoveries / Math.max(totalDecisions, 1)) * 100)
      : 0,
    ocrQualityAverage: t.ocrScoreN
      ? Math.round(t.ocrScoreSum / t.ocrScoreN)
      : 0,
    visionQualityAverage: t.visionScoreN
      ? Math.round(t.visionScoreSum / t.visionScoreN)
      : 0,
    visionCalls,
    apiSaved,
    monthApiSaved,
    estimatedCostSavedUsd: estimateCostSavedUsd(apiSaved),
    monthEstimatedCostSavedUsd: estimateCostSavedUsd(monthApiSaved),
    tableRecoveryPct: recoveries
      ? Math.round((tableRecoveries / Math.max(recoveries, 1)) * 100)
      : 0,
    formulaRecoveryPct: recoveries
      ? Math.round((formulaRecoveries / Math.max(recoveries, 1)) * 100)
      : 0,
    ocrThreshold: config.ocrThreshold,
    visionModel: config.visionModel || VISION_MODEL,
    promptVersion: config.promptVersion || VISION_PROMPT_VERSION,
  };
}

export default {
  buildVisionCacheKey,
  peekVisionCache,
  getVisionCache,
  getVisionCacheDurable,
  setVisionCache,
  appendVisionHistory,
  recordVisionQuality,
  getVisionDashboardStats,
};
