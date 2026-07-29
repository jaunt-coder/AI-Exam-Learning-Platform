/**
 * Sprint-17D.1 — AI Config Storage + Provider Resolver
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
 */

import { getItem, setItem, removeItem, STORAGE_KEYS } from '../storage.js';

export const AI_CONFIG_KEY =
  STORAGE_KEYS.LEARNING_AI_CONFIG_V1 || 'learning.ai-config.v1';

export const AI_CONFIG_VERSION = '17D.1';
export const PROVIDER_VERSION = 'GEMINI-17D.1';
export const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash';
export const GEMINI_BASE_URL =
  'https://generativelanguage.googleapis.com/v1beta';

/**
 * @returns {{
 *   provider: string,
 *   model: string,
 *   apiKey: string,
 *   enabled: boolean,
 *   updatedAt: string|null,
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
  };
}

/**
 * Load AI config (never throws).
 */
export function loadAiConfig() {
  const raw = getItem(AI_CONFIG_KEY, null);
  if (!raw || typeof raw !== 'object') return emptyAiConfig();
  return {
    ...emptyAiConfig(),
    provider: String(raw.provider || 'GEMINI').toUpperCase() || 'GEMINI',
    model: String(raw.model || DEFAULT_GEMINI_MODEL).trim() || DEFAULT_GEMINI_MODEL,
    apiKey: typeof raw.apiKey === 'string' ? raw.apiKey.trim() : '',
    enabled: raw.enabled !== false,
    updatedAt: raw.updatedAt || null,
    schemaVersion: raw.schemaVersion || AI_CONFIG_VERSION,
  };
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
    model: String(patch.model ?? prev.model ?? DEFAULT_GEMINI_MODEL).trim()
      || DEFAULT_GEMINI_MODEL,
    apiKey:
      patch.apiKey === undefined
        ? prev.apiKey
        : String(patch.apiKey || '').trim(),
    enabled: patch.enabled === undefined ? prev.enabled !== false : Boolean(patch.enabled),
    updatedAt: new Date().toISOString(),
    schemaVersion: AI_CONFIG_VERSION,
  };
  setItem(AI_CONFIG_KEY, next);
  return { ok: true, config: maskAiConfig(next) };
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
 * Resolve Gemini credentials with Sprint-17D.1 priority.
 * @returns {{
 *   ok: boolean,
 *   apiKey: string,
 *   provider: string,
 *   model: string,
 *   enabled: boolean,
 *   source: string,
 *   providerVersion: string,
 *   requireSetup?: boolean,
 *   error?: string,
 * }}
 */
export function resolveGeminiConnection() {
  const cfg = loadAiConfig();

  if (cfg.enabled !== false && cfg.apiKey) {
    return {
      ok: true,
      apiKey: cfg.apiKey,
      provider: 'GEMINI',
      model: cfg.model || DEFAULT_GEMINI_MODEL,
      enabled: true,
      source: AI_CONFIG_KEY,
      providerVersion: PROVIDER_VERSION,
    };
  }

  const legacy = resolveLegacySettingsApiKey();
  if (legacy.apiKey) {
    return {
      ok: true,
      apiKey: legacy.apiKey,
      provider: 'GEMINI',
      model: cfg.model || DEFAULT_GEMINI_MODEL,
      enabled: true,
      source: legacy.source,
      providerVersion: PROVIDER_VERSION,
    };
  }

  /* llm-config.json is model/provider metadata only — no secrets in repo */
  return {
    ok: false,
    apiKey: '',
    provider: 'LOCAL',
    model: cfg.model || DEFAULT_GEMINI_MODEL,
    enabled: cfg.enabled !== false,
    source: 'LOCAL',
    providerVersion: `LOCAL-${AI_CONFIG_VERSION}`,
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
 * Connection test against Gemini Generative Language API.
 * @param {{ apiKey?: string, model?: string }} [options]
 */
export async function testGeminiConnection(options = {}) {
  const resolved = resolveGeminiConnection();
  const apiKey = String(options.apiKey || resolved.apiKey || '').trim();
  const model = String(options.model || resolved.model || DEFAULT_GEMINI_MODEL).trim();

  if (!apiKey) {
    return {
      ok: false,
      error: 'missing_api_key',
      requireSetup: true,
      message: 'Gemini API Key 설정이 필요합니다.',
      provider: 'LOCAL',
    };
  }

  if (typeof fetch !== 'function') {
    return {
      ok: false,
      error: 'fetch_unavailable',
      message: 'fetch를 사용할 수 없습니다.',
      provider: 'GEMINI',
    };
  }

  const url =
    `${GEMINI_BASE_URL}/models/${encodeURIComponent(model)}:generateContent`
    + `?key=${encodeURIComponent(apiKey)}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
        generationConfig: { maxOutputTokens: 8, temperature: 0 },
      }),
    });

    if (res.ok) {
      return {
        ok: true,
        message: 'Gemini Connected',
        provider: 'GEMINI',
        model,
        status: res.status,
      };
    }

    let detail = '';
    try {
      const body = await res.json();
      detail = body?.error?.message || JSON.stringify(body).slice(0, 200);
    } catch (_e) {
      detail = await res.text().catch(() => '');
    }

    return {
      ok: false,
      error: 'api_key_invalid',
      message: 'API Key Invalid',
      provider: 'GEMINI',
      status: res.status,
      detail: String(detail || '').slice(0, 300),
    };
  } catch (err) {
    return {
      ok: false,
      error: 'network_error',
      message: 'API Key Invalid',
      provider: 'GEMINI',
      detail: err?.message || String(err),
    };
  }
}

export default {
  AI_CONFIG_KEY,
  AI_CONFIG_VERSION,
  PROVIDER_VERSION,
  loadAiConfig,
  saveAiConfig,
  clearAiConfig,
  maskAiConfig,
  resolveGeminiConnection,
  resolveGeminiApiKey,
  testGeminiConnection,
};
