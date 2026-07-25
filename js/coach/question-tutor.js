/**
 * Sprint-11C — Question Tutor AI Coach
 * Layer: Pattern Tutor → Question Tutor → LLM Adapter → OpenAI
 * Storage: read-only. No Runtime / DB / Policy mutation.
 */

import { getItem, STORAGE_KEYS } from '../storage.js';
import { createLlmClient, DEFAULT_MODEL } from '../llm/llm-client.js';
import {
  QUESTION_TUTOR_RESPONSE_KEYS,
  MISTAKE_TYPES,
  DEFAULT_QUESTION_USER_PROMPT,
  buildQuestionTutorPrompt,
  normalizeQuestionTutorSnapshot,
  sanitizeQuestionForPrompt,
  sanitizeAttemptForPrompt,
} from '../llm/question-prompt-builder.js';
import {
  generatePatternTutor,
  buildPatternTutorRuleFallback,
  readLearningStateReadonly,
} from './pattern-tutor.js';

export const QUESTION_TUTOR_TEMPERATURE = 0.2;
export const QUESTION_TUTOR_MAX_RETRIES = 2;
export const QUESTION_TUTOR_PROVIDER = 'openai';
export const QUESTION_TUTOR_MODEL = DEFAULT_MODEL || 'gpt-5.5';

/**
 * Read learning storage keys including attempts (no writes).
 */
export function readQuestionTutorStateReadonly() {
  const base = readLearningStateReadonly();
  return {
    ...base,
    attemptsDoc: getItem(STORAGE_KEYS.LEARNING_ATTEMPTS_V1, null),
  };
}

/**
 * Pick latest attempt from learning.attempts.v1
 * @param {object|null} doc
 * @param {string|null} questionId
 */
export function pickLatestAttempt(doc, questionId = null) {
  if (!doc) return null;
  const list = Array.isArray(doc.attempts)
    ? doc.attempts
    : Array.isArray(doc)
      ? doc
      : doc.attempt
        ? [doc.attempt]
        : [];
  if (!list.length) return null;
  const filtered = questionId
    ? list.filter((a) => (a?.questionId || a?.id) === questionId)
    : list;
  const pool = filtered.length ? filtered : list;
  return pool[pool.length - 1] || null;
}

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
  return doc;
}

/**
 * Infer mistake type heuristically for Rule Coach.
 * @param {object} snapshot
 * @returns {string}
 */
export function inferMistakeType(snapshot = {}) {
  const snap = normalizeQuestionTutorSnapshot(snapshot);
  const explicit = snap.attempt?.mistakeType;
  if (explicit && MISTAKE_TYPES.includes(String(explicit).toUpperCase())) {
    return String(explicit).toUpperCase();
  }
  const weakness = String(snap.weakness?.weaknessType || '').toUpperCase();
  if (weakness.includes('CALC')) return 'CALCULATION';
  if (weakness.includes('CONCEPT')) return 'CONCEPT';
  if (weakness.includes('MEMOR')) return 'MEMORIZATION';
  if (weakness.includes('SLOW') || weakness.includes('TIME')) return 'TIME_PRESSURE';
  if (snap.attempt?.isCorrect === true) return 'UNKNOWN';
  return 'UNKNOWN';
}

/**
 * Build snapshot for Question Tutor (read-only).
 */
export function buildQuestionTutorRuntimeSnapshot(input = {}) {
  const stored = readQuestionTutorStateReadonly();
  const question = sanitizeQuestionForPrompt(
    input.question || input.runtimeSnapshot?.question || null,
  );
  const attempt =
    sanitizeAttemptForPrompt(input.attempt) ||
    sanitizeAttemptForPrompt(input.runtimeSnapshot?.attempt) ||
    sanitizeAttemptForPrompt(
      pickLatestAttempt(stored.attemptsDoc, question?.id || null),
    );

  const patternId =
    input.pattern?.patternId ||
    question?.patternId ||
    attempt?.patternId ||
    input.recommendation?.patternId ||
    null;

  const mastery =
    input.mastery ||
    pickPatternRow(stored.masteryDoc, patternId) ||
    input.runtimeSnapshot?.mastery ||
    null;
  const weakness =
    input.weakness ||
    pickPatternRow(stored.weaknessDoc, patternId) ||
    input.runtimeSnapshot?.weakness ||
    null;
  const recommendation =
    input.recommendation ||
    pickPatternRow(stored.recommendationDoc, patternId) ||
    input.runtimeSnapshot?.recommendation ||
    null;
  const pattern =
    input.pattern ||
    input.runtimeSnapshot?.pattern ||
    { patternId: patternId || 'UNKNOWN' };

  return normalizeQuestionTutorSnapshot({
    question,
    attempt,
    pattern,
    mastery,
    weakness,
    recommendation,
    evidence: input.evidence || input.runtimeSnapshot?.evidence || null,
    studentState: input.studentState || null,
    runtimeSnapshot: input.runtimeSnapshot || null,
    studentQuestion: input.studentQuestion,
  });
}

