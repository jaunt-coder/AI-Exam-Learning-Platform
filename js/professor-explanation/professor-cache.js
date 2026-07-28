/**
 * Sprint-17D — Professor Explanation Cache
 * Key: questionId + overrideVersion + geminiModel + professorPromptVersion
 * Auto bulk generation is forbidden — Manual Trigger only (engine respects saveCache flag).
 */

import { getItem, setItem, STORAGE_KEYS } from '../storage.js';
import { MODEL_VERSION } from '../gemini-solver/problem-solver.js';
import { PROFESSOR_PROMPT_VERSION } from './professor-prompt.js';

export const PROFESSOR_CACHE_KEY =
  STORAGE_KEYS.LEARNING_PROFESSOR_CACHE_V1 || 'learning.professor-cache.v1';
export const PROFESSOR_QUALITY_KEY =
  STORAGE_KEYS.LEARNING_PROFESSOR_QUALITY_V1 || 'learning.professor-quality.v1';
export const PROFESSOR_HISTORY_KEY =
  STORAGE_KEYS.LEARNING_PROFESSOR_HISTORY_V1 || 'learning.professor-history.v1';

function emptyCache() {
  return {
    schemaVersion: '17D',
    byKey: {},
    stats: { hits: 0, misses: 0, generations: 0, regenerations: 0, totalMs: 0 },
    updatedAt: null,
  };
}

function emptyQuality() {
  return {
    schemaVersion: '17D',
    byQuestion: {},
    totals: {
      qualitySum: 0,
      qualityN: 0,
      regenSum: 0,
    },
    lowQuality: [],
    topRegenerated: [],
    updatedAt: null,
  };
}

function emptyHistory() {
  return { schemaVersion: '17D', entries: [], updatedAt: null };
}

function touch(doc) {
  doc.updatedAt = new Date().toISOString();
  return doc;
}

/**
 * @param {string} questionId
 * @param {string|number} overrideVersion
 * @param {string} [geminiModel]
 * @param {string} [professorPromptVersion]
 */
export function buildProfessorCacheKey(
  questionId,
  overrideVersion,
  geminiModel = MODEL_VERSION,
  professorPromptVersion = PROFESSOR_PROMPT_VERSION,
) {
  return [
    String(questionId || 'na'),
    String(overrideVersion ?? '0'),
    String(geminiModel || MODEL_VERSION),
    String(professorPromptVersion || PROFESSOR_PROMPT_VERSION),
  ].join('::');
}

export function loadProfessorCache() {
  return getItem(PROFESSOR_CACHE_KEY, emptyCache()) || emptyCache();
}

export function peekProfessorCache(cacheKey) {
  const doc = loadProfessorCache();
  return doc.byKey?.[cacheKey] || null;
}

export function getProfessorCached(cacheKey) {
  const doc = loadProfessorCache();
  const hit = doc.byKey?.[cacheKey] || null;
  if (hit) {
    doc.stats.hits = (doc.stats.hits || 0) + 1;
    setItem(PROFESSOR_CACHE_KEY, touch(doc));
    return hit;
  }
  doc.stats.misses = (doc.stats.misses || 0) + 1;
  setItem(PROFESSOR_CACHE_KEY, touch(doc));
  return null;
}

/**
 * Manual / approved writes only — engine must pass allowWrite:true.
 */
export function setProfessorCached(cacheKey, entry, options = {}) {
  if (options.allowWrite === false) return { ok: false, reason: 'write_blocked' };
  const doc = loadProfessorCache();
  doc.byKey = doc.byKey || {};
  doc.byKey[cacheKey] = {
    ...entry,
    cachedAt: new Date().toISOString(),
    promptVersion: entry.promptVersion || PROFESSOR_PROMPT_VERSION,
  };
  doc.stats.generations = (doc.stats.generations || 0) + 1;
  if (entry.regenerated) {
    doc.stats.regenerations = (doc.stats.regenerations || 0) + 1;
  }
  if (typeof entry.durationMs === 'number') {
    doc.stats.totalMs = (doc.stats.totalMs || 0) + entry.durationMs;
  }
  setItem(PROFESSOR_CACHE_KEY, touch(doc));
  return { ok: true };
}

export function recordProfessorQuality(questionId, report = {}, meta = {}) {
  const doc = getItem(PROFESSOR_QUALITY_KEY, emptyQuality()) || emptyQuality();
  const prev = doc.byQuestion[questionId] || { regenCount: 0, scores: [] };
  const score = Number(report.score);
  const scores = Array.isArray(prev.scores) ? prev.scores.slice(-19) : [];
  if (Number.isFinite(score)) scores.push(score);

  const regenCount = (prev.regenCount || 0) + (meta.regenerated ? 1 : 0);
  doc.byQuestion[questionId] = {
    ...prev,
    lastScore: score,
    lastDecision: report.decision,
    missingSections: report.missing || report.missingSections || [],
    scores,
    regenCount,
    updatedAt: new Date().toISOString(),
  };

  if (Number.isFinite(score)) {
    doc.totals.qualitySum = (doc.totals.qualitySum || 0) + score;
    doc.totals.qualityN = (doc.totals.qualityN || 0) + 1;
  }
  if (meta.regenerated) {
    doc.totals.regenSum = (doc.totals.regenSum || 0) + 1;
  }

  const rows = Object.entries(doc.byQuestion).map(([qid, row]) => ({
    questionId: qid,
    score: row.lastScore,
    regenCount: row.regenCount || 0,
  }));
  doc.lowQuality = rows
    .filter((r) => Number.isFinite(r.score) && r.score < 90)
    .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
    .slice(0, 10);
  doc.topRegenerated = rows
    .sort((a, b) => (b.regenCount || 0) - (a.regenCount || 0))
    .slice(0, 10);

  setItem(PROFESSOR_QUALITY_KEY, touch(doc));
  return doc.byQuestion[questionId];
}

export function appendProfessorHistory(entry) {
  const doc = getItem(PROFESSOR_HISTORY_KEY, emptyHistory()) || emptyHistory();
  doc.entries = [{ ...entry, at: new Date().toISOString() }, ...(doc.entries || [])].slice(0, 300);
  setItem(PROFESSOR_HISTORY_KEY, touch(doc));
}

export function getProfessorDashboardStats() {
  const cache = loadProfessorCache();
  const quality = getItem(PROFESSOR_QUALITY_KEY, emptyQuality()) || emptyQuality();
  const n = quality.totals.qualityN || 0;
  return {
    schemaVersion: '17D',
    cacheHit: cache.stats?.hits || 0,
    cacheMiss: cache.stats?.misses || 0,
    generations: cache.stats?.generations || 0,
    regenerations: cache.stats?.regenerations || quality.totals.regenSum || 0,
    averageQuality: n ? Math.round((quality.totals.qualitySum || 0) / n) : 0,
    lowQualityTop10: quality.lowQuality || [],
    topRegenerated: quality.topRegenerated || [],
    promptVersion: PROFESSOR_PROMPT_VERSION,
    modelVersion: MODEL_VERSION,
  };
}

export default {
  buildProfessorCacheKey,
  getProfessorCached,
  peekProfessorCache,
  setProfessorCached,
  recordProfessorQuality,
  appendProfessorHistory,
  getProfessorDashboardStats,
  PROFESSOR_PROMPT_VERSION,
  PROFESSOR_CACHE_KEY,
};
