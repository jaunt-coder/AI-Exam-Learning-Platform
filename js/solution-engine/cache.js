/**
 * Sprint-15A+ — Solution Engine Cache / History / Profile Storage
 * Student-screen only. Never writes Question / Pattern / Statistics DB.
 */

import { getItem, setItem, STORAGE_KEYS } from '../storage.js';

export const SOLUTION_SCHEMA = 'v1';

function emptyCacheDoc() {
  return {
    schemaVersion: SOLUTION_SCHEMA,
    byKey: {},
    updatedAt: null,
  };
}

function emptyHistoryDoc() {
  return {
    schemaVersion: SOLUTION_SCHEMA,
    entries: [],
    updatedAt: null,
  };
}

function emptyMistakeProfile() {
  return {
    schemaVersion: SOLUTION_SCHEMA,
    byCode: {},
    byPattern: {},
    byQuestion: {},
    totalWrong: 0,
    heatmap: [],
    updatedAt: null,
  };
}

function emptyDiagnosisDoc() {
  return {
    schemaVersion: SOLUTION_SCHEMA,
    byQuestion: {},
    updatedAt: null,
  };
}

function emptyPrescriptionDoc() {
  return {
    schemaVersion: SOLUTION_SCHEMA,
    byQuestion: {},
    latest: null,
    updatedAt: null,
  };
}

function touch(doc) {
  doc.updatedAt = new Date().toISOString();
  return doc;
}

export function cacheKey(questionId, selectedAnswer, patternId) {
  return [
    String(questionId || 'na'),
    String(selectedAnswer ?? 'na'),
    String(patternId || 'na'),
  ].join('::');
}

export function loadSolutionCache() {
  return getItem(STORAGE_KEYS.LEARNING_SOLUTION_CACHE_V1, emptyCacheDoc()) || emptyCacheDoc();
}

export function saveSolutionCache(doc) {
  return setItem(STORAGE_KEYS.LEARNING_SOLUTION_CACHE_V1, touch(doc || emptyCacheDoc()));
}

export function getCachedSolution(key) {
  const doc = loadSolutionCache();
  return doc.byKey?.[key] || null;
}

export function setCachedSolution(key, pack) {
  const doc = loadSolutionCache();
  if (!doc.byKey) doc.byKey = {};
  doc.byKey[key] = {
    ...pack,
    cachedAt: new Date().toISOString(),
  };
  saveSolutionCache(doc);
  return doc.byKey[key];
}

export function loadSolutionHistory() {
  return getItem(STORAGE_KEYS.LEARNING_SOLUTION_HISTORY_V1, emptyHistoryDoc()) || emptyHistoryDoc();
}

export function appendSolutionHistory(entry) {
  const doc = loadSolutionHistory();
  if (!Array.isArray(doc.entries)) doc.entries = [];
  doc.entries.push({
    ...entry,
    recordedAt: new Date().toISOString(),
  });
  if (doc.entries.length > 200) doc.entries = doc.entries.slice(-200);
  saveSolutionHistory(doc);
  return doc;
}

export function saveSolutionHistory(doc) {
  return setItem(STORAGE_KEYS.LEARNING_SOLUTION_HISTORY_V1, touch(doc || emptyHistoryDoc()));
}

export function loadMistakeProfile() {
  return (
    getItem(STORAGE_KEYS.LEARNING_MISTAKE_PROFILE_V1, emptyMistakeProfile())
    || emptyMistakeProfile()
  );
}

export function saveMistakeProfile(doc) {
  return setItem(
    STORAGE_KEYS.LEARNING_MISTAKE_PROFILE_V1,
    touch(doc || emptyMistakeProfile()),
  );
}

/**
 * Accumulate mistake counts for Dashboard heatmap.
 * @param {{ code: string, label?: string, patternId?: string, questionId?: string }} hit
 */
export function recordMistakeHit(hit = {}) {
  const doc = loadMistakeProfile();
  const code = String(hit.code || 'UNKNOWN');
  if (!doc.byCode[code]) {
    doc.byCode[code] = { code, label: hit.label || code, count: 0 };
  }
  doc.byCode[code].count += 1;
  if (hit.label) doc.byCode[code].label = hit.label;

  if (hit.patternId) {
    if (!doc.byPattern[hit.patternId]) doc.byPattern[hit.patternId] = {};
    doc.byPattern[hit.patternId][code] =
      (doc.byPattern[hit.patternId][code] || 0) + 1;
  }
  if (hit.questionId) {
    if (!doc.byQuestion[hit.questionId]) doc.byQuestion[hit.questionId] = {};
    doc.byQuestion[hit.questionId][code] =
      (doc.byQuestion[hit.questionId][code] || 0) + 1;
  }
  doc.totalWrong = (doc.totalWrong || 0) + 1;
  doc.heatmap = buildMistakeHeatmap(doc);
  saveMistakeProfile(doc);
  return doc;
}

/**
 * Dashboard-ready heatmap rows: [{ code, label, count, intensity 0..1 }]
 */
export function buildMistakeHeatmap(doc = null) {
  const profile = doc || loadMistakeProfile();
  const rows = Object.values(profile.byCode || {});
  const max = Math.max(1, ...rows.map((r) => Number(r.count) || 0));
  return rows
    .map((r) => ({
      code: r.code,
      label: r.label || r.code,
      count: Number(r.count) || 0,
      intensity: Math.round(((Number(r.count) || 0) / max) * 100) / 100,
    }))
    .sort((a, b) => b.count - a.count);
}

export function loadDiagnosisDoc() {
  return getItem(STORAGE_KEYS.LEARNING_DIAGNOSIS_V1, emptyDiagnosisDoc()) || emptyDiagnosisDoc();
}

export function saveDiagnosisDoc(doc) {
  return setItem(STORAGE_KEYS.LEARNING_DIAGNOSIS_V1, touch(doc || emptyDiagnosisDoc()));
}

export function persistDiagnosis(questionId, diagnosis) {
  const doc = loadDiagnosisDoc();
  if (!doc.byQuestion) doc.byQuestion = {};
  doc.byQuestion[questionId] = {
    ...diagnosis,
    savedAt: new Date().toISOString(),
  };
  saveDiagnosisDoc(doc);
  return doc.byQuestion[questionId];
}

export function loadPrescriptionDoc() {
  return (
    getItem(STORAGE_KEYS.LEARNING_PRESCRIPTION_V1, emptyPrescriptionDoc())
    || emptyPrescriptionDoc()
  );
}

export function savePrescriptionDoc(doc) {
  return setItem(
    STORAGE_KEYS.LEARNING_PRESCRIPTION_V1,
    touch(doc || emptyPrescriptionDoc()),
  );
}

export function persistPrescription(questionId, prescription) {
  const doc = loadPrescriptionDoc();
  if (!doc.byQuestion) doc.byQuestion = {};
  doc.byQuestion[questionId] = {
    ...prescription,
    savedAt: new Date().toISOString(),
  };
  doc.latest = doc.byQuestion[questionId];
  savePrescriptionDoc(doc);
  return doc.byQuestion[questionId];
}

export default {
  SOLUTION_SCHEMA,
  cacheKey,
  loadSolutionCache,
  saveSolutionCache,
  getCachedSolution,
  setCachedSolution,
  loadSolutionHistory,
  appendSolutionHistory,
  loadMistakeProfile,
  saveMistakeProfile,
  recordMistakeHit,
  buildMistakeHeatmap,
  loadDiagnosisDoc,
  persistDiagnosis,
  loadPrescriptionDoc,
  persistPrescription,
};
