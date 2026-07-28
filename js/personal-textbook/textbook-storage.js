/**
 * Sprint-18A — Personal AI Textbook Storage
 * Sprint-19A — Subject-scoped docs (Accounting / Economics / Civil / …)
 * Additive LocalStorage only. Never writes Question / Pattern / Statistics DB.
 * Storage key names unchanged.
 */

import { getItem, setItem, STORAGE_KEYS } from '../storage.js';
import {
  getCurrentSubjectId,
  DEFAULT_SUBJECT_ID,
  normalizeSubjectId,
} from '../subject/subject-adapter.js';

export const TEXTBOOK_SCHEMA = 'v1';

function touch(doc) {
  doc.updatedAt = new Date().toISOString();
  return doc;
}

function emptyBucket() {
  return {
    entries: [],
    pageCount: 0,
  };
}

function emptyTextbook() {
  return {
    schemaVersion: TEXTBOOK_SCHEMA,
    bySubject: {
      [DEFAULT_SUBJECT_ID]: emptyBucket(),
    },
    // legacy flat fields — migrated into bySubject.accounting
    entries: [],
    pageCount: 0,
    updatedAt: null,
  };
}

function emptyNotes() {
  return {
    schemaVersion: TEXTBOOK_SCHEMA,
    bySubject: {},
    byQuestionId: {},
    updatedAt: null,
  };
}

function emptySummaries() {
  return {
    schemaVersion: TEXTBOOK_SCHEMA,
    bySubject: {},
    byPatternId: {},
    byChapter: {},
    updatedAt: null,
  };
}

function emptyTags() {
  return {
    schemaVersion: TEXTBOOK_SCHEMA,
    bySubject: {},
    byQuestionId: {},
    catalog: [],
    updatedAt: null,
  };
}

function emptyBookmarks() {
  return {
    schemaVersion: TEXTBOOK_SCHEMA,
    bySubject: {},
    questionIds: [],
    updatedAt: null,
  };
}

function emptyFavorites() {
  return {
    schemaVersion: TEXTBOOK_SCHEMA,
    bySubject: {},
    formulas: [],
    updatedAt: null,
  };
}

function ensureBySubject(doc) {
  if (!doc.bySubject || typeof doc.bySubject !== 'object') {
    doc.bySubject = {};
  }
  // Migrate legacy flat entries → accounting once
  if (Array.isArray(doc.entries) && doc.entries.length) {
    const acc = doc.bySubject[DEFAULT_SUBJECT_ID] || emptyBucket();
    if (!acc.entries?.length) {
      acc.entries = doc.entries.map((e) => ({
        ...e,
        subjectId: e.subjectId || DEFAULT_SUBJECT_ID,
      }));
      acc.pageCount = acc.entries.length;
      doc.bySubject[DEFAULT_SUBJECT_ID] = acc;
    }
    doc.entries = [];
    doc.pageCount = 0;
  }
  return doc;
}

function subjectBucket(doc, subjectId) {
  ensureBySubject(doc);
  const id = normalizeSubjectId(subjectId || getCurrentSubjectId());
  if (!doc.bySubject[id]) {
    doc.bySubject[id] = emptyBucket();
  }
  return { id, bucket: doc.bySubject[id] };
}

export function loadTextbookDoc(subjectId) {
  const raw = getItem(STORAGE_KEYS.LEARNING_PERSONAL_TEXTBOOK_V1, emptyTextbook()) || emptyTextbook();
  ensureBySubject(raw);
  const { id, bucket } = subjectBucket(raw, subjectId);
  // Projection for legacy callers: entries/pageCount of current subject
  return {
    ...raw,
    subjectId: id,
    entries: bucket.entries || [],
    pageCount: bucket.pageCount || (bucket.entries || []).length,
  };
}

