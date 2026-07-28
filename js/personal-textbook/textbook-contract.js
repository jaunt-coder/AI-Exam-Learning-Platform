/**
 * Sprint-18A — Personal Textbook / Final Book validators (contract helpers)
 */

export function validationPersonalTextbook(doc) {
  const errors = [];
  if (!doc || typeof doc !== 'object') {
    return { ok: false, errors: ['missing-doc'] };
  }
  if (!Array.isArray(doc.entries)) errors.push('entries-not-array');
  for (const e of doc.entries || []) {
    if (!e.questionId) errors.push('entry-missing-questionId');
    if (typeof e.correct !== 'boolean') errors.push('entry-correct-not-boolean');
  }
  return { ok: errors.length === 0, errors };
}

export function validationFinalRevisionBook(book) {
  const errors = [];
  if (!book || typeof book !== 'object') {
    return { ok: false, errors: ['missing-book'] };
  }
  if (!Array.isArray(book.sections) || book.sections.length < 10) {
    errors.push('sections-lt-10');
  }
  if (book.predictionForbidden !== true) errors.push('prediction-must-be-forbidden');
  if (!book.examDaySheet) errors.push('missing-exam-day-sheet');
  if (!book.memorySheet) errors.push('missing-memory-sheet');
  return { ok: errors.length === 0, errors };
}

export const personalTextbookContract = Object.freeze({
  enabled: true,
  schemaVersion: 'v1',
  sprint: 'Sprint-18A',
  servicePath: 'js/personal-textbook/textbook-engine.js',
  storageKeys: [
    'learning.personal-textbook.v1',
    'learning.personal-note.v1',
    'learning.personal-summary.v1',
    'learning.personal-tag.v1',
    'learning.personal-bookmark.v1',
    'learning.personal-favorite.v1',
  ],
  autoSaveOnSubmit: true,
  dbWriteForbidden: true,
});

export const personalSummaryContract = Object.freeze({
  enabled: true,
  schemaVersion: 'v1',
  minPatternSolves: 3,
  versionHistoryKept: true,
  deleteForbidden: true,
});

export const personalExportContract = Object.freeze({
  enabled: true,
  formats: ['pdf', 'markdown', 'html'],
});

export const personalBookmarkContract = Object.freeze({
  enabled: true,
  storageKey: 'learning.personal-bookmark.v1',
  favoriteFormulaKey: 'learning.personal-favorite.v1',
});

export const finalRevisionBookContract = Object.freeze({
  enabled: true,
  schemaVersion: 'v1',
  sprint: 'Sprint-18A',
  servicePath: 'js/final-revision/final-book-engine.js',
  storageKeys: [
    'learning.final-book.v1',
    'learning.final-summary.v1',
    'learning.final-formula.v1',
  ],
  autoDays: [30, 14, 7, 3, 1],
  predictionForbidden: true,
  condensedPayloadOnly: true,
  dbWriteForbidden: true,
});

export const finalSummaryContract = Object.freeze({
  enabled: true,
  condensedFields: [
    'weakPattern',
    'weakFormula',
    'recentMistake',
    'mastery',
    'goal',
    'examDate',
    'reviewCycle',
  ],
  fullTextbookForbidden: true,
});

export default {
  validationPersonalTextbook,
  validationFinalRevisionBook,
  personalTextbookContract,
  personalSummaryContract,
  personalExportContract,
  personalBookmarkContract,
  finalRevisionBookContract,
  finalSummaryContract,
};
