/**
 * Sprint-17A — Gemini Native Problem Solver Orchestrator
 * Problem First AI Pipeline
 *
 * Legacy Pattern-based Solution Engine is preserved.
 * Gemini generates problem-specific solutions only.
 * Pattern remains for Learning Recommendation only.
 *
 * Never writes Question / Pattern / Statistics DB.
 * Never mutates Learning / Recommendation / Mastery formulas.
 * Never mutates Runtime / Resolver / existing Override schema.
 */

import { readProblem, attachGrade } from './problem-reader.js';
import {
  MODEL_VERSION,
  callGemini,
  solveProblemLocally,
} from './problem-solver.js';
import {
  PROMPT_VERSION,
  buildSolvePrompt,
  buildValidationPrompt,
  buildMissingRecoveryPrompt,
} from './prompt-builder.js';
import {
  parseGeminiJson,
  mergeMissingFragment,
  normalizeGeminiPayload,
} from './response-parser.js';
import { checkGeminiQuality } from './quality-checker.js';
import { verifyAnswerLocally, applyPass2Validation } from './answer-verifier.js';
import { buildExplanationFromGemini, buildSmartSectionsFromGemini } from './explanation-builder.js';
import { buildDiagnosisFromGemini, buildMisconceptionFromGemini } from './diagnosis-builder.js';
import { buildReview30FromGemini } from './review-builder.js';
import { buildFormulaCardFromGemini, buildFormulasFromGemini } from './formula-builder.js';
import { buildExamTipsFromGemini } from './exam-tip-builder.js';
import { buildTutorFromGemini } from './tutor-builder.js';
import {
  buildGeminiCacheKey,
  getCachedGemini,
  peekCachedGemini,
  setCachedGemini,
  appendGeminiHistory,
  recordGeminiQuality,
  saveGeminiVersionDoc,
  getGeminiDashboardStats,
} from './cache-manager.js';
import { saveOverride } from '../reviewer/override-service.js';

export const GEMINI_SOLVER_VERSION = '17A';
export { MODEL_VERSION, PROMPT_VERSION };

/**
 * Full Problem First pipeline.
 * @param {{
 *   question: object,
 *   grade?: object,
 *   pattern?: object|null,
 *   force?: boolean,
 *   skipPass2?: boolean,
 *   forceLocal?: boolean,
 * }} input
 */
