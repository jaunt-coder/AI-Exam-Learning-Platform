/**
 * Sprint-18A — Textbook UI session (left tree / center content / right notes)
 */

import { getItem, setItem } from '../storage.js';

const SESSION_KEY = 'learning.personal-textbook-session.v1';

function emptySession() {
  return {
    schemaVersion: 'v1',
    selectedChapter: null,
    selectedPatternId: null,
    selectedQuestionId: null,
    filter: 'all',
    query: '',
    rightPanel: 'note',
    updatedAt: null,
  };
}

export function loadTextbookSession() {
  const raw = getItem(SESSION_KEY, emptySession());
  return raw && typeof raw === 'object' ? { ...emptySession(), ...raw } : emptySession();
}

export function saveTextbookSession(partial = {}) {
  const next = {
    ...emptySession(),
    ...loadTextbookSession(),
    ...partial,
    updatedAt: new Date().toISOString(),
  };
  setItem(SESSION_KEY, next);
  return next;
}

export function selectTextbookEntry({ chapter, patternId, questionId } = {}) {
  return saveTextbookSession({
    selectedChapter: chapter ?? null,
    selectedPatternId: patternId ?? null,
    selectedQuestionId: questionId ?? null,
  });
}

export default {
  loadTextbookSession,
  saveTextbookSession,
  selectTextbookEntry,
};
