/**
 * Sprint-17D — Applied Theory Selector
 */

export const THEORY_SELECTOR_VERSION = '17D';

/**
 * @param {{ coreConcept?: string, appliedTheoryHint?: string, subjectId?: string, problemType?: string }} input
 */
export function selectAppliedTheory(input = {}) {
  const subjectId = String(input.subjectId || 'accounting');
  const hint = String(input.appliedTheoryHint || '').trim();
  const concept = String(input.coreConcept || '').trim();
  const problemType = String(input.problemType || '');

  const appliedTheory = hint || defaultTheory(subjectId);
  const teachingAngle = buildTeachingAngle(subjectId, problemType, concept, appliedTheory);

  return {
    schemaVersion: THEORY_SELECTOR_VERSION,
    appliedTheory,
    teachingAngle,
    mustTeach: [
      '왜 이 이론이 이 문제에 적용되는지',
      '시험장에서 어떤 키워드로 이론을 떠올리는지',
      '유사 문제에서 재사용할 판단 기준',
    ],
  };
}

function defaultTheory(subjectId) {
  const map = {
    accounting: 'K-IFRS 기준서 적용',
    economics: '수요·공급 및 균형 이론',
    civil: '민법 요건·효과 법리',
    realestate: '부동산학 핵심 개념',
    law: '관계법규 조문 요건·효과',
  };
  return map[subjectId] || map.accounting;
}

function buildTeachingAngle(subjectId, problemType, concept, theory) {
  if (problemType.startsWith('calc')) {
    return `${theory}를 공식으로 세운 뒤, 문제 숫자를 대입해 ${concept || '결론'}을 도출한다.`;
  }
  if (problemType.includes('theory') || subjectId === 'civil' || subjectId === 'law') {
    return `${theory}의 요건 → 법리/조문 → 사례 적용 → 결론 순서로 ${concept || '정오'}를 판단한다.`;
  }
  return `${theory}를 문제 조건에 연결해 ${concept || '출제 포인트'}를 설명한다.`;
}

export default { selectAppliedTheory, THEORY_SELECTOR_VERSION };
