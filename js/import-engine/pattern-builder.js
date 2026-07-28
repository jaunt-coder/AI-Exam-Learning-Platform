/**
 * Sprint-19B — Pattern Candidate Builder
 * Generates Pattern Candidates only. Never writes Pattern DB product file.
 */

export const PATTERN_BUILDER_VERSION = '19B';

/** Keyword → pattern candidate seeds per subject (extendable). */
export const PATTERN_SEEDS = Object.freeze({
  accounting: [
    { id: 'ACC_INV', name: '재고자산', keywords: ['재고', '매출원가', 'FIFO', '총평균', '저가법', 'NRV'] },
    { id: 'ACC_PPE', name: '유형자산', keywords: ['유형자산', '감가상각', '취득원가', '처분'] },
    { id: 'ACC_PROV', name: '충당부채', keywords: ['충당부채', '충당금', '우발'] },
    { id: 'ACC_REV', name: '수익인식', keywords: ['수익', '매출', '이행의무'] },
    { id: 'ACC_FIN', name: '금융상품', keywords: ['금융자산', '공정가치', '상각후원가'] },
  ],
  economics: [
    { id: 'ECO_DEM', name: '수요', keywords: ['수요', '수요곡선', '수요량'] },
    { id: 'ECO_SUP', name: '공급', keywords: ['공급', '공급곡선', '공급량'] },
    { id: 'ECO_ELA', name: '탄력성', keywords: ['탄력성', '탄력', '비탄력'] },
    { id: 'ECO_EQ', name: '시장균형', keywords: ['균형', '시장균형', '초과수요', '초과공급'] },
    { id: 'ECO_NI', name: '국민소득', keywords: ['국민소득', 'GDP', 'GNP', '소비'] },
  ],
  civil: [
    { id: 'CIV_CAN', name: '취소', keywords: ['취소', '취소권'] },
    { id: 'CIV_VOI', name: '무효', keywords: ['무효', '절대적 무효', '상대적 무효'] },
    { id: 'CIV_POS', name: '점유', keywords: ['점유', '점유자', '점유권'] },
    { id: 'CIV_PRE', name: '시효', keywords: ['시효', '소멸시효', '취득시효'] },
    { id: 'CIV_OWN', name: '소유권', keywords: ['소유권', '물권'] },
  ],
  realestate: [
    { id: 'REA_VAL', name: '부동산평가', keywords: ['감정평가', '시가', '공시지가'] },
    { id: 'REA_MKT', name: '부동산시장', keywords: ['부동산시장', '수요', '공급'] },
    { id: 'REA_INV', name: '부동산투자', keywords: ['투자', '수익률', '위험'] },
    { id: 'REA_LAW', name: '부동산공법', keywords: ['용도지역', '건축', '개발'] },
  ],
  law: [
    { id: 'LAW_ACT', name: '감정평가법', keywords: ['감정평가', '감정평가사', '자격'] },
    { id: 'LAW_LAND', name: '부동산공시', keywords: ['공시', '공시지가', '부동산가격공시'] },
    { id: 'LAW_TAX', name: '부동산세금', keywords: ['취득세', '재산세', '양도'] },
    { id: 'LAW_REG', name: '등기', keywords: ['등기', '등기부등본'] },
  ],
});

/**
 * @param {object[]} questions
 * @param {string} subjectId
 */
export function buildPatternCandidates(questions = [], subjectId = 'accounting') {
  const seeds = PATTERN_SEEDS[subjectId] || [];
  const candidates = seeds.map((seed) => {
    const hits = [];
    for (const q of questions) {
      const blob = `${q.question || ''} ${(q.choices || []).join(' ')}`;
      if (seed.keywords.some((k) => blob.includes(k))) {
        hits.push(q.questionId || q.number);
      }
    }
    return {
      patternCandidateId: `${seed.id}_CAND`,
      subjectId,
      name: seed.name,
      keywords: seed.keywords,
      questionIds: hits,
      hitCount: hits.length,
      status: 'candidate',
      productPatternDbWriteForbidden: true,
    };
  });

  return {
    schemaVersion: 'v1',
    subjectId,
    generatedAt: new Date().toISOString(),
    importVersion: PATTERN_BUILDER_VERSION,
    status: 'candidate',
    productDbWriteForbidden: true,
    count: candidates.length,
    patterns: candidates,
  };
}

export default {
  PATTERN_BUILDER_VERSION,
  PATTERN_SEEDS,
  buildPatternCandidates,
};
