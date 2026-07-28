/**
 * Sprint-17B — Vision Recovery Hybrid Pipeline
 *
 * PDF → Locator → Crop → OCR Quality
 *   ≥ threshold → OCR
 *   < threshold → Gemini Vision → Vision JSON
 * → Resolved Question → Gemini Solver
 *
 * Fallback: Vision fail → OCR (student always sees a question).
 * Never writes Question / Pattern / Statistics DB.
 * Never mutates Learning / Recommendation / Mastery formulas.
 */

import { scoreOcrQuality } from './ocr-quality.js';
import { runVisionRestore, runVisionRestoreSync, restoreFromOcrLocally } from './vision-engine.js';
import {
  buildVisionCacheKey,
  peekVisionCache,
  getVisionCache,
  setVisionCache,
  appendVisionHistory,
  recordVisionQuality,
  getVisionDashboardStats,
} from './vision-cache.js';
import { locateQuestionSync } from './question-locator.js';
import { loadVisionConfig } from './vision-storage.js';
import { saveOverride } from '../reviewer/override-service.js';
import {
  loadStudentCacheDoc,
  saveStudentCacheDoc,
} from '../student/student-storage.js';
import {
  VISION_MODEL,
  VISION_PROMPT_VERSION,
  runWhenIdle,
} from './vision-utils.js';
import { normalizeVisionPayload } from './vision-parser.js';

function invalidateStudentQuestionCache(questionId) {
  if (!questionId) return;
  try {
    const doc = loadStudentCacheDoc();
    if (doc.byQuestion?.[questionId]) {
      delete doc.byQuestion[questionId];
      saveStudentCacheDoc(doc);
    }
  } catch (_err) {
    /* ignore */
  }
}

/**
 * Apply Vision payload onto a resolved student question (overlay).
 * @param {object} student
 * @param {object} payload
 * @param {object} [meta]
 */
export function applyVisionPayloadToQuestion(student, payload, meta = {}) {
  if (!student || !payload) return student;
  const next = { ...student };
  if (payload.question) {
    next.question = payload.question;
    /* keep originalQuestion for trace unless empty */
    if (!next.originalQuestion) next.originalQuestion = payload.question;
  }
  if (payload.tableHtml) {
    next.table = payload.tableHtml;
    next.tableHtml = payload.tableHtml;
    next.hasTable = true;
  }
  if (Array.isArray(payload.choices) && payload.choices.some((c) => String(c).trim())) {
    next.choices = payload.choices.map((c) => String(c ?? ''));
  }
  if (payload.figureHtml) next.figureHtml = payload.figureHtml;
  if (Array.isArray(payload.formula)) next.visionFormula = payload.formula;
  if (payload.footnote) next.footnote = payload.footnote;
  next._visionRecovered = true;
  next._visionSource = meta.source || 'vision';
  next._visionProvider = meta.provider || null;
  next._visionCacheHit = Boolean(meta.cacheHit);
  return next;
}

/**
 * Sync overlay for student-resolver — Vision Cache first, else OCR as-is.
 * Never blocks; never calls Vision API.
 * @param {object} student — already Override-resolved student question
 */
export function applyVisionOverlaySync(student) {
  if (!student || typeof student !== 'object') return student;
  try {
    const ocr = scoreOcrQuality(student);

    if (ocr.useOcr) {
      /* High quality OCR — skip Vision, count as API saved when cache consulted */
      const locate = locateQuestionSync(student);
      const config = loadVisionConfig();
      const key = buildVisionCacheKey(
        student.questionId,
        locate.pdfHash,
        config.visionModel || VISION_MODEL,
        config.promptVersion || VISION_PROMPT_VERSION,
      );
      const existing = peekVisionCache(key);
      if (!existing) {
        setVisionCache(key, {
          payload: restoreFromOcrLocally(student),
          provider: 'OCR',
          source: 'ocr',
          questionId: student.questionId,
          pdfHash: locate.pdfHash,
          recovered: false,
          ocrScore: ocr.score,
        });
      } else {
        getVisionCache(key);
      }
      return {
        ...student,
        _ocrQuality: ocr.score,
        _visionSource: 'ocr',
        _visionSkipped: true,
      };
    }

    /* Low OCR quality — prefer Vision cache */
    const locate = locateQuestionSync(student);
    const config = loadVisionConfig();
    const key = buildVisionCacheKey(
      student.questionId,
      locate.pdfHash,
      config.visionModel || VISION_MODEL,
      config.promptVersion || VISION_PROMPT_VERSION,
    );
    const cached = peekVisionCache(key);
    if (cached?.payload) {
      getVisionCache(key);
      return applyVisionPayloadToQuestion(student, cached.payload, {
        source: cached.source || 'vision',
        provider: cached.provider,
        cacheHit: true,
      });
    }

    /* No cache yet — return OCR (fallback). Background will fill Vision. */
    return {
      ...student,
      _ocrQuality: ocr.score,
      _visionPending: true,
      _visionSource: 'ocr-fallback',
    };
  } catch (_err) {
    return student;
  }
}

/**
 * Full async hybrid recovery.
 * @param {object} question
 * @param {object} [options]
 */
