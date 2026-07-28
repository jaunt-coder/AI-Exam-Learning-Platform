/**
 * Sprint-11A — Prompt Builder
 * Sprint-19A — Subject Prompt (회계 하드코딩 제거)
 * Builds prompts from Runtime Snapshot only (never full Question/Pattern DB).
 */

import { buildSubjectCoachPrompt } from '../subject/subject-prompt-builder.js';

/**
 * Normalize runtime snapshot (read-only projection).
 * @param {object} [raw]
 * @returns {object}
 */
export function normalizeSnapshot(raw = {}) {
  return {
    mastery: raw.mastery ?? null,
    weakness: raw.weakness ?? null,
    plan: raw.plan ?? null,
    strategy: raw.strategy ?? null,
    recommendation: raw.recommendation ?? null,
    studySession: raw.studySession ?? null,
  };
}

/**
 * Extract compact fields for prompt text.
 * @param {object} snapshot
 */
export function extractPromptFacts(snapshot = {}) {
  const s = normalizeSnapshot(snapshot);
  const patternId =
    s.recommendation?.patternId ||
    s.strategy?.patternId ||
    s.plan?.patternId ||
    s.weakness?.patternId ||
    s.mastery?.patternId ||
    s.studySession?.patternIds?.[0] ||
    'UNKNOWN';

  const masteryLevel =
    s.mastery?.masteryLevel ||
    s.mastery?.level ||
    'UNKNOWN';

  const weaknessType =
    s.recommendation?.reasonCode ||
    s.weakness?.weaknessSignals?.[0]?.type ||
    s.weakness?.signals?.[0]?.type ||
    s.plan?.weaknessSignal ||
    'NONE';

  const recommendationType =
    s.recommendation?.strategyType ||
    s.strategy?.strategyType ||
    'NONE';

  const todayGoal =
    s.studySession?.questionIds?.length
      ? `${patternId} Pattern ${Math.min(3, s.studySession.questionIds.length)}문제`
      : s.recommendation?.estimatedMinutes
        ? `${patternId} · 약 ${s.recommendation.estimatedMinutes}분`
        : `${patternId} Pattern 복습`;

  return {
    patternId,
    masteryLevel,
    weaknessType,
    recommendationType,
    todayGoal,
  };
}

/**
 * Build coaching prompt from task + snapshot.
 * @param {{ task?: string, snapshot?: object, subjectId?: string }} input
 * @returns {{ prompt: string, facts: object, snapshot: object }}
 */
export function buildPrompt(input = {}) {
  const task = input.task || 'TODAY_COACH';
  const snapshot = normalizeSnapshot(input.snapshot || {});
  const facts = extractPromptFacts(snapshot);

  let prompt = buildSubjectCoachPrompt({
    task,
    facts,
    subjectId: input.subjectId,
  });

  // Preserve Sprint-11A closing constraints
  if (!prompt.includes('새로운 Pattern을 추천하지 말라')) {
    prompt = [
      prompt,
      '새로운 Pattern을 추천하지 말라.',
      'Question DB / Pattern DB 전체를 요구하거나 가정하지 말라.',
    ].join('\n');
  }

  return { prompt, facts, snapshot };
}

export default { buildPrompt, normalizeSnapshot, extractPromptFacts };
