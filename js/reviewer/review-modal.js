/**
 * Sprint-12F — Review Entry Modal
 * Left: OCR / Table / Choices / Pattern / Solution (via Reviewer Panel)
 * Right: Preview / AI / History / Approve / Reject / Skip
 */

import {
  openReviewerPanel,
  closeReviewerPanel,
} from './review-ui.js';
import {
  loadDraft,
  saveDraft,
  clearDraft,
  startDraftAutosave,
  stopDraftAutosave,
} from './review-draft.js';
import {
  bindReviewShortcuts,
  unbindReviewShortcuts,
  saveReviewUiState,
} from './review-shortcut.js';
import { resolveQuestion } from './override-service.js';

let activeController = null;
let previousFocus = null;

function ensureModalRoot() {
  let root = document.getElementById('review-entry-modal');
  if (root) return root;
  root = document.createElement('div');
  root.id = 'review-entry-modal';
  root.className = 'rv-entry-modal';
  root.hidden = true;
  root.setAttribute('aria-hidden', 'true');
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', 'Reviewer Entry');
  root.innerHTML = `
    <div class="rv-entry-modal__backdrop" data-rv-entry="backdrop"></div>
    <div class="rv-entry-modal__dialog">
      <header class="rv-entry-modal__header">
        <div>
          <h2 class="rv-entry-modal__title">Reviewer</h2>
          <p class="rv-entry-modal__desc">Override Layer only · Question DB Read Only</p>
        </div>
        <button type="button" class="button button--ghost" data-rv-entry="close" aria-label="닫기">닫기</button>
      </header>
      <div class="rv-entry-modal__body">
        <div class="rv-entry-modal__left" id="review-entry-panel-host"></div>
        <aside class="rv-entry-modal__right" aria-label="Preview and decisions">
          <section class="rv-entry-side-card">
            <h3>Preview</h3>
            <div id="review-entry-preview" class="rv-entry-preview" aria-live="polite"></div>
          </section>
          <section class="rv-entry-side-card">
            <h3>AI Suggestion</h3>
            <p class="rv-entry-hint">왼쪽 AI Recovery 탭에서 Current → Suggestion → Diff → Approve</p>
          </section>
          <section class="rv-entry-side-card">
            <h3>History</h3>
            <p class="rv-entry-hint">왼쪽 History 탭에서 버전·Undo 확인</p>
          </section>
          <div class="rv-entry-decisions" role="group" aria-label="Review decisions">
            <button type="button" class="button button--primary" data-rv-entry="approve">Approve</button>
            <button type="button" class="button button--ghost" data-rv-entry="reject">Reject</button>
            <button type="button" class="button button--ghost" data-rv-entry="skip">Skip</button>
            <button type="button" class="button button--ghost" data-rv-entry="next">Next</button>
          </div>
          <p class="rv-entry-keys" aria-hidden="true">Ctrl+S 저장 · Ctrl+Enter Approve · Esc 닫기</p>
        </aside>
      </div>
    </div>
  `;
  document.body.appendChild(root);
  return root;
}

function refreshPreview(panelHost, original) {
  const preview = document.getElementById('review-entry-preview');
  if (!preview) return;
  try {
    const text =
      panelHost?.querySelector('#rv-question-text')?.value ||
      original?.question ||
      original?.originalQuestion ||
      '';
    const resolved = resolveQuestion({
      ...original,
      question: text,
      originalQuestion: text,
    });
    preview.textContent = resolved?.question || text || '(empty)';
  } catch (_err) {
    preview.textContent = '(preview unavailable)';
  }
}

/**
 * Open Reviewer Entry Modal.
 * @param {{
 *   originalQuestion: object,
 *   onResolved?: (resolved: object) => void,
 *   onApprove?: (resolved: object) => void,
 *   onReject?: () => void,
 *   onSkip?: () => void,
 *   onNext?: () => void,
 *   onClose?: () => void,
 * }} options
 */