export function saveTextbookDoc(doc, subjectId) {
  const raw = getItem(STORAGE_KEYS.LEARNING_PERSONAL_TEXTBOOK_V1, emptyTextbook()) || emptyTextbook();
  ensureBySubject(raw);
  const { id } = subjectBucket(raw, subjectId || doc?.subjectId);
  const entries = Array.isArray(doc?.entries) ? doc.entries : [];
  raw.bySubject[id] = {
    entries,
    pageCount: entries.length,
  };
  raw.entries = [];
  raw.pageCount = 0;
  return setItem(STORAGE_KEYS.LEARNING_PERSONAL_TEXTBOOK_V1, touch(raw));
}

export function loadNoteDoc(subjectId) {
  const raw = getItem(STORAGE_KEYS.LEARNING_PERSONAL_NOTE_V1, emptyNotes()) || emptyNotes();
  if (!raw.bySubject) raw.bySubject = {};
  const id = normalizeSubjectId(subjectId || getCurrentSubjectId());
  const bucket = raw.bySubject[id] || { byQuestionId: raw.byQuestionId || {} };
  return { ...raw, subjectId: id, byQuestionId: bucket.byQuestionId || {} };
}

export function saveNoteDoc(doc, subjectId) {
  const raw = getItem(STORAGE_KEYS.LEARNING_PERSONAL_NOTE_V1, emptyNotes()) || emptyNotes();
  if (!raw.bySubject) raw.bySubject = {};
  const id = normalizeSubjectId(subjectId || doc?.subjectId || getCurrentSubjectId());
  raw.bySubject[id] = { byQuestionId: doc?.byQuestionId || {} };
  raw.byQuestionId = {};
  return setItem(STORAGE_KEYS.LEARNING_PERSONAL_NOTE_V1, touch(raw));
}

export function loadSummaryDoc(subjectId) {
  const raw = getItem(STORAGE_KEYS.LEARNING_PERSONAL_SUMMARY_V1, emptySummaries()) || emptySummaries();
  if (!raw.bySubject) raw.bySubject = {};
  const id = normalizeSubjectId(subjectId || getCurrentSubjectId());
  const bucket = raw.bySubject[id] || {
    byPatternId: raw.byPatternId || {},
    byChapter: raw.byChapter || {},
  };
  // one-time migrate
  if (!raw.bySubject[id] && (Object.keys(raw.byPatternId || {}).length || Object.keys(raw.byChapter || {}).length)) {
    raw.bySubject[id] = {
      byPatternId: raw.byPatternId || {},
      byChapter: raw.byChapter || {},
    };
    raw.byPatternId = {};
    raw.byChapter = {};
  }
  return {
    ...raw,
    subjectId: id,
    byPatternId: bucket.byPatternId || {},
    byChapter: bucket.byChapter || {},
  };
}

export function saveSummaryDoc(doc, subjectId) {
  const raw = getItem(STORAGE_KEYS.LEARNING_PERSONAL_SUMMARY_V1, emptySummaries()) || emptySummaries();
  if (!raw.bySubject) raw.bySubject = {};
  const id = normalizeSubjectId(subjectId || doc?.subjectId || getCurrentSubjectId());
  raw.bySubject[id] = {
    byPatternId: doc?.byPatternId || {},
    byChapter: doc?.byChapter || {},
  };
  raw.byPatternId = {};
  raw.byChapter = {};
  return setItem(STORAGE_KEYS.LEARNING_PERSONAL_SUMMARY_V1, touch(raw));
}

export function loadTagDoc(subjectId) {
  const raw = getItem(STORAGE_KEYS.LEARNING_PERSONAL_TAG_V1, emptyTags()) || emptyTags();
  if (!raw.bySubject) raw.bySubject = {};
  const id = normalizeSubjectId(subjectId || getCurrentSubjectId());
  const bucket = raw.bySubject[id] || {
    byQuestionId: raw.byQuestionId || {},
    catalog: raw.catalog || [],
  };
  return {
    ...raw,
    subjectId: id,
    byQuestionId: bucket.byQuestionId || {},
    catalog: bucket.catalog || [],
  };
}

