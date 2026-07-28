/**
 * Sprint-19A — Subject Prompt Builder
 * Replaces hardcoded accounting prompt with:
 *   Subject Prompt + Resolved Question + Learning Context + Student Context
 * Gemini Solver pipeline itself is unchanged — only prompt text composition.
 */

import { SUBJECT_PROMPT_ROLES, normalizeSubjectId } from './subject-config.js';
import { getLoadedSubject } from './subject-loader.js';
import {
  getCurrentSubjectId,
  buildLearningContext,
  buildStudentContext,
} from './subject-context.js';

export const SUBJECT_PROMPT_VERSION = '19A.1';

const OUTPUT_SCHEMA = `{
  "summary": "",
  "thinkingOrder": [],
  "calculation": [],
  "whyAnswer": [],
  "whyOthersWrong": [],
  "formula": [],
  "memoryHack": [],
  "examTip": [],
  "correctAnswer": 2,
  "verification": {
    "choiceMatched": true,
    "calculationCorrect": true
  },
  "confidence": 96
}`;

/**
 * Extract role line from prompt.md (first non-heading, non-empty line that looks like role).
 * @param {string} promptMd
 * @param {string} subjectId
 */
export function extractSubjectRole(promptMd, subjectId) {
  const id = normalizeSubjectId(subjectId);
  const fallback = SUBJECT_PROMPT_ROLES[id] || SUBJECT_PROMPT_ROLES.accounting;
  if (!promptMd) return fallback;
  const lines = String(promptMd).split(/\r?\n/);
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    if (t.includes('강사') || t.startsWith('당신')) return t;
  }
  return fallback;
}

/**
 * Build subject prompt block from plugin.
 * @param {string} [subjectId]
 */
export function buildSubjectPromptBlock(subjectId) {
  const id = normalizeSubjectId(subjectId || getCurrentSubjectId());
  const plugin = getLoadedSubject(id);
  const role = extractSubjectRole(plugin.promptMd, id);
  return [
    role,
    '학생은 계산을 모르고 있습니다.',
    '반드시 학생이 종이에 계산하는 순서대로 문제를 직접 풀어주세요.',
    '패턴 설명보다 실제 계산이 우선입니다.',
    '반드시 문제 안의 숫자를 사용하세요.',
    '절대로 예시 숫자를 만들지 마세요.',
    '절대로 Pattern 일반론으로 설명하지 마세요.',
  ].join('\n');
}

/**
 * Compose full Gemini solve prompt via Subject Adapter contract.
 * @param {{
 *   subjectId?: string,
 *   resolvedQuestion?: object,
 *   questionText?: string,
 *   tableHtml?: string,
 *   choices?: string[],
 *   correctAnswer?: number,
 *   patternMetadata?: object|null,
 *   learningContext?: object,
 *   studentContext?: object,
 * }} payload
 */
