/**
 * Coach Phase C3 — WeaknessReport schema (diagnosis output only)
 */

export const WEAKNESS_SEVERITIES = Object.freeze([
  'critical',
  'weak',
  'normal',
  'mastered',
]);

export const RECENT_TRENDS = Object.freeze([
  'improving',
  'declining',
  'stable',
  'insufficient_data',
]);

const PATTERN_RE = /^ACC_[A-Z]+_\d{3}$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

/**
 * @param {string} patternId
 * @returns {boolean}
 */
export function isCanonicalPatternId(patternId) {
  return typeof patternId === 'string' && PATTERN_RE.test(patternId);
}

/**
 * @param {object} [input]
 * @returns {object}
 */
export function createWeaknessReport(input = {}) {
  const totalAttempts = Number(input.totalAttempts) || 0;
  const correctCount = Number(input.correctCount) || 0;
  const wrongCount =
    input.wrongCount !== undefined
      ? Number(input.wrongCount)
      : Math.max(0, totalAttempts - correctCount);
  let accuracy = input.accuracy;
  if (typeof accuracy !== 'number') {
    accuracy = totalAttempts > 0 ? correctCount / totalAttempts : 0;
  }

  return {
    patternId: input.patternId ?? '',
    totalAttempts,
    correctCount,
    wrongCount,
    accuracy: Number(accuracy),
    averageElapsedSeconds: Number(input.averageElapsedSeconds) || 0,
    recentTrend: input.recentTrend ?? 'insufficient_data',
    severity: input.severity ?? 'normal',
    generatedAt: input.generatedAt ?? new Date().toISOString(),
  };
}

/**
 * @param {object} report
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateWeaknessReport(report) {
  const errors = [];
  if (!report || typeof report !== 'object' || Array.isArray(report)) {
    return { ok: false, errors: ['report must be an object'] };
  }
  if (!isCanonicalPatternId(report.patternId)) {
    errors.push(`patternId must be Canonical ACC_*: ${report.patternId}`);
  }
  for (const key of [
    'totalAttempts',
    'correctCount',
    'wrongCount',
    'accuracy',
    'averageElapsedSeconds',
  ]) {
    if (typeof report[key] !== 'number' || Number.isNaN(report[key])) {
      errors.push(`${key} must be number`);
    }
  }
  if (report.totalAttempts < 0 || report.correctCount < 0 || report.wrongCount < 0) {
    errors.push('counts must be non-negative');
  }
  if (report.accuracy < 0 || report.accuracy > 1) {
    errors.push('accuracy must be in [0,1]');
  }
  if (!WEAKNESS_SEVERITIES.includes(report.severity)) {
    errors.push(`severity must be one of ${WEAKNESS_SEVERITIES.join('|')}`);
  }
  if (!RECENT_TRENDS.includes(report.recentTrend)) {
    errors.push(`recentTrend must be one of ${RECENT_TRENDS.join('|')}`);
  }
  if (typeof report.generatedAt !== 'string' || !ISO_RE.test(report.generatedAt)) {
    errors.push('generatedAt must be ISO-8601 UTC');
  }
  return { ok: errors.length === 0, errors };
}
