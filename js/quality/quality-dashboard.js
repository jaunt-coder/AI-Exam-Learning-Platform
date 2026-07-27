/**
 * Sprint-12C — Data Quality Dashboard page controller
 */

import { loadPhase1Database } from '../data-loader.js';
import { getItem, STORAGE_KEYS } from '../storage.js';
import {
  buildQualitySnapshot,
  loadIntegrityMismatchIds,
  filterQualityRows,
} from './quality-engine.js';
import {
  buildQualityReport,
  exportQualityReportCsv,
  exportQualityReportJson,
  downloadTextFile,
} from './quality-report.js';
import { loadQualityHistoryDoc } from './quality-storage.js';

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

/** @type {object|null} */
let snapshot = null;
let activeFilter = 'all';

function renderCards(cards) {
  const host = el('qd-cards');
  if (!host || !cards) return;
  host.innerHTML = `
    <article class="qd-card"><h3>Overall Quality</h3><p class="qd-metric">${escapeHtml(cards.overall.averageScore)}</p><p class="qd-sub">평균 점수</p></article>
    <article class="qd-card"><h3>OCR</h3><p class="qd-metric">${escapeHtml(cards.ocr.errorCount)}</p><p class="qd-sub">OCR 오류 수</p></article>
    <article class="qd-card"><h3>Table</h3><p class="qd-metric">${escapeHtml(cards.table.missingCount)}</p><p class="qd-sub">표 누락 문항</p></article>
    <article class="qd-card"><h3>Pattern</h3><p class="qd-metric">${escapeHtml(cards.pattern.mismatchCount)}</p><p class="qd-sub">Pattern Mismatch</p></article>
    <article class="qd-card"><h3>Solution</h3><p class="qd-metric">${escapeHtml(cards.solution.missingCount)}</p><p class="qd-sub">해설 없는 문항</p></article>
    <article class="qd-card"><h3>Override</h3><p class="qd-metric">${escapeHtml(cards.override.appliedCount)}</p><p class="qd-sub">Override 적용 수</p></article>
    <article class="qd-card"><h3>AI Recovery</h3><p class="qd-metric">${escapeHtml(cards.aiRecovery.pending)} / ${escapeHtml(cards.aiRecovery.approved)} / ${escapeHtml(cards.aiRecovery.rejected)}</p><p class="qd-sub">Pending · Approved · Rejected</p></article>
    <article class="qd-card"><h3>Reviewer</h3><p class="qd-metric">${escapeHtml(cards.reviewer.today)} / ${escapeHtml(cards.reviewer.week)} / ${escapeHtml(cards.reviewer.total)}</p><p class="qd-sub">Today · Week · Total</p></article>
  `;
}

function renderStats(stats) {
  const host = el('qd-stats');
  if (!host || !stats) return;
  host.innerHTML = `
    <dl class="qd-dl">
      <div><dt>전체 문항</dt><dd>${escapeHtml(stats.totalQuestions)}</dd></div>
      <div><dt>검수율</dt><dd>${escapeHtml(stats.reviewRate)}%</dd></div>
      <div><dt>표 복원율</dt><dd>${escapeHtml(stats.tableRestoreRate)}%</dd></div>
      <div><dt>OCR 완료율</dt><dd>${escapeHtml(stats.ocrCompletionRate)}%</dd></div>
      <div><dt>Override 적용률</dt><dd>${escapeHtml(stats.overrideApplyRate)}%</dd></div>
      <div><dt>AI 승인률</dt><dd>${escapeHtml(stats.aiApprovalRate)}%</dd></div>
      <div><dt>Pattern 정확도</dt><dd>${escapeHtml(stats.patternAccuracy)}%</dd></div>
      <div><dt>Solution 작성률</dt><dd>${escapeHtml(stats.solutionWriteRate)}%</dd></div>
    </dl>
  `;
}

