/**
 * Display Cleanup metrics runner (Node.js)
 * JS data-cleaner와 동일 로직으로 Before/After readability 측정
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  applyQuestionCleanup,
  cleanDisplayText,
  measureReadability,
} from '../js/data-cleaner.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const QUESTION_DB = join(ROOT, 'data', 'question-db-mvp.json');
const OUTPUT_JSON = join(ROOT, 'data', 'analysis', 'display-cleanup-metrics.json');

function loadQuestions() {
  const payload = JSON.parse(readFileSync(QUESTION_DB, 'utf-8'));
  return Array.isArray(payload) ? payload : payload.questions || [];
}

function questionText(question) {
  return [
    question.question || '',
    question.originalQuestion || '',
    ...(question.choices || []),
    question.table || '',
  ].join('\n');
}

function aggregateMetrics(questions) {
  let longestGlued = 0;
  let gluedQuestions = 0;
  let totalSpaceRatio = 0;
  let unformattedNumbers = 0;
  let fields = 0;

  for (const question of questions) {
    const parts = [
      question.question,
      question.originalQuestion,
      ...(question.choices || []),
      question.table,
    ].filter(Boolean);

    let questionGlued = 0;
    for (const part of parts) {
      const metrics = measureReadability(part);
      longestGlued = Math.max(longestGlued, metrics.longestGlued);
      questionGlued = Math.max(questionGlued, metrics.longestGlued);
      totalSpaceRatio += metrics.spaceRatio;
      unformattedNumbers += metrics.unformattedNumbers;
      fields += 1;
    }
    if (questionGlued >= 12) {
      gluedQuestions += 1;
    }
  }

  return {
    longestGlued,
    gluedQuestions,
    avgSpaceRatio: fields > 0 ? totalSpaceRatio / fields : 0,
    unformattedNumbers,
    fields,
  };
}

function truncate(text, limit = 140) {
  const compact = String(text || '').replace(/\s+/g, ' ').trim();
  if (compact.length <= limit) return compact;
  return `${compact.slice(0, limit - 1)}…`;
}

function pickSamples(raw, cleaned) {
  const samples = [];
  const seen = new Set();

  const add = (rawQ, cleanQ, reason) => {
    if (seen.has(rawQ.questionId) || samples.length >= 20) return;
    seen.add(rawQ.questionId);
    samples.push({
      questionId: rawQ.questionId,
      reason,
      beforeQuestion: truncate(rawQ.question),
      afterQuestion: truncate(cleanQ.question),
      beforeMetrics: measureReadability(rawQ.question),
      afterMetrics: measureReadability(cleanQ.question),
    });
  };

  for (const [rawQ, cleanQ] of raw.map((q, i) => [q, cleaned[i]])) {
    const before = measureReadability(rawQ.question);
    const after = measureReadability(cleanQ.question);
    if (before.longestGlued >= 12 && after.longestGlued < before.longestGlued) {
      add(rawQ, cleanQ, 'glued hangul improved');
    }
  }

  for (const [rawQ, cleanQ] of raw.map((q, i) => [q, cleaned[i]])) {
    const before = measureReadability(rawQ.question);
    const after = measureReadability(cleanQ.question);
    if (before.unformattedNumbers > after.unformattedNumbers) {
      add(rawQ, cleanQ, 'number formatting');
    }
  }

  for (const [rawQ, cleanQ] of raw.map((q, i) => [q, cleaned[i]])) {
    if (rawQ.question !== cleanQ.question) {
      add(rawQ, cleanQ, 'term spacing');
    }
  }

  return samples.slice(0, 20);
}

function demoFormatting() {
  return {
    termSpacing: {
      before: '기말재고자산',
      after: cleanDisplayText('기말재고자산', { field: 'question' }),
    },
    numberFormatting: {
      before: '10000원, W1000000',
      after: cleanDisplayText('10000원, W1000000', { field: 'question' }),
    },
  };
}

const raw = loadQuestions();
const cleaned = applyQuestionCleanup(raw);
const before = aggregateMetrics(raw);
const after = aggregateMetrics(cleaned);

const report = {
  generatedAt: new Date().toISOString().slice(0, 10),
  questionCount: raw.length,
  dbPath: 'data/question-db-mvp.json',
  dbModified: false,
  before,
  after,
  improvement: {
    gluedQuestionsReduction:
      before.gluedQuestions > 0
        ? ((before.gluedQuestions - after.gluedQuestions) / before.gluedQuestions) * 100
        : 0,
    longestGluedReduction:
      before.longestGlued > 0
        ? ((before.longestGlued - after.longestGlued) / before.longestGlued) * 100
        : 0,
    spaceRatioIncrease:
      before.avgSpaceRatio > 0
        ? ((after.avgSpaceRatio - before.avgSpaceRatio) / before.avgSpaceRatio) * 100
        : after.avgSpaceRatio * 100,
    unformattedNumbersReduction:
      before.unformattedNumbers > 0
        ? ((before.unformattedNumbers - after.unformattedNumbers) / before.unformattedNumbers) * 100
        : 0,
  },
  demos: demoFormatting(),
  samples: pickSamples(raw, cleaned),
};

mkdirSync(dirname(OUTPUT_JSON), { recursive: true });
writeFileSync(OUTPUT_JSON, JSON.stringify(report, null, 2), 'utf-8');
console.log(JSON.stringify(report, null, 2));
