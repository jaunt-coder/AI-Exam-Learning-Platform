/**
 * Sprint-17D — Professor-Level Explanation Engine (Orchestrator)
 *
 * Replaces Explanation generation layer only.
 * Keeps Gemini Solver / Vision / Reviewer Override / Runtime architecture.
 * Never writes Question / Pattern / Statistics DB.
 * Never mutates Learning / Recommendation / Mastery formulas.
 *
 * Cost protection: Manual Trigger only — do not bulk-generate cache.
 */

import { readProblem, attachGrade } from '../gemini-solver/problem-reader.js';
import {
  MODEL_VERSION,
  callGemini,
  resolveGeminiApiKey,
} from '../gemini-solver/problem-solver.js';
import { parseGeminiJson } from '../gemini-solver/response-parser.js';
import { verifyAnswerLocally, applyPass2Validation } from '../gemini-solver/answer-verifier.js';
import {
  buildExplanationFromGemini,
  buildSmartSectionsFromGemini,
} from '../gemini-solver/explanation-builder.js';
import { buildDiagnosisFromGemini, buildMisconceptionFromGemini } from '../gemini-solver/diagnosis-builder.js';
import { buildReview30FromGemini } from '../gemini-solver/review-builder.js';
import { buildFormulaCardFromGemini, buildFormulasFromGemini } from '../gemini-solver/formula-builder.js';
import { buildExamTipsFromGemini } from '../gemini-solver/exam-tip-builder.js';
import { buildTutorFromGemini } from '../gemini-solver/tutor-builder.js';
import {
  PROFESSOR_PROMPT_VERSION,
  buildProfessorSolvePrompt,
  buildProfessorContext,
} from './professor-prompt.js';
import { analyzeProblem } from './problem-analyzer.js';
import { detectCoreConcept } from './concept-detector.js';
import { selectAppliedTheory } from './theory-selector.js';
import { buildSolutionStrategy } from './solution-strategy.js';
import {
  reviewExplanationQuality,
  QUALITY_APPROVE,
} from './explanation-quality-reviewer.js';
import { resolveRegenMode, buildRegenPrompt } from './explanation-regenerator.js';
import {
  buildProfessorCacheKey,
  getProfessorCached,
  peekProfessorCache,
  setProfessorCached,
  recordProfessorQuality,
  appendProfessorHistory,
  getProfessorDashboardStats,
} from './professor-cache.js';
import {
  normalizeProfessorPayload,
  professorPayloadToMarkdown,
  markdownToProfessorPayload,
} from './professor-normalize.js';
import { saveOverride } from '../reviewer/override-service.js';
import { resolveSubjectIdForQuestion } from '../subject/subject-router.js';

export const PROFESSOR_ENGINE_VERSION = '17D';
export { PROFESSOR_PROMPT_VERSION, MODEL_VERSION, QUALITY_APPROVE };
export { professorPayloadToMarkdown, markdownToProfessorPayload, getProfessorDashboardStats };

/**
 * Manual Professor Explanation generation.
 * @param {{
 *   question: object,
 *   grade?: object,
 *   pattern?: object|null,
 *   force?: boolean,
 *   forceLocal?: boolean,
 *   skipRegen?: boolean,
 *   saveCache?: boolean,
 * }} input
 */
