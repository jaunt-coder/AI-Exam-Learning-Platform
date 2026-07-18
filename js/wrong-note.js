/**
 * AI Exam Learning Platform v2
 * Wrong Note Page — Phase 4 UI
 */

import { loadPhase1Database, getPatternById } from './data-loader.js';
import { getItem, STORAGE_KEYS } from './storage.js';
import {
  buildWrongNoteSummary,
  filterEntriesByPattern,
  formatWrongDate,
  buildRetryUrl,
} from './wrong-note-engine.js';

const state = {
  patterns: [],
  questions: [],
  summary: null,
  activeFilter: null,
};

function applyTheme() {
  document.documentElement.setAttribute('data-theme', getItem(STORAGE_KEYS.THEME, 'light'));
}

function $(id) {
  return document.getElementById(id);
}

function show(el) {
  if (el) el.hidden = false;
}

function hide(el) {
  if (el) el.hidden = true;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getFilterFromUrl() {
  return new URLSearchParams(window.location.search).get('pattern');
}

function renderSummary() {
  const s = state.summary;
  $('wrong-summary').innerHTML = `
    <div class="summary-item">
      <span class="summary-item__value">${s.totalQuestions}</span>
      <span class="summary-item__label">오답 문항</span>
    </div>
    <div class="summary-item">
      <span class="summary-item__value">${s.totalWrongAttempts}</span>
      <span class="summary-item__label">총 오답 횟수</span>
    </div>
    <div class="summary-item">
      <span class="summary-item__value summary-item__value--warn">${s.vulnerablePatternCount}</span>
      <span class="summary-item__label">취약 Pattern</span>
    </div>
    <div class="summary-item">
      <span class="summary-item__value">${s.highVulnerabilityCount}</span>
      <span class="summary-item__label">고위험 Pattern</span>
    </div>
  `;

  const actionsEl = $('wrong-actions');
  if (s.retryTarget) {
    actionsEl.innerHTML = `
      <a href="${buildRetryUrl(s.retryTarget)}" class="button button--danger">오답 다시 풀기 (우선순위 1순위)</a>
      <a href="pattern.html" class="button button--secondary">Pattern 학습으로 이동</a>
    `;
  } else {
    actionsEl.innerHTML = '';
  }
}

function renderVulnerability() {
  const listEl = $('vulnerability-list');
  listEl.innerHTML = '';

  if (state.summary.vulnerable.length === 0) {
    listEl.innerHTML = '<li><p class="section-desc">취약 Pattern이 없습니다.</p></li>';
    return;
  }

  state.summary.vulnerable.forEach((v) => {
    const li = document.createElement('li');
    li.className = 'vulnerability-item';

    const link = document.createElement('a');
    link.href = `wrong-note.html?pattern=${encodeURIComponent(v.patternId)}`;
    link.className = `vulnerability-card vulnerability-card--${v.level.toLowerCase()}`;
    link.innerHTML = `
      <span class="vuln-badge vuln-badge--${v.level.toLowerCase()}">${v.label}</span>
      <span class="vuln-name">${escapeHtml(v.pattern?.name || v.patternId)}</span>
      <span class="vuln-meta">${v.questionCount}문항 · ${v.totalWrongCount}회 오답</span>
    `;

    li.appendChild(link);
    listEl.appendChild(li);
  });
}

function renderFilter() {
  const filterEl = $('pattern-filter');
  const patternsWithWrong = [...new Set(state.summary.entries.map((e) => e.patternId))];

  filterEl.innerHTML = `
    <button type="button" class="filter-btn${!state.activeFilter ? ' is-active' : ''}" data-pattern="">전체</button>
    ${patternsWithWrong
      .map((pid) => {
        const p = getPatternById(state.patterns, pid);
        const active = state.activeFilter === pid ? ' is-active' : '';
        return `<button type="button" class="filter-btn${active}" data-pattern="${escapeHtml(pid)}">${escapeHtml(p?.name || pid)}</button>`;
      })
      .join('')}
  `;

  filterEl.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const pid = btn.dataset.pattern || null;
      state.activeFilter = pid;
      const url = pid ? `wrong-note.html?pattern=${encodeURIComponent(pid)}` : 'wrong-note.html';
      window.history.replaceState(null, '', url);
      renderFilter();
      renderWrongList();
    });
  });
}

function renderWrongList() {
  const entries = filterEntriesByPattern(state.summary.entries, state.activeFilter);
  const listEl = $('wrong-question-list');
  listEl.innerHTML = '';

  if (entries.length === 0) {
    listEl.innerHTML = '<li><p class="section-desc">해당 Pattern의 오답이 없습니다.</p></li>';
    return;
  }

  entries.forEach((entry) => {
    const li = document.createElement('li');
    li.className = 'wrong-question-item';

    const pattern = entry.pattern || getPatternById(state.patterns, entry.patternId);
    li.innerHTML = `
      <article class="wrong-question-card">
        <div class="wrong-question-card__main">
          <div class="wrong-question-card__meta">
            <span class="meta-tag">${entry.questionId}</span>
            <span class="meta-tag">${entry.year}년 · ${entry.question?.source?.questionNumber ?? '?'}번</span>
            <span class="meta-tag">${escapeHtml(pattern?.name || entry.patternId)}</span>
            <span class="meta-tag meta-tag--count">오답 ${entry.wrongCount}회</span>
          </div>
          <p class="wrong-stem">${escapeHtml(entry.question?.question || '')}</p>
          <p class="wrong-date">최근 오답: ${formatWrongDate(entry.lastWrongDate)}</p>
        </div>
        <a href="${buildRetryUrl(entry)}" class="retry-btn">다시 풀기</a>
      </article>
    `;

    listEl.appendChild(li);
  });
}

function showError(message) {
  hide($('loading-state'));
  hide($('wrong-note-section'));
  hide($('empty-state'));
  $('error-message').textContent = message;
  show($('error-state'));
}

async function init() {
  applyTheme();
  state.activeFilter = getFilterFromUrl();

  try {
    const db = await loadPhase1Database();
    if (!db.valid) {
      showError(`Database 검증 실패: ${db.errors.join(' ')}`);
      return;
    }

    state.patterns = db.patterns;
    state.questions = db.questions;
    state.summary = buildWrongNoteSummary(state.questions, state.patterns);

    hide($('loading-state'));

    if (state.summary.totalQuestions === 0) {
      show($('empty-state'));
      return;
    }

    show($('wrong-note-section'));
    renderSummary();
    renderVulnerability();
    renderFilter();
    renderWrongList();
  } catch (error) {
    showError(`${error.message} — 로컬 HTTP 서버에서 실행해 주세요.`);
  }
}

document.addEventListener('DOMContentLoaded', init);
