/**
 * Sprint-11A — LLM Provider interface
 * Concrete vendors (OpenAI etc.) implement this inside the Adapter layer only.
 */

/**
 * @typedef {object} LlmGenerateInput
 * @property {string} prompt
 * @property {string} [model]
 * @property {number} [temperature]
 * @property {number} [maxTokens]
 */

/**
 * @typedef {object} LlmGenerateResult
 * @property {boolean} ok
 * @property {string} [text]
 * @property {string} [error]
 * @property {string} [provider]
 * @property {string} [model]
 */

export class LlmProvider {
  /** @returns {string} */
  get id() {
    return 'BASE';
  }

  /**
   * @param {LlmGenerateInput} _input
   * @returns {Promise<LlmGenerateResult>}
   */
  async generate(_input) {
    return { ok: false, error: 'provider_not_implemented', provider: this.id };
  }

  /**
   * @param {Array<{role:string, content:string}>} _messages
   * @param {object} [_options]
   * @returns {Promise<LlmGenerateResult>}
   */
  async chat(_messages, _options = {}) {
    return { ok: false, error: 'provider_not_implemented', provider: this.id };
  }

  /**
   * @returns {Promise<{ ok: boolean, provider: string, detail?: string }>}
   */
  async healthCheck() {
    return { ok: false, provider: this.id, detail: 'not_implemented' };
  }
}

export default { LlmProvider };