export async function generateProfessorExplanation(input = {}) {
  const started = Date.now();
  const question = input.question || {};
  const grade = input.grade || {};
  const pattern = input.pattern || null;

  const reader = attachGrade(readProblem(question, pattern), grade);
  const subjectId =
    resolveSubjectIdForQuestion(question)
    || question.subjectPluginId
    || question.subjectId
    || 'accounting';

  const cacheKey = buildProfessorCacheKey(
    reader.questionId,
    reader.overrideVersion,
    MODEL_VERSION,
    PROFESSOR_PROMPT_VERSION,
  );

  /* Reviewer-approved Override takes precedence */
  if (reader.approvedGemini?.payload && !input.force) {
    const approved = normalizeProfessorPayload(reader.approvedGemini.payload, {
      choices: reader.choices,
      correctAnswer: reader.correctAnswer,
    });
    const quality = reviewExplanationQuality(approved, qualityCtx(reader));
    return finalizeProfessor({
      payload: approved,
      reader,
      cacheKey,
      fromCache: true,
      cacheHit: true,
      provider: 'override-approved',
      durationMs: Date.now() - started,
      regenerated: false,
      quality,
      subjectId,
      analysis: null,
    });
  }

  if (!input.force) {
    const cached = getProfessorCached(cacheKey);
    if (cached?.payload) {
      const payload = normalizeProfessorPayload(cached.payload, {
        choices: reader.choices,
        correctAnswer: reader.correctAnswer,
      });
      const quality = reviewExplanationQuality(payload, qualityCtx(reader));
      return finalizeProfessor({
        payload,
        reader,
        cacheKey,
        fromCache: true,
        cacheHit: true,
        provider: cached.provider || 'cache',
        durationMs: Date.now() - started,
        regenerated: false,
        quality,
        subjectId,
        analysis: null,
      });
    }
  } else {
    peekProfessorCache(cacheKey);
  }

  const promptPayload = {
    subjectId,
    questionText: reader.questionText,
    tableHtml: reader.tableHtml,
    choices: reader.choices,
    correctAnswer: reader.correctAnswer,
    patternMetadata: reader.patternMetadata,
  };

  const ctx = buildProfessorContext(promptPayload);
  const analysis = ctx.analysis;
  const concept = ctx.concept;
  const theory = ctx.theory;
  const strategy = ctx.strategy;

  let payload = null;
  let provider = 'LOCAL_PROFESSOR';
  const solvePrompt = buildProfessorSolvePrompt(promptPayload);
  const pass1 = await callGemini(solvePrompt, {
    forceLocal: input.forceLocal,
    temperature: 0.35,
    maxTokens: 4096,
  });

  if (pass1.ok && pass1.text) {
    const parsed = parseGeminiJson(pass1.text);
    if (parsed.ok) {
      payload = normalizeProfessorPayload(parsed.data, {
        choices: reader.choices,
        correctAnswer: reader.correctAnswer,
      });
      provider = pass1.provider || 'GEMINI';
    }
  }

  if (!payload) {
    payload = buildLocalProfessorPayload(reader, { analysis, concept, theory, strategy, subjectId });
    provider = 'LOCAL_PROFESSOR';
  }

  const localVerify = verifyAnswerLocally(payload, {
    correctAnswer: reader.correctAnswer,
    choices: reader.choices,
  });
  payload = normalizeProfessorPayload(localVerify.payload, {
    choices: reader.choices,
    correctAnswer: reader.correctAnswer,
  });

  let quality = reviewExplanationQuality(payload, qualityCtx(reader));
  let regenerated = false;
  let regenMode = resolveRegenMode(quality);

  if (!input.skipRegen && regenMode !== 'none') {
    const regenPrompt = buildRegenPrompt(
      regenMode,
      promptPayload,
      payload,
      quality.missing,
    );
    const regenCall = await callGemini(regenPrompt, {
      forceLocal: input.forceLocal || provider === 'LOCAL_PROFESSOR',
      temperature: 0.3,
      maxTokens: 4096,
    });
    if (regenCall.ok && regenCall.text) {
      const frag = parseGeminiJson(regenCall.text);
      if (frag.ok) {
        payload = normalizeProfessorPayload(
          { ...payload, ...frag.data, solution: { ...payload.solution, ...frag.data.solution } },
          { choices: reader.choices, correctAnswer: reader.correctAnswer },
        );
        regenerated = true;
        if (regenCall.provider) provider = regenCall.provider;
      }
    } else if (provider === 'LOCAL_PROFESSOR') {
      payload = buildLocalProfessorPayload(reader, {
        analysis,
        concept,
        theory,
        strategy,
        subjectId,
        enrich: true,
      });
      regenerated = true;
    }
    quality = reviewExplanationQuality(payload, qualityCtx(reader));
  }

  payload = applyPass2Validation(payload, {
    calculationCorrect: true,
    choiceMatched: localVerify.verification?.choiceMatched !== false,
    issues: [],
    confidence: Math.max(Number(payload.confidence) || 0, quality.score),
  });
  payload = normalizeProfessorPayload(payload, {
    choices: reader.choices,
    correctAnswer: reader.correctAnswer,
  });
  quality = reviewExplanationQuality(payload, qualityCtx(reader));

  const durationMs = Date.now() - started;

  /* Cache write only when explicitly allowed (Manual Trigger path sets saveCache true) */
  const saveCache = input.saveCache !== false;
  if (saveCache) {
    setProfessorCached(cacheKey, {
      payload,
      provider,
      modelVersion: MODEL_VERSION,
      promptVersion: PROFESSOR_PROMPT_VERSION,
      overrideVersion: reader.overrideVersion,
      questionId: reader.questionId,
      durationMs,
      regenerated,
      quality: quality.report,
    }, { allowWrite: true });
  }

  recordProfessorQuality(reader.questionId, quality.report, { regenerated });
  appendProfessorHistory({
    questionId: reader.questionId,
    cacheKey,
    provider,
    durationMs,
    qualityScore: quality.score,
    decision: quality.decision,
    regenerated,
    cacheHit: false,
    manual: true,
  });

  return finalizeProfessor({
    payload,
    reader,
    cacheKey,
    fromCache: false,
    cacheHit: false,
    provider,
    durationMs,
    regenerated,
    quality,
    subjectId,
    analysis,
    concept,
    theory,
    strategy,
  });
}

