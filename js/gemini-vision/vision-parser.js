/**
 * Sprint-17B — Vision JSON Parser
 * Schema: { question, tableHtml, choices[5], figureHtml, formula[], footnote }
 */

export const VISION_REQUIRED_KEYS = [
  'question',
  'tableHtml',
  'choices',
  'figureHtml',
  'formula',
  'footnote',
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
 */
export function parseVisionJson(text) {
  const block = extractJsonBlock(text);
  if (!block) return { ok: false, error: 'no_json_block' };
  try {
    const data = JSON.parse(block);
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return { ok: false, error: 'json_not_object' };
    }
    return { ok: true, data: normalizeVisionPayload(data) };
  } catch (err) {
    return { ok: false, error: 'json_parse_error', detail: err?.message || String(err) };
  }
}

/**
 * @param {object} raw
 */
export function normalizeVisionPayload(raw = {}) {
  const choices = Array.isArray(raw.choices)
    ? raw.choices.map((c) => String(c ?? '').trim())
    : [];
  while (choices.length < 5) choices.push('');
  return {
    question: String(raw.question ?? ''),
    tableHtml: String(raw.tableHtml ?? ''),
    choices: choices.slice(0, 5),
    figureHtml: String(raw.figureHtml ?? ''),
    formula: Array.isArray(raw.formula)
      ? raw.formula.map((f) => String(f ?? ''))
      : [],
    footnote: String(raw.footnote ?? ''),
  };
}

export function emptyVisionPayload() {
  return normalizeVisionPayload({});
}

export default {
  parseVisionJson,
  normalizeVisionPayload,
  emptyVisionPayload,
  VISION_REQUIRED_KEYS,
};
