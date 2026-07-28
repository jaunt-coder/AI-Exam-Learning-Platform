/**
 * Sprint-17A — Gemini Output Quality Checker + Missing Report
 */

import { REQUIRED_KEYS } from './response-parser.js';

function isEmptyValue(key, value) {
  if (value == null) return true;
  if (typeof value === 'string') return !value.trim();
  if (Array.isArray(value)) return value.length === 0 || value.every((v) => !String(v ?? '').trim());
  if (key === 'verification') {
    if (!value || typeof value !== 'object') return true;
    return (
      typeof value.choiceMatched !== 'boolean'
      || typeof value.calculationCorrect !== 'boolean'
    );
  }
  if (key === 'correctAnswer') {
    return !Number.isFinite(Number(value)) || Number(value) < 1;
  }
  if (key === 'confidence') {
    return !Number.isFinite(Number(value));
  }
  return false;
}

/**
 * @param {object|null} payload
 * @returns {{
 *   ok: boolean,
 *   missing: string[],
 *   present: string[],
 *   score: number,
 *   report: object,
 * }}
 */
export function checkGeminiQuality(payload) {
  const present = [];
  const missing = [];
  REQUIRED_KEYS.forEach((key) => {
    if (isEmptyValue(key, payload?.[key])) missing.push(key);
    else present.push(key);
  });

  const score = Math.round((present.length / REQUIRED_KEYS.length) * 100);
  const report = {
    schemaVersion: 'v1',
    checkedAt: new Date().toISOString(),
    present,
    missing,
    missingCount: missing.length,
    score,
    ok: missing.length === 0,
  };

  return {
    ok: report.ok,
    missing,
    present,
    score,
    report,
  };
}

/**
 * Map UI-facing quality labels used by Result Accordion.
 */
export function qualityLabels() {
  return {
    summary: 'summary',
    step: 'stepByStep',
    calculation: 'calculation',
    diagnosis: 'mistakeDiagnosis',
    formula: 'formulaCard',
    review30: 'review30',
    examChecklist: 'examChecklist',
    tutorAdvice: 'tutorAdvice',
  };
}

export default {
  checkGeminiQuality,
  qualityLabels,
};
