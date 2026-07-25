/**
 * Sprint-11B — Pattern Tutor AI Coach
 * Layer: Recommendation → Pattern Tutor → LLM Adapter → OpenAI
 * Storage: read-only. No Runtime / DB / Policy mutation.
 */

import { getItem, STORAGE_KEYS } from '../storage.js';
import { createLlmClient, DEFAULT_MODEL } from '../llm/llm-client.js';
import {
  PATTERN_TUTOR_RESPONSE_KEYS,
  DEFAULT_USER_QUESTION,
  buildPatternTutorPrompt,
  normalizePatternTutorSnapshot,
} from '../llm/pattern-prompt-builder.js';

export const PATTERN_TUTOR_TEMPERATURE = 0.2;
export const PATTERN_TUTOR_MAX_RETRIES = 2;
export const PATTERN_TUTOR_PROVIDER = 'openai';
export const PATTERN_TUTOR_MODEL = DEFAULT_MODEL || 'gpt-5.5';

/**
 * Read learning storage keys (no writes).
 * @returns {{
 *   masteryDoc: object|null,
 *   weaknessDoc: object|null,
 *   planDoc: object|null,
 *   strategyDoc: object|null,
 *   recommendationDoc: object|null,
 * }}
 */
export function readLearningStateReadonly() {
  return {
    masteryDoc: getItem(STORAGE_KEYS.LEARNING_MASTERY_V1, null),
    weaknessDoc: getItem(STORAGE_KEYS.LEARNING_WEAKNESS_V1, null),
    planDoc: getItem(STORAGE_KEYS.LEARNING_PLAN_V1, null),
    strategyDoc: getItem(STORAGE_KEYS.LEARNING_STRATEGY_V1, null),
    recommendationDoc: getItem(STORAGE_KEYS.LEARNING_RECOMMENDATION_V1, null),
  };
}

/**
 * Pick pattern-scoped row from a document array or object.
 * @param {object|null} doc
 * @param {string} patternId
 * @returns {object|null}
 */
function pickPatternRow(doc, patternId) {
  if (!doc) return null;
  if (Array.isArray(doc.patterns)) {
    if (patternId) {
      const hit = doc.patterns.find((p) => p?.patternId === patternId);
      if (hit) return hit;
    }
    return doc.patterns[0] || null;
  }
  if (Array.isArray(doc.recommendations)) {
    if (patternId) {
      const hit = doc.recommendations.find((r) => r?.patternId === patternId);
      if (hit) return hit;
    }
    return doc.recommendations[0] || null;
  }
  if (patternId && doc.patternId && doc.patternId !== patternId) {
    return null;
  }
  return doc;
}

/**
 * Build runtime snapshot for Pattern Tutor (read-only).
 * @param {{
 *   patternId?: string,
 *   runtimeSnapshot?: object,
 *   studentState?: object,
 *   masteryState?: object,
 *   weaknessState?: object,
 *   recommendation?: object,
 * }} [input]
 */
export function buildPatternTutorRuntimeSnapshot(input = {}) {
  const stored = readLearningStateReadonly();
  const patternId =
    input.patternId ||
    input.runtimeSnapshot?.patternId ||
    input.runtimeSnapshot?.pattern?.patternId ||
    input.recommendation?.patternId ||
    null;

  const masteryState =
    input.masteryState ||
    pickPatternRow(stored.masteryDoc, patternId) ||
    input.runtimeSnapshot?.mastery ||
    null;
  const weaknessState =
    input.weaknessState ||
    pickPatternRow(stored.weaknessDoc, patternId) ||
    input.runtimeSnapshot?.weakness ||
    null;
  const recommendation =
    input.recommendation ||
    pickPatternRow(stored.recommendationDoc, patternId) ||
    input.runtimeSnapshot?.recommendation ||
    null;

  const resolvedPatternId =
    patternId ||
    recommendation?.patternId ||
    masteryState?.patternId ||
    weaknessState?.patternId ||
    'UNKNOWN';

  const base = input.runtimeSnapshot || {};
  return normalizePatternTutorSnapshot({
    ...base,
    patternId: resolvedPatternId,
    pattern: base.pattern || { patternId: resolvedPatternId },
    mastery: masteryState,
    weakness: weaknessState,
    recommendation,
    studentState: input.studentState || base.studentState || null,
    accuracy: input.studentState?.accuracy ?? base.accuracy,
    attemptCount: input.studentState?.attemptCount ?? base.attemptCount,
    recentAttempts: input.studentState?.recentAttempts || base.recentAttempts,
    lastAttempt: input.studentState?.lastAttempt || base.lastAttempt,
    difficulty: base.difficulty || masteryState?.difficulty || null,
    evidence: base.evidence || null,
    policy: base.policy || null,
    patternMetadata: base.patternMetadata || base.pattern || null,
    studentQuestion: input.studentQuestion || base.studentQuestion,
  });
}

