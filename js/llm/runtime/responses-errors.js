/**
 * Sprint-17E — Responses Runtime errors (Gemini Interactions API)
 */

export const RESPONSES_ERROR = Object.freeze({
  MISSING_API_KEY: 'missing_api_key',
  FETCH_UNAVAILABLE: 'fetch_unavailable',
  NETWORK: 'responses_network_error',
  HTTP: 'responses_http_error',
  EMPTY: 'empty_response',
  PARSE: 'responses_parse_error',
  MODEL_NOT_FOUND: 'MODEL_NOT_FOUND',
  INVALID_MODEL: 'INVALID_MODEL',
  RATE_LIMIT: 'RATE_LIMIT',
  SERVER: 'SERVER_ERROR',
  VALIDATION: 'validation_error',
});

/**
 * @param {number} [status]
 * @param {string} [detail]
 * @param {string} [errorCode]
 */
export function classifyHttpError(status, detail = '', errorCode = '') {
  const code = String(errorCode || '').toUpperCase();
  const blob = `${code} ${detail}`.toUpperCase();
  const st = Number(status);

  if (st === 429 || blob.includes('RESOURCE_EXHAUSTED') || blob.includes('RATE')) {
    return { retryable: true, kind: RESPONSES_ERROR.RATE_LIMIT };
  }
  if (st === 500 || st === 503 || st === 502 || blob.includes('UNAVAILABLE')) {
    return { retryable: true, kind: RESPONSES_ERROR.SERVER };
  }
  if (
    st === 404
    || blob.includes('MODEL_NOT_FOUND')
    || blob.includes('INVALID_MODEL')
    || blob.includes('NOT_FOUND')
  ) {
    return {
      retryable: false,
      kind: RESPONSES_ERROR.MODEL_NOT_FOUND,
      modelFallback: true,
    };
  }
  return { retryable: false, kind: RESPONSES_ERROR.HTTP };
}

/**
 * @param {number} attemptIndex 0-based
 * @param {number} [baseMs]
 */
export function backoffMs(attemptIndex, baseMs = 1000) {
  const exp = Math.min(3, Math.max(0, attemptIndex));
  return baseMs * (2 ** exp); // 1s, 2s, 4s, 8s
}

export function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export default {
  RESPONSES_ERROR,
  classifyHttpError,
  backoffMs,
  sleep,
};
