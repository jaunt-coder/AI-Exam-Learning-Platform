/**
 * Sprint-10D — Study Session Runtime
 * Sprint-10F — Adaptive Question Selector for queue building
 * Learning Strategy → Adaptive Selector → Question Queue → Attempt
 * Deterministic only. No AI / LLM. Question/Pattern/Master DB read-only.
 *
 * Storage: learning.session.v1
 * Schema: data/study-session-schema.json
 */

import { getItem, setItem, STORAGE_KEYS } from './storage.js';
import { loadStrategies } from './learning-strategy-service.js';
import {
  buildSelectorContext,
  selectQuestionsForStrategy as adaptiveSelectForStrategy,
} from './question-selector.js';

export const STUDY_SESSION_STORE_KEY =
  STORAGE_KEYS.LEARNING_SESSION_V1 || 'learning.session.v1';
export const STUDY_SESSION_SCHEMA_VERSION = 'v1';

/** @deprecated 10C key — kept for migration read */
export const LEGACY_STUDY_SESSION_KEY = 'learning.study-session.v1';

/** @type {object[]} */
let questionBankCache = [];

const DEFAULT_COUNTS = Object.freeze({
  PATTERN_RETRY_SET: 5,
  CONCEPT_REVIEW_SET: 3,
  CALC_DRILL_SET: 5,
  TIMED_PRACTICE: 10,
});

const MINUTES_PER_QUESTION = 3;

/**
 * @param {object[]} questions
 */
export function setQuestionBank(questions) {
  questionBankCache = Array.isArray(questions) ? questions : [];
  return questionBankCache.length;
}

/**
 * @returns {object[]}
 */
export function getQuestionBank() {
  return questionBankCache;
}

/**
 * @param {object} question
 * @returns {string}
 */
export function effectivePatternId(question) {
  if (!question || typeof question !== 'object') return '';
  if (question.primaryPattern != null && question.primaryPattern !== '') {
    return String(question.primaryPattern);
  }
  return String(question.patternId || '');
}

/**
 * @param {object} question
 * @returns {string}
 */
export function questionIdOf(question) {
  return String(question?.questionId || question?.id || '');
}

/**
 * @returns {string}
 */
export function createSessionId() {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return `study_${t}_${r}`;
}

/**
 * @param {object} strategy
 * @returns {number}
 */
export function resolveQuestionCount(strategy = {}) {
  const n = Number(strategy.questionCount);
  if (Number.isFinite(n) && n > 0) return Math.floor(n);
  return DEFAULT_COUNTS[strategy.strategyType] || 5;
}

/**
 * Collect wrong question ids (Constitution + attempt log).
 * @returns {Set<string>}
 */
export function loadWrongQuestionIdSet() {
  const ids = new Set();
  const wrong = getItem(STORAGE_KEYS.WRONG_ANSWERS, null);
  if (wrong && typeof wrong === 'object' && wrong.items) {
    Object.keys(wrong.items).forEach((id) => {
      if (id) ids.add(String(id));
    });
  }
  const attempts = getItem(STORAGE_KEYS.LEARNING_ATTEMPTS_V1, null);
  const events = Array.isArray(attempts)
    ? attempts
    : Array.isArray(attempts?.events)
      ? attempts.events
      : [];
  for (const e of events) {
    if (
      e &&
      (e.result === 'incorrect' || e.result === 'wrong') &&
      (e.question_id || e.questionId)
    ) {
      ids.add(String(e.question_id || e.questionId));
    }
  }
  return ids;
}

/**
 * Select question ids for one strategy via Adaptive Selector (Sprint-10F).
 *
 * @param {object} strategy
 * @param {object[]} bank
 * @param {{
 *   excludeIds?: Set<string>,
 *   context?: object,
 *   nowMs?: number,
 * }} [options]
 * @returns {string[]}
 */
export function selectQuestionIdsForStrategy(strategy, bank, options = {}) {
  const selected = adaptiveSelectForStrategy(strategy, bank, {
    excludeIds: options.excludeIds,
    context: options.context,
    count: resolveQuestionCount(strategy),
  });
  return selected.ok ? selected.questionIds : [];
}

