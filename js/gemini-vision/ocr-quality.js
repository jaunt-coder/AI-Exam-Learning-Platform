/**
 * Sprint-17B — OCR Quality Engine
 * Score 0~100. Threshold (default 70) decides OCR vs Vision.
 */

import { clamp, DEFAULT_OCR_THRESHOLD } from './vision-utils.js';
import { loadVisionConfig } from './vision-storage.js';

/**
 * @param {object} question — resolved / OCR question
 * @returns {{
 *   score: number,
 *   deductions: object[],
 *   useOcr: boolean,
 *   useVision: boolean,
 *   threshold: number,
 * }}
 */
export function scoreOcrQuality(question = {}) {
  const config = loadVisionConfig();
  const threshold = Number(config.ocrThreshold) || DEFAULT_OCR_THRESHOLD;

  let score = 100;
  const deductions = [];

  const stem = String(
    question.question || question.originalQuestion || question.stem || '',
  );
  const original = String(question.originalQuestion || '');
  const table = question.table ?? question.tableHtml ?? null;
  const choices = Array.isArray(question.choices) ? question.choices : [];

  /* Line-break / spacing OCR noise */
  if (/[가-힣]\s+[가-힣]/.test(stem) && (stem.match(/[가-힣]\s+[가-힣]/g) || []).length >= 3) {
    score -= 15;
    deductions.push({ code: 'LINEBREAK_NOISE', delta: -15, label: '줄바꿈 오류' });
  }
  if (/종합원\s*가|단위완성\s*도|기말재\s*고/.test(stem + original)) {
    score -= 15;
    deductions.push({ code: 'SPLIT_TERM', delta: -15, label: '용어 분리 OCR' });
  }

  /* Table missing when process-cost / inventory numbers suggest table */
  const processLike =
    /기초재공|당기투입|완성품환산|종합원가|기초재고|매입|기말재고|단가/.test(
      (stem + original).replace(/\s+/g, ''),
    );
  const hasTable =
    (typeof table === 'string' && (table.includes('<table') || table.includes('|')))
    || (table && typeof table === 'object')
    || Boolean(question.hasTable);
  if (processLike && !hasTable) {
    score -= 25;
    deductions.push({ code: 'MISSING_TABLE', delta: -25, label: '표 없음' });
  }

  /* Markdown table instead of HTML (Vision will normalize) — mild */
  if (typeof table === 'string' && /^\|/.test(table.trim()) && !/<table/i.test(table)) {
    score -= 10;
    deductions.push({ code: 'MARKDOWN_TABLE', delta: -10, label: 'Markdown 표' });
  }

  /* Choices */
  const filled = choices.filter((c) => String(c ?? '').trim()).length;
  if (filled < 5) {
    score -= 20;
    deductions.push({ code: 'CHOICES_SHORT', delta: -20, label: '보기 개수 부족' });
  }

  /* Broken formula / garbage glyphs */
  if (/[�¿]|\{\s*\}|\\mathrm\{\s*\}/.test(stem + original)) {
    score -= 10;
    deductions.push({ code: 'FORMULA_BROKEN', delta: -10, label: '수식 깨짐' });
  }

  /* Empty stem */
  if (!stem.trim()) {
    score -= 40;
    deductions.push({ code: 'EMPTY_STEM', delta: -40, label: '지문 없음' });
  }

  score = clamp(score, 0, 100);
  const useOcr = score >= threshold;
  return {
    score,
    deductions,
    useOcr,
    useVision: !useOcr,
    threshold,
  };
}

export function getOcrThreshold() {
  return Number(loadVisionConfig().ocrThreshold) || DEFAULT_OCR_THRESHOLD;
}

export default {
  scoreOcrQuality,
  getOcrThreshold,
};
