/**
 * Sprint-17D.1 — AI Config Storage + Provider Resolver
 * Sprint-17D.3 — Gemini latest model migration (gemini-3-flash)
 * GitHub Pages safe: API key lives only in LocalStorage (never committed).
 *
 * Priority:
 *   learning.ai-config.v1
 *   → legacy settings (geminiApiKey / llm)
 *   → llm-config.json defaults (model/provider only — no secrets)
 *   → LOCAL fallback (no key)
 *
 * Never writes Question / Pattern / Statistics DB.
 * Never mutates Learning / Recommendation / Mastery formulas.
 * Storage key names unchanged.
 */

import { getItem, setItem, removeItem, STORAGE_KEYS } from '../storage.js';

export const AI_CONFIG_KEY =
  STORAGE_KEYS.LEARNING_AI_CONFIG_V1 || 'learning.ai-config.v1';

export const AI_CONFIG_VERSION = '17E.1';
export const PROVIDER_VERSION = 'GEMINI-17E.1';

/** Primary model (Google AI Studio / Gemini API) */
export const DEFAULT_GEMINI_MODEL = 'gemini-3-flash';
/** Auto-retry when primary is missing / retired */
export const FALLBACK_GEMINI_MODEL = 'gemini-3-flash-preview';
export const GEMINI_API_VERSION = 'v1beta';
export const GEMINI_BASE_URL =
  `https://generativelanguage.googleapis.com/${GEMINI_API_VERSION}`;

/** Retired IDs — auto-migrate to DEFAULT_GEMINI_MODEL on load */
export const DEPRECATED_GEMINI_MODELS = Object.freeze([
  'gemini-2.0-flash',
  'gemini-2.0-flash-001',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-pro',
  'gemini-pro',
]);

/**
 * Normalize model id — deprecated → primary default.
 * @param {string} [model]
 */
export function normalizeGeminiModel(model) {
  const m = String(model || '').trim();
  if (!m || DEPRECATED_GEMINI_MODELS.includes(m)) {
    return DEFAULT_GEMINI_MODEL;
  }
  return m;
}

/**
 * @returns {{
 *   provider: string,
 *   model: string,
 *   apiKey: string,
 *   enabled: boolean,
 *   updatedAt: string|null,
 *   lastConnectedAt: string|null,
 *   lastConnectedModel: string|null,
 *   lastApiAt: string|null,
 *   apiVersion: string,
 *   schemaVersion: string,
 * }}
 */
export function emptyAiConfig() {
  return {
    schemaVersion: AI_CONFIG_VERSION,
    provider: 'GEMINI',
    model: DEFAULT_GEMINI_MODEL,
    apiKey: '',
    enabled: true,
    updatedAt: null,
    lastConnectedAt: null,
    lastConnectedModel: null,
    lastApiAt: null,
    apiVersion: GEMINI_API_VERSION,
  };
}

/**
 * Load AI config (never throws). Migrates retired model ids.
 */
export function loadAiConfig() {
  const raw = getItem(AI_CONFIG_KEY, null);
  if (!raw || typeof raw !== 'object') return emptyAiConfig();
  const model = normalizeGeminiModel(raw.model || DEFAULT_GEMINI_MODEL);
  const next = {
    ...emptyAiConfig(),
    provider: String(raw.provider || 'GEMINI').toUpperCase() || 'GEMINI',
    model,
    apiKey: typeof raw.apiKey === 'string' ? raw.apiKey.trim() : '',
    enabled: raw.enabled !== false,
    updatedAt: raw.updatedAt || null,
    lastConnectedAt: raw.lastConnectedAt || null,
    lastConnectedModel: raw.lastConnectedModel
      ? normalizeGeminiModel(raw.lastConnectedModel)
      : null,
    lastApiAt: raw.lastApiAt || raw.lastConnectedAt || null,
    apiVersion: raw.apiVersion || GEMINI_API_VERSION,
    schemaVersion: raw.schemaVersion || AI_CONFIG_VERSION,
  };
  /* Persist migration when stored model was retired (same storage key) */
  if (raw.model && normalizeGeminiModel(raw.model) !== String(raw.model).trim()) {
    try {
      setItem(AI_CONFIG_KEY, { ...next });
    } catch (_e) {
      /* ignore */
    }
  }
  return next;
}