export async function solveWithGemini(input = {}) {
  const started = Date.now();
  const question = input.question || {};
  const grade = input.grade || {};
  const pattern = input.pattern || null;

  const reader = attachGrade(readProblem(question, pattern), grade);
  const cacheKey = buildGeminiCacheKey(
    reader.questionId,
    reader.overrideVersion,
    MODEL_VERSION,
    PROMPT_VERSION,
  );

  /* Reviewer-approved Override geminiNative takes precedence for students */
  if (reader.approvedGemini?.payload && !input.force) {
    const approved = normalizeGeminiPayload(reader.approvedGemini.payload);
    return finalizeResult({
      payload: approved,
      reader,
      cacheKey,
      fromCache: true,
      cacheHit: true,
      provider: 'override-approved',
      durationMs: Date.now() - started,
      pass2Applied: false,
      missingRecovered: false,
      quality: checkGeminiQuality(approved),
    });
  }

  if (!input.force) {
    const cached = getCachedGemini(cacheKey);
    if (cached?.payload) {
      return finalizeResult({
        payload: normalizeGeminiPayload(cached.payload),
        reader,
        cacheKey,
        fromCache: true,
        cacheHit: true,
        provider: cached.provider || 'cache',
        durationMs: Date.now() - started,
        pass2Applied: Boolean(cached.pass2Applied),
        missingRecovered: Boolean(cached.missingRecovered),
        quality: checkGeminiQuality(cached.payload),
      });
    }
  } else {
    /* force still records miss when peek empty */
    peekCachedGemini(cacheKey);
  }

  saveGeminiVersionDoc({ modelVersion: MODEL_VERSION, promptVersion: PROMPT_VERSION });

  const promptPayload = {
    questionText: reader.questionText,
    tableHtml: reader.tableHtml,
    choices: reader.choices,
    correctAnswer: reader.correctAnswer,
    patternMetadata: reader.patternMetadata,
  };

  /* ---- Pass 1: Gemini solve ---- */
  let payload = null;
  let provider = 'LOCAL_PROBLEM_FIRST';
  const solvePrompt = buildSolvePrompt(promptPayload);
  const pass1 = await callGemini(solvePrompt, {
    forceLocal: input.forceLocal,
  });

  if (pass1.ok && pass1.text) {
    const parsed = parseGeminiJson(pass1.text);
    if (parsed.ok) {
      payload = parsed.data;
      provider = pass1.provider || 'GEMINI';
    }
  }

  if (!payload) {
    payload = solveProblemLocally(reader);
    provider = pass1.localFallback || !pass1.ok ? 'LOCAL_PROBLEM_FIRST' : provider;
  }

  /* Local answer verification */
  const localVerify = verifyAnswerLocally(payload, {
    correctAnswer: reader.correctAnswer,
    choices: reader.choices,
  });
  payload = localVerify.payload;

  /* Quality check + Missing recovery (one retry, missing only) */
  let quality = checkGeminiQuality(payload);
  let missingRecovered = false;
  if (!quality.ok && quality.missing.length) {
    const recoveryPrompt = buildMissingRecoveryPrompt(
      payload,
      quality.missing,
      promptPayload,
    );
    const recovery = await callGemini(recoveryPrompt, {
      forceLocal: input.forceLocal || provider === 'LOCAL_PROBLEM_FIRST',
    });
    if (recovery.ok && recovery.text) {
      const frag = parseGeminiJson(recovery.text);
      if (frag.ok) {
        payload = mergeMissingFragment(payload, frag.data, quality.missing);
        missingRecovered = true;
      }
    } else if (provider === 'LOCAL_PROBLEM_FIRST') {
      /* Local fill for missing keys only */
      const localFull = solveProblemLocally(reader);
      payload = mergeMissingFragment(payload, localFull, quality.missing);
      missingRecovered = true;
    }
    quality = checkGeminiQuality(payload);
  }

  /* ---- Pass 2: Gemini validation ---- */
  let pass2Applied = false;
  if (!input.skipPass2) {
    const validationPrompt = buildValidationPrompt(payload, {
      correctAnswer: reader.correctAnswer,
      choices: reader.choices,
    });
    const pass2Call = await callGemini(validationPrompt, {
      forceLocal: input.forceLocal || provider === 'LOCAL_PROBLEM_FIRST',
      maxTokens: 1200,
    });
    if (pass2Call.ok && pass2Call.text) {
      const pass2Parsed = parseGeminiJson(pass2Call.text);
      if (pass2Parsed.ok) {
        payload = applyPass2Validation(payload, pass2Parsed.data);
        pass2Applied = true;
      }
    } else {
      /* Local Pass-2: re-verify */
      const re = verifyAnswerLocally(payload, {
        correctAnswer: reader.correctAnswer,
        choices: reader.choices,
      });
      payload = applyPass2Validation(re.payload, {
        calculationCorrect: true,
        choiceMatched: re.verification.choiceMatched,
        issues: re.ok ? [] : ['local_choice_mismatch'],
        confidence: payload.confidence,
      });
      pass2Applied = true;
    }
  }

  const durationMs = Date.now() - started;
  setCachedGemini(cacheKey, {
    payload,
    provider,
    modelVersion: MODEL_VERSION,
    promptVersion: PROMPT_VERSION,
    overrideVersion: reader.overrideVersion,
    questionId: reader.questionId,
    durationMs,
    pass2Applied,
    missingRecovered,
    quality: quality.report,
  });

  appendGeminiHistory({
    questionId: reader.questionId,
    cacheKey,
    provider,
    durationMs,
    confidence: payload.confidence,
    qualityScore: quality.score,
    missingCount: quality.missing.length,
    cacheHit: false,
  });

  recordGeminiQuality(reader.questionId, quality.report, payload.confidence);

  return finalizeResult({
    payload,
    reader,
    cacheKey,
    fromCache: false,
    cacheHit: false,
    provider,
    durationMs,
    pass2Applied,
    missingRecovered,
    quality,
  });
}

