/**
 * Sprint-19C — ROI Calculator (pure math)
 * ROI = Expected Score Gain / Estimated Study Time
 * Never mutates Learning Engine / Recommendation formulas.
 */

export const ROI_CALCULATOR_VERSION = '19C';

function clamp(n, min = 0, max = 100) {
  const v = Number(n);
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, Math.round(v)));
}

/**
 * @param {{ expectedScoreGain?: number, estimatedMinutes?: number }} input
 * @returns {{
 *   raw: number,
 *   score: number,
 *   expectedScoreGain: number,
 *   estimatedMinutes: number,
 *   estimatedHours: number,
 *   stars: number,
 *   band: string,
 * }}
 */
export function calculateRoi(input = {}) {
  const gain = Math.max(0, Number(input.expectedScoreGain) || 0);
  const minutes = Math.max(1, Number(input.estimatedMinutes) || 30);
  const hours = minutes / 60;
  const raw = gain / hours; // points per hour
  // Scale to 0–100 display index (examples: ~2.5pt/0.58h → ~97)
  const score = clamp(raw * 22.5, 0, 100);
  return {
    raw: Math.round(raw * 1000) / 1000,
    score,
    expectedScoreGain: Math.round(gain * 10) / 10,
    estimatedMinutes: minutes,
    estimatedHours: Math.round(hours * 100) / 100,
    stars: roiStars(score),
    band: roiBand(score),
  };
}

/**
 * @param {number} score
 */
export function roiStars(score) {
  const s = Number(score) || 0;
  if (s >= 90) return 5;
  if (s >= 70) return 4;
  if (s >= 50) return 3;
  if (s >= 30) return 2;
  return 1;
}

/**
 * @param {number} score
 */
export function roiBand(score) {
  const s = Number(score) || 0;
  if (s >= 90) return 'S';
  if (s >= 70) return 'A';
  if (s >= 50) return 'B';
  if (s >= 30) return 'C';
  return 'D';
}

/**
 * Star string ★★★★★
 * @param {number} stars
 */
export function formatStars(stars) {
  const n = Math.max(0, Math.min(5, Number(stars) || 0));
  return `${'★'.repeat(n)}${'☆'.repeat(5 - n)}`;
}

/**
 * Estimate study minutes from pattern difficulty signals.
 */
export function estimateStudyMinutes({
  frequency = 1,
  mastery = 50,
  recentWrong = 0,
  complexity = 1,
} = {}) {
  const gap = Math.max(0, 100 - (Number(mastery) || 0));
  const base = 20 + Math.min(40, (Number(frequency) || 1) * 1.5);
  const gapExtra = gap * 0.25;
  const wrongExtra = Math.min(30, (Number(recentWrong) || 0) * 6);
  const complexMul = Math.max(0.8, Number(complexity) || 1);
  return Math.max(15, Math.round((base + gapExtra + wrongExtra) * complexMul));
}

/**
 * Expected score gain if student masters this pattern gap.
 * Assumes subject exam ≈ 100 pts distributed by frequency weight.
 */
export function estimateScoreGain({
  frequency = 1,
  totalFrequency = 1,
  mastery = 50,
  recoverRate = 0.75,
  subjectPoints = 100,
} = {}) {
  const weight = (Number(frequency) || 0) / Math.max(1, Number(totalFrequency) || 1);
  const gap = Math.max(0, 100 - (Number(mastery) || 0)) / 100;
  const gain = subjectPoints * weight * gap * (Number(recoverRate) || 0.75);
  return Math.round(gain * 10) / 10;
}

export default {
  ROI_CALCULATOR_VERSION,
  calculateRoi,
  roiStars,
  roiBand,
  formatStars,
  estimateStudyMinutes,
  estimateScoreGain,
};
