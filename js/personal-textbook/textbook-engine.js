/**
 * Sprint-18A — Personal AI Textbook Engine
 * Auto-saves after Student Solve → Result → AI Explanation.
 * Never writes Question / Pattern / Statistics DB.
 * Never changes Learning Engine / Recommendation / Mastery formulas.
 */

import {
  loadTextbookDoc,
  saveTextbookDoc,
  loadSummaryDoc,
  saveSummaryDoc,
  loadBookmarkDoc,
  saveBookmarkDoc,
  loadFavoriteDoc,
  saveFavoriteDoc,
  loadNoteDoc,
  saveNoteDoc,
} from './textbook-storage.js';
import {
  buildTextbookEntry,
  buildPatternSummary,
  buildChapterSummary,
  buildWeakCollection,
} from './textbook-builder.js';
import { getTextbookDashboardStats } from './textbook-progress.js';
import { setTags, listTagsForQuestion } from './textbook-tag.js';
import {
  getCurrentSubjectId,
  resolveSubjectIdForQuestion,
  SUBJECT_LABELS,
} from '../subject/subject-adapter.js';

export const PERSONAL_TEXTBOOK_VERSION = '19A';

function upsertEntry(doc, entry) {
  if (!Array.isArray(doc.entries)) doc.entries = [];
  const idx = doc.entries.findIndex(
    (e) => e.questionId && entry.questionId && e.questionId === entry.questionId,
  );
  if (idx >= 0) {
    const prev = doc.entries[idx];
    doc.entries[idx] = {
      ...prev,
      ...entry,
      id: prev.id || entry.id,
      bookmarked: prev.bookmarked || entry.bookmarked,
      tags: entry.tags?.length ? entry.tags : prev.tags,
    };
  } else {
    doc.entries.push(entry);
  }
  doc.pageCount = doc.entries.length;
  return doc;
}

function refreshSummaries(doc) {
  const summaries = loadSummaryDoc();
  if (!summaries.byPatternId) summaries.byPatternId = {};
  if (!summaries.byChapter) summaries.byChapter = {};

  const byPattern = new Map();
  const byChapter = new Map();
  for (const e of doc.entries || []) {
    if (e.patternId) {
      if (!byPattern.has(e.patternId)) byPattern.set(e.patternId, []);
      byPattern.get(e.patternId).push(e);
    }
    if (e.chapter) {
      if (!byChapter.has(e.chapter)) byChapter.set(e.chapter, []);
      byChapter.get(e.chapter).push(e);
    }
  }

  for (const [pid, list] of byPattern) {
    if (list.length < 3) continue;
    const next = buildPatternSummary(pid, list, summaries.byPatternId[pid] || null);
    if (next) summaries.byPatternId[pid] = next;
  }

  for (const [ch, list] of byChapter) {
    const next = buildChapterSummary(ch, list, summaries.byChapter[ch] || null);
    if (next) summaries.byChapter[ch] = next;
  }

  saveSummaryDoc(summaries);
  return summaries;
}

/**
 * Auto-save one Result into Personal AI Textbook.
 * Called after AI explanation is available (Smart Tutor / Gemini).
 */
export function autoSaveTextbookEntry(ctx = {}) {
  const subjectId =
    ctx.subjectId
    || resolveSubjectIdForQuestion(ctx.question || {})
    || getCurrentSubjectId();
  const entry = buildTextbookEntry({ ...ctx, subjectId });
  if (!entry.questionId) {
    return { ok: false, reason: 'missing-questionId', entry: null };
  }
  entry.subjectId = subjectId;

  const doc = loadTextbookDoc(subjectId);
  upsertEntry(doc, entry);
  saveTextbookDoc(doc, subjectId);

  const summaries = refreshSummaries(doc);
  const weak = buildWeakCollection(doc.entries);

  return {
    ok: true,
    entry,
    subjectId,
    pageCount: doc.pageCount,
    summaries,
    weak,
    autoSaved: true,
    version: PERSONAL_TEXTBOOK_VERSION,
  };
}

/**
 * Enrich an existing entry after Gemini finishes (human-level fields).
 */
