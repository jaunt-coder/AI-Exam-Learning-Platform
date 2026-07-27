/**
 * Sprint-15B — Mini Retry
 * Pattern DB relatedQuestions에서 유사 1문항 추천 (Question DB 생성 금지).
 */

import { persistMiniRetry } from './cache.js';
import { resolveNextProblems } from '../solution-engine/next-problem-engine.js';

/**
 * Pick one same-pattern mini question from Pattern.relatedQuestions.
 * Falls back to recommendation engine (read-only) excluding current id.
 *
 * @param {{
 *   pattern?: object|null,
 *   questionId?: string|null,
 *   questions?: object[],
 * }} input
 */
export function pickMiniRetry(input = {}) {
  const pattern = input.pattern || null;
  const exclude = input.questionId || null;
  const questions = Array.isArray(input.questions) ? input.questions : [];
  const patternId = pattern?.patternId || null;

  const related = Array.isArray(pattern?.relatedQuestions)
    ? pattern.relatedQuestions.filter((id) => id && id !== exclude)
    : [];

  let pickedId = related[0] || null;
  let source = 'pattern-db/relatedQuestions';

  if (!pickedId) {
    const samePattern = questions.filter(
      (q) =>
        q
        && q.questionId
        && q.questionId !== exclude
        && (q.patternId === patternId || !patternId),
    );
    if (samePattern.length) {
      pickedId = samePattern[0].questionId;
      source = 'questions/same-pattern';
    }
  }

  if (!pickedId) {
    try {
      const next = resolveNextProblems({
        count: 1,
        excludeQuestionId: exclude,
        questions,
      });
      pickedId = next?.items?.[0]?.questionId || next?.items?.[0]?.id || null;
      if (pickedId) source = 'recommendation-engine';
    } catch (_err) {
      pickedId = null;
    }
  }

  const q = pickedId
    ? questions.find((row) => row.questionId === pickedId) || null
    : null;

  const card = {
    title: '같은 Pattern 미니문제',
    count: pickedId ? 1 : 0,
    questionId: q?.questionId || pickedId || null,
    patternId: q?.patternId || patternId,
    href: pickedId
      ? `question.html?id=${encodeURIComponent(pickedId)}`
      : null,
    stemPreview: q?.question || q?.stem
      ? String(q.question || q.stem).slice(0, 100)
      : null,
    source,
    created: false,
    note: 'Pattern DB 유사 문항 추천 · Question DB 생성 없음',
  };

  if (exclude) persistMiniRetry(exclude, card);
  return card;
}

export default {
  pickMiniRetry,
};