/**
 * Validate Question Tutor response schema.
 * @param {unknown} value
 */
export function validateQuestionTutorResponse(value) {
  const errors = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, errors: ['response_not_object'], data: null };
  }

  for (const key of QUESTION_TUTOR_RESPONSE_KEYS) {
    if (!(key in value) || value[key] === undefined || value[key] === null) {
      errors.push(`missing:${key}`);
    }
  }

  let mistakeType = value.mistakeType;
  if (mistakeType != null) {
    mistakeType = String(mistakeType).toUpperCase();
    if (!MISTAKE_TYPES.includes(mistakeType)) {
      errors.push('invalid:mistakeType');
    }
  }

  if (errors.length) {
    return { ok: false, errors, data: null };
  }

  const stepByStep = Array.isArray(value.stepByStep)
    ? value.stepByStep.map(String)
    : [String(value.stepByStep)];
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
      correctAnswer: String(value.correctAnswer),
      whyWrong: String(value.whyWrong),
      mistakeType,
      stepByStep,
      keyConcept: String(value.keyConcept),
      relatedPattern: String(value.relatedPattern),
      reviewChecklist,
      similarTrap: String(value.similarTrap),
      nextQuestion: String(value.nextQuestion),
      confidence,
    },
  };
}

export function parseQuestionTutorJson(text) {
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
 * Rule Coach fallback for a single question.
 * @param {object} snapshot
 */
export function buildQuestionTutorRuleFallback(snapshot = {}) {
  const snap = normalizeQuestionTutorSnapshot(snapshot);
  const qid = snap.question?.id || snap.attempt?.questionId || 'UNKNOWN';
  const patternId = snap.pattern?.patternId || 'UNKNOWN';
  const correct =
    snap.question?.answer != null ? String(snap.question.answer) : '정답은 문항 기준으로 확인';
  const selected =
    snap.attempt?.selectedAnswer != null
      ? String(snap.attempt.selectedAnswer)
      : '미응답';
  const isCorrect = snap.attempt?.isCorrect === true;
  const mistakeType = inferMistakeType(snap);
  const reco = snap.recommendation?.strategyType || 'NONE';

  return {
    title: `${qid} Question Tutor`,
    summary: isCorrect
      ? `${qid}는 정답입니다. Pattern(${patternId}) 구조를 한 번 더 정리해 두세요.`
      : `${qid} 오답입니다. 선택(${selected})과 정답(${correct})의 차이를 Pattern(${patternId}) 관점에서 복기하세요.`,
    correctAnswer: correct,
    whyWrong: isCorrect
      ? '정답입니다. 다만 유사 함정에 다시 빠지지 않도록 풀이 근거를 문장으로 남겨 두세요.'
      : `학생이 ${selected}를 고른 이유는 ${mistakeType} 유형의 실수로 보입니다. 정답(${correct})에 이르는 조건을 단계별로 다시 확인하세요.`,
    mistakeType,
    stepByStep: [
      '문제에서 요구하는 회계 처리를 한 문장으로 정리한다.',
      '선택지별로 Pattern 핵심 조건을 대조한다.',
      `정답(${correct})이 성립하는 계산·개념 근거를 적는다.`,
      `Recommendation(${reco})에 맞춰 같은 Pattern 문항을 복습한다.`,
    ],
    keyConcept: `${patternId} Pattern의 핵심 개념을 문항 조건에 그대로 적용하는 것`,
    relatedPattern: patternId,
    reviewChecklist: [
      '오답 선택지와 정답 조건 차이를 한 줄로 쓰기',
      `mistakeType(${mistakeType})에 해당하는 약점을 메모하기`,
      `${patternId} Pattern 풀이 알고리즘 다시 적어 보기`,
    ],
    similarTrap: '숫자만 바꾸고 같은 Pattern 조건을 묻는 함정 선택지',
    nextQuestion: `다음: Runtime Recommendation(${reco})을 유지한 채 ${patternId} Pattern 유사 문항을 풀기`,
    confidence: 0.5,
  };
}

/**
 * Map Pattern Tutor output → Question Tutor schema.
 * @param {object} patternTutorResult
 * @param {object} snapshot
 */
export function mapPatternTutorToQuestionTutor(patternTutorResult, snapshot) {
  const snap = normalizeQuestionTutorSnapshot(snapshot);
  const pt = patternTutorResult?.response || patternTutorResult || {};
  const rule = buildQuestionTutorRuleFallback(snap);
  const mapped = {
    title: pt.title || rule.title,
    summary: pt.summary || rule.summary,
    correctAnswer: rule.correctAnswer,
    whyWrong: pt.whyWrong || rule.whyWrong,
    mistakeType: inferMistakeType(snap),
    stepByStep: Array.isArray(pt.commonMistakes)
      ? pt.commonMistakes.map(String)
      : rule.stepByStep,
    keyConcept: pt.patternExplanation || rule.keyConcept,
    relatedPattern: snap.pattern?.patternId || rule.relatedPattern,
    reviewChecklist: Array.isArray(pt.reviewChecklist)
      ? pt.reviewChecklist.map(String)
      : rule.reviewChecklist,
    similarTrap: Array.isArray(pt.commonMistakes)
      ? String(pt.commonMistakes[0])
      : rule.similarTrap,
    nextQuestion: pt.nextStudy || rule.nextQuestion,
    confidence:
      typeof pt.confidence === 'number' ? pt.confidence : rule.confidence,
  };
  return validateQuestionTutorResponse(mapped);
}

/**
 * Generate Question Tutor coaching payload.
 */
export async function generateQuestionTutor(input = {}) {
  const snapshot = buildQuestionTutorRuntimeSnapshot(input);
  const built = buildQuestionTutorPrompt({
    question: snapshot.question,
    attempt: snapshot.attempt,
    runtimeSnapshot: input.runtimeSnapshot || snapshot.runtimeSnapshot,
    studentState: input.studentState || snapshot.studentState,
    pattern: snapshot.pattern,
    mastery: snapshot.mastery,
    weakness: snapshot.weakness,
    recommendation: snapshot.recommendation,
    evidence: snapshot.evidence,
    studentQuestion: input.studentQuestion || DEFAULT_QUESTION_USER_PROMPT,
  });

  const client = input.client || createLlmClient({ useCache: false });
  const maxRetries =
    typeof input.maxRetries === 'number'
      ? input.maxRetries
      : QUESTION_TUTOR_MAX_RETRIES;

  let lastError = null;
  let attempts = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    attempts = attempt + 1;
    try {
      const result = await client.chat(built.messages, {
        model: QUESTION_TUTOR_MODEL,
        temperature: QUESTION_TUTOR_TEMPERATURE,
        maxTokens: 1000,
      });

      if (!result?.ok || !result.text) {
        lastError = result?.error || 'llm_failed';
        continue;
      }

      const parsed = parseQuestionTutorJson(result.text);
      const validated = validateQuestionTutorResponse(parsed);
      if (!validated.ok) {
        lastError = validated.errors.join(',') || 'schema_invalid';
        continue;
      }

      return packQuestionTutorResult({
        fallback: false,
        source: 'llm',
        attempts,
        snapshot,
        built,
        data: validated.data,
        error: null,
        schemaValidated: true,
      });
    } catch (err) {
      lastError = err?.message || 'exception';
    }
  }

  /* Fallback chain: Pattern Tutor → Rule Coach */
  try {
    const patternTutorResult = await generatePatternTutor({
      patternId: snapshot.pattern?.patternId,
      runtimeSnapshot: {
        pattern: snapshot.pattern,
        mastery: snapshot.mastery,
        weakness: snapshot.weakness,
        recommendation: snapshot.recommendation,
        evidence: snapshot.evidence,
      },
      masteryState: snapshot.mastery,
      weaknessState: snapshot.weakness,
      recommendation: snapshot.recommendation,
      studentState: input.studentState,
      client,
      maxRetries: 0,
    });

    const mapped = mapPatternTutorToQuestionTutor(patternTutorResult, snapshot);
    if (mapped.ok) {
      return packQuestionTutorResult({
        fallback: true,
        source: patternTutorResult.fallback ? 'rule_coach' : 'pattern_tutor',
        attempts,
        snapshot,
        built,
        data: mapped.data,
        error: lastError,
        schemaValidated: true,
        patternTutorSource: patternTutorResult.source,
      });
    }
  } catch (_err) {
    /* continue to rule coach */
  }

  const ruleData = buildQuestionTutorRuleFallback(snapshot);
  /* ensure Pattern Tutor rule layer was considered */
  buildPatternTutorRuleFallback({
    pattern: snapshot.pattern,
    mastery: snapshot.mastery,
    weakness: snapshot.weakness,
    recommendation: snapshot.recommendation,
  });

  return packQuestionTutorResult({
    fallback: true,
    source: 'rule_coach',
    attempts,
    snapshot,
    built,
    data: ruleData,
    error: lastError,
    schemaValidated: true,
  });
}

