/**
 * Sprint-16A — Exam Readiness Score (Strategy Engine only)
 * Does NOT modify Learning Engine / Recommendation Engine formulas.
 *
 * Score 0–100 =
 *   Mastery 40% + Recent Accuracy 20% + Repeat Wrong 20%
 *   + Review Compliance 10% + Confidence 10%
 */

import {
  computePatternMastery,
  getProgressSummary,
} from '../learning-engine/mastery-engine.js';
import { getDueReviews, getReviewSummary } from '../learning-engine/review-engine.js';
import { loadMistakeProfile } from '../solution-engine/cache.js';
import { persistExamReadiness } from './strategy-storage.js';

function clamp(n, min = 0, max = 100) {
  const v = Number(n);
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
}

function groupQuestionsByPattern(questions = []) {
  const map = {};
  for (const q of questions) {
    const pid = q?.patternId;
    if (!pid) continue;
    if (!map[pid]) map[pid] = [];
    map[pid].push(q.questionId);
  }
  return map;
}

/**
 * Average pattern mastery 0–100 (reads existing LE mastery — no formula change).
 */
export function factorMastery(questions = []) {
  const byPattern = groupQuestionsByPattern(questions);
  const ids = Object.keys(byPattern);
  if (!ids.length) return { value: 0, detail: 'no-patterns' };
  const scores = ids.map((pid) => computePatternMastery(pid, byPattern[pid]).score);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return { value: clamp(avg), detail: `${ids.length} patterns` };
}

/**
 * Recent accuracy from progress daily/summary (read-only).
 */
export function factorRecentAccuracy() {
  const progress = getProgressSummary();
  const daily = Array.isArray(progress.daily) ? progress.daily.slice(-7) : [];
  let attempts = 0;
  let correct = 0;
  for (const d of daily) {
    attempts += Number(d.attempts) || 0;
    correct += Number(d.correct) || 0;
  }
  if (!attempts) {
    const acc = Number(progress.accuracy) || 0;
    return { value: clamp(acc * 100), detail: 'lifetime-accuracy' };
  }
  return {
    value: clamp((correct / attempts) * 100),
    detail: `last7d ${correct}/${attempts}`,
  };
}

/**
 * Repeat-wrong penalty inverted to 0–100 (higher = healthier).
 * Uses mistake profile totalWrong / byCode intensity — read only.
 */
export function factorRepeatWrongHealth() {
  const profile = loadMistakeProfile();
  const totalWrong = Number(profile.totalWrong) || 0;
  const codes = Object.values(profile.byCode || {});
  const repeatHeavy = codes.filter((c) => (Number(c.count) || 0) >= 3).length;
  /* More repeated mistakes → lower health score */
  const penalty = Math.min(80, totalWrong * 2 + repeatHeavy * 12);
  return {
    value: clamp(100 - penalty),
    detail: `wrong=${totalWrong}, repeatCodes=${repeatHeavy}`,
  };
}

/**
 * Review compliance: due reviews cleared vs scheduled.
 */
export function factorReviewCompliance() {
  const summary = getReviewSummary();
  const due = getDueReviews();
  const total = Number(summary?.totalTracked) || 0;
  const dueCount = due.length;
  if (!total && !dueCount) return { value: 70, detail: 'no-review-data' };
  const tracked = Math.max(total, dueCount, 1);
  const doneRatio = 1 - dueCount / tracked;
  return {
    value: clamp(doneRatio * 100),
    detail: `due=${dueCount}`,
  };
}

/**
 * Confidence proxy from diagnosis / mistake profile (not LE formula).
 */
export function factorConfidence() {
  const profile = loadMistakeProfile();
  const heatmap = Array.isArray(profile.heatmap) ? profile.heatmap : [];
  if (!heatmap.length) {
    const progress = getProgressSummary();
    const acc = Number(progress.accuracy) || 0;
    return { value: clamp(40 + acc * 50), detail: 'accuracy-proxy' };
  }
  const avgIntensity =
    heatmap.reduce((s, h) => s + (Number(h.intensity) || 0), 0) / heatmap.length;
  return {
    value: clamp(100 - avgIntensity * 70),
    detail: `mistake-intensity=${avgIntensity.toFixed(2)}`,
  };
}

/**
 * Compute Exam Readiness Score 0–100.
 * @param {{ questions?: object[] }} [input]
 */
export function computeExamReadinessScore(input = {}) {
  const questions = Array.isArray(input.questions) ? input.questions : [];

  const mastery = factorMastery(questions);
  const recent = factorRecentAccuracy();
  const repeat = factorRepeatWrongHealth();
  const review = factorReviewCompliance();
  const confidence = factorConfidence();

  const score = clamp(
    mastery.value * 0.4
      + recent.value * 0.2
      + repeat.value * 0.2
      + review.value * 0.1
      + confidence.value * 0.1,
  );

  const factors = {
    mastery: { weight: 0.4, value: mastery.value, detail: mastery.detail },
    recentAccuracy: { weight: 0.2, value: recent.value, detail: recent.detail },
    repeatWrong: { weight: 0.2, value: repeat.value, detail: repeat.detail },
    reviewCompliance: { weight: 0.1, value: review.value, detail: review.detail },
    confidence: { weight: 0.1, value: confidence.value, detail: confidence.detail },
  };

  const level =
    score >= 80 ? 'READY' : score >= 60 ? 'ON_TRACK' : score >= 40 ? 'AT_RISK' : 'CRITICAL';

  const passProbability = clamp(Math.round(score * 0.85 + (recent.value - 50) * 0.15));

  const result = {
    score: Math.round(score),
    passProbability,
    level,
    factors,
    weights: {
      mastery: 40,
      recentAccuracy: 20,
      repeatWrong: 20,
      reviewCompliance: 10,
      confidence: 10,
    },
    engine: 'exam-strategy/readiness-score',
    learningEngineFormulasUnchanged: true,
    generatedAt: new Date().toISOString(),
  };

  persistExamReadiness(result);
  return result;
}

export default {
  computeExamReadinessScore,
  factorMastery,
  factorRecentAccuracy,
  factorRepeatWrongHealth,
  factorReviewCompliance,
  factorConfidence,
};
