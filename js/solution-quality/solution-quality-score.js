/**
 * Sprint-15C — Solution Quality Score (0–100, five × 20)
 * Does not mutate Solution Engine pack.
 */

import { analyzeSolutionPack } from './solution-analyzer.js';

export const QUALITY_DIMENSIONS = Object.freeze([
  { key: 'approach', label: '문제 접근', missing: 'problemApproach', max: 20 },
  { key: 'concept', label: '개념 설명', missing: 'conceptExplanation', max: 20 },
  { key: 'calculation', label: '계산 과정', missing: 'calculationSteps', max: 20 },
  { key: 'diagnosis', label: '오답 분석', missing: 'mistakeDiagnosis', max: 20 },
  { key: 'examTip', label: '시험 전략', missing: 'examTip', max: 20 },
]);

function scoreDim(ok, partial, max = 20) {
  if (ok) return max;
  if (partial) return Math.round(max * 0.5);
  return 0;
}

/**
 * @returns {{ approach, concept, calculation, diagnosis, examTip, total, marks, missingItems }}
 */
export function computeSolutionQualityScore(pack = {}, question = {}) {
  const signals = analyzeSolutionPack(pack, question);

  const approach = scoreDim(
    signals.hasProblemApproach,
    signals.lengths.approach >= 20,
  );
  const concept = scoreDim(
    signals.hasConceptExplanation,
    signals.lengths.concept >= 30,
  );
  const calculation = signals.isCalculation
    ? scoreDim(signals.hasCalculationSteps, signals.lengths.calculation >= 30)
    : 20;
  const diagnosis = pack?.result?.isCorrect
    ? scoreDim(
        signals.hasMistakeDiagnosis || signals.hasExamTip,
        true,
      )
    : scoreDim(signals.hasMistakeDiagnosis, signals.lengths.diagnosis >= 20);
  const examTip = scoreDim(signals.hasExamTip, signals.lengths.examTip >= 20);

  const scores = { approach, concept, calculation, diagnosis, examTip };
  const total = approach + concept + calculation + diagnosis + examTip;

  const missingItems = [];
  if (approach < 20) missingItems.push('problemApproach');
  if (concept < 20) missingItems.push('conceptExplanation');
  if (calculation < 20) missingItems.push('calculationSteps');
  if (diagnosis < 20) missingItems.push('mistakeDiagnosis');
  if (examTip < 20) missingItems.push('examTip');

  const marks = QUALITY_DIMENSIONS.map((d) => {
    const value = scores[d.key];
    let mark = '✗';
    if (value >= d.max) mark = '✓';
    else if (value >= d.max * 0.5) mark = '△';
    return {
      key: d.key,
      label: d.label,
      missing: d.missing,
      value,
      max: d.max,
      mark,
    };
  });

  return {
    approach,
    concept,
    calculation,
    diagnosis,
    examTip,
    total,
    marks,
    missingItems,
    signals,
    reviewRequired: total < 70 || missingItems.length >= 2,
  };
}

export default {
  QUALITY_DIMENSIONS,
  computeSolutionQualityScore,
};
