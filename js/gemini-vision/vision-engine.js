/**
 * Sprint-17B — Vision Engine
 * Orchestrates locate → crop → Vision restore → validate.
 * Never solves problems. Never writes Question DB.
 */

import { locateQuestion, locateQuestionSync } from './question-locator.js';
import { computeCropRegion, cropQuestionImage, describeCrop } from './pdf-crop.js';
import { callGeminiVision } from './vision-reader.js';
import { parseVisionJson, normalizeVisionPayload } from './vision-parser.js';
import { validateVisionPayload, markdownTableToHtml } from './vision-validator.js';
import { scoreVisionQuality } from './vision-quality.js';
import {
  buildVisionCacheKey,
  getVisionCache,
  peekVisionCache,
  setVisionCache,
  appendVisionHistory,
  recordVisionQuality,
} from './vision-cache.js';
import { loadVisionConfig } from './vision-storage.js';
import { VISION_MODEL, VISION_PROMPT_VERSION } from './vision-utils.js';

/**
 * Local OCR cleanup when Vision API / image unavailable (fallback restore).
 * Still produces Vision JSON schema — does not invent answers.
 * @param {object} question
 */
export function restoreFromOcrLocally(question = {}) {
  const stem = String(question.question || question.originalQuestion || '').trim();
  let tableHtml = '';
  const table = question.table ?? question.tableHtml ?? '';
  if (typeof table === 'string') {
    if (/<table/i.test(table)) tableHtml = table;
    else if (table.includes('|')) tableHtml = markdownTableToHtml(table);
  } else if (table && typeof table === 'object') {
    tableHtml = table.html || table.markup || '';
    if (tableHtml && !/<table/i.test(tableHtml) && tableHtml.includes('|')) {
      tableHtml = markdownTableToHtml(tableHtml);
    }
  }

  const choices = Array.isArray(question.choices)
    ? question.choices.map((c) => {
        if (typeof c === 'string') return c;
        return String(c?.text ?? c?.label ?? c ?? '');
      })
    : [];
  while (choices.length < 5) choices.push('');

  /* Light cleanup: collapse excessive spaces inside Hangul compounds */
  const cleaned = stem
    .replace(/종합원\s+가/g, '종합원가')
    .replace(/단위완성\s+도/g, '단위완성도')
    .replace(/기말재\s+고/g, '기말재고')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  return normalizeVisionPayload({
    question: cleaned,
    tableHtml,
    choices: choices.slice(0, 5),
    figureHtml: '',
    formula: [],
    footnote: '',
  });
}

/**
 * Run Vision restore for one question (uses cache).
 * @param {object} question
 * @param {{
 *   force?: boolean,
 *   imageBase64?: string,
 *   dataUrl?: string,
 *   mimeType?: string,
 *   forceLocal?: boolean,
 * }} [options]
 */