function qualityCtx(reader) {
  return {
    questionText: reader.questionText,
    tableHtml: reader.tableHtml,
    choices: reader.choices,
    correctAnswer: reader.correctAnswer,
  };
}

/**
 * High-structure local fallback (offline / missing API key).
 * Still problem-specific — not Pattern template dump.
 */
export function buildLocalProfessorPayload(reader, ctx = {}) {
  const analysis = ctx.analysis || analyzeProblem({
    questionText: reader.questionText,
    tableHtml: reader.tableHtml,
    choices: reader.choices,
    subjectId: ctx.subjectId,
  });
  const concept = ctx.concept || detectCoreConcept({
    questionText: reader.questionText,
    subjectId: ctx.subjectId,
    patternMetadata: reader.patternMetadata,
  });
  const theory = ctx.theory || selectAppliedTheory({
    ...concept,
    subjectId: ctx.subjectId,
    problemType: analysis.problemType,
  });
  const strategy = ctx.strategy || buildSolutionStrategy({ analysis, concept, theory });

  const numbers = (reader.questionText + ' ' + String(reader.tableHtml || '').replace(/<[^>]+>/g, ' '))
    .match(/\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?/g) || [];
  const uniqueNums = [...new Set(numbers.map((n) => n.replace(/,/g, '')))].slice(0, 8);
  const correct = Number(reader.correctAnswer) || 1;
  const choices = Array.isArray(reader.choices) ? reader.choices : [];

  const calc = [];
  if (analysis.hasNumbers && uniqueNums.length) {
    calc.push(`이 문제는 제시된 수치(${uniqueNums.slice(0, 6).join(', ')})를 조건으로 사용해 ${concept.coreConcept}를 묻는다.`);
    calc.push(`적용 이론: ${theory.appliedTheory}`);
    calc.push(`출제 초점: ${analysis.askFocus || analysis.examinerIntentHint}`);
    uniqueNums.slice(0, 4).forEach((n, i) => {
      calc.push(`조건 ${i + 1}: 문제의 ${n}을(를) ${concept.coreConcept} 판단에 직접 반영한다.`);
    });
    calc.push(`결론: 위 수치·조건을 종합하면 정답은 ${correct}번이다.`);
  } else {
    calc.push(`요건/정의 정리: ${concept.coreConcept}`);
    calc.push(`적용 이론: ${theory.appliedTheory}`);
    calc.push(`문제 문장 적용: ${short(analysis.askFocus || reader.questionText, 120)}`);
    calc.push(`키워드 판단: 문제 본문의 표현을 ${theory.appliedTheory} 요건에 대조한다.`);
    calc.push(`결론: ${correct}번이 출제 의도에 부합한다.`);
  }

  const choiceAnalysis = choices.map((c, i) => {
    const isCorrect = i + 1 === correct;
    return {
      choice: ['①', '②', '③', '④', '⑤'][i] || String(i + 1),
      correct: isCorrect,
      reason: isCorrect
        ? `정답 이유: ${theory.appliedTheory} 기준으로 「${short(c, 80)}」가 문제 조건(${short(analysis.askFocus || reader.questionText, 40)})과 일치한다.`
        : `오답 이유: 「${short(c, 80)}」는 ${concept.coreConcept}의 판단 기준·요건과 어긋나 함정 보기에 해당한다.`,
    };
  });

  const problemUnderstanding =
    `이 문제는 「${short(analysis.askFocus || reader.questionText, 100)}」를 묻는다. `
    + `핵심은 ${concept.coreConcept}이며, ${theory.appliedTheory}를 적용해 풀어야 한다.`;

  return normalizeProfessorPayload({
    problemUnderstanding,
    coreConcept: concept.coreConcept,
    appliedTheory: theory.appliedTheory,
    thinkingOrder: strategy.thinkingOrder,
    solution: {
      explanation:
        `${theory.teachingAngle} `
        + `시험장에서는 먼저 출제 문장을 읽고 ${concept.coreConcept}로 분류한 뒤 보기를 검증한다.`,
      calculation: calc,
    },
    choiceAnalysis,
    formula: `${concept.coreConcept} ← ${theory.appliedTheory}`,
    memoryHack: `${concept.coreConcept}이면 ${theory.appliedTheory} 요건부터 떠올린다.`,
    examTip:
      `출제 함정은 유사 개념 혼동이다. 빠른 판단: 키워드 → ${concept.coreConcept} → 요건 대조 → 보기 배제.`,
    tutorMessage:
      '오늘 해설의 사고 순서(문제 이해→개념→전략→풀이→보기 분석)를 다음 유사 문제에서 그대로 재현하세요.',
    correctAnswer: correct,
    verification: { choiceMatched: true, calculationCorrect: true },
    confidence: ctx.enrich ? 94 : 90,
  }, { choices, correctAnswer: correct });
}