/**
 * Validate Pattern Tutor response schema.
 * @param {unknown} value
 * @returns {{ ok: boolean, errors: string[], data: object|null }}
 */
export function validatePatternTutorResponse(value) {
  const errors = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, errors: ['response_not_object'], data: null };
  }

  for (const key of PATTERN_TUTOR_RESPONSE_KEYS) {
    if (!(key in value) || value[key] === undefined || value[key] === null) {
      errors.push(`missing:${key}`);
    }
  }

  if (errors.length) {
    return { ok: false, errors, data: null };
  }

  const commonMistakes = Array.isArray(value.commonMistakes)
    ? value.commonMistakes.map(String)
    : [String(value.commonMistakes)];
  const reviewChecklist = Array.isArray(value.reviewChecklist)
    ? value.reviewChecklist.map(String)
    : [String(value.reviewChecklist)];

  let confidence = value.confidence;
  if (typeof confidence === 'string') {
    const n = Number(confidence);
    confidence = Number.isFinite(n) ? n : 0.5;
  } else if (typeof confidence !== 'number' || !Number.isFinite(confidence)) {
    confidence = 0.5;
  }
  confidence = Math.max(0, Math.min(1, confidence));

  return {
    ok: true,
    errors: [],
    data: {
      title: String(value.title),
      summary: String(value.summary),
      whyWrong: String(value.whyWrong),
      patternExplanation: String(value.patternExplanation),
      commonMistakes,
      reviewChecklist,
      nextStudy: String(value.nextStudy),
      confidence,
    },
  };
}

/**
 * Extract JSON object from LLM text.
 * @param {string} text
 * @returns {object|null}
 */
export function parsePatternTutorJson(text) {
  if (typeof text !== 'string' || !text.trim()) return null;
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch (_err) {
    /* continue */
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch (_err) {
      /* continue */
    }
  }

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch (_err) {
      return null;
    }
  }
  return null;
}

/**
 * Rule Coach fallback using existing Recommendation (no network).
 * @param {object} snapshot
 * @returns {object}
 */
export function buildPatternTutorRuleFallback(snapshot = {}) {
  const snap = normalizePatternTutorSnapshot(snapshot);
  const patternId = snap.pattern.patternId || 'UNKNOWN';
  const mastery = snap.mastery.masteryLevel || 'UNKNOWN';
  const weakness = snap.weakness.weaknessType || 'NONE';
  const recoType = snap.recommendation.strategyType || 'NONE';
  const recoReason =
    snap.recommendation.reason ||
    snap.recommendation.reasonCode ||
    'Runtime Recommendation';

  return {
    title: `${patternId} Pattern Tutor`,
    summary: `${patternId} Pattern을 Mastery(${mastery})와 Weakness(${weakness})를 기준으로 복습하세요. Recommendation(${recoType})을 그대로 따릅니다.`,
    whyWrong: `이 Pattern에서 자주 틀리는 이유는 Weakness 신호(${weakness})와 최근 시도 결과입니다. 정답 번호만 외우지 말고, Pattern 구조를 다시 확인하세요.`,
    patternExplanation: `${patternId}는 Pattern 중심 학습 대상입니다. Runtime이 제시한 Recommendation(${recoType}: ${recoReason})을 유지한 채, 같은 Pattern의 풀이 흐름을 단계별로 복기하세요.`,
    commonMistakes: [
      '정답만 확인하고 Pattern 구조를 건너뛰는 경우',
      `Weakness(${weakness}) 신호를 무시하고 난이도만 올리는 경우`,
      'Recommendation과 다른 Pattern으로 이탈하는 경우',
    ],
    reviewChecklist: [
      `${patternId} Pattern의 핵심 개념을 한 문장으로 설명하기`,
      '틀린 문항의 풀이 알고리즘을 다시 적어 보기',
      `Recommendation(${recoType})에 맞는 문제만 복습하기`,
      `Mastery(${mastery})를 성급히 올리지 않기`,
    ],
    nextStudy: recoReason
      ? `다음 학습: Runtime Recommendation을 유지하며 ${patternId} Pattern을 이어서 복습하세요. (${recoReason})`
      : `다음 학습: ${patternId} Pattern을 Recommendation 전략대로 복습하세요.`,
    confidence: 0.55,
  };
}

/**
 * Generate Pattern Tutor coaching payload.
 * @param {{
 *   patternId?: string,
 *   runtimeSnapshot?: object,
 *   studentState?: object,
 *   masteryState?: object,
 *   weaknessState?: object,
 *   recommendation?: object,
 *   studentQuestion?: string,
 *   client?: object,
 *   maxRetries?: number,
 * }} [input]
 */
