/**
 * AI Exam Learning Platform v2
 * Exam Page — Phase 6 UI (모의시험)
 */

import {
  loadPhase1Database,
  getQuestionById,
  getPatternById,
  getChoiceLabel,
} from './data-loader.js';
import { getItem, STORAGE_KEYS } from './storage.js';
import {
  EXAM_CONFIG,
  getPresetById,
  selectRandomQuestions,
  createExamSession,
  saveActiveExamSession,
  loadActiveExamSession,
  clearActiveExamSession,
  saveExamAnswer,
  getAnsweredCount,
  formatExamTime,
  gradeExamSession,
  submitExamSession,
  getExamHistorySummary,
  getLatestExamRecord,
} from './exam-engine.js';

const state = {
  master: null,
  questions: [],
  patterns: [],
  session: null,
  selectedPresetId: EXAM_CONFIG.defaultPresetId,
  timerId: null,
  lastAnalysis: null,
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

function showError(message) {
  hide($('loading-state'));
  hide($('setup-section'));
  hide($('exam-section'));
  hide($('result-section'));
  $('error-message').textContent = message;
  show($('error-state'));
}

function showView(view) {
  hide($('setup-section'));
  hide($('exam-section'));
  hide($('result-section'));
  show($(view));
}

function renderHistorySummary() {
  const summary = getExamHistorySummary();
  const el = $('exam-history-summary');

  if (summary.count === 0) {
    el.innerHTML = '<p class="section-desc">아직 완료한 모의시험이 없습니다. 첫 시험을 시작해 보세요.</p>';
    return;
  }

  el.innerHTML = `
    <div class="history-stat">
      <span class="history-stat__value">${summary.count}</span>
      <span class="history-stat__label">응시 횟수</span>
    </div>
    <div class="history-stat">
      <span class="history-stat__value">${summary.lastScore}점</span>
      <span class="history-stat__label">최근 점수</span>
    </div>
    <div class="history-stat">
      <span class="history-stat__value">${summary.bestScore}점</span>
      <span class="history-stat__label">최고 점수</span>
    </div>
    <div class="history-stat">
      <span class="history-stat__value">${summary.averageScore}점</span>
      <span class="history-stat__label">평균 점수</span>
    </div>
  `;
}

function renderPresets() {
  const list = $('preset-list');
  list.innerHTML = '';

  EXAM_CONFIG.presets.forEach((preset) => {
    const label = document.createElement('label');
    label.className = 'preset-option card';
    label.innerHTML = `
      <input type="radio" name="exam-preset" value="${preset.id}" ${preset.id === state.selectedPresetId ? 'checked' : ''}>
      <span class="preset-option__title">${escapeHtml(preset.label)}</span>
      <span class="preset-option__desc">${escapeHtml(preset.description)}</span>
    `;
    list.appendChild(label);
  });

  list.querySelectorAll('input[name="exam-preset"]').forEach((input) => {
    input.addEventListener('change', () => {
      state.selectedPresetId = input.value;
    });
  });
}

function checkResumePanel() {
  const active = loadActiveExamSession();
  if (!active) {
    hide($('exam-resume-panel'));
    return;
  }

  const answered = getAnsweredCount(active);
  $('exam-resume-text').textContent =
    `${active.presetLabel} · ${active.questionIds.length}문항 중 ${answered}문항 응답 · 남은 시간 ${formatExamTime(active.remainingSeconds)}`;
  show($('exam-resume-panel'));
}

function startNewExam(presetId) {
  const preset = getPresetById(presetId);
  const selected = selectRandomQuestions(state.questions, preset.questionCount);
  if (!selected.length) {
    alert('출제 가능한 문항이 없습니다.');
    return;
  }

  clearActiveExamSession();
  state.session = createExamSession(preset, selected);
  saveActiveExamSession(state.session);
  enterExamMode();
}

function resumeExam() {
  const active = loadActiveExamSession();
  if (!active) return;
  state.session = active;
  enterExamMode();
}

function enterExamMode() {
  showView('exam-section');
  $('exam-heading').textContent = state.session.examTitle;
  renderExamNav();
  renderCurrentQuestion();
  startTimer();
  bindBeforeUnload();
}

function bindBeforeUnload() {
  window.onbeforeunload = (e) => {
    if (state.session?.status === 'in_progress') {
      e.preventDefault();
      e.returnValue = '';
    }
  };
}

function clearBeforeUnload() {
  window.onbeforeunload = null;
}

function startTimer() {
  stopTimer();
  updateTimerDisplay();

  state.timerId = setInterval(() => {
    if (!state.session || state.session.status !== 'in_progress') return;

    state.session.remainingSeconds -= 1;
    saveActiveExamSession(state.session);
    updateTimerDisplay();

    if (state.session.remainingSeconds <= 0) {
      state.session.timedOut = true;
      stopTimer();
      finalizeExam(true);
    }
  }, 1000);
}

function stopTimer() {
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
}

function updateTimerDisplay() {
  const el = $('timer-display');
  const wrap = $('exam-timer');
  if (!el || !state.session) return;

  el.textContent = formatExamTime(state.session.remainingSeconds);
  wrap.classList.remove('is-warning', 'is-critical');

  if (state.session.remainingSeconds <= 60) {
    wrap.classList.add('is-critical');
  } else if (state.session.remainingSeconds <= 300) {
    wrap.classList.add('is-warning');
  }
}

function renderExamNav() {
  const grid = $('exam-nav-grid');
  grid.innerHTML = '';

  state.session.questionIds.forEach((qid, idx) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'exam-nav-btn';
    btn.textContent = String(idx + 1);
    btn.dataset.index = String(idx);

    const answered = state.session.answers[qid] !== null && state.session.answers[qid] !== undefined;
    if (idx === state.session.currentIndex) btn.classList.add('is-current');
    if (answered) btn.classList.add('is-answered');

    btn.addEventListener('click', () => goToQuestion(idx));
    li.appendChild(btn);
    grid.appendChild(li);
  });

  const total = state.session.questionIds.length;
  const answered = getAnsweredCount(state.session);
  $('exam-progress-text').textContent = `${state.session.currentIndex + 1} / ${total} · 응답 ${answered}/${total}`;
}

