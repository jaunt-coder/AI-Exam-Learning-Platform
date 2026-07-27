/**
 * Sprint-12F — Reviewer Entry Integration
 * Connects existing Reviewer System to question / learning-loop screens.
 * Write path: saveOverride only. Student always sees Resolved Question.
 */

import {
  mountReviewToolbar,
  setEditButtonExpanded,
} from './review-toolbar.js';
import {
  openReviewModal,
  closeReviewModal,
  isReviewModalOpen,
} from './review-modal.js';
import { studentQuestionForDisplay } from '../student/student-workspace.js';

/**
 * Map study-loop compact question → Reviewer original shape.
 * @param {object} studyQuestion
 * @returns {object}
 */
export function toReviewOriginal(studyQuestion) {
  if (!studyQuestion || typeof studyQuestion !== 'object') return studyQuestion;
  const qid = studyQuestion.questionId || studyQuestion.id;
  return {
    ...studyQuestion,
    questionId: qid,
    question:
      studyQuestion.question ||
      studyQuestion.originalQuestion ||
      studyQuestion.stem ||
      '',
    originalQuestion:
      studyQuestion.originalQuestion ||
      studyQuestion.question ||
      studyQuestion.stem ||
      '',
    choices: Array.isArray(studyQuestion.choices) ? studyQuestion.choices : [],
    table: studyQuestion.table || '',
    solution: studyQuestion.solution || {},
    patternId:
      studyQuestion.patternId ||
      studyQuestion.mapping?.pattern_id ||
      null,
    source: studyQuestion.source || {},
  };
}

/**
 * Apply Resolved fields onto a study-loop question (stem/choices).
 * @param {object} studyQuestion
 * @param {object} resolved
 * @returns {object}
 */
export function applyResolvedToStudyQuestion(studyQuestion, resolved) {
  if (!studyQuestion) return studyQuestion;
  const r = resolved || {};
  return {
    ...studyQuestion,
    stem: r.question || r.originalQuestion || r.stem || studyQuestion.stem,
    choices: Array.isArray(r.choices) ? r.choices.slice() : studyQuestion.choices,
    patternId: r.patternId || studyQuestion.patternId,
  };
}

/**
 * Mount toolbar + wire Reviewer Modal for a page.
 * @param {{
 *   toolbarHost: HTMLElement|null,
 *   getOriginal: () => object|null,
 *   onResolved?: (resolved: object) => void,
 *   onApprove?: (resolved: object) => void,
 *   onReject?: () => void,
 *   onSkip?: () => void,
 *   onNext?: () => void,
 *   onAi?: () => void,
 *   onPdf?: () => void,
 * }} options
 */
export function mountReviewEntry(options = {}) {
  const host = options.toolbarHost;
  const original = typeof options.getOriginal === 'function'
    ? options.getOriginal()
    : null;
  const qid = original?.questionId || original?.id || '';

  const { editBtn } = mountReviewToolbar(host, {
    questionId: qid,
    onPdf: options.onPdf,
    onAi: options.onAi,
    onEdit: () => toggleReviewEntry(options, editBtn),
  });

  return { editBtn, open: () => openEntry(options, editBtn) };
}

function toggleReviewEntry(options, editBtn) {
  if (isReviewModalOpen()) {
    closeReviewModal();
    setEditButtonExpanded(editBtn, false);
    return;
  }
  openEntry(options, editBtn);
}

function openEntry(options, editBtn) {
  const raw =
    typeof options.getOriginal === 'function' ? options.getOriginal() : null;
  if (!raw) return null;
  const original = toReviewOriginal(raw);

  setEditButtonExpanded(editBtn, true);

  return openReviewModal({
    originalQuestion: original,
    onResolved: (resolved) => {
      /* Student display path — Resolved only */
      const student = studentQuestionForDisplay(original) || resolved;
      if (typeof options.onResolved === 'function') {
        options.onResolved(student, resolved);
      }
    },
    onApprove: (resolved) => {
      /* After saveOverride — re-resolve from original so student never sees raw override meta */
      const student = studentQuestionForDisplay(original) || resolved;
      if (typeof options.onApprove === 'function') {
        options.onApprove(student, resolved);
      } else if (typeof options.onResolved === 'function') {
        options.onResolved(student, resolved);
      }
      setEditButtonExpanded(editBtn, false);
    },
    onReject: () => {
      if (typeof options.onReject === 'function') options.onReject();
      setEditButtonExpanded(editBtn, false);
    },
    onSkip: () => {
      if (typeof options.onSkip === 'function') options.onSkip();
      setEditButtonExpanded(editBtn, false);
    },
    onNext: () => {
      if (typeof options.onNext === 'function') options.onNext();
      setEditButtonExpanded(editBtn, false);
    },
    onClose: () => {
      setEditButtonExpanded(editBtn, false);
    },
  });
}

/**
 * Convenience: resolve for student display after Approve.
 * @param {object} original
 * @returns {object}
 */
export function resolveForStudentDisplay(original) {
  return studentQuestionForDisplay(toReviewOriginal(original));
}

export default {
  mountReviewEntry,
  toReviewOriginal,
  applyResolvedToStudyQuestion,
  resolveForStudentDisplay,
  openReviewModal,
  closeReviewModal,
  isReviewModalOpen,
};
