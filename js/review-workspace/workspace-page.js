/**
 * Sprint-12E — review-workspace.html page controller
 */

import { loadPhase1Database, getQuestionById } from '../data-loader.js';
import { getItem, STORAGE_KEYS } from '../storage.js';
import { syncReviewQueueFromQuality } from '../review-workflow/workflow-service.js';
import {
  buildQualitySnapshot,
  loadIntegrityMismatchIds,
} from '../quality/quality-engine.js';
import {
  ensureWorkspaceQueue,
  getCurrentQuestionId,
  setCurrentQuestionId,
  buildWorkspaceView,
  oneClickFix,
  oneClickApproveAi,
  oneClickApproveOverride,
  oneClickReject,
  oneClickSkip,
  oneClickNext,
  oneClickPrevious,
  setSelectedQuestionIds,
  getSelectedQuestionIds,
  bulkDecide,
  bulkExport,
  setFocusMode,
  toggleFocusMode,
  isFocusModeEnabled,
  applyFocusModeToDocument,
  startReview,
  getSessionSummary,
} from './workspace-service.js';
import { saveWorkspaceDoc, loadWorkspaceDoc } from './workspace-storage.js';
import { getQuickFixHistory } from './quick-fix.js';

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
let currentId = null;
let actionStartedAt = Date.now();

function status(msg) {
  const node = el('rws-status');
  if (node) node.textContent = msg;
}

function formatBlock(value) {
  if (value == null || value === '') return '(없음)';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch (_err) {
    return String(value);
  }
}

function renderSession() {
  const s = getSessionSummary();
  const host = el('rws-session');
  if (!host) return;
  host.innerHTML = `
    <dl class="rws-session-dl">
      <div><dt>오늘</dt><dd>${escapeHtml(s.date)}</dd></div>
      <div><dt>남은 문제</dt><dd>${escapeHtml(s.remaining)}</dd></div>
      <div><dt>처리</dt><dd>${escapeHtml(s.processed)}</dd></div>
      <div><dt>Approve</dt><dd>${escapeHtml(s.approved)}</dd></div>
      <div><dt>Reject</dt><dd>${escapeHtml(s.rejected)}</dd></div>
      <div><dt>Skip</dt><dd>${escapeHtml(s.skipped)}</dd></div>
      <div><dt>평균(초)</dt><dd>${escapeHtml(s.averageSeconds)}</dd></div>
      <div><dt>Accuracy</dt><dd>${escapeHtml(s.accuracy)}%</dd></div>
    </dl>`;
}

function renderQueue() {
  const host = el('rws-queue');
  if (!host) return;
  const items = ensureWorkspaceQueue();
  const selected = new Set(getSelectedQuestionIds());
  if (!items.length) {
    host.innerHTML =
      '<p class="rws-muted">Queue가 비어 있습니다. Sync를 실행하세요.</p>';
    return;
  }
  host.innerHTML = items
    .map((item) => {
      const active = item.questionId === currentId ? 'is-active' : '';
      const checked = selected.has(item.questionId) ? 'checked' : '';
      return `
      <div class="rws-queue-row ${active}" data-qid="${escapeHtml(item.questionId)}">
        <label class="rws-check">
          <input type="checkbox" data-select="${escapeHtml(item.questionId)}" ${checked} />
        </label>
        <button type="button" class="rws-queue-btn" data-open="${escapeHtml(item.questionId)}">
          <span class="rws-pri">P${escapeHtml(item.priority ?? '—')}</span>
          <span class="rws-qid">${escapeHtml(item.questionId)}</span>
          <span class="rws-meta">${escapeHtml(item.status)} · Q${escapeHtml(item.qualityScore ?? '—')}</span>
        </button>
      </div>`;
    })
    .join('');

  host.querySelectorAll('[data-open]').forEach((btn) => {
    btn.addEventListener('click', () => {
      openQuestion(btn.getAttribute('data-open'));
    });
  });
  host.querySelectorAll('[data-select]').forEach((input) => {
    input.addEventListener('change', () => {
      const ids = [...host.querySelectorAll('[data-select]:checked')].map((n) =>
        n.getAttribute('data-select'),
      );
      setSelectedQuestionIds(ids.slice(0, 10));
      status(`선택 ${Math.min(ids.length, 10)}개 (최대 10)`);
    });
  });
}

