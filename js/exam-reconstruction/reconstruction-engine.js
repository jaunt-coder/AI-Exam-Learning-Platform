/**
 * Sprint-17D.6 — Exam Reconstruction Engine
 *
 * PDF Source → Question Locator → Vision Reconstruction → question-layout
 * → Professor Engine Input (overlay)
 *
 * Never writes Question / Pattern / Statistics DB.
 * Never mutates Learning / Recommendation / Mastery formulas.
 */

import { locateQuestion, locateQuestionSync } from '../gemini-vision/question-locator.js';
import { runVisionRestore, restoreFromOcrLocally } from '../gemini-vision/vision-engine.js';
import { scoreOcrQuality } from '../gemini-vision/ocr-quality.js';
import {
  visionPayloadToLayout,
  normalizeQuestionLayout,
  layoutTablesToHtml,
} from './reconstruction-schema.js';
import { reconstructLocally } from './reconstruction-local.js';
import { reviewReconstructionQuality } from './reconstruction-quality.js';
import { RECONSTRUCTION_PROMPT_VERSION } from './reconstruction-prompt.js';
import {
  buildReconstructionCacheKey,
  getReconstructionCached,
  setReconstructionCached,
  peekReconstructionCached,
} from './reconstruction-storage.js';
import {
  applyReconstructionOverlay,
  applyReconstructionToReader,
} from './reconstruction-overlay.js';

export const RECONSTRUCTION_ENGINE_VERSION = '17D.6';
export {
  applyReconstructionOverlay,
  applyReconstructionToReader,
  layoutTablesToHtml,
  normalizeQuestionLayout,
  reviewReconstructionQuality,
  RECONSTRUCTION_PROMPT_VERSION,
};

/**
 * Reconstruct exam layout for one question (overlay).
 * @param {object} question — Resolved Question preferred
 * @param {{
 *   force?: boolean,
 *   forceLocal?: boolean,
 *   imageBase64?: string,
 *   dataUrl?: string,
 *   skipVision?: boolean,
 * }} [options]
 */
export async function reconstructExamQuestion(question = {}, options = {}) {
  const locate = options.skipAsyncLocate
    ? locateQuestionSync(question)
    : await locateQuestion(question);
  const cacheKey = buildReconstructionCacheKey(
    question.questionId || question.id,
    locate.pdfHash,
    RECONSTRUCTION_PROMPT_VERSION,
  );

  if (!options.force) {
    const cached = getReconstructionCached(cacheKey);
    if (cached?.layout) {
      const layout = normalizeQuestionLayout(cached.layout);
      const quality = cached.quality || reviewAgainstQuestion(layout, question);
      return {
        ok: true,
        layout,
        quality,
        locate,
        cacheKey,
        cacheHit: true,
        provider: layout.provider || cached.provider || 'CACHE',
        engineVersion: RECONSTRUCTION_ENGINE_VERSION,
      };
    }
  } else {
    peekReconstructionCached(cacheKey);
  }

  const baseline = {
    baselineText: String(question.originalQuestion || question.question || ''),
    baselineChoices: Array.isArray(question.choices) ? question.choices : [],
  };

  let layout = null;
  let provider = 'LOCAL_RECONSTRUCTION';

  const ocr = scoreOcrQuality(question);
  const preferVision = !options.forceLocal
    && !options.skipVision
    && (ocr.useVision || options.imageBase64 || options.dataUrl);

  if (preferVision) {
    try {
      const vision = await runVisionRestore(question, {
        force: options.force,
        forceLocal: false,
        imageBase64: options.imageBase64,
        dataUrl: options.dataUrl,
        mimeType: options.mimeType,
      });
      if (vision?.ok && vision.payload) {
        layout = visionPayloadToLayout(vision.payload, {
          questionId: question.questionId || question.id,
          sourcePage: locate.page,
          sourceFile: locate.pdfPath,
          provider: vision.provider || 'GEMINI_VISION',
        });
        provider = layout.provider;
      }
    } catch (_err) {
      layout = null;
    }
  }

  if (!layout) {
    /* Local reconstruction — always available */
    const localVision = restoreFromOcrLocally(question);
    layout = visionPayloadToLayout(localVision, {
      questionId: question.questionId || question.id,
      sourcePage: locate.page,
      sourceFile: locate.pdfPath,
      provider: 'LOCAL_RECONSTRUCTION',
    });
    /* Prefer richer local heuristic for spacing / data blocks */
    const heuristic = reconstructLocally(question, {
      sourcePage: locate.page,
      sourceFile: locate.pdfPath,
    });
    layout = mergeLayouts(heuristic, layout);
    provider = 'LOCAL_RECONSTRUCTION';
  }

  layout = normalizeQuestionLayout({
    ...layout,
    questionId: question.questionId || question.id,
    sourcePage: layout.sourcePage ?? locate.page,
    sourceFile: layout.sourceFile ?? locate.pdfPath,
    provider,
    reconstructedAt: new Date().toISOString(),
  });

  const quality = reviewReconstructionQuality(layout, baseline);

  setReconstructionCached(cacheKey, {
    layout,
    quality,
    provider,
    questionId: question.questionId || question.id,
    pdfHash: locate.pdfHash,
  });

  return {
    ok: true,
    layout,
    quality,
    locate,
    cacheKey,
    cacheHit: false,
    provider,
    engineVersion: RECONSTRUCTION_ENGINE_VERSION,
  };
}

