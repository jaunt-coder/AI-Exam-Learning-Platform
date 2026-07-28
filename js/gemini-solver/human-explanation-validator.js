/**
 * Sprint-17C — Human-Level Explanation Validator
 * Required: thinkingOrder, calculation≥5, summary, formula, examTip, memoryHack, whyOthersWrong
 * Confidence drops when problem numbers are missing from calculation.
 */

import { REQUIRED_KEYS } from './response-parser.js';

function isEmptyValue(key, value) {
  if (value == null) return true;
  if (typeof value === 'string') return !value.trim();
  if (Array.isArray(value)) {
    if (key === 'calculation') return value.filter((v) => String(v ?? '').trim()).length < 5;
    return value.length === 0 || value.every((v) => !String(v ?? '').trim());
  }
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
 * Extract significant numbers from problem text/table.
 * @param {string} text
 */
export function extractProblemNumbers(text) {
  const raw = String(text || '');
  const found = raw.match(/\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?/g) || [];
  const set = new Set();
  found.forEach((n) => {
    const cleaned = n.replace(/,/g, '');
    if (!cleaned) return;
    /* skip lone small indices that are likely choice numbers only when alone — keep all ≥2 digits or with comma */
    if (cleaned.length >= 2 || Number(cleaned) >= 10) set.add(cleaned);
    else if (Number(cleaned) > 0) set.add(cleaned);
  });
  return [...set];
}

/**
 * How many problem numbers appear in calculation / explanation text.
 * @param {object} payload
 * @param {{ questionText?: string, tableHtml?: string, choices?: string[] }} context
 */
export function scoreNumberUsage(payload = {}, context = {}) {
  const corpus = [
    context.questionText || '',
    String(context.tableHtml || '').replace(/<[^>]+>/g, ' '),
    ...(Array.isArray(context.choices) ? context.choices : []),
  ].join(' ');
  const numbers = extractProblemNumbers(corpus);
  if (!numbers.length) {
    return { used: [], missing: [], ratio: 1, penalty: 0 };
  }
  const calcText = [
    ...(payload.calculation || []),
    ...(payload.whyAnswer || []),
    payload.summary || '',
  ].join(' ');
  const used = [];
  const missing = [];
  numbers.forEach((n) => {
    const re = new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (re.test(calcText.replace(/,/g, ''))) used.push(n);
    else missing.push(n);
  });
  const ratio = used.length / numbers.length;
  const penalty = missing.length ? Math.min(40, missing.length * 8) : 0;
  return { used, missing, ratio, penalty, total: numbers.length };
}

/**
 * Full Human-Level validation.
 * @param {object|null} payload
 * @param {{ questionText?: string, tableHtml?: string, choices?: string[] }} [context]
 */
export function validateHumanExplanation(payload, context = {}) {
  const present = [];
  const missing = [];
  REQUIRED_KEYS.forEach((key) => {
    if (isEmptyValue(key, payload?.[key])) missing.push(key);
    else present.push(key);
  });

  const calcCount = Array.isArray(payload?.calculation)
    ? payload.calculation.filter((v) => String(v ?? '').trim()).length
    : 0;
  const calcOk = calcCount >= 5;
  if (!calcOk && !missing.includes('calculation')) missing.push('calculation');

  const numberUsage = scoreNumberUsage(payload || {}, context);
  let confidence = Number(payload?.confidence);
  if (!Number.isFinite(confidence)) confidence = 70;
  confidence = Math.max(0, Math.min(100, confidence - numberUsage.penalty));

  const checks = {
    thinkingOrder: !isEmptyValue('thinkingOrder', payload?.thinkingOrder),
    calculationMin5: calcOk,
    summary: !isEmptyValue('summary', payload?.summary),
    formula: !isEmptyValue('formula', payload?.formula),
    examTip: !isEmptyValue('examTip', payload?.examTip),
    memoryHack: !isEmptyValue('memoryHack', payload?.memoryHack),
    whyOthersWrong: !isEmptyValue('whyOthersWrong', payload?.whyOthersWrong),
    whyAnswer: !isEmptyValue('whyAnswer', payload?.whyAnswer),
  };

  const score = Math.round((present.length / REQUIRED_KEYS.length) * 100);
  const ok = missing.length === 0 && calcOk;

  return {
    ok,
    missing,
    present,
    score,
    calcCount,
    checks,
    numberUsage,
    confidence,
    report: {
      schemaVersion: '17C',
      checkedAt: new Date().toISOString(),
      present,
      missing,
      missingCount: missing.length,
      score,
      ok,
      calcCount,
      checks,
      numberUsage,
      confidence,
    },
  };
}

/**
 * Quality checker entry used by orchestrator (17C).
 */
export function checkGeminiQuality(payload, context = {}) {
  return validateHumanExplanation(payload, context);
}

export function qualityLabels() {
  return {
    summary: 'summary',
    thinkingOrder: 'thinkingOrder',
    calculation: 'calculation',
    whyAnswer: 'whyAnswer',
    whyOthersWrong: 'whyOthersWrong',
    formula: 'formula',
    memoryHack: 'memoryHack',
    examTip: 'examTip',
  };
}

export default {
  validateHumanExplanation,
  checkGeminiQuality,
  scoreNumberUsage,
  extractProblemNumbers,
  qualityLabels,
};