function finalizeResult(ctx) {
  const {
    payload,
    reader,
    cacheKey,
    fromCache,
    cacheHit,
    provider,
    durationMs,
    pass2Applied,
    missingRecovered,
    quality,
  } = ctx;

  const explanation = buildExplanationFromGemini(payload);
  const diagnosis = buildDiagnosisFromGemini(payload, {
    selected: reader.selectedAnswer,
    result: reader.isCorrect ? 'correct' : 'wrong',
  });
  const misconception = buildMisconceptionFromGemini(payload);
  const review30 = buildReview30FromGemini(payload);
  const formulaCard = buildFormulaCardFromGemini(payload);
  const formulas = buildFormulasFromGemini(payload);
  const examTutor = buildExamTipsFromGemini(payload);
  const tutor = buildTutorFromGemini(payload);
  const smartExplanation = buildSmartSectionsFromGemini(payload);

  const calculation = (payload.calculation || []).map((line, i) => ({
    title: `계산 ${i + 1}`,
    lines: [String(line)],
  }));

  return {
    schemaVersion: 'v1',
    engineVersion: GEMINI_SOLVER_VERSION,
    source: 'gemini-native',
    questionId: reader.questionId,
    patternId: reader.patternMetadata?.patternId || null,
    cacheKey,
    fromCache: Boolean(fromCache),
    cacheHit: Boolean(cacheHit),
    provider,
    modelVersion: MODEL_VERSION,
    promptVersion: PROMPT_VERSION,
    durationMs,
    pass2Applied: Boolean(pass2Applied),
    missingRecovered: Boolean(missingRecovered),
    quality: quality.report || quality,
    payload,
    /* UI-ready slices */
    summary: payload.summary,
    explanation,
    smartExplanation,
    calculation,
    diagnosis,
    misconception,
    review30,
    formulaCard,
    formulas,
    examTutor,
    tutor,
    keyTakeaway: {
      text: payload.summary || payload.review30 || '',
      source: 'gemini-native',
    },
    verification: payload.verification,
    confidence: payload.confidence,
    correctAnswer: payload.correctAnswer,
  };
}

/**
 * Merge Gemini result into legacy Solution Pack.
 * Keeps Learning Prescription / Next Recommendation from Learning Engine path.
 * @param {object} pack — generateSolutionPack result (legacy preserved)
 * @param {object} gemini — solveWithGemini result
 */
export function mergeGeminiIntoPack(pack, gemini) {
  if (!pack || !gemini) return pack;
  return {
    ...pack,
    geminiSolverVersion: GEMINI_SOLVER_VERSION,
    geminiNative: gemini,
    explanation: gemini.explanation || pack.explanation,
    calculation: gemini.calculation?.length ? gemini.calculation : pack.calculation,
    diagnosis: gemini.diagnosis || pack.diagnosis,
    misconception: gemini.misconception || pack.misconception,
    formulas: gemini.formulas || pack.formulas,
    keyTakeaway: gemini.keyTakeaway || pack.keyTakeaway,
    tutor: gemini.tutor || pack.tutor,
    /* prescription + nextProblems stay from Learning Engine / legacy pack */
  };
}

/**
 * Apply Gemini layers onto Smart Tutor enriched pack (Result Accordion content).
 */
export function applyGeminiToSmartPack(smartPack, gemini) {
  if (!smartPack || !gemini) return smartPack;
  const next = { ...smartPack, geminiNative: gemini };

  if (gemini.smartExplanation) {
    next.smartReview = {
      ...(smartPack.smartReview || {}),
      explanation: gemini.smartExplanation,
      thirtySecond: gemini.review30,
      source: 'gemini-native',
    };
  }
  if (gemini.formulaCard) next.formulaCard = gemini.formulaCard;
  if (gemini.examTutor) next.examTutor = gemini.examTutor;
  if (gemini.diagnosis) next.diagnosis = gemini.diagnosis;
  if (gemini.calculation?.length) next.calculation = gemini.calculation;
  if (gemini.explanation) next.explanation = gemini.explanation;
  if (gemini.tutor) next.tutor = gemini.tutor;

  next.resultSource = 'gemini-native';
  next.geminiMeta = {
    cacheHit: gemini.cacheHit,
    provider: gemini.provider,
    confidence: gemini.confidence,
    qualityScore: gemini.quality?.score ?? null,
    durationMs: gemini.durationMs,
    pass2Applied: gemini.pass2Applied,
  };

  return next;
}

