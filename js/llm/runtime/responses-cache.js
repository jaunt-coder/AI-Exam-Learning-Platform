/**
 * Sprint-17E — Runtime-local ephemeral cache (does NOT rename Storage Keys)
 * Uses existing learning.llm.cache.v1 via prompt-cache when available,
 * plus in-memory metrics for Dashboard.
 */

import { getCachedResponse, setCachedResponse } from '../prompt-cache.js';

const metrics = {
  hits: 0,
  misses: 0,
  generations: 0,
  totalLatencyMs: 0,
  totalPromptTokens: 0,
  totalOutputTokens: 0,
  lastLatencyMs: 0,
  lastAt: null,
  streamingEnabled: true,
  healthOk: null,
};

export function getRuntimeMetrics() {
  return { ...metrics };
}

export function recordRuntimeLatency(ms, usage = {}) {
  const n = Number(ms) || 0;
  metrics.generations += 1;
  metrics.totalLatencyMs += n;
  metrics.lastLatencyMs = n;
  metrics.lastAt = new Date().toISOString();
  if (usage.promptTokens) metrics.totalPromptTokens += Number(usage.promptTokens) || 0;
  if (usage.outputTokens) metrics.totalOutputTokens += Number(usage.outputTokens) || 0;
}

export function recordRuntimeHealth(ok) {
  metrics.healthOk = Boolean(ok);
}

/**
 * Build universal cache key parts (Sprint-17E contract).
 */
export function buildRuntimeCacheKey({
  questionId = '',
  model = '',
  promptVersion = '',
  runtimeVersion = '',
  subjectId = '',
  overrideVersion = '0',
} = {}) {
  return [
    String(questionId || 'na'),
    String(model || 'na'),
    String(promptVersion || 'na'),
    String(runtimeVersion || 'na'),
    String(subjectId || 'na'),
    String(overrideVersion ?? '0'),
  ].join('::');
}

/**
 * @param {string} prompt
 * @param {object} [snapshot]
 */
export function getResponsesCached(prompt, snapshot = {}) {
  const hit = getCachedResponse(prompt, snapshot);
  if (hit) {
    metrics.hits += 1;
    return hit;
  }
  metrics.misses += 1;
  return null;
}

/**
 * @param {string} prompt
 * @param {object} snapshot
 * @param {string} text
 */
export function setResponsesCached(prompt, snapshot, text) {
  return setCachedResponse(prompt, snapshot, text);
}

/** Rough USD estimate (dashboard only) */
export function estimateCostUsd(promptTokens = 0, outputTokens = 0) {
  const p = Number(promptTokens) || 0;
  const o = Number(outputTokens) || 0;
  /* Flash-class ballpark — display only */
  return Number(((p / 1e6) * 0.15 + (o / 1e6) * 0.6).toFixed(6));
}

export default {
  getRuntimeMetrics,
  recordRuntimeLatency,
  recordRuntimeHealth,
  buildRuntimeCacheKey,
  getResponsesCached,
  setResponsesCached,
  estimateCostUsd,
};
