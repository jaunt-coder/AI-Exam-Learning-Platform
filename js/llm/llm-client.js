/**
 * Sprint-11A — LLM Client (Adapter facade)
 * Runtime / Coach talk only to this client — never to OpenAI directly.
 */

import { buildPrompt } from './prompt-builder.js';
import {
  getCachedResponse,
  setCachedResponse,
} from './prompt-cache.js';
import { getProvider } from './provider-registry.js';

export const DEFAULT_PROVIDER_ID = 'OPENAI';
export const DEFAULT_MODEL = 'gpt-5.5';

/**
 * @param {{
 *   providerId?: string,
 *   model?: string,
 *   useCache?: boolean,
 * }} [options]
 */
export function createLlmClient(options = {}) {
  const providerId = options.providerId || DEFAULT_PROVIDER_ID;
  const model = options.model || DEFAULT_MODEL;
  const useCache = options.useCache !== false;

  return {
    providerId,
    model,

    /**
     * Health check via registered provider.
     */
    async healthCheck() {
      const provider = getProvider(providerId);
      if (!provider) {
        return { ok: false, provider: providerId, detail: 'provider_missing' };
      }
      return provider.healthCheck();
    },

    /**
     * Low-level chat passthrough (Adapter only).
     * @param {Array<{role:string, content:string}>} messages
     * @param {object} [chatOptions]
     */
    async chat(messages, chatOptions = {}) {
      const provider = getProvider(providerId);
      if (!provider) {
        return { ok: false, error: 'provider_missing', provider: providerId };
      }
      return provider.chat(messages, {
        model: chatOptions.model || model,
        temperature: chatOptions.temperature,
        maxTokens: chatOptions.maxTokens,
      });
    },

    /**
     * High-level generate from task + runtime snapshot.
     * @param {{ task?: string, snapshot?: object, model?: string }} input
     */
    async generate(input = {}) {
      const built = buildPrompt({
        task: input.task || 'TODAY_COACH',
        snapshot: input.snapshot || {},
      });

      if (useCache) {
        const cached = getCachedResponse(built.prompt, built.snapshot);
        if (cached) {
          return {
            ok: true,
            text: cached,
            cached: true,
            provider: providerId,
            model,
            prompt: built.prompt,
            facts: built.facts,
            source: 'cache',
          };
        }
      }

      const provider = getProvider(providerId);
      if (!provider) {
        return {
          ok: false,
          error: 'provider_missing',
          provider: providerId,
          prompt: built.prompt,
          facts: built.facts,
        };
      }

      const result = await provider.generate({
        prompt: built.prompt,
        model: input.model || model,
      });

      if (result.ok && result.text && useCache) {
        setCachedResponse(built.prompt, built.snapshot, result.text);
      }

      return {
        ...result,
        cached: false,
        prompt: built.prompt,
        facts: built.facts,
        source: result.ok ? 'provider' : 'error',
      };
    },
  };
}

/** Default singleton-style client */
export const llmClient = createLlmClient();

export async function generate(input) {
  return llmClient.generate(input);
}

export async function chat(messages, options) {
  return llmClient.chat(messages, options);
}

export async function healthCheck() {
  return llmClient.healthCheck();
}

export default {
  createLlmClient,
  llmClient,
  generate,
  chat,
  healthCheck,
  DEFAULT_PROVIDER_ID,
  DEFAULT_MODEL,
};
