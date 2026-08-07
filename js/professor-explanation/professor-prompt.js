/**
 * Sprint-17D — Professor Prompt Builder (Priority 1: Prompt Quality)
 *
 * Role: 감정평가사 전문 강사
 * Goal: teach reusable problem-solving thinking, not dump answers
 */

import { extractSubjectRole } from '../subject/subject-prompt-builder.js';
import { getLoadedSubject } from '../subject/subject-loader.js';
import { normalizeSubjectId } from '../subject/subject-config.js';
import { getCurrentSubjectId } from '../subject/subject-context.js';
import { analyzeProblem } from './problem-analyzer.js';
import { detectCoreConcept } from './concept-detector.js';
import { selectAppliedTheory } from './theory-selector.js';
import { buildSolutionStrategy } from './solution-strategy.js';
import { buildCalculationGuidance } from './calculation-explainer.js';
import { buildChoiceAnalysisGuidance } from './choice-analyzer.js';
import { buildExamCoachGuidance } from './exam-coach.js';

/** Cache key part — bump only when prompt contract changes */
export const PROFESSOR_PROMPT_VERSION = '17D.2';

export const PROFESSOR_OUTPUT_SCHEMA = `{
  "problemUnderstanding": "",
  "coreConcept": "",
  "appliedTheory": "",
  "thinkingOrder": ["", "", ""],
  "solution": {
    "explanation": "",
    "calculation": ["", "", ""]
  },
  "choiceAnalysis": [
    { "choice": "①", "correct": true, "reason": "" },
    { "choice": "②", "correct": false, "reason": "" }
  ],
  "formula": "",
  "memoryHack": "",
  "examTip": "",
  "tutorMessage": "",
  "correctAnswer": 1,
  "verification": { "choiceMatched": true, "calculationCorrect": true },
  "confidence": 96
}`;

/**
 * Pre-analyze problem for prompt scaffolding (does NOT replace Gemini reasoning).
 */
export function buildProfessorContext(payload = {}) {
  const subjectId = normalizeSubjectId(
    payload.subjectId || getCurrentSubjectId(),
  );
  const rq = payload.resolvedQuestion || {};
  const questionText = payload.questionText ?? rq.question ?? rq.questionText ?? '';
  const tableHtml = payload.tableHtml ?? rq.tableHtml ?? rq.table ?? '';
  const choices = Array.isArray(payload.choices)
    ? payload.choices
    : Array.isArray(rq.choices)
      ? rq.choices
      : [];
  const correctAnswer = payload.correctAnswer ?? rq.answer ?? rq.correctAnswer ?? '';

  const analysis = analyzeProblem({
    questionText,
    tableHtml,
    choices,
    subjectId,
  });
  const concept = detectCoreConcept({
    questionText,
    subjectId,
    patternMetadata: payload.patternMetadata,
  });
  const theory = selectAppliedTheory({
    ...concept,
    subjectId,
    problemType: analysis.problemType,
  });
  const strategy = buildSolutionStrategy({ analysis, concept, theory });

  return {
    subjectId,
    questionText,
    tableHtml: String(tableHtml || '').slice(0, 2500),
    choices,
    correctAnswer,
    analysis,
    concept,
    theory,
    strategy,
  };
}

/**
 * Full Professor solve prompt.
 */
