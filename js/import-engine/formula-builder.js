/**
 * Sprint-19B — Formula Candidate Builder
 * AI/heuristic Formula Candidates only. Official formula-db.json is NEVER modified.
 */

export const FORMULA_CANDIDATE_VERSION = '19B';

const FORMULA_HINTS = Object.freeze({
  accounting: [
    { name: '재고 항등식', pattern: /기초.*매입|매출원가|기말재고/, formula: '기초재고 + 당기매입 − 기말재고 = 매출원가' },
    { name: '총평균법', pattern: /평균단가|총평균/, formula: '평균단가 = (기초원가 + 매입원가) ÷ (기초수량 + 매입수량)' },
    { name: '저가법', pattern: /저가|NRV|순실현/, formula: '평가액 = min(취득원가, NRV)' },
    { name: '감가상각', pattern: /감가상각|정액법|정률법/, formula: '감가상각비 = (취득원가 − 잔존가치) ÷ 내용연수' },
  ],
  economics: [
    { name: '탄력성', pattern: /탄력/, formula: '탄력성 = %ΔQ / %ΔP' },
    { name: '시장균형', pattern: /균형/, formula: '수요량 = 공급량 인 가격·수량' },
    { name: 'GDP', pattern: /GDP|국민소득/, formula: 'GDP = C + I + G + (X − M)' },
  ],
  civil: [
    { name: '소멸시효', pattern: /소멸시효|시효/, formula: '권리 불행사 기간 경과 → 소멸시효 완성' },
  ],
  realestate: [
    { name: '수익환원', pattern: /환원|수익률|NOI/, formula: '가치 = 순영업이익 ÷ 환원율' },
  ],
  law: [
    { name: '공시지가', pattern: /공시지가|공시/, formula: '공시지가 = 표준지 단위면적당 적정가격' },
  ],
});

/**
 * @param {object[]} questions
 * @param {string} subjectId
 */
export function buildFormulaCandidates(questions = [], subjectId = 'accounting') {
  const hints = FORMULA_HINTS[subjectId] || [];
  const formulas = [];

  for (const hint of hints) {
    const questionIds = [];
    for (const q of questions) {
      const blob = `${q.question || ''} ${(q.choices || []).join(' ')} ${q.table || ''}`;
      if (hint.pattern.test(blob)) questionIds.push(q.questionId || q.number);
    }
    formulas.push({
      formulaCandidateId: `FC-${subjectId}-${formulas.length + 1}`,
      subjectId,
      name: hint.name,
      formula: hint.formula,
      questionIds,
      hitCount: questionIds.length,
      status: 'candidate',
      officialFormulaDbWriteForbidden: true,
    });
  }

  // Also extract inline "A = B" style lines as candidates
  for (const q of questions) {
    const lines = String(q.question || '').split(/\n/);
    for (const line of lines) {
      if (/=/.test(line) && /[가-힣A-Za-z]/.test(line) && line.length < 120) {
        formulas.push({
          formulaCandidateId: `FC-${subjectId}-inline-${hash(line)}`,
          subjectId,
          name: '인라인 공식 후보',
          formula: line.trim(),
          questionIds: [q.questionId || q.number],
          hitCount: 1,
          status: 'candidate',
          officialFormulaDbWriteForbidden: true,
        });
      }
    }
  }

  return {
    schemaVersion: 'v1',
    subjectId,
    generatedAt: new Date().toISOString(),
    importVersion: FORMULA_CANDIDATE_VERSION,
    status: 'candidate',
    officialFormulaDbWriteForbidden: true,
    count: formulas.length,
    formulas,
  };
}

function hash(s) {
  let h = 0;
  const str = String(s);
  for (let i = 0; i < str.length; i += 1) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h).toString(16).slice(0, 6);
}

export default {
  FORMULA_CANDIDATE_VERSION,
  buildFormulaCandidates,
};