/**
 * Save AI config (apiKey optional — empty clears key but keeps prefs).
 * @param {{ provider?: string, model?: string, apiKey?: string, enabled?: boolean }} patch
 */
export function saveAiConfig(patch = {}) {
  const prev = loadAiConfig();
  const next = {
    ...prev,
    provider: String(patch.provider ?? prev.provider ?? 'GEMINI').toUpperCase(),
    model: normalizeGeminiModel(
      patch.model ?? prev.model ?? DEFAULT_GEMINI_MODEL,
    ),
    apiKey:
      patch.apiKey === undefined
        ? prev.apiKey
        : String(patch.apiKey || '').trim(),
    enabled: patch.enabled === undefined ? prev.enabled !== false : Boolean(patch.enabled),
    updatedAt: new Date().toISOString(),
    schemaVersion: AI_CONFIG_VERSION,
    apiVersion: GEMINI_API_VERSION,
  };
  setItem(AI_CONFIG_KEY, next);
  return { ok: true, config: maskAiConfig(next) };
}

/**
 * Record successful live API call (Connection Test / generateContent).
 * @param {{ model?: string, status?: number }} [meta]
 */
export function recordAiConnectionSuccess(meta = {}) {
  const prev = loadAiConfig();
  const now = new Date().toISOString();
  const next = {
    ...prev,
    lastConnectedAt: now,
    lastApiAt: now,
    lastConnectedModel: normalizeGeminiModel(
      meta.model || prev.model || DEFAULT_GEMINI_MODEL,
    ),
    apiVersion: GEMINI_API_VERSION,
    updatedAt: prev.updatedAt || now,
    schemaVersion: AI_CONFIG_VERSION,
  };
  setItem(AI_CONFIG_KEY, next);
  return next;
}

/**
 * Delete stored API key (and optionally whole config).
 * @param {{ wipeAll?: boolean }} [options]
 */
export function clearAiConfig(options = {}) {
  if (options.wipeAll) {
    removeItem(AI_CONFIG_KEY);
    return { ok: true, config: emptyAiConfig() };
  }
  const prev = loadAiConfig();
  const next = {
    ...prev,
    apiKey: '',
    updatedAt: new Date().toISOString(),
  };
  setItem(AI_CONFIG_KEY, next);
  return { ok: true, config: maskAiConfig(next) };
}

/**
 * Public-safe view (never expose full key in UI dumps).
 */
export function maskAiConfig(config = loadAiConfig()) {
  const key = String(config.apiKey || '');
  return {
    ...config,
    apiKey: key
      ? `${key.slice(0, 4)}…${key.slice(-4)} (${key.length} chars)`
      : '',
    hasApiKey: Boolean(key),
    defaultModel: DEFAULT_GEMINI_MODEL,
    fallbackModel: FALLBACK_GEMINI_MODEL,
  };
}

/**
 * Legacy settings fallback (pre-17D.1).
 */
export function resolveLegacySettingsApiKey() {
  try {
    if (
      typeof globalThis !== 'undefined'
      && typeof globalThis.__GEMINI_API_KEY__ === 'string'
      && globalThis.__GEMINI_API_KEY__.trim()
    ) {
      return {
        apiKey: globalThis.__GEMINI_API_KEY__.trim(),
        source: 'globalThis.__GEMINI_API_KEY__',
      };
    }
  } catch (_err) {
    /* ignore */
  }

  try {
    if (
      typeof process !== 'undefined'
      && process.env
      && typeof process.env.GEMINI_API_KEY === 'string'
      && process.env.GEMINI_API_KEY.trim()
    ) {
      return {
        apiKey: process.env.GEMINI_API_KEY.trim(),
        source: 'process.env.GEMINI_API_KEY',
      };
    }
  } catch (_err) {
    /* ignore */
  }

  const settings = getItem(STORAGE_KEYS.SETTINGS, {}) || {};
  if (typeof settings.geminiApiKey === 'string' && settings.geminiApiKey.trim()) {
    return { apiKey: settings.geminiApiKey.trim(), source: 'settings.geminiApiKey' };
  }
  if (
    settings.llm
    && String(settings.llm.provider || '').toUpperCase() === 'GEMINI'
    && typeof settings.llm.apiKey === 'string'
    && settings.llm.apiKey.trim()
  ) {
    return { apiKey: settings.llm.apiKey.trim(), source: 'settings.llm.apiKey' };
  }
  return { apiKey: '', source: null };
}

