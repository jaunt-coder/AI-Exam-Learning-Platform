/**
 * AI Exam Learning Platform v2
 * Question Page — Phase 2 UI (Pattern 선택 → 풀이)
 */

import {
  loadPhase1Database,
  getQuestionById,
  getPatternById,
  getChoiceLabel,
} from './data-loader.js';
import { getItem, STORAGE_KEYS } from './storage.js';
import {
  loadProgress,
  gradeAnswer,
  recordAttempt,
  createSessionScore,
  updateSessionScore,
  formatSessionScore,
  getResultMessage,
  getWrongAnswerCount,
  filterQuestionsByPattern,
} from './question-engine.js';
import { getStatisticsForPattern } from './pattern-engine.js';
import { generateTutorLesson } from './ai-tutor-engine.js';
import { renderTutorLesson } from './ai-tutor-render.js';
import { trackQuestionStart, trackTutorView } from './learning-event.js';
import {
  mountQuestionStem,
  mountQuestionTable,
  renderChoiceItems,
} from './shared-renderer.js';

const state = {
  master: null,
  questions: [],
  patterns: [],
  statistics: [],
  session: createSessionScore(),
  currentPatternId: null,
  filteredQuestions: [],
  currentIndex: -1,
  lastQuestion: null,
  lastResult: null,
  aiLevel: 'beginner',
  tutorViewed: false,
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

function getQueryParam(key) {
  return new URLSearchParams(window.location.search).get(key);
}

function formatOverallScore(progress) {
  const { totalAnswered, totalCorrect } = progress.stats;
  if (totalAnswered === 0) return '아직 풀이 기록 없음';
  const pct = Math.round((totalCorrect / totalAnswered) * 100);
  return `${totalCorrect} / ${totalAnswered} (${pct}%)`;
}

function updateScoreBar() {
  const progress = loadProgress();
  $('overall-score').textContent = formatOverallScore(progress);
  $('wrong-count').textContent = `${getWrongAnswerCount()}문항`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function gradeClass(grade) {
  return `pattern-grade pattern-grade--${(grade || 'B').toLowerCase()}`;
}

function renderQuestionTable(question) {
  mountQuestionTable(question, $('question-table'));
}

function renderPatternList() {
  updateScoreBar();
  const chapter = state.master?.chapters?.[0];
  if (chapter) {
    $('chapter-desc').textContent = `${chapter.name} · ${state.patterns.length} Pattern · PDF 검증 ${state.questions.length}문항`;
  }

  const listEl = $('pattern-list');
  listEl.innerHTML = '';
  const progress = loadProgress();

  state.patterns.forEach((pattern) => {
    const li = document.createElement('li');
    li.className = 'pattern-list-item';
    li.setAttribute('role', 'listitem');

    const qs = filterQuestionsByPattern(state.questions, pattern.patternId);
    const answered = qs.filter((q) => progress.answered[q.questionId]).length;
    const correct = qs.filter((q) => progress.answered[q.questionId]?.correct).length;

    const link = document.createElement('a');
    link.className = 'pattern-card';
    link.href = `question.html?pattern=${encodeURIComponent(pattern.patternId)}`;
    link.innerHTML = `
      <span class="${gradeClass(pattern.grade)}">${pattern.grade}급</span>
      <h3 class="pattern-card__title">${escapeHtml(pattern.name)}</h3>
      <p class="pattern-card__meta">${pattern.frequency}문항 · ${pattern.years.join(', ')}년</p>
      <p class="pattern-card__progress">${correct} / ${qs.length} 정답 · ${answered} 풀이</p>
    `;

    li.appendChild(link);
    listEl.appendChild(li);
  });
}

function renderQuestionList(patternId) {
  const pattern = getPatternById(state.patterns, patternId);
  if (!pattern) return;

  state.currentPatternId = patternId;
  state.filteredQuestions = filterQuestionsByPattern(state.questions, patternId);

  $('pattern-desc').textContent = `${pattern.name} (${pattern.grade}급) · ${state.filteredQuestions.length}문항`;

  const listEl = $('question-list');
  const progress = loadProgress();
  listEl.innerHTML = '';

  state.filteredQuestions.forEach((q) => {
    const li = document.createElement('li');
    li.className = 'question-list-item';

    const attempt = progress.answered[q.questionId];
    const link = document.createElement('a');
    link.className = 'question-list-link';
    link.href = `question.html?pattern=${encodeURIComponent(patternId)}&id=${encodeURIComponent(q.questionId)}`;

    if (attempt?.correct) link.classList.add('is-answered-correct');
    else if (attempt) link.classList.add('is-answered-wrong');

    link.innerHTML = `
      <span class="q-badge">${q.year}년 · ${q.source?.questionNumber ?? '?'}번</span>
      <span class="q-stem-preview">${escapeHtml(q.question)}</span>
    `;

    li.appendChild(link);
    listEl.appendChild(li);
  });
}

function renderQuestionMeta(question) {
  const pattern = getPatternById(state.patterns, question.patternId);
  const isRetry = new URLSearchParams(window.location.search).get('retry') === '1';
  $('question-meta').innerHTML = `
    <span class="meta-tag">${question.questionId}</span>
    <span class="meta-tag">${question.year}년 제${question.source?.examRound ?? '?'}회 ${question.source?.questionNumber ?? '?'}번</span>
    <span class="meta-tag">${pattern?.name || question.patternId}</span>
    <span class="meta-tag">${pattern?.grade || '-'}급 Pattern</span>
    ${isRetry ? '<span class="meta-tag" style="color:var(--color-error)">오답 복습</span>' : ''}
  `;
}

function renderChoices(question) {
  renderChoiceItems(question, $('choices-list'), {
    inputName: 'answer',
    idPrefix: 'choice',
    required: true,
    getChoiceLabel,
  });
}

function setChoiceStates(selected, correct, submitted) {
  document.querySelectorAll('.choice-label').forEach((label) => {
    const input = label.querySelector('.choice-input');
    if (!input) return;
    const val = Number(input.value);
    label.classList.remove('is-selected', 'is-correct', 'is-wrong', 'is-disabled');
    if (submitted) {
      label.classList.add('is-disabled');
      input.disabled = true;
      if (val === correct) label.classList.add('is-correct');
      else if (val === selected) label.classList.add('is-wrong');
    } else if (input.checked) {
      label.classList.add('is-selected');
    }
  });
}

function renderSolveView(question) {
  const pool = state.filteredQuestions.length
    ? state.filteredQuestions
    : filterQuestionsByPattern(state.questions, question.patternId);

  state.currentPatternId = question.patternId;
  state.filteredQuestions = pool;
  state.currentIndex = pool.findIndex((q) => q.questionId === question.questionId);
  state.tutorViewed = false;

  trackQuestionStart(question);

  $('back-to-list').href = `question.html?pattern=${encodeURIComponent(question.patternId)}`;

  renderQuestionMeta(question);

  mountQuestionStem(question, $('question-stem'));
  renderQuestionTable(question);
  renderChoices(question);

  hide($('result-panel'));
  hide($('ai-tutor-panel'));
  hide($('ai-explanation-output'));
  $('ai-explanation-output').innerHTML = '';
  hide($('ai-standalone-link-wrap'));
  hide($('next-btn'));
  hide($('wrong-saved-notice'));
  $('submit-btn').disabled = false;
  $('submit-btn').hidden = false;
  $('answer-form').reset();
  setChoiceStates(null, null, false);
}

function runAiExplanation() {
  if (!state.lastQuestion || !state.lastResult) return;

  const pattern = getPatternById(state.patterns, state.lastQuestion.patternId);
  const stats = getStatisticsForPattern(state.statistics, state.lastQuestion.patternId);

  const lesson = generateTutorLesson({
    question: state.lastQuestion,
    pattern,
    result: state.lastResult,
    statistics: stats,
    allQuestions: state.questions,
    allPatterns: state.patterns,
    level: state.aiLevel,
  });

  renderTutorLesson(lesson, $('ai-explanation-output'));
  show($('ai-explanation-output'));

  if (!state.tutorViewed) {
    trackTutorView(state.lastQuestion);
    state.tutorViewed = true;
  }
}

function bindAiTutorEvents() {
  document.querySelectorAll('.ai-level-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ai-level-btn').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      state.aiLevel = btn.dataset.level || 'beginner';
      if (state.lastQuestion && state.lastResult) {
        runAiExplanation();
      }
    });
  });
}

