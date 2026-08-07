/**
 * Sprint-17E — GeminiProvider via Universal Responses Runtime
 * Legacy generateContent direct fetch removed from this provider.
 */

import { LlmProvider } from './llm-provider.js';
import {
  resolveGeminiApiKey,
  resolveGeminiConnection,
  DEFAULT_GEMINI_MODEL,
  FALLBACK_GEMINI_MODEL,
  GEMINI_BASE_URL,
} from './ai-config.js';
import {
  generateWithRuntime,
  healthWithRuntime,
  RUNTIME_VERSION,
} from './runtime/responses-runtime.js';
import { normalizeGeminiModel } from './ai-config.js';

export const GEMINI_DEFAULT_MODEL = DEFAULT_GEMINI_MODEL;
export { GEMINI_BASE_URL, resolveGeminiApiKey, FALLBACK_GEMINI_MODEL, RUNTIME_VERSION };

export class GeminiProvider extends LlmProvider {
  /**
   * @param {{ model?: string, baseUrl?: string, fetchImpl?: typeof fetch }} [options]
   */
  constructor(options = {}) {
    super();
    this.model = normalizeGeminiModel(options.model || GEMINI_DEFAULT_MODEL);
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
      expectJson: input.expectJson,
    });
  }

  /**
   * @param {Array<{role:string, content:string}>} messages
   * @param {object} [options]
   */
  async chat(messages = [], options = {}) {
    const connection = resolveGeminiConnection();
    if (!connection.apiKey) {
      return {
        ok: false,
        error: 'missing_api_key',
        provider: this.id,
        requireSetup: true,
      };
    }

    const prompt = (Array.isArray(messages) ? messages : [])
      .map((m) => String(m.content || ''))
      .filter(Boolean)
      .join('\n\n');

    const result = await generateWithRuntime({
      prompt,
      model: options.model || this.model || connection.model,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      expectJson: options.expectJson !== false,
      stream: Boolean(options.stream),
      onDelta: options.onDelta,
      fetchImpl: this.fetchImpl,
      useCache: options.useCache === true,
      allowModelFallback: true,
    });
    console.log('[GeminiProvider] generate/chat result', {
      ok: result.ok,
      model: result.model,
      requestUrl: result.requestUrl,
      runtimeVersion: result.runtimeVersion,
    });

    return {
      ...result,
      provider: result.provider || this.id,
      source: connection.source,
    };
  }

  async healthCheck() {
    return healthWithRuntime({
      model: this.model,
      fetchImpl: this.fetchImpl,
    });
  }
}

export default {
  GeminiProvider,
  resolveGeminiApiKey,
  GEMINI_DEFAULT_MODEL,
  FALLBACK_GEMINI_MODEL,
  GEMINI_BASE_URL,
  RUNTIME_VERSION,
};