export async function generatePatternTutor(input = {}) {
  const snapshot = buildPatternTutorRuntimeSnapshot(input);
  const built = buildPatternTutorPrompt({
    patternId: input.patternId || snapshot.pattern.patternId,
    runtimeSnapshot: snapshot,
    studentState: input.studentState,
    masteryState: snapshot.mastery,
    weaknessState: snapshot.weakness,
    recommendation: snapshot.recommendation,
    studentQuestion: input.studentQuestion || DEFAULT_USER_QUESTION,
  });

  const client = input.client || createLlmClient({ useCache: false });
  const maxRetries =
    typeof input.maxRetries === 'number'
      ? input.maxRetries
      : PATTERN_TUTOR_MAX_RETRIES;

  let lastError = null;
  let attempts = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    attempts = attempt + 1;
    try {
      const result = await client.chat(built.messages, {
        model: PATTERN_TUTOR_MODEL,
        temperature: PATTERN_TUTOR_TEMPERATURE,
        maxTokens: 900,
      });

      if (!result?.ok || !result.text) {
        lastError = result?.error || 'llm_failed';
        continue;
      }

      const parsed = parsePatternTutorJson(result.text);
      const validated = validatePatternTutorResponse(parsed);
      if (!validated.ok) {
        lastError = validated.errors.join(',') || 'schema_invalid';
        continue;
      }

      return {
        ok: true,
        fallback: false,
        source: 'llm',
        provider: PATTERN_TUTOR_PROVIDER,
        model: PATTERN_TUTOR_MODEL,
        attempts,
        patternId: snapshot.pattern.patternId,
        mastery: snapshot.mastery,
        weakness: snapshot.weakness,
        recommendation: snapshot.recommendation,
        snapshot,
        prompt: {
          system: built.system,
          developer: built.developer,
          user: built.user,
        },
        response: validated.data,
        title: validated.data.title,
        summary: validated.data.summary,
        whyWrong: validated.data.whyWrong,
        patternExplanation: validated.data.patternExplanation,
        commonMistakes: validated.data.commonMistakes,
        reviewChecklist: validated.data.reviewChecklist,
        nextStudy: validated.data.nextStudy,
        confidence: validated.data.confidence,
      };
    } catch (err) {
      lastError = err?.message || 'exception';
    }
  }

  const fallback = buildPatternTutorRuleFallback(snapshot);
  return {
    ok: true,
    fallback: true,
    source: 'rule_coach',
    provider: PATTERN_TUTOR_PROVIDER,
    model: PATTERN_TUTOR_MODEL,
    attempts,
    error: lastError,
    patternId: snapshot.pattern.patternId,
    mastery: snapshot.mastery,
    weakness: snapshot.weakness,
    recommendation: snapshot.recommendation,
    snapshot,
    prompt: {
      system: built.system,
      developer: built.developer,
      user: built.user,
    },
    response: fallback,
    title: fallback.title,
    summary: fallback.summary,
    whyWrong: fallback.whyWrong,
    patternExplanation: fallback.patternExplanation,
    commonMistakes: fallback.commonMistakes,
    reviewChecklist: fallback.reviewChecklist,
    nextStudy: fallback.nextStudy,
    confidence: fallback.confidence,
  };
}

/**
 * Dashboard helper — Pattern Detail card payload.
 * @param {object} [input]
 */
export async function buildPatternTutorDashboardCard(input = {}) {
  const tutor = await generatePatternTutor(input);
  return {
    enabled: true,
    connected: true,
    provider: PATTERN_TUTOR_PROVIDER,
    model: PATTERN_TUTOR_MODEL,
    fallback: tutor.fallback,
    patternId: tutor.patternId,
    masteryLevel: tutor.mastery?.masteryLevel || 'UNKNOWN',
    weaknessType: tutor.weakness?.weaknessType || 'NONE',
    title: tutor.title,
    summary: tutor.summary,
    explanation: tutor.patternExplanation,
    whyWrong: tutor.whyWrong,
    commonMistakes: tutor.commonMistakes,
    reviewChecklist: tutor.reviewChecklist,
    nextStudy: tutor.nextStudy,
    confidence: tutor.confidence,
    source: tutor.source,
  };
}

export default {
  PATTERN_TUTOR_TEMPERATURE,
  PATTERN_TUTOR_MAX_RETRIES,
  PATTERN_TUTOR_PROVIDER,
  PATTERN_TUTOR_MODEL,
  readLearningStateReadonly,
  buildPatternTutorRuntimeSnapshot,
  validatePatternTutorResponse,
  parsePatternTutorJson,
  buildPatternTutorRuleFallback,
  generatePatternTutor,
  buildPatternTutorDashboardCard,
};
