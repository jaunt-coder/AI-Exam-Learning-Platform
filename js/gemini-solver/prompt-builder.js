/**
 * Sprint-17A — Gemini Prompt Builder (Problem First)
 * Pattern is reference metadata only — never used as the explanation source.
 */

export const PROMPT_VERSION = '17A.1';

const OUTPUT_SCHEMA = `{
  "summary": "",
  "stepByStep": [],
  "calculation": [],
  "correctAnswer": 2,
  "verification": {
    "choiceMatched": true,
    "calculationCorrect": true
  },
  "mistakeDiagnosis": "",
  "misconception": "",
  "review30": "",
  "formulaCard": "",
  "examChecklist": [],
  "tutorAdvice": "",
  "confidence": 96
}`;

/**
 * @param {{
 *   questionText?: string,
 *   tableHtml?: string,
 *   choices?: string[],
 *   correctAnswer?: number,
 *   patternMetadata?: object|null,
 * }} payload
 */
export function buildSolvePrompt(payload = {}) {
  const choices = Array.isArray(payload.choices) ? payload.choices : [];
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

  return [
    '당신은 감정평가사 회계학 시험 풀이 전문가입니다.',
    'Pattern 설명을 하지 말고, 아래 문제만 직접 읽고 계산하여 풀이하십시오.',
    '',
    '[Question]',
    String(payload.questionText || ''),
    '',
    '[Table HTML]',
    String(payload.tableHtml || '(없음)'),
    '',
    '[Choices]',
    choiceBlock || '(없음)',
    '',
    '[Correct Answer]',
    String(payload.correctAnswer ?? ''),
    '',
    '[Pattern Metadata — 참고용만, 풀이 근거로 사용 금지]',
    metaBlock || '(없음)',
    '',
    '요청 작업:',
    '1. 이 문제를 직접 풀어라.',
    '2. 풀이를 단계별로 작성하라.',
    '3. 모든 계산을 줄 단위로 작성하라.',
    '4. 정답을 보기와 대조하라.',
    '5. 학생이 어디서 틀리는지 설명하라.',
    '6. 이 문제에서 반드시 기억해야 하는 핵심 개념을 작성하라.',
    '7. 30초 복습을 작성하라.',
    '8. 공식 카드를 작성하라.',
    '9. 시험장에서 생각하는 순서를 작성하라.',
    '10. 과외선생님처럼 설명하라.',
    '',
    '반드시 아래 JSON만 반환하라. 다른 문장 금지.',
    OUTPUT_SCHEMA,
  ].join('\n');
}

/**
 * Pass-2: verify calculation errors in an existing solution JSON.
 * @param {object} solutionJson
 * @param {{ correctAnswer?: number, choices?: string[] }} context
 */
export function buildValidationPrompt(solutionJson, context = {}) {
  return [
    '당신은 계산 검증 전문가입니다.',
    '아래 풀이에 계산 오류가 있는지 검증하십시오.',
    '정답 보기 번호는 ' + String(context.correctAnswer ?? '') + ' 입니다.',
    '',
    '[Existing Solution JSON]',
    JSON.stringify(solutionJson || {}, null, 2),
    '',
    '반드시 JSON만 반환:',
    '{',
    '  "calculationCorrect": true,',
    '  "choiceMatched": true,',
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
 * @param {object} payload — same as buildSolvePrompt payload
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
  ].join('\n');
}

export default {
  PROMPT_VERSION,
  buildSolvePrompt,
  buildValidationPrompt,
  buildMissingRecoveryPrompt,
};