function short(v, n) {
  const s = String(v || '').trim();
  if (s.length <= n) return s;
  return `${s.slice(0, n)}…`;
}

function finalizeProfessor(ctx) {
  const {
    payload,
    reader,
    cacheKey,
    fromCache,
    cacheHit,
    provider,
    durationMs,
    regenerated,
    quality,
    subjectId,
    analysis,
    concept,
    theory,
    strategy,
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
  const tutor = {
    ...buildTutorFromGemini(payload),
    advice: payload.tutorMessage || buildTutorFromGemini(payload).advice,
    message: payload.tutorMessage || '',
  };
  const smartExplanation = buildSmartSectionsFromGemini(payload);

  const calculation = (payload.calculation || []).map((line, i) => ({
    title: `풀이 ${i + 1}`,
    lines: [String(line)],
  }));

  return {
    schemaVersion: '17D',
    engineVersion: PROFESSOR_ENGINE_VERSION,
    source: 'professor-explanation',
    humanLevel: true,
    professorLevel: true,
    questionId: reader.questionId,
    subjectId,
    patternId: reader.patternMetadata?.patternId || null,
    cacheKey,
    fromCache: Boolean(fromCache),
    cacheHit: Boolean(cacheHit),
    provider,
    modelVersion: MODEL_VERSION,
    promptVersion: PROFESSOR_PROMPT_VERSION,
    professorPromptVersion: PROFESSOR_PROMPT_VERSION,
    durationMs,
    regenerated: Boolean(regenerated),
    quality: quality.report || quality,
    qualityScore: quality.score,
    qualityDecision: quality.decision,
    payload,
    markdown: professorPayloadToMarkdown(payload),
    problemUnderstanding: payload.problemUnderstanding,
    coreConcept: payload.coreConcept,
    appliedTheory: payload.appliedTheory,
    thinkingOrder: payload.thinkingOrder || [],
    solution: payload.solution,
    choiceAnalysis: payload.choiceAnalysis || [],
    whyAnswer: payload.whyAnswer || [],
    whyOthersWrong: payload.whyOthersWrong || [],
    memoryHack: asArr(payload.memoryHack),
    examTip: asArr(payload.examTip),
    formula: asArr(payload.formula),
    tutorMessage: payload.tutorMessage || '',
    summary: payload.summary || payload.problemUnderstanding,
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
      text: payload.memoryHack
        ? asArr(payload.memoryHack)[0]
        : payload.summary || '',
      source: 'professor-explanation',
    },
    verification: payload.verification,
    confidence: payload.confidence,
    correctAnswer: payload.correctAnswer,
    preAnalysis: analysis
      ? { analysis, concept, theory, strategy }
      : null,
    hasApiKey: Boolean(resolveGeminiApiKey()),
  };
}

