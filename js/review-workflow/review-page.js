/**
 * Sprint-12D — review.html page controller
 */

import { loadPhase1Database, getQuestionById } from '../data-loader.js';
import { getItem, STORAGE_KEYS } from '../storage.js';
import {
  syncReviewQueueFromQuality,
  getReviewQueue,
  buildReviewWorkspace,
  startReview,
  decide,
  getWorkflowSummary,
  exportWorkflow,
  DECISION_TYPES,
} from './workflow-service.js';
import { assignReview } from './review-assignment.js';
import {
  buildQualitySnapshot,
  loadIntegrityMismatchIds,
} from '../quality/quality-engine.js';

function el(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function applyTheme() {
  const theme = getItem(STORAGE_KEYS.THEME, 'light') || 'light';
  document.documentElement.setAttribute('data-theme', theme);
}

/** @type {object[]} */
let questions = [];
/** @type {string|null} */
let selectedId = null;

function formatJson(value) {
  if (value == null) return '(없음)';
  try {
    return JSON.stringify(value, null, 2);
  } catch (_err) {
    return String(value);
  }
}

function renderQueue() {
  const host = el('rw-queue-list');
  if (!host) return;
  const items = getReviewQueue();
  if (!items.length) {
    host.innerHTML = '<p class="rw-empty">Queue가 비어 있습니다. Sync Quality를 실행하세요.</p>';
    return;
  }
  host.innerHTML = items
    .map(
      (item) => `
    <button type="button" class="rw-queue-item ${item.questionId === selectedId ? 'is-active' : ''}" data-qid="${escapeHtml(item.questionId)}">
      <span class="rw-pri">P${escapeHtml(item.priority ?? '—')}</span>
      <span class="rw-qid">${escapeHtml(item.questionId)}</span>
      <span class="rw-meta">${escapeHtml(item.status)} · Q${escapeHtml(item.qualityScore ?? '—')}</span>
      <span class="rw-meta">${escapeHtml(item.patternId || '—')} · ${escapeHtml(item.year || '—')}</span>
      <span class="rw-reasons">${escapeHtml((item.reasons || []).join(', '))}</span>
    </button>`,
    )
    .join('');

  host.querySelectorAll('[data-qid]').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedId = btn.getAttribute('data-qid');
      renderQueue();
      renderWorkspace(selectedId);
    });
  });
}

