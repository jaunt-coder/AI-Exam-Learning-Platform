/**
 * Sprint-17C — Human-Level Gemini Prompt (강사형 직접 풀이)
 * Pattern = 참고용만. 풀이는 Resolved Question 숫자로만 생성.
 */

export const PROMPT_VERSION = '17C.1';

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
    '당신은 감정평가사 회계학 전문 강사입니다.',
    '학생은 계산을 모르고 있습니다.',
    '반드시 학생이 종이에 계산하는 순서대로 문제를 직접 풀어주세요.',
    '패턴 설명보다 실제 계산이 우선입니다.',
    '반드시 문제 안의 숫자를 사용하세요.',
    '절대로 예시 숫자를 만들지 마세요.',
    '절대로 Pattern 일반론으로 설명하지 마세요.',
    '',
    '이 문제를 직접 풀어라.',
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