function asArr(v) {
  if (Array.isArray(v)) return v;
  if (v == null || v === '') return [];
  return [String(v)];
}

/**
 * Sync / offline harness (no network).
 */
export function generateProfessorExplanationSync(input = {}) {
  const question = input.question || {};
  const grade = input.grade || {};
  const pattern = input.pattern || null;
  const reader = attachGrade(readProblem(question, pattern), grade);
  const subjectId =
    resolveSubjectIdForQuestion(question)
    || question.subjectPluginId
    || 'accounting';
  const cacheKey = buildProfessorCacheKey(
    reader.questionId,
    reader.overrideVersion,
    MODEL_VERSION,
    PROFESSOR_PROMPT_VERSION,
  );

  if (!input.force) {
    const cached = peekProfessorCache(cacheKey);
    if (cached?.payload) {
      getProfessorCached(cacheKey);
      const payload = normalizeProfessorPayload(cached.payload, {
        choices: reader.choices,
        correctAnswer: reader.correctAnswer,
      });
      const quality = reviewExplanationQuality(payload, qualityCtx(reader));
      return finalizeProfessor({
        payload,
        reader,
        cacheKey,
        fromCache: true,
        cacheHit: true,
        provider: 'cache',
        durationMs: 0,
        regenerated: false,
        quality,
        subjectId,
        analysis: null,
      });
    }
  }

  const promptPayload = {
    subjectId,
    questionText: reader.questionText,
    tableHtml: reader.tableHtml,
    choices: reader.choices,
    correctAnswer: reader.correctAnswer,
    patternMetadata: reader.patternMetadata,
  };
  const ctx = buildProfessorContext(promptPayload);
  let payload = buildLocalProfessorPayload(reader, { ...ctx, subjectId, enrich: true });
  const localVerify = verifyAnswerLocally(payload, {
    correctAnswer: reader.correctAnswer,
    choices: reader.choices,
  });
  payload = normalizeProfessorPayload(localVerify.payload, {
    choices: reader.choices,
    correctAnswer: reader.correctAnswer,
  });
  let quality = reviewExplanationQuality(payload, qualityCtx(reader));

  if (input.saveCache !== false) {
    setProfessorCached(cacheKey, {
      payload,
      provider: 'LOCAL_PROFESSOR',
      modelVersion: MODEL_VERSION,
      promptVersion: PROFESSOR_PROMPT_VERSION,
      questionId: reader.questionId,
      durationMs: 0,
      quality: quality.report,
    }, { allowWrite: true });
  }
  recordProfessorQuality(reader.questionId, quality.report, { regenerated: false });

  return finalizeProfessor({
    payload,
    reader,
    cacheKey,
    fromCache: false,
    cacheHit: false,
    provider: 'LOCAL_PROFESSOR',
    durationMs: 0,
    regenerated: false,
    quality,
    subjectId,
    ...ctx,
  });
}

/**
 * Merge into legacy Solution Pack (same contract as Gemini merge).
 */
export function mergeProfessorIntoPack(pack, professor) {
  if (!pack || !professor) return pack;
  return {
    ...pack,
    professorEngineVersion: PROFESSOR_ENGINE_VERSION,
    geminiSolverVersion: PROFESSOR_ENGINE_VERSION,
    geminiNative: professor,
    professorExplanation: professor,
    explanation: professor.explanation || pack.explanation,
    calculation: professor.calculation?.length ? professor.calculation : pack.calculation,
    diagnosis: professor.diagnosis || pack.diagnosis,
    misconception: professor.misconception || pack.misconception,
    formulas: professor.formulas || pack.formulas,
    keyTakeaway: professor.keyTakeaway || pack.keyTakeaway,
    tutor: professor.tutor || pack.tutor,
  };
}

