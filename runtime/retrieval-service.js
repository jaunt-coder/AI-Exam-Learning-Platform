/**
 * M2.7 Retrieval / Recall — student self-recall storage only.
 * LocalStorage: learning.retrieval.v1 (append-only)
 * Draft: learning.retrieval.draft.v1
 *
 * Does NOT grade, compare to answer keys, recommend, coach, or call LLM.
 * Does NOT modify Question / Answer / Pattern SoT.
 */

import { getItem, setItem } from '../js/storage.js';

export const RETRIEVAL_STORAGE_KEY = 'learning.retrieval.v1';
export const RETRIEVAL_DRAFT_KEY = 'learning.retrieval.draft.v1';
export const RETRIEVAL_SCHEMA = 'learning.retrieval.v1';

export const DEFAULT_RETRIEVAL_PROMPT =
  '이번 Pattern에서 시험장에서 가장 먼저 확인해야 하는 것은?';

/**
 * @typedef {object} RetrievalRecord
 * @property {string} schema_version
 * @property {string} retrieval_id
 * @property {string} pattern_id
 * @property {string|null} question_id
 * @property {string|null} attempt_id
 * @property {string|null} session_id
 * @property {string} retrieval_prompt
 * @property {string} question
 * @property {string} student_response
 * @property {boolean} answered
 * @property {number} char_count
 * @property {string} created_at
 * @property {string|null} study_mode
 */

function createRetrievalId() {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return `ret_${t}_${r}`;
}

export function loadRetrievalLog() {
  const raw = getItem(RETRIEVAL_STORAGE_KEY, []);
  return Array.isArray(raw) ? raw : [];
}

/**
 * @param {object} entry
 * @returns {{ ok: boolean, error?: string, record?: RetrievalRecord, total?: number }}
 */
export function appendRetrieval(entry) {
  try {
    if (!entry || typeof entry !== 'object') {
      return { ok: false, error: 'invalid_entry' };
    }
    if (!entry.pattern_id) {
      return { ok: false, error: 'missing_pattern_id' };
    }

    const prompt = String(
      entry.retrieval_prompt || entry.question || DEFAULT_RETRIEVAL_PROMPT
    ).trim();
    const response = String(entry.student_response || '').trim();
    const answered = response.length > 0;

    const record = {
      schema_version: RETRIEVAL_SCHEMA,
      retrieval_id: entry.retrieval_id || createRetrievalId(),
      pattern_id: String(entry.pattern_id),
      question_id: entry.question_id != null ? String(entry.question_id) : null,
      attempt_id: entry.attempt_id != null ? String(entry.attempt_id) : null,
      session_id: entry.session_id != null ? String(entry.session_id) : null,
      retrieval_prompt: prompt,
      question: prompt,
      student_response: response,
      answered,
      char_count: response.length,
      created_at: entry.created_at || new Date().toISOString(),
      study_mode: entry.study_mode ? String(entry.study_mode) : null,
      /* Future-compatible flags — never evaluated in M2.7 */
      future: {
        for_recommendation: true,
        for_coach: true,
        evaluated: false,
        scored: false,
      },
    };

    const log = loadRetrievalLog();
    const next = [...log, record];
    const saved = setItem(RETRIEVAL_STORAGE_KEY, next);
    if (!saved) return { ok: false, error: 'storage_write_failed' };

    if (record.question_id) clearRetrievalDraft(record.question_id);
    return { ok: true, record, total: next.length };
  } catch (err) {
    return { ok: false, error: err?.message || 'append_failed' };
  }
}

export function listRetrievals(opts = {}) {
  let log = loadRetrievalLog();
  if (opts.patternId) {
    log = log.filter((r) => r.pattern_id === opts.patternId);
  }
  if (opts.sessionId) {
    log = log.filter((r) => r.session_id === opts.sessionId);
  }
  if (opts.sinceIso) {
    const since = Date.parse(opts.sinceIso);
    if (!Number.isNaN(since)) {
      log = log.filter((r) => Date.parse(r.created_at) >= since);
    }
  }
  if (opts.todayOnly) {
    const today = new Date().toISOString().slice(0, 10);
    log = log.filter((r) => String(r.created_at || '').startsWith(today));
  }
  return log;
}

/**
 * Recall Timeline for a pattern — student-facing history only.
 * No ranking, scoring, or “improvement” judgment.
 *
 * @param {string} patternId
 * @returns {{ pattern_id: string, history: object[] }}
 */
export function getRecallTimeline(patternId) {
  if (!patternId) {
    return { pattern_id: '', history: [] };
  }
  const items = listRetrievals({ patternId })
    .filter((r) => r.answered)
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));

  return {
    pattern_id: patternId,
    history: items.map((r) => ({
      retrieval_id: r.retrieval_id,
      attempt_id: r.attempt_id,
      question_id: r.question_id,
      created_at: r.created_at,
      student_response: r.student_response,
      char_count: r.char_count,
    })),
  };
}

/** Latest prior recall excluding optional current attempt */
export function getPreviousRecall(patternId, opts = {}) {
  const timeline = getRecallTimeline(patternId);
  let history = timeline.history;
  if (opts.excludeAttemptId) {
    history = history.filter((h) => h.attempt_id !== opts.excludeAttemptId);
  }
  if (opts.excludeRetrievalId) {
    history = history.filter(
      (h) => h.retrieval_id !== opts.excludeRetrievalId
    );
  }
  return history.length ? history[history.length - 1] : null;
}

export function saveRetrievalDraft(questionId, state) {
  if (!questionId) return false;
  const bag = getItem(RETRIEVAL_DRAFT_KEY, {}) || {};
  bag[questionId] = {
    ...state,
    savedAt: new Date().toISOString(),
  };
  return setItem(RETRIEVAL_DRAFT_KEY, bag);
}

export function loadRetrievalDraft(questionId) {
  if (!questionId) return null;
  const bag = getItem(RETRIEVAL_DRAFT_KEY, {}) || {};
  return bag[questionId] || null;
}

export function clearRetrievalDraft(questionId) {
  const bag = getItem(RETRIEVAL_DRAFT_KEY, {}) || {};
  if (!questionId) return setItem(RETRIEVAL_DRAFT_KEY, {});
  delete bag[questionId];
  return setItem(RETRIEVAL_DRAFT_KEY, bag);
}

/**
 * Session growth counts — display only, no analysis.
 */
export function getSessionGrowth(opts = {}) {
  const retrievals = listRetrievals({
    sinceIso: opts.sinceIso,
    sessionId: opts.sessionId,
    todayOnly: opts.todayOnly,
  });
  const patterns = new Set(retrievals.map((r) => r.pattern_id).filter(Boolean));
  return {
    retrieval_count: retrievals.length,
    answered_count: retrievals.filter((r) => r.answered).length,
    pattern_ids: [...patterns],
  };
}

export default {
  RETRIEVAL_STORAGE_KEY,
  RETRIEVAL_DRAFT_KEY,
  RETRIEVAL_SCHEMA,
  DEFAULT_RETRIEVAL_PROMPT,
  loadRetrievalLog,
  appendRetrieval,
  listRetrievals,
  getRecallTimeline,
  getPreviousRecall,
  saveRetrievalDraft,
  loadRetrievalDraft,
  clearRetrievalDraft,
  getSessionGrowth,
};
