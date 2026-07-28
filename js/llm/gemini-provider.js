/**
 * Sprint-17A — Gemini Provider (Google Generative Language API)
 * Adapter-internal only. Never called from Runtime / Learning Engine formulas.
 */

import { getItem, STORAGE_KEYS } from '../storage.js';
import { LlmProvider } from './llm-provider.js';

export const GEMINI_DEFAULT_MODEL = 'gemini-2.0-flash';
export const GEMINI_BASE_URL =
  'https://generativelanguage.googleapis.com/v1beta';

/**
 * Resolve API key without hardcoding.
 */
export function resolveGeminiApiKey() {
  try {
    if (
      typeof process !== 'undefined'
      && process.env
      && typeof process.env.GEMINI_API_KEY === 'string'
      && process.env.GEMINI_API_KEY.trim()
    ) {
      return process.env.GEMINI_API_KEY.trim();
    }
  } catch (_err) {
    /* ignore */
  }
  try {
    if (
      typeof globalThis !== 'undefined'
      && typeof globalThis.__GEMINI_API_KEY__ === 'string'
      && globalThis.__GEMINI_API_KEY__.trim()
    ) {
      return globalThis.__GEMINI_API_KEY__.trim();
    }
  } catch (_err) {
    /* ignore */
  }
  const settings = getItem(STORAGE_KEYS.SETTINGS, {}) || {};
  if (typeof settings.geminiApiKey === 'string' && settings.geminiApiKey.trim()) {
    return settings.geminiApiKey.trim();
  }
  if (
    settings.llm
    && String(settings.llm.provider || '').toUpperCase() === 'GEMINI'
    && typeof settings.llm.apiKey === 'string'
    && settings.llm.apiKey.trim()
  ) {
    return settings.llm.apiKey.trim();
  }
  return '';
}

export class GeminiProvider extends LlmProvider {
  /**
   * @param {{ model?: string, baseUrl?: string, fetchImpl?: typeof fetch }} [options]
   */
  constructor(options = {}) {
    super();
    this.model = options.model || GEMINI_DEFAULT_MODEL;
    this.baseUrl = options.baseUrl || GEMINI_BASE_URL;
    this.fetchImpl = options.fetchImpl || globalThis.fetch?.bind(globalThis);
  }

  get id() {
    return 'GEMINI';
  }

  /**
   * @param {import('./llm-provider.js').LlmGenerateInput} input
   */
  async generate(input = {}) {
    const prompt = String(input.prompt || '');
    if (!prompt) {
      return { ok: false, error: 'empty_prompt', provider: this.id };
    }
    return this.chat([{ role: 'user', content: prompt }], {
      model: input.model || this.model,
      temperature: input.temperature,
      maxTokens: input.maxTokens,
    });
  }

  /**
   * @param {Array<{role:string, content:string}>} messages
   * @param {object} [options]
   */
  async chat(messages = [], options = {}) {
    const apiKey = resolveGeminiApiKey();
    if (!apiKey) {
      return { ok: false, error: 'missing_api_key', provider: this.id };
    }
    if (typeof this.fetchImpl !== 'function') {
      return { ok: false, error: 'fetch_unavailable', provider: this.id };
    }

    const model = options.model || this.model || GEMINI_DEFAULT_MODEL;
    const url = `${this.baseUrl}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const contents = (Array.isArray(messages) ? messages : []).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.content || '') }],
    }));

    try {
      const res = await this.fetchImpl(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature:
              typeof options.temperature === 'number' ? options.temperature : 0.2,
            maxOutputTokens:
              typeof options.maxTokens === 'number' ? options.maxTokens : 2400,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        return {
          ok: false,
          error: `gemini_http_${res.status}`,
          detail: errText.slice(0, 200),
          provider: this.id,
          model,
        };
      }

      const data = await res.json();
      const text =
        data?.candidates?.[0]?.content?.parts
          ?.map((p) => p?.text || '')
          .join('')
        || '';
      if (!text) {
        return { ok: false, error: 'empty_response', provider: this.id, model };
      }
      return { ok: true, text: String(text).trim(), provider: this.id, model };
    } catch (err) {
      return {
        ok: false,
        error: 'gemini_network_error',
        detail: err?.message || String(err),
        provider: this.id,
        model,
      };
    }
  }

  async healthCheck() {
    const apiKey = resolveGeminiApiKey();
    if (!apiKey) {
      return { ok: false, provider: this.id, detail: 'missing_api_key' };
    }
    return { ok: true, provider: this.id, detail: 'configured' };
  }
}

export default { GeminiProvider, resolveGeminiApiKey, GEMINI_DEFAULT_MODEL };
