/**
 * Sprint-14C — Evidence Score (0~100 explainability weight)
 * Does not change recommendation ranking.
 */

import { clamp, toneFromScore } from './evidence-utils.js';

export const SCORE_WEIGHTS = Object.freeze({
  wrongHistory: 30,
  mastery: 25,
  confidence: 20,
  review: 15,
  pattern: 10,
});

/**
 * @param {{ wrong?: number, mastery?: number, confidence?: number, review?: number, pattern?: number }} parts
 */
export function computeEvidenceScore(parts = {}) {
  const wrong = clamp(parts.wrong ?? 0, 0, SCORE_WEIGHTS.wrongHistory);
  const mastery = clamp(parts.mastery ?? 0, 0, SCORE_WEIGHTS.mastery);
  const confidence = clamp(parts.confidence ?? 0, 0, SCORE_WEIGHTS.confidence);
  const review = clamp(parts.review ?? 0, 0, SCORE_WEIGHTS.review);
  const pattern = clamp(parts.pattern ?? 0, 0, SCORE_WEIGHTS.pattern);
  const total = Math.round(wrong + mastery + confidence + review + pattern);
  return {
    wrongHistory: wrong,
    mastery,
    confidence,
    review,
    pattern,
    total: clamp(total, 0, 100),
    tone: toneFromScore(total),
    breakdown: [
      { type: 'Wrong History', points: wrong, max: SCORE_WEIGHTS.wrongHistory },
      { type: 'Mastery', points: mastery, max: SCORE_WEIGHTS.mastery },
      { type: 'Confidence', points: confidence, max: SCORE_WEIGHTS.confidence },
      { type: 'Review', points: review, max: SCORE_WEIGHTS.review },
      { type: 'Pattern', points: pattern, max: SCORE_WEIGHTS.pattern },
    ],
  };
}

export function estimatedBenefitStars(totalScore) {
  const s = clamp(Math.round((Number(totalScore) || 0) / 20), 0, 5);
  return '★'.repeat(s) + '☆'.repeat(5 - s);
}

export default {
  SCORE_WEIGHTS,
  computeEvidenceScore,
  estimatedBenefitStars,
};
