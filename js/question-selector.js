/**
 * Sprint-10F — Adaptive Question Selector
 * Deterministic priority scoring for Study Session queues.
 * Read-only: learning.attempts.v1 / mastery.v1 / weakness.v1
 * No AI / LLM. Does not mutate Question / Pattern / Master / Policy.
 */

import { getItem, STORAGE_KEYS } from './storage.js';

export const SELECTOR_SCHEMA_VERSION = 'v1';

export const SCORE_WEIGHTS = Object.freeze({
  WRONG_HISTORY: 50,
  NEVER_SOLVED: 40,
  WEAKNESS_PATTERN: 30,
  OLD_ATTEMPT: 20,
  RECENT_CORRECT: -20,
  RECENTLY_SERVED: -30,
});

/** ms thresholds (deterministic when nowMs injected) */
export const SELECTOR_THRESHOLDS = Object.freeze({
  oldAttemptMs: 7 * 24 * 60 * 60 * 1000,
  recentCorrectMs: 2 * 24 * 60 * 60 * 1000,
  recentlyServedMs: 24 * 60 * 60 * 1000,
});

const DEFAULT_COUNTS = Object.freeze({
  PATTERN_RETRY_SET: 5,
  CONCEPT_REVIEW_SET: 3,
  CALC_DRILL_SET: 5,
  TIMED_PRACTICE: 10,
});

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
 * Build read-only attempt / weakness context for scoring.
 *
 * @param {{
 *   nowMs?: number,
 *   attemptsDoc?: object|null,
 *   masteryDoc?: object|null,
 *   weaknessDoc?: object|null,
 *   servedIds?: Set<string>|string[],
 * }} [options]
 * @returns {object}
 */
export function buildSelectorContext(options = {}) {
  const nowMs =
    typeof options.nowMs === 'number' && Number.isFinite(options.nowMs)
      ? options.nowMs
      : Date.now();

  const attemptsDoc =
    options.attemptsDoc !== undefined
      ? options.attemptsDoc
      : getItem(STORAGE_KEYS.LEARNING_ATTEMPTS_V1 || 'learning.attempts.v1', null);
  const weaknessDoc =
    options.weaknessDoc !== undefined
      ? options.weaknessDoc
      : getItem(STORAGE_KEYS.LEARNING_WEAKNESS_V1 || 'learning.weakness.v1', null);

  const events = Array.isArray(attemptsDoc)
    ? attemptsDoc
    : Array.isArray(attemptsDoc?.events)
      ? attemptsDoc.events
      : [];

  /** @type {Map<string, object>} */
  const byQuestion = new Map();
  for (const e of events) {
    if (!e) continue;
    const qid = String(e.question_id || e.questionId || '');
    if (!qid) continue;
    const ts = Date.parse(e.timestamp || e.created_at || '') || 0;
    const result = e.result;
    const incorrect = result === 'incorrect' || result === 'wrong';
    const correct = result === 'correct';
    let row = byQuestion.get(qid);
    if (!row) {
      row = {
        questionId: qid,
        attemptCount: 0,
        incorrectCount: 0,
        correctCount: 0,
        lastAttemptAt: 0,
        lastIncorrectAt: 0,
        lastCorrectAt: 0,
        everCorrect: false,
        everIncorrect: false,
      };
      byQuestion.set(qid, row);
    }
    row.attemptCount += 1;
    row.lastAttemptAt = Math.max(row.lastAttemptAt, ts);
    if (incorrect) {
      row.incorrectCount += 1;
      row.everIncorrect = true;
      row.lastIncorrectAt = Math.max(row.lastIncorrectAt, ts);
    }
    if (correct) {
      row.correctCount += 1;
      row.everCorrect = true;
      row.lastCorrectAt = Math.max(row.lastCorrectAt, ts);
    }
  }

  const weaknessPatterns = new Set();
  const patterns = Array.isArray(weaknessDoc?.patterns)
    ? weaknessDoc.patterns
    : [];
  for (const p of patterns) {
    const signals = Array.isArray(p?.activeSignals)
      ? p.activeSignals
      : Array.isArray(p?.signals)
        ? p.signals
        : [];
    if (signals.length && p.patternId) {
      weaknessPatterns.add(String(p.patternId));
    }
  }

  const servedIds = new Set(
    options.servedIds
      ? Array.isArray(options.servedIds)
        ? options.servedIds.map(String)
        : [...options.servedIds]
      : [],
  );

  return {
    nowMs,
    byQuestion,
    weaknessPatterns,
    servedIds,
    thresholds: SELECTOR_THRESHOLDS,
    weights: SCORE_WEIGHTS,
  };
}

/**
 * Deterministic priority score for one question.
 *
 * @param {object} question
 * @param {object} [context]
 * @param {{ targetPatternId?: string, targetChapterId?: string|null }} [scope]
 * @returns {{ score: number, reasons: string[], questionId: string }}
 */
