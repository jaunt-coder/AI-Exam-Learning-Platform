/**
 * Sprint-17D.6 — Reconstruction Quality
 * Checks: table missing · number corruption · choice mismatch · formula corruption
 */

import { extractProblemNumbers } from '../gemini-solver/human-explanation-validator.js';
import { normalizeQuestionLayout } from './reconstruction-schema.js';

export const RECONSTRUCTION_QUALITY_VERSION = '17D.6';
export const RECONSTRUCTION_ACCURACY_TARGET = 95;

/**
 * @param {object} layout — normalized question-layout
 * @param {{
 *   baselineText?: string,
 *   baselineChoices?: string[],
 *   expectTable?: boolean,
 *   expectFormula?: boolean,
 * }} [baseline]
 */
export function reviewReconstructionQuality(layoutInput = {}, baseline = {}) {
  const layout = normalizeQuestionLayout(layoutInput);
  const issues = [];
  const details = {};

  const baselineText = String(baseline.baselineText || '');
  const baselineChoices = Array.isArray(baseline.baselineChoices)
    ? baseline.baselineChoices.map((c) => String(c ?? '').trim())
    : [];
  const expectTable = baseline.expectTable === true
    || /표|다음|자료|<table|\|/.test(baselineText);
  const expectFormula = baseline.expectFormula === true
    || /[=％%×÷＋−]/.test(baselineText);

  /* 1. table missing (25) */
  let tableScore = 25;
  const hasTable = (layout.tables || []).some((t) => /<table/i.test(t.html));
  if (expectTable && !hasTable) {
    tableScore = 0;
    issues.push('table_missing');
  } else if (expectTable && hasTable) {
    tableScore = 25;
  } else if (!expectTable) {
    tableScore = 25;
  }
  details.tableMissing = { score: tableScore, max: 25, ok: tableScore >= 20, hasTable };

  /* 2. number corruption (30) */
  const baseNums = extractProblemNumbers(baselineText);
  const layoutCorpus = [
    layout.questionText,
    ...(layout.tables || []).map((t) => t.html.replace(/<[^>]+>/g, ' ')),
    ...(layout.formulaBlocks || []).map((f) => `${f.latex} ${f.text}`),
    ...(layout.choices || []),
  ].join(' ');
  const layoutNums = extractProblemNumbers(layoutCorpus);
  let numberScore = 30;
  let numberRatio = 1;
  if (baseNums.length >= 2) {
    const preserved = baseNums.filter((n) => layoutNums.includes(n));
    numberRatio = preserved.length / baseNums.length;
    numberScore = Math.round(numberRatio * 30);
    if (numberRatio < 0.85) issues.push('number_corruption');
  }
  details.numberCorruption = {
    score: numberScore,
    max: 30,
    ok: numberScore >= 25,
    ratio: numberRatio,
    baselineCount: baseNums.length,
    preservedCount: baseNums.length
      ? baseNums.filter((n) => layoutNums.includes(n)).length
      : 0,
  };

  /* 3. choice mismatch (25) */
  let choiceScore = 25;
  const layoutChoices = (layout.choices || []).map((c) => c.trim()).filter(Boolean);
  if (baselineChoices.length) {
    const n = Math.min(baselineChoices.length, Math.max(layoutChoices.length, baselineChoices.length));
    let match = 0;
    for (let i = 0; i < baselineChoices.length; i += 1) {
      const a = normalizeChoice(baselineChoices[i]);
      const b = normalizeChoice(layoutChoices[i] || '');
      if (a && b && (a === b || a.includes(b) || b.includes(a))) match += 1;
    }
    const ratio = baselineChoices.length ? match / baselineChoices.length : 1;
    choiceScore = Math.round(ratio * 25);
    if (ratio < 0.8 || layoutChoices.length < baselineChoices.length) {
      issues.push('choice_mismatch');
    }
    details.choiceMismatch = {
      score: choiceScore,
      max: 25,
      ok: choiceScore >= 20,
      ratio,
      baselineCount: baselineChoices.length,
      layoutCount: layoutChoices.length,
      matched: match,
      slotCount: n,
    };
  } else {
    if (!layoutChoices.length) {
      choiceScore = 10;
      issues.push('choice_mismatch');
    }
    details.choiceMismatch = {
      score: choiceScore,
      max: 25,
      ok: choiceScore >= 20,
      ratio: layoutChoices.length ? 1 : 0,
    };
  }

  /* 4. formula corruption (20) */
  let formulaScore = 20;
  const hasFormula = (layout.formulaBlocks || []).some(
    (f) => String(f.latex || f.text || '').trim(),
  );
  if (expectFormula && !hasFormula) {
    /* soft: formula may live inside questionText */
    const inline = /[=]/.test(layout.questionText);
    formulaScore = inline ? 14 : 6;
    if (formulaScore < 12) issues.push('formula_corruption');
  }
  details.formulaCorruption = {
    score: formulaScore,
    max: 20,
    ok: formulaScore >= 14,
    hasFormula,
    expectFormula,
  };

  const score = tableScore + numberScore + choiceScore + formulaScore;
  const accuracy = score; /* /100 */

  return {
    schemaVersion: RECONSTRUCTION_QUALITY_VERSION,
    score,
    accuracy,
    pass: accuracy >= RECONSTRUCTION_ACCURACY_TARGET,
    target: RECONSTRUCTION_ACCURACY_TARGET,
    issues,
    details,
    decision:
      accuracy >= RECONSTRUCTION_ACCURACY_TARGET
        ? 'approve'
        : accuracy >= 70
          ? 'review'
          : 'reject',
  };
}

function normalizeChoice(s) {
  return String(s || '')
    .replace(/[①②③④⑤\s,]/g, '')
    .replace(/원$/g, '')
    .trim();
}

export default {
  reviewReconstructionQuality,
  RECONSTRUCTION_QUALITY_VERSION,
  RECONSTRUCTION_ACCURACY_TARGET,
};
