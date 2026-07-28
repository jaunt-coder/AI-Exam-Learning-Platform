/**
 * Sprint-18A — Final Revision Book storage
 * Sprint-19A — Subject-scoped books (Accounting / Economics / Civil Final Book)
 * Additive LocalStorage only. Never writes DB / Override / LE formulas.
 * Storage key names unchanged.
 */

import { getItem, setItem, STORAGE_KEYS } from '../storage.js';
import {
  getCurrentSubjectId,
  DEFAULT_SUBJECT_ID,
  normalizeSubjectId,
} from '../subject/subject-adapter.js';

export const FINAL_BOOK_SCHEMA = 'v1';

function touch(doc) {
  doc.updatedAt = new Date().toISOString();
  return doc;
}

function emptyBucket() {
  return {
    books: [],
    activeId: null,
    lastAutoTrigger: null,
  };
}

function emptyBook() {
  return {
    schemaVersion: FINAL_BOOK_SCHEMA,
    bySubject: {
      [DEFAULT_SUBJECT_ID]: emptyBucket(),
    },
    books: [],
    activeId: null,
    lastAutoTrigger: null,
    updatedAt: null,
  };
}

function emptySummary() {
  return {
    schemaVersion: FINAL_BOOK_SCHEMA,
    bySubject: {},
    condensed: null,
    aiFinalSummary: null,
    history: [],
    updatedAt: null,
  };
}

function emptyFormula() {
  return {
    schemaVersion: FINAL_BOOK_SCHEMA,
    bySubject: {},
    ranking: [],
    weakFormulas: [],
    updatedAt: null,
  };
}

function ensureBySubject(doc) {
  if (!doc.bySubject || typeof doc.bySubject !== 'object') {
    doc.bySubject = {};
  }
  if (Array.isArray(doc.books) && doc.books.length) {
    const acc = doc.bySubject[DEFAULT_SUBJECT_ID] || emptyBucket();
    if (!acc.books?.length) {
      acc.books = doc.books.map((b) => ({
        ...b,
        subjectId: b.subjectId || DEFAULT_SUBJECT_ID,
      }));
      acc.activeId = doc.activeId || acc.books[0]?.id || null;
      acc.lastAutoTrigger = doc.lastAutoTrigger || null;
      doc.bySubject[DEFAULT_SUBJECT_ID] = acc;
    }
    doc.books = [];
    doc.activeId = null;
    doc.lastAutoTrigger = null;
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

export function loadFinalBookDoc(subjectId) {
  const raw = getItem(STORAGE_KEYS.LEARNING_FINAL_BOOK_V1, emptyBook()) || emptyBook();
  ensureBySubject(raw);
  const { id, bucket } = subjectBucket(raw, subjectId);
  return {
    ...raw,
    subjectId: id,
    books: bucket.books || [],
    activeId: bucket.activeId || null,
    lastAutoTrigger: bucket.lastAutoTrigger || null,
  };
}

export function saveFinalBookDoc(doc, subjectId) {
  const raw = getItem(STORAGE_KEYS.LEARNING_FINAL_BOOK_V1, emptyBook()) || emptyBook();
  ensureBySubject(raw);
  const { id } = subjectBucket(raw, subjectId || doc?.subjectId);
  raw.bySubject[id] = {
    books: Array.isArray(doc?.books) ? doc.books : [],
    activeId: doc?.activeId || null,
    lastAutoTrigger: doc?.lastAutoTrigger || null,
  };
  raw.books = [];
  raw.activeId = null;
  raw.lastAutoTrigger = null;
  return setItem(STORAGE_KEYS.LEARNING_FINAL_BOOK_V1, touch(raw));
}

export function loadFinalSummaryDoc(subjectId) {
  const raw = getItem(STORAGE_KEYS.LEARNING_FINAL_SUMMARY_V1, emptySummary()) || emptySummary();
  if (!raw.bySubject) raw.bySubject = {};
  const id = normalizeSubjectId(subjectId || getCurrentSubjectId());
  const bucket = raw.bySubject[id] || {
    condensed: raw.condensed,
    aiFinalSummary: raw.aiFinalSummary,
    history: raw.history || [],
  };
  if (!raw.bySubject[id] && (raw.condensed || raw.aiFinalSummary)) {
    raw.bySubject[id] = {
      condensed: raw.condensed,
      aiFinalSummary: raw.aiFinalSummary,
      history: raw.history || [],
    };
    raw.condensed = null;
    raw.aiFinalSummary = null;
    raw.history = [];
  }
  return {
    ...raw,
    subjectId: id,
    condensed: bucket.condensed ?? null,
    aiFinalSummary: bucket.aiFinalSummary ?? null,
    history: bucket.history || [],
  };
}

export function saveFinalSummaryDoc(doc, subjectId) {
  const raw = getItem(STORAGE_KEYS.LEARNING_FINAL_SUMMARY_V1, emptySummary()) || emptySummary();
  if (!raw.bySubject) raw.bySubject = {};
  const id = normalizeSubjectId(subjectId || doc?.subjectId || getCurrentSubjectId());
  raw.bySubject[id] = {
    condensed: doc?.condensed ?? null,
    aiFinalSummary: doc?.aiFinalSummary ?? null,
    history: doc?.history || [],
  };
  raw.condensed = null;
  raw.aiFinalSummary = null;
  raw.history = [];
  return setItem(STORAGE_KEYS.LEARNING_FINAL_SUMMARY_V1, touch(raw));
}

export function loadFinalFormulaDoc(subjectId) {
  const raw = getItem(STORAGE_KEYS.LEARNING_FINAL_FORMULA_V1, emptyFormula()) || emptyFormula();
  if (!raw.bySubject) raw.bySubject = {};
  const id = normalizeSubjectId(subjectId || getCurrentSubjectId());
  const bucket = raw.bySubject[id] || {
    ranking: raw.ranking || [],
    weakFormulas: raw.weakFormulas || [],
  };
  if (!raw.bySubject[id] && ((raw.ranking || []).length || (raw.weakFormulas || []).length)) {
    raw.bySubject[id] = {
      ranking: raw.ranking || [],
      weakFormulas: raw.weakFormulas || [],
    };
    raw.ranking = [];
    raw.weakFormulas = [];
  }
  return {
    ...raw,
    subjectId: id,
    ranking: bucket.ranking || [],
    weakFormulas: bucket.weakFormulas || [],
  };
}

export function saveFinalFormulaDoc(doc, subjectId) {
  const raw = getItem(STORAGE_KEYS.LEARNING_FINAL_FORMULA_V1, emptyFormula()) || emptyFormula();
  if (!raw.bySubject) raw.bySubject = {};
  const id = normalizeSubjectId(subjectId || doc?.subjectId || getCurrentSubjectId());
  raw.bySubject[id] = {
    ranking: doc?.ranking || [],
    weakFormulas: doc?.weakFormulas || [],
  };
  raw.ranking = [];
  raw.weakFormulas = [];
  return setItem(STORAGE_KEYS.LEARNING_FINAL_FORMULA_V1, touch(raw));
}

export default {
  FINAL_BOOK_SCHEMA,
  loadFinalBookDoc,
  saveFinalBookDoc,
  loadFinalSummaryDoc,
  saveFinalSummaryDoc,
  loadFinalFormulaDoc,
  saveFinalFormulaDoc,
};
