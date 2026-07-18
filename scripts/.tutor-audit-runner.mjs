import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { generateQuestionTutorContent } from '../js/ai-tutor-engine.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');
const payload = JSON.parse(read('data/question-db-mvp.json'));
const patterns = JSON.parse(read('data/pattern-db-mvp.json'));
const questions = payload.questions || payload;
const patternMap = Object.fromEntries(patterns.map((p) => [p.patternId, p]));
const byPattern = {};
for (const q of questions) {
  (byPattern[q.patternId] ||= []).push(q);
}

const samples = [];
for (const [patternId, items] of Object.entries(byPattern)) {
  for (const q of items.slice(0, 3)) {
    const pattern = patternMap[patternId] || null;
    const content = generateQuestionTutorContent(q, pattern);
    const wrongKeys = content.wrongAnswerAnalysis
      ? Object.keys(content.wrongAnswerAnalysis).length
      : 0;
    samples.push({
      questionId: q.questionId,
      patternId,
      patternName: pattern?.name || patternId,
      hasExplanation: Boolean(String(content.explanation || '').trim()),
      hasSolvingAlgorithm: Array.isArray(content.solvingAlgorithm)
        && content.solvingAlgorithm.length > 0,
      hasWrongAnswerAnalysis: wrongKeys >= 4,
      wrongAnalysisCount: wrongKeys,
      hasMemoryTip: Boolean(String(content.memoryTip || '').trim()),
      profileSource: content._meta?.hasOverride ? 'override' : 'profile_or_fallback',
      resolvable: Boolean(content._meta?.resolvable),
    });
  }
}

const outPath = join(root, 'data', 'analysis', 'tutor-audit-cache.json');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(samples, null, 2));