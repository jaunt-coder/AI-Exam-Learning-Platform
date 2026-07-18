/**
 * Phase 0 Foundation Validation Script
 * Usage: node scripts/validate-foundation.js
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const REQUIRED_PATHS = [
  'README.md',
  'index.html',
  'css/style.css',
  'js/app.js',
  'js/data-loader.js',
  'js/storage.js',
  'js/ui.js',
  'data/master/master-db.json',
  'data/generated/questions.json',
  'data/generated/patterns.json',
  'data/generated/statistics.json',
  'data/generated/roadmap.json',
  'data/source/exams',
  'data/source/pdf',
  'data/cache',
  'assets',
  'docs/00-platform-constitution.md',
  'docs/01-architecture-spec.md',
  'docs/02-database-spec.md',
  'docs/20-final-implementation-plan.md',
  '.cursor/rules/platform-constitution.mdc',
  '.cursor/rules/development-workflow.mdc'
];

const MASTER_DB_REQUIRED_FIELDS = [
  'version', 'exams', 'subjects', 'chapters',
  'patterns', 'questions', 'knowledge', 'statistics', 'predictions'
];

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

console.log('\n=== Phase 0 Foundation Validation ===\n');

console.log('[1] Folder & File Structure');
for (const relPath of REQUIRED_PATHS) {
  const fullPath = join(ROOT, relPath);
  if (existsSync(fullPath)) {
    pass(relPath);
  } else {
    fail(`Missing: ${relPath}`);
  }
}

console.log('\n[2] Master DB Schema');
try {
  const raw = readFileSync(join(ROOT, 'data/master/master-db.json'), 'utf-8');
  const db = JSON.parse(raw);

  if (db.version === '2.0') {
    pass('version = "2.0"');
  } else {
    fail(`version expected "2.0", got "${db.version}"`);
  }

  for (const field of MASTER_DB_REQUIRED_FIELDS) {
    if (field in db) {
      pass(`field "${field}" exists`);
    } else {
      fail(`field "${field}" missing`);
    }
  }

  const arrayFields = MASTER_DB_REQUIRED_FIELDS.filter(f => f !== 'version');
  for (const field of arrayFields) {
    if (Array.isArray(db[field])) {
      pass(`"${field}" is array`);
    } else {
      fail(`"${field}" is not array`);
    }
  }
} catch (error) {
  fail(`Master DB parse error: ${error.message}`);
}

console.log('\n[3] Generated JSON Validity');
const generatedFiles = ['questions.json', 'patterns.json', 'statistics.json', 'roadmap.json'];
for (const file of generatedFiles) {
  try {
    const raw = readFileSync(join(ROOT, 'data/generated', file), 'utf-8');
    JSON.parse(raw);
    pass(`data/generated/${file} valid JSON`);
  } catch (error) {
    fail(`data/generated/${file}: ${error.message}`);
  }
}

console.log('\n[4] HTML Semantic Check');
try {
  const html = readFileSync(join(ROOT, 'index.html'), 'utf-8');
  const requiredTags = ['<header', '<main', '<section', '<footer'];
  for (const tag of requiredTags) {
    if (html.includes(tag)) {
      pass(`index.html contains ${tag}`);
    } else {
      fail(`index.html missing ${tag}`);
    }
  }
  if (html.includes('lang="ko"')) pass('lang="ko" attribute');
  else fail('missing lang="ko"');
} catch (error) {
  fail(`HTML read error: ${error.message}`);
}

console.log(`\n=== Result: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
