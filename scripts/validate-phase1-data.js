/**
 * MVP Phase 1 Data Validation Script
 * Usage: node scripts/validate-phase1-data.js
 * Fallback: PowerShell validation in CI/manual
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

let passed = 0;
let failed = 0;

function pass(msg) {
  console.log(`  PASS: ${msg}`);
  passed++;
}

function fail(msg) {
  console.error(`  FAIL: ${msg}`);
  failed++;
}

function loadJSON(relPath) {
  const full = join(ROOT, relPath);
  if (!existsSync(full)) throw new Error(`Missing: ${relPath}`);
  return JSON.parse(readFileSync(full, 'utf-8'));
}

console.log('\n=== MVP Phase 1 Data Validation ===\n');

const requiredFiles = [
  'data/master-db.json',
  'data/pattern-db.json',
  'data/question-db.json',
  'data/statistics.json',
  'docs/exam-analysis.md',
  'docs/pattern-db.md',
  'docs/statistics.md',
  'source/past-exams/README.md'
];

console.log('[1] Required Files');
for (const f of requiredFiles) {
  existsSync(join(ROOT, f)) ? pass(f) : fail(`Missing: ${f}`);
}

console.log('\n[2] Master DB');
try {
  const master = loadJSON('data/master-db.json');
  if (master.version === '1.0') pass('master-db version 1.0');
  else fail(`master-db version: ${master.version}`);
  if (master.exam?.examId === 'APPRAISER') pass('examId APPRAISER');
  else fail('examId missing');
  if (master.chapters?.length >= 1) pass(`chapters: ${master.chapters.length}`);
  else fail('no chapters');
  if (master.summary?.totalPatterns >= 1) pass(`summary.totalPatterns = ${master.summary.totalPatterns}`);
  else fail(`totalPatterns: ${master.summary?.totalPatterns}`);
  if (master.metadata?.pdfVerified === true) pass('metadata.pdfVerified');
  else fail('metadata.pdfVerified not true');
} catch (e) {
  fail(e.message);
}

console.log('\n[3] Pattern DB');
try {
  const patterns = loadJSON('data/pattern-db.json');
  if (!Array.isArray(patterns)) { fail('pattern-db not array'); }
  else {
    pass(`patterns count: ${patterns.length}`);
    const ids = new Set();
    for (const p of patterns) {
      if (ids.has(p.patternId)) fail(`duplicate patternId: ${p.patternId}`);
      ids.add(p.patternId);
      const req = ['patternId', 'chapterId', 'grade', 'frequency', 'years'];
      for (const f of req) {
        if (p[f] !== undefined && p[f] !== null) pass(`${p.patternId}.${f}`);
        else fail(`${p.patternId} missing ${f}`);
      }
    }
  }
} catch (e) {
  fail(e.message);
}

console.log('\n[4] Question DB');
try {
  const questions = loadJSON('data/question-db.json');
  const patterns = loadJSON('data/pattern-db.json');
  const patternIds = new Set(patterns.map(p => p.patternId));

  if (!Array.isArray(questions)) fail('question-db not array');
  else {
    pass(`questions count: ${questions.length}`);
    for (const q of questions) {
      const req = ['questionId', 'patternId', 'answer', 'question', 'choices', 'solution', 'originalQuestion'];
      for (const f of req) {
        if (q[f] !== undefined && q[f] !== null) pass(`${q.questionId}.${f}`);
        else fail(`${q.questionId} missing ${f}`);
      }
      if (q.source?.type === 'past_exam') pass(`${q.questionId}.source.type past_exam`);
      else fail(`${q.questionId} source.type not past_exam`);
      if (q.source?.page) pass(`${q.questionId}.source.page`);
      else fail(`${q.questionId} missing source.page`);
      if (q.source?.year === q.year) pass(`${q.questionId} year match`);
      else fail(`${q.questionId} year mismatch source=${q.source?.year} q=${q.year}`);
      if (patternIds.has(q.patternId)) pass(`${q.questionId} → ${q.patternId}`);
      else fail(`${q.questionId} invalid patternId: ${q.patternId}`);
      if (q.source?.sourceFile) pass(`${q.questionId}.source`);
      else fail(`${q.questionId} missing source`);
      if (q.solution?.algorithm && q.solution?.explanation) pass(`${q.questionId}.solution complete`);
      else fail(`${q.questionId} incomplete solution`);
    }
  }
} catch (e) {
  fail(e.message);
}

console.log('\n[5] Statistics DB');
try {
  const stats = loadJSON('data/statistics.json');
  const patterns = loadJSON('data/pattern-db.json');
  if (stats.length !== patterns.length) fail(`stats count ${stats.length} != patterns ${patterns.length}`);
  else pass(`statistics count: ${stats.length}`);
  for (const s of stats) {
    if (s.patternId && s.totalCount >= 0 && s.priority) pass(`${s.patternId} statistics`);
    else fail(`${s.patternId} incomplete statistics`);
  }
} catch (e) {
  fail(e.message);
}

console.log('\n[6] Pattern-Question Cross Reference');
try {
  const patterns = loadJSON('data/pattern-db.json');
  const questions = loadJSON('data/question-db.json');
  for (const p of patterns) {
    const linked = questions.filter(q => q.patternId === p.patternId);
    if (linked.length > 0) pass(`${p.patternId}: ${linked.length} questions`);
    else fail(`${p.patternId}: no questions`);
  }
} catch (e) {
  fail(e.message);
}

console.log(`\n=== Result: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