/**
 * Build pattern-grouped question queue (Adaptive Selector).
 *
 * @param {object[]} strategies
 * @param {object[]} [questions]
 * @param {{
 *   nowMs?: number,
 *   context?: object,
 *   servedIds?: Set<string>|string[],
 *   attemptsDoc?: object|null,
 *   weaknessDoc?: object|null,
 * }} [options]
 * @returns {{
 *   ok: boolean,
 *   queue: { patternId: string, questionIds: string[] }[],
 *   questionIds: string[],
 *   patternIds: string[],
 *   error?: string
 * }}
 */
export function buildQuestionQueue(strategies = [], questions, options = {}) {
  const bank = Array.isArray(questions) ? questions : questionBankCache;
  if (!Array.isArray(strategies) || !strategies.length) {
    return {
      ok: false,
      queue: [],
      questionIds: [],
      patternIds: [],
      error: 'no_strategies',
    };
  }
  if (!bank.length) {
    return {
      ok: false,
      queue: [],
      questionIds: [],
      patternIds: [],
      error: 'missing_question_bank',
    };
  }

  const context =
    options.context ||
    buildSelectorContext({
      nowMs: options.nowMs,
      attemptsDoc: options.attemptsDoc,
      weaknessDoc: options.weaknessDoc,
      servedIds: options.servedIds,
    });

  const excludeIds = new Set();
  /** @type {Map<string, string[]>} */
  const byPattern = new Map();

  const ordered = strategies.slice().sort(
    (a, b) =>
      (Number(b.priority) || 0) - (Number(a.priority) || 0) ||
      String(a.strategyType || '').localeCompare(String(b.strategyType || '')),
  );

  for (const strategy of ordered) {
    const ids = selectQuestionIdsForStrategy(strategy, bank, {
      excludeIds,
      context,
    });
    const patternId = String(strategy.patternId || 'MIXED');
    if (!byPattern.has(patternId)) byPattern.set(patternId, []);
    const bucket = byPattern.get(patternId);
    for (const qid of ids) {
      if (excludeIds.has(qid)) continue;
      excludeIds.add(qid);
      bucket.push(qid);
    }
  }

  const queue = [...byPattern.entries()]
    .filter(([, ids]) => ids.length)
    .map(([patternId, questionIds]) => ({ patternId, questionIds }));

  const questionIds = queue.flatMap((g) => g.questionIds);
  const patternIds = queue.map((g) => g.patternId);

  return {
    ok: questionIds.length > 0,
    queue,
    questionIds,
    patternIds,
    error: questionIds.length ? undefined : 'empty_queue',
  };
}

/**
 * @returns {object|null}
 */
export function loadStudySession() {
  const raw = getItem(STUDY_SESSION_STORE_KEY, null);
  if (raw && typeof raw === 'object') return raw;
  const legacy = getItem(LEGACY_STUDY_SESSION_KEY, null);
  if (legacy && typeof legacy === 'object') return legacy;
  return null;
}

/**
 * Persist session; preserve legacy UI fields when present.
 * @param {object} session
 * @returns {boolean}
 */
export function saveStudySession(session) {
  const prev = getItem(STUDY_SESSION_STORE_KEY, null) || {};
  const merged = {
    ...prev,
    ...session,
    /* legacy UI session-state-machine fields */
    startedAt:
      session.startedAt != null
        ? session.startedAt
        : prev.startedAt != null
          ? prev.startedAt
          : Date.now(),
    patternsLearned: Array.isArray(session.patternsLearned)
      ? session.patternsLearned
      : Array.isArray(prev.patternsLearned)
        ? prev.patternsLearned
        : [],
    patternsReviewed: Array.isArray(session.patternsReviewed)
      ? session.patternsReviewed
      : Array.isArray(prev.patternsReviewed)
        ? prev.patternsReviewed
        : [],
  };
  return setItem(STUDY_SESSION_STORE_KEY, merged);
}

/**
 * Build + persist Today's Study Session from Learning Strategies.
 *
 * @param {{
 *   studentId?: string,
 *   questions?: object[],
 *   strategies?: object[],
 *   wrongIds?: Set<string>|string[],
 * }} [input]
 * @returns {{ ok: boolean, session?: object|null, skipped?: boolean, error?: string }}
 */
