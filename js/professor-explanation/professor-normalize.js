/**
 * Sprint-17D — Normalize Professor JSON ↔ 17C Human-Level aliases
 */

import { normalizeChoiceAnalysis } from './choice-analyzer.js';
import { extractCalculationLines } from './calculation-explainer.js';
import { normalizeExamCoachFields } from './exam-coach.js';

export const PROFESSOR_SCHEMA_VERSION = '17D';

function asList(v) {
  if (Array.isArray(v)) return v.map((s) => String(s ?? '').trim()).filter(Boolean);
  if (typeof v === 'string' && v.trim()) return [v.trim()];
  return [];
}

/**
 * @param {object} raw
 * @param {{ choices?: string[], correctAnswer?: number }} [context]
 */
export function normalizeProfessorPayload(raw = {}, context = {}) {
  const problemUnderstanding = String(
    raw.problemUnderstanding || raw.summary || '',
  ).trim();
  const coreConcept = String(raw.coreConcept || '').trim();
  const appliedTheory = String(raw.appliedTheory || '').trim();
  const thinkingOrder = asList(raw.thinkingOrder);

  const solutionExplanation = String(
    raw.solution?.explanation
    || (Array.isArray(raw.whyAnswer) ? raw.whyAnswer.join(' ') : raw.whyAnswer)
    || '',
  ).trim();
  const calculation = extractCalculationLines(raw);

  const choiceNorm = normalizeChoiceAnalysis(raw, context);
  const coach = normalizeExamCoachFields(raw);

  const summary =
    problemUnderstanding
    || solutionExplanation.slice(0, 160)
    || coreConcept;

  const whyAnswer = choiceNorm.whyAnswer.length
    ? choiceNorm.whyAnswer
    : solutionExplanation
      ? [solutionExplanation]
      : asList(raw.whyAnswer);

  const whyOthersWrong = choiceNorm.whyOthersWrong.length
    ? choiceNorm.whyOthersWrong
    : asList(raw.whyOthersWrong);

  const verification =
    raw.verification && typeof raw.verification === 'object'
      ? {
          choiceMatched: Boolean(raw.verification.choiceMatched),
          calculationCorrect: Boolean(raw.verification.calculationCorrect),
        }
      : { choiceMatched: false, calculationCorrect: false };

  const confidence = clampConfidence(raw.confidence);

  return {
    /* Professor primary */
    problemUnderstanding,
    coreConcept,
    appliedTheory,
    thinkingOrder,
    solution: {
      explanation: solutionExplanation,
      calculation,
    },
    choiceAnalysis: choiceNorm.choiceAnalysis,
    tutorMessage: coach.tutorMessage,
    correctAnswer: Number(raw.correctAnswer),
    verification,
    confidence,
    professorLevel: true,
    humanLevel: true,
    schemaVersion: PROFESSOR_SCHEMA_VERSION,
    /* 17C compatibility aliases (arrays for UI builders) */
    summary,
    calculation,
    whyAnswer,
    whyOthersWrong,
    formula: coach.formula,
    memoryHack: coach.memoryHack,
    examTip: coach.examTip,
    stepByStep: thinkingOrder,
    review30: coach.memoryHack.join('\n'),
    formulaCard: coach.formula.join(' → '),
    examChecklist: coach.examTip,
    tutorAdvice: coach.tutorMessage || whyAnswer.join(' ') || summary,
    mistakeDiagnosis: whyOthersWrong.join(' / '),
    misconception: whyOthersWrong[0] || '',
  };
}

