/**
 * Sprint-18A — Textbook progress / dashboard metrics
 */

import {
  loadTextbookDoc,
  loadBookmarkDoc,
  loadSummaryDoc,
  loadFavoriteDoc,
} from './textbook-storage.js';
import { buildWeakCollection } from './textbook-builder.js';

export function countTextbookPages(doc) {
  const entries = Array.isArray(doc?.entries) ? doc.entries : loadTextbookDoc().entries || [];
  return entries.length;
}

export function getTextbookProgress() {
  const doc = loadTextbookDoc();
  const entries = Array.isArray(doc.entries) ? doc.entries : [];
  const bookmarks = loadBookmarkDoc().questionIds || [];
  const summaries = loadSummaryDoc();
  const favorites = loadFavoriteDoc().formulas || [];
  const weak = buildWeakCollection(entries);
  const patternSummaries = Object.keys(summaries.byPatternId || {}).length;
  const chapterSummaries = Object.keys(summaries.byChapter || {}).length;

  const sorted = [...entries].sort((a, b) =>
    String(b.at || '').localeCompare(String(a.at || '')),
  );

  return {
    pageCount: entries.length,
    savedQuestions: new Set(entries.map((e) => e.questionId).filter(Boolean)).size,
    bookmarkCount: bookmarks.length,
    favoriteFormulaCount: favorites.length,
    aiSummaryCount: patternSummaries + chapterSummaries,
    patternSummaryCount: patternSummaries,
    chapterSummaryCount: chapterSummaries,
    weakPatternCount: (weak.weakPatterns || []).length,
    weakFormulaCount: (weak.weakFormulas || []).length,
    topWeakPatterns: (weak.weakPatterns || []).slice(0, 5),
    topWeakFormulas: (weak.weakFormulas || []).slice(0, 5),
    lastUpdated: doc.updatedAt || sorted[0]?.at || null,
    correctCount: entries.filter((e) => e.correct).length,
    wrongCount: entries.filter((e) => !e.correct).length,
  };
}

export function getTextbookDashboardStats() {
  return getTextbookProgress();
}

export default {
  countTextbookPages,
  getTextbookProgress,
  getTextbookDashboardStats,
};
