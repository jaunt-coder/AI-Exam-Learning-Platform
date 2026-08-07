/**
 * Sprint-17E — Universal LLM Responses Runtime
 *
 * Question → Prompt Builder → LLM Runtime → Responses API → Parser → Quality → Cache → UI
 *
 * Engines must call this layer — never fetch Gemini directly.
 */

import {
  resolveGeminiConnection,
  recordAiConnectionSuccess,
  saveAiConfig,
  normalizeGeminiModel,
} from '../ai-config.js';
import {
  RUNTIME_VERSION,
  RUNTIME_NAME,
  getRuntimeConfig,
  resolvePrimaryModel,
  resolveFallbackModel,
} from './responses-model.js';
import { invokeWithRetry, listGeminiModels, postInteractions } from './responses-client.js';
import { validateResponsesResult } from './responses-validator.js';
import {
  getResponsesCached,
  setResponsesCached,
  recordRuntimeLatency,
  recordRuntimeHealth,
  getRuntimeMetrics,
  estimateCostUsd,
  buildRuntimeCacheKey,
} from './responses-cache.js';
import { RESPONSES_ERROR } from './responses-errors.js';

export { RUNTIME_VERSION, RUNTIME_NAME, buildRuntimeCacheKey, getRuntimeMetrics };

/**
 * @param {{
 *   prompt: string,
 *   model?: string,
 *   temperature?: number,
 *   maxTokens?: number,
 *   stream?: boolean,
 *   onDelta?: Function,
 *   expectJson?: boolean,
 *   useCache?: boolean,
 *   cacheSnapshot?: object,
 *   allowModelFallback?: boolean,
 *   forceLocal?: boolean,
 *   localText?: string,
 *   fetchImpl?: typeof fetch,
 * }} input
 */
export async function generateWithRuntime(input = {}) {
  const started = Date.now();
  const cfg = getRuntimeConfig();
  const prompt = String(input.prompt || '');
  if (!prompt) {
    return { ok: false, error: 'empty_prompt', runtimeVersion: RUNTIME_VERSION };
  }

  if (input.forceLocal) {
    return {
      ok: true,
      text: String(input.localText || ''),
      provider: 'LOCAL_PROFESSOR',
      model: 'local',
      local: true,
      runtimeVersion: RUNTIME_VERSION,
      apiMode: RUNTIME_NAME,
      durationMs: Date.now() - started,
    };
  }

  if (input.useCache !== false) {
    const cached = getResponsesCached(prompt, input.cacheSnapshot || { v: RUNTIME_VERSION });
    if (cached) {
      return {
        ok: true,
        text: cached,
        cached: true,
        provider: 'CACHE',
        model: resolvePrimaryModel(input.model),
        runtimeVersion: RUNTIME_VERSION,
        apiMode: RUNTIME_NAME,
        durationMs: Date.now() - started,
      };
    }
  }

  const connection = resolveGeminiConnection();
  if (!connection.apiKey) {
    /* Fallback chain end: LOCAL_PROFESSOR when caller supplies localText / allowLocal */
    if (input.localText) {
      return {
        ok: true,
        text: String(input.localText),
        provider: 'LOCAL_PROFESSOR',
        model: 'local',
        local: true,
        requireSetup: true,
        runtimeVersion: RUNTIME_VERSION,
        durationMs: Date.now() - started,
      };
    }
    return {
      ok: false,
      error: RESPONSES_ERROR.MISSING_API_KEY,
      requireSetup: true,
      provider: 'LOCAL',
      runtimeVersion: RUNTIME_VERSION,
      durationMs: Date.now() - started,
    };
  }

  const auth = { apiKey: connection.apiKey, fetchImpl: input.fetchImpl };
  const primary = resolvePrimaryModel(input.model || connection.model);
  const callInput = {
    model: primary,
    prompt,
    temperature: input.temperature,
    maxTokens: input.maxTokens,
    stream: input.stream,
    onDelta: input.onDelta,
    expectJson: input.expectJson !== false,
  };

  let result = await invokeWithRetry(auth, callInput, {
    maxRetries: cfg.maxRetries,
  });

  /* Model fallback: other Gemini model */
  if (
    !result.ok
    && input.allowModelFallback !== false
    && (result.modelFallback || result.error === RESPONSES_ERROR.MODEL_NOT_FOUND)
  ) {
    const fb = resolveFallbackModel();
    if (fb && fb !== primary) {
      result = await invokeWithRetry(
        auth,
        { ...callInput, model: fb },
        { maxRetries: cfg.maxRetries },
      );
      if (result.ok) {
        result.fallbackUsed = true;
        result.requestedModel = primary;
        result.model = fb;
        try {
          saveAiConfig({ model: fb });
        } catch (_e) {
          /* ignore */
        }
      }
    }
  }

  const durationMs = Date.now() - started;

  if (result.ok && result.text) {
    const validated = validateResponsesResult(result, {
      expectJson: input.expectJson !== false,
    });
    if (!validated.ok && input.expectJson !== false) {
      /* Soft-accept non-JSON if model returned markdown fences we already tried */
      if (!String(result.text).trim()) {
        return {
          ...result,
          ok: false,
          error: validated.error,
          durationMs,
          runtimeVersion: RUNTIME_VERSION,
        };
      }
    }

    recordRuntimeLatency(durationMs, result.usage || {});
    try {
      recordAiConnectionSuccess({ model: result.model || primary, status: 200 });
    } catch (_e) {
      /* ignore */
    }

    if (input.useCache !== false) {
      setResponsesCached(
        prompt,
        input.cacheSnapshot || { v: RUNTIME_VERSION },
        result.text,
      );
    }

    return {
      ...result,
      ok: true,
      model: result.model || primary,
      provider: 'GEMINI',
      runtimeVersion: RUNTIME_VERSION,
      apiMode: result.apiMode || cfg.apiMode || 'interactions',
      durationMs,
      cached: false,
      source: connection.source,
      providerVersion: connection.providerVersion,
      requestUrl: result.requestUrl,
    };
  }

  /* Final fallback: LOCAL_PROFESSOR text if provided */
  if (input.localText) {
    return {
      ok: true,
      text: String(input.localText),
      provider: 'LOCAL_PROFESSOR',
      model: 'local',
      local: true,
      fallbackFrom: result.error,
      runtimeVersion: RUNTIME_VERSION,
      durationMs,
    };
  }

    return {
      ...result,
      ok: false,
      provider: 'GEMINI',
      model: primary,
      runtimeVersion: RUNTIME_VERSION,
      durationMs,
      requestUrl: result.requestUrl,
    };
  }

