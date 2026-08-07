/**
 * Sprint-17D — Professor Explanation Quality Reviewer
 * Score /100. ≥90 approve · 70–89 partial regen · <70 full regen
 */

import { extractProblemNumbers } from '../gemini-solver/human-explanation-validator.js';
import { extractCalculationLines } from './calculation-explainer.js';
import { hasCompleteChoiceAnalysis } from './choice-analyzer.js';

export const QUALITY_REVIEWER_VERSION = '17D';
export const QUALITY_APPROVE = 90;
export const QUALITY_PARTIAL = 70;

const TEMPLATE_FAIL = [
  /주어진\s*숫자를\s*확인/,
  /숫자를\s*계산한다/,
  /패턴\s*이름/,
  /Pattern\s*일반/,
  /예시\s*숫자/,
];

/**
 * @param {object} payload — professor / normalized payload
 * @param {{ questionText?: string, tableHtml?: string, choices?: string[], correctAnswer?: number }} context
 */
export function reviewExplanationQuality(payload = {}, context = {}) {
  const missing = [];
  const details = {};

  const problemUnderstanding = String(
    payload.problemUnderstanding || payload.summary || '',
  ).trim();
  const coreConcept = String(payload.coreConcept || '').trim();
  const appliedTheory = String(payload.appliedTheory || '').trim();
  const thinkingOrder = Array.isArray(payload.thinkingOrder) ? payload.thinkingOrder : [];
  const calc = extractCalculationLines(payload);
  const solutionExplanation = String(
    payload.solution?.explanation || payload.whyAnswer?.join?.(' ') || '',
  ).trim();
  const choiceAnalysis = Array.isArray(payload.choiceAnalysis) ? payload.choiceAnalysis : [];
  const formula = Array.isArray(payload.formula)
    ? payload.formula
    : payload.formula
      ? [payload.formula]
      : [];
  const memoryHack = Array.isArray(payload.memoryHack)
    ? payload.memoryHack
    : payload.memoryHack
      ? [payload.memoryHack]
      : [];
  const examTip = Array.isArray(payload.examTip)
    ? payload.examTip
    : payload.examTip
      ? [payload.examTip]
      : [];
  const tutorMessage = String(payload.tutorMessage || payload.tutorAdvice || '').trim();

  /* 0. Reconstruction integrity (informational + soft penalty) — Sprint-17D.6 */
  const reconIssues = [];
  if (context.reconstruction) {
    const rq = context.reconstructionQuality
      || {
        issues: [],
        accuracy: 100,
      };
    const issues = rq.issues || [];
    if (issues.includes('table_missing')) reconIssues.push('table_missing');
    if (issues.includes('number_corruption')) reconIssues.push('number_corruption');
    if (issues.includes('choice_mismatch')) reconIssues.push('choice_mismatch');
    if (issues.includes('formula_corruption')) reconIssues.push('formula_corruption');
    details.reconstruction = {
      accuracy: rq.accuracy ?? null,
      issues: reconIssues,
      ok: reconIssues.length === 0,
    };
  }
  /* 1. Problem reflection (20) */
  let problemScore = 0;
  const qSnippet = String(context.questionText || '').slice(0, 40);
  const reflectsProblem =
    problemUnderstanding.length >= 20
    && !TEMPLATE_FAIL.some((re) => re.test(problemUnderstanding))
    && (qSnippet.length < 8 || overlapTokens(problemUnderstanding, context.questionText));
  if (reflectsProblem) problemScore = 20;
  else if (problemUnderstanding.length >= 12) problemScore = 10;
  else missing.push('problemUnderstanding');
  details.problemReflection = { score: problemScore, max: 20, ok: problemScore >= 15 };

  /* 2. Theory (15) */
  let theoryScore = 0;
  if (coreConcept.length >= 4 && appliedTheory.length >= 4) theoryScore = 15;
  else if (coreConcept.length >= 4 || appliedTheory.length >= 4) theoryScore = 8;
  else missing.push('coreConcept/appliedTheory');
  details.theory = { score: theoryScore, max: 15, ok: theoryScore >= 12 };

  /* 3. Number / concrete usage (20) */
  const numberUsage = scoreNumberUsageProfessor(payload, context);
  let numberScore = Math.round(numberUsage.ratio * 20);
  if (!hasSignificantNumbers(context) && calc.length + solutionExplanation.length > 20) {
    numberScore = Math.max(numberScore, 16);
  }
  if (numberUsage.penaltyHeavy) numberScore = Math.min(numberScore, 8);
  if (numberScore < 10) missing.push('calculation/numbers');
  details.numberUsage = { ...numberUsage, score: numberScore, max: 20, ok: numberScore >= 14 };

  /* 4. Choice analysis (20) */
  const expectedChoices = Array.isArray(context.choices) ? context.choices.length : 0;
  const choiceOk = hasCompleteChoiceAnalysis(choiceAnalysis, expectedChoices || 0);
  let choiceScore = 0;
  if (choiceOk) choiceScore = 20;
  else if (choiceAnalysis.filter((c) => String(c?.reason || '').trim()).length >= 2) choiceScore = 10;
  else missing.push('choiceAnalysis');
  details.choiceAnalysis = { score: choiceScore, max: 20, ok: choiceOk };

  /* 5. Reusable knowledge (15) */
  let reusableScore = 0;
  const reusableBits = [
    thinkingOrder.length >= 2,
    memoryHack.some((s) => String(s).length >= 8),
    formula.some((s) => String(s).length >= 4) || solutionExplanation.length >= 30,
    !TEMPLATE_FAIL.some((re) => re.test(solutionExplanation)),
  ].filter(Boolean).length;
  reusableScore = Math.min(15, reusableBits * 4);
  if (reusableScore < 8) missing.push('reusableKnowledge');
  details.reusable = { score: reusableScore, max: 15, ok: reusableScore >= 12 };

  /* 6. Exam strategy (10) */
  let examScore = 0;
  if (examTip.some((s) => String(s).length >= 10) && tutorMessage.length >= 8) examScore = 10;
  else if (examTip.some((s) => String(s).length >= 10) || tutorMessage.length >= 8) examScore = 6;
  else missing.push('examTip/tutorMessage');
  details.examStrategy = { score: examScore, max: 10, ok: examScore >= 8 };

  const scoreRaw = Math.max(
    0,
    Math.min(100, problemScore + theoryScore + numberScore + choiceScore + reusableScore + examScore),
  );
  /* Soft penalty when reconstruction reported structural issues */
  const reconPenalty = Math.min(8, reconIssues.length * 2);
  const score = Math.max(0, scoreRaw - reconPenalty);

  let decision = 'regenerate_full';
  if (score >= QUALITY_APPROVE) decision = 'approve';
  else if (score >= QUALITY_PARTIAL) decision = 'regenerate_partial';

  if (reconIssues.length) {
    missing.push(...reconIssues.map((i) => `reconstruction:${i}`));
  }

  return {
    ok: score >= QUALITY_APPROVE,
    score,
    decision,
    missing,
    details,
    missingSections: missing,
    report: {
      schemaVersion: QUALITY_REVIEWER_VERSION,
      checkedAt: new Date().toISOString(),
      score,
      decision,
      missing,
      details,
      ok: score >= QUALITY_APPROVE,
      reconstructionIssues: reconIssues,
    },
  };
}

