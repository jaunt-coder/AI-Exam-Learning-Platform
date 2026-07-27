/**
 * Sprint-13B — Learning Analyzer
 * Analyzes student learning patterns for dashboard display.
 */

import { getProgressSummary, buildMasteryHeatmap, computePatternMastery } from './mastery-engine.js';
import { getReviewSummary, getDueReviews } from './review-engine.js';
import { loadWeaknessState } from '../weakness-service.js';
import { loadRecommendations } from '../recommendation-service.js';

/**
 * Build full learning analysis for dashboard.
 * @param {object[]} questions
 * @param {object[]} patterns
 */
export function analyzeLearning(questions = [], patterns = []) {
  const progress = getProgressSummary();
  const reviewSummary = getReviewSummary();
  const dueReviews = getDueReviews();
  const weakState = loadWeaknessState();
  const recDoc = loadRecommendations();

  const questionsByPattern = {};
  for (const q of questions) {
    const pid = q.patternId;
    if (!questionsByPattern[pid]) questionsByPattern[pid] = [];
    questionsByPattern[pid].push(q.questionId);
  }

  const heatmap = buildMasteryHeatmap(questionsByPattern);
  const weakPatterns = (weakState.patterns || [])
    .filter((p) => (p.activeSignals || p.signals || []).length > 0)
    .map((p) => ({
      patternId: p.patternId,
      signals: p.activeSignals || p.signals || [],
      mastery: computePatternMastery(p.patternId, questionsByPattern[p.patternId] || []),
    }))
    .sort((a, b) => a.mastery.score - b.mastery.score);

  const recentGrowth = computeRecentGrowth(progress.daily);

  const activeRecs = (recDoc.recommendations || []).filter((r) => r.status === 'ACTIVE');
  const todaysRecommendations = activeRecs.slice(0, 10);

  return {
    schemaVersion: 'v1',
    sprint: 'Sprint-13B',
    generatedAt: new Date().toISOString(),
    progress,
    review: {
      ...reviewSummary,
      todaysDue: dueReviews.slice(0, 20),
    },
    weakPatterns,
    heatmap,
    recommendations: todaysRecommendations,
    recentGrowth,
  };
}

function computeRecentGrowth(daily = []) {
  const last7 = daily.slice(-7);
  const prev7 = daily.slice(-14, -7);
  const avg = (arr) => {
    if (!arr.length) return 0;
    const total = arr.reduce((s, d) => s + (d.correct || 0), 0);
    const attempts = arr.reduce((s, d) => s + (d.attempts || 0), 0);
    return attempts ? Math.round((total / attempts) * 100) / 100 : 0;
  };
  const current = avg(last7);
  const previous = avg(prev7);
  return {
    currentAccuracy: current,
    previousAccuracy: previous,
    growth: Math.round((current - previous) * 100) / 100,
    trend: current > previous ? 'UP' : current < previous ? 'DOWN' : 'FLAT',
    last7Days: last7,
  };
}

export default { analyzeLearning };
