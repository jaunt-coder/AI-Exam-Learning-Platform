/**
 * M1 Attempt Pipeline
 * Build + persist AttemptEvent (append-only). No mastery / recommendation.
 */

import { gradeAttempt, normalizeAnswer } from './grader.js';
import { getItem, setItem, STORAGE_KEYS } from '../js/storage.js';

export const ATTEMPT_SCHEMA_VERSION = 'wo014.1-1.0';
export const ATTEMPT_STORE_KEY = STORAGE_KEYS.LEARNING_ATTEMPTS_V1 || 'learning.attempts.v1';

/**
 * @returns {object[]}
 */
export function loadAttemptLog() {
  const raw = getItem(ATTEMPT_STORE_KEY, { events: [] });
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.events)) return raw.events;
  return [];
}

/**
 * @param {object[]} events
 * @returns {boolean}
 */
export function saveAttemptLog(events) {
  return setItem(ATTEMPT_STORE_KEY, {
    schemaVersion: ATTEMPT_SCHEMA_VERSION,
    milestone: 'M1',
    updatedAt: new Date().toISOString(),
    events,
  });
}

/**
 * @param {string} eventId
 * @returns {boolean}
 */
export function hasEventId(eventId) {
  return loadAttemptLog().some((e) => e && e.event_id === eventId);
}

/**
 * Create a unique event id.
 * @returns {string}
 */
export function createEventId() {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 10);
  return `evt_m1_${t}_${r}`;
}

/**
 * Build AttemptEvent after grading (does not persist).
 * @param {object} params
 * @returns {{ ok: boolean, event?: object, grade?: object, error?: string }}
 */
export function buildAttemptEvent(params = {}) {
  const {
    studentId,
    questionId,
    patternId,
    selectedAnswer,
    correctAnswer,
    correctAnswerReference,
    eventId = createEventId(),
    timestamp = new Date().toISOString(),
  } = params;

  if (!studentId || !questionId || !patternId) {
    return { ok: false, error: 'missing_required_ids' };
  }
  if (!correctAnswerReference || !correctAnswerReference.source) {
    return { ok: false, error: 'missing_correct_answer_reference' };
  }
  if (hasEventId(eventId)) {
    return { ok: false, error: 'duplicate_event_id' };
  }

  const grade = gradeAttempt({
    selectedAnswer,
    correctAnswer,
  });
  if (!grade.ok) {
    return { ok: false, error: grade.error || 'grade_failed', grade };
  }

  const event = {
    schemaVersion: ATTEMPT_SCHEMA_VERSION,
    event_id: eventId,
    student_id: studentId,
    question_id: questionId,
    pattern_id: patternId,
    selected_answer: normalizeAnswer(selectedAnswer),
    correct_answer_reference: {
      source: correctAnswerReference.source,
      question_id: correctAnswerReference.question_id || questionId,
      field: 'answer',
    },
    result: grade.result,
    timestamp,
    ingest: {
      woId: 'WO-014.1',
      milestone: 'M1',
      status: 'accepted',
    },
  };

  return { ok: true, event, grade };
}

/**
 * Persist AttemptEvent (append-only).
 * @param {object} event
 * @returns {{ ok: boolean, error?: string, events?: object[] }}
 */
export function persistAttemptEvent(event) {
  if (!event || !event.event_id) {
    return { ok: false, error: 'invalid_event' };
  }
  if (hasEventId(event.event_id)) {
    return { ok: false, error: 'duplicate_event_id' };
  }
  const events = loadAttemptLog();
  events.push(event);
  const saved = saveAttemptLog(events);
  if (!saved) return { ok: false, error: 'persist_failed' };
  return { ok: true, events };
}

/**
 * Grade → build → persist in one call.
 * @param {object} params
 * @returns {{ ok: boolean, event?: object, grade?: object, error?: string }}
 */
export function submitAttempt(params) {
  const built = buildAttemptEvent(params);
  if (!built.ok) return built;
  const persisted = persistAttemptEvent(built.event);
  if (!persisted.ok) {
    return { ok: false, error: persisted.error, grade: built.grade };
  }
  return { ok: true, event: built.event, grade: built.grade };
}

export default {
  loadAttemptLog,
  saveAttemptLog,
  hasEventId,
  createEventId,
  buildAttemptEvent,
  persistAttemptEvent,
  submitAttempt,
};
