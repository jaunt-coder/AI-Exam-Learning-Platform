/**
 * Sprint-13B — Learning Engine (Orchestrator)
 * Integrates Mastery + Recommendation + Review + Scheduler + Analyzer.
 * Question DB read-only. Override/Reviewer/Student Resolver not modified.
 */

import {
  recordQuestionAttempt,
  computeQuestionMastery,
  computePatternMastery,
  computeChapterMastery,
  buildMasteryHeatmap,
  getProgressSummary,
} from './mastery-engine.js';
import {
  updateReviewCycle,
  getDueReviews,
  getUpcomingReviews,
  getReviewSummary,
} from './review-engine.js';
import {
  buildLearningRecommendations,
  getNextRecommendedQuestions,
} from './recommendation-engine.js';
import { analyzeLearning } from './learning-analyzer.js';
import { buildTodaySchedule, getTodaySchedule } from './scheduler.js';
import { recordWeaknessDiagnosis } from '../weakness-service.js';
import { getPatternMastery } from '../mastery-service.js';

/**
 * Called after student submits an answer.
 * Updates mastery, review cycle, weakness, recommendations.
 * Learning Engine 계산식은 변경하지 않는다. subjectId는 전달만 한다 (Sprint-19A).
 * @param {object} params
 * @param {object[]} [allQuestions] — for recommendation rebuild
 */
export function onQuestionAnswered(params, allQuestions = []) {
  const { questionId, patternId, chapterId, correct, durationMs, subjectId } = params;

  const mastery = recordQuestionAttempt({
    questionId, patternId, chapterId, correct, durationMs,
  });

  const reviewEntry = updateReviewCycle(questionId, correct);

  const patternMastery = getPatternMastery('m1_demo_student', patternId);
  let weakness = null;
  if (patternMastery) {
    const result = recordWeaknessDiagnosis({
      patternMastery,
      lastCorrect: correct,
      durationMs,
    });
    weakness = result.ok ? result.diagnosis : null;
  }

  let recommendations = null;
  if (allQuestions.length) {
    recommendations = buildLearningRecommendations(allQuestions);
  }

  return {
    ok: true,
    mastery,
    reviewEntry,
    weakness,
    recommendations: recommendations?.summary || null,
    subjectId: subjectId || null,
  };
}

/**
 * Called after exam finishes. Generates weak pattern analysis.
 * @param {object} examAnalysis
 * @param {object[]} allQuestions
 */
export function onExamComplete(examAnalysis, allQuestions = []) {
  const weakPatterns = (examAnalysis?.weakPatterns || []).map((wp) => {
    const pid = wp.patternId;
    const qids = allQuestions.filter((q) => q.patternId === pid).map((q) => q.questionId);
    return {
      patternId: pid,
      mastery: computePatternMastery(pid, qids),
      reason: wp.reason || 'Exam weak pattern',
    };
  });

  if (allQuestions.length) {
    buildLearningRecommendations(allQuestions);
  }

  return { ok: true, weakPatterns };
}

/**
 * Build full dashboard data.
 */
export function buildLearningDashboard(questions = [], patterns = []) {
  const analysis = analyzeLearning(questions, patterns);
  const schedule = getTodaySchedule();

  return {
    ...analysis,
    schedule,
  };
}

/**
 * Get data for Tutor prompt enrichment.
 */
export function getTutorContext(questionId, patternId) {
  const mastery = computeQuestionMastery(questionId, patternId);
  const patternScore = computePatternMastery(patternId, [questionId]);
  const review = getDueReviews().find((r) => r.questionId === questionId) || null;
  const nextRecs = getNextRecommendedQuestions(3);
  const progress = getProgressSummary();

  return {
    mastery,
    patternMastery: patternScore,
    reviewStage: review,
    nextRecommendations: nextRecs,
    weakPatterns: [],
    progress: {
      totalAttempts: progress.totalAttempts,
      accuracy: progress.accuracy,
    },
  };
}

export {
  computeQuestionMastery,
  computePatternMastery,
  computeChapterMastery,
  buildMasteryHeatmap,
  getProgressSummary,
  updateReviewCycle,
  getDueReviews,
  getUpcomingReviews,
  getReviewSummary,
  buildLearningRecommendations,
  getNextRecommendedQuestions,
  analyzeLearning,
  buildTodaySchedule,
  getTodaySchedule,
};

export default {
  onQuestionAnswered,
  onExamComplete,
  buildLearningDashboard,
  getTutorContext,
};
