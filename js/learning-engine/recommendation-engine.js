/**
 * Sprint-13B — Enhanced Recommendation Engine
 * Wraps 10G recommendation-service with Learning Engine context.
 * Priority: 1-최근틀림 2-Mastery<60 3-AI Confidence낮음 4-Pattern다양성 5-복습주기
 */

import {
  buildTodayRecommendation,
  loadRecommendations,
  saveRecommendations,
  rankRecommendations,
} from '../recommendation-service.js';
import { loadWeaknessState } from '../weakness-service.js';
import { loadMasteryState } from '../mastery-service.js';
import { computePatternMastery } from './mastery-engine.js';
import { getDueReviews } from './review-engine.js';
import { loadProgressDoc } from './learning-storage.js';

/**
 * Build next-question recommendations using Learning Engine context.
 * @param {object[]} questions — DB questions (read-only)
 * @param {object} [options]
 */
export function buildLearningRecommendations(questions = [], options = {}) {
  const base = buildTodayRecommendation(options);
  const recs = base.recommendations || [];

  const prog = loadProgressDoc();
  const weakState = loadWeaknessState();
  const masteryState = loadMasteryState();
  const dueReviews = getDueReviews();

  const extra = [];

  /* Priority 1: 최근 틀린 문항 */
  const recentWrong = Object.entries(prog.byQuestion)
    .filter(([, v]) => v.incorrect > 0)
    .sort((a, b) => (b[1].lastAttemptAt || '').localeCompare(a[1].lastAttemptAt || ''))
    .slice(0, 5);
  for (const [qid] of recentWrong) {
    extra.push({
      recommendationId: `le_wrong_${qid}`,
      questionId: qid,
      priority: 1,
      reason: '최근에 틀린 문항입니다.',
      reasonCode: 'RECENT_WRONG',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    });
  }

  /* Priority 2: Mastery < 60 */
  for (const pm of masteryState.patterns || []) {
    const patternId = pm.patternId;
    const qids = questions.filter((q) => q.patternId === patternId).map((q) => q.questionId);
    const mastery = computePatternMastery(patternId, qids);
    if (mastery.score < 60 && mastery.questionCount > 0) {
      extra.push({
        recommendationId: `le_mastery_${patternId}`,
        patternId,
        priority: 2,
        reason: `Pattern Mastery ${mastery.score}점 (60 미만)`,
        reasonCode: 'LOW_MASTERY',
        estimatedMinutes: 15,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      });
    }
  }

  /* Priority 3: AI Confidence 낮음 (weakness severity high) */
  for (const wp of weakState.patterns || []) {
    const highSignals = (wp.activeSignals || wp.signals || []).filter((s) => s.severity === 'high');
    if (highSignals.length) {
      extra.push({
        recommendationId: `le_confidence_${wp.patternId}`,
        patternId: wp.patternId,
        priority: 3,
        reason: `취약 Pattern: ${highSignals.map((s) => s.type).join(', ')}`,
        reasonCode: 'LOW_CONFIDENCE',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      });
    }
  }

  /* Priority 4: Pattern 다양성 — unseen patterns */
  const seenPatterns = new Set(Object.keys(prog.byPattern));
  const allPatterns = new Set(questions.map((q) => q.patternId));
  for (const pid of allPatterns) {
    if (!seenPatterns.has(pid)) {
      extra.push({
        recommendationId: `le_diversity_${pid}`,
        patternId: pid,
        priority: 4,
        reason: '아직 풀지 않은 Pattern입니다.',
        reasonCode: 'PATTERN_DIVERSITY',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      });
    }
  }

  /* Priority 5: 복습 주기 */
  for (const review of dueReviews.slice(0, 10)) {
    extra.push({
      recommendationId: `le_review_${review.questionId}`,
      questionId: review.questionId,
      priority: 5,
      reason: `복습 주기 도래 (Stage ${review.stage}, ${review.intervalDays}일)`,
      reasonCode: 'REVIEW_DUE',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    });
  }

  const merged = [...recs, ...extra];
  const deduped = [];
  const seen = new Set();
  for (const r of merged) {
    if (!seen.has(r.recommendationId)) {
      seen.add(r.recommendationId);
      deduped.push(r);
    }
  }

  const ranked = deduped.sort((a, b) => (a.priority || 99) - (b.priority || 99));
  saveRecommendations({ schemaVersion: 'v1', recommendations: ranked });

  return {
    ok: true,
    recommendations: ranked,
    count: ranked.length,
    summary: {
      recentWrong: recentWrong.length,
      lowMastery: extra.filter((e) => e.reasonCode === 'LOW_MASTERY').length,
      lowConfidence: extra.filter((e) => e.reasonCode === 'LOW_CONFIDENCE').length,
      diversity: extra.filter((e) => e.reasonCode === 'PATTERN_DIVERSITY').length,
      reviewDue: dueReviews.length,
    },
  };
}

/**
 * Get next N recommended question IDs.
 */
export function getNextRecommendedQuestions(count = 5) {
  const doc = loadRecommendations();
  const active = (doc.recommendations || []).filter((r) => r.status === 'ACTIVE');
  const ranked = rankRecommendations(active);
  return ranked.slice(0, count).map((r) => r.questionId || r.patternId);
}

export default {
  buildLearningRecommendations,
  getNextRecommendedQuestions,
};
