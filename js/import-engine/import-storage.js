/**
 * Sprint-19B — Import Storage (LocalStorage cache only)
 * Additive keys. Never deletes existing Storage Keys.
 * Never writes product Question / Pattern / Statistics DB files.
 */

import { getItem, setItem, STORAGE_KEYS } from '../storage.js';

export const IMPORT_STORAGE_VERSION = '19B';

function touch(doc) {
  doc.updatedAt = new Date().toISOString();
  return doc;
}

function emptyHistory() {
  return {
    schemaVersion: 'v1',
    runs: [],
    updatedAt: null,
  };
}

function emptyCache() {
  return {
    schemaVersion: 'v1',
    byYear: {},
    bySubject: {},
    progress: {
      totalPdf: 0,
      completed: 0,
      failed: 0,
      ocrQualityAvg: 0,
      questionCount: 0,
      subjectCount: 0,
    },
    updatedAt: null,
  };
}

export function loadImportHistory() {
  return getItem(STORAGE_KEYS.LEARNING_IMPORT_HISTORY_V1, emptyHistory()) || emptyHistory();
}

export function saveImportHistory(doc) {
  return setItem(STORAGE_KEYS.LEARNING_IMPORT_HISTORY_V1, touch(doc || emptyHistory()));
}

export function loadImportCache() {
  return getItem(STORAGE_KEYS.LEARNING_IMPORT_CACHE_V1, emptyCache()) || emptyCache();
}

export function saveImportCache(doc) {
  return setItem(STORAGE_KEYS.LEARNING_IMPORT_CACHE_V1, touch(doc || emptyCache()));
}

/**
 * Append one import run to history.
 * @param {object} run
 */
export function appendImportRun(run = {}) {
  const hist = loadImportHistory();
  if (!Array.isArray(hist.runs)) hist.runs = [];
  hist.runs.unshift({
    id: run.id || `import-${Date.now()}`,
    at: new Date().toISOString(),
    ...run,
  });
  if (hist.runs.length > 40) hist.runs = hist.runs.slice(0, 40);
  saveImportHistory(hist);
  return hist;
}

/**
 * Update progress snapshot for Dashboard.
 * @param {object} progress
 */
export function updateImportProgress(progress = {}) {
  const cache = loadImportCache();
  cache.progress = {
    ...(cache.progress || {}),
    ...progress,
  };
  saveImportCache(cache);
  return cache.progress;
}

/**
 * Relative output paths for subject candidate files (never product data/).
 * @param {string} subjectId
 */
export function subjectOutputPaths(subjectId) {
  const id = String(subjectId || 'accounting');
  return {
    questionDb: `subjects/${id}/question-db.json`,
    patternCandidate: `subjects/${id}/pattern-candidate.json`,
    formulaCandidate: `subjects/${id}/formula-candidate.json`,
  };
}

/**
 * Dashboard card payload.
 */
export function getImportDashboardCard() {
  const cache = loadImportCache();
  const hist = loadImportHistory();
  const p = cache.progress || {};
  return {
    id: 'importProgress',
    title: 'Import Progress',
    totalPdf: p.totalPdf ?? 0,
    completed: p.completed ?? 0,
    failed: p.failed ?? 0,
    ocrQuality: p.ocrQualityAvg ?? 0,
    questionCount: p.questionCount ?? 0,
    subjectCount: p.subjectCount ?? 0,
    lastRunAt: hist.runs?.[0]?.at || null,
    runs: hist.runs?.length || 0,
  };
}

export default {
  IMPORT_STORAGE_VERSION,
  loadImportHistory,
  saveImportHistory,
  loadImportCache,
  saveImportCache,
  appendImportRun,
  updateImportProgress,
  subjectOutputPaths,
  getImportDashboardCard,
};
