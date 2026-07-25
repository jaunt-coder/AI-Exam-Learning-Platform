/**
 * Sprint-09K — deterministic mastery runtime tests (Node mock LocalStorage).
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const store = new Map();
globalThis.localStorage = {
  getItem(key) {
    return store.has(key) ? store.get(key) : null;
  },
  setItem(key, value) {
    store.set(key, String(value));
  },
  removeItem(key) {
    store.delete(key);
  },
};

const {
  computeMasteryLevel,
  recordAttempt,
  loadMasteryState,
  updatePatternMastery,
  createEmptyPatternMastery,
  MASTERY_STORE_KEY,
} = await import('../js/mastery-service.js');

function reset() {
  store.clear();
}

/* Unit: level rules */
assert.equal(computeMasteryLevel(0, null), 'UNKNOWN');
assert.equal(computeMasteryLevel(1, 1), 'LEARNING');
assert.equal(computeMasteryLevel(2, 0), 'LEARNING');
assert.equal(computeMasteryLevel(5, 0.8), 'MASTERED');
assert.equal(computeMasteryLevel(5, 0.4), 'RETRY_REQUIRED');
assert.equal(computeMasteryLevel(4, 0.75), 'DEVELOPING');

/* Case 1: Attempt 1 → LEARNING */
reset();
let r = recordAttempt({
  studentId: 'test',
  questionId: 'ACC_2018_Q042',
  patternId: 'ACC_INV_001',
  correct: true,
  timestamp: '2026-07-26T00:00:01.000Z',
});
assert.equal(r.ok, true);
assert.equal(r.beforeLevel, 'UNKNOWN');
assert.equal(r.afterLevel, 'LEARNING');
assert.equal(r.entry.attempts, 1);

/* Case 2: 5 attempts / 4 correct → MASTERED */
reset();
let entry = createEmptyPatternMastery('test', 'COST_CVP_001');
const results = [true, true, true, true, false];
for (const correct of results) {
  entry = updatePatternMastery(entry, {
    correct,
    timestamp: '2026-07-26T00:00:02.000Z',
  });
}
assert.equal(entry.attempts, 5);
assert.equal(entry.correctCount, 4);
assert.equal(entry.accuracy, 0.8);
assert.equal(entry.masteryLevel, 'MASTERED');

/* Case 3: 5 attempts / 2 correct → RETRY_REQUIRED */
reset();
entry = createEmptyPatternMastery('test', 'ACC_GEN_001');
for (const correct of [true, true, false, false, false]) {
  entry = updatePatternMastery(entry, {
    correct,
    timestamp: '2026-07-26T00:00:03.000Z',
  });
}
assert.equal(entry.attempts, 5);
assert.equal(entry.correctCount, 2);
assert.equal(entry.accuracy, 0.4);
assert.equal(entry.masteryLevel, 'RETRY_REQUIRED');

/* Persistence */
reset();
recordAttempt({
  studentId: 'test',
  questionId: 'Q1',
  patternId: 'ACC_INV_001',
  correct: false,
});
const persisted = loadMasteryState();
assert.equal(persisted.version, 'v1');
assert.equal(persisted.patterns.length, 1);
assert.equal(store.has(MASTERY_STORE_KEY), true);

/* question-db must remain untouched — smoke via require path existence only */
const require = createRequire(import.meta.url);
const qdb = require('../data/question-db-mvp.json');
assert.equal(qdb.questions.length, 240);

console.log('Sprint-09K mastery runtime tests: PASS');
