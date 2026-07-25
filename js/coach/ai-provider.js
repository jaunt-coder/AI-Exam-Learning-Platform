/**
 * AIProvider interface — vendor-swappable (Coach Phase C1)
 *
 * Agents must depend on this interface only.
 * Real OpenAI / Claude / Gemini adapters land in later phases.
 */

/**
 * @typedef {object} AICompleteOptions
 * @property {string} [model]
 * @property {number} [temperature]
 * @property {'text'|'json'} [format]
 */

/**
 * @interface
 */
export class AIProvider {
  /**
   * @param {string} prompt
   * @param {AICompleteOptions} [_options]
   * @returns {Promise<string|object>}
   */
  async complete(prompt, _options = {}) {
    throw new Error('AIProvider.complete must be implemented');
  }

  /** @returns {string} */
  get name() {
    return 'AIProvider';
  }
}

/**
 * Deterministic mock — no network. Used until a real provider is wired.
 */
export class MockAIProvider extends AIProvider {
  /**
   * @param {object} [fixtures] prompt-substring → response
   */
  constructor(fixtures = {}) {
    super();
    this.fixtures = fixtures;
  }

  get name() {
    return 'MockAIProvider';
  }

  /**
   * @param {string} prompt
   * @param {AICompleteOptions} [options]
   * @returns {Promise<string|object>}
   */
  async complete(prompt, options = {}) {
    const text = String(prompt || '');
    for (const [needle, value] of Object.entries(this.fixtures)) {
      if (text.includes(needle)) {
        return value;
      }
    }
    if (options.format === 'json') {
      return {
        provider: this.name,
        echo: text.slice(0, 200),
        note: 'MockAIProvider default JSON response',
      };
    }
    return `[MockAIProvider] ${text.slice(0, 200)}`;
  }
}

/** @type {AIProvider} */
let activeProvider = new MockAIProvider();

/**
 * @param {AIProvider} provider
 */
export function setAIProvider(provider) {
  if (!provider || typeof provider.complete !== 'function') {
    throw new Error('setAIProvider requires an AIProvider instance');
  }
  activeProvider = provider;
}

/**
 * @returns {AIProvider}
 */
export function getAIProvider() {
  return activeProvider;
}