function showResult(question, result) {
  state.lastQuestion = question;
  state.lastResult = result;

  const pattern = getPatternById(state.patterns, question.patternId);
  const panel = $('result-panel');

  panel.classList.remove('is-correct', 'is-wrong');
  panel.classList.add(result.correct ? 'is-correct' : 'is-wrong');

  $('result-message').textContent = getResultMessage(result);
  $('session-score').textContent = `이번 세션: ${formatSessionScore(state.session)}`;

  if (result.correct) {
    hide($('wrong-saved-notice'));
  } else {
    show($('wrong-saved-notice'));
    updateScoreBar();
  }

  show(panel);
  show($('ai-tutor-panel'));
  hide($('ai-explanation-output'));
  $('ai-explanation-output').innerHTML = '';
  show($('next-btn'));
  $('submit-btn').hidden = true;

  setChoiceStates(result.selectedAnswer, result.correctAnswer, true);
  runAiExplanation();

  if (!result.correct) {
    const link = $('ai-standalone-link');
    if (link) {
      const params = new URLSearchParams({
        id: question.questionId,
        selected: String(result.selectedAnswer),
        level: state.aiLevel,
      });
      link.href = `ai-tutor.html?${params.toString()}`;
      show($('ai-standalone-link-wrap'));
    }
  }
}

