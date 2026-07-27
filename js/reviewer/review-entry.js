/**
 * Sprint-12F — Reviewer Entry Integration
 * Connects existing Reviewer System to question / learning-loop screens.
 * Write path: saveOverride only. Student always sees Resolved Question.
 */

import {
  setEditButtonExpanded,
  renderReviewToolbar as renderToolbarButtons,
} from './review-toolbar.js';
import {
  openReviewModal,
  closeReviewModal,
  isReviewModalOpen,
} from './review-modal.js';
import { studentQuestionForDisplay } from '../student/student-workspace.js';
import { invalidateStudentCache } from '../student/student-resolver.js';

const TOOLBAR_HOST_ID = 'review-entry-toolbar';
const LOG_PREFIX = '[ReviewEntry]';

/** @type {object|null} */
let pageOptions = null;
/** @type {object|null} */
let lastQuestion = null;

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
    hasTable:
      studyQuestion.hasTable !== undefined
        ? Boolean(studyQuestion.hasTable)
        : Boolean(studyQuestion.table),
    solution: studyQuestion.solution || {},
    patternId:
      studyQuestion.patternId ||
      studyQuestion.mapping?.pattern_id ||
      null,
    answer: studyQuestion.answer,
    answerIndex: studyQuestion.answerIndex,
    source: studyQuestion.source || {},
  };
}

/**
 * Apply full Resolved fields onto a study-loop question.
 * Copies table / choices / solution / pattern / question (and answer).
 * @param {object} studyQuestion
 * @param {object} resolved
 * @returns {object}
 */
export function applyResolvedToStudyQuestion(studyQuestion, resolved) {
  if (!studyQuestion) return studyQuestion;
  const r = resolved || {};
  const questionText =
    r.question || r.originalQuestion || r.stem || studyQuestion.stem || '';
  const table = r.table !== undefined ? r.table : studyQuestion.table;
  return {
    ...studyQuestion,
    question: questionText,
    originalQuestion: r.originalQuestion || questionText,
    stem: questionText,
    choices: Array.isArray(r.choices) ? r.choices.slice() : studyQuestion.choices,
    table,
    hasTable:
      r.hasTable !== undefined
        ? Boolean(r.hasTable)
        : table
          ? true
          : Boolean(studyQuestion.hasTable),
    solution:
      r.solution !== undefined && r.solution !== null
        ? typeof r.solution === 'object'
          ? { ...r.solution }
          : r.solution
        : studyQuestion.solution,
    patternId: r.patternId || studyQuestion.patternId,
    answer: r.answer !== undefined ? r.answer : studyQuestion.answer,
    answerIndex:
      r.answerIndex !== undefined ? r.answerIndex : studyQuestion.answerIndex,
  };
}

/**
 * Fresh student resolve after Override write (bust cache).
 * @param {object} original
 * @returns {object|null}
 */
export function resolveFreshForStudent(original) {
  const base = toReviewOriginal(original);
  const qid = base?.questionId || base?.id;
  if (qid) invalidateStudentCache(qid);
  return studentQuestionForDisplay(base, { useCache: false });
}

/**
 * Ensure toolbar host exists in DOM (create if missing).
 * @param {string} [hostId]
 * @returns {HTMLElement|null}
 */
export function ensureToolbarHost(hostId = TOOLBAR_HOST_ID) {
  let host = document.getElementById(hostId);
  if (host) {
    host.hidden = false;
    host.removeAttribute('aria-hidden');
    host.classList.remove('visually-hidden');
    return host;
  }

  const solveHeader =
    document.querySelector('#panel-question .study-card__header') ||
    document.querySelector('#question-solve-section .question-meta-row') ||
    document.querySelector('#question-solve-section header') ||
    document.querySelector('#panel-question');

  if (!solveHeader) {
    console.warn(`${LOG_PREFIX} toolbar host not found and no header to attach`);
    return null;
  }

  let toolbarWrap = solveHeader.querySelector('.question-toolbar');
  if (!toolbarWrap) {
    toolbarWrap = document.createElement('div');
    toolbarWrap.className = 'question-toolbar ll-question-toolbar';
    solveHeader.appendChild(toolbarWrap);
  }

  host = document.createElement('div');
  host.id = hostId;
  host.className = 'rv-entry-toolbar';
  host.setAttribute('aria-label', '문제 도구');
  toolbarWrap.prepend(host);
  console.log(`${LOG_PREFIX} created missing #${hostId}`);
  return host;
}

/**
 * Render [PDF] [AI] [수정] for a question. Always runs after question render.
 * @param {object|null} question
 * @param {object} [options] — merges with pageOptions from initReviewEntry
 * @returns {{ pdfBtn: HTMLElement|null, aiBtn: HTMLElement|null, editBtn: HTMLElement|null, reportBtn: HTMLElement|null, host: HTMLElement|null }}
 */
