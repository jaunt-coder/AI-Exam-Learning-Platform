/**
 * Sprint-13A — Student Workspace helpers (Dashboard / recent enrichment)
 */

import { getItem, STORAGE_KEYS } from '../storage.js';
import {
  questionResolver,
  getResolvedQuestionById,
  resolveQuestionList,
} from './student-resolver.js';

/**
 * Enrich dashboard projection with resolved question labels (UI only).
 * Does not mutate Learning Runtime stores.
 * @param {object} dashboard
 * @param {object[]} originals
 */
export function enrichDashboardWithResolved(dashboard, originals = []) {
  if (!dashboard || typeof dashboard !== 'object') return dashboard;

  const recentRaw = getItem(STORAGE_KEYS.RECENT_STUDY, null);
  const sessions = Array.isArray(recentRaw?.sessions)
    ? recentRaw.sessions
    : Array.isArray(recentRaw)
      ? recentRaw
      : [];

  const recentResolved = sessions.slice(0, 8).map((s) => {
    const qid = s.questionId || s.id;
    const resolved = getResolvedQuestionById(originals, qid);
    return {
      questionId: qid,
      patternId: resolved?.patternId || s.patternId || null,
      preview: resolved
        ? String(resolved.question || '').slice(0, 80)
        : s.title || s.questionId || '',
      at: s.answeredAt || s.at || s.timestamp || null,
    };
  });

  const rec = dashboard.recommendationSummary;
  let recommendationResolved = null;
  if (rec?.highestPriority?.patternId) {
    const related = resolveQuestionList(originals)
      .filter((q) => q.patternId === rec.highestPriority.patternId)
      .slice(0, 3)
      .map((q) => ({
        questionId: q.questionId,
        preview: String(q.question || '').slice(0, 80),
        patternId: q.patternId,
      }));
    recommendationResolved = {
      patternId: rec.highestPriority.patternId,
      questions: related,
    };
  }

  const sessionIds =
    dashboard.studySession?.progress?.remainingIds ||
    dashboard.studySession?.remainingQuestionIds ||
    [];
  const sessionResolved = (Array.isArray(sessionIds) ? sessionIds : [])
    .slice(0, 5)
    .map((qid) => {
      const resolved = getResolvedQuestionById(originals, qid);
      return {
        questionId: qid,
        preview: resolved
          ? String(resolved.question || '').slice(0, 80)
          : qid,
        patternId: resolved?.patternId || null,
      };
    });

  return {
    ...dashboard,
    studentWorkspace: {
      enabled: true,
      sprint: 'Sprint-13A',
      overrideApplied: true,
      recentResolved,
      recommendationResolved,
      sessionResolved,
      resolvedCount: resolveQuestionList(originals).length,
    },
  };
}

/**
 * Ensure a single original is resolved for Tutor / Question UI.
 */
export function studentQuestionForDisplay(original) {
  return questionResolver(original);
}

export default {
  enrichDashboardWithResolved,
  studentQuestionForDisplay,
};