function renderWorkspace(questionId) {
  const host = el('rw-workspace');
  if (!host) return;
  const original = getQuestionById(questions, questionId);
  if (!original) {
    host.innerHTML = '<p class="rw-empty">문항을 찾을 수 없습니다 (DB read-only lookup).</p>';
    return;
  }
  const ws = buildReviewWorkspace(original);
  const decisionButtons = DECISION_TYPES.map(
    (d) =>
      `<button type="button" class="button button--ghost" data-decision="${d}">${d}</button>`,
  ).join('');

  host.innerHTML = `
    <header class="rw-ws-header">
      <h3>${escapeHtml(ws.questionId)}</h3>
      <p>Pattern ${escapeHtml(ws.patternId || '—')} · Year ${escapeHtml(ws.year || '—')} · Quality ${escapeHtml(ws.qualityScore ?? '—')} · Status ${escapeHtml(ws.workflowStatus)}</p>
    </header>

    <div class="rw-assign">
      <label>Reviewer <input id="rw-reviewer" type="text" value="${escapeHtml(ws.assignment?.reviewerName || 'local')}"></label>
      <label>Est. min <input id="rw-eta" type="number" min="1" value="${escapeHtml(ws.assignment?.estimatedMinutes || 10)}"></label>
      <button type="button" class="button button--ghost" id="rw-assign-btn">Assign / Start</button>
    </div>

    <div class="rw-grid">
      <section>
        <h4>Original Question</h4>
        <pre>${escapeHtml(ws.original.question || '')}</pre>
        <h4>Table</h4>
        <pre>${escapeHtml(formatJson(ws.original.table))}</pre>
        <h4>Choices</h4>
        <pre>${escapeHtml(formatJson(ws.original.choices))}</pre>
      </section>
      <section>
        <h4>Override</h4>
        <pre>${escapeHtml(formatJson(ws.override))}</pre>
        <h4>AI Suggestion</h4>
        <pre>${escapeHtml(formatJson(ws.aiSuggestion?.changes || null))}</pre>
        <h4>Diff summary</h4>
        <pre>${escapeHtml(formatJson((ws.diffs || []).map((d) => d.field || d.kind)))}</pre>
      </section>
    </div>

    <div class="rw-decisions">
      <h4>Decision</h4>
      <textarea id="rw-comment" rows="2" placeholder="Comment"></textarea>
      <div class="rw-decision-btns">${decisionButtons}</div>
    </div>

    <section>
      <h4>History</h4>
      <ul class="rw-history">
        ${(ws.history || [])
          .slice()
          .reverse()
          .slice(0, 30)
          .map(
            (h) =>
              `<li><strong>${escapeHtml(h.timestamp)}</strong> · ${escapeHtml(h.reviewer)} · ${escapeHtml(h.decision || '—')} · ${escapeHtml(h.comment || '')}</li>`,
          )
          .join('') || '<li>기록 없음</li>'}
      </ul>
    </section>
  `;

  el('rw-assign-btn')?.addEventListener('click', () => {
    const name = el('rw-reviewer')?.value || 'local';
    const eta = Number(el('rw-eta')?.value) || 10;
    startReview(questionId, name);
    assignReview(questionId, {
      reviewerName: name,
      estimatedMinutes: eta,
      status: 'IN_PROGRESS',
    });
    renderQueue();
    renderWorkspace(questionId);
    renderSummary();
  });

  host.querySelectorAll('[data-decision]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const decision = btn.getAttribute('data-decision');
      const reviewer = el('rw-reviewer')?.value || 'local';
      const comment = el('rw-comment')?.value || '';
      const result = decide(questionId, decision, {
        reviewer,
        comment,
        originalQuestion: original,
      });
      if (!result.ok) {
        window.alert(`Decision 실패: ${result.error || 'unknown'}`);
        return;
      }
      renderQueue();
      renderWorkspace(questionId);
      renderSummary();
    });
  });
}

function renderSummary() {
  const host = el('rw-summary');
  if (!host) return;
  const summary = getWorkflowSummary();
  host.innerHTML = `
    <dl class="rw-dl">
      <div><dt>Queue</dt><dd>${summary.queueCount}</dd></div>
      <div><dt>Approved</dt><dd>${summary.stats.approved || 0}</dd></div>
      <div><dt>Rejected</dt><dd>${summary.stats.rejected || 0}</dd></div>
      <div><dt>Skipped</dt><dd>${summary.stats.skipped || 0}</dd></div>
    </dl>
  `;
}

async function syncFromQuality() {
  const status = el('rw-status');
  if (status) status.textContent = 'Quality → Queue 동기화 중…';
  const mismatchIds = await loadIntegrityMismatchIds();
  const snapshot = buildQualitySnapshot(questions, {
    mismatchIds,
    persist: true,
  });
  const built = syncReviewQueueFromQuality(snapshot.rows);
  if (status) {
    status.textContent = `Queue ${built.count}건 준비 · 평균 Quality ${snapshot.averageScore}`;
  }
  renderQueue();
  renderSummary();
  if (!selectedId && built.items?.[0]) {
    selectedId = built.items[0].questionId;
    renderQueue();
    renderWorkspace(selectedId);
  }
}

async function main() {
  applyTheme();
  const status = el('rw-status');
  try {
    const db = await loadPhase1Database();
    if (!db.valid) {
      if (status) status.textContent = `DB 검증 실패: ${(db.errors || []).join(' ')}`;
      return;
    }
    questions = db.questions || [];

    const params = new URLSearchParams(window.location.search);
    const focus = params.get('id');
    const autoSync = params.get('sync') !== '0';

    if (autoSync) await syncFromQuality();
    else {
      renderQueue();
      renderSummary();
    }

    if (focus) {
      selectedId = focus;
      renderQueue();
      renderWorkspace(selectedId);
    }

    el('rw-sync-btn')?.addEventListener('click', () => syncFromQuality());
    el('rw-export-json')?.addEventListener('click', () => exportWorkflow('json'));
    el('rw-export-csv')?.addEventListener('click', () => exportWorkflow('csv'));
  } catch (err) {
    if (status) status.textContent = `오류: ${err?.message || 'unknown'}`;
  }
}

main();