export function renderReviewToolbar(question, options = {}) {
  const merged = {
    ...(pageOptions || {}),
    ...options,
    getOriginal:
      options.getOriginal ||
      pageOptions?.getOriginal ||
      (() => toReviewOriginal(question || lastQuestion)),
  };

  lastQuestion = question || lastQuestion;

  const host =
    merged.toolbarHost ||
    ensureToolbarHost(merged.toolbarHostId || TOOLBAR_HOST_ID);

  if (!host) {
    console.warn(`${LOG_PREFIX} Review Toolbar Mount FAILED — no host`);
    return {
      pdfBtn: null,
      aiBtn: null,
      editBtn: null,
      reportBtn: null,
      host: null,
    };
  }

  const original =
    typeof merged.getOriginal === 'function'
      ? merged.getOriginal()
      : toReviewOriginal(question);
  const qid = original?.questionId || original?.id || question?.questionId || '';

  const buttons = renderToolbarButtons(host, {
    questionId: qid,
    onPdf: merged.onPdf,
    onAi: merged.onAi,
    onEdit: () => toggleReviewEntry(merged, null),
    onReport: merged.onReport,
  });

  /* Rebind edit with actual editBtn reference */
  if (buttons.editBtn) {
    const fresh = buttons.editBtn.cloneNode(true);
    buttons.editBtn.replaceWith(fresh);
    buttons.editBtn = fresh;
    fresh.addEventListener('click', () => toggleReviewEntry(merged, fresh));
  }

  host.dataset.reviewToolbarMounted = 'true';
  host.dataset.questionId = qid || '';
  console.log('Review Toolbar Mounted', {
    questionId: qid,
    hostId: host.id,
    buttons: ['PDF', 'AI', '수정', 'Report Issue'],
  });

  return { ...buttons, host };
}

/**
 * Alias used by pages — mount entry + toolbar for current question context.
 * @param {object} options
 */
export function mountReviewEntry(options = {}) {
  pageOptions = { ...(pageOptions || {}), ...options };
  const question =
    typeof options.getOriginal === 'function'
      ? options.getOriginal()
      : lastQuestion;
  const result = renderReviewToolbar(question, options);
  return {
    editBtn: result.editBtn,
    open: () => openEntry(pageOptions, result.editBtn),
    host: result.host,
  };
}

/**
 * DOM Ready init — register page callbacks and mount empty/ready toolbar shell.
 * Must run after DOM is ready.
 * @param {object} [options]
 */
export function initReviewEntry(options = {}) {
  const run = () => {
    pageOptions = { ...(pageOptions || {}), ...options };
    const host = ensureToolbarHost(options.toolbarHostId || TOOLBAR_HOST_ID);
    if (host && !host.dataset.reviewToolbarMounted) {
      /* Mount visible shell immediately so buttons exist before first question */
      renderReviewToolbar(null, {
        ...pageOptions,
        getOriginal: () =>
          typeof pageOptions.getOriginal === 'function'
            ? pageOptions.getOriginal()
            : lastQuestion
              ? toReviewOriginal(lastQuestion)
              : { questionId: '', question: '', choices: [] },
      });
    }
    console.log(`${LOG_PREFIX} initReviewEntry ready`, {
      host: Boolean(host),
      page: document.body?.dataset?.page || location.pathname,
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }

  return { renderReviewToolbar, mountReviewEntry, openReviewModal };
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
    typeof options.getOriginal === 'function' ? options.getOriginal() : lastQuestion;
  if (!raw || !(raw.questionId || raw.id || raw.stem || raw.question)) {
    console.warn(`${LOG_PREFIX} openEntry: no question context`);
    return null;
  }
  const original = toReviewOriginal(raw);

  setEditButtonExpanded(editBtn, true);

  return openReviewModal({
    originalQuestion: original,
    onResolved: (resolved) => {
      const student = resolveFreshForStudent(original) || resolved;
      if (typeof options.onResolved === 'function') {
        options.onResolved(student, resolved);
      }
      console.log(`${LOG_PREFIX} resolved rerender`, original.questionId);
    },
    onApprove: (resolved) => {
      const student = resolveFreshForStudent(original) || resolved;
      console.log(`${LOG_PREFIX} Approve → saveOverride applied`, original.questionId);
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
 * @param {object} original
 * @returns {object}
 */
export function resolveForStudentDisplay(original) {
  return studentQuestionForDisplay(toReviewOriginal(original), { useCache: false });
}

export default {
  initReviewEntry,
  renderReviewToolbar,
  mountReviewEntry,
  toReviewOriginal,
  applyResolvedToStudyQuestion,
  resolveFreshForStudent,
  resolveForStudentDisplay,
  ensureToolbarHost,
  openReviewModal,
  closeReviewModal,
  isReviewModalOpen,
};
