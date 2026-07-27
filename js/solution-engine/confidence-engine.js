/**
 * Sprint-15A+ — Solution Confidence Engine (0~100)
 * Separate from Sprint-12B recovery confidence-engine (untouched).
 */

export const SOLUTION_CONFIDENCE_LEVELS = Object.freeze({
  HIGH: 85,
  MEDIUM: 60,
});

/**
 * @param {number} score 0..100
 * @returns {'HIGH'|'MEDIUM'|'LOW'}
 */
export function classifySolutionConfidence(score) {
  const n = Number(score);
  if (!Number.isFinite(n)) return 'LOW';
  if (n >= SOLUTION_CONFIDENCE_LEVELS.HIGH) return 'HIGH';
  if (n >= SOLUTION_CONFIDENCE_LEVELS.MEDIUM) return 'MEDIUM';
  return 'LOW';
}

/**
 * Score diagnosis confidence from signals.
 * @param {{
 *   isCorrect?: boolean,
 *   matchedHint?: boolean,
 *   patternKnown?: boolean,
 *   answerDelta?: number,
 *   hasCalculation?: boolean,
 *   primaryWeight?: number,
 * }} signals
 * @returns {{ score: number, level: string, percent: number }}
 */
export function scoreDiagnosisConfidence(signals = {}) {
  if (signals.isCorrect) {
    return { score: 100, level: 'HIGH', percent: 100 };
  }

  let score = 55;
  if (signals.patternKnown) score += 12;
  if (signals.matchedHint) score += 18;
  if (signals.hasCalculation) score += 6;
  if (Number.isFinite(signals.answerDelta)) {
    const d = Math.abs(Number(signals.answerDelta));
    if (d === 1) score += 8;
    else if (d === 2) score += 4;
  }
  if (Number.isFinite(signals.primaryWeight)) {
    score = Math.round(score * 0.55 + Number(signals.primaryWeight) * 0.45);
  }

  score = Math.max(0, Math.min(99, Math.round(score)));
  return {
    score,
    percent: score,
    level: classifySolutionConfidence(score),
  };
}

/**
 * Softmax-like relative weights for candidate list.
 * @param {{ code: string, weight: number }[]} candidates
 */
export function normalizeCandidateWeights(candidates = []) {
  const list = Array.isArray(candidates) ? candidates : [];
  const sum = list.reduce((a, c) => a + Math.max(0, Number(c.weight) || 0), 0) || 1;
  return list.map((c) => ({
    ...c,
    weight: Math.round(((Math.max(0, Number(c.weight) || 0) / sum) * 1000)) / 1000,
    confidence: Math.round((Math.max(0, Number(c.weight) || 0) / sum) * 100),
  }));
}

export default {
  SOLUTION_CONFIDENCE_LEVELS,
  classifySolutionConfidence,
  scoreDiagnosisConfidence,
  normalizeCandidateWeights,
};
