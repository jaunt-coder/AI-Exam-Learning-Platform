/**
 * Sprint-17B — Vision Quality Score (post-Vision payload)
 */

import { clamp } from './vision-utils.js';
import { isHtmlTable } from './vision-validator.js';

/**
 * @param {object} payload — normalized Vision JSON
 */
export function scoreVisionQuality(payload = {}) {
  let score = 100;
  const deductions = [];

  if (!String(payload.question || '').trim()) {
    score -= 40;
    deductions.push({ code: 'EMPTY_QUESTION', delta: -40 });
  }
  const choices = Array.isArray(payload.choices) ? payload.choices : [];
  const filled = choices.filter((c) => String(c || '').trim()).length;
  if (filled < 5) {
    const delta = -10 * (5 - filled);
    score += delta;
    deductions.push({ code: 'CHOICES_SHORT', delta });
  }
  if (payload.tableHtml && !isHtmlTable(payload.tableHtml)) {
    score -= 25;
    deductions.push({ code: 'TABLE_NOT_HTML', delta: -25 });
  }
  if (String(payload.question || '').includes('|') && !payload.tableHtml) {
    score -= 15;
    deductions.push({ code: 'TABLE_LIKELY_INLINE', delta: -15 });
  }
  if (Array.isArray(payload.formula) && payload.formula.some((f) => /�|¿|□{3,}/.test(f))) {
    score -= 10;
    deductions.push({ code: 'FORMULA_BROKEN', delta: -10 });
  }

  score = clamp(score, 0, 100);
  return {
    score,
    deductions,
    tableOk: !payload.tableHtml || isHtmlTable(payload.tableHtml),
    formulaOk: Array.isArray(payload.formula),
    choicesOk: filled >= 5,
  };
}

export default { scoreVisionQuality };