export function buildStudySession(input = {}) {
  const studentId = input.studentId || 'm1_demo_student';
  const bank = Array.isArray(input.questions)
    ? input.questions
    : questionBankCache;

  let strategies = Array.isArray(input.strategies) ? input.strategies : null;
  if (!strategies) {
    strategies = loadStrategies().strategies || [];
  }
  if (!strategies.length) {
    return { ok: true, session: null, skipped: true, error: 'no_strategies' };
  }
  if (!bank.length) {
    return { ok: false, session: null, error: 'missing_question_bank' };
  }

  const wrongIds = input.wrongIds
    ? new Set(
        Array.isArray(input.wrongIds)
          ? input.wrongIds.map(String)
          : [...input.wrongIds],
      )
    : loadWrongQuestionIdSet();

  const built = buildQuestionQueue(strategies, bank, {
    wrongIds,
    seed: `build_${studentId}`,
  });
  if (!built.ok) {
    return {
      ok: false,
      session: null,
      error: built.error || 'empty_queue',
    };
  }

  const primary = strategies.slice().sort(
    (a, b) =>
      (Number(b.priority) || 0) - (Number(a.priority) || 0) ||
      String(a.strategyType || '').localeCompare(String(b.strategyType || '')),
  )[0];

  const createdAt = new Date().toISOString();
  const session = {
    schemaVersion: STUDY_SESSION_SCHEMA_VERSION,
    sessionId: createSessionId(),
    studentId,
    createdAt,
    status: 'ACTIVE',
    strategyType: primary?.strategyType || null,
    strategyIds: strategies.map((s) => s.strategyId).filter(Boolean),
    patternIds: built.patternIds,
    questionIds: built.questionIds,
    queue: built.queue,
    estimatedMinutes: built.questionIds.length * MINUTES_PER_QUESTION,
    completedQuestions: [],
    remainingQuestions: built.questionIds.slice(),
    currentIndex: 0,
    startedAt: Date.now(),
    finishedAt: null,
    exportedAt: null,
  };

  const saved = saveStudySession(session);
  if (!saved) {
    return { ok: false, session: null, error: 'storage_write_failed' };
  }
  return { ok: true, session, skipped: false };
}

/**
 * Alias — Sprint-10C name.
 * @param {object} [input]
 */
export function createStudySession(input = {}) {
  return buildStudySession(input);
}

/**
 * Record progress after one question attempt in the session queue.
 *
 * @param {{ questionId?: string, correct?: boolean }} [input]
 * @returns {{ ok: boolean, session?: object|null, error?: string }}
 */
export function recordSessionProgress(input = {}) {
  const session = loadStudySession();
  if (!session || !Array.isArray(session.questionIds)) {
    return { ok: false, session: null, error: 'no_session' };
  }
  if (session.status === 'COMPLETED') {
    return { ok: false, session, error: 'session_already_completed' };
  }

  const qid =
    input.questionId ||
    session.remainingQuestions?.[0] ||
    session.questionIds[Number(session.currentIndex) || 0];
  if (!qid) {
    return { ok: false, session, error: 'missing_question_id' };
  }

  const completedQuestions = Array.isArray(session.completedQuestions)
    ? session.completedQuestions.slice()
    : [];
  if (!completedQuestions.includes(qid)) {
    completedQuestions.push(qid);
  }

  const remainingQuestions = (
    Array.isArray(session.remainingQuestions)
      ? session.remainingQuestions
      : session.questionIds
  ).filter((id) => id !== qid && !completedQuestions.includes(id));

  /* keep remaining in original order from questionIds */
  const remainingOrdered = session.questionIds.filter(
    (id) => !completedQuestions.includes(id),
  );

  const currentIndex = completedQuestions.length;
  const status =
    remainingOrdered.length === 0 ? 'COMPLETED' : session.status || 'ACTIVE';

  const patternId = (session.queue || []).find((g) =>
    (g.questionIds || []).includes(qid),
  )?.patternId;
  const patternsLearned = Array.isArray(session.patternsLearned)
    ? session.patternsLearned.slice()
    : [];
  if (patternId && !patternsLearned.includes(patternId)) {
    patternsLearned.push(patternId);
  }

  const next = {
    ...session,
    completedQuestions,
    remainingQuestions: remainingOrdered,
    currentIndex,
    status,
    patternsLearned,
    updatedAt: new Date().toISOString(),
    finishedAt: status === 'COMPLETED' ? new Date().toISOString() : session.finishedAt || null,
  };

  if (typeof input.correct === 'boolean') {
    next.lastResult = { questionId: qid, correct: input.correct };
  }

  const saved = saveStudySession(next);
  if (!saved) return { ok: false, session: null, error: 'storage_write_failed' };
  return { ok: true, session: next };
}

