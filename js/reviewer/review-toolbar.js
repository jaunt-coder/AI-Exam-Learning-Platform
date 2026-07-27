/**
 * Sprint-12F — Review Entry Toolbar
 * [PDF] [AI] [수정] + Report Issue (기존 문제 수정 요청 유지)
 */

import { openSourceNavigator } from '../source-viewer.js';
import { openProblemReportModal } from '../problem-report.js';

/**
 * @param {HTMLElement|null} host
 * @param {{
 *   questionId?: string,
 *   onPdf?: () => void,
 *   onAi?: () => void,
 *   onEdit?: () => void,
 *   onReport?: () => void,
 *   editExpanded?: boolean,
 * }} options
 * @returns {{ pdfBtn: HTMLButtonElement|null, aiBtn: HTMLButtonElement|null, editBtn: HTMLButtonElement|null, reportBtn: HTMLButtonElement|null }}
 */
export function mountReviewToolbar(host, options = {}) {
  if (!host) {
    return { pdfBtn: null, aiBtn: null, editBtn: null, reportBtn: null };
  }

  const qid = options.questionId || '';
  host.classList.add('rv-entry-toolbar');
  host.setAttribute('role', 'toolbar');
  host.setAttribute('aria-label', '문제 도구');
  host.innerHTML = `
    <button type="button" class="button button--ghost button--touch rv-entry-btn" data-rv-tool="pdf" title="원본 PDF">
      PDF
    </button>
    <button type="button" class="button button--ghost button--touch rv-entry-btn" data-rv-tool="ai" title="AI Tutor">
      AI
    </button>
    <button type="button" class="button button--ghost button--touch rv-entry-btn rv-entry-btn--edit" data-rv-tool="edit"
      aria-expanded="${options.editExpanded ? 'true' : 'false'}" title="OCR / 문항 수정">
      수정
    </button>
    <button type="button" class="button button--ghost button--touch rv-entry-btn rv-entry-btn--report" data-rv-tool="report"
      title="문제 수정 요청 (Report Issue)" ${qid ? '' : 'disabled'}>
      Report Issue
    </button>
  `;

  const pdfBtn = host.querySelector('[data-rv-tool="pdf"]');
  const aiBtn = host.querySelector('[data-rv-tool="ai"]');
  const editBtn = host.querySelector('[data-rv-tool="edit"]');
  const reportBtn = host.querySelector('[data-rv-tool="report"]');

  pdfBtn?.addEventListener('click', () => {
    if (typeof options.onPdf === 'function') {
      options.onPdf();
      return;
    }
    if (qid) openSourceNavigator(qid);
  });

  aiBtn?.addEventListener('click', () => {
    if (typeof options.onAi === 'function') {
      options.onAi();
      return;
    }
    if (qid) {
      window.location.href = `ai-tutor.html?question=${encodeURIComponent(qid)}`;
    }
  });

  editBtn?.addEventListener('click', () => {
    if (typeof options.onEdit === 'function') options.onEdit();
  });

  reportBtn?.addEventListener('click', () => {
    if (typeof options.onReport === 'function') {
      options.onReport();
      return;
    }
    if (qid) openProblemReportModal(qid);
  });

  return { pdfBtn, aiBtn, editBtn, reportBtn };
}

/**
 * @param {HTMLElement|null} editBtn
 * @param {boolean} expanded
 */
export function setEditButtonExpanded(editBtn, expanded) {
  if (!editBtn) return;
  editBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  editBtn.classList.toggle('is-active', Boolean(expanded));
}

export default {
  mountReviewToolbar,
  setEditButtonExpanded,
};
