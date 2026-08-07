/**
 * Sprint-17E — Parse Gemini Interactions (Responses) + legacy generateContent payloads
 */

/**
 * Extract plain text from Interactions API response.
 * @param {object} data
 */
export function extractInteractionsText(data) {
  if (!data || typeof data !== 'object') return '';

  if (typeof data.output_text === 'string' && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const steps = Array.isArray(data.steps) ? data.steps : [];
  const chunks = [];
  for (const step of steps) {
    if (!step || typeof step !== 'object') continue;
    const type = String(step.type || '');
    if (type && type !== 'model_output' && type !== 'text' && !type.includes('output')) {
      continue;
    }
    const content = step.content;
    if (typeof content === 'string') {
      chunks.push(content);
      continue;
    }
    if (Array.isArray(content)) {
      for (const part of content) {
        if (typeof part === 'string') chunks.push(part);
        else if (part && typeof part.text === 'string') chunks.push(part.text);
      }
    }
    if (typeof step.text === 'string') chunks.push(step.text);
    if (typeof step.delta === 'string') chunks.push(step.delta);
  }
  return chunks.join('').trim();
}

/**
 * Legacy generateContent text.
 * @param {object} data
 */
export function extractGenerateContentText(data) {
  if (!data || typeof data !== 'object') return '';
  return (
    data?.candidates?.[0]?.content?.parts
      ?.map((p) => p?.text || '')
      .join('')
      .trim()
    || ''
  );
}

/**
 * Unified parse.
 * @param {object} data
 * @param {'interactions'|'generateContent'} [mode]
 */
export function parseResponsesPayload(data, mode = 'interactions') {
  const text =
    mode === 'generateContent'
      ? extractGenerateContentText(data)
      : extractInteractionsText(data) || extractGenerateContentText(data);

  const usage = data?.usageMetadata || data?.usage || {};
  return {
    ok: Boolean(text),
    text,
    interactionId: data?.id || null,
    status: data?.status || null,
    steps: Array.isArray(data?.steps) ? data.steps : [],
    usage: {
      promptTokens: usage.promptTokenCount ?? usage.input_tokens ?? null,
      outputTokens: usage.candidatesTokenCount ?? usage.output_tokens ?? null,
      totalTokens: usage.totalTokenCount ?? usage.total_tokens ?? null,
    },
    raw: data,
  };
}

/**
 * Parse SSE / NDJSON stream chunk line into delta text.
 * @param {string} line
 */
export function parseStreamLine(line) {
  const raw = String(line || '').trim();
  if (!raw || raw === '[DONE]') return { done: raw === '[DONE]', delta: '' };
  let payload = raw;
  if (payload.startsWith('data:')) payload = payload.slice(5).trim();
  if (!payload || payload === '[DONE]') return { done: payload === '[DONE]', delta: '' };
  try {
    const obj = JSON.parse(payload);
    const eventType = String(obj.event || obj.type || '');
    let delta = '';
    if (typeof obj.delta === 'string') delta = obj.delta;
    else if (typeof obj.text === 'string') delta = obj.text;
    else if (obj.content && typeof obj.content === 'string') delta = obj.content;
    else if (Array.isArray(obj.content)) {
      delta = obj.content.map((c) => (typeof c === 'string' ? c : c?.text || '')).join('');
    } else if (obj.step?.delta) delta = String(obj.step.delta);
    else {
      const parsed = parseResponsesPayload(obj, 'interactions');
      if (parsed.text) delta = parsed.text;
    }
    return {
      done: eventType.includes('complete') || eventType.includes('done'),
      delta,
      eventType,
      raw: obj,
    };
  } catch (_e) {
    return { done: false, delta: '', rawLine: raw };
  }
}

export default {
  extractInteractionsText,
  extractGenerateContentText,
  parseResponsesPayload,
  parseStreamLine,
};
