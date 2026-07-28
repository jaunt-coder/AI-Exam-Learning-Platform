/**
 * Sprint-17D — Explanation regenerator (partial / full)
 */

import { buildProfessorSolvePrompt, buildProfessorPartialPrompt } from './professor-prompt.js';

export const REGENERATOR_VERSION = '17D';

/**
 * Decide regeneration mode from quality review.
 * @param {{ decision?: string, missing?: string[] }} quality
 */
export function resolveRegenMode(quality = {}) {
  if (quality.decision === 'approve') return 'none';
  if (quality.decision === 'regenerate_partial') return 'partial';
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
