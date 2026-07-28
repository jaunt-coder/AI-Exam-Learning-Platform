/**
 * Sprint-19A — Subject Registry
 * Auto-register subject plugins. Does not mutate Question / Pattern / Statistics DB.
 */

import {
  DEFAULT_SUBJECT_ID,
  SUBJECT_IDS,
  SUBJECT_LABELS,
  SUBJECT_FULL_NAMES,
  SUBJECT_PROMPT_ROLES,
  normalizeSubjectId,
  isKnownSubjectId,
} from './subject-config.js';

/** @type {Map<string, object>} */
const registry = new Map();

function buildBuiltinMeta(subjectId) {
  const id = normalizeSubjectId(subjectId);
  return {
    id,
    name: SUBJECT_FULL_NAMES[id] || id,
    shortName: SUBJECT_LABELS[id] || id,
    promptRole: SUBJECT_PROMPT_ROLES[id] || SUBJECT_PROMPT_ROLES[DEFAULT_SUBJECT_ID],
    enabled: true,
    status: id === DEFAULT_SUBJECT_ID ? 'active' : 'skeleton',
    order: SUBJECT_IDS.indexOf(id) + 1,
    examId: 'APPRAISER',
  };
}

/**
 * Register or update a subject plugin meta.
 * @param {object} subject
 */
export function registerSubject(subject = {}) {
  const id = normalizeSubjectId(subject.id || subject.subjectId);
  const base = buildBuiltinMeta(id);
  const entry = {
    ...base,
    ...subject,
    id,
    registeredAt: subject.registeredAt || new Date().toISOString(),
  };
  registry.set(id, entry);
  return entry;
}

/**
 * Ensure all known subjects are registered (idempotent).
 */
export function ensureBuiltinSubjectsRegistered() {
  for (const id of SUBJECT_IDS) {
    if (!registry.has(id)) {
      registerSubject(buildBuiltinMeta(id));
    }
  }
  return listSubjects();
}

/**
 * @param {string} subjectId
 */
export function getRegisteredSubject(subjectId) {
  ensureBuiltinSubjectsRegistered();
  const id = normalizeSubjectId(subjectId);
  return registry.get(id) || null;
}

/**
 * @returns {object[]}
 */
export function listSubjects() {
  ensureBuiltinSubjectsRegistered();
  return [...registry.values()].sort((a, b) => (a.order || 0) - (b.order || 0));
}

/**
 * @returns {object[]}
 */
export function listEnabledSubjects() {
  return listSubjects().filter((s) => s.enabled !== false);
}

/**
 * Merge loaded subject.json into registry.
 * @param {string} subjectId
 * @param {object} subjectJson
 */
export function hydrateSubjectFromJson(subjectId, subjectJson = {}) {
  const id = normalizeSubjectId(subjectId || subjectJson.id);
  return registerSubject({
    ...getRegisteredSubject(id),
    ...subjectJson,
    id,
    status: subjectJson.status || (id === DEFAULT_SUBJECT_ID ? 'active' : 'skeleton'),
    hydrated: true,
  });
}

export function clearSubjectRegistry() {
  registry.clear();
}

export {
  isKnownSubjectId,
  normalizeSubjectId,
  DEFAULT_SUBJECT_ID,
};

export default {
  registerSubject,
  ensureBuiltinSubjectsRegistered,
  getRegisteredSubject,
  listSubjects,
  listEnabledSubjects,
  hydrateSubjectFromJson,
  clearSubjectRegistry,
};