/**
 * Sprint-17D.5 — Gemini Runtime 사용 가능 여부 (enabled + apiKey).
 * Professor / AI Tutor 라우팅 진입점.
 * @returns {{
 *   ok: boolean,
 *   enabled: boolean,
 *   hasApiKey: boolean,
 *   provider: string,
 *   model: string,
 *   providerVersion: string,
 *   runtime: 'INTERACTIONS'|null,
 *   source: string|null,
 * }}
 */
export function checkAIConfig() {
  const conn = resolveGeminiConnection();
  const ok = Boolean(conn.ok && conn.apiKey && conn.enabled !== false);
  return {
    ok,
    enabled: conn.enabled !== false,
    hasApiKey: Boolean(conn.apiKey),
    provider: ok ? 'GEMINI' : 'LOCAL_PROFESSOR',
    model: conn.model || DEFAULT_GEMINI_MODEL,
    providerVersion: conn.providerVersion || PROVIDER_VERSION,
    runtime: ok ? 'INTERACTIONS' : null,
    source: conn.source || null,
  };
}

/**
 * Resolve Gemini credentials with Sprint-17D.1 priority.
 */
export function resolveGeminiConnection() {
  const cfg = loadAiConfig();
  const model = normalizeGeminiModel(cfg.model || DEFAULT_GEMINI_MODEL);

  if (cfg.enabled !== false && cfg.apiKey) {
    return {
      ok: true,
      apiKey: cfg.apiKey,
      provider: 'GEMINI',
      model,
      fallbackModel: FALLBACK_GEMINI_MODEL,
      enabled: true,
      source: AI_CONFIG_KEY,
      providerVersion: PROVIDER_VERSION,
      apiVersion: GEMINI_API_VERSION,
    };
  }

  const legacy = resolveLegacySettingsApiKey();
  if (legacy.apiKey) {
    return {
      ok: true,
      apiKey: legacy.apiKey,
      provider: 'GEMINI',
      model,
      fallbackModel: FALLBACK_GEMINI_MODEL,
      enabled: true,
      source: legacy.source,
      providerVersion: PROVIDER_VERSION,
      apiVersion: GEMINI_API_VERSION,
    };
  }

  return {
    ok: false,
    apiKey: '',
    provider: 'LOCAL',
    model,
    fallbackModel: FALLBACK_GEMINI_MODEL,
    enabled: cfg.enabled !== false,
    source: 'LOCAL',
    providerVersion: `LOCAL-${AI_CONFIG_VERSION}`,
    apiVersion: GEMINI_API_VERSION,
    requireSetup: true,
    error: 'missing_api_key',
  };
}

/**
 * Convenience: API key string only (empty when missing).
 */
export function resolveGeminiApiKey() {
  return resolveGeminiConnection().apiKey || '';
}

/**
 * Detect model-missing HTTP / API errors for fallback retry.
 * @param {number} [status]
 * @param {string} [detail]
 * @param {string} [errorCode]
 */
export function isGeminiModelNotFound(status, detail = '', errorCode = '') {
  const blob = `${errorCode} ${detail}`.toUpperCase();
  if (
    blob.includes('MODEL_NOT_FOUND')
    || blob.includes('INVALID_MODEL')
    || blob.includes('NOT_FOUND')
    || blob.includes('IS NOT FOUND')
    || blob.includes('NOT SUPPORTED')
  ) {
    return true;
  }
  return Number(status) === 404;
}

/**
 * Connection test — real Responses (Interactions) API call required (HTTP 200).
 * @param {{ apiKey?: string, model?: string, fetchImpl?: typeof fetch }} [options]
 */
