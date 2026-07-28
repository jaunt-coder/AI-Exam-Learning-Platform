/**
 * Sprint-19C — Pattern Priority
 * Priority = Frequency × MasteryGap × RecentWrong × Confidence × ROI
 */

import { savePatternPriorityDoc, loadPatternPriorityDoc } from './roi-storage.js';

export const PATTERN_PRIORITY_VERSION = '19C';

/**
 * @param {object} row — from buildPatternScore
 */
export function computePriority(row = {}) {
  const frequency = Math.max(0, Number(row.frequency) || 0);
  const masteryGap = Math.max(0, Number(row.masteryGap) || 0) / 100;
  const recentWrong = Math.max(0.35, Number(row.recentWrong) || 0); // floor so zero-wrong still ranks
  const confidence = Math.max(0.2, Math.min(1, Number(row.confidence) || 0.5));
  const roi = Math.max(0, Number(row.roi) || 0) / 100;

  const priority = frequency * masteryGap * recentWrong * confidence * roi * 100;
  return Math.round(priority * 100) / 100;
}

/**
 * Sort pattern scores by priority desc.
 * @param {object[]} scores
 */
export function rankByPriority(scores = []) {
  const ranked = (scores || []).map((row) => ({
    ...row,
    priority: computePriority(row),
  }));
  ranked.sort((a, b) => b.priority - a.priority || b.roi - a.roi);
  return ranked.map((r, i) => ({ ...r, rank: i + 1 }));
}

/**
 * Persist priority list for a subject.
 */
export function persistPriority(subjectId, ranked = []) {
  const doc = loadPatternPriorityDoc();
  if (!doc.bySubject) doc.bySubject = {};
  doc.bySubject[subjectId] = {
    subjectId,
    at: new Date().toISOString(),
    patterns: ranked.slice(0, 50).map((r) => ({
      patternId: r.patternId,
      name: r.name,
      priority: r.priority,
      roi: r.roi,
      rank: r.rank,
    })),
  };
  savePatternPriorityDoc(doc);
  return doc.bySubject[subjectId];
}

export default {
  PATTERN_PRIORITY_VERSION,
  computePriority,
  rankByPriority,
  persistPriority,
};
