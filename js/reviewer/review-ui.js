/**
 * Sprint-12A — Reviewer Mode Panel UI
 */

import { REVIEW_FLAGS, REVIEW_STATUSES } from './review-storage.js';
import {
  getOverride,
  saveOverride,
  resolveQuestion,
  hasOverride,
} from './override-service.js';
import {
  getReviewRecord,
  upsertReviewRecord,
  getQuestionBadge,
  exportReviewPack,
  importReviewPack,
} from './review-service.js';
import { getReviewHistory, undoReview } from './review-history.js';
import { createTableEditor } from './table-editor.js';
import { createChoiceEditor } from './choice-editor.js';
import { createPatternEditor } from './pattern-editor.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Render badge into host element.
 * @param {HTMLElement|null} host
 * @param {object} question
 */
export function renderQuestionBadge(host, question) {
  if (!host) return;
  const badge = getQuestionBadge(question);
  host.innerHTML = `<span class="rv-badge rv-badge--${badge.tone}" title="Review status">${escapeHtml(badge.label)}</span>`;
}

/**
 * Mount Reviewer toggle button (top-right).
 * @param {HTMLElement|null} host
 * @param {() => void} onClick
 */
export function mountReviewerButton(host, onClick) {
  if (!host) return null;
  host.innerHTML = '';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'reviewer-mode-btn';
  btn.className = 'button button--ghost button--touch rv-reviewer-btn';
  btn.textContent = 'Reviewer';
  btn.setAttribute('aria-expanded', 'false');
  btn.addEventListener('click', () => {
    if (typeof onClick === 'function') onClick();
  });
  host.appendChild(btn);
  return btn;
}

/**
 * Open / manage Reviewer panel for a question.
 * @param {{
 *   panelEl: HTMLElement,
 *   originalQuestion: object,
 *   onResolved?: (resolved: object) => void,
 * }} options
 */
