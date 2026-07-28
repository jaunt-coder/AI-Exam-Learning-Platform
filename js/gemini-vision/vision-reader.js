/**
 * Sprint-17B — Vision Reader (Gemini Vision call — restore only, never solve)
 */

import { resolveGeminiApiKey, GEMINI_BASE_URL, GEMINI_DEFAULT_MODEL } from '../llm/gemini-provider.js';
import { VISION_MODEL, VISION_PROMPT_VERSION } from './vision-utils.js';

export const VISION_RESTORE_PROMPT = [
  '당신은 시험지 복원기입니다.',
  '보이는 내용만 JSON으로 작성하라.',
  '추론 금지.',
  '생략 금지.',
  '표는 HTML Table로 작성.',
  'Markdown 사용 금지.',
  '수식은 Latex.',
  'JSON 외 출력 금지.',
  '',
  '스키마:',
  '{',
  '  "question": "",',
  '  "tableHtml": "",',
  '  "choices": ["", "", "", "", ""],',
  '  "figureHtml": "",',
  '  "formula": [],',
  '  "footnote": ""',
  '}',
  '',
  'tableHtml은 반드시 <table><tr><td> 구조를 사용한다.',
].join('\n');

/**
 * @param {{
 *   imageBase64?: string,
 *   mimeType?: string,
 *   dataUrl?: string,
 *   model?: string,
 *   fetchImpl?: typeof fetch,
 * }} input
 */
export async function callGeminiVision(input = {}) {
  const apiKey = resolveGeminiApiKey();
  if (!apiKey) {
    return { ok: false, error: 'missing_api_key', provider: 'GEMINI_VISION' };
  }

  let base64 = input.imageBase64 || '';
  let mimeType = input.mimeType || 'image/png';
  if (!base64 && input.dataUrl) {
    const m = String(input.dataUrl).match(/^data:([^;]+);base64,(.+)$/);
    if (m) {
      mimeType = m[1];
      base64 = m[2];
    }
  }
  if (!base64) {
    return { ok: false, error: 'missing_image', provider: 'GEMINI_VISION' };
  }

  const fetchImpl = input.fetchImpl || globalThis.fetch?.bind(globalThis);
  if (typeof fetchImpl !== 'function') {
    return { ok: false, error: 'fetch_unavailable', provider: 'GEMINI_VISION' };
  }

  const model = input.model || VISION_MODEL || GEMINI_DEFAULT_MODEL;
  const url = `${GEMINI_BASE_URL}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  try {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: VISION_RESTORE_PROMPT },
              { inline_data: { mime_type: mimeType, data: base64 } },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return {
        ok: false,
        error: `gemini_vision_http_${res.status}`,
        detail: errText.slice(0, 200),
        provider: 'GEMINI_VISION',
        model,
      };
    }

    const data = await res.json();
    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((p) => p?.text || '')
        .join('') || '';
    if (!text) {
      return { ok: false, error: 'empty_response', provider: 'GEMINI_VISION', model };
    }
    return {
      ok: true,
      text: String(text).trim(),
      provider: 'GEMINI_VISION',
      model,
      promptVersion: VISION_PROMPT_VERSION,
    };
  } catch (err) {
    return {
      ok: false,
      error: 'gemini_vision_network_error',
      detail: err?.message || String(err),
      provider: 'GEMINI_VISION',
      model,
    };
  }
}

export default {
  VISION_RESTORE_PROMPT,
  callGeminiVision,
};