function clampConfidence(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Professor Markdown for Reviewer Override surface.
 */
export function professorPayloadToMarkdown(payload = {}) {
  const p = normalizeProfessorPayload(payload);
  const formula = asList(p.formula);
  const memory = asList(p.memoryHack);
  const tips = asList(p.examTip);
  const calc = p.solution?.calculation || p.calculation || [];
  const choices = Array.isArray(p.choiceAnalysis) ? p.choiceAnalysis : [];

  return [
    `# 문제 이해`,
    p.problemUnderstanding || '',
    '',
    `# 핵심 개념`,
    p.coreConcept || '',
    '',
    `# 적용 이론`,
    p.appliedTheory || '',
    '',
    `# 풀이 전략`,
    ...p.thinkingOrder.map((s, i) => `${i + 1}. ${s}`),
    '',
    `# 실제 풀이`,
    p.solution?.explanation || '',
    '',
    `# 계산 과정`,
    ...calc.map((s) => `- ${s}`),
    '',
    `# 보기 분석`,
    ...choices.map(
      (c) =>
        `- ${c.choice} ${c.correct ? '(정답)' : '(오답)'}: ${c.reason || ''}`,
    ),
    '',
    `# 공식`,
    ...formula.map((s) => `- ${s}`),
    '',
    `# 30초 암기`,
    ...memory.map((s) => `- ${s}`),
    '',
    `# 시험장 전략`,
    ...tips.map((s, i) => `${i + 1}. ${s}`),
    '',
    `# AI Tutor`,
    p.tutorMessage || '',
  ].join('\n').trim();
}

/**
 * Parse Reviewer Markdown back to professor payload.
 */
export function markdownToProfessorPayload(markdown, base = {}) {
  const text = String(markdown || '');
  const sections = {
    problemUnderstanding: [],
    coreConcept: [],
    appliedTheory: [],
    thinkingOrder: [],
    solutionExplanation: [],
    calculation: [],
    choiceAnalysisRaw: [],
    formula: [],
    memoryHack: [],
    examTip: [],
    tutorMessage: [],
  };
  let current = 'problemUnderstanding';
  const map = [
    [/#\s*문제 이해/i, 'problemUnderstanding'],
    [/#\s*핵심 개념/i, 'coreConcept'],
    [/#\s*적용 이론/i, 'appliedTheory'],
    [/#\s*풀이 전략/i, 'thinkingOrder'],
    [/#\s*실제 풀이/i, 'solutionExplanation'],
    [/#\s*계산 과정/i, 'calculation'],
    [/#\s*보기 분석/i, 'choiceAnalysisRaw'],
    [/#\s*공식/i, 'formula'],
    [/#\s*30초 암기/i, 'memoryHack'],
    [/#\s*시험장 전략/i, 'examTip'],
    [/#\s*AI Tutor/i, 'tutorMessage'],
  ];

  text.split(/\n/).forEach((line) => {
    const raw = line.trim();
    if (!raw) return;
    for (const [re, key] of map) {
      if (re.test(raw)) {
        current = key;
        return;
      }
    }
    const cleaned = raw.replace(/^[-*•]\s*/, '').replace(/^\d+[.)]\s*/, '').trim();
    if (!cleaned) return;
    sections[current].push(cleaned);
  });

  const choiceAnalysis = sections.choiceAnalysisRaw.map((line) => {
    const m = line.match(/^(①|②|③|④|⑤|\d+)\s*(?:\((정답|오답)\))?\s*:?\s*(.*)$/);
    if (!m) return { choice: '①', correct: false, reason: line };
    return {
      choice: m[1],
      correct: m[2] === '정답',
      reason: m[3] || '',
    };
  });

  return normalizeProfessorPayload({
    ...base,
    problemUnderstanding: sections.problemUnderstanding.join(' ') || base.problemUnderstanding,
    coreConcept: sections.coreConcept.join(' ') || base.coreConcept,
    appliedTheory: sections.appliedTheory.join(' ') || base.appliedTheory,
    thinkingOrder: sections.thinkingOrder.length ? sections.thinkingOrder : base.thinkingOrder,
    solution: {
      explanation: sections.solutionExplanation.join(' ') || base.solution?.explanation,
      calculation: sections.calculation.length ? sections.calculation : base.solution?.calculation,
    },
    choiceAnalysis: choiceAnalysis.length ? choiceAnalysis : base.choiceAnalysis,
    formula: sections.formula.length ? sections.formula : base.formula,
    memoryHack: sections.memoryHack.length ? sections.memoryHack : base.memoryHack,
    examTip: sections.examTip.length ? sections.examTip : base.examTip,
    tutorMessage: sections.tutorMessage.join(' ') || base.tutorMessage,
    correctAnswer: base.correctAnswer,
    verification: base.verification,
    confidence: base.confidence,
  });
}

export default {
  normalizeProfessorPayload,
  professorPayloadToMarkdown,
  markdownToProfessorPayload,
  PROFESSOR_SCHEMA_VERSION,
};
