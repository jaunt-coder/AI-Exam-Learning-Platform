/**
 * Sprint-17E — Lightweight response validator (JSON / non-empty)
 */

import { RESPONSES_ERROR } from './responses-errors.js';

/**
 * @param {{ text?: string, ok?: boolean }} result
 * @param {{ expectJson?: boolean }} [options]
 */
export function validateResponsesResult(result = {}, options = {}) {
  if (!result || result.ok === false) {
    return {
      ok: false,
      error: result?.error || RESPONSES_ERROR.EMPTY,
      detail: result?.detail || 'empty_or_failed',
    };
  }
  const text = String(result.text || '').trim();
  if (!text) {
    return { ok: false, error: RESPONSES_ERROR.EMPTY, detail: 'no_text' };
  }
  if (options.expectJson) {
    try {
      const cleaned = text
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      JSON.parse(cleaned);
    } catch (err) {
      return {
        ok: false,
        error: RESPONSES_ERROR.PARSE,
        detail: err?.message || 'invalid_json',
        text,
      };
    }
  }
  return { ok: true, text };
}

export default { validateResponsesResult };
