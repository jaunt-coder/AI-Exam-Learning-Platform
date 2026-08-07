/**
 * Sprint-17B — Vision utils (hash, clamp, idle, cost estimate)
 * Sprint-17D.3 — Model follows DEFAULT_GEMINI_MODEL (gemini-3-flash)
 */

import { DEFAULT_GEMINI_MODEL } from '../llm/ai-config.js';

export const VISION_MODEL = DEFAULT_GEMINI_MODEL || 'gemini-3-flash';
export const VISION_PROMPT_VERSION = '17B.1';
export const DEFAULT_OCR_THRESHOLD = 70;

/** Rough USD estimate per Vision call (dashboard display only). */
export const VISION_COST_USD_PER_CALL = 0.002;

/**
 * @param {string} text
 */
export async function sha256Hex(text) {
  const raw = String(text || '');
  try {
    if (globalThis.crypto?.subtle) {
      const buf = new TextEncoder().encode(raw);
      const digest = await globalThis.crypto.subtle.digest('SHA-256', buf);
      return [...new Uint8Array(digest)]
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch (_err) {
    /* fall through */
  }
  return simpleHash(raw);
}

/**
 * Sync hash for cache keys when SubtleCrypto unavailable.
 * @param {string} text
 */
export function simpleHash(text) {
  let h = 2166136261;
  const s = String(text || '');
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function clamp(n, min, max) {
  const v = Number(n);
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
}

/**
 * Schedule background work when browser is idle.
 * @param {() => void} fn
 * @param {number} [timeoutMs]
 */
export function runWhenIdle(fn, timeoutMs = 2500) {
  if (typeof fn !== 'function') return;
  if (typeof globalThis.requestIdleCallback === 'function') {
    globalThis.requestIdleCallback(() => {
      try {
        fn();
      } catch (_err) {
        /* ignore */
      }
    }, { timeout: timeoutMs });
    return;
  }
  setTimeout(() => {
    try {
      fn();
    } catch (_err) {
      /* ignore */
    }
  }, Math.min(timeoutMs, 800));
}

/**
 * @param {number} savedCalls
 */
export function estimateCostSavedUsd(savedCalls) {
  return Math.round((Number(savedCalls) || 0) * VISION_COST_USD_PER_CALL * 10000) / 10000;
}

/**
 * Escape for HTML attribute / text.
 */
export function esc(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export default {
  VISION_MODEL,
  VISION_PROMPT_VERSION,
  DEFAULT_OCR_THRESHOLD,
  VISION_COST_USD_PER_CALL,
  sha256Hex,
  simpleHash,
  clamp,
  runWhenIdle,
  estimateCostSavedUsd,
  esc,
};