/**
 * Sync path for Professor / tests (no network Vision).
 */
export function reconstructExamQuestionSync(question = {}, options = {}) {
  const locate = locateQuestionSync(question);
  const cacheKey = buildReconstructionCacheKey(
    question.questionId || question.id,
    locate.pdfHash,
    RECONSTRUCTION_PROMPT_VERSION,
  );

  if (!options.force) {
    const cached = peekReconstructionCached(cacheKey);
    if (cached?.layout) {
      getReconstructionCached(cacheKey);
      const layout = normalizeQuestionLayout(cached.layout);
      return {
        ok: true,
        layout,
        quality: cached.quality || reviewAgainstQuestion(layout, question),
        locate,
        cacheKey,
        cacheHit: true,
        provider: layout.provider || 'CACHE',
        engineVersion: RECONSTRUCTION_ENGINE_VERSION,
      };
    }
  }

  const layout = reconstructLocally(question, {
    sourcePage: locate.page,
    sourceFile: locate.pdfPath,
  });
  const quality = reviewAgainstQuestion(layout, question);
  if (options.saveCache !== false) {
    setReconstructionCached(cacheKey, {
      layout,
      quality,
      provider: layout.provider,
      questionId: question.questionId || question.id,
      pdfHash: locate.pdfHash,
    });
  }
  return {
    ok: true,
    layout,
    quality,
    locate,
    cacheKey,
    cacheHit: false,
    provider: layout.provider,
    engineVersion: RECONSTRUCTION_ENGINE_VERSION,
  };
}

/**
 * Professor entry: Resolved Question + Reconstruction Payload.
 * @param {object} question
 * @param {object} reader — problem reader payload
 * @param {object} [options]
 */
export async function prepareProfessorReconstructionInput(question, reader, options = {}) {
  const recon = options.forceLocal || options.syncOnly
    ? reconstructExamQuestionSync(question, options)
    : await reconstructExamQuestion(question, options);
  const nextReader = applyReconstructionToReader(reader, recon.layout, recon.quality);
  return {
    ...recon,
    reader: nextReader,
    promptFields: {
      questionText: nextReader.questionText,
      tableHtml: nextReader.tableHtml,
      choices: nextReader.choices,
      reconstruction: recon.layout,
      reconstructionQuality: recon.quality,
    },
  };
}

export function prepareProfessorReconstructionInputSync(question, reader, options = {}) {
  const recon = reconstructExamQuestionSync(question, options);
  const nextReader = applyReconstructionToReader(reader, recon.layout, recon.quality);
  return {
    ...recon,
    reader: nextReader,
    promptFields: {
      questionText: nextReader.questionText,
      tableHtml: nextReader.tableHtml,
      choices: nextReader.choices,
      reconstruction: recon.layout,
      reconstructionQuality: recon.quality,
    },
  };
}

function reviewAgainstQuestion(layout, question) {
  return reviewReconstructionQuality(layout, {
    baselineText: String(question.originalQuestion || question.question || ''),
    baselineChoices: Array.isArray(question.choices) ? question.choices : [],
  });
}

function mergeLayouts(primary, secondary) {
  const a = normalizeQuestionLayout(primary);
  const b = normalizeQuestionLayout(secondary);
  return normalizeQuestionLayout({
    ...b,
    ...a,
    questionText: a.questionText || b.questionText,
    tables: a.tables?.length ? a.tables : b.tables,
    formulaBlocks: a.formulaBlocks?.length ? a.formulaBlocks : b.formulaBlocks,
    figureReferences: a.figureReferences?.length ? a.figureReferences : b.figureReferences,
    choices: a.choices?.some((c) => c) ? a.choices : b.choices,
  });
}

export default {
  RECONSTRUCTION_ENGINE_VERSION,
  reconstructExamQuestion,
  reconstructExamQuestionSync,
  prepareProfessorReconstructionInput,
  prepareProfessorReconstructionInputSync,
  applyReconstructionOverlay,
  applyReconstructionToReader,
};
