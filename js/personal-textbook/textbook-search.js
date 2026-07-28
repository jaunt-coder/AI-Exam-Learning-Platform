/**
 * Sprint-18A — Personal Textbook search & filters
 */

import { loadTextbookDoc, loadBookmarkDoc, loadFavoriteDoc, loadSummaryDoc } from './textbook-storage.js';
import { buildWeakCollection } from './textbook-builder.js';
import { listTagsForQuestion } from './textbook-tag.js';

export const FILTERS = Object.freeze({
  ALL: 'all',
  CORRECT: 'correct',
  WRONG: 'wrong',
  REVIEW: 'review',
  FAVORITE: 'favorite',
  WEAK: 'weak',
  RECENT: 'recent',
});

function haystack(entry) {
  return [
    entry.questionId,
    entry.patternId,
    entry.patternName,
    entry.chapter,
    entry.geminiExplanation,
    entry.mistakeDiagnosis,
    entry.tutorAdvice,
    entry.prescription,
    ...(entry.calculation || []),
    ...(entry.thinkingOrder || []),
    ...(entry.whyOthersWrong || []),
    ...(entry.formula || []),
    ...(entry.memoryHack || []),
    ...(entry.examTip || []),
    ...(entry.tags || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

/**
 * @param {string} query
 * @param {{ filter?: string, field?: string }} [opts]
 */
export function searchTextbook(query = '', opts = {}) {
  const doc = loadTextbookDoc();
  let entries = Array.isArray(doc.entries) ? [...doc.entries] : [];
  const q = String(query || '').trim().toLowerCase();
  const field = opts.field || 'all';

  if (q) {
    entries = entries.filter((e) => {
      if (field === 'pattern') {
        return `${e.patternId || ''} ${e.patternName || ''}`.toLowerCase().includes(q);
      }
      if (field === 'question') {
        return String(e.questionId || '').toLowerCase().includes(q);
      }
      if (field === 'formula') {
        return (e.formula || []).join(' ').toLowerCase().includes(q);
      }
      if (field === 'examTip') {
        return (e.examTip || []).join(' ').toLowerCase().includes(q);
      }
      if (field === 'keyword') {
        return haystack(e).includes(q);
      }
      return haystack(e).includes(q);
    });
  }

  return filterTextbook(entries, opts.filter || FILTERS.ALL);
}

export function filterTextbook(entries, filter = FILTERS.ALL) {
  const list = Array.isArray(entries) ? entries : [];
  const bookmarks = new Set(loadBookmarkDoc().questionIds || []);
  const favorites = loadFavoriteDoc().formulas || [];
  const favSet = new Set(favorites.map((f) => (typeof f === 'string' ? f : f.formula)));
  const weak = buildWeakCollection(loadTextbookDoc().entries || []);
  const weakPatterns = new Set((weak.weakPatterns || []).map((p) => p.patternId));
  const weekAgo = Date.now() - 14 * 86400000;

  switch (filter) {
    case FILTERS.CORRECT:
      return list.filter((e) => e.correct);
    case FILTERS.WRONG:
      return list.filter((e) => !e.correct);
    case FILTERS.REVIEW:
      return list.filter((e) => !e.correct || bookmarks.has(e.questionId));
    case FILTERS.FAVORITE:
      return list.filter(
        (e) =>
          bookmarks.has(e.questionId)
          || (e.formula || []).some((f) => favSet.has(f)),
      );
    case FILTERS.WEAK:
      return list.filter((e) => !e.correct || weakPatterns.has(e.patternId));
    case FILTERS.RECENT:
      return list
        .filter((e) => {
          const t = Date.parse(e.at || e.date || '');
          return Number.isFinite(t) ? t >= weekAgo : true;
        })
        .sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
    default:
      return list;
  }
}

export function getPatternTree(entries) {
  const src = Array.isArray(entries) ? entries : loadTextbookDoc().entries || [];
  const tree = new Map();
  for (const e of src) {
    const chapter = e.chapter || '미분류';
    if (!tree.has(chapter)) tree.set(chapter, new Map());
    const patterns = tree.get(chapter);
    const pid = e.patternId || 'unknown';
    if (!patterns.has(pid)) {
      patterns.set(pid, {
        patternId: pid,
        patternName: e.patternName || pid,
        count: 0,
        wrong: 0,
      });
    }
    const node = patterns.get(pid);
    node.count += 1;
    if (!e.correct) node.wrong += 1;
  }
  return [...tree.entries()].map(([chapter, patterns]) => ({
    chapter,
    patterns: [...patterns.values()].sort((a, b) => b.count - a.count),
  }));
}

export function enrichEntryMeta(entry) {
  if (!entry) return null;
  const bookmarks = new Set(loadBookmarkDoc().questionIds || []);
  const summaries = loadSummaryDoc();
  return {
    ...entry,
    bookmarked: bookmarks.has(entry.questionId),
    tags: listTagsForQuestion(entry.questionId),
    patternSummary: summaries.byPatternId?.[entry.patternId] || null,
    chapterSummary: summaries.byChapter?.[entry.chapter] || null,
  };
}

export default {
  FILTERS,
  searchTextbook,
  filterTextbook,
  getPatternTree,
  enrichEntryMeta,
};
