/**
 * Sprint-11A — Prompt Builder
 * Builds prompts from Runtime Snapshot only (never full Question/Pattern DB).
 */

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
 * @param {{ task?: string, snapshot?: object }} input
 * @returns {{ prompt: string, facts: object, snapshot: object }}
 */
export function buildPrompt(input = {}) {
  const task = input.task || 'TODAY_COACH';
  const snapshot = normalizeSnapshot(input.snapshot || {});
  const facts = extractPromptFacts(snapshot);

  const prompt = [
    '너는 감정평가사 회계학 AI 학습코치이다.',
    '학생 상태는 다음과 같다.',
    '',
    `Task: ${task}`,
    `Pattern: ${facts.patternId}`,
    `Mastery: ${facts.masteryLevel}`,
    `Weakness: ${facts.weaknessType}`,
    `Recommendation: ${facts.recommendationType}`,
    `Today's Goal: ${facts.todayGoal}`,
    '',
    '반드시',
    '왜 추천하는지',
    '오늘 어떻게 공부하는지',
    '주의할 점',
    '격려',
    '를',
    '300~500자',
    '한국어로 작성하라.',
    '',
    'Runtime Recommendation을 수정하지 말라.',
    '새로운 Pattern을 추천하지 말라.',
    'Question DB / Pattern DB 전체를 요구하거나 가정하지 말라.',
  ].join('\n');

  return { prompt, facts, snapshot };
}

export default { buildPrompt, normalizeSnapshot, extractPromptFacts };
