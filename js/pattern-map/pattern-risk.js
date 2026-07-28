/**
 * Sprint-19C — Pattern Risk signals for ROI map (read-only)
 * Does not replace exam-strategy weakness-priority formulas.
 */

import { loadWeakMemoryDoc } from '../smart-tutor/cache.js';
import { loadMistakeProfile } from '../solution-engine/cache.js';

export const PATTERN_RISK_VERSION = '19C';

/**
 * Compact risk / confidence for Priority formula.
 * Confidence 0–1 (higher = more reliable signal).
 */
export function resolvePatternRisk(patternId) {
  const weakDoc = loadWeakMemoryDoc();
  const banner = weakDoc.banners?.[patternId];
  const mistakeProfile = loadMistakeProfile();
  const byPattern = mistakeProfile.byPattern?.[patternId] || {};
  const mistakeHits = Object.values(byPattern).reduce((s, n) => s + (Number(n) || 0), 0);

  const weakActive = Boolean(banner?.active);
  const riskScore = Math.min(100, (weakActive ? 40 : 0) + Math.min(60, mistakeHits * 8));
  const confidence = Math.min(
    1,
    0.45 + (mistakeHits > 0 ? 0.25 : 0) + (weakActive ? 0.2 : 0) + 0.1,
  );

  return {
    patternId,
    riskScore,
    confidence: Math.round(confidence * 100) / 100,
    weakActive,
    mistakeHits,
    version: PATTERN_RISK_VERSION,
  };
}

export default {
  PATTERN_RISK_VERSION,
  resolvePatternRisk,
};
