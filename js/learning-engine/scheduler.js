/**
 * Sprint-13B — Learning Scheduler
 * Generates today's study schedule from recommendations + review cycle.
 */

import { loadScheduleDoc, saveScheduleDoc } from './learning-storage.js';
import { getDueReviews } from './review-engine.js';
import { loadRecommendations } from '../recommendation-service.js';

/**
 * Build today's study schedule.
 */
export function buildTodaySchedule() {
  const dueReviews = getDueReviews();
  const recDoc = loadRecommendations();
  const activeRecs = (recDoc.recommendations || []).filter((r) => r.status === 'ACTIVE');

  const items = [];
  const seen = new Set();

  for (const review of dueReviews.slice(0, 10)) {
    const id = `schedule_review_${review.questionId}`;
    if (!seen.has(id)) {
      seen.add(id);
      items.push({
        scheduleId: id,
        type: 'REVIEW',
        questionId: review.questionId,
        priority: 1,
        reason: `복습 (Stage ${review.stage})`,
        estimatedMinutes: 3,
      });
    }
  }

  for (const rec of activeRecs.slice(0, 15)) {
    const id = `schedule_rec_${rec.recommendationId}`;
    if (!seen.has(id)) {
      seen.add(id);
      items.push({
        scheduleId: id,
        type: 'RECOMMENDATION',
        questionId: rec.questionId || null,
        patternId: rec.patternId || null,
        priority: rec.priority || 5,
        reason: rec.reason || '추천 학습',
        estimatedMinutes: rec.estimatedMinutes || 5,
      });
    }
  }

  items.sort((a, b) => (a.priority || 99) - (b.priority || 99));

  const doc = loadScheduleDoc();
  doc.items = items;
  doc.generatedAt = new Date().toISOString();
  doc.totalEstimatedMinutes = items.reduce((s, i) => s + (i.estimatedMinutes || 0), 0);
  saveScheduleDoc(doc);

  return {
    ok: true,
    items,
    totalItems: items.length,
    totalEstimatedMinutes: doc.totalEstimatedMinutes,
  };
}

/**
 * Get current schedule.
 */
export function getTodaySchedule() {
  const doc = loadScheduleDoc();
  return {
    items: doc.items || [],
    totalItems: (doc.items || []).length,
    totalEstimatedMinutes: doc.totalEstimatedMinutes || 0,
    generatedAt: doc.generatedAt || null,
  };
}

export default { buildTodaySchedule, getTodaySchedule };
