/**
 * Sprint-13A — Student Learning Workspace storage
 */

import { getItem, setItem, STORAGE_KEYS } from '../storage.js';

export const STUDENT_KEYS = Object.freeze({
  SESSION:
    STORAGE_KEYS.LEARNING_STUDENT_SESSION_V1 || 'learning.student-session.v1',
  CACHE: STORAGE_KEYS.LEARNING_STUDENT_CACHE_V1 || 'learning.student-cache.v1',
});

function emptySession() {
  return {
    schemaVersion: 'v1',
    sprint: 'Sprint-13A',
    updatedAt: null,
    examSnapshots: {},
    lastExamSessionId: null,
  };
}

function emptyCache() {
  return {
    schemaVersion: 'v1',
    sprint: 'Sprint-13A',
    updatedAt: null,
    byQuestion: {},
  };
}

export function loadStudentSessionDoc() {
  const doc = getItem(STUDENT_KEYS.SESSION, null);
  if (!doc || typeof doc !== 'object') return emptySession();
  return {
    ...emptySession(),
    ...doc,
    examSnapshots:
      doc.examSnapshots && typeof doc.examSnapshots === 'object'
        ? doc.examSnapshots
        : {},
  };
}

export function saveStudentSessionDoc(doc) {
  const next = {
    ...(doc || loadStudentSessionDoc()),
    schemaVersion: 'v1',
    updatedAt: new Date().toISOString(),
  };
  return setItem(STUDENT_KEYS.SESSION, next);
}

export function loadStudentCacheDoc() {
  const doc = getItem(STUDENT_KEYS.CACHE, null);
  if (!doc || typeof doc !== 'object') return emptyCache();
  return {
    ...emptyCache(),
    ...doc,
    byQuestion: doc.byQuestion || {},
  };
}

export function saveStudentCacheDoc(doc) {
  const next = {
    ...(doc || loadStudentCacheDoc()),
    schemaVersion: 'v1',
    updatedAt: new Date().toISOString(),
  };
  return setItem(STUDENT_KEYS.CACHE, next);
}

export default {
  STUDENT_KEYS,
  loadStudentSessionDoc,
  saveStudentSessionDoc,
  loadStudentCacheDoc,
  saveStudentCacheDoc,
};
