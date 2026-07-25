/**
 * Sprint-10E — Learning Dashboard page controller (UI only).
 */

import { getItem, STORAGE_KEYS } from './storage.js';
import { loadDashboard } from './dashboard-service.js';

function applyTheme() {
  const theme = getItem(STORAGE_KEYS.THEME, 'light') || 'light';
  document.documentElement.setAttribute('data-theme', theme);
}

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

function renderCountList(container, counts, labels) {
  if (!container) return;
  const rows = labels
    .map(([key, label]) => {
      const n = Number(counts?.[key]) || 0;
      return `<li><span class="ld-key">${escapeHtml(label)}</span><strong class="ld-val">${n}</strong></li>`;
    })
    .join('');
  container.innerHTML = `<ul class="ld-count-list">${rows}</ul>`;
}

function renderTodayStudy(card, today) {
  if (!card) return;
  const active = today?.activeSession ? 'ACTIVE' : '없음';
  card.innerHTML = `
    <dl class="ld-dl">
      <div><dt>Active Session</dt><dd>${escapeHtml(active)}</dd></div>
      <div><dt>Strategy Type</dt><dd>${escapeHtml(today?.strategyType || '—')}</dd></div>
      <div><dt>Completed</dt><dd>${Number(today?.completedQuestions) || 0}</dd></div>
      <div><dt>Remaining</dt><dd>${Number(today?.remainingQuestions) || 0}</dd></div>
      <div><dt>Estimated Minutes</dt><dd>${Number(today?.estimatedMinutes) || 0}분</dd></div>
    </dl>
  `;
}

function renderPlans(card, plans) {
  if (!card) return;
  if (!plans?.length) {
    card.innerHTML = '<p class="ld-empty">Active Plan이 없습니다.</p>';
    return;
  }
  const rows = plans
    .map(
      (p) => `
      <tr>
        <td>${escapeHtml(p.patternId || '—')}</td>
        <td>${escapeHtml(p.actionType || '—')}</td>
        <td>${escapeHtml(p.priority)}</td>
        <td>${escapeHtml(p.attemptCount)}</td>
      </tr>`,
    )
    .join('');
  card.innerHTML = `
    <div class="ld-table-wrap">
      <table class="ld-table">
        <thead>
          <tr><th>Pattern</th><th>Action</th><th>Priority</th><th>Attempts</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function renderStrategies(card, strategies) {
  if (!card) return;
  if (!strategies?.length) {
    card.innerHTML = '<p class="ld-empty">Strategy가 없습니다.</p>';
    return;
  }
  const rows = strategies
    .map(
      (s) => `
      <tr>
        <td>${escapeHtml(s.patternId || '—')}</td>
        <td>${escapeHtml(s.strategyType || '—')}</td>
        <td>${escapeHtml(s.status || 'READY')}</td>
      </tr>`,
    )
    .join('');
  card.innerHTML = `
    <div class="ld-table-wrap">
      <table class="ld-table">
        <thead>
          <tr><th>Pattern</th><th>Strategy Type</th><th>Status</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function renderSession(card, studySession) {
  if (!card) return;
  const progress = studySession?.progress;
  if (!progress || !progress.total) {
    card.innerHTML = '<p class="ld-empty">오늘 Study Session이 없습니다.</p>';
    return;
  }
  const pct = progress.percent || 0;
  card.innerHTML = `
    <div class="ld-progress-block">
      <p class="ld-progress-label"><strong>${escapeHtml(progress.label)}</strong> · ${pct}%</p>
      <div class="ld-progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="세션 진행률">
        <span style="width:${pct}%"></span>
      </div>
      <dl class="ld-dl">
        <div><dt>남은 문제</dt><dd>${progress.remaining}</dd></div>
        <div><dt>예상 남은 시간</dt><dd>${progress.estimatedMinutesRemaining}분</dd></div>
        <div><dt>Strategy</dt><dd>${escapeHtml(progress.strategyType || '—')}</dd></div>
        <div><dt>Status</dt><dd>${escapeHtml(progress.status || '—')}</dd></div>
      </dl>
    </div>
  `;
}

function renderDashboard(dashboard) {
  renderTodayStudy(el('card-today-study'), dashboard.todayStudy);
  renderCountList(el('card-mastery'), dashboard.masterySummary, [
    ['MASTERED', 'MASTERED'],
    ['PROFICIENT', 'PROFICIENT'],
    ['PRACTICING', 'PRACTICING'],
    ['LEARNING', 'LEARNING'],
    ['RETRY_REQUIRED', 'RETRY_REQUIRED'],
  ]);
  renderCountList(el('card-weakness'), dashboard.weaknessSummary, [
    ['LOW_ACCURACY', 'LOW_ACCURACY'],
    ['REPEATED_MISS', 'REPEATED_MISS'],
    ['CALCULATION_ERROR', 'CALCULATION_ERROR'],
    ['CONCEPT_ERROR', 'CONCEPT_ERROR'],
    ['SLOW_RESPONSE', 'SLOW_RESPONSE'],
  ]);
  renderPlans(el('card-plans'), dashboard.todaysPlans);
  renderStrategies(el('card-strategies'), dashboard.todaysStrategies);
  renderSession(el('card-session'), dashboard.studySession);

  const meta = el('dashboard-meta');
  if (meta) {
    meta.textContent = `생성 ${dashboard.generatedAt || ''} · Storage 5종 읽기 전용`;
  }
}

function main() {
  applyTheme();
  const status = el('dashboard-status');
  try {
    const { ok, dashboard } = loadDashboard();
    if (!ok || !dashboard) {
      if (status) status.textContent = 'Dashboard를 불러오지 못했습니다.';
      return;
    }
    renderDashboard(dashboard);
    if (status) status.textContent = 'Learning Dashboard 준비 완료';
  } catch (err) {
    if (status) {
      status.textContent = `오류: ${err?.message || 'unknown'}`;
    }
  }
}

main();