/**
 * @param {object} [input]
 */
export function completeQuestion(input = {}) {
  return recordSessionProgress(input);
}

/**
 * Finish today's study session.
 * @returns {{ ok: boolean, session?: object|null, error?: string }}
 */
export function finishStudySession() {
  const session = loadStudySession();
  if (!session) {
    return { ok: false, session: null, error: 'no_session' };
  }
  const next = {
    ...session,
    status: 'COMPLETED',
    remainingQuestions: [],
    finishedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const saved = saveStudySession(next);
  if (!saved) return { ok: false, session: null, error: 'storage_write_failed' };
  return { ok: true, session: next };
}

/**
 * @returns {{ ok: boolean, session?: object|null, error?: string }}
 */
export function finishSession() {
  return finishStudySession();
}

/**
 * Today's ACTIVE session (UTC day).
 * @returns {{ ok: boolean, session: object|null, skipped?: boolean, reason?: string }}
 */
export function loadTodayQueue() {
  const session = loadStudySession();
  if (!session) {
    return { ok: true, session: null, skipped: true };
  }
  if (session.status === 'COMPLETED') {
    return { ok: true, session, skipped: true, reason: 'completed' };
  }
  const iso = session.createdAt;
  if (iso) {
    const d = new Date(iso);
    const now = new Date();
    const sameDay =
      !Number.isNaN(d.getTime()) &&
      d.getUTCFullYear() === now.getUTCFullYear() &&
      d.getUTCMonth() === now.getUTCMonth() &&
      d.getUTCDate() === now.getUTCDate();
    if (!sameDay) {
      return { ok: true, session, skipped: true, reason: 'not_today' };
    }
  }
  return { ok: true, session, skipped: false };
}

/**
 * 10C resolver shape — Adaptive Selector wrapper.
 */
export function resolveQuestionsForStrategy(strategy, questions, options = {}) {
  const bank = Array.isArray(questions) ? questions : questionBankCache;
  const context =
    options.context ||
    buildSelectorContext({
      nowMs: options.nowMs,
      servedIds: options.servedIds,
    });
  const ids = selectQuestionIdsForStrategy(strategy, bank, {
    excludeIds: options.excludeIds,
    context,
  });
  const byId = new Map(bank.map((q) => [questionIdOf(q), q]));
  const selected = ids.map((qid) => {
    const q = byId.get(qid);
    return {
      questionId: qid,
      patternId: q ? effectivePatternId(q) : strategy.patternId,
      chapterId: q?.chapterId || null,
      strategyId: strategy.strategyId || null,
      strategyType: strategy.strategyType,
      status: 'pending',
    };
  });
  return {
    ok: selected.length > 0,
    questions: selected,
    poolSize: selected.length,
    requested: resolveQuestionCount(strategy),
  };
}

export default {
  STUDY_SESSION_STORE_KEY,
  STUDY_SESSION_SCHEMA_VERSION,
  DEFAULT_COUNTS,
  setQuestionBank,
  getQuestionBank,
  buildStudySession,
  buildQuestionQueue,
  recordSessionProgress,
  finishStudySession,
  createStudySession,
  completeQuestion,
  finishSession,
  loadTodayQueue,
  loadStudySession,
  saveStudySession,
  resolveQuestionsForStrategy,
  selectQuestionIdsForStrategy,
  effectivePatternId,
};
