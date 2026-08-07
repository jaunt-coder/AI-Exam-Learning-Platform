/**
 * Sprint-17E — Responses (Interactions) HTTP client
 * Config-driven endpoints — no hardcoded URLs in callers.
 */

import {
  getRuntimeConfig,
  buildInteractionsUrl,
  buildGenerateContentUrl,
  buildListModelsUrl,
  resolvePrimaryModel,
} from './responses-model.js';
import { parseResponsesPayload } from './responses-parser.js';
import { consumeResponsesStream } from './responses-stream.js';
import {
  RESPONSES_ERROR,
  classifyHttpError,
  backoffMs,
  sleep,
} from './responses-errors.js';

/**
 * @param {{ apiKey: string, fetchImpl?: typeof fetch }} auth
 * @param {object} body
 * @param {{ stream?: boolean, signal?: AbortSignal }} [options]
 */
export async function postInteractions(auth, body, options = {}) {
  const cfg = getRuntimeConfig();
  const fetchImpl = auth.fetchImpl || globalThis.fetch?.bind(globalThis);
  if (typeof fetchImpl !== 'function') {
    return { ok: false, error: RESPONSES_ERROR.FETCH_UNAVAILABLE };
  }
  if (!auth.apiKey) {
    return { ok: false, error: RESPONSES_ERROR.MISSING_API_KEY, requireSetup: true };
  }

  const url = buildInteractionsUrl(cfg);
  const headers = {
    'Content-Type': 'application/json',
    [cfg.apiKeyHeader || 'x-goog-api-key']: auth.apiKey,
    'Api-Revision': cfg.apiRevision || '2026-05-20',
  };

  const payload = {
    store: cfg.store === true,
    ...body,
  };
  if (options.stream) payload.stream = true;

  try {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: options.signal,
    });

    if (!res.ok) {
      let detail = '';
      let errorCode = '';
      try {
        const errBody = await res.json();
        detail = errBody?.error?.message || JSON.stringify(errBody).slice(0, 240);
        errorCode = String(errBody?.error?.status || errBody?.error?.code || '');
      } catch (_e) {
        detail = await res.text().catch(() => '');
      }
      const classified = classifyHttpError(res.status, detail, errorCode);
      return {
        ok: false,
        error: classified.kind,
        status: res.status,
        detail: String(detail || '').slice(0, 300),
        errorCode,
        retryable: classified.retryable,
        modelFallback: classified.modelFallback,
        apiMode: 'interactions',
        urlHost: 'generativelanguage.googleapis.com',
      };
    }

    if (options.stream) {
      const streamed = await consumeResponsesStream(res, {
        onDelta: options.onDelta,
      });
      return {
        ok: streamed.ok,
        text: streamed.text,
        streamed: true,
        apiMode: 'interactions',
        status: 200,
        urlHost: 'generativelanguage.googleapis.com',
      };
    }

    const data = await res.json();
    const parsed = parseResponsesPayload(data, 'interactions');
    return {
      ok: parsed.ok,
      text: parsed.text,
      interactionId: parsed.interactionId,
      usage: parsed.usage,
      steps: parsed.steps,
      status: 200,
      apiMode: 'interactions',
      urlHost: 'generativelanguage.googleapis.com',
      raw: data,
      error: parsed.ok ? undefined : RESPONSES_ERROR.EMPTY,
    };
  } catch (err) {
    return {
      ok: false,
      error: RESPONSES_ERROR.NETWORK,
      detail: err?.message || String(err),
      retryable: true,
      apiMode: 'interactions',
    };
  }
}

/**
 * Compat path — only used if apiMode explicitly generateContent.
 */