function goToNextQuestion() {
  if (state.currentIndex < 0 || !state.filteredQuestions.length) return;
  const next = state.filteredQuestions[state.currentIndex + 1];
  const pattern = state.currentPatternId || next?.patternId;
  if (next && pattern) {
    window.location.href = `question.html?pattern=${encodeURIComponent(pattern)}&id=${encodeURIComponent(next.questionId)}`;
  } else if (pattern) {
    window.location.href = `question.html?pattern=${encodeURIComponent(pattern)}`;
  } else {
    window.location.href = 'question.html';
  }
}

function bindSolveEvents() {
  $('answer-form').addEventListener('submit', onSubmit);
  $('next-btn').addEventListener('click', goToNextQuestion);
  bindAiTutorEvents();
  $('choices-list').addEventListener('change', (e) => {
    if (e.target.name !== 'answer') return;
    document.querySelectorAll('.choice-label').forEach((l) => l.classList.remove('is-selected'));
    e.target.closest('.choice-label')?.classList.add('is-selected');
  });
}

function onSubmit(e) {
  e.preventDefault();
  const id = getQueryParam('id');
  const question = getQuestionById(state.questions, id);
  if (!question) return;

  const selected = document.querySelector('input[name="answer"]:checked');
  if (!selected) return;

  const result = gradeAnswer(question, Number(selected.value));
  recordAttempt(question, result, {
    trackLearningEvent: true,
    usedTutor: state.tutorViewed,
  });
  updateSessionScore(state.session, result.correct);
  showResult(question, result);
}

function showError(message) {
  hide($('loading-state'));
  hide($('pattern-section'));
  hide($('question-list-section'));
  hide($('question-solve-section'));
  $('error-message').textContent = message;
  show($('error-state'));
}

function hideAllViews() {
  hide($('pattern-section'));
  hide($('question-list-section'));
  hide($('question-solve-section'));
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
    state.questions = db.questions;
    state.patterns = db.patterns;
    state.statistics = db.statistics;

    hide($('loading-state'));
    hideAllViews();

    const patternId = getQueryParam('pattern');
    const questionId = getQueryParam('id');

    if (questionId) {
      const question = getQuestionById(state.questions, questionId);
      if (!question) {
        showError(`문항을 찾을 수 없습니다: ${questionId}`);
        return;
      }
      if (patternId) {
        state.filteredQuestions = filterQuestionsByPattern(state.questions, patternId);
      }
      show($('question-solve-section'));
      renderSolveView(question);
      bindSolveEvents();
    } else if (patternId) {
      const pattern = getPatternById(state.patterns, patternId);
      if (!pattern) {
        showError(`Pattern을 찾을 수 없습니다: ${patternId}`);
        return;
      }
      show($('question-list-section'));
      renderQuestionList(patternId);
    } else {
      show($('pattern-section'));
      renderPatternList();
    }
  } catch (error) {
    showError(`${error.message} — 로컬 HTTP 서버에서 실행해 주세요. (python -m http.server 8080)`);
  }
}

document.addEventListener('DOMContentLoaded', init);