function renderCenter(ws) {
  const host = el('rws-center');
  if (!host) return;
  const q = ws.resolved || ws.original || {};
  const choices = Array.isArray(q.choices)
    ? q.choices
        .map((c, i) => `<li>${i + 1}. ${escapeHtml(typeof c === 'string' ? c : c.text || c)}</li>`)
        .join('')
    : '';
  host.innerHTML = `
    <header class="rws-center-head">
      <h3>${escapeHtml(ws.questionId || '—')}</h3>
      <p class="rws-muted">다음: ${escapeHtml(ws.nextQuestionId || '—')} · Override ${ws.hasOverride ? 'ON' : 'OFF'}</p>
    </header>
    <section class="rws-pane">
      <h4>원문</h4>
      <pre>${escapeHtml(q.question || q.originalQuestion || '(없음)')}</pre>
    </section>
    <section class="rws-pane">
      <h4>표</h4>
      <pre>${escapeHtml(formatBlock(q.table || q.hasTable ? q.table : null))}</pre>
    </section>
    <section class="rws-pane">
      <h4>보기</h4>
      <ol class="rws-choices">${choices || '<li>(없음)</li>'}</ol>
    </section>
    <section class="rws-pane">
      <h4>해설</h4>
      <pre>${escapeHtml(formatBlock(q.solution || q.detailedExplanation || null))}</pre>
    </section>`;
}

function renderRight(ws) {
  const host = el('rws-right');
  if (!host) return;
  const recovery = ws.recovery || {};
  const changes = recovery.changes || [];
  const diffs = changes
    .map((c) => {
      const before = formatBlock(c.before);
      const after = formatBlock(c.after);
      return `<div class="rws-diff">
        <strong>${escapeHtml(c.field || 'field')}</strong>
        <div class="rws-diff-grid">
          <pre class="rws-before">${escapeHtml(before)}</pre>
          <pre class="rws-after">${escapeHtml(after)}</pre>
        </div>
      </div>`;
    })
    .join('');

  const quality = ws.quality;
  const hist = (ws.quickHistory || getQuickFixHistory(ws.questionId) || [])
    .slice(-8)
    .reverse()
    .map(
      (h) => `<li>
        <strong>${escapeHtml(h.type)}</strong>
        · ${escapeHtml(h.reviewer)} · ${escapeHtml(String(h.date || '').slice(0, 19))}
        <br/><span class="rws-muted">${escapeHtml(h.reason || '')}</span>
      </li>`,
    )
    .join('');

  host.innerHTML = `
    <section class="rws-pane">
      <h4>AI Suggestion</h4>
      <p class="rws-muted">Confidence: ${escapeHtml(recovery.confidence ?? '—')} · detections: ${escapeHtml((recovery.detections || []).join(', ') || '—')}</p>
      ${diffs || '<p class="rws-muted">제안 없음 — Fix / Approve 전 AI Recovery 실행됨</p>'}
      <div class="rws-mini-actions">
        <button type="button" class="button button--primary" id="rws-approve-ai">Approve AI</button>
        <button type="button" class="button button--ghost" id="rws-approve-ov">Approve Override</button>
      </div>
    </section>
    <section class="rws-pane">
      <h4>Override</h4>
      <pre>${escapeHtml(formatBlock(ws.override?.override || null))}</pre>
    </section>
    <section class="rws-pane">
      <h4>Quality</h4>
      <p>Score <strong>${escapeHtml(quality?.score ?? '—')}</strong> · ${escapeHtml(quality?.status || '—')}</p>
      <p class="rws-muted">${escapeHtml(JSON.stringify(quality?.flags || {}))}</p>
    </section>
    <section class="rws-pane">
      <h4>History</h4>
      <ul class="rws-history">${hist || '<li class="rws-muted">기록 없음</li>'}</ul>
    </section>`;

  el('rws-approve-ai')?.addEventListener('click', () => runApproveAi());
  el('rws-approve-ov')?.addEventListener('click', () => runApproveOverride());
}