export function openReviewerPanel(options = {}) {
  const panel = options.panelEl;
  const original = options.originalQuestion;
  if (!panel || !original) return;

  const qid = original.questionId || original.id;
  let draftText = '';
  let draftTable = '';
  let draftChoices = Array.isArray(original.choices)
    ? original.choices.slice()
    : [];
  let draftSolution = '';
  let draftFlags = [];
  let draftStatus = 'REVIEWED';
  let draftNote = '';
  let patternEditor = null;

  const ov = getOverride(qid);
  const review = getReviewRecord(qid);
  draftText =
    ov?.override?.question ??
    original.question ??
    original.originalQuestion ??
    '';
  draftTable =
    ov?.override?.table !== undefined
      ? ov.override.table
      : original.table || '';
  draftChoices = Array.isArray(ov?.override?.choices)
    ? ov.override.choices.slice()
    : Array.isArray(original.choices)
      ? original.choices.slice()
      : [];
  draftSolution =
    ov?.override?.solution?.explanation ||
    ov?.override?.solution?.summary ||
    original.solution?.explanation ||
    original.solution?.summary ||
    '';
  draftFlags = Array.isArray(review.flags) ? review.flags.slice() : [];
  draftStatus = review.status || 'REVIEWED';
  draftNote = review.note || '';

  const source = original.source || {};
  const pdfLink = source.sourceFile
    ? String(source.sourceFile)
    : '';

  panel.hidden = false;
  panel.setAttribute('aria-hidden', 'false');

  const flagChecks = REVIEW_FLAGS.map(
    (f) => `
    <label class="rv-flag">
      <input type="checkbox" data-flag="${f}" ${draftFlags.includes(f) ? 'checked' : ''}>
      <span>${f}</span>
    </label>`,
  ).join('');

  const statusOptions = REVIEW_STATUSES.map(
    (s) =>
      `<option value="${s}" ${s === draftStatus ? 'selected' : ''}>${s}</option>`,
  ).join('');

  panel.innerHTML = `
    <div class="rv-panel-header">
      <h3>Reviewer Mode</h3>
      <p class="rv-panel-desc">Override Layer only · Question DB Read Only</p>
      <button type="button" class="button button--ghost" data-act="close" aria-label="닫기">닫기</button>
    </div>

    <div class="rv-tabs" role="tablist">
      <button type="button" class="rv-tab is-active" data-tab="text">문제</button>
      <button type="button" class="rv-tab" data-tab="table">표</button>
      <button type="button" class="rv-tab" data-tab="choices">보기</button>
      <button type="button" class="rv-tab" data-tab="solution">해설</button>
      <button type="button" class="rv-tab" data-tab="pattern">Pattern</button>
      <button type="button" class="rv-tab" data-tab="source">PDF</button>
      <button type="button" class="rv-tab" data-tab="flags">Flags</button>
      <button type="button" class="rv-tab" data-tab="history">History</button>
    </div>

    <div class="rv-tab-panels">
      <section class="rv-tab-panel is-active" data-panel="text">
        <label class="rv-field">
          <span>Question Text / OCR 수정</span>
          <textarea id="rv-question-text" rows="8">${escapeHtml(draftText)}</textarea>
        </label>
        <div class="rv-preview" id="rv-text-preview" aria-live="polite"></div>
      </section>

      <section class="rv-tab-panel" data-panel="table" hidden>
        <div id="rv-table-editor"></div>
      </section>

      <section class="rv-tab-panel" data-panel="choices" hidden>
        <div id="rv-choice-editor"></div>
      </section>

      <section class="rv-tab-panel" data-panel="solution">
        <label class="rv-field">
          <span>Solution Override</span>
          <textarea id="rv-solution-text" rows="6">${escapeHtml(draftSolution)}</textarea>
        </label>
      </section>

      <section class="rv-tab-panel" data-panel="pattern" hidden>
        <div id="rv-pattern-editor"></div>
      </section>

      <section class="rv-tab-panel" data-panel="source" hidden>
        <dl class="rv-dl">
          <div><dt>Question Source</dt><dd>${escapeHtml(source.sourceKind || source.type || '—')}</dd></div>
          <div><dt>Page</dt><dd>${escapeHtml(source.page ?? '—')}</dd></div>
          <div><dt>Question Number</dt><dd>${escapeHtml(source.questionNumber ?? '—')}</dd></div>
          <div><dt>Year</dt><dd>${escapeHtml(source.year ?? original.year ?? '—')}</dd></div>
          <div><dt>원본 PDF</dt><dd>${
            pdfLink
              ? `<a href="${escapeHtml(pdfLink)}" target="_blank" rel="noopener">${escapeHtml(pdfLink)}</a>`
              : '—'
          }</dd></div>
        </dl>
      </section>

      <section class="rv-tab-panel" data-panel="flags" hidden>
        <label class="rv-field">
          <span>Review Status</span>
          <select id="rv-status">${statusOptions}</select>
        </label>
        <div class="rv-flags">${flagChecks}</div>
        <label class="rv-field">
          <span>Reviewer Note (Markdown)</span>
          <textarea id="rv-note" rows="5" placeholder="메모">${escapeHtml(draftNote)}</textarea>
        </label>
        <div class="rv-preview rv-md-preview" id="rv-note-preview"></div>
      </section>

      <section class="rv-tab-panel" data-panel="history" hidden>
        <div id="rv-history-list"></div>
        <div class="rv-actions">
          <button type="button" class="button button--ghost" data-act="undo">Undo 마지막 수정</button>
          <button type="button" class="button button--ghost" data-act="export">Export Override JSON</button>
          <label class="button button--ghost rv-import-label">
            Import Override JSON
            <input type="file" id="rv-import-file" accept="application/json,.json" hidden>
          </label>
        </div>
      </section>
    </div>

    <div class="rv-panel-footer">
      <button type="button" class="button button--primary" data-act="save">Override 저장</button>
      <button type="button" class="button button--ghost" data-act="apply-preview">Preview 적용</button>
    </div>
  `;

  const textArea = panel.querySelector('#rv-question-text');
  const textPreview = panel.querySelector('#rv-text-preview');
  const solutionArea = panel.querySelector('#rv-solution-text');
  const statusSelect = panel.querySelector('#rv-status');
  const noteArea = panel.querySelector('#rv-note');
  const notePreview = panel.querySelector('#rv-note-preview');

  const refreshTextPreview = () => {
    if (textPreview) {
      textPreview.textContent = textArea?.value || '';
    }
  };
  textArea?.addEventListener('input', () => {
    draftText = textArea.value;
    refreshTextPreview();
  });
  refreshTextPreview();

  const refreshNotePreview = () => {
    if (notePreview) {
      notePreview.innerHTML = simpleMarkdown(noteArea?.value || '');
    }
  };
  noteArea?.addEventListener('input', () => {
    draftNote = noteArea.value;
    refreshNotePreview();
  });
  refreshNotePreview();

  const tableEditor = createTableEditor({
    initialTable: draftTable,
    onChange: (md) => {
      draftTable = md;
    },
  });
  tableEditor.mount(panel.querySelector('#rv-table-editor'));

  const choiceEditor = createChoiceEditor({
    initialChoices: draftChoices,
    onChange: (list) => {
      draftChoices = list;
    },
  });
  choiceEditor.mount(panel.querySelector('#rv-choice-editor'));

  patternEditor = createPatternEditor({
    questionId: qid,
    currentPatternId: original.patternId,
    onChange: () => {},
  });
  patternEditor.mount(panel.querySelector('#rv-pattern-editor'));

  function renderHistory() {
    const host = panel.querySelector('#rv-history-list');
    if (!host) return;
    const hist = getReviewHistory(qid);
    if (!hist.length) {
      host.innerHTML = '<p class="rv-empty">History 없음</p>';
      return;
    }
    host.innerHTML = `
      <ul class="rv-history">
        ${hist
          .slice()
          .reverse()
          .map(
            (h) => `
          <li>
            <strong>v${h.version}</strong>
            · ${escapeHtml(h.reviewer || 'local')}
            · ${escapeHtml(h.time || '')}
            · ${escapeHtml((h.changedFields || []).join(', ') || '—')}
          </li>`,
          )
          .join('')}
      </ul>`;
  }
  renderHistory();

  panel.querySelectorAll('.rv-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const name = tab.getAttribute('data-tab');
      panel.querySelectorAll('.rv-tab').forEach((t) => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      panel.querySelectorAll('.rv-tab-panel').forEach((p) => {
        const on = p.getAttribute('data-panel') === name;
        p.hidden = !on;
        p.classList.toggle('is-active', on);
      });
      if (name === 'history') renderHistory();
    });
  });

  function collectFlags() {
    return Array.from(panel.querySelectorAll('[data-flag]:checked')).map(
      (el) => el.getAttribute('data-flag'),
    );
  }

  function buildPatch() {
    const patternState = patternEditor?.getState?.() || {};
    const flags = collectFlags();
    if (draftTable && !flags.includes('TABLE_FIXED')) flags.push('TABLE_FIXED');
    return {
      question: textArea?.value ?? draftText,
      originalQuestion: textArea?.value ?? draftText,
      table: typeof draftTable === 'string' ? draftTable : tableEditor.getMarkdown(),
      hasTable: Boolean(
        (typeof draftTable === 'string' ? draftTable : '').trim(),
      ),
      choices: choiceEditor.getChoices(),
      solution: {
        ...(original.solution || {}),
        explanation: solutionArea?.value || '',
        summary: solutionArea?.value || '',
      },
      patternId: patternState.patternId || undefined,
      patternMemo: patternState.patternMemo || '',
      patternChangeRequest: patternState.patternChangeRequest || '',
      reviewFlags: flags,
      reviewerNote: noteArea?.value || '',
      reviewed: true,
      reviewer: 'local',
    };
  }

  function applyResolved() {
    const resolved = resolveQuestion(original);
    if (typeof options.onResolved === 'function') {
      options.onResolved(resolved);
    }
    return resolved;
  }

  panel.querySelector('[data-act="close"]')?.addEventListener('click', () => {
    closeReviewerPanel(panel);
  });

  panel.querySelector('[data-act="save"]')?.addEventListener('click', () => {
    const patch = buildPatch();
    const status = statusSelect?.value || 'REVIEWED';
    saveOverride(qid, patch, {
      status,
      reviewer: 'local',
      changedFields: [
        'question',
        'table',
        'choices',
        'solution',
        'patternId',
        'reviewFlags',
        'reviewerNote',
      ],
    });
    upsertReviewRecord(qid, {
      status,
      flags: patch.reviewFlags,
      note: patch.reviewerNote,
      reviewer: 'local',
    });
    patternEditor?.persist?.('local');
    renderHistory();
    applyResolved();
  });

  panel.querySelector('[data-act="apply-preview"]')?.addEventListener('click', () => {
    /* temporary in-memory preview via synthetic override save */
    const patch = buildPatch();
    saveOverride(qid, patch, {
      status: statusSelect?.value || 'REVIEWED',
      changedFields: ['preview'],
    });
    applyResolved();
  });

  panel.querySelector('[data-act="undo"]')?.addEventListener('click', () => {
    undoReview(qid);
    renderHistory();
    applyResolved();
  });

  panel.querySelector('[data-act="export"]')?.addEventListener('click', () => {
    const blob = new Blob([exportReviewPack()], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'question-overrides.v1.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  panel.querySelector('#rv-import-file')?.addEventListener('change', async (ev) => {
    const file = ev.target?.files?.[0];
    if (!file) return;
    const text = await file.text();
    importReviewPack(text);
    renderHistory();
    applyResolved();
  });

  return { applyResolved, hasOverride: () => hasOverride(qid) };
}

export function closeReviewerPanel(panel) {
  if (!panel) return;
  panel.hidden = true;
  panel.setAttribute('aria-hidden', 'true');
  panel.innerHTML = '';
}

function simpleMarkdown(src) {
  const escaped = escapeHtml(src);
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}

export default {
  renderQuestionBadge,
  mountReviewerButton,
  openReviewerPanel,
  closeReviewerPanel,
};
