/**
 * Sprint-11A — OpenAI Provider (Adapter-internal only)
 * Model: gpt-5.5
 * API key from OPENAI_API_KEY / settings — never hardcode.
 */

import { getItem, STORAGE_KEYS } from '../storage.js';
import { LlmProvider } from './llm-provider.js';

export const OPENAI_DEFAULT_MODEL = 'gpt-5.5';
export const OPENAI_BASE_URL = 'https://api.openai.com/v1';

/**
 * Resolve API key without hardcoding.
 * @returns {string}
 */
export function resolveOpenAiApiKey() {
  try {
    if (
      typeof process !== 'undefined' &&
      process.env &&
      typeof process.env.OPENAI_API_KEY === 'string' &&
      process.env.OPENAI_API_KEY.trim()
    ) {
      return process.env.OPENAI_API_KEY.trim();
    }
  } catch (_err) {
    /* ignore */
  }

  try {
    if (
      typeof globalThis !== 'undefined' &&
      typeof globalThis.__OPENAI_API_KEY__ === 'string' &&
      globalThis.__OPENAI_API_KEY__.trim()
    ) {
      return globalThis.__OPENAI_API_KEY__.trim();
    }
  } catch (_err) {
    /* ignore */
  }

  const settings = getItem(STORAGE_KEYS.SETTINGS, {}) || {};
  if (typeof settings.openaiApiKey === 'string' && settings.openaiApiKey.trim()) {
    return settings.openaiApiKey.trim();
  }
  if (
    settings.llm &&
    typeof settings.llm.apiKey === 'string' &&
    settings.llm.apiKey.trim()
  ) {
    return settings.llm.apiKey.trim();
  }
  return '';
}

export class OpenAiProvider extends LlmProvider {
  /**
   * @param {{ model?: string, baseUrl?: string, fetchImpl?: typeof fetch }} [options]
   */
  constructor(options = {}) {
    super();
    this.model = options.model || OPENAI_DEFAULT_MODEL;
    this.baseUrl = options.baseUrl || OPENAI_BASE_URL;
    this.fetchImpl = options.fetchImpl || globalThis.fetch?.bind(globalThis);
  }

  get id() {
    return 'OPENAI';
  }

  /**
   * @param {LlmGenerateInput} input
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
    const apiKey = resolveOpenAiApiKey();
    if (!apiKey) {
      return { ok: false, error: 'missing_api_key', provider: this.id };
    }
    if (typeof this.fetchImpl !== 'function') {
      return { ok: false, error: 'fetch_unavailable', provider: this.id };
    }

    const model = options.model || this.model || OPENAI_DEFAULT_MODEL;
    const url = `${this.baseUrl}/chat/completions`;

    try {
      const res = await this.fetchImpl(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: Array.isArray(messages) ? messages : [],
          temperature:
            typeof options.temperature === 'number' ? options.temperature : 0.4,
          max_tokens:
            typeof options.maxTokens === 'number' ? options.maxTokens : 700,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        return {
          ok: false,
          error: `openai_http_${res.status}`,
          detail: errText.slice(0, 200),
          provider: this.id,
          model,
        };
      }

      const data = await res.json();
      const text =
        data?.choices?.[0]?.message?.content ||
        data?.choices?.[0]?.text ||
        '';
      if (!text) {
        return { ok: false, error: 'empty_response', provider: this.id, model };
      }
      return { ok: true, text: String(text).trim(), provider: this.id, model };
    } catch (err) {
      return {
        ok: false,
        error: 'openai_network_error',
        detail: err?.message || String(err),
        provider: this.id,
        model,
      };
    }
  }

  async healthCheck() {
    const apiKey = resolveOpenAiApiKey();
    if (!apiKey) {
      return { ok: false, provider: this.id, detail: 'missing_api_key' };
    }
    if (typeof this.fetchImpl !== 'function') {
      return { ok: false, provider: this.id, detail: 'fetch_unavailable' };
    }
    return {
      ok: true,
      provider: this.id,
      detail: `model=${this.model}`,
      model: this.model,
    };
  }
}

export default { OpenAiProvider, resolveOpenAiApiKey, OPENAI_DEFAULT_MODEL };