export function questionPriorityScore(question, context, scope = {}) {
  const ctx = context || buildSelectorContext();
  const qid = questionIdOf(question);
  const hist = ctx.byQuestion?.get(qid);
  const weights = ctx.weights || SCORE_WEIGHTS;
  const thr = ctx.thresholds || SELECTOR_THRESHOLDS;
  const nowMs = ctx.nowMs || 0;
  const reasons = [];
  let score = 0;

  const wrongHistory =
    Boolean(hist?.everIncorrect) ||
    (Number(hist?.incorrectCount) || 0) > 0;
  if (wrongHistory) {
    score += weights.WRONG_HISTORY;
    reasons.push('WRONG_HISTORY');
  }

  const neverSolved = !hist || !hist.everCorrect;
  if (neverSolved) {
    score += weights.NEVER_SOLVED;
    reasons.push('NEVER_SOLVED');
  }

  const patternId = effectivePatternId(question);
  if (patternId && ctx.weaknessPatterns?.has(patternId)) {
    score += weights.WEAKNESS_PATTERN;
    reasons.push('WEAKNESS_PATTERN');
  }

  if (hist?.lastAttemptAt) {
    const age = nowMs - hist.lastAttemptAt;
    if (age >= thr.oldAttemptMs) {
      score += weights.OLD_ATTEMPT;
      reasons.push('OLD_ATTEMPT');
    }
  }

  if (hist?.lastCorrectAt) {
    const sinceCorrect = nowMs - hist.lastCorrectAt;
    if (sinceCorrect >= 0 && sinceCorrect < thr.recentCorrectMs) {
      score += weights.RECENT_CORRECT;
      reasons.push('RECENT_CORRECT');
    }
  }

  const recentlyServed =
    ctx.servedIds?.has(qid) ||
    (hist?.lastAttemptAt &&
      nowMs - hist.lastAttemptAt >= 0 &&
      nowMs - hist.lastAttemptAt < thr.recentlyServedMs);
  if (recentlyServed) {
    score += weights.RECENTLY_SERVED;
    reasons.push('RECENTLY_SERVED');
  }

  /* Soft scope bonuses — reinforce Priority 3/4 without overriding hard scores */
  if (scope.targetPatternId && patternId === scope.targetPatternId) {
    score += 5;
    reasons.push('SAME_PATTERN');
  }
  if (
    scope.targetChapterId &&
    String(question.chapterId || '') === String(scope.targetChapterId)
  ) {
    score += 2;
    reasons.push('SAME_CHAPTER');
  }

  return { score, reasons, questionId: qid };
}

/**
 * Attach priority scores to questions.
 *
 * @param {object[]} questions
 * @param {object} [context]
 * @param {{ targetPatternId?: string, targetChapterId?: string|null }} [scope]
 * @returns {object[]}
 */
export function buildQuestionPriority(questions = [], context, scope = {}) {
  const ctx = context || buildSelectorContext();
  return (questions || []).map((q) => {
    const scored = questionPriorityScore(q, ctx, scope);
    return {
      question: q,
      questionId: scored.questionId,
      score: scored.score,
      reasons: scored.reasons,
      patternId: effectivePatternId(q),
      chapterId: q?.chapterId || null,
    };
  });
}

/**
 * Rank by score desc, then questionId asc (deterministic).
 *
 * @param {object[]} questions
 * @param {object} [context]
 * @param {{ targetPatternId?: string, targetChapterId?: string|null }} [scope]
 * @returns {object[]} ranked priority rows
 */
export function rankQuestions(questions = [], context, scope = {}) {
  const rows = buildQuestionPriority(questions, context, scope);
  rows.sort(
    (a, b) =>
      (Number(b.score) || 0) - (Number(a.score) || 0) ||
      String(a.questionId).localeCompare(String(b.questionId)),
  );
  return rows;
}

/**
 * Select top N question ids for a pattern.
 *
 * @param {string} patternId
 * @param {object[]} questions
 * @param {number} count
 * @param {{
 *   context?: object,
 *   excludeIds?: Set<string>|string[],
 *   broadenChapter?: boolean,
 *   broadenAll?: boolean,
 * }} [options]
 * @returns {string[]}
 */