export async function recoverQuestionWithVision(question = {}, options = {}) {
  const ocr = scoreOcrQuality(question);
  recordVisionQuality(question.questionId, {
    ocrScore: ocr.score,
    threshold: ocr.threshold,
    useVision: ocr.useVision,
  });

  if (ocr.useOcr && !options.forceVision) {
    const payload = restoreFromOcrLocally(question);
    const locate = locateQuestionSync(question);
    const config = loadVisionConfig();
    const key = buildVisionCacheKey(
      question.questionId,
      locate.pdfHash,
      config.visionModel || VISION_MODEL,
      config.promptVersion || VISION_PROMPT_VERSION,
    );
    setVisionCache(key, {
      payload,
      provider: 'OCR',
      source: 'ocr',
      questionId: question.questionId,
      pdfHash: locate.pdfHash,
      recovered: false,
      ocrScore: ocr.score,
    });
    appendVisionHistory({
      questionId: question.questionId,
      decision: 'OCR',
      ocrScore: ocr.score,
      visionCall: false,
    });
    return {
      ok: true,
      decision: 'OCR',
      ocr,
      payload,
      question: applyVisionPayloadToQuestion(question, payload, {
        source: 'ocr',
        provider: 'OCR',
      }),
      cacheHit: false,
    };
  }

  try {
    const vision = await runVisionRestore(question, options);
    if (vision.ok && vision.payload) {
      return {
        ok: true,
        decision: 'VISION',
        ocr,
        vision,
        payload: vision.payload,
        question: applyVisionPayloadToQuestion(question, vision.payload, {
          source: vision.source,
          provider: vision.provider,
          cacheHit: vision.cacheHit,
        }),
        cacheHit: vision.cacheHit,
      };
    }
  } catch (err) {
    console.warn('[gemini-vision] Vision failed — OCR fallback', err);
  }

  /* Fallback: OCR */
  const payload = restoreFromOcrLocally(question);
  appendVisionHistory({
    questionId: question.questionId,
    decision: 'OCR_FALLBACK',
    ocrScore: ocr.score,
    visionCall: false,
  });
  return {
    ok: true,
    decision: 'OCR_FALLBACK',
    ocr,
    payload,
    question: applyVisionPayloadToQuestion(question, payload, {
      source: 'ocr-fallback',
      provider: 'OCR_FALLBACK',
    }),
    cacheHit: false,
    fallback: true,
  };
}

/**
 * Reviewer Approve Vision → Override Layer + Vision Cache update.
 * Question DB untouched.
 * @param {string} questionId
 * @param {object} payloadOrResult
 * @param {{ reviewer?: string, question?: object }} [meta]
 */
export function approveVisionToOverride(questionId, payloadOrResult, meta = {}) {
  const payload = normalizeVisionPayload(
    payloadOrResult?.payload || payloadOrResult || {},
  );
  if (!questionId || !payload.question) {
    return { ok: false, error: 'missing_questionId_or_payload' };
  }
  const version = new Date().toISOString();
  const locate = locateQuestionSync(meta.question || { questionId, source: {} });
  const config = loadVisionConfig();
  const key = buildVisionCacheKey(
    questionId,
    locate.pdfHash || 'approved',
    config.visionModel || VISION_MODEL,
    config.promptVersion || VISION_PROMPT_VERSION,
  );

  setVisionCache(key, {
    payload,
    provider: 'REVIEWER_APPROVED',
    source: 'vision-approved',
    questionId,
    pdfHash: locate.pdfHash || 'approved',
    recovered: true,
    tableRecovered: Boolean(payload.tableHtml),
    formulaRecovered: Array.isArray(payload.formula) && payload.formula.length > 0,
    approvedAt: version,
  });

  const result = saveOverride(
    questionId,
    {
      visionOcr: {
        version,
        approvedAt: version,
        payload,
        source: 'gemini-vision',
        promptVersion: VISION_PROMPT_VERSION,
        visionModel: VISION_MODEL,
      },
      /* Promote display fields so students see approved restore */
      question: payload.question,
      table: payload.tableHtml || undefined,
      choices: payload.choices,
      hasTable: Boolean(payload.tableHtml),
      reviewed: true,
      reviewer: meta.reviewer || 'reviewer',
    },
    {
      reviewer: meta.reviewer || 'reviewer',
      status: 'APPROVED',
      changedFields: ['visionOcr', 'question', 'table', 'choices'],
    },
  );

  try {
    invalidateStudentQuestionCache(questionId);
  } catch (_err) {
    /* ignore */
  }

  return result;
}

/**
 * Background prewarm for recommended / today questions (requestIdleCallback).
 * @param {object[]} questions
 * @param {{ limit?: number }} [options]
 */
export function prewarmVisionCache(questions = [], options = {}) {
  const config = loadVisionConfig();
  if (config.backgroundPrewarm === false) return { scheduled: 0 };
  const list = (Array.isArray(questions) ? questions : []).slice(0, options.limit || 8);
  let scheduled = 0;
  list.forEach((q, i) => {
    runWhenIdle(() => {
      recoverQuestionWithVision(q, { skipAsyncLocate: false }).catch(() => {});
    }, 1500 + i * 400);
    scheduled += 1;
  });
  return { scheduled };
}

export { getVisionDashboardStats, runVisionRestoreSync, scoreOcrQuality };

export default {
  applyVisionOverlaySync,
  applyVisionPayloadToQuestion,
  recoverQuestionWithVision,
  approveVisionToOverride,
  prewarmVisionCache,
  getVisionDashboardStats,
};
