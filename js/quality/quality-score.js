/**
 * Sprint-12C — Quality Score (0~100) + Question Status
 */

export const QUESTION_QUALITY_STATUSES = Object.freeze([
  'ORIGINAL',
  'OVERRIDE',
  'AI_SUGGESTED',
  'REVIEWED',
  'APPROVED',
  'VERIFY_REQUIRED',
  'BROKEN',
]);

/**
 * Score bands from Sprint-12C spec.
 * @param {{
 *   broken?: boolean,
 *   patternMismatch?: boolean,
 *   tableMissing?: boolean,
 *   ocrError?: boolean,
 *   aiSuggestionPending?: boolean,
 *   hasOverride?: boolean,
 *   humanApproved?: boolean,
 *   reviewed?: boolean,
 *   solutionOk?: boolean,
 *   patternOk?: boolean,
 *   ocrOk?: boolean,
 *   tableOk?: boolean,
 * }} flags
 * @returns {number}
 */
export function computeQualityScore(flags = {}) {
  if (flags.broken) return 0;
  if (flags.patternMismatch) return 20;
  if (flags.tableMissing) return 40;
  if (flags.ocrError) return 60;
  if (flags.aiSuggestionPending) return 80;
  if (flags.hasOverride && flags.humanApproved) return 90;
  if (flags.hasOverride && flags.reviewed) return 90;

  const pristine =
    !flags.hasOverride &&
    flags.ocrOk !== false &&
    flags.tableOk !== false &&
    flags.solutionOk !== false &&
    flags.patternOk !== false;

  if (pristine || flags.humanApproved) return 100;

  let score = 100;
  if (flags.hasOverride) score = Math.min(score, 90);
  if (!flags.solutionOk) score = Math.min(score, 70);
  if (flags.ocrError) score = Math.min(score, 60);
  if (flags.tableMissing) score = Math.min(score, 40);
  if (flags.patternMismatch) score = Math.min(score, 20);
  return Math.max(0, Math.min(100, score));
}

/**
 * Resolve display status.
 * @param {object} flags
 * @returns {string}
 */
export function resolveQualityStatus(flags = {}) {
  if (flags.broken) return 'BROKEN';
  if (flags.verifyRequired || flags.patternMismatch || flags.tableMissing) {
    return 'VERIFY_REQUIRED';
  }
  if (flags.humanApproved || flags.approved) return 'APPROVED';
  if (flags.reviewed) return 'REVIEWED';
  if (flags.aiSuggestionPending) return 'AI_SUGGESTED';
  if (flags.hasOverride) return 'OVERRIDE';
  return 'ORIGINAL';
}

/**
 * Low quality threshold for filters / auto priority.
 */
export const LOW_QUALITY_THRESHOLD = 60;

export default {
  QUESTION_QUALITY_STATUSES,
  LOW_QUALITY_THRESHOLD,
  computeQualityScore,
  resolveQualityStatus,
};
