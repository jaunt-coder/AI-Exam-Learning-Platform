/**
 * Sprint-17A — Gemini JSON Response Parser
 */

const REQUIRED_KEYS = [
  'summary',
  'stepByStep',
  'calculation',
  'correctAnswer',
  'verification',
  'mistakeDiagnosis',
  'misconception',
  'review30',
  'formulaCard',
  'examChecklist',
  'tutorAdvice',
  'confidence',
];

function extractJsonBlock(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  if (raw.startsWith('{') && raw.endsWith('}')) return raw;
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start >= 0 && end > start) return raw.slice(start, end + 1);
  return null;
}

/**
 * @param {string} text
 * @returns {{ ok: boolean, data?: object, error?: string }}
 */
export function parseGeminiJson(text) {
  const block = extractJsonBlock(text);
  if (!block) return { ok: false, error: 'no_json_block' };
  try {
    const data = JSON.parse(block);
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return { ok: false, error: 'json_not_object' };
    }
    return { ok: true, data: normalizeGeminiPayload(data) };
  } catch (err) {
    return { ok: false, error: 'json_parse_error', detail: err?.message || String(err) };
  }
}

/**
 * Normalize Gemini payload into stable shape.
 * @param {object} raw
 */
export function normalizeGeminiPayload(raw = {}) {
  const verification =
    raw.verification && typeof raw.verification === 'object'
      ? {
          choiceMatched: Boolean(raw.verification.choiceMatched),
          calculationCorrect: Boolean(raw.verification.calculationCorrect),
        }
      : { choiceMatched: false, calculationCorrect: false };

  return {
    summary: String(raw.summary ?? ''),
    stepByStep: Array.isArray(raw.stepByStep)
      ? raw.stepByStep.map((s) => (typeof s === 'string' ? s : String(s?.body ?? s?.title ?? s ?? '')))
      : [],
    calculation: Array.isArray(raw.calculation)
      ? raw.calculation.map((s) => (typeof s === 'string' ? s : String(s?.line ?? s?.body ?? s ?? '')))
      : [],
    correctAnswer: Number(raw.correctAnswer),
    verification,
    mistakeDiagnosis: String(raw.mistakeDiagnosis ?? ''),
    misconception: String(raw.misconception ?? ''),
    review30: String(raw.review30 ?? ''),
    formulaCard: String(raw.formulaCard ?? ''),
    examChecklist: Array.isArray(raw.examChecklist)
      ? raw.examChecklist.map((s) => String(s ?? ''))
      : [],
    tutorAdvice: String(raw.tutorAdvice ?? ''),
    confidence: clampConfidence(raw.confidence),
  };
}

function clampConfidence(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Merge missing-only recovery fragment into existing payload.
 * @param {object} base
 * @param {object} fragment
 * @param {string[]} missingFields
 */
export function mergeMissingFragment(base, fragment, missingFields = []) {
  const next = { ...normalizeGeminiPayload(base) };
  const frag = fragment && typeof fragment === 'object' ? fragment : {};
  const keys = missingFields.length ? missingFields : Object.keys(frag);
  keys.forEach((key) => {
    if (!(key in frag)) return;
    if (key === 'verification' && frag.verification && typeof frag.verification === 'object') {
      next.verification = {
        ...next.verification,
        ...frag.verification,
      };
      return;
    }
    next[key] = frag[key];
  });
  return normalizeGeminiPayload(next);
}

export { REQUIRED_KEYS };

export default {
  parseGeminiJson,
  normalizeGeminiPayload,
  mergeMissingFragment,
  REQUIRED_KEYS,
};
