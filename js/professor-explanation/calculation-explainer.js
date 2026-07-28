/**
 * Sprint-17D — Calculation / solution path explainer helpers
 */

export const CALCULATION_EXPLAINER_VERSION = '17D';

/**
 * Build prompt fragment that forces real-number calculation or theory application.
 * @param {{ analysis?: object, concept?: object, theory?: object }} input
 */
export function buildCalculationGuidance(input = {}) {
  const analysis = input.analysis || {};
  const problemType = String(analysis.problemType || '');

  if (problemType.includes('calc') || analysis.hasNumbers) {
    return [
      '[실제 풀이 — 계산형]',
      '반드시 다음 순서로 작성:',
      '공식',
      '↓',
      '숫자 대입 (문제·표의 숫자만)',
      '↓',
      '계산',
      '↓',
      '결론',
      'solution.calculation 배열에 한 줄씩 전개. 최소 4줄.',
      '의미 없는 숫자 나열 금지. 각 줄에 왜 그 숫자가 쓰이는지 밝힌다.',
    ].join('\n');
  }

  return [
    '[실제 풀이 — 이론형]',
    '반드시 다음 순서로 작성:',
    '요건(또는 정의)',
    '↓',
    '법리/이론',
    '↓',
    '사례·선택지 적용',
    '↓',
    '결론',
    'solution.calculation 에는 사고 전개 줄을 넣되, 가짜 계산 숫자를 만들지 말 것.',
  ].join('\n');
}

/**
 * Normalize calculation lines from professor payload.
 * @param {object} payload
 */
export function extractCalculationLines(payload = {}) {
  const fromSolution = payload?.solution?.calculation;
  if (Array.isArray(fromSolution) && fromSolution.length) {
    return fromSolution.map((s) => String(s ?? '').trim()).filter(Boolean);
  }
  if (Array.isArray(payload.calculation)) {
    return payload.calculation.map((s) => String(s ?? '').trim()).filter(Boolean);
  }
  return [];
}

export default {
  buildCalculationGuidance,
  extractCalculationLines,
  CALCULATION_EXPLAINER_VERSION,
};