export function selectQuestionsForPattern(
  patternId,
  questions = [],
  count = 5,
  options = {},
) {
  const n = Math.max(0, Math.floor(Number(count) || 0));
  if (!n) return [];

  const exclude = new Set(
    options.excludeIds
      ? Array.isArray(options.excludeIds)
        ? options.excludeIds.map(String)
        : [...options.excludeIds]
      : [],
  );
  const ctx = options.context || buildSelectorContext();
  const bank = questions || [];

  let pool = bank.filter((q) => {
    const qid = questionIdOf(q);
    return qid && !exclude.has(qid) && effectivePatternId(q) === patternId;
  });

  const chapterSeed =
    pool[0]?.chapterId ||
    bank.find((q) => effectivePatternId(q) === patternId)?.chapterId ||
    null;

  if ((options.broadenChapter || pool.length < n) && chapterSeed) {
    const seen = new Set(pool.map(questionIdOf));
    for (const q of bank) {
      const qid = questionIdOf(q);
      if (!qid || exclude.has(qid) || seen.has(qid)) continue;
      if (String(q.chapterId || '') === String(chapterSeed)) {
        pool.push(q);
        seen.add(qid);
      }
    }
  }

  if (options.broadenAll || pool.length < n) {
    const seen = new Set(pool.map(questionIdOf));
    for (const q of bank) {
      const qid = questionIdOf(q);
      if (!qid || exclude.has(qid) || seen.has(qid)) continue;
      pool.push(q);
      seen.add(qid);
    }
  }

  const ranked = rankQuestions(pool, ctx, {
    targetPatternId: patternId,
    targetChapterId: chapterSeed,
  });

  const out = [];
  const used = new Set();
  for (const row of ranked) {
    if (!row.questionId || used.has(row.questionId)) continue;
    used.add(row.questionId);
    out.push(row.questionId);
    if (out.length >= n) break;
  }
  return out;
}

/**
 * Select questions for a Learning Strategy (adaptive).
 *
 * @param {object} strategy
 * @param {object[]} questions
 * @param {{
 *   context?: object,
 *   excludeIds?: Set<string>|string[],
 *   count?: number,
 * }} [options]
 * @returns {{ ok: boolean, questionIds: string[], strategyType?: string, error?: string }}
 */
export function selectQuestionsForStrategy(
  strategy = {},
  questions = [],
  options = {},
) {
  if (!strategy?.strategyType) {
    return { ok: false, questionIds: [], error: 'missing_strategy' };
  }
  const bank = Array.isArray(questions) ? questions : [];
  if (!bank.length) {
    return { ok: false, questionIds: [], error: 'missing_question_bank' };
  }

  const count =
    Number(options.count) ||
    Number(strategy.questionCount) ||
    DEFAULT_COUNTS[strategy.strategyType] ||
    5;
  const patternId = String(strategy.patternId || '');
  const type = strategy.strategyType;
  const ctx = options.context || buildSelectorContext();
  const exclude = new Set(
    options.excludeIds
      ? Array.isArray(options.excludeIds)
        ? options.excludeIds.map(String)
        : [...options.excludeIds]
      : [],
  );

  let pool = bank.filter((q) => {
    const qid = questionIdOf(q);
    return qid && !exclude.has(qid);
  });

  if (type === 'CALC_DRILL_SET') {
    const calc = pool.filter(
      (q) => q.hasCalculation === true || q.questionType === 'calculation',
    );
    const samePat = calc.filter((q) => effectivePatternId(q) === patternId);
    pool = samePat.length
      ? samePat
      : calc.length
        ? calc
        : pool.filter((q) => effectivePatternId(q) === patternId);
  } else if (type === 'TIMED_PRACTICE') {
    /* full pool — adaptive score still applies (wrong/old first, recent last) */
  } else {
    pool = pool.filter((q) => effectivePatternId(q) === patternId);
  }

  if (!pool.length && patternId) {
    pool = bank.filter((q) => {
      const qid = questionIdOf(q);
      return qid && !exclude.has(qid) && effectivePatternId(q) === patternId;
    });
  }

  /* Undersized pattern pool → chapter then all (still scored) */
  if (pool.length < count) {
    const chapterSeed =
      pool[0]?.chapterId ||
      bank.find((q) => effectivePatternId(q) === patternId)?.chapterId;
    const seen = new Set(pool.map(questionIdOf));
    if (chapterSeed) {
      for (const q of bank) {
        const qid = questionIdOf(q);
        if (!qid || exclude.has(qid) || seen.has(qid)) continue;
        if (String(q.chapterId || '') === String(chapterSeed)) {
          pool.push(q);
          seen.add(qid);
        }
      }
    }
    if (pool.length < count || type === 'TIMED_PRACTICE') {
      for (const q of bank) {
        const qid = questionIdOf(q);
        if (!qid || exclude.has(qid) || seen.has(qid)) continue;
        pool.push(q);
        seen.add(qid);
      }
    }
  }

  const ranked = rankQuestions(pool, ctx, {
    targetPatternId: patternId,
    targetChapterId:
      pool.find((q) => effectivePatternId(q) === patternId)?.chapterId || null,
  });

  const questionIds = [];
  const used = new Set();
  for (const row of ranked) {
    if (!row.questionId || used.has(row.questionId)) continue;
    used.add(row.questionId);
    questionIds.push(row.questionId);
    if (questionIds.length >= count) break;
  }

  return {
    ok: questionIds.length > 0,
    questionIds,
    strategyType: type,
    error: questionIds.length ? undefined : 'empty_selection',
  };
}

export default {
  SELECTOR_SCHEMA_VERSION,
  SCORE_WEIGHTS,
  SELECTOR_THRESHOLDS,
  buildSelectorContext,
  questionPriorityScore,
  buildQuestionPriority,
  rankQuestions,
  selectQuestionsForPattern,
  selectQuestionsForStrategy,
  effectivePatternId,
  questionIdOf,
};
