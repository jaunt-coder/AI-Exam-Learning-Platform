/**
 * Sprint-13B — Extended Mastery Engine
 * Wraps 09K mastery-service and adds question/chapter-level mastery + scoring.
 * Read-only on Question/Pattern DB.
 */

import {
  loadMasteryState,
  getPatternMastery,
  recordAttempt as recordMasteryAttempt,
} from '../mastery-service.js';
import { getOverride } from '../reviewer/override-service.js';
import { loadProgressDoc, saveProgressDoc } from './learning-storage.js';

/**
 * Compute 0–100 mastery score for a question.
 */
export function computeQuestionMastery(questionId, patternId) {
  const prog = loadProgressDoc();
  const qData = prog.byQuestion[questionId];
  if (!qData) return { questionId, patternId, score: 0, attempts: 0, accuracy: 0 };
  const total = (qData.correct || 0) + (qData.incorrect || 0);
  const accuracy = total > 0 ? qData.correct / total : 0;
  const recencyBonus = recentBonus(qData.lastAttemptAt);
  const repeatFactor = Math.min(total / 5, 1);
  const overrideBonus = getOverride(questionId) ? 5 : 0;
  const score = Math.round(
    Math.min(100, accuracy * 60 + recencyBonus * 15 + repeatFactor * 15 + overrideBonus + (qData.reviewStage || 0)),
  );
  return { questionId, patternId, score, attempts: total, accuracy: Math.round(accuracy * 100) / 100 };
}

/**
 * Compute 0–100 mastery for a pattern (average of question mastery).
 */
export function computePatternMastery(patternId, questionIds = []) {
  if (!questionIds.length) return { patternId, score: 0, questionCount: 0 };
  const scores = questionIds.map((qid) => computeQuestionMastery(qid, patternId).score);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const pm = getPatternMastery('m1_demo_student', patternId);
  const runtimeBonus = pm ? (pm.accuracy || 0) * 10 : 0;
  return {
    patternId,
    score: Math.round(Math.min(100, avg + runtimeBonus)),
    questionCount: questionIds.length,
    masteryLevel: pm?.masteryLevel || 'UNKNOWN',
  };
}

/**
 * Compute chapter mastery (average of pattern mastery).
 */
export function computeChapterMastery(chapterId, patternScores = []) {
  if (!patternScores.length) return { chapterId, score: 0 };
  const avg = patternScores.reduce((a, b) => a + b.score, 0) / patternScores.length;
  return { chapterId, score: Math.round(avg) };
}

/**
 * Record a question attempt into learning-engine progress.
 */
export function recordQuestionAttempt({ questionId, patternId, chapterId, correct, durationMs }) {
  const doc = loadProgressDoc();
  const now = new Date().toISOString();
  const q = doc.byQuestion[questionId] || { correct: 0, incorrect: 0, attempts: 0, lastAttemptAt: null };
  q.attempts = (q.attempts || 0) + 1;
  if (correct) q.correct = (q.correct || 0) + 1;
  else q.incorrect = (q.incorrect || 0) + 1;
  q.lastAttemptAt = now;
  if (durationMs) q.lastDurationMs = durationMs;
  doc.byQuestion[questionId] = q;

  const p = doc.byPattern[patternId] || { correct: 0, incorrect: 0, attempts: 0 };
  p.attempts = (p.attempts || 0) + 1;
  if (correct) p.correct = (p.correct || 0) + 1;
  else p.incorrect = (p.incorrect || 0) + 1;
  p.lastAttemptAt = now;
  doc.byPattern[patternId] = p;

  if (chapterId) {
    const c = doc.byChapter[chapterId] || { correct: 0, incorrect: 0, attempts: 0 };
    c.attempts = (c.attempts || 0) + 1;
    if (correct) c.correct = (c.correct || 0) + 1;
    else c.incorrect = (c.incorrect || 0) + 1;
    doc.byChapter[chapterId] = c;
  }

  const today = now.slice(0, 10);
  const dayIdx = doc.daily.findIndex((d) => d.date === today);
  if (dayIdx >= 0) {
    doc.daily[dayIdx].attempts += 1;
    if (correct) doc.daily[dayIdx].correct += 1;
  } else {
    doc.daily.push({ date: today, attempts: 1, correct: correct ? 1 : 0 });
    if (doc.daily.length > 90) doc.daily = doc.daily.slice(-90);
  }

  saveProgressDoc(doc);

  recordMasteryAttempt({ questionId, patternId, correct, timestamp: now });

  return computeQuestionMastery(questionId, patternId);
}

/**
 * Build mastery heatmap data for all tracked patterns.
 */
export function buildMasteryHeatmap(questionsByPattern = {}) {
  const results = [];
  for (const [patternId, qids] of Object.entries(questionsByPattern)) {
    const pm = computePatternMastery(patternId, qids);
    results.push(pm);
  }
  return results.sort((a, b) => a.score - b.score);
}

/**
 * Get learning progress summary.
 */
export function getProgressSummary() {
  const doc = loadProgressDoc();
  const qids = Object.keys(doc.byQuestion);
  const totalAttempts = qids.reduce((s, k) => s + (doc.byQuestion[k].attempts || 0), 0);
  const totalCorrect = qids.reduce((s, k) => s + (doc.byQuestion[k].correct || 0), 0);
  return {
    totalQuestions: qids.length,
    totalAttempts,
    totalCorrect,
    accuracy: totalAttempts ? Math.round((totalCorrect / totalAttempts) * 100) / 100 : 0,
    daily: doc.daily.slice(-30),
    patternCount: Object.keys(doc.byPattern).length,
  };
}

function recentBonus(isoDate) {
  if (!isoDate) return 0;
  const days = (Date.now() - Date.parse(isoDate)) / 86400000;
  if (days < 1) return 1;
  if (days < 3) return 0.8;
  if (days < 7) return 0.5;
  if (days < 14) return 0.3;
  return 0;
}

export default {
  computeQuestionMastery,
  computePatternMastery,
  computeChapterMastery,
  recordQuestionAttempt,
  buildMasteryHeatmap,
  getProgressSummary,
};