function openQuestion(questionId) {
  currentId = questionId;
  setCurrentQuestionId(questionId);
  actionStartedAt = Date.now();
  startReview(questionId, 'local');
  renderAll();
}

function renderAll() {
  if (!currentId) currentId = getCurrentQuestionId();
  const original = getQuestionById(questions, currentId);
  const ws = buildWorkspaceView(original, currentId);
  renderSession();
  renderQueue();
  if (!original) {
    el('rws-center').innerHTML =
      '<p class="rws-muted">문항을 찾을 수 없습니다 (DB read-only).</p>';
    el('rws-right').innerHTML = '';
    return;
  }
  renderCenter(ws);
  renderRight(ws);
  el('rws-focus-btn')?.classList.toggle('is-on', isFocusModeEnabled());
}

function currentOriginal() {
  return getQuestionById(questions, currentId);
}

function afterAction(msg) {
  status(msg);
  const next = oneClickNext();
  if (next) currentId = next;
  renderAll();
}

function runFix(type) {
  const q = currentOriginal();
  if (!q) return;
  const r = oneClickFix(q, type, { reviewer: 'local' });
  status(
    r.ok
      ? `Fix ${type} 완료 (${r.elapsedMs}ms)`
      : `Fix ${type} 실패: ${r.error || 'unknown'}`,
  );
  renderAll();
}

function runApproveAi() {
  const q = currentOriginal();
  if (!q) return;
  const r = oneClickApproveAi(q, { reviewer: 'local' });
  afterAction(
    r.ok
      ? `Approve AI · Quality ${r.quality?.score ?? '—'}`
      : 'Approve AI 실패',
  );
}

function runApproveOverride() {
  const q = currentOriginal();
  if (!q) return;
  const r = oneClickApproveOverride(q, { reviewer: 'local' });
  afterAction(
    r.ok
      ? `Approve Override · Quality ${r.quality?.score ?? '—'}`
      : 'Approve Override 실패',
  );
}

function runReject() {
  const q = currentOriginal();
  if (!q) return;
  oneClickReject(q, { reviewer: 'local' });
  afterAction('Reject 완료');
}

function runSkip() {
  const q = currentOriginal();
  if (!q) return;
  oneClickSkip(q, { reviewer: 'local' });
  afterAction('Skip 완료');
}

function saveSessionState() {
  const doc = loadWorkspaceDoc();
  doc.currentQuestionId = currentId;
  doc.lastAction = 'save';
  saveWorkspaceDoc(doc);
  status('세션 저장됨 (Ctrl+S)');
}

