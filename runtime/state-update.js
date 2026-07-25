/**
 * M1 Learning State Update
 * Apply accepted AttemptEvent → Student Learning State counters.
 * Mastery remains unknown. Recommendation remains unknown.
 * Does NOT execute mastery policy / AI coaching.
 */

import { getItem, setItem, STORAGE_KEYS } from '../js/storage.js';

export const STATE_SCHEMA_VERSION = 'wo014.2a-2.0';
export const STATE_STORE_KEY = STORAGE_KEYS.LEARNING_STATE_V1 || 'learning.state.v1';
export const MASTERY_POLICY_VERSION = 'wo014.2-1.0';

/**
 * Empty Student Learning State (v2 slots, mastery unknown).
 * @param {string} studentId
 * @returns {object}
 */
export function createEmptyLearningState(studentId = 'm1_demo_student') {
  const now = new Date().toISOString();
  return {
    schemaVersion: STATE_SCHEMA_VERSION,
    student_id: studentId,
    created_at: now,
    updated_at: now,
    learning_data_status: 'empty',
    kb_refs: {
      pattern_master: 'data/pattern-master-db.json',
      pattern_metadata: 'data/pattern-metadata-db.json',
      error_taxonomy: 'data/error-taxonomy-db.json',
      mastery_policy_schema: 'data/mastery-policy-schema.json',
    },
    pattern_states: [],
    question_history: [],
    error_states: [],
    recommendation_state: {
      next_action: 'unknown',
    },
    mastery: {
      status: 'unknown',
      confidence: 'unknown',
      policy_version: MASTERY_POLICY_VERSION,
    },
    transition_history: [],
    mastery_policy_reference: {
      policy_id: 'WO-014.2',
      version: MASTERY_POLICY_VERSION,
      status: 'documented',
      schema_path: 'data/mastery-policy-schema.json',
      design_path: 'docs/mastery-calculation-policy.md',
    },
  };
}

/**
 * @param {string} studentId
 * @returns {object}
 */
export function loadLearningState(studentId = 'm1_demo_student') {
  const bag = getItem(STATE_STORE_KEY, { students: {} });
  const students = bag && bag.students ? bag.students : {};
  if (students[studentId]) return students[studentId];
  return createEmptyLearningState(studentId);
}

/**
 * @param {object} state
 * @returns {boolean}
 */
export function saveLearningState(state) {
  if (!state || !state.student_id) return false;
  const bag = getItem(STATE_STORE_KEY, { students: {} }) || { students: {} };
  if (!bag.students) bag.students = {};
  bag.students[state.student_id] = state;
  bag.updatedAt = new Date().toISOString();
  bag.milestone = 'M1';
  return setItem(STATE_STORE_KEY, bag);
}

function ensurePatternRow(state, patternId) {
  let row = state.pattern_states.find((p) => p.pattern_id === patternId);
  if (row) return row;
  row = {
    pattern_id: patternId,
    attempt_count: 0,
    correct_count: 0,
    wrong_count: 0,
    accuracy: null,
    mastery_status: 'unknown',
    mastery: {
      status: 'unknown',
      confidence: 'unknown',
      policy_version: MASTERY_POLICY_VERSION,
    },
    last_attempt_date: null,
  };
  state.pattern_states.push(row);
  return row;
}

/**
 * Apply one accepted AttemptEvent. Idempotent on event_id via applied_event_ids.
 * @param {object} state
 * @param {object} event
 * @returns {{ ok: boolean, state?: object, error?: string }}
 */
export function applyAttemptEvent(state, event) {
  if (!state || !event) return { ok: false, error: 'missing_state_or_event' };
  if (event.student_id !== state.student_id) {
    return { ok: false, error: 'student_id_mismatch' };
  }
  if (event.result !== 'correct' && event.result !== 'wrong') {
    return { ok: false, error: 'invalid_result' };
  }

  if (!Array.isArray(state._applied_event_ids)) {
    state._applied_event_ids = [];
  }
  if (state._applied_event_ids.includes(event.event_id)) {
    return { ok: false, error: 'duplicate_event_id' };
  }

  const next = structuredClone
    ? structuredClone(state)
    : JSON.parse(JSON.stringify(state));

  if (!Array.isArray(next._applied_event_ids)) next._applied_event_ids = [];
  next._applied_event_ids.push(event.event_id);

  next.learning_data_status = 'observed';
  next.updated_at = event.timestamp || new Date().toISOString();

  next.question_history.push({
    question_id: event.question_id,
    pattern_id: event.pattern_id,
    answer_result: event.result,
    timestamp: next.updated_at,
    error_id: null,
  });

  const row = ensurePatternRow(next, event.pattern_id);
  row.attempt_count += 1;
  if (event.result === 'correct') row.correct_count += 1;
  else row.wrong_count += 1;
  row.last_attempt_date = next.updated_at;
  const acc = row.correct_count / row.attempt_count;
  row.accuracy = acc;
  // M1 lock: never execute mastery policy
  row.mastery_status = 'unknown';
  row.mastery = {
    status: 'unknown',
    confidence: 'unknown',
    policy_version: MASTERY_POLICY_VERSION,
  };

  next.mastery = {
    status: 'unknown',
    confidence: 'unknown',
    policy_version: MASTERY_POLICY_VERSION,
  };
  next.recommendation_state = { next_action: 'unknown' };
  // error_states / transition_history untouched (no writes)

  return { ok: true, state: next };
}

/**
 * Persist after apply.
 * @param {object} state
 * @param {object} event
 * @returns {{ ok: boolean, state?: object, error?: string }}
 */
export function applyAndSaveAttemptEvent(state, event) {
  const applied = applyAttemptEvent(state, event);
  if (!applied.ok) return applied;
  const saved = saveLearningState(applied.state);
  if (!saved) return { ok: false, error: 'persist_failed' };
  return applied;
}

/**
 * Dashboard projection for one pattern (or first pattern_state).
 * @param {object} state
 * @param {string} [patternId]
 * @returns {object}
 */
export function projectDashboard(state, patternId) {
  const empty = {
    student_id: state?.student_id || null,
    learning_data_status: state?.learning_data_status || 'empty',
    pattern_id: patternId || null,
    pattern_name: null,
    attempt_count: 0,
    correct_count: 0,
    wrong_count: 0,
    observed_accuracy: null,
    mastery: 'unknown',
    recommendation: 'absent',
  };
  if (!state) return empty;
  const row = patternId
    ? state.pattern_states.find((p) => p.pattern_id === patternId)
    : state.pattern_states[0];
  if (!row) return { ...empty, student_id: state.student_id, learning_data_status: state.learning_data_status };
  return {
    student_id: state.student_id,
    learning_data_status: state.learning_data_status,
    pattern_id: row.pattern_id,
    attempt_count: row.attempt_count,
    correct_count: row.correct_count,
    wrong_count: row.wrong_count,
    observed_accuracy: row.observed_accuracy ?? row.accuracy,
    mastery: row.mastery?.status || row.mastery_status || 'unknown',
    recommendation: state.recommendation_state?.next_action === 'unknown' ? 'absent' : 'present',
  };
}

export default {
  createEmptyLearningState,
  loadLearningState,
  saveLearningState,
  applyAttemptEvent,
  applyAndSaveAttemptEvent,
  projectDashboard,
};
