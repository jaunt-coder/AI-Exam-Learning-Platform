/**
 * Sprint-15C — Solution Analyzer
 * Detects presence of explanation elements in a solution pack (read-only).
 */

function textBlob(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(textBlob).join('\n');
  if (typeof value === 'object') {
    return Object.values(value).map(textBlob).join('\n');
  }
  return String(value);
}

function hasSubstance(text, minLen = 12) {
  return String(text || '').replace(/\s+/g, ' ').trim().length >= minLen;
}

/**
 * Extract analyzable signals from 15A+ / 15B solution pack.
 */
export function analyzeSolutionPack(pack = {}, question = {}) {
  const smartSections = pack.smartReview?.explanation?.sections || [];
  const byId = Object.fromEntries(
    smartSections.map((s) => [s.id, s]),
  );

  const explanationText = textBlob([
    pack.explanation,
    pack.smartReview?.explanation,
    byId.oneLine,
    byId.coreReason,
    byId.calcOrder,
  ]);

  const conceptText = textBlob([
    byId.coreReason,
    byId.memory,
    pack.keyTakeaway,
    pack.formulas,
    pack.formulaCard,
    question.patternId,
  ]);

  const calcText = textBlob([
    pack.calculation,
    byId.calcOrder,
    pack.formulaCard?.chain,
  ]);

  const diagnosisText = textBlob([
    pack.diagnosis,
    pack.misconception,
    pack.mistakeTypes,
    byId.traps,
  ]);

  const examTipText = textBlob([
    pack.tutor,
    pack.examTutor,
    pack.smartReview?.thirtySecond,
    byId.memory,
    pack.keyTakeaway,
  ]);

  const isCalculation =
    Array.isArray(pack.calculation) && pack.calculation.length > 0
    || /계산|원가|매출원가|기말|FIFO|평균/i.test(
      `${question.patternId || ''} ${question.question || question.stem || ''}`,
    );

  return {
    hasProblemApproach:
      hasSubstance(byId.oneLine?.body)
      || hasSubstance(byId.coreReason?.body)
      || (Array.isArray(pack.explanation?.steps) && pack.explanation.steps.length >= 1),
    hasConceptExplanation:
      hasSubstance(byId.coreReason?.body, 20)
      || hasSubstance(textBlob(pack.keyTakeaway), 20)
      || (Array.isArray(pack.formulas) && pack.formulas.length > 0),
    hasCalculationSteps:
      !isCalculation
        ? true /* non-calc: full credit path handled in scorer */
        : (Array.isArray(pack.calculation) && pack.calculation.some((c) => (c.lines || []).length >= 2))
          || (Array.isArray(byId.calcOrder?.lines) && byId.calcOrder.lines.length >= 2)
          || hasSubstance(calcText, 40),
    hasMistakeDiagnosis:
      Boolean(pack.diagnosis?.primary || pack.diagnosis?.summary)
      || Boolean(pack.mistakeTypes?.primary || pack.mistakeTypes?.summary)
      || (Array.isArray(pack.misconception?.lines) && pack.misconception.lines.length > 0)
      || hasSubstance(byId.traps?.body),
    hasExamTip:
      (Array.isArray(pack.examTutor?.steps) && pack.examTutor.steps.length >= 2)
      || (Array.isArray(pack.tutor?.checklist) && pack.tutor.checklist.length >= 2)
      || hasSubstance(byId.memory?.body)
      || Boolean(pack.smartReview?.thirtySecond?.bullets?.length),
    isCalculation,
    lengths: {
      approach: explanationText.length,
      concept: conceptText.length,
      calculation: calcText.length,
      diagnosis: diagnosisText.length,
      examTip: examTipText.length,
    },
  };
}

export default {
  analyzeSolutionPack,
  textBlob,
  hasSubstance,
};
