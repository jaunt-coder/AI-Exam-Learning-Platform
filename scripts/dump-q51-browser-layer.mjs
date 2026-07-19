import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { cleanQuestionForDisplay } from '../js/data-cleaner.js';

const root = dirname(fileURLToPath(import.meta.url));
const payload = JSON.parse(
  readFileSync(join(root, '../data/question-db-mvp.json'), 'utf8'),
);
const questions = Array.isArray(payload) ? payload : payload.questions;
const q = questions.find((item) => item.questionId === 'ACC_2015_Q051');
const cleaned = cleanQuestionForDisplay(q);

function normalizeCompareText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function getContextText(question) {
  const stem = normalizeCompareText(question.question || '');
  let original = normalizeCompareText(question.originalQuestion || '');
  const table = question.table ? String(question.table).trim() : '';
  if (table && original.includes(normalizeCompareText(table))) {
    original = original.replace(normalizeCompareText(table), '').trim();
  }
  if (!original || original === stem) return '';
  const ctx = original.includes(stem) ? original.replace(stem, '').trim() : original;
  if (!ctx || ctx.length < 20) return '';
  if (/^\|.+\|$/m.test(ctx) && !ctx.replace(/\|.+\|/g, '').trim()) return '';
  return ctx.length > 1200 ? `${ctx.slice(0, 1200)}…` : ctx;
}

const ctx = getContextText(cleaned);
const lines = [
  'LAYER 4 — Browser (after cleanQuestionForDisplay + renderSolveView logic)',
  '='.repeat(72),
  '',
  '[#question-stem textContent]',
  cleaned.question,
  '',
  '[#question-context textContent — getContextText()]',
  ctx || '(hidden — empty)',
  '',
  '[#question-table innerHTML text equivalent]',
  cleaned.table || '(none)',
  '',
  '[#choices-list .choice-text × 5]',
  ...cleaned.choices.map((c, i) => `${i + 1}. ${c}`),
];

writeFileSync(join(root, '../data/analysis/q51-browser-layer.txt'), lines.join('\n'), 'utf8');
console.log('Wrote data/analysis/q51-browser-layer.txt');
