/**
 * Sprint-17C — Human-Level Gemini Prompt (강사형 직접 풀이)
 * Sprint-19A — Subject Prompt 자동 교체 (회계 하드코딩 제거)
 * Sprint-17D — Professor-Level Prompt Layer (Explanation 생성만 교체)
 * Pattern = 참고용만. 풀이는 Resolved Question 숫자로만 생성.
 * Gemini Solver 파이프라인 자체는 변경하지 않음.
 */

import { buildProfessorSolvePrompt, PROFESSOR_PROMPT_VERSION } from '../professor-explanation/professor-prompt.js';
import { resolveSubjectIdForQuestion } from '../subject/subject-router.js';

/** Aligned with Professor Prompt Version — cache bust on prompt change */
export const PROMPT_VERSION = PROFESSOR_PROMPT_VERSION;

/**
 * @param {{
 *   questionText?: string,
 *   tableHtml?: string,
 *   choices?: string[],
 *   correctAnswer?: number,
 *   patternMetadata?: object|null,
 *   subjectId?: string,
 *   resolvedQuestion?: object,
 *   learningContext?: object,
 *   studentContext?: object,
 * }} payload
 */
export function buildSolvePrompt(payload = {}) {
  const subjectId =
    payload.subjectId
    || resolveSubjectIdForQuestion(payload.resolvedQuestion || payload)
    || undefined;
  return buildProfessorSolvePrompt({
    ...payload,
    subjectId,
  });
}

/**
 * Pass-2: verify calculation errors + number usage.
 * @param {object} solutionJson
 * @param {{ correctAnswer?: number, choices?: string[], questionText?: string, tableHtml?: string }} context
 */
export function buildValidationPrompt(solutionJson, context = {}) {
  return [
    '당신은 계산 검증 전문가입니다.',
    '아래 풀이에 계산 오류가 있는지, 문제 숫자를 빠짐없이 사용했는지 검증하십시오.',
    '정답 보기 번호는 ' + String(context.correctAnswer ?? '') + ' 입니다.',
    '',
    '[Problem Numbers Context]',
    String(context.questionText || '').slice(0, 800),
    String(context.tableHtml || '').replace(/<[^>]+>/g, ' ').slice(0, 400),
    '',
    '[Existing Solution JSON]',
    JSON.stringify(solutionJson || {}, null, 2),
    '',
    '반드시 JSON만 반환:',
    '{',
    '  "calculationCorrect": true,',
    '  "choiceMatched": true,',
    '  "usedProblemNumbers": true,',
    '  "missingNumbers": [],',
    '  "issues": [],',
    '  "correctedCalculation": [],',
    '  "confidence": 96',
    '}',
  ].join('\n');
}

/**
 * Missing-only recovery prompt (never full regenerate).
 * @param {object} partial
 * @param {string[]} missingFields
 * @param {object} payload
 */
export function buildMissingRecoveryPrompt(partial, missingFields, payload = {}) {
  const base = buildSolvePrompt(payload);
  return [
    base,
    '',
    '[Existing Partial JSON — 유지]',
    JSON.stringify(partial || {}, null, 2),
    '',
    '[Missing Fields Only — 이 항목만 다시 생성]',
    JSON.stringify(missingFields || []),
    '',
    '전체 재생성 금지. Missing 필드만 채운 JSON 조각을 반환하라.',
    'Pattern 일반론 금지. 문제 숫자만 사용.',
  ].join('\n');
}

export default {
  PROMPT_VERSION,
  buildSolvePrompt,
  buildValidationPrompt,
  buildMissingRecoveryPrompt,
};