/**
 * Stream-friendly alias.
 */
export async function streamWithRuntime(input = {}) {
  return generateWithRuntime({ ...input, stream: true });
}

/**
 * Health check via real Interactions ping (HTTP 200).
 */
export async function healthWithRuntime(options = {}) {
  const connection = resolveGeminiConnection();
  const apiKey = String(options.apiKey || connection.apiKey || '').trim();
  if (!apiKey) {
    recordRuntimeHealth(false);
    return {
      ok: false,
      error: RESPONSES_ERROR.MISSING_API_KEY,
      requireSetup: true,
      provider: 'LOCAL',
      runtimeVersion: RUNTIME_VERSION,
    };
  }

  const model = resolvePrimaryModel(options.model || connection.model);
  const auth = { apiKey, fetchImpl: options.fetchImpl };
  console.log('[responses-runtime] healthWithRuntime start', { model, RUNTIME_VERSION });
  const ping = await postInteractions(
    auth,
    {
      model,
      input: 'ping',
      store: false,
    },
    { stream: false },
  );
  console.log('[responses-runtime] health ping', {
    ok: ping.ok,
    status: ping.status,
    requestUrl: ping.requestUrl,
  });

  if (ping.ok || ping.status === 200) {
    recordRuntimeHealth(true);
    try {
      recordAiConnectionSuccess({ model, status: 200 });
    } catch (_e) {
      /* ignore */
    }
    return {
      ok: true,
      message: 'Gemini Connected',
      provider: 'GEMINI',
      model,
      status: 200,
      apiMode: 'interactions',
      runtimeVersion: RUNTIME_VERSION,
      urlHost: 'generativelanguage.googleapis.com',
      requestUrl: ping.requestUrl,
    };
  }

  /* Fallback model health */
  const fb = resolveFallbackModel();
  if (fb && fb !== model) {
    console.log('[responses-runtime] health fallback model', fb);
    const second = await postInteractions(
      auth,
      { model: fb, input: 'ping', store: false },
      { stream: false },
    );
    if (second.ok || second.status === 200) {
      recordRuntimeHealth(true);
      try {
        saveAiConfig({ model: fb });
        recordAiConnectionSuccess({ model: fb, status: 200 });
      } catch (_e) {
        /* ignore */
      }
      return {
        ok: true,
        message: 'Gemini Connected (fallback model)',
        provider: 'GEMINI',
        model: fb,
        requestedModel: model,
        fallbackUsed: true,
        status: 200,
        apiMode: 'interactions',
        runtimeVersion: RUNTIME_VERSION,
        requestUrl: second.requestUrl,
      };
    }
  }

  recordRuntimeHealth(false);
  return {
    ok: false,
    error: ping.error || 'health_failed',
    detail: ping.detail,
    status: ping.status,
    provider: 'GEMINI',
    model,
    runtimeVersion: RUNTIME_VERSION,
    requestUrl: ping.requestUrl,
  };
}

/**
 * Dashboard projection.
 */
export function getAiRuntimeDashboardStats() {
  const m = getRuntimeMetrics();
  const connection = resolveGeminiConnection();
  const cfg = getRuntimeConfig();
  const gens = m.generations || 0;
  return {
    provider: connection.ok ? 'GEMINI' : 'LOCAL',
    currentModel: resolvePrimaryModel(connection.model),
    responsesApi: cfg.apiMode === 'interactions' || cfg.apiMode === 'responses',
    apiMode: cfg.apiMode,
    latency: m.lastLatencyMs || 0,
    averageTime: gens ? Math.round(m.totalLatencyMs / gens) : 0,
    tokens: (m.totalPromptTokens || 0) + (m.totalOutputTokens || 0),
    estimatedCost: estimateCostUsd(m.totalPromptTokens, m.totalOutputTokens),
    cacheHit: m.hits || 0,
    cacheMiss: m.misses || 0,
    streaming: m.streamingEnabled !== false,
    health: m.healthOk === null ? 'unknown' : m.healthOk ? 'ok' : 'fail',
    runtimeVersion: RUNTIME_VERSION,
    lastAt: m.lastAt,
  };
}

export { listGeminiModels };

export default {
  generateWithRuntime,
  streamWithRuntime,
  healthWithRuntime,
  listGeminiModels,
  getAiRuntimeDashboardStats,
  RUNTIME_VERSION,
  RUNTIME_NAME,
  buildRuntimeCacheKey,
};
