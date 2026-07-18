/**
 * AI Exam Learning Platform v2
 * AI Tutor Page — Phase 5 standalone UI
 */

import {
  loadPhase1Database,
  getQuestionById,
  getPatternById,
  getChoiceLabel,
} from './data-loader.js';
import { getItem, STORAGE_KEYS } from './storage.js';
import { getStatisticsForPattern } from './pattern-engine.js';
import { getWrongAnswerEntries, buildRetryUrl } from './wrong-note-engine.js';
import { generateAiExplanation } from './ai-tutor-engine.js';

const state = {
  questions: [],
  patterns: [],
  statistics: [],
  entries: [],
  selectedQuestionId: null,
  selectedWrongChoice: null,
  aiLevel: 'beginner',
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

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function firstWrongChoice(question) {
  const correct = Number(question.answer);
  for (let i = 1; i <= question.choices.length; i += 1) {
    if (i !== correct) return i;
  }
  return 1;
}

function renderAiExplanation(explanation) {
  const out = $('ai-explanation-output');
  out.innerHTML = '';

  explanation.sections.forEach((section) => {
    const wrap = document.createElement('section');
    wrap.className = 'ai-section';
    wrap.dataset.section = section.id;

    const title = document.createElement('h4');
    title.className = 'ai-section__title';
    title.textContent = section.title;

    const body = document.createElement('pre');
    body.className = 'ai-section__body';
    body.textContent = section.content;

    wrap.append(title, body);
    out.appendChild(wrap);
  });

  show(out);
}

function runAiExplanation() {
  const question = getQuestionById(state.questions, state.selectedQuestionId);
  if (!question || !state.selectedWrongChoice) return;

  const pattern = getPatternById(state.patterns, question.patternId);
  const stats = getStatisticsForPattern(state.statistics, question.patternId);
  const correct = Number(question.answer);

  const result = {
    correct: false,
    selectedAnswer: state.selectedWrongChoice,
    correctAnswer: correct,
  };

  const explanation = generateAiExplanation({
    question,
    pattern,
    result,
    statistics: stats,
    level: state.aiLevel,
  });

  renderAiExplanation(explanation);
}

function renderChoices(question) {
  const list = $('ai-choice-list');
  list.innerHTML = '';
  const correct = Number(question.answer);
  const selected = state.selectedWrongChoice || firstWrongChoice(question);

  question.choices.forEach((text, idx) => {
    const num = idx + 1;
    if (num === correct) return;

    const li = document.createElement('li');
    li.className = 'ai-choice-item';

    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'wrong-choice';
    input.value = String(num);
    input.checked = num === selected;

    input.addEventListener('change', () => {
      state.selectedWrongChoice = num;
      runAiExplanation();
    });

    label.append(input, document.createTextNode(` ${getChoiceLabel(num)} ${text}`));
    li.appendChild(label);
    list.appendChild(li);
  });

  state.selectedWrongChoice = selected;
}

function selectQuestion(questionId) {
  state.selectedQuestionId = questionId;
  const question = getQuestionById(state.questions, questionId);
  if (!question) return;

  document.querySelectorAll('.ai-wrong-item-btn').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.questionId === questionId);
  });

  const pattern = getPatternById(state.patterns, question.patternId);
  $('ai-workspace-heading').textContent = question.title || question.questionId;
  $('ai-question-meta').textContent = `${question.questionId} · ${pattern?.name || question.patternId} · ${question.examYear || '-'}년`;
  $('ai-question-stem').textContent = question.question;
  $('ai-retry-link').href = buildRetryUrl(questionId);

  renderChoices(question);
  hide($('ai-empty-workspace'));
  show($('ai-workspace'));
  hide($('ai-explanation-output'));
  $('ai-explanation-output').innerHTML = '';
  runAiExplanation();

  const url = new URL(window.location.href);
  url.searchParams.set('id', questionId);
  if (state.selectedWrongChoice) {
    url.searchParams.set('selected', String(state.selectedWrongChoice));
  }
  window.history.replaceState({}, '', url);
}

function renderWrongList() {
  const list = $('ai-wrong-list');
  list.innerHTML = '';

  state.entries.forEach((entry) => {
    const q = entry.question;
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ai-wrong-item-btn';
    btn.dataset.questionId = q.questionId;

    btn.innerHTML = `
      <span class="ai-wrong-item__id">${q.questionId}</span>
      <span class="ai-wrong-item__pattern">${entry.pattern?.name || entry.patternId} · ${entry.wrongCount}회</span>
      <p class="ai-wrong-item__preview">${q.question}</p>
    `;

    btn.addEventListener('click', () => selectQuestion(q.questionId));
    li.appendChild(btn);
    list.appendChild(li);
  });
}

function bindEvents() {
  document.querySelectorAll('.ai-level-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ai-level-btn').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      state.aiLevel = btn.dataset.level || 'beginner';
      if (!$('ai-explanation-output').hidden) {
        runAiExplanation();
      }
    });
  });

  $('ai-generate-btn').addEventListener('click', runAiExplanation);
}

function showError(message) {
  hide($('loading-state'));
  hide($('ai-tutor-section'));
  hide($('empty-state'));
  $('error-message').textContent = message;
  show($('error-state'));
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

    state.questions = db.questions;
    state.patterns = db.patterns;
    state.statistics = db.statistics;
    state.entries = getWrongAnswerEntries(db.questions, db.patterns);

    hide($('loading-state'));

    if (!state.entries.length) {
      show($('empty-state'));
      return;
    }

    show($('ai-tutor-section'));
    renderWrongList();

    const urlId = getQueryParam('id');
    const urlSelected = getQueryParam('selected');
    const urlLevel = getQueryParam('level');

    if (urlLevel && ['beginner', 'intermediate', 'advanced'].includes(urlLevel)) {
      state.aiLevel = urlLevel;
      document.querySelectorAll('.ai-level-btn').forEach((b) => {
        b.classList.toggle('is-active', b.dataset.level === urlLevel);
      });
    }

    const targetId = urlId && getQuestionById(state.questions, urlId) ? urlId : state.entries[0].questionId;
    if (urlSelected) {
      state.selectedWrongChoice = Number(urlSelected);
    }
    selectQuestion(targetId);
  } catch (err) {
    showError(err.message || '알 수 없는 오류');
  }
}

init();
