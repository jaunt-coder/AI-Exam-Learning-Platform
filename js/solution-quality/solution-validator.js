/**
 * Sprint-15C — Solution Validator
 * Validates quality report shape / blueprint completeness.
 */

import { QUALITY_DIMENSIONS } from './solution-quality-score.js';

const MISSING_ALLOW = new Set(QUALITY_DIMENSIONS.map((d) => d.missing));

export function validateQualityReport(report = {}) {
  const errors = [];
  if (!report || typeof report !== 'object') {
    return { ok: false, errors: ['report_required'] };
  }
  const total = Number(report.qualityScore?.total ?? report.total);
  if (!Number.isFinite(total) || total < 0 || total > 100) {
    errors.push('total_out_of_range');
  }
  const missing = report.missingItems || [];
  if (!Array.isArray(missing)) errors.push('missingItems_not_array');
  else {
    for (const m of missing) {
      if (!MISSING_ALLOW.has(m)) errors.push(`unknown_missing:${m}`);
    }
  }
  return { ok: errors.length === 0, errors };
}

export function validateBlueprint(blueprint = {}) {
  const errors = [];
  if (!blueprint.questionId) errors.push('questionId_required');
  if (!blueprint.patternId) errors.push('patternId_required');
  if (!Array.isArray(blueprint.solvingFramework)) errors.push('solvingFramework_array');
  if (!Array.isArray(blueprint.requiredSteps)) errors.push('requiredSteps_array');
  if (!Array.isArray(blueprint.commonMistakes)) errors.push('commonMistakes_array');
  return { ok: errors.length === 0, errors };
}

export default {
  validateQualityReport,
  validateBlueprint,
  MISSING_ALLOW,
};
