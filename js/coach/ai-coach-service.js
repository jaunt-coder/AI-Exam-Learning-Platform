/**
 * Sprint-11A — AI Coach Foundation
 * Uses LLM Client (Adapter) only. Never calls OpenAI directly.
 * Never mutates Runtime recommendations / plans / strategies.
 */

import { getItem, STORAGE_KEYS } from '../storage.js';
import { createLlmClient } from '../llm/llm-client.js';
import { extractPromptFacts, normalizeSnapshot } from '../llm/prompt-builder.js';

export const COACH_SCHEMA_VERSION = 'v1';

/**
 * Build Runtime Snapshot from LocalStorage (read-only).
 * @returns {object}
 */
export function loadRuntimeSnapshot() {
  const masteryDoc = getItem(STORAGE_KEYS.LEARNING_MASTERY_V1, null);
  const weaknessDoc = getItem(STORAGE_KEYS.LEARNING_WEAKNESS_V1, null);
  const planDoc = getItem(STORAGE_KEYS.LEARNING_PLAN_V1, null);
  const strategyDoc = getItem(STORAGE_KEYS.LEARNING_STRATEGY_V1, null);
  const recommendationDoc = getItem(
    STORAGE_KEYS.LEARNING_RECOMMENDATION_V1,
    null,
  );
  const studySession = getItem(STORAGE_KEYS.LEARNING_SESSION_V1, null);

  const mastery = Array.isArray(masteryDoc?.patterns)
    ? masteryDoc.patterns[0] || null
    : masteryDoc;
  const weakness = Array.isArray(weaknessDoc?.patterns)
    ? weaknessDoc.patterns[0] || null
    : weaknessDoc;
  const plan = Array.isArray(planDoc?.plans)
    ? planDoc.plans[0] || null
    : planDoc;
  const strategy = Array.isArray(strategyDoc?.strategies)
    ? strategyDoc.strategies[0] || null
    : strategyDoc;
  const recommendation = Array.isArray(recommendationDoc?.recommendations)
    ? recommendationDoc.recommendations[0] || null
    : recommendationDoc;

  return normalizeSnapshot({
    mastery,
    weakness,
    plan,
    strategy,
    recommendation,
    studySession,
  });
}

/**
 * Deterministic Rule Coach fallback (no network).
 * @param {string} task
 * @param {object} snapshot
 * @returns {string}
 */
export function buildRuleCoachMessage(task, snapshot = {}) {
  const facts = extractPromptFacts(snapshot);
  const why = `오늘은 ${facts.patternId} Pattern을 중심으로 공부하는 것이 좋습니다. Runtime이 ${facts.recommendationType} 전략을 제시했고, Weakness 신호는 ${facts.weaknessType}입니다.`;
  const how = `오늘의 목표(${facts.todayGoal})에 맞춰 같은 Pattern 문제를 순서대로 풀어 보세요. Recommendation과 Study Session Queue를 바꾸지 말고, 주어진 문항만 집중해서 완료하세요.`;
  const caution = `Mastery 상태(${facts.masteryLevel})를 성급히 올리려 하지 마세요. 계산 실수·개념 혼동을 메모하고, 틀린 문항은 풀이 알고리즘을 한 번 더 복기하세요.`;
  const encourage = `지금 루틴을 지키면 충분히 안정됩니다. 한 문제씩 차분히 해결하면 됩니다.`;

  const body = [
    `[${task}]`,
    why,
    how,
    caution,
    encourage,
  ].join(' ');

  /* keep roughly 300–500 chars */
  if (body.length < 300) {
    return `${body} Runtime 추천을 신뢰하고, 오늘은 새로운 Pattern으로 이탈하지 않는 것이 핵심입니다. 짧게라도 복습을 마치면 다음 세션이 훨씬 수월해집니다.`;
  }
  return body.slice(0, 500);
}

/**
 * @param {{
 *   task?: string,
 *   snapshot?: object,
 *   client?: object,
 * }} [input]
 */
export async function runCoach(input = {}) {
  const task = input.task || 'TODAY_COACH';
  const snapshot = normalizeSnapshot(
    input.snapshot || loadRuntimeSnapshot(),
  );
  const client = input.client || createLlmClient();

  try {
    const result = await client.generate({ task, snapshot });
    if (result?.ok && result.text) {
      return {
        ok: true,
        task,
        text: result.text,
        source: result.cached ? 'cache' : 'llm',
        provider: result.provider || null,
        model: result.model || null,
        facts: result.facts || extractPromptFacts(snapshot),
        fallback: false,
      };
    }
  } catch (_err) {
    /* fall through to rule coach */
  }

  const text = buildRuleCoachMessage(task, snapshot);
  return {
    ok: true,
    task,
    text,
    source: 'rule_coach',
    provider: null,
    model: null,
    facts: extractPromptFacts(snapshot),
    fallback: true,
  };
}

export async function buildTodayCoach(snapshot) {
  return runCoach({ task: 'TODAY_COACH', snapshot });
}

export async function buildPatternCoach(snapshot) {
  return runCoach({ task: 'PATTERN_COACH', snapshot });
}

export async function buildRecommendationCoach(snapshot) {
  return runCoach({ task: 'RECOMMENDATION_COACH', snapshot });
}

/**
 * Dashboard bundle: three coach messages (fallback-safe).
 * @param {object} [snapshot]
 */
export async function buildCoachDashboard(snapshot) {
  const snap = normalizeSnapshot(snapshot || loadRuntimeSnapshot());
  const [today, pattern, recommendation] = await Promise.all([
    buildTodayCoach(snap),
    buildPatternCoach(snap),
    buildRecommendationCoach(snap),
  ]);
  return {
    schemaVersion: COACH_SCHEMA_VERSION,
    snapshot: snap,
    today,
    pattern,
    recommendation,
    generatedAt: new Date().toISOString(),
  };
}

export default {
  COACH_SCHEMA_VERSION,
  loadRuntimeSnapshot,
  buildRuleCoachMessage,
  runCoach,
  buildTodayCoach,
  buildPatternCoach,
  buildRecommendationCoach,
  buildCoachDashboard,
};
