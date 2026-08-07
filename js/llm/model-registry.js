/**
 * Sprint-17E — Universal Model Registry
 * Gemini / Claude / GPT / Local share one contract:
 *   generate() · stream() · health() · listModels()
 */

import { LlmProvider } from './llm-provider.js';
import {
  generateWithRuntime,
  streamWithRuntime,
  healthWithRuntime,
  listGeminiModels,
  RUNTIME_VERSION,
} from './runtime/responses-runtime.js';
import {
  resolveGeminiConnection,
  DEFAULT_GEMINI_MODEL,
  FALLBACK_GEMINI_MODEL,
} from './ai-config.js';
import { getProvider, listProviders, PROVIDER_IDS } from './provider-registry.js';

/**
 * @typedef {object} RegistryEntry
 * @property {string} id
 * @property {string} label
 * @property {boolean} implemented
 * @property {string[]} models
 */

const STATIC_MODELS = Object.freeze({
  GEMINI: [DEFAULT_GEMINI_MODEL, FALLBACK_GEMINI_MODEL],
  OPENAI: ['gpt-5.5', 'gpt-4o'],
  CLAUDE: ['claude-sonnet-4', 'claude-haiku'],
  LOCAL: ['local-professor'],
});

/**
 * Adapter that routes any provider id through Universal Runtime when GEMINI,
 * otherwise through existing provider-registry implementations.
 */
export class UniversalModelAdapter {
  /**
   * @param {string} providerId
   */
  constructor(providerId = 'GEMINI') {
    this.providerId = String(providerId || 'GEMINI').toUpperCase();
  }

  get id() {
    return this.providerId;
  }

  async generate(input = {}) {
    if (this.providerId === 'GEMINI' || this.providerId === 'LOCAL') {
      return generateWithRuntime({
        prompt: input.prompt,
        model: input.model,
        temperature: input.temperature,
        maxTokens: input.maxTokens,
        expectJson: input.expectJson,
        stream: false,
        forceLocal: this.providerId === 'LOCAL' || input.forceLocal,
        localText: input.localText,
      });
    }
    const p = getProvider(this.providerId);
    if (!p) return { ok: false, error: 'provider_missing', provider: this.providerId };
    return p.generate(input);
  }

  async stream(input = {}) {
    if (this.providerId === 'GEMINI') {
      return streamWithRuntime({
        prompt: input.prompt,
        model: input.model,
        temperature: input.temperature,
        maxTokens: input.maxTokens,
        onDelta: input.onDelta,
        expectJson: input.expectJson,
      });
    }
    /* Non-Gemini: fall back to generate */
    return this.generate(input);
  }

  async health(options = {}) {
    if (this.providerId === 'GEMINI') {
      return healthWithRuntime(options);
    }
    const p = getProvider(this.providerId);
    if (!p) return { ok: false, provider: this.providerId, detail: 'provider_missing' };
    return p.healthCheck();
  }

  async listModels(options = {}) {
    if (this.providerId === 'GEMINI') {
      const connection = resolveGeminiConnection();
      if (connection.apiKey) {
        const live = await listGeminiModels({
          apiKey: connection.apiKey,
          fetchImpl: options.fetchImpl,
        });
        if (live.ok && live.models.length) {
          return {
            ok: true,
            provider: 'GEMINI',
            models: live.models.map((m) => m.id),
            detailed: live.models,
            source: 'api',
          };
        }
      }
      return {
        ok: true,
        provider: 'GEMINI',
        models: [...STATIC_MODELS.GEMINI],
        source: 'static',
      };
    }
    return {
      ok: true,
      provider: this.providerId,
      models: [...(STATIC_MODELS[this.providerId] || [])],
      source: 'static',
    };
  }
}

/**
 * @param {string} [providerId]
 */
export function getModelAdapter(providerId = 'GEMINI') {
  return new UniversalModelAdapter(providerId);
}

export async function generate(input = {}) {
  return getModelAdapter(input.providerId || 'GEMINI').generate(input);
}

export async function stream(input = {}) {
  return getModelAdapter(input.providerId || 'GEMINI').stream(input);
}

export async function health(input = {}) {
  return getModelAdapter(input.providerId || 'GEMINI').health(input);
}

export async function listModels(input = {}) {
  return getModelAdapter(input.providerId || 'GEMINI').listModels(input);
}

/**
 * Registry snapshot for Settings / Dashboard.
 */
export function describeRegistry() {
  return PROVIDER_IDS.map((id) => ({
    id,
    label: id,
    implemented: id === 'GEMINI' || id === 'OPENAI',
    models: [...(STATIC_MODELS[id] || [])],
    contract: ['generate', 'stream', 'health', 'listModels'],
    runtimeVersion: RUNTIME_VERSION,
  }));
}

export { PROVIDER_IDS, listProviders, RUNTIME_VERSION };

export default {
  UniversalModelAdapter,
  getModelAdapter,
  generate,
  stream,
  health,
  listModels,
  describeRegistry,
  PROVIDER_IDS,
  RUNTIME_VERSION,
};