function getCurrentQuestion() {
  const qid = state.session.questionIds[state.session.currentIndex];
  return getQuestionById(state.questions, qid);
}

function renderCurrentQuestion() {
  const question = getCurrentQuestion();
  if (!question) return;

  const pattern = getPatternById(state.patterns, question.patternId);
  $('exam-question-meta').textContent =
    `${state.session.currentIndex + 1}번 · ${question.questionId} · ${pattern?.name || question.patternId} · ${question.year}년`;
  $('exam-question-stem').textContent = question.question;

  const list = $('exam-choices-list');
  list.innerHTML = '';
  const saved = state.session.answers[question.questionId];

  question.choices.forEach((text, i) => {
    const num = i + 1;
    const li = document.createElement('li');
    li.className = 'choice-item';

    const label = document.createElement('label');
    label.className = 'choice-label';
    if (saved === num) label.classList.add('is-selected');

    label.innerHTML = `
      <input type="radio" class="choice-input" name="exam-answer" value="${num}" ${saved === num ? 'checked' : ''}>
      <span class="choice-symbol">${getChoiceLabel(num)}</span>
      <span class="choice-text">${escapeHtml(text)}</span>
    `;

    const input = label.querySelector('input');
    input.addEventListener('change', () => {
      saveExamAnswer(state.session, question.questionId, num);
      document.querySelectorAll('#exam-choices-list .choice-label').forEach((l) => l.classList.remove('is-selected'));
      label.classList.add('is-selected');
      renderExamNav();
    });

    li.appendChild(label);
    list.appendChild(li);
  });

  renderExamNav();
  $('prev-question-btn').disabled = state.session.currentIndex === 0;
  $('next-question-btn').disabled = state.session.currentIndex >= state.session.questionIds.length - 1;
}

function goToQuestion(index) {
  if (!state.session) return;
  state.session.currentIndex = Math.max(0, Math.min(index, state.session.questionIds.length - 1));
  saveActiveExamSession(state.session);
  renderCurrentQuestion();
}

function goPrev() {
  goToQuestion(state.session.currentIndex - 1);
}

function goNext() {
  goToQuestion(state.session.currentIndex + 1);
}

function confirmSubmit() {
  const unanswered = state.session.questionIds.length - getAnsweredCount(state.session);
  if (unanswered > 0) {
    return window.confirm(`${unanswered}문항이 미응답입니다. 그래도 제출하시겠습니까?`);
  }
  return window.confirm('시험을 제출하시겠습니까? 제출 후 답안을 수정할 수 없습니다.');
}

function finalizeExam(fromTimeout = false) {
  stopTimer();
  clearBeforeUnload();

  if (!fromTimeout && !confirmSubmit()) return;

  state.session.timedOut = fromTimeout || state.session.timedOut;
  state.lastAnalysis = gradeExamSession(state.session, state.questions, state.patterns);
  submitExamSession(state.session, state.lastAnalysis, state.questions);
  state.session.status = 'submitted';
  renderResult(state.lastAnalysis);
  showView('result-section');
}