export async function postGenerateContent(auth, model, prompt, options = {}) {
  const cfg = getRuntimeConfig();
  const fetchImpl = auth.fetchImpl || globalThis.fetch?.bind(globalThis);
  if (typeof fetchImpl !== 'function') {
    return { ok: false, error: RESPONSES_ERROR.FETCH_UNAVAILABLE };
  }
  const url =
    `${buildGenerateContentUrl(model, cfg)}?key=${encodeURIComponent(auth.apiKey)}`;
  try {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: String(prompt || '') }] }],
        generationConfig: {
          temperature:
            typeof options.temperature === 'number' ? options.temperature : 0.2,
          maxOutputTokens:
            typeof options.maxTokens === 'number' ? options.maxTokens : 2800,
          responseMimeType: options.expectJson ? 'application/json' : undefined,
        },
      }),
    });
    if (!res.ok) {
      let detail = '';
      try {
        const b = await res.json();
        detail = b?.error?.message || '';
      } catch (_e) {
        detail = await res.text().catch(() => '');
      }
      const classified = classifyHttpError(res.status, detail);
      return {
        ok: false,
        error: classified.kind,
        status: res.status,
        detail,
        retryable: classified.retryable,
        modelFallback: classified.modelFallback,
        apiMode: 'generateContent',
      };
    }
    const data = await res.json();
    const parsed = parseResponsesPayload(data, 'generateContent');
    return {
      ok: parsed.ok,
      text: parsed.text,
      usage: parsed.usage,
      status: 200,
      apiMode: 'generateContent',
      raw: data,
    };
  } catch (err) {
    return {
      ok: false,
      error: RESPONSES_ERROR.NETWORK,
      detail: err?.message || String(err),
      retryable: true,
      apiMode: 'generateContent',
    };
  }
}

/**
 * List models (auto-detect).
 */
export async function listGeminiModels(auth = {}) {
  const cfg = getRuntimeConfig();
  const fetchImpl = auth.fetchImpl || globalThis.fetch?.bind(globalThis);
  if (!auth.apiKey || typeof fetchImpl !== 'function') {
    return { ok: false, models: [], error: RESPONSES_ERROR.MISSING_API_KEY };
  }
  const url =
    `${buildListModelsUrl(cfg)}?key=${encodeURIComponent(auth.apiKey)}`;
  try {
    const res = await fetchImpl(url, { method: 'GET' });
    if (!res.ok) {
      return { ok: false, models: [], status: res.status, error: RESPONSES_ERROR.HTTP };
    }
    const data = await res.json();
    const models = (Array.isArray(data.models) ? data.models : [])
      .map((m) => {
        const name = String(m.name || '').replace(/^models\//, '');
        return {
          id: name,
          displayName: m.displayName || name,
          supported: Array.isArray(m.supportedGenerationMethods)
            ? m.supportedGenerationMethods
            : [],
        };
      })
      .filter((m) => m.id && /gemini/i.test(m.id));
    return { ok: true, models, status: 200 };
  } catch (err) {
    return {
      ok: false,
      models: [],
      error: RESPONSES_ERROR.NETWORK,
      detail: err?.message || String(err),
    };
  }
}

/**
 * Single attempt with configured apiMode.
 */
export async function invokeOnce(auth, { model, prompt, temperature, maxTokens, stream, onDelta, expectJson }) {
  const cfg = getRuntimeConfig();
  const m = resolvePrimaryModel(model);

  if (cfg.apiMode === 'generateContent') {
    return postGenerateContent(auth, m, prompt, {
      temperature,
      maxTokens,
      expectJson,
    });
  }

  const body = {
    model: m,
    input: String(prompt || ''),
  };
  if (expectJson) {
    body.response_format = [
      {
        type: 'text',
        mime_type: 'application/json',
      },
    ];
  }
  if (typeof temperature === 'number') {
    body.generation_config = {
      ...(body.generation_config || {}),
      temperature,
    };
  }
  if (typeof maxTokens === 'number') {
    body.generation_config = {
      ...(body.generation_config || {}),
      max_output_tokens: maxTokens,
    };
  }

  return postInteractions(auth, body, { stream: Boolean(stream), onDelta });
}

/**
 * Retry wrapper with exponential backoff (1,2,4,8) up to maxRetries.
 */
export async function invokeWithRetry(auth, input, options = {}) {
  const cfg = getRuntimeConfig();
  const maxRetries = options.maxRetries ?? cfg.maxRetries ?? 4;
  let last = null;
  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    last = await invokeOnce(auth, input);
    if (last.ok) {
      return { ...last, attempts: attempt + 1 };
    }
    if (!last.retryable || attempt >= maxRetries - 1) {
      return { ...last, attempts: attempt + 1 };
    }
    await sleep(backoffMs(attempt));
  }
  return { ...last, attempts: maxRetries };
}

export default {
  postInteractions,
  postGenerateContent,
  listGeminiModels,
  invokeOnce,
  invokeWithRetry,
};
