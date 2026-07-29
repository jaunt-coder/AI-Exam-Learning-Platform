/**
 * Sprint-17A — Gemini Provider (Google Generative Language API)
 * Sprint-17D.1 — Uses unified AI Config resolver.
 * Adapter-internal only. Never called from Runtime / Learning Engine formulas.
 */

import { LlmProvider } from './llm-provider.js';
import {
  resolveGeminiApiKey,
  resolveGeminiConnection,
  DEFAULT_GEMINI_MODEL,
  GEMINI_BASE_URL,
} from './ai-config.js';

export const GEMINI_DEFAULT_MODEL = DEFAULT_GEMINI_MODEL;
export { GEMINI_BASE_URL, resolveGeminiApiKey };

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
    const connection = resolveGeminiConnection();
    const apiKey = connection.apiKey;
    if (!apiKey) {
      return {
        ok: false,
        error: 'missing_api_key',
        provider: this.id,
        requireSetup: true,
      };
    }
    if (typeof this.fetchImpl !== 'function') {
      return { ok: false, error: 'fetch_unavailable', provider: this.id };
    }

    const model = options.model || this.model || connection.model || GEMINI_DEFAULT_MODEL;
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
        let detail = '';
        try {
          const body = await res.json();
          detail = body?.error?.message || JSON.stringify(body).slice(0, 240);
        } catch (_e) {
          detail = await res.text().catch(() => '');
        }
        return {
          ok: false,
          error: `gemini_http_${res.status}`,
          detail: String(detail || '').slice(0, 200),
          provider: this.id,
          model,
          status: res.status,
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
      return {
        ok: true,
        text: String(text).trim(),
        provider: this.id,
        model,
        source: connection.source,
      };
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

export default { GeminiProvider, resolveGeminiApiKey, GEMINI_DEFAULT_MODEL, GEMINI_BASE_URL };
