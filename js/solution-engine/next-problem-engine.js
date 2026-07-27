/**
 * Sprint-15A+ — Next Problem Engine
 * Uses Learning Engine Recommendation as-is (no ranking changes).
 */

import { getNextRecommendedQuestions } from '../learning-engine/recommendation-engine.js';
import { loadRecommendations, rankRecommendations } from '../recommendation-service.js';

/**
 * Resolve next recommended problems for Result UI.
 * @param {object} [options]
 * @param {number} [options.count=3]
 * @param {string|null} [options.excludeQuestionId]
 * @param {object[]} [options.questions]
 */
export function resolveNextProblems(options = {}) {
  const count = Math.max(1, Number(options.count) || 3);
  const exclude = options.excludeQuestionId || null;
  const questions = Array.isArray(options.questions) ? options.questions : [];

  let ids = [];
  try {
    ids = getNextRecommendedQuestions(count + 2) || [];
  } catch (_err) {
    ids = [];
  }

  if (!ids.length) {
    const doc = loadRecommendations();
    const ranked = rankRecommendations(
      (doc.recommendations || []).filter((r) => r && r.status === 'ACTIVE'),
    );
    ids = ranked.map((r) => r.questionId || r.patternId).filter(Boolean);
  }

  const filtered = ids.filter((id) => id && id !== exclude).slice(0, count);

  const cards = filtered.map((id, index) => {
    const q = questions.find((row) => row.questionId === id);
    return {
      rank: index + 1,
      id,
      questionId: q?.questionId || (String(id).includes('_Q') ? id : null),
      patternId: q?.patternId || (!String(id).includes('_Q') ? id : null),
      href: q
        ? `question.html?id=${encodeURIComponent(q.questionId)}`
        : String(id).startsWith('ACC_INV_')
          ? `pattern.html?id=${encodeURIComponent(id)}`
          : `question.html?id=${encodeURIComponent(id)}`,
      source: 'recommendation-engine',
    };
  });

  return {
    ok: true,
    count: cards.length,
    items: cards,
    source: 'learning-engine/recommendation-engine',
  };
}

export default {
  resolveNextProblems,
};