export function openReviewModal(options = {}) {
  const original = options.originalQuestion;
  if (!original) return null;

  closeReviewModal({ silent: true });

  const root = ensureModalRoot();
  const panelHost = root.querySelector('#review-entry-panel-host');
  if (!panelHost) return null;

  previousFocus = document.activeElement;
  root.hidden = false;
  root.setAttribute('aria-hidden', 'false');
  document.body.classList.add('rv-entry-modal-open');
  panelHost.className = 'rv-panel rv-panel--embedded';
  panelHost.removeAttribute('hidden');
  panelHost.setAttribute('aria-hidden', 'false');

  const qid = original.questionId || original.id;
  const draft = loadDraft(qid);
  const seeded = draft
    ? {
        ...original,
        question: draft.question ?? original.question,
        originalQuestion: draft.question ?? original.originalQuestion,
        table: draft.table !== undefined ? draft.table : original.table,
        choices: Array.isArray(draft.choices) ? draft.choices : original.choices,
        solution: draft.solution
          ? { ...(original.solution || {}), ...draft.solution }
          : original.solution,
      }
    : original;

  const controller = openReviewerPanel({
    panelEl: panelHost,
    originalQuestion: seeded,
    entryMode: true,
    onResolved: (resolved) => {
      refreshPreview(panelHost, original);
      if (typeof options.onResolved === 'function') options.onResolved(resolved);
    },
    onApprove: (resolved) => {
      clearDraft(qid);
      if (typeof options.onApprove === 'function') options.onApprove(resolved);
      else if (typeof options.onResolved === 'function') options.onResolved(resolved);
      closeReviewModal();
    },
    onReject: () => {
      if (typeof options.onReject === 'function') options.onReject();
      closeReviewModal();
    },
    onSkip: () => {
      if (typeof options.onSkip === 'function') options.onSkip();
      closeReviewModal();
    },
    onNext: () => {
      if (typeof options.onNext === 'function') options.onNext();
      closeReviewModal();
    },
  });

  activeController = controller;

  const closeBtn = root.querySelector('[data-rv-entry="close"]');
  const backdrop = root.querySelector('[data-rv-entry="backdrop"]');
  closeBtn?.addEventListener('click', () => {
    saveDraftSnapshot();
    if (typeof options.onClose === 'function') options.onClose();
    closeReviewModal();
  });
  backdrop?.addEventListener('click', () => {
    saveDraftSnapshot();
    if (typeof options.onClose === 'function') options.onClose();
    closeReviewModal();
  });

  root.querySelector('[data-rv-entry="approve"]')?.addEventListener('click', () => {
    panelHost.querySelector('[data-act="approve"]')?.click();
  });
  root.querySelector('[data-rv-entry="reject"]')?.addEventListener('click', () => {
    panelHost.querySelector('[data-act="reject"]')?.click();
  });
  root.querySelector('[data-rv-entry="skip"]')?.addEventListener('click', () => {
    panelHost.querySelector('[data-act="skip"]')?.click();
  });
  root.querySelector('[data-rv-entry="next"]')?.addEventListener('click', () => {
    panelHost.querySelector('[data-act="next"]')?.click();
  });

  panelHost.querySelector('#rv-question-text')?.addEventListener('input', () => {
    refreshPreview(panelHost, original);
  });
  refreshPreview(panelHost, original);

  panelHost.querySelector('[data-act="close"]')?.addEventListener('click', () => {
    saveDraftSnapshot();
    if (typeof options.onClose === 'function') options.onClose();
    closeReviewModal();
  });

  startDraftAutosave(qid, () => controller?.getDraftSnapshot?.() || null);

  bindReviewShortcuts({
    root: document,
    onSave: () => {
      controller?.save?.();
      saveDraftSnapshot();
    },
    onApprove: () => {
      panelHost.querySelector('[data-act="approve"]')?.click();
    },
    onClose: () => {
      saveDraftSnapshot();
      if (typeof options.onClose === 'function') options.onClose();
      closeReviewModal();
    },
  });

  saveReviewUiState({ open: true, questionId: qid });
  closeBtn?.focus();

  function saveDraftSnapshot() {
    try {
      const snap = controller?.getDraftSnapshot?.();
      if (snap) saveDraft(qid, snap);
    } catch (_err) {
      /* ignore */
    }
  }

  return controller;
}

/**
 * @param {{ silent?: boolean }} [opts]
 */
export function closeReviewModal(opts = {}) {
  stopDraftAutosave();
  unbindReviewShortcuts();

  const root = document.getElementById('review-entry-modal');
  const panelHost = root?.querySelector('#review-entry-panel-host');
  if (panelHost) closeReviewerPanel(panelHost);
  if (root) {
    root.hidden = true;
    root.setAttribute('aria-hidden', 'true');
  }
  document.body.classList.remove('rv-entry-modal-open');
  activeController = null;
  saveReviewUiState({ open: false });

  if (!opts.silent && previousFocus && typeof previousFocus.focus === 'function') {
    try {
      previousFocus.focus();
    } catch (_err) {
      /* ignore */
    }
  }
  previousFocus = null;
}

export function isReviewModalOpen() {
  const root = document.getElementById('review-entry-modal');
  return Boolean(root && !root.hidden);
}

export function getActiveReviewController() {
  return activeController;
}

export default {
  openReviewModal,
  closeReviewModal,
  isReviewModalOpen,
  getActiveReviewController,
};