function renderPriority(priority) {
  const host = el('qd-priority');
  if (!host || !priority) return;
  const items = (priority.todayReview || priority.top10 || [])
    .map(
      (r) =>
        `<li><a href="review.html?id=${encodeURIComponent(r.questionId)}&sync=1">${escapeHtml(r.questionId)}</a> · ${escapeHtml(r.score)} · ${escapeHtml(r.status)}</li>`,
    )
    .join('');
  host.innerHTML = `
    <h3>Auto Priority · Today Review (Top 10)</h3>
    <ul class="qd-priority-list">${items || '<li>추천 문항 없음</li>'}</ul>
  `;
}

function renderTrends() {
  const host = el('qd-trends');
  if (!host) return;
  const hist = loadQualityHistoryDoc();
  const fmt = (arr, label) => {
    const last = (arr || []).slice(-7);
    if (!last.length) return `<p class="qd-sub">${label}: 데이터 없음</p>`;
    return `<p class="qd-sub"><strong>${label}</strong> ${last
      .map((p) => `${escapeHtml(p.date)}:${escapeHtml(p.averageScore)}`)
      .join(' · ')}</p>`;
  };
  host.innerHTML = `
    <h3>Trend</h3>
    ${fmt(hist.daily, '일별')}
    ${fmt(hist.weekly, '주별')}
    ${fmt(hist.monthly, '월별')}
  `;
}

function renderTable() {
  const host = el('qd-table-body');
  if (!host || !snapshot) return;
  let rows = filterQualityRows(snapshot.rows, activeFilter);
  rows = rows
    .slice()
    .sort((a, b) => a.score - b.score || String(a.questionId).localeCompare(b.questionId));

  host.innerHTML = rows
    .slice(0, 200)
    .map(
      (r) => `
    <tr>
      <td><strong>${escapeHtml(r.score)}</strong></td>
      <td><a href="question.html?id=${encodeURIComponent(r.questionId)}">${escapeHtml(r.questionId)}</a></td>
      <td>${escapeHtml(r.patternId || '—')}</td>
      <td><span class="qd-status qd-status--${escapeHtml(r.status)}">${escapeHtml(r.status)}</span></td>
      <td>${escapeHtml(r.confidence ?? '—')}</td>
      <td>${r.hasOverride ? 'Yes' : 'No'}</td>
      <td>${escapeHtml(r.reviewStatus || '—')}</td>
    </tr>`,
    )
    .join('');

  const meta = el('qd-table-meta');
  if (meta) {
    meta.textContent = `표시 ${Math.min(rows.length, 200)} / 필터 결과 ${rows.length} · 전체 ${snapshot.totalQuestions}`;
  }
}

function bindFilters() {
  document.querySelectorAll('[data-qd-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeFilter = btn.getAttribute('data-qd-filter') || 'all';
      document
        .querySelectorAll('[data-qd-filter]')
        .forEach((b) => b.classList.toggle('is-active', b === btn));
      renderTable();
    });
  });
}

function bindExport() {
  el('qd-export-json')?.addEventListener('click', () => {
    const report = buildQualityReport(snapshot);
    downloadTextFile(
      'quality-report.v1.json',
      exportQualityReportJson(report),
      'application/json',
    );
  });
  el('qd-export-csv')?.addEventListener('click', () => {
    const report = buildQualityReport(snapshot);
    downloadTextFile(
      'quality-report.v1.csv',
      exportQualityReportCsv(report),
      'text/csv',
    );
  });
}

async function main() {
  applyTheme();
  const status = el('qd-status');
  try {
    if (status) status.textContent = 'Quality Engine 계산 중…';
    const db = await loadPhase1Database();
    if (!db.valid) {
      if (status) status.textContent = `DB 검증 실패: ${(db.errors || []).join(' ')}`;
      return;
    }
    const mismatchIds = await loadIntegrityMismatchIds();
    snapshot = buildQualitySnapshot(db.questions || [], {
      mismatchIds,
      persist: true,
    });
    renderCards(snapshot.cards);
    renderStats(snapshot.statistics);
    renderPriority(snapshot.priority);
    renderTrends();
    renderTable();
    bindFilters();
    bindExport();
    if (status) {
      status.textContent = `Data Quality Center 준비 완료 · 평균 ${snapshot.averageScore}`;
    }
  } catch (err) {
    if (status) status.textContent = `오류: ${err?.message || 'unknown'}`;
  }
}

main();

export default { main };