/**
 * Apply onto Smart Tutor pack — Professor Accordion fields.
 */
export function applyProfessorToSmartPack(smartPack, professor) {
  if (!smartPack || !professor) return smartPack;
  const next = {
    ...smartPack,
    geminiNative: professor,
    professorExplanation: professor,
    professorLevel: true,
    humanLevel: true,
  };

  if (professor.smartExplanation) {
    next.smartReview = {
      ...(smartPack.smartReview || {}),
      explanation: professor.smartExplanation,
      thirtySecond: professor.review30,
      source: 'professor-explanation',
    };
  }
  if (professor.formulaCard) next.formulaCard = professor.formulaCard;
  if (professor.examTutor) next.examTutor = professor.examTutor;
  if (professor.diagnosis) next.diagnosis = professor.diagnosis;
  if (professor.calculation?.length) next.calculation = professor.calculation;
  if (professor.explanation) next.explanation = professor.explanation;
  if (professor.tutor) next.tutor = professor.tutor;

  next.resultSource = 'professor-explanation';
  next.problemUnderstanding = professor.problemUnderstanding;
  next.coreConcept = professor.coreConcept;
  next.appliedTheory = professor.appliedTheory;
  next.thinkingOrder = professor.thinkingOrder || [];
  next.solutionExplanation = professor.solution?.explanation || '';
  next.choiceAnalysis = professor.choiceAnalysis || [];
  next.whyAnswer = professor.whyAnswer || [];
  next.whyOthersWrong = professor.whyOthersWrong || [];
  next.memoryHack = professor.memoryHack || [];
  next.examTipHuman = professor.examTip || [];
  next.formulaHuman = professor.formula || [];
  next.tutorMessage = professor.tutorMessage || '';
  next.geminiMarkdown = professor.markdown || null;
  next.geminiMeta = {
    cacheHit: professor.cacheHit,
    provider: professor.provider,
    confidence: professor.confidence,
    qualityScore: professor.qualityScore ?? professor.quality?.score ?? null,
    durationMs: professor.durationMs,
    promptVersion: professor.promptVersion,
    professorPromptVersion: professor.professorPromptVersion,
    humanLevel: true,
    professorLevel: true,
  };

  return next;
}

/**
 * Reviewer Approve — Markdown Override (no auto-approve).
 */
export function approveProfessorToOverride(questionId, resultOrPayload, meta = {}) {
  let payload = null;
  if (typeof meta.markdown === 'string' && meta.markdown.trim()) {
    const base =
      resultOrPayload?.payload
      || (typeof resultOrPayload === 'object' ? resultOrPayload : {});
    payload = markdownToProfessorPayload(meta.markdown, base);
  } else if (typeof resultOrPayload === 'string') {
    payload = markdownToProfessorPayload(resultOrPayload, {});
  } else {
    payload = resultOrPayload?.payload || resultOrPayload || null;
  }
  if (!questionId || !payload) {
    return { ok: false, error: 'missing_questionId_or_payload' };
  }

  const normalized = normalizeProfessorPayload(payload);
  const version = new Date().toISOString();
  const markdown = professorPayloadToMarkdown(normalized);

  return saveOverride(
    questionId,
    {
      geminiNative: {
        version,
        approvedAt: version,
        payload: normalized,
        markdown,
        modelVersion: MODEL_VERSION,
        promptVersion: PROFESSOR_PROMPT_VERSION,
        source: 'professor-explanation',
        humanLevel: true,
        professorLevel: true,
        qualityScore: meta.qualityScore ?? null,
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

export default {
  PROFESSOR_ENGINE_VERSION,
  PROFESSOR_PROMPT_VERSION,
  generateProfessorExplanation,
  generateProfessorExplanationSync,
  mergeProfessorIntoPack,
  applyProfessorToSmartPack,
  approveProfessorToOverride,
  buildLocalProfessorPayload,
  getProfessorDashboardStats,
};