export async function runVisionRestore(question = {}, options = {}) {
  const config = loadVisionConfig();
  const locate = options.skipAsyncLocate
    ? locateQuestionSync(question)
    : await locateQuestion(question);
  const crop = computeCropRegion(locate);
  const cacheKey = buildVisionCacheKey(
    locate.questionId || question.questionId,
    locate.pdfHash,
    config.visionModel || VISION_MODEL,
    config.promptVersion || VISION_PROMPT_VERSION,
  );

  if (!options.force) {
    const cached = getVisionCache(cacheKey);
    if (cached?.payload) {
      return {
        ok: true,
        fromCache: true,
        cacheHit: true,
        cacheKey,
        locate,
        crop: describeCrop(crop),
        payload: cached.payload,
        provider: cached.provider || 'cache',
        visionQuality: cached.visionQuality || null,
        source: cached.source || 'vision',
      };
    }
  } else {
    peekVisionCache(cacheKey);
  }

  /* Try crop image */
  let image = null;
  if (options.imageBase64 || options.dataUrl) {
    image = {
      ok: true,
      dataUrl: options.dataUrl,
      imageBase64: options.imageBase64,
      mimeType: options.mimeType || 'image/png',
      region: crop,
    };
  } else {
    image = await cropQuestionImage(locate, crop);
  }

  let payload = null;
  let provider = 'LOCAL_OCR_RESTORE';
  let visionCall = false;

  if (!options.forceLocal && image?.ok && (image.dataUrl || image.imageBase64 || options.imageBase64)) {
    const vision = await callGeminiVision({
      dataUrl: image.dataUrl,
      imageBase64: options.imageBase64 || image.imageBase64,
      mimeType: options.mimeType || image.mimeType,
      model: config.visionModel || VISION_MODEL,
    });
    if (vision.ok && vision.text) {
      const parsed = parseVisionJson(vision.text);
      if (parsed.ok) {
        payload = parsed.data;
        provider = 'GEMINI_VISION';
        visionCall = true;
      }
    }
  }

  if (!payload) {
    payload = restoreFromOcrLocally(question);
    provider = 'LOCAL_OCR_RESTORE';
  }

  const validated = validateVisionPayload(payload);
  payload = validated.payload;
  const visionQuality = scoreVisionQuality(payload);

  const tableRecovered = Boolean(payload.tableHtml && validated.tableOk);
  const formulaRecovered = Array.isArray(payload.formula) && payload.formula.length > 0;

  setVisionCache(cacheKey, {
    payload,
    provider,
    source: visionCall ? 'vision' : 'ocr-local-restore',
    questionId: locate.questionId || question.questionId,
    pdfHash: locate.pdfHash,
    visionModel: config.visionModel || VISION_MODEL,
    promptVersion: config.promptVersion || VISION_PROMPT_VERSION,
    crop: describeCrop(crop),
    visionQuality,
    recovered: true,
    tableRecovered,
    formulaRecovered,
    validated,
  });

  appendVisionHistory({
    questionId: locate.questionId || question.questionId,
    cacheKey,
    provider,
    visionCall,
    cacheHit: false,
    score: visionQuality.score,
  });

  recordVisionQuality(locate.questionId || question.questionId, {
    visionScore: visionQuality.score,
    recovered: true,
    tableOk: tableRecovered,
    formulaOk: formulaRecovered || visionQuality.formulaOk,
    provider,
  });

  return {
    ok: validated.ok || Boolean(payload.question),
    fromCache: false,
    cacheHit: false,
    cacheKey,
    locate,
    crop: describeCrop(crop),
    payload,
    provider,
    visionQuality,
    validated,
    source: visionCall ? 'vision' : 'ocr-local-restore',
  };
}

/**
 * Sync path — cache peek or local restore only (never blocks UI).
 */
export function runVisionRestoreSync(question = {}, options = {}) {
  const config = loadVisionConfig();
  const locate = locateQuestionSync(question);
  const cacheKey = buildVisionCacheKey(
    locate.questionId || question.questionId,
    locate.pdfHash,
    config.visionModel || VISION_MODEL,
    config.promptVersion || VISION_PROMPT_VERSION,
  );
  const cached = peekVisionCache(cacheKey);
  if (cached?.payload && !options.force) {
    getVisionCache(cacheKey);
    return {
      ok: true,
      fromCache: true,
      cacheHit: true,
      cacheKey,
      locate,
      payload: cached.payload,
      provider: cached.provider || 'cache',
      source: cached.source || 'vision',
    };
  }
  const payload = restoreFromOcrLocally(question);
  const validated = validateVisionPayload(payload);
  return {
    ok: true,
    fromCache: false,
    cacheHit: false,
    cacheKey,
    locate,
    payload: validated.payload,
    provider: 'LOCAL_OCR_RESTORE',
    source: 'ocr-local-restore',
    syncFallback: true,
  };
}

export default {
  runVisionRestore,
  runVisionRestoreSync,
  restoreFromOcrLocally,
};
