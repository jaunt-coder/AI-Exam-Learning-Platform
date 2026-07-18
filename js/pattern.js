/**
 * AI Exam Learning Platform v2
 * Pattern Page — Dashboard & Detail (Phase 3)
 */

import { loadPhase1Database, getPatternById, getQuestionById } from './data-loader.js';
import { getItem, STORAGE_KEYS } from './storage.js';
import { loadProgress } from './question-engine.js';
import {
  buildDashboardSummary,
  aggregateWrongByPattern,
  getPatternProgress,
  getPatternDescription,
  getPatternLearningPoints,
  getStatisticsForPattern,
  toStarRating,
  sortPatterns,
} from './pattern-engine.js';

const state = {
  master: null,
  patterns: [],
  questions: [],
  statistics: [],
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

function getQueryId() {
  return new URLSearchParams(window.location.search).get('id');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function gradeClass(grade) {
  return `pattern-grade pattern-grade--${(grade || 'B').toLowerCase()}`;
}

function renderProgressBar(percent, label) {
  return `
    <div class="progress-bar-wrap">
      <div class="progress-bar-label">
        <span>${label}</span>
        <span>${percent}%</span>
      </div>
      <div class="progress-bar" role="progressbar" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100">
        <div class="progress-bar__fill" style="width:${percent}%"></div>
      </div>
    </div>
  `;
}

function renderDashboard() {
  const chapter = state.master?.chapters?.[0];
  if (chapter) {
    $('chapter-title').textContent = `${chapter.name} · ${chapter.grade}급 단원 · Pattern ${state.patterns.length}개`;
  }

  const summary = buildDashboardSummary(state.patterns, state.questions);

  $('dashboard-summary').innerHTML = `
    <div class="summary-item">
      <span class="summary-item__value">${state.patterns.length}</span>
      <span class="summary-item__label">Pattern</span>
    </div>
    <div class="summary-item">
      <span class="summary-item__value">${summary.totalQuestions}</span>
      <span class="summary-item__label">기출 문항</span>
    </div>
    <div class="summary-item">
      <span class="summary-item__value">${summary.overallProgressPercent}%</span>
      <span class="summary-item__label">전체 풀이율</span>
    </div>
    <div class="summary-item">
      <span class="summary-item__value">${summary.totalWrongQuestions}</span>
      <span class="summary-item__label">오답 문항</span>
    </div>
  `;

  renderWrongNoteSummary(aggregateWrongByPattern());

  const listEl = $('pattern-dashboard-list');
  listEl.innerHTML = '';

  sortPatterns(state.patterns).forEach((pattern) => {
    const stat = summary.patternStats.find((s) => s.pattern.patternId === pattern.patternId);
    const prog = stat?.progress || getPatternProgress(pattern.patternId, state.questions);
    const wrong = stat?.wrong;
    const statsRow = getStatisticsForPattern(state.statistics, pattern.patternId);

    const li = document.createElement('li');
    li.className = 'pattern-dashboard-item';
    li.setAttribute('role', 'listitem');

    const link = document.createElement('a');
    link.href = `pattern.html?id=${encodeURIComponent(pattern.patternId)}`;
    link.className = `pattern-dashboard-card${wrong ? ' has-wrong' : ''}`;

    const yearsHtml = pattern.years
      .map((y) => `<span class="year-tag">${y}</span>`)
      .join('');

    link.innerHTML = `
      <span class="${gradeClass(pattern.grade)}">${pattern.grade}급</span>
      <span class="pattern-stars" aria-label="중요도">${toStarRating(pattern.importance)}</span>
      <h4 class="pattern-card-title">${escapeHtml(pattern.name)}</h4>
      <p class="pattern-card-meta">출제 ${pattern.frequency}회 · ${statsRow?.priority || '-'} · ${pattern.years.length}개년</p>
      <div class="pattern-years">${yearsHtml}</div>
      ${renderProgressBar(prog.progressPercent, `풀이 ${prog.answered}/${prog.total}`)}
      ${wrong ? `<p class="pattern-card-meta" style="color:var(--color-error);margin-top:0.5rem">오답 ${wrong.questionCount}문항 · ${wrong.totalWrongCount}회</p>` : ''}
    `;

    li.appendChild(link);
    listEl.appendChild(li);
  });
}

function renderWrongNoteSummary(wrongByPattern) {
  const container = $('wrong-note-summary');
  const entries = Object.values(wrongByPattern);

  if (entries.length === 0) {
    container.innerHTML = '<p class="wrong-note-empty">오답 기록이 없습니다. 문제 풀이 후 자동 저장됩니다.</p>';
    return;
  }

  container.innerHTML = entries
    .sort((a, b) => b.totalWrongCount - a.totalWrongCount)
    .map((entry) => {
      const pattern = getPatternById(state.patterns, entry.patternId);
      const name = pattern?.name || entry.patternId;
      return `<span class="wrong-note-chip">${escapeHtml(name)}: ${entry.questionCount}문항 / ${entry.totalWrongCount}회</span>`;
    })
    .join('');
}

function renderDetail(patternId) {
  const pattern = getPatternById(state.patterns, patternId);
  if (!pattern) return;

  const statsRow = getStatisticsForPattern(state.statistics, patternId);
  const prog = getPatternProgress(patternId, state.questions);
  const wrongByPattern = aggregateWrongByPattern();
  const wrong = wrongByPattern[patternId];
  const progress = loadProgress();

  $('detail-header').innerHTML = `
    <span class="${gradeClass(pattern.grade)}">${pattern.grade}급 Pattern</span>
    <span class="pattern-stars" aria-label="중요도">${toStarRating(pattern.importance)}</span>
    <h2 id="detail-heading">${escapeHtml(pattern.name)}</h2>
    <p class="section-desc">${pattern.patternId}</p>
  `;

  $('detail-description').textContent = getPatternDescription(patternId);

  const pointsEl = $('detail-learning-points');
  pointsEl.innerHTML = getPatternLearningPoints(patternId)
    .map((p) => `<li>${escapeHtml(p)}</li>`)
    .join('');

  $('detail-meta').innerHTML = `
    <span class="meta-pill">출제 ${pattern.frequency}회</span>
    <span class="meta-pill">${pattern.years.join(', ')}년</span>
    <span class="meta-pill">우선순위 ${statsRow?.priority || '-'}</span>
    ${statsRow?.recentYears?.length ? `<span class="meta-pill">최근 ${statsRow.recentYears.join(', ')}</span>` : ''}
  `;

  $('detail-progress').innerHTML = `
    ${renderProgressBar(prog.progressPercent, '풀이 진행률')}
    ${renderProgressBar(prog.correctPercent, '정답률 (풀이 완료 기준)')}
    <p class="pattern-card-meta" style="margin-top:0.75rem">${prog.correct}/${prog.answered} 정답 · ${prog.total}문항 중 ${prog.answered} 풀이</p>
  `;

  const wrongEl = $('detail-wrong-note');
  if (wrong) {
    wrongEl.className = 'wrong-note-detail has-wrong';
    wrongEl.innerHTML = `
      오답 ${wrong.questionCount}문항 · 총 ${wrong.totalWrongCount}회 틀림
      <ul style="margin-top:0.5rem;padding-left:1rem;font-weight:400;color:var(--color-text-muted)">
        ${wrong.items.map((i) => `<li>${i.questionId} (${i.wrongCount}회)</li>`).join('')}
      </ul>
    `;
  } else {
    wrongEl.className = 'wrong-note-detail';
    wrongEl.textContent = '이 Pattern의 오답 기록이 없습니다.';
  }

  const related = pattern.relatedQuestions
    .map((qid) => getQuestionById(state.questions, qid))
    .filter(Boolean);

  const firstUnanswered = related.find((q) => !progress.answered[q.questionId]) || related[0];
  $('start-solving-btn').href = firstUnanswered
    ? `question.html?pattern=${encodeURIComponent(patternId)}&id=${encodeURIComponent(firstUnanswered.questionId)}`
    : `question.html?pattern=${encodeURIComponent(patternId)}`;

  const listEl = $('related-question-list');
  listEl.innerHTML = '';

  related.forEach((q) => {
    const attempt = progress.answered[q.questionId];
    const wrongItem = wrong?.items.find((i) => i.questionId === q.questionId);

    const li = document.createElement('li');
    li.className = 'related-item';
    if (wrongItem) li.classList.add('is-wrong');
    else if (attempt?.correct) li.classList.add('is-correct');

    li.innerHTML = `
      <a href="question.html?pattern=${encodeURIComponent(patternId)}&id=${encodeURIComponent(q.questionId)}">
        <span class="q-badge">${q.year}년 · ${q.source?.questionNumber ?? '?'}번</span>
        ${wrongItem ? `<span class="q-badge" style="color:var(--color-error)">오답 ${wrongItem.wrongCount}회</span>` : ''}
        ${attempt?.correct ? '<span class="q-badge" style="color:var(--color-success)">정답</span>' : ''}
        <span class="related-stem">${escapeHtml(q.question)}</span>
      </a>
    `;
    listEl.appendChild(li);
  });
}

function showError(message) {
  hide($('loading-state'));
  hide($('dashboard-section'));
  hide($('detail-section'));
  $('error-message').textContent = message;
  show($('error-state'));
}

async function init() {
  applyTheme();

  try {
    const db = await loadPhase1Database();
    if (!db.valid) {
      showError(`Database 검증 실패: ${db.errors.join(' ')}`);
      return;
    }

    state.master = db.master;
    state.patterns = db.patterns;
    state.questions = db.questions;
    state.statistics = db.statistics;

    hide($('loading-state'));

    const patternId = getQueryId();
    if (patternId) {
      if (!getPatternById(state.patterns, patternId)) {
        showError(`Pattern을 찾을 수 없습니다: ${patternId}`);
        return;
      }
      hide($('dashboard-section'));
      show($('detail-section'));
      renderDetail(patternId);
    } else {
      show($('dashboard-section'));
      renderDashboard();
    }
  } catch (error) {
    showError(`${error.message} — 로컬 HTTP 서버에서 실행해 주세요. (python -m http.server 8080)`);
  }
}

document.addEventListener('DOMContentLoaded', init);
