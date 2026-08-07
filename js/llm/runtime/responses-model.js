/**
 * Sprint-17E — Responses / Interactions endpoint + model config (no hardcoding in callers)
 * Sprint-17D.4 — Official REST path is /v1beta/interactions (not /v1beta2).
 */

import {
  DEFAULT_GEMINI_MODEL,
  FALLBACK_GEMINI_MODEL,
  normalizeGeminiModel,
} from '../ai-config.js';

export const RUNTIME_VERSION = '17E.1';
export const RUNTIME_NAME = 'RESPONSES';

/** Official Interactions REST path — https://ai.google.dev/api/interactions */
export const OFFICIAL_INTERACTIONS_PATH = '/v1beta/interactions';

/** Default Interactions (Responses) API — override via llm-config / ai-config */
export const DEFAULT_RUNTIME_CONFIG = Object.freeze({
  provider: 'GEMINI',
  apiMode: 'interactions', // interactions | generateContent (compat only inside client)
  host: 'https://generativelanguage.googleapis.com',
  apiVersion: 'v1beta',
  interactionsPath: OFFICIAL_INTERACTIONS_PATH,
  listModelsPath: '/v1beta/models',
  generateContentPathTemplate: '/v1beta/models/{model}:generateContent',
  /* Api-Revision omitted by default — custom header can break browser CORS preflight */
  apiRevision: null,
  apiKeyHeader: 'x-goog-api-key',
  apiKeyInQuery: true,
  store: false,
  defaultModel: DEFAULT_GEMINI_MODEL,
  fallbackModel: FALLBACK_GEMINI_MODEL,
  maxRetries: 4,
  retryStatuses: [429, 500, 502, 503],
  stream: false,
});

let _override = null;

/**
 * @param {Partial<typeof DEFAULT_RUNTIME_CONFIG>} [patch]
 */
export function setRuntimeConfigOverride(patch = {}) {
  _override = { ...(_override || {}), ...patch };
  return getRuntimeConfig();
}

export function clearRuntimeConfigOverride() {
  _override = null;
}

/**
 * Block retired / wrong paths (Sprint-17D.4).
 * @param {string} path
 */
export function normalizeInteractionsPath(path) {
  const p = String(path || '').trim();
  if (!p || p.includes('v1beta2') || p === '/interactions' || p === 'interactions') {
    return OFFICIAL_INTERACTIONS_PATH;
  }
  if (p === '/v1beta/interactions' || p.endsWith('/v1beta/interactions')) {
    return OFFICIAL_INTERACTIONS_PATH;
  }
  /* Only allow official interactions path for Gemini Google AI */
  if (p.includes('interactions') && p.includes('v1beta') && !p.includes('v1beta2')) {
    return OFFICIAL_INTERACTIONS_PATH;
  }
  return OFFICIAL_INTERACTIONS_PATH;
}

/**
 * Merge defaults + optional globalThis.__LLM_RUNTIME_CONFIG__ + override.
 */
export function getRuntimeConfig() {
  let injected = {};
  try {
    if (typeof globalThis !== 'undefined' && globalThis.__LLM_RUNTIME_CONFIG__) {
      injected = { ...globalThis.__LLM_RUNTIME_CONFIG__ };
    }
  } catch (_e) {
    /* ignore */
  }
  const merged = {
    ...DEFAULT_RUNTIME_CONFIG,
    ...injected,
    ...(_override || {}),
  };
  return {
    ...merged,
    defaultModel: normalizeGeminiModel(
      merged.defaultModel || DEFAULT_RUNTIME_CONFIG.defaultModel,
    ),
    fallbackModel:
      merged.fallbackModel
      || FALLBACK_GEMINI_MODEL
      || DEFAULT_RUNTIME_CONFIG.fallbackModel,
    apiVersion: 'v1beta',
    interactionsPath: normalizeInteractionsPath(merged.interactionsPath),
  };
}

/**
 * @param {ReturnType<typeof getRuntimeConfig>} [cfg]
 */
export function buildInteractionsUrl(cfg = getRuntimeConfig()) {
  const host = String(cfg.host || DEFAULT_RUNTIME_CONFIG.host).replace(/\/$/, '');
  const path = normalizeInteractionsPath(
    cfg.interactionsPath || DEFAULT_RUNTIME_CONFIG.interactionsPath,
  );
  const url = `${host}${path.startsWith('/') ? path : `/${path}`}`;
  try {
    console.log('Gemini URL =', url);
  } catch (_e) {
    /* ignore */
  }
  return url;
}

/**
 * Legacy generateContent URL (compat path inside adapter only).
 * @param {string} model
 * @param {ReturnType<typeof getRuntimeConfig>} [cfg]
 */
export function buildGenerateContentUrl(model, cfg = getRuntimeConfig()) {
  const host = String(cfg.host || DEFAULT_RUNTIME_CONFIG.host).replace(/\/$/, '');
  const tpl =
    cfg.generateContentPathTemplate
    || DEFAULT_RUNTIME_CONFIG.generateContentPathTemplate;
  const path = tpl.replace('{model}', encodeURIComponent(model));
  return `${host}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * @param {ReturnType<typeof getRuntimeConfig>} [cfg]
 */
export function buildListModelsUrl(cfg = getRuntimeConfig()) {
  const host = String(cfg.host || DEFAULT_RUNTIME_CONFIG.host).replace(/\/$/, '');
  const path = cfg.listModelsPath || DEFAULT_RUNTIME_CONFIG.listModelsPath;
  return `${host}${path.startsWith('/') ? path : `/${path}`}`;
}

export function resolvePrimaryModel(preferred) {
  const cfg = getRuntimeConfig();
  return normalizeGeminiModel(preferred || cfg.defaultModel);
}

export function resolveFallbackModel() {
  return getRuntimeConfig().fallbackModel || FALLBACK_GEMINI_MODEL;
}

export default {
  RUNTIME_VERSION,
  RUNTIME_NAME,
  DEFAULT_RUNTIME_CONFIG,
  getRuntimeConfig,
  setRuntimeConfigOverride,
  clearRuntimeConfigOverride,
  buildInteractionsUrl,
  buildGenerateContentUrl,
  buildListModelsUrl,
  resolvePrimaryModel,
  resolveFallbackModel,
};