function renderResult(analysis) {
  const passClass = analysis.passed ? 'is-pass' : 'is-fail';
  $('result-subtitle').textContent = analysis.timedOut
    ? '시간 종료로 자동 제출되었습니다.'
    : `응답 ${analysis.answeredCount}/${analysis.totalQuestions} · 소요 ${formatExamTime(analysis.elapsedSeconds)}`;

  $('result-score-grid').innerHTML = `
    <div class="score-card score-card--main ${passClass}">
      <div class="score-card__value">${analysis.totalScore}점</div>
      <div class="score-card__label">${analysis.passed ? '합격 (60점 이상)' : '미달 (60점 미만)'}</div>
    </div>
    <div class="score-card">
      <div class="score-card__value">${analysis.accuracy}%</div>
      <div class="score-card__label">정답률</div>
    </div>
    <div class="score-card">
      <div class="score-card__value">${analysis.correctCount}</div>
      <div class="score-card__label">정답 수</div>
    </div>
    <div class="score-card">
      <div class="score-card__value">${analysis.unansweredCount}</div>
      <div class="score-card__label">미응답</div>
    </div>
  `;

  const patternList = $('pattern-result-list');
  patternList.innerHTML = '';
  analysis.patternStats.forEach((p) => {
    const li = document.createElement('li');
    li.className = 'pattern-result-item';
    const barClass =
      p.accuracy < 50 ? 'is-weak' : p.accuracy < 70 ? 'is-fair' : 'is-good';
    li.innerHTML = `
      <div>
        <div class="pattern-result-item__name">${escapeHtml(p.patternName)}</div>
        <div class="pattern-result-item__meta">${p.correct}/${p.total} 정답 · ${p.grade}급 · 기출 ${p.frequency}회</div>
      </div>
      <span class="achievement-badge is-${p.achievementLevel}">${p.achievementLabel} ${p.accuracy}%</span>
      <div class="pattern-result-item__bar-wrap">
        <div class="pattern-result-item__bar ${barClass}" style="width:${p.accuracy}%"></div>
      </div>
    `;
    patternList.appendChild(li);
  });

  const weakList = $('weak-pattern-list');
  weakList.innerHTML = '';
  if (!analysis.weakPatterns.length) {
    weakList.innerHTML = '<li class="section-desc">취약 Pattern 없음 — 전 Pattern 양호합니다.</li>';
  } else {
    analysis.weakPatterns.forEach((wp) => {
      const li = document.createElement('li');
      li.className = 'weak-pattern-item';
      li.innerHTML = `
        <strong>${escapeHtml(wp.patternName)}</strong> — ${wp.accuracy}%
        <p class="section-desc">${escapeHtml(wp.reason)}</p>
      `;
      weakList.appendChild(li);
    });
  }

  const recList = $('recommend-list');
  recList.innerHTML = '';
  analysis.recommendations.forEach((rec) => {
    const li = document.createElement('li');
    li.className = 'recommend-item';
    li.innerHTML = `
      <div class="recommend-item__title">${escapeHtml(rec.title)}</div>
      <p class="recommend-item__desc">${escapeHtml(rec.description)}</p>
      <a href="${rec.href}" class="recommend-item__link">바로가기 →</a>
    `;
    recList.appendChild(li);
  });
}

function bindEvents() {
  $('start-exam-btn').addEventListener('click', () => {
    const checked = document.querySelector('input[name="exam-preset"]:checked');
    startNewExam(checked?.value || state.selectedPresetId);
  });

  $('resume-exam-btn').addEventListener('click', resumeExam);
  $('abandon-exam-btn').addEventListener('click', () => {
    if (window.confirm('진행 중인 시험을 포기하고 새로 시작하시겠습니까?')) {
      clearActiveExamSession();
      hide($('exam-resume-panel'));
    }
  });

  $('prev-question-btn').addEventListener('click', goPrev);
  $('next-question-btn').addEventListener('click', goNext);
  $('submit-exam-btn').addEventListener('click', () => finalizeExam(false));
  $('retry-exam-btn').addEventListener('click', () => {
    state.session = null;
    state.lastAnalysis = null;
    renderHistorySummary();
    checkResumePanel();
    showView('setup-section');
  });
}

async function init() {
  applyTheme();
  bindEvents();

  try {
    const db = await loadPhase1Database();
    if (!db.valid) {
      showError(`데이터 로드 실패: ${db.errors.join(', ')}`);
      return;
    }

    state.master = db.master;
    state.questions = db.questions;
    state.patterns = db.patterns;

    $('exam-desc').textContent = EXAM_CONFIG.description;
    renderHistorySummary();
    renderPresets();
    checkResumePanel();

    hide($('loading-state'));
    showView('setup-section');

    const params = new URLSearchParams(window.location.search);
    if (params.get('result') === '1') {
      const latest = getLatestExamRecord();
      if (latest?.summary) {
        state.lastAnalysis = {
          totalQuestions: latest.summary.totalQuestions,
          answeredCount: latest.summary.answeredCount,
          correctCount: latest.summary.correctCount,
          totalScore: latest.summary.totalScore,
          maxScore: latest.summary.maxScore,
          accuracy: latest.summary.accuracy,
          passed: latest.summary.passed,
          timedOut: latest.timedOut,
          elapsedSeconds: latest.elapsedSeconds,
          unansweredCount: latest.summary.totalQuestions - latest.summary.answeredCount,
          patternStats: latest.patternStats || [],
          weakPatterns: latest.weakPatterns || [],
          recommendations: latest.recommendations || [],
        };
        renderResult(state.lastAnalysis);
        showView('result-section');
      }
    }
  } catch (err) {
    showError(err.message || '알 수 없는 오류');
  }
}

init();