function overlapTokens(a, b) {
  const ta = tokenize(a);
  const tb = new Set(tokenize(b));
  if (!ta.length || !tb.size) return false;
  let hit = 0;
  ta.forEach((t) => {
    if (tb.has(t)) hit += 1;
  });
  return hit >= 2 || hit / ta.length >= 0.15;
}

function tokenize(text) {
  return String(text || '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
    .slice(0, 40);
}

function hasSignificantNumbers(context = {}) {
  const corpus = [
    context.questionText || '',
    String(context.tableHtml || '').replace(/<[^>]+>/g, ' '),
  ].join(' ');
  return extractProblemNumbers(corpus).length >= 2;
}

function scoreNumberUsageProfessor(payload, context) {
  const corpus = [
    context.questionText || '',
    String(context.tableHtml || '').replace(/<[^>]+>/g, ' '),
  ].join(' ');
  const numbers = extractProblemNumbers(corpus);
  const calcText = [
    ...extractCalculationLines(payload),
    payload.solution?.explanation || '',
    ...(payload.whyAnswer || []),
    payload.problemUnderstanding || '',
    payload.summary || '',
  ].join(' ');

  if (!numbers.length) {
    return { used: [], missing: [], ratio: 1, penaltyHeavy: false, total: 0 };
  }

  const used = [];
  const missing = [];
  const flat = calcText.replace(/,/g, '');
  numbers.forEach((n) => {
    const re = new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (re.test(flat)) used.push(n);
    else missing.push(n);
  });

  /* meaningless dump: many numbers listed without operators/words */
  const dump = /^\s*[\d,\s]{8,}\s*$/.test(calcText.trim());
  const ratio = used.length / numbers.length;
  return {
    used,
    missing,
    ratio,
    penaltyHeavy: dump || (missing.length > numbers.length * 0.7 && numbers.length >= 3),
    total: numbers.length,
  };
}

/**
 * Adapter used by gemini-orchestrator quality path.
 */
export function checkProfessorQuality(payload, context = {}) {
  return reviewExplanationQuality(payload, context);
}

export default {
  reviewExplanationQuality,
  checkProfessorQuality,
  QUALITY_APPROVE,
  QUALITY_PARTIAL,
  QUALITY_REVIEWER_VERSION,
};
