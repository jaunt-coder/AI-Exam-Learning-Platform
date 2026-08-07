/**
 * Sprint-17E — Responses / Interactions endpoint + model config (no hardcoding in callers)
 */

import {
  DEFAULT_GEMINI_MODEL,
  FALLBACK_GEMINI_MODEL,
  GEMINI_API_VERSION,
  normalizeGeminiModel,
} from '../ai-config.js';

export const RUNTIME_VERSION = '17E.1';
export const RUNTIME_NAME = 'RESPONSES';

/** Default Interactions (Responses) API — override via llm-config / ai-config */
export const DEFAULT_RUNTIME_CONFIG = Object.freeze({
  provider: 'GEMINI',
  apiMode: 'interactions', // interactions | generateContent (compat only inside client)
  host: 'https://generativelanguage.googleapis.com',
  apiVersion: 'v1beta2',
  interactionsPath: '/v1beta2/interactions',
  listModelsPath: '/v1beta/models',
  generateContentPathTemplate: '/v1beta/models/{model}:generateContent',
  apiRevision: '2026-05-20',
  apiKeyHeader: 'x-goog-api-key',
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
  return {
    ...DEFAULT_RUNTIME_CONFIG,
    ...injected,
    ...(_override || {}),
    defaultModel: normalizeGeminiModel(
      (_override && _override.defaultModel)
        || injected.defaultModel
        || DEFAULT_RUNTIME_CONFIG.defaultModel,
    ),
    fallbackModel:
      (_override && _override.fallbackModel)
      || injected.fallbackModel
      || FALLBACK_GEMINI_MODEL
      || DEFAULT_RUNTIME_CONFIG.fallbackModel,
    apiVersion: GEMINI_API_VERSION === 'v1beta'
      ? (injected.apiVersion || (_override && _override.apiVersion) || DEFAULT_RUNTIME_CONFIG.apiVersion)
      : DEFAULT_RUNTIME_CONFIG.apiVersion,
  };
}

/**
 * @param {string} model
 * @param {ReturnType<typeof getRuntimeConfig>} [cfg]
 */
export function buildInteractionsUrl(cfg = getRuntimeConfig()) {
  const host = String(cfg.host || DEFAULT_RUNTIME_CONFIG.host).replace(/\/$/, '');
  const path = cfg.interactionsPath || DEFAULT_RUNTIME_CONFIG.interactionsPath;
  return `${host}${path.startsWith('/') ? path : `/${path}`}`;
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