function packQuestionTutorResult({
  fallback,
  source,
  attempts,
  snapshot,
  built,
  data,
  error,
  schemaValidated,
  patternTutorSource,
}) {
  return {
    ok: true,
    fallback,
    source,
    provider: QUESTION_TUTOR_PROVIDER,
    model: QUESTION_TUTOR_MODEL,
    attempts,
    error: error || null,
    schemaValidated: schemaValidated !== false,
    patternTutorSource: patternTutorSource || null,
    questionId: snapshot.question?.id || snapshot.attempt?.questionId || null,
    patternId: snapshot.pattern?.patternId || null,
    mastery: snapshot.mastery,
    weakness: snapshot.weakness,
    recommendation: snapshot.recommendation,
    attempt: snapshot.attempt,
    snapshot,
    prompt: {
      system: built.system,
      developer: built.developer,
      user: built.user,
    },
    response: data,
    title: data.title,
    summary: data.summary,
    correctAnswer: data.correctAnswer,
    whyWrong: data.whyWrong,
    mistakeType: data.mistakeType,
    stepByStep: data.stepByStep,
    keyConcept: data.keyConcept,
    relatedPattern: data.relatedPattern,
    reviewChecklist: data.reviewChecklist,
    similarTrap: data.similarTrap,
    nextQuestion: data.nextQuestion,
    confidence: data.confidence,
  };
}