export function buildProfessorSolvePrompt(payload = {}) {
  const ctx = buildProfessorContext(payload);
  const roleLine = extractSubjectRole(
    getLoadedSubject(ctx.subjectId).promptMd,
    ctx.subjectId,
  );

  const choiceBlock = ctx.choices
    .map((c, i) => `${i + 1}. ${String(c ?? '')}`)
    .join('\n');

  const meta = payload.patternMetadata || {};
  const metaBlock = [
    meta.patternId ? `patternId: ${meta.patternId}` : null,
    meta.patternName ? `patternName: ${meta.patternName}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const recon = payload.reconstruction || null;
  const reconBlock = recon
    ? [
      '[Exam Reconstruction — 시험지 복원 구조, 정답 근거로 Pattern 사용 금지]',
      `questionText: ${String(recon.questionText || '').slice(0, 1200)}`,
      `tables: ${(recon.tables || []).length}개`,
      (recon.tables || []).slice(0, 2).map((t) => t.html).join('\n').slice(0, 2000),
      `formulaBlocks: ${JSON.stringify(recon.formulaBlocks || []).slice(0, 500)}`,
      `figureReferences: ${(recon.figureReferences || []).length}`,
      `sourceFile: ${recon.sourceFile || ''} · page: ${recon.sourcePage ?? ''}`,
    ].join('\n')
    : '';

  return [
    '너는 감정평가사 시험 전문 강사이다.',
    roleLine,
    '목적: 답을 알려주는 것이 아니라, 유사 문제를 혼자 풀 사고 과정을 가르친다.',
    '',
    '금지: Pattern 이름만 반복 · 일반론 · 의미 없는 숫자 나열 · "주어진 숫자를 확인한다" · 보기 분석 없는 해설 · Pattern을 정답 근거로 사용 금지 · 예시 숫자',
    '',
    'Step 1 문제 이해(출제 의도) → Step 2 핵심 개념/이론 → Step 3 시험장 판단 순서 → Step 4 실제 풀이(숫자·조건) → Step 5 모든 보기 분석 → Step 6 함정·암기·Tip',
    '',
    '[Resolved Question]',
    String(ctx.questionText || ''),
    '',
    '[Table]',
    String(ctx.tableHtml || '(없음)'),
    '',
    '[Choices]',
    choiceBlock || '(없음)',
    '',
    '[Correct Answer]',
    String(ctx.correctAnswer ?? ''),
    '',
    reconBlock,
    reconBlock ? '' : null,
    '[Pattern Metadata — 참고만, 정답 근거로 사용 금지]',
    metaBlock || '(없음)',
    '',
    `[힌트] ${ctx.concept.coreConcept} / ${ctx.theory.appliedTheory}`,
    '',
    buildCalculationGuidance({ analysis: ctx.analysis, concept: ctx.concept, theory: ctx.theory }),
    '',
    buildChoiceAnalysisGuidance({
      choices: ctx.choices,
      correctAnswer: ctx.correctAnswer,
    }),
    '',
    buildExamCoachGuidance({ subjectId: ctx.subjectId }),
    '',
    'JSON만 반환:',
    PROFESSOR_OUTPUT_SCHEMA,
  ].filter((line) => line != null).join('\n');
}

/**
 * Partial regeneration — missing sections only (compact: no full solve prompt re-send).
 */
export function buildProfessorPartialPrompt(payload, currentPayload, missing = []) {
  const rq = payload.resolvedQuestion || {};
  const questionText = String(
    payload.questionText ?? rq.question ?? rq.questionText ?? '',
  ).slice(0, 600);
  const choices = Array.isArray(payload.choices)
    ? payload.choices
    : Array.isArray(rq.choices)
      ? rq.choices
      : [];

  return [
    '너는 감정평가사 시험 전문 강사이다.',
    '아래 JSON에서 부족한 섹션만 채워 반환하라. 전체 재생성 금지.',
    '템플릿 문장·Pattern 일반론·의미 없는 숫자 나열 금지.',
    '',
    '[Problem excerpt]',
    questionText,
    '',
    '[Choices]',
    choices.map((c, i) => `${i + 1}. ${String(c ?? '')}`).join('\n') || '(없음)',
    '',
    '[Correct Answer]',
    String(payload.correctAnswer ?? rq.answer ?? ''),
    '',
    '[Existing JSON — 유지]',
    JSON.stringify(currentPayload || {}, null, 2),
    '',
    '[Missing / Weak Sections Only]',
    JSON.stringify(missing || []),
    '',
    '반드시 JSON만 반환. 스키마는 Professor Output과 동일.',
    PROFESSOR_OUTPUT_SCHEMA,
  ].join('\n');
}

export default {
  PROFESSOR_PROMPT_VERSION,
  PROFESSOR_OUTPUT_SCHEMA,
  buildProfessorContext,
  buildProfessorSolvePrompt,
  buildProfessorPartialPrompt,
};
