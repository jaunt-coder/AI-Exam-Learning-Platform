/**
 * Sprint-19C — Pattern Mastery adapter (reads LE mastery — does not change formulas)
 */

import { computePatternMastery } from '../learning-engine/mastery-engine.js';
import { loadProgressDoc } from '../learning-engine/learning-storage.js';
import { getPatternMastery } from '../mastery-service.js';

export const PATTERN_MASTERY_VERSION = '19C';

/**
 * @param {string} patternId
 * @param {string[]} questionIds
 */
export function resolvePatternMastery(patternId, questionIds = []) {
  const computed = computePatternMastery(patternId, questionIds);
  const runtime = getPatternMastery('m1_demo_student', patternId);
  const progress = loadProgressDoc();
  const pRow = progress.byPattern?.[patternId] || {};

  let score = Number(computed?.score);
  if (!Number.isFinite(score) || score === 0) {
    if (runtime?.accuracy != null) score = Math.round(Number(runtime.accuracy) * 100);
    else if (pRow.attempts) {
      const total = (Number(pRow.correct) || 0) + (Number(pRow.incorrect) || 0);
      score = total ? Math.round(((Number(pRow.correct) || 0) / total) * 100) : 0;
    } else {
      score = 0;
    }
  }

  return {
    patternId,
    mastery: Math.max(0, Math.min(100, score)),
    masteryGap: Math.max(0, 100 - score),
    masteryLevel: computed?.masteryLevel || runtime?.masteryLevel || 'UNKNOWN',
    attempts: Number(pRow.attempts) || Number(runtime?.attempts) || 0,
    recentWrong: Number(pRow.incorrect) || 0,
    version: PATTERN_MASTERY_VERSION,
  };
}

export default {
  PATTERN_MASTERY_VERSION,
  resolvePatternMastery,
};