function bindToolbar() {
  el('rws-sync-btn')?.addEventListener('click', async () => {
    const mismatchIds = await loadIntegrityMismatchIds();
    buildQualitySnapshot(questions, { mismatchIds, persist: true });
    syncReviewQueueFromQuality();
    ensureWorkspaceQueue();
    currentId = getCurrentQuestionId();
    status('Quality Sync → Queue 완료');
    renderAll();
  });

  const fixMap = {
    'rws-fix-ocr': 'OCR',
    'rws-fix-table': 'TABLE',
    'rws-fix-choices': 'CHOICES',
    'rws-fix-pattern': 'PATTERN',
    'rws-fix-solution': 'SOLUTION',
  };
  Object.entries(fixMap).forEach(([id, type]) => {
    el(id)?.addEventListener('click', () => runFix(type));
  });

  el('rws-approve')?.addEventListener('click', () => runApproveAi());
  el('rws-reject')?.addEventListener('click', () => runReject());
  el('rws-skip')?.addEventListener('click', () => runSkip());
  el('rws-next')?.addEventListener('click', () => {
    currentId = oneClickNext() || currentId;
    renderAll();
  });
  el('rws-prev')?.addEventListener('click', () => {
    currentId = oneClickPrevious() || currentId;
    renderAll();
  });

  el('rws-focus-btn')?.addEventListener('click', () => {
    toggleFocusMode();
    applyFocusModeToDocument(isFocusModeEnabled());
    status(isFocusModeEnabled() ? 'Focus Mode ON' : 'Focus Mode OFF');
    renderAll();
  });

  el('rws-bulk-approve')?.addEventListener('click', () => {
    const r = bulkDecide('APPROVE_AI', { reviewer: 'local' });
    status(`Bulk Approve ${r.count}건`);
    renderAll();
  });
  el('rws-bulk-reject')?.addEventListener('click', () => {
    const r = bulkDecide('REJECT_AI', { reviewer: 'local' });
    status(`Bulk Reject ${r.count}건`);
    renderAll();
  });
  el('rws-bulk-json')?.addEventListener('click', () => bulkExport('json'));
  el('rws-bulk-csv')?.addEventListener('click', () => bulkExport('csv'));
  el('rws-bulk-md')?.addEventListener('click', () => bulkExport('md'));

  el('rws-select10')?.addEventListener('click', () => {
    const ids = ensureWorkspaceQueue()
      .slice(0, 10)
      .map((i) => i.questionId);
    setSelectedQuestionIds(ids);
    status(`상위 10개 선택`);
    renderQueue();
  });
}

function bindKeyboard() {
  document.addEventListener('keydown', (ev) => {
    const ctrl = ev.ctrlKey || ev.metaKey;
    if (ctrl && ev.key.toLowerCase() === 's') {
      ev.preventDefault();
      saveSessionState();
      return;
    }
    if (ctrl && ev.key === 'Enter') {
      ev.preventDefault();
      runApproveAi();
      return;
    }
    if (ctrl && ev.key === 'ArrowRight') {
      ev.preventDefault();
      currentId = oneClickNext() || currentId;
      renderAll();
      return;
    }
    if (ctrl && ev.key === 'ArrowLeft') {
      ev.preventDefault();
      currentId = oneClickPrevious() || currentId;
      renderAll();
      return;
    }
    if (ev.altKey && !ctrl) {
      const map = {
        Digit1: 'OCR',
        Digit2: 'TABLE',
        Digit3: 'CHOICES',
        Digit4: 'PATTERN',
        Digit5: 'SOLUTION',
        '1': 'OCR',
        '2': 'TABLE',
        '3': 'CHOICES',
        '4': 'PATTERN',
        '5': 'SOLUTION',
      };
      const type = map[ev.code] || map[ev.key];
      if (type) {
        ev.preventDefault();
        runFix(type);
      }
    }
  });
}

async function boot() {
  applyTheme();
  bindToolbar();
  bindKeyboard();
  status('DB 로딩 중…');
  try {
    const db = await loadPhase1Database();
    questions = db.questions || [];
    const params = new URLSearchParams(window.location.search);
    if (params.get('sync') === '1' || !ensureWorkspaceQueue().length) {
      const mismatchIds = await loadIntegrityMismatchIds();
      buildQualitySnapshot(questions, { mismatchIds, persist: true });
      syncReviewQueueFromQuality();
    }
    ensureWorkspaceQueue();
    currentId =
      params.get('qid') || getCurrentQuestionId() || questions[0]?.questionId;
    if (currentId) setCurrentQuestionId(currentId);
    applyFocusModeToDocument(isFocusModeEnabled());
    status(`준비 완료 · ${questions.length}문항 (DB read-only)`);
    renderAll();
  } catch (err) {
    status(`로드 실패: ${err.message || err}`);
  }
}

boot();