export function buildSubjectSolvePrompt(payload = {}) {
  const subjectId = normalizeSubjectId(payload.subjectId || getCurrentSubjectId());
  const subjectBlock = buildSubjectPromptBlock(subjectId);

  const rq = payload.resolvedQuestion || {};
  const questionText = payload.questionText ?? rq.question ?? rq.questionText ?? '';
  const tableHtml = payload.tableHtml ?? rq.tableHtml ?? rq.table ?? '';
  const choices = Array.isArray(payload.choices)
    ? payload.choices
    : Array.isArray(rq.choices)
      ? rq.choices
      : [];
  const correctAnswer = payload.correctAnswer ?? rq.answer ?? rq.correctAnswer ?? '';

  const choiceBlock = choices
    .map((c, i) => `${i + 1}. ${String(c ?? '')}`)
    .join('\n');

  const meta = payload.patternMetadata || {};
  const metaBlock = [
    meta.patternId ? `patternId: ${meta.patternId}` : null,
    meta.patternName ? `patternName: ${meta.patternName}` : null,
    meta.primaryPattern ? `primaryPattern: ${meta.primaryPattern}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const learning = buildLearningContext({
    subjectId,
    ...(payload.learningContext || {}),
  });
  const student = buildStudentContext(payload.studentContext || {});

  const learningBlock = [
    `subjectId: ${learning.subjectId}`,
    learning.patternId ? `patternId: ${learning.patternId}` : null,
    learning.mastery != null ? `mastery: ${learning.mastery}` : null,
    learning.weakness != null ? `weakness: ${JSON.stringify(learning.weakness)}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const studentBlock = [
    `studentId: ${student.studentId}`,
    student.examDate ? `examDate: ${student.examDate}` : null,
    student.goalScore != null ? `goalScore: ${student.goalScore}` : null,
    student.readiness != null ? `readiness: ${student.readiness}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  return [
    subjectBlock,
    '',
    '이 문제를 직접 풀어라.',
    '',
    '[Subject Prompt]',
    extractSubjectRole(getLoadedSubject(subjectId).promptMd, subjectId),
    '',
    '[Resolved Question]',
    String(questionText || ''),
    '',
    '[Table HTML]',
    String(tableHtml || '(없음)'),
    '',
    '[Choices]',
    choiceBlock || '(없음)',
    '',
    '[Correct Answer]',
    String(correctAnswer ?? ''),
    '',
    '[Pattern Metadata — 참고용만, 풀이 근거로 사용 금지]',
    metaBlock || '(없음)',
    '',
    '[Learning Context]',
    learningBlock || '(없음)',
    '',
    '[Student Context]',
    studentBlock || '(없음)',
    '',
    '작성 규칙:',
    '1. thinkingOrder: 무엇부터 생각해야 하는지 번호·화살표 순서로 작성.',
    '2. calculation: 한 줄도 생략하지 말고 줄 단위로 전개. 최소 5줄 이상. 문제 숫자만 사용.',
    '3. whyAnswer: 정답이 되는 이유를 단계로 작성.',
    '4. whyOthersWrong: 각 오답 보기가 틀린 이유를 번호별로 작성.',
    '5. formula: 이 문제에서 실제로 사용한 공식만 (Pattern 일반 공식 금지).',
    '6. memoryHack: 30초 안에 외울 문장.',
    '7. examTip: 시험장에서 1분 안에 접근하는 순서.',
    '8. summary: 한 줄 요약 (정답·핵심 결론).',
    '',
    '반드시 아래 JSON만 반환하라. 다른 문장 금지.',
    OUTPUT_SCHEMA,
  ].join('\n');
}

/**
 * Coach-style subject prompt (LLM Adapter).
 * @param {{ task?: string, subjectId?: string, facts?: object }} input
 */
export function buildSubjectCoachPrompt(input = {}) {
  const subjectId = normalizeSubjectId(input.subjectId || getCurrentSubjectId());
  const role = extractSubjectRole(getLoadedSubject(subjectId).promptMd, subjectId)
    .replace('강사입니다.', 'AI 학습코치이다.')
    .replace('당신은 ', '너는 ');
  const facts = input.facts || {};
  return [
    role,
    '학생 상태는 다음과 같다.',
    '',
    `Task: ${input.task || 'TODAY_COACH'}`,
    `Subject: ${subjectId}`,
    `Pattern: ${facts.patternId || 'UNKNOWN'}`,
    `Mastery: ${facts.masteryLevel || 'UNKNOWN'}`,
    `Weakness: ${facts.weaknessType || 'NONE'}`,
    `Recommendation: ${facts.recommendationType || 'NONE'}`,
    `Today's Goal: ${facts.todayGoal || 'Pattern 복습'}`,
    '',
    '반드시',
    '왜 추천하는지',
    '오늘 어떻게 공부하는지',
    '주의할 점',
    '격려',
    '를',
    '300~500자',
    '한국어로 작성하라.',
    '',
    'Runtime Recommendation을 수정하지 말라.',
  ].join('\n');
}

export default {
  SUBJECT_PROMPT_VERSION,
  extractSubjectRole,
  buildSubjectPromptBlock,
  buildSubjectSolvePrompt,
  buildSubjectCoachPrompt,
};
