/**
 * Sprint-17E — Streaming helpers for Interactions (Responses) API
 */

import { parseStreamLine } from './responses-parser.js';

/**
 * Consume SSE / text stream from fetch Response.
 * @param {Response} res
 * @param {{ onDelta?: (delta: string, meta: object) => void }} [hooks]
 */
export async function consumeResponsesStream(res, hooks = {}) {
  if (!res || !res.body || typeof res.body.getReader !== 'function') {
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      return { ok: true, text: '', raw: data, streamed: false };
    } catch (_e) {
      return { ok: Boolean(text), text: text || '', streamed: false };
    }
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split(/\r?\n/);
    buffer = parts.pop() || '';
    for (const line of parts) {
      const parsed = parseStreamLine(line);
      if (parsed.delta) {
        full += parsed.delta;
        if (typeof hooks.onDelta === 'function') {
          hooks.onDelta(parsed.delta, parsed);
        }
      }
    }
  }
  if (buffer.trim()) {
    const parsed = parseStreamLine(buffer);
    if (parsed.delta) {
      full += parsed.delta;
      if (typeof hooks.onDelta === 'function') hooks.onDelta(parsed.delta, parsed);
    }
  }

  return { ok: Boolean(full.trim()), text: full.trim(), streamed: true };
}

/**
 * Progressive section labels for Professor streaming UI.
 */
export const PROFESSOR_STREAM_PHASES = Object.freeze([
  { id: 'calculation', label: '계산과정', match: /calculation|풀이|계산/i },
  { id: 'theory', label: '이론', match: /theory|개념|이론|concept/i },
  { id: 'examTip', label: '시험팁', match: /examTip|시험|tip/i },
  { id: 'memory', label: '암기법', match: /memory|암기|memoryHack/i },
]);

/**
 * Heuristic phase from accumulated stream text (JSON-ish).
 * @param {string} text
 */
export function detectProfessorStreamPhase(text) {
  const t = String(text || '');
  for (let i = PROFESSOR_STREAM_PHASES.length - 1; i >= 0; i -= 1) {
    const ph = PROFESSOR_STREAM_PHASES[i];
    if (ph.match.test(t)) return ph;
  }
  return PROFESSOR_STREAM_PHASES[0];
}

export default {
  consumeResponsesStream,
  PROFESSOR_STREAM_PHASES,
  detectProfessorStreamPhase,
};
