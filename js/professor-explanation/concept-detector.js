/**
 * Sprint-17D — Core Concept Detector
 * Suggests exam concepts from question wording (Pattern is reference only).
 */

export const CONCEPT_DETECTOR_VERSION = '17D';

const SUBJECT_CONCEPT_RULES = {
  accounting: [
    { re: /회계정책|소급|변경.*방법|평가방법/, concept: '회계정책 변경(소급적용)', theory: 'K-IFRS / IAS 8' },
    { re: /재고자산|기말재고|매출원가|저가법|순실현가능/, concept: '재고자산 인식·측정', theory: 'K-IFRS 재고자산' },
    { re: /FOB|적송|시송|미착/, concept: '재고자산 범위(소유권 이전)', theory: '수익·재고 인식 시점' },
    { re: /재평가|손상|회수가능|OCI/, concept: '유형자산 재평가·손상', theory: 'K-IFRS 유형자산·손상' },
    { re: /감가|내용연수|잔존가치|정액/, concept: '감가상각', theory: '유형자산 감가상각' },
    { re: /질적특성|예측가치|검증가능|개념체계/, concept: '재무정보의 질적특성', theory: '재무보고를 위한 개념체계' },
  ],
  economics: [
    { re: /수요|공급|균형가격|균형거래/, concept: '시장 균형', theory: '수요·공급 균형' },
    { re: /탄력|한계효용|IS-LM|한계/, concept: '탄력성·한계분석', theory: '미시·거시 기초' },
    { re: /노동|최저임금|초과수요|초과공급/, concept: '노동시장', theory: '노동수요·공급' },
    { re: /인구감소|최저임금/, concept: '노동시장 충격', theory: '수요·공급 이동' },
  ],
  civil: [
    { re: /무효|취소/, concept: '무효·취소', theory: '민법 총칙' },
    { re: /대리|대표/, concept: '대리·대표', theory: '대리법리' },
    { re: /법인|정관|이사/, concept: '법인', theory: '민법 법인' },
    { re: /불법행위/, concept: '법인의 불법행위책임', theory: '민법 제35조 등' },
  ],
  realestate: [
    { re: /임장|외부효과|국지화|영속성|부증성/, concept: '토지의 특성', theory: '부동산학 원론' },
    { re: /후보지|소지|공지|용도전환/, concept: '용도전환 관련 용어', theory: '부동산 활동 용어' },
  ],
  law: [
    { re: /도시.?군기본계획|국토|공청회/, concept: '도시·군기본계획', theory: '국토계획법' },
    { re: /조문|허가|인가|신고/, concept: '행정법 요건·효과', theory: '관계법규 조문' },
  ],
};

/**
 * @param {{ questionText?: string, subjectId?: string, patternMetadata?: object|null }} input
 */
export function detectCoreConcept(input = {}) {
  const subjectId = String(input.subjectId || 'accounting');
  const text = String(input.questionText || '');
  const rules = SUBJECT_CONCEPT_RULES[subjectId] || SUBJECT_CONCEPT_RULES.accounting;

  for (const rule of rules) {
    if (rule.re.test(text)) {
      return {
        schemaVersion: CONCEPT_DETECTOR_VERSION,
        coreConcept: rule.concept,
        appliedTheoryHint: rule.theory,
        source: 'question-text',
        patternRef: input.patternMetadata?.patternName || null,
      };
    }
  }

  const patternName = input.patternMetadata?.patternName || input.patternMetadata?.primaryPattern;
  return {
    schemaVersion: CONCEPT_DETECTOR_VERSION,
    coreConcept: patternName
      ? `문제 문장에서 직접 추출한 핵심 개념 (참고 Pattern: ${patternName})`
      : '문제 문장에서 직접 추출해야 하는 핵심 개념',
    appliedTheoryHint: subjectTheoryFallback(subjectId),
    source: 'fallback',
    patternRef: patternName || null,
  };
}

function subjectTheoryFallback(subjectId) {
  const map = {
    accounting: 'K-IFRS 관련 기준서',
    economics: '미시·거시 경제 이론',
    civil: '민법 조문·판례',
    realestate: '부동산학 원론',
    law: '관계법규 조문',
  };
  return map[subjectId] || map.accounting;
}

export default { detectCoreConcept, CONCEPT_DETECTOR_VERSION, SUBJECT_CONCEPT_RULES };