/**
 * Dashboard — Question Result Panel payload.
 */
export async function buildQuestionTutorDashboardCard(input = {}) {
  const tutor = await generateQuestionTutor(input);
  return {
    enabled: true,
    connected: true,
    provider: QUESTION_TUTOR_PROVIDER,
    model: QUESTION_TUTOR_MODEL,
    fallback: tutor.fallback,
    schemaValidated: tutor.schemaValidated,
    questionId: tutor.questionId,
    patternId: tutor.patternId,
    mistakeType: tutor.mistakeType,
    title: tutor.title,
    summary: tutor.summary,
    whyWrong: tutor.whyWrong,
    stepByStep: tutor.stepByStep,
    keyConcept: tutor.keyConcept,
    similarTrap: tutor.similarTrap,
    reviewChecklist: tutor.reviewChecklist,
    correctAnswer: tutor.correctAnswer,
    nextQuestion: tutor.nextQuestion,
    confidence: tutor.confidence,
    source: tutor.source,
  };
}

export default {
  QUESTION_TUTOR_TEMPERATURE,
  QUESTION_TUTOR_MAX_RETRIES,
  QUESTION_TUTOR_PROVIDER,
  QUESTION_TUTOR_MODEL,
  readQuestionTutorStateReadonly,
  pickLatestAttempt,
  inferMistakeType,
  buildQuestionTutorRuntimeSnapshot,
  validateQuestionTutorResponse,
  parseQuestionTutorJson,
  buildQuestionTutorRuleFallback,
  mapPatternTutorToQuestionTutor,
  generateQuestionTutor,
  buildQuestionTutorDashboardCard,
};