export function saveTagDoc(doc, subjectId) {
  const raw = getItem(STORAGE_KEYS.LEARNING_PERSONAL_TAG_V1, emptyTags()) || emptyTags();
  if (!raw.bySubject) raw.bySubject = {};
  const id = normalizeSubjectId(subjectId || doc?.subjectId || getCurrentSubjectId());
  raw.bySubject[id] = {
    byQuestionId: doc?.byQuestionId || {},
    catalog: doc?.catalog || [],
  };
  raw.byQuestionId = {};
  raw.catalog = [];
  return setItem(STORAGE_KEYS.LEARNING_PERSONAL_TAG_V1, touch(raw));
}

export function loadBookmarkDoc(subjectId) {
  const raw = getItem(STORAGE_KEYS.LEARNING_PERSONAL_BOOKMARK_V1, emptyBookmarks()) || emptyBookmarks();
  if (!raw.bySubject) raw.bySubject = {};
  const id = normalizeSubjectId(subjectId || getCurrentSubjectId());
  const bucket = raw.bySubject[id] || { questionIds: raw.questionIds || [] };
  if (!raw.bySubject[id] && (raw.questionIds || []).length) {
    raw.bySubject[id] = { questionIds: raw.questionIds };
    raw.questionIds = [];
  }
  return {
    ...raw,
    subjectId: id,
    questionIds: bucket.questionIds || [],
  };
}

export function saveBookmarkDoc(doc, subjectId) {
  const raw = getItem(STORAGE_KEYS.LEARNING_PERSONAL_BOOKMARK_V1, emptyBookmarks()) || emptyBookmarks();
  if (!raw.bySubject) raw.bySubject = {};
  const id = normalizeSubjectId(subjectId || doc?.subjectId || getCurrentSubjectId());
  raw.bySubject[id] = { questionIds: doc?.questionIds || [] };
  raw.questionIds = [];
  return setItem(STORAGE_KEYS.LEARNING_PERSONAL_BOOKMARK_V1, touch(raw));
}

export function loadFavoriteDoc(subjectId) {
  const raw = getItem(STORAGE_KEYS.LEARNING_PERSONAL_FAVORITE_V1, emptyFavorites()) || emptyFavorites();
  if (!raw.bySubject) raw.bySubject = {};
  const id = normalizeSubjectId(subjectId || getCurrentSubjectId());
  const bucket = raw.bySubject[id] || { formulas: raw.formulas || [] };
  if (!raw.bySubject[id] && (raw.formulas || []).length) {
    raw.bySubject[id] = { formulas: raw.formulas };
    raw.formulas = [];
  }
  return {
    ...raw,
    subjectId: id,
    formulas: bucket.formulas || [],
  };
}

export function saveFavoriteDoc(doc, subjectId) {
  const raw = getItem(STORAGE_KEYS.LEARNING_PERSONAL_FAVORITE_V1, emptyFavorites()) || emptyFavorites();
  if (!raw.bySubject) raw.bySubject = {};
  const id = normalizeSubjectId(subjectId || doc?.subjectId || getCurrentSubjectId());
  raw.bySubject[id] = { formulas: doc?.formulas || [] };
  raw.formulas = [];
  return setItem(STORAGE_KEYS.LEARNING_PERSONAL_FAVORITE_V1, touch(raw));
}

export default {
  TEXTBOOK_SCHEMA,
  loadTextbookDoc,
  saveTextbookDoc,
  loadNoteDoc,
  saveNoteDoc,
  loadSummaryDoc,
  saveSummaryDoc,
  loadTagDoc,
  saveTagDoc,
  loadBookmarkDoc,
  saveBookmarkDoc,
  loadFavoriteDoc,
  saveFavoriteDoc,
};