/**
 * Reviewer Approve → Override Layer only (Question DB untouched).
 * Additive field: override.geminiNative
 * @param {string} questionId
 * @param {object} geminiResultOrPayload
 * @param {{ reviewer?: string }} [meta]
 */
export function approveGeminiToOverride(questionId, geminiResultOrPayload, meta = {}) {
  const payload =
    geminiResultOrPayload?.payload
    || geminiResultOrPayload
    || null;
  if (!questionId || !payload) {
    return { ok: false, error: 'missing_questionId_or_payload' };
  }

  const normalized = normalizeGeminiPayload(payload);
  const version = new Date().toISOString();

  return saveOverride(
    questionId,
    {
      geminiNative: {
        version,
        approvedAt: version,
        payload: normalized,
        modelVersion: MODEL_VERSION,
        promptVersion: PROMPT_VERSION,
        source: 'gemini-native',
      },
      reviewed: true,
      reviewer: meta.reviewer || 'reviewer',
    },
    {
      reviewer: meta.reviewer || 'reviewer',
      status: 'APPROVED',
      changedFields: ['geminiNative'],
    },
  );
}

/**
 * Sync helper used by tests / offline harness.
 */
export function solveWithGeminiSync(input = {}) {
  const question = input.question || {};
  const grade = input.grade || {};
  const pattern = input.pattern || null;
  const reader = attachGrade(readProblem(question, pattern), grade);
  const cacheKey = buildGeminiCacheKey(
    reader.questionId,
    reader.overrideVersion,
    MODEL_VERSION,
    PROMPT_VERSION,
  );

  if (!input.force) {
    const cached = peekCachedGemini(cacheKey);
    if (cached?.payload) {
      getCachedGemini(cacheKey);
      return finalizeResult({
        payload: normalizeGeminiPayload(cached.payload),
        reader,
        cacheKey,
        fromCache: true,
        cacheHit: true,
        provider: cached.provider || 'cache',
        durationMs: 0,
        pass2Applied: Boolean(cached.pass2Applied),
        missingRecovered: false,
        quality: checkGeminiQuality(cached.payload),
      });
    }
  }

  let payload = solveProblemLocally(reader);
  const localVerify = verifyAnswerLocally(payload, {
    correctAnswer: reader.correctAnswer,
    choices: reader.choices,
  });
  payload = localVerify.payload;
  let quality = checkGeminiQuality(payload);
  if (!quality.ok) {
    const localFull = solveProblemLocally(reader);
    payload = mergeMissingFragment(payload, localFull, quality.missing);
    quality = checkGeminiQuality(payload);
  }
  payload = applyPass2Validation(payload, {
    calculationCorrect: true,
    choiceMatched: localVerify.verification.choiceMatched,
    issues: [],
    confidence: payload.confidence,
  });

  setCachedGemini(cacheKey, {
    payload,
    provider: 'LOCAL_PROBLEM_FIRST',
    modelVersion: MODEL_VERSION,
    promptVersion: PROMPT_VERSION,
    overrideVersion: reader.overrideVersion,
    questionId: reader.questionId,
    durationMs: 0,
    pass2Applied: true,
    missingRecovered: !quality.ok ? false : true,
    quality: quality.report,
  });
  recordGeminiQuality(reader.questionId, quality.report, payload.confidence);
  appendGeminiHistory({
    questionId: reader.questionId,
    cacheKey,
    provider: 'LOCAL_PROBLEM_FIRST',
    cacheHit: false,
  });

  return finalizeResult({
    payload,
    reader,
    cacheKey,
    fromCache: false,
    cacheHit: false,
    provider: 'LOCAL_PROBLEM_FIRST',
    durationMs: 0,
    pass2Applied: true,
    missingRecovered: true,
    quality,
  });
}

export { getGeminiDashboardStats };

export default {
  GEMINI_SOLVER_VERSION,
  solveWithGemini,
  solveWithGeminiSync,
  mergeGeminiIntoPack,
  applyGeminiToSmartPack,
  approveGeminiToOverride,
  getGeminiDashboardStats,
};
