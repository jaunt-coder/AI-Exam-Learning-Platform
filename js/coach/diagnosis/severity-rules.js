/**
 * Coach Phase C3 — severity / trend rules (config-driven)
 */

import { WEAKNESS_CONFIG } from '../config/weakness-config.js';

/**
 * @param {object[]} attemptsSortedAsc
 * @param {object} [config]
 * @returns {'improving'|'declining'|'stable'|'insufficient_data'}
 */
export function computeRecentTrend(attemptsSortedAsc, config = WEAKNESS_CONFIG) {
  const min = config.minAttemptsForTrend;
  if (!attemptsSortedAsc || attemptsSortedAsc.length < min) {
    return 'insufficient_data';
  }
  const window = config.recentWindow;
  const recent = attemptsSortedAsc.slice(-window);
  const priorPool = attemptsSortedAsc.slice(0, -recent.length);
  if (priorPool.length === 0) {
    return 'insufficient_data';
  }
  const recentAcc =
    recent.filter((a) => a.isCorrect).length / Math.max(recent.length, 1);
  const priorAcc =
    priorPool.filter((a) => a.isCorrect).length / Math.max(priorPool.length, 1);
  const delta = recentAcc - priorAcc;
  if (delta >= config.trend.improvingDelta) return 'improving';
  if (delta <= config.trend.decliningDelta) return 'declining';
  return 'stable';
}

/**
 * @param {{ accuracy: number, wrongCount: number, totalAttempts: number, averageElapsedSeconds: number }} stats
 * @param {object} [config]
 * @returns {'critical'|'weak'|'normal'|'mastered'}
 */
export function assignSeverity(stats, config = WEAKNESS_CONFIG) {
  const s = config.severity;
  const { accuracy, wrongCount, totalAttempts, averageElapsedSeconds } = stats;

  if (totalAttempts < config.minAttemptsForSeverity) {
    return 'normal';
  }

  if (
    totalAttempts >= s.mastered.minAttempts &&
    accuracy >= s.mastered.minAccuracy
  ) {
    return 'mastered';
  }

  let severity = 'normal';
  if (accuracy <= s.critical.maxAccuracy && wrongCount >= s.critical.minWrong) {
    severity = 'critical';
  } else if (accuracy <= s.weak.maxAccuracy) {
    severity = 'weak';
  }

  // timeout boosts from config
  if (
    averageElapsedSeconds >= s.timeoutBoost.whenAverageElapsedGte &&
    severity === s.timeoutBoost.from
  ) {
    severity = s.timeoutBoost.to;
  }
  if (
    s.timeoutBoostWeakToCritical.enabled &&
    averageElapsedSeconds >= s.timeoutBoostWeakToCritical.whenAverageElapsedGte &&
    severity === 'weak' &&
    accuracy <= s.timeoutBoostWeakToCritical.maxAccuracy
  ) {
    severity = 'critical';
  }

  return severity;
}
