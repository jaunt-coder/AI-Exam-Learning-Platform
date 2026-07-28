/**
 * Sprint-11A — Provider Registry
 * Sprint-17A — GEMINI provider implemented (Problem First solver).
 */

import { OpenAiProvider } from './openai-provider.js';
import { GeminiProvider } from './gemini-provider.js';
import { LlmProvider } from './llm-provider.js';

/** Declared provider ids (future-ready) */
export const PROVIDER_IDS = Object.freeze([
  'OPENAI',
  'GEMINI',
  'CLAUDE',
  'LOCAL',
]);

class UnimplementedProvider extends LlmProvider {
  /**
   * @param {string} id
   */
  constructor(id) {
    super();
    this._id = id;
  }

  get id() {
    return this._id;
  }

  async generate() {
    return { ok: false, error: 'provider_not_implemented', provider: this.id };
  }

  async chat() {
    return { ok: false, error: 'provider_not_implemented', provider: this.id };
  }

  async healthCheck() {
    return { ok: false, provider: this.id, detail: 'not_implemented' };
  }
}

/** @type {Map<string, () => LlmProvider>} */
const factories = new Map();

/**
 * @param {string} id
 * @param {() => LlmProvider} factory
 */
export function registerProvider(id, factory) {
  factories.set(String(id).toUpperCase(), factory);
}

/**
 * @param {string} id
 * @returns {LlmProvider|null}
 */
export function getProvider(id) {
  const key = String(id || '').toUpperCase();
  const factory = factories.get(key);
  if (!factory) return null;
  return factory();
}

/**
 * @returns {string[]}
 */
export function listProviders() {
  return [...factories.keys()];
}

/**
 * @returns {string[]}
 */
export function listImplementedProviders() {
  return listProviders().filter((id) => {
    const p = getProvider(id);
    return p && !(p instanceof UnimplementedProvider);
  });
}

/* Default registration */
registerProvider('OPENAI', () => new OpenAiProvider());
registerProvider('GEMINI', () => new GeminiProvider());
registerProvider('CLAUDE', () => new UnimplementedProvider('CLAUDE'));
registerProvider('LOCAL', () => new UnimplementedProvider('LOCAL'));

export default {
  PROVIDER_IDS,
  registerProvider,
  getProvider,
  listProviders,
  listImplementedProviders,
};