export function updateTextbookWithGemini(ctx = {}) {
  return autoSaveTextbookEntry(ctx);
}

export function toggleBookmark(questionId) {
  if (!questionId) return { bookmarked: false };
  const doc = loadBookmarkDoc();
  const ids = Array.isArray(doc.questionIds) ? [...doc.questionIds] : [];
  const i = ids.indexOf(questionId);
  let bookmarked;
  if (i >= 0) {
    ids.splice(i, 1);
    bookmarked = false;
  } else {
    ids.push(questionId);
    bookmarked = true;
  }
  doc.questionIds = ids;
  saveBookmarkDoc(doc);

  const book = loadTextbookDoc();
  const entry = (book.entries || []).find((e) => e.questionId === questionId);
  if (entry) {
    entry.bookmarked = bookmarked;
    saveTextbookDoc(book);
  }
  return { bookmarked, questionIds: ids };
}

export function isBookmarked(questionId) {
  const ids = loadBookmarkDoc().questionIds || [];
  return ids.includes(questionId);
}

export function toggleFavoriteFormula(formula, meta = {}) {
  const text = String(formula || '').trim();
  if (!text) return { favorited: false, formulas: [] };
  const doc = loadFavoriteDoc();
  const list = Array.isArray(doc.formulas) ? [...doc.formulas] : [];
  const idx = list.findIndex((f) => (typeof f === 'string' ? f : f.formula) === text);
  let favorited;
  if (idx >= 0) {
    list.splice(idx, 1);
    favorited = false;
  } else {
    list.push({
      formula: text,
      patternId: meta.patternId || null,
      questionId: meta.questionId || null,
      at: new Date().toISOString(),
    });
    favorited = true;
  }
  doc.formulas = list;
  saveFavoriteDoc(doc);
  return { favorited, formulas: list };
}

export function savePersonalNote(questionId, text) {
  if (!questionId) return null;
  const doc = loadNoteDoc();
  if (!doc.byQuestionId) doc.byQuestionId = {};
  doc.byQuestionId[questionId] = {
    text: String(text ?? ''),
    updatedAt: new Date().toISOString(),
  };
  saveNoteDoc(doc);
  return doc.byQuestionId[questionId];
}

export function getPersonalNote(questionId) {
  if (!questionId) return null;
  return loadNoteDoc().byQuestionId?.[questionId] || null;
}

export function listTextbookEntries() {
  return loadTextbookDoc().entries || [];
}

export function getTextbookEntry(questionId) {
  return (loadTextbookDoc().entries || []).find((e) => e.questionId === questionId) || null;
}

export function getWeakCollection() {
  return buildWeakCollection(loadTextbookDoc().entries || []);
}

export function getSummaryHistory(patternId) {
  const s = loadSummaryDoc().byPatternId?.[patternId];
  if (!s) return [];
  const hist = Array.isArray(s.history) ? s.history : [];
  return [...hist, { version: s.version, body: s.body, at: s.updatedAt, current: true }];
}

export function getTextbookDashboardCard() {
  const stats = getTextbookDashboardStats();
  const subjectId = getCurrentSubjectId();
  return {
    id: 'personalTextbook',
    title: `Personal Textbook · ${SUBJECT_LABELS[subjectId] || subjectId}`,
    subjectId,
    pageCount: stats.pageCount,
    savedQuestions: stats.savedQuestions,
    bookmarks: stats.bookmarkCount,
    aiSummary: stats.aiSummaryCount,
    weakPattern: stats.topWeakPatterns?.[0]?.patternName || '—',
    lastUpdated: stats.lastUpdated,
    stats,
  };
}

export {
  setTags,
  listTagsForQuestion,
  getTextbookDashboardStats,
  buildWeakCollection,
};

export default {
  PERSONAL_TEXTBOOK_VERSION,
  autoSaveTextbookEntry,
  updateTextbookWithGemini,
  toggleBookmark,
  isBookmarked,
  toggleFavoriteFormula,
  savePersonalNote,
  getPersonalNote,
  listTextbookEntries,
  getTextbookEntry,
  getWeakCollection,
  getSummaryHistory,
  getTextbookDashboardCard,
  getTextbookDashboardStats,
};
