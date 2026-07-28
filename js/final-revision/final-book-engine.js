/**
 * Sprint-18A — AI Final Revision Book Engine
 * Manual + auto (D-30/D-14/D-7/D-3/D-1). Never mutates DB / LE formulas.
 */

import { buildFinalRevisionBook } from './final-book-builder.js';
import {
  loadFinalBookDoc,
  saveFinalBookDoc,
  loadFinalFormulaDoc,
  saveFinalFormulaDoc,
} from './final-book-storage.js';
import {
  rankFormulas,
  shouldAutoGenerateFinalBook,
  getExamDaysRemaining,
} from './final-book-rank.js';
import {
  getCurrentSubjectId,
  SUBJECT_LABELS,
} from '../subject/subject-adapter.js';

export const FINAL_REVISION_VERSION = '19A';

function persistBook(book) {
  const subjectId = book.subjectId || getCurrentSubjectId();
  const doc = loadFinalBookDoc(subjectId);
  if (!Array.isArray(doc.books)) doc.books = [];
  doc.books.unshift(book);
  if (doc.books.length > 12) doc.books = doc.books.slice(0, 12);
  doc.activeId = book.id;
  saveFinalBookDoc(doc, subjectId);

  const formulas = rankFormulas();
  saveFinalFormulaDoc({
    schemaVersion: 'v1',
    subjectId,
    ranking: formulas.slice(0, 30),
    weakFormulas: formulas.filter((f) => f.wrong > 0).slice(0, 20),
    updatedAt: new Date().toISOString(),
  }, subjectId);

  return book;
}

/**
 * Manual: [시험 직전 AI 정리집 만들기]
 */
export function createFinalRevisionBook(opts = {}) {
  const subjectId = opts.subjectId || getCurrentSubjectId();
  const book = buildFinalRevisionBook({
    trigger: opts.trigger || 'manual',
    triggerDay: opts.triggerDay ?? null,
    subjectId,
  });
  persistBook(book);
  return { ok: true, book, subjectId };
}

/**
 * Auto generate when D-day matches 30/14/7/3/1.
 */
export function maybeAutoCreateFinalBook() {
  const doc = loadFinalBookDoc();
  const days = getExamDaysRemaining();
  const gate = shouldAutoGenerateFinalBook(doc.lastAutoTrigger, days);
  if (!gate.should) {
    return { ok: false, skipped: true, ...gate, daysRemaining: days };
  }
  const result = createFinalRevisionBook({
    trigger: 'auto',
    triggerDay: gate.day,
  });
  doc.lastAutoTrigger = {
    day: gate.day,
    date: new Date().toISOString().slice(0, 10),
    bookId: result.book?.id || null,
  };
  const latest = loadFinalBookDoc();
  latest.lastAutoTrigger = doc.lastAutoTrigger;
  saveFinalBookDoc(latest);
  return { ok: true, ...result, daysRemaining: days, auto: true };
}

export function getActiveFinalBook() {
  const doc = loadFinalBookDoc();
  if (!doc.activeId) return doc.books?.[0] || null;
  return (doc.books || []).find((b) => b.id === doc.activeId) || doc.books?.[0] || null;
}

export function listFinalBooks() {
  return loadFinalBookDoc().books || [];
}

export function getFinalBookDashboardCard() {
  const subjectId = getCurrentSubjectId();
  const book = getActiveFinalBook();
  const formulaDoc = loadFinalFormulaDoc(subjectId);
  return {
    id: 'finalRevisionBook',
    title: `${SUBJECT_LABELS[subjectId] || subjectId} Final Book`,
    subjectId,
    createdAt: book?.createdAt || null,
    pageCount: book?.pageCount || 0,
    weakPattern: book?.weakPatternRanking?.[0]?.patternName || '—',
    weakFormula: formulaDoc.weakFormulas?.[0]?.formula || book?.formulaRanking?.[0]?.formula || '—',
    lastUpdated: loadFinalBookDoc(subjectId).updatedAt || book?.createdAt || null,
    book,
  };
}

export default {
  FINAL_REVISION_VERSION,
  createFinalRevisionBook,
  maybeAutoCreateFinalBook,
  getActiveFinalBook,
  listFinalBooks,
  getFinalBookDashboardCard,
};