export async function testGeminiConnection(options = {}) {
  const resolved = resolveGeminiConnection();
  const apiKey = String(options.apiKey || resolved.apiKey || '').trim();
  const model = normalizeGeminiModel(
    options.model || resolved.model || DEFAULT_GEMINI_MODEL,
  );

  if (!apiKey) {
    return {
      ok: false,
      error: 'missing_api_key',
      requireSetup: true,
      message: 'Gemini API Key 설정이 필요합니다.',
      provider: 'LOCAL',
      model,
      apiVersion: GEMINI_API_VERSION,
    };
  }

  const prev = loadAiConfig();
  /* Connection Test never persists API keys — only Settings「저장」writes keys. */
  void prev;

  const { healthWithRuntime } = await import('./runtime/responses-runtime.js');
  const { buildInteractionsUrl, getRuntimeConfig } = await import(
    './runtime/responses-model.js'
  );
  const probeUrl = buildInteractionsUrl(getRuntimeConfig());
  console.log('Gemini URL =', probeUrl);
  console.log('[ai-config] Connection Test → healthWithRuntime', probeUrl);

  const result = await healthWithRuntime({
    model,
    apiKey,
    fetchImpl: options.fetchImpl,
  });
  console.log('[ai-config] Connection Test result', {
    ok: result.ok,
    status: result.status,
    requestUrl: result.requestUrl || probeUrl,
    detail: result.detail,
  });

  if (result.ok) {
    return {
      ok: true,
      message: result.message || 'Gemini Connected',
      provider: 'GEMINI',
      model: result.model || model,
      fallbackUsed: Boolean(result.fallbackUsed),
      status: 200,
      apiVersion: GEMINI_API_VERSION,
      apiMode: result.apiMode || 'interactions',
      runtimeVersion: result.runtimeVersion,
      lastConnectedAt: new Date().toISOString(),
      urlHost: 'generativelanguage.googleapis.com',
      requestUrl: result.requestUrl || probeUrl,
    };
  }

  return {
    ok: false,
    error: result.error || 'api_key_invalid',
    message: 'API Key Invalid',
    provider: 'GEMINI',
    model,
    status: result.status,
    detail: result.detail,
    apiVersion: GEMINI_API_VERSION,
    apiMode: 'interactions',
    requestUrl: result.requestUrl || probeUrl,
  };
}

/**
 * Settings / Dashboard projection (no secrets).
 */
export function getAiConnectionStatus() {
  const cfg = loadAiConfig();
  const conn = resolveGeminiConnection();
  const hasKey = Boolean(conn.apiKey);
  const connected = Boolean(hasKey && cfg.lastConnectedAt);
  return {
    provider: conn.ok ? 'GEMINI' : 'LOCAL',
    model: normalizeGeminiModel(cfg.model || DEFAULT_GEMINI_MODEL),
    defaultModel: DEFAULT_GEMINI_MODEL,
    fallbackModel: FALLBACK_GEMINI_MODEL,
    apiVersion: cfg.apiVersion || GEMINI_API_VERSION,
    providerVersion: conn.providerVersion || PROVIDER_VERSION,
    connected,
    hasApiKey: hasKey,
    lastConnectedAt: cfg.lastConnectedAt || null,
    lastConnectedModel: cfg.lastConnectedModel || null,
    lastApiAt: cfg.lastApiAt || cfg.lastConnectedAt || null,
    source: conn.source || '—',
  };
}

export default {
  AI_CONFIG_KEY,
  AI_CONFIG_VERSION,
  PROVIDER_VERSION,
  DEFAULT_GEMINI_MODEL,
  FALLBACK_GEMINI_MODEL,
  GEMINI_API_VERSION,
  GEMINI_BASE_URL,
  DEPRECATED_GEMINI_MODELS,
  normalizeGeminiModel,
  isGeminiModelNotFound,
  loadAiConfig,
  saveAiConfig,
  clearAiConfig,
  maskAiConfig,
  recordAiConnectionSuccess,
  resolveGeminiConnection,
  checkAIConfig,
  resolveGeminiApiKey,
  testGeminiConnection,
  getAiConnectionStatus,
};
