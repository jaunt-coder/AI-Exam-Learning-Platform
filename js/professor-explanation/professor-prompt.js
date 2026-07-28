/**
 * Sprint-17D — Professor Prompt Builder (Priority 1: Prompt Quality)
 *
 * Role: 감정평가사 전문 강사
 * Goal: teach reusable problem-solving thinking, not dump answers
 */

import { buildSubjectPromptBlock, extractSubjectRole } from '../subject/subject-prompt-builder.js';
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
export const PROFESSOR_PROMPT_VERSION = '17D.1';

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
    tableHtml,
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
  const subjectBlock = buildSubjectPromptBlock(ctx.subjectId);
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

  return [
    '너는 감정평가사 시험 전문 강사이다.',
    roleLine,
    '',
    '학생에게 답을 알려주는 것이 목적이 아니다.',
    '학생이 다음 비슷한 문제를 혼자 풀 수 있도록',
    '문제 해결 사고 과정을 가르치는 것이 목적이다.',
    '',
    subjectBlock,
    '',
    '절대 금지:',
    '- Pattern 이름만 반복',
    '- 문제와 관계없는 일반론',
    '- 의미 없는 숫자 나열',
    '- 예시 숫자를 만들지 마세요',
    '- "주어진 숫자를 확인한다" 같은 템플릿 문장',
    '- 계산 과정 없는 정답 선언',
    '- 보기 분석 없는 해설',
    '- Pattern을 정답 근거처럼 사용',
    '',
    '반드시 수행:',
    'Step 1 문제 이해 — 출제자가 무엇을 묻는지 문제 내용을 직접 언급하며 설명',
    '  예: "이 문제는 재고자산 평가방법 변경에 따른 회계정책 변경 효과를 묻는 문제이다."',
    'Step 2 핵심 개념 — 회계:IAS8/소급적용, 경제:탄력성, 민법:무효·취소, 법규:조문 요건·효과',
    'Step 3 풀이 전략 — 시험장에서 어떤 단어를 보고 어떤 판단을 하는지',
    'Step 4 실제 풀이 — 문제 숫자·조건을 직접 사용',
    'Step 5 선택지 분석 — ①~⑤ 전부 (정답 이유 / 오답 이유)',
    'Step 6 시험장 Tip — 함정 / 빠른 판단 / 암기 포인트',
    '',
    '[Resolved Question — 유일한 풀이 근거]',
    String(ctx.questionText || ''),
    '',
    '[Table]',
    String(ctx.tableHtml || '(없음)'),
    '',
    '[Choices]',
    choiceBlock || '(없음)',
    '',
    '[Correct Answer 번호]',
    String(ctx.correctAnswer ?? ''),
    '',
    '[Pattern Metadata — 참고용만. 정답 근거로 사용 금지]',
    metaBlock || '(없음)',
    '',
    '[강사 사전 메모 — Gemini가 재작성·심화해야 함. 그대로 복붙 금지]',
    `의도 힌트: ${ctx.analysis.examinerIntentHint}`,
    `개념 힌트: ${ctx.concept.coreConcept}`,
    `이론 힌트: ${ctx.theory.appliedTheory}`,
    `접근 힌트: ${ctx.strategy.thinkingOrder.join(' → ')}`,
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
    '작성 필드:',
    '- problemUnderstanding: 이 문제가 무엇을 묻는지 (문제 내용 직접 반영)',
    '- coreConcept / appliedTheory: 핵심 개념·적용 이론',
    '- thinkingOrder: 시험장 사고 순서',
    '- solution.explanation / solution.calculation: 실제 풀이',
    '- choiceAnalysis: 모든 보기',
    '- formula / memoryHack / examTip / tutorMessage',
    '',
    '반드시 아래 JSON만 반환. 다른 문장 금지.',
    PROFESSOR_OUTPUT_SCHEMA,
  ].join('\n');
}

/**
 * Partial regeneration — missing sections only.
 */
export function buildProfessorPartialPrompt(payload, currentPayload, missing = []) {
  const base = buildProfessorSolvePrompt(payload);
  return [
    base,
    '',
    '[Existing Professor JSON — 유지]',
    JSON.stringify(currentPayload || {}, null, 2),
    '',
    '[Missing / Weak Sections Only — 이 항목만 강화·재작성]',
    JSON.stringify(missing || []),
    '',
    '전체 재생성 금지. 부족한 섹션만 채운 JSON을 반환하라.',
    '템플릿 문장·Pattern 일반론 금지.',
  ].join('\n');
}

export default {
  PROFESSOR_PROMPT_VERSION,
  PROFESSOR_OUTPUT_SCHEMA,
  buildProfessorContext,
  buildProfessorSolvePrompt,
  buildProfessorPartialPrompt,
};
