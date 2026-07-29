/**
 * Sprint-17D — Explanation regenerator (partial / full)
 * Sprint-17D.2 — Fast path: auto-regen only when score < 70 (skip 70–89 second call).
 */

import { buildProfessorSolvePrompt, buildProfessorPartialPrompt } from './professor-prompt.js';
import { QUALITY_PARTIAL } from './explanation-quality-reviewer.js';

export const REGENERATOR_VERSION = '17D.2';

/**
 * Decide regeneration mode from quality review.
 * @param {{ decision?: string, score?: number, missing?: string[] }} quality
 * @param {{ autoPartial?: boolean }} [options] — autoPartial false = skip 70–89 second Gemini call
 */
export function resolveRegenMode(quality = {}, options = {}) {
  if (quality.decision === 'approve') return 'none';
  const score = Number(quality.score);
  /* Speed: do not auto-call Gemini again for partial (70–89) unless requested */
  if (
    quality.decision === 'regenerate_partial'
    || (Number.isFinite(score) && score >= QUALITY_PARTIAL && score < 90)
  ) {
    if (options.autoPartial === true) return 'partial';
    return 'none';
  }
  return 'full';
}

/**
 * Build prompt for next Gemini call.
 * @param {'full'|'partial'|'none'} mode
 * @param {object} promptPayload
 * @param {object} currentPayload
 * @param {string[]} missing
 */
export function buildRegenPrompt(mode, promptPayload, currentPayload, missing = []) {
  if (mode === 'none') return null;
  if (mode === 'partial') {
    return buildProfessorPartialPrompt(promptPayload, currentPayload, missing);
  }
  return buildProfessorSolvePrompt(promptPayload);
}

export default {
  resolveRegenMode,
  buildRegenPrompt,
  REGENERATOR_VERSION,
};
