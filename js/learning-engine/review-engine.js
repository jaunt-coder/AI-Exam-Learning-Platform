/**
 * Sprint-13B — Spaced Repetition Review Engine
 * 복습 주기: 1일 → 3일 → 7일 → 14일 → 30일
 */

import { loadReviewCycleDoc, saveReviewCycleDoc } from './learning-storage.js';

export const REVIEW_INTERVALS = Object.freeze([1, 3, 7, 14, 30]);

/**
 * Get current review stage for a question (0-based index into REVIEW_INTERVALS).
 */
export function getReviewStage(questionId) {
  const doc = loadReviewCycleDoc();
  return doc.byQuestion[questionId] || null;
}

/**
 * Record a correct answer → advance to next review stage.
 * Record an incorrect answer → reset to stage 0.
 */
export function updateReviewCycle(questionId, correct) {
  const doc = loadReviewCycleDoc();
  const now = new Date().toISOString();
  const entry = doc.byQuestion[questionId] || { stage: 0, lastReviewAt: null, nextReviewAt: null };

  if (correct) {
    entry.stage = Math.min((entry.stage || 0) + 1, REVIEW_INTERVALS.length - 1);
  } else {
    entry.stage = 0;
  }

  entry.lastReviewAt = now;
  const intervalDays = REVIEW_INTERVALS[entry.stage] || 1;
  const nextDate = new Date(Date.now() + intervalDays * 86400000);
  entry.nextReviewAt = nextDate.toISOString();
  entry.intervalDays = intervalDays;

  doc.byQuestion[questionId] = entry;
  saveReviewCycleDoc(doc);

  return entry;
}

/**
 * Get all questions due for review today.
 */
export function getDueReviews() {
  const doc = loadReviewCycleDoc();
  const now = new Date().toISOString();
  const due = [];
  for (const [questionId, entry] of Object.entries(doc.byQuestion)) {
    if (entry.nextReviewAt && entry.nextReviewAt <= now) {
      due.push({ questionId, ...entry });
    }
  }
  return due.sort((a, b) => (a.nextReviewAt || '').localeCompare(b.nextReviewAt || ''));
}

/**
 * Get upcoming review schedule (next 7 days).
 */
export function getUpcomingReviews(days = 7) {
  const doc = loadReviewCycleDoc();
  const cutoff = new Date(Date.now() + days * 86400000).toISOString();
  const upcoming = [];
  for (const [questionId, entry] of Object.entries(doc.byQuestion)) {
    if (entry.nextReviewAt && entry.nextReviewAt <= cutoff) {
      upcoming.push({ questionId, ...entry });
    }
  }
  return upcoming.sort((a, b) => (a.nextReviewAt || '').localeCompare(b.nextReviewAt || ''));
}

/**
 * Build review schedule summary.
 */
export function getReviewSummary() {
  const doc = loadReviewCycleDoc();
  const entries = Object.entries(doc.byQuestion);
  const now = new Date().toISOString();
  let due = 0;
  let upcoming7 = 0;
  const byStage = [0, 0, 0, 0, 0];
  const cutoff7 = new Date(Date.now() + 7 * 86400000).toISOString();

  for (const [, entry] of entries) {
    const stage = Math.min(entry.stage || 0, 4);
    byStage[stage] += 1;
    if (entry.nextReviewAt && entry.nextReviewAt <= now) due += 1;
    if (entry.nextReviewAt && entry.nextReviewAt <= cutoff7) upcoming7 += 1;
  }

  return {
    totalTracked: entries.length,
    dueToday: due,
    upcoming7Days: upcoming7,
    byStage: REVIEW_INTERVALS.map((interval, i) => ({
      stage: i,
      intervalDays: interval,
      count: byStage[i] || 0,
    })),
  };
}

export default {
  REVIEW_INTERVALS,
  getReviewStage,
  updateReviewCycle,
  getDueReviews,
  getUpcomingReviews,
  getReviewSummary,
};
