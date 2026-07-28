/**
 * Sprint-17D — Exam-hall solution strategy (thinking order)
 */

export const SOLUTION_STRATEGY_VERSION = '17D';

/**
 * @param {{ analysis?: object, concept?: object, theory?: object }} input
 */
export function buildSolutionStrategy(input = {}) {
  const analysis = input.analysis || {};
  const concept = input.concept || {};
  const theory = input.theory || {};
  const problemType = analysis.problemType || 'theory';

  const thinkingOrder = [];

  thinkingOrder.push(
    `출제 의도 확인: 「${short(analysis.askFocus || analysis.examinerIntentHint, 80)}」`,
  );
  thinkingOrder.push(
    `핵심 키워드 → 개념 연결: ${concept.coreConcept || '문제 핵심 개념'} (${theory.appliedTheory || '적용 이론'})`,
  );

  if (String(problemType).includes('calc') || analysis.hasNumbers) {
    thinkingOrder.push('필요한 공식/관계를 세운 뒤 문제 숫자만 대입한다 (예시 숫자 금지).');
    thinkingOrder.push('계산 결과를 보기와 대조해 정답을 확정한다.');
  } else {
    thinkingOrder.push('요건·법리(또는 정의)를 정리한 뒤 선택지별로 맞는지 검증한다.');
    thinkingOrder.push('함정 보기(유사 개념·예외·판례 오해)를 배제한다.');
  }

  thinkingOrder.push('시험장 Tip: 같은 유형에서 반복되는 판단 기준을 한 문장으로 남긴다.');

  return {
    schemaVersion: SOLUTION_STRATEGY_VERSION,
    thinkingOrder,
    examApproach: theory.teachingAngle || '',
    forbidden: [
      'Pattern 이름만 반복',
      '주어진 숫자를 확인한다 식 템플릿',
      '의미 없는 숫자 나열',
      '보기 분석 없는 정답 선언',
    ],
  };
}

function short(v, n) {
  const s = String(v || '').trim();
  if (s.length <= n) return s;
  return `${s.slice(0, n)}…`;
}

export default { buildSolutionStrategy, SOLUTION_STRATEGY_VERSION };
