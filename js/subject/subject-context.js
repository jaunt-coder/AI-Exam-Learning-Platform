/**
 * Sprint-19A — Subject Context
 * Current subject + learning/student context for prompt composition.
 * Storage: learning.current-subject.v1 / learning.subject-config.v1 / learning.subject-history.v1
 */

import { getItem, setItem, STORAGE_KEYS } from '../storage.js';
import {
  DEFAULT_SUBJECT_ID,
  SUBJECT_PROMPT_ROLES,
  normalizeSubjectId,
} from './subject-config.js';
import {
  ensureBuiltinSubjectsRegistered,
  getRegisteredSubject,
  listSubjects,
} from './subject-registry.js';
import { getLoadedSubject, loadSubject } from './subject-loader.js';

function emptyCurrent() {
  return {
    schemaVersion: 'v1',
    subjectId: DEFAULT_SUBJECT_ID,
    updatedAt: null,
  };
}

function emptyConfig() {
  return {
    schemaVersion: 'v1',
    subjects: {},
    updatedAt: null,
  };
}

function emptyHistory() {
  return {
    schemaVersion: 'v1',
    events: [],
    updatedAt: null,
  };
}

export function loadCurrentSubjectDoc() {
  const key = STORAGE_KEYS.LEARNING_CURRENT_SUBJECT_V1;
  return getItem(key, emptyCurrent()) || emptyCurrent();
}

export function saveCurrentSubjectDoc(doc) {
  return setItem(STORAGE_KEYS.LEARNING_CURRENT_SUBJECT_V1, {
    ...(doc || emptyCurrent()),
    updatedAt: new Date().toISOString(),
  });
}

export function loadSubjectConfigDoc() {
  return getItem(STORAGE_KEYS.LEARNING_SUBJECT_CONFIG_V1, emptyConfig()) || emptyConfig();
}

export function saveSubjectConfigDoc(doc) {
  return setItem(STORAGE_KEYS.LEARNING_SUBJECT_CONFIG_V1, {
    ...(doc || emptyConfig()),
    updatedAt: new Date().toISOString(),
  });
}

export function loadSubjectHistoryDoc() {
  return getItem(STORAGE_KEYS.LEARNING_SUBJECT_HISTORY_V1, emptyHistory()) || emptyHistory();
}

export function saveSubjectHistoryDoc(doc) {
  return setItem(STORAGE_KEYS.LEARNING_SUBJECT_HISTORY_V1, {
    ...(doc || emptyHistory()),
    updatedAt: new Date().toISOString(),
  });
}

/**
 * @returns {string}
 */
export function getCurrentSubjectId() {
  ensureBuiltinSubjectsRegistered();
  const doc = loadCurrentSubjectDoc();
  return normalizeSubjectId(doc.subjectId);
}

/**
 * Persist current subject id (does not load plugin).
 * Prefer switchSubject() from subject-router for full switch.
 * @param {string} subjectId
 */
export function setCurrentSubjectId(subjectId) {
  const id = normalizeSubjectId(subjectId);
  const prev = getCurrentSubjectId();
  saveCurrentSubjectDoc({ schemaVersion: 'v1', subjectId: id });

  const history = loadSubjectHistoryDoc();
  if (!Array.isArray(history.events)) history.events = [];
  history.events.unshift({
    from: prev,
    to: id,
    at: new Date().toISOString(),
  });
  if (history.events.length > 50) history.events = history.events.slice(0, 50);
  saveSubjectHistoryDoc(history);

  const cfg = loadSubjectConfigDoc();
  if (!cfg.subjects) cfg.subjects = {};
  cfg.subjects[id] = {
    ...(cfg.subjects[id] || {}),
    lastSelectedAt: new Date().toISOString(),
  };
  saveSubjectConfigDoc(cfg);

  return id;
}

/**
 * @returns {object}
 */
export function getCurrentSubject() {
  const id = getCurrentSubjectId();
  return getRegisteredSubject(id) || getLoadedSubject(id).subject;
}

/**
 * Full runtime subject context for engines / prompt builder.
 * @param {object} [extra]
 */
export function buildSubjectContext(extra = {}) {
  const id = normalizeSubjectId(extra.subjectId || getCurrentSubjectId());
  const plugin = getLoadedSubject(id);
  const meta = getRegisteredSubject(id) || plugin.subject;

  return {
    subjectId: id,
    subject: meta,
    promptRole: meta.promptRole || SUBJECT_PROMPT_ROLES[id],
    promptMd: plugin.promptMd,
    formulaDb: plugin.formulaDb,
    memoryConfig: plugin.memoryConfig,
    patternConfig: plugin.patternConfig,
    learningContext: extra.learningContext || null,
    studentContext: extra.studentContext || null,
    resolvedQuestion: extra.resolvedQuestion || null,
  };
}

/**
 * Compact learning context (pass-through only — LE formulas unchanged).
 * @param {object} [raw]
 */
export function buildLearningContext(raw = {}) {
  return {
    subjectId: normalizeSubjectId(raw.subjectId || getCurrentSubjectId()),
    patternId: raw.patternId || null,
    mastery: raw.mastery ?? null,
    weakness: raw.weakness ?? null,
    recommendation: raw.recommendation ?? null,
    reviewDue: raw.reviewDue ?? null,
  };
}

/**
 * Compact student context.
 * @param {object} [raw]
 */
export function buildStudentContext(raw = {}) {
  return {
    studentId: raw.studentId || 'local-student',
    examDate: raw.examDate || null,
    goalScore: raw.goalScore ?? null,
    readiness: raw.readiness ?? null,
    streak: raw.streak ?? null,
  };
}

/**
 * Ensure plugin for current subject is loaded (async).
 */
export async function ensureCurrentSubjectLoaded() {
  const id = getCurrentSubjectId();
  return loadSubject(id);
}

export function listSubjectOptions() {
  return listSubjects().map((s) => ({
    id: s.id,
    label: s.shortName || s.name,
    name: s.name,
    status: s.status,
    enabled: s.enabled !== false,
  }));
}

export default {
  getCurrentSubjectId,
  setCurrentSubjectId,
  getCurrentSubject,
  buildSubjectContext,
  buildLearningContext,
  buildStudentContext,
  ensureCurrentSubjectLoaded,
  listSubjectOptions,
  loadCurrentSubjectDoc,
  loadSubjectConfigDoc,
  loadSubjectHistoryDoc,
};
