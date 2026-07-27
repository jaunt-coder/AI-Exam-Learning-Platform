/**
 * Sprint-15B — Auto Learning Loop
 * Result 종료 시 Learning / Review / Recommendation / Dashboard / Evidence 갱신.
 * Learning Engine · Runtime 계산식은 호출만 하고 변경하지 않음.
 */

import {
  buildLearningRecommendations,
  getDueReviews,
  getReviewSummary,
  buildLearningDashboard,
  getNextRecommendedQuestions,
} from '../learning-engine/learning-engine.js';
import { buildStudentDashboardView } from '../dashboard/dashboard-engine.js';
import {
  explainActiveRecommendations,
  buildTutorEvidenceContext,
} from '../evidence/evidence-engine.js';
import { resolveNextProblems } from '../solution-engine/next-problem-engine.js';
import { loadSmartTutorDoc, saveSmartTutorDoc } from './cache.js';

/**
 * Refresh derived learning surfaces after Result completes.
 * Does NOT re-record mastery attempts (caller already ran onQuestionAnswered).
 *
 * @param {{
 *   question?: object,
 *   pattern?: object|null,
 *   questions?: object[],
 *   patterns?: object[],
 *   pack?: object,
 *   alreadyRecorded?: boolean,
 * }} ctx
 */
export function runAutoLearningLoop(ctx = {}) {
  const question = ctx.question || {};
  const pattern = ctx.pattern || null;
  const questions = Array.isArray(ctx.questions) ? ctx.questions : [];
  const patterns = Array.isArray(ctx.patterns) ? ctx.patterns : [];
  const questionId = question.questionId || null;
  const patternId = question.patternId || pattern?.patternId || null;

  const result = {
    ok: true,
    learning: null,
    review: null,
    recommendation: null,
    dashboard: null,
    evidence: null,
    nextProblems: null,
    formulaUnchanged: true,
    runtimeUnchanged: true,
    updatedAt: new Date().toISOString(),
  };

  try {
    /* Learning Engine — read / rebuild recommendations only (no formula change) */
    let recoSummary = null;
    if (questions.length) {
      const reco = buildLearningRecommendations(questions);
      recoSummary = reco?.summary || reco || null;
    }
    const nextIds = getNextRecommendedQuestions(3);
    result.learning = {
      refreshed: true,
      nextIds,
      summary: recoSummary,
    };
    result.recommendation = {
      refreshed: true,
      items: nextIds,
      source: 'learning-engine/recommendation-engine',
    };
  } catch (err) {
    result.learning = { refreshed: false, error: err?.message || String(err) };
    result.recommendation = { refreshed: false };
  }

  try {
    result.review = {
      refreshed: true,
      due: getDueReviews(),
      summary: getReviewSummary(),
      source: 'learning-engine/review-engine',
    };
  } catch (err) {
    result.review = { refreshed: false, error: err?.message || String(err) };
  }

  try {
    const leDash = buildLearningDashboard(questions, patterns);
    let studentDash = null;
    try {
      studentDash = buildStudentDashboardView(questions, patterns);
    } catch (_e) {
      studentDash = null;
    }
    result.dashboard = {
      refreshed: true,
      learning: leDash ? { ok: true } : null,
      student: studentDash ? { ok: true } : null,
      source: 'learning-engine + dashboard-engine',
    };
  } catch (err) {
    result.dashboard = { refreshed: false, error: err?.message || String(err) };
  }

  try {
    const active = explainActiveRecommendations(questions);
    const tutorEv = buildTutorEvidenceContext(questionId, patternId, questions);
    result.evidence = {
      refreshed: true,
      activeCount: Array.isArray(active) ? active.length : 0,
      tutor: tutorEv,
      source: 'evidence-engine',
    };
  } catch (err) {
    result.evidence = { refreshed: false, error: err?.message || String(err) };
  }

  try {
    result.nextProblems = resolveNextProblems({
      count: 3,
      excludeQuestionId: questionId,
      questions,
    });
  } catch (err) {
    result.nextProblems = { ok: false, items: [], error: err?.message || String(err) };
  }

  /* Persist loop snapshot under smart-tutor storage (additive) */
  try {
    const doc = loadSmartTutorDoc();
    if (!doc.loopHistory) doc.loopHistory = [];
    doc.loopHistory.push({
      questionId,
      patternId,
      recommendationCount: result.recommendation?.items?.length || 0,
      reviewDue: Array.isArray(result.review?.due) ? result.review.due.length : 0,
      evidenceActive: result.evidence?.activeCount || 0,
      at: result.updatedAt,
    });
    if (doc.loopHistory.length > 80) doc.loopHistory = doc.loopHistory.slice(-80);
    doc.lastLoop = result;
    saveSmartTutorDoc(doc);
  } catch (_err) {
    /* non-critical */
  }

  return result;
}

export default {
  runAutoLearningLoop,
};
