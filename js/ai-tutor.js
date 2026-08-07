/**
 * AI Exam Learning Platform v2
 * AI Tutor Page — AI 과외 선생님 v2
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
import { generateTutorLesson } from './ai-tutor-engine.js';
import { renderTutorLesson } from './ai-tutor-render.js';
import { generateTutorLessonWithRuntime } from './professor-explanation/professor-runtime-adapter.js';
import { questionResolver } from './student/student-resolver.js';
import { getTutorContext } from './learning-engine/learning-engine.js';
import { buildTutorEvidenceContext } from './evidence/evidence-engine.js';
import { buildExamTutorContext } from './exam-goal/exam-goal-engine.js';
import {
  renderEvidenceDetail,
  bindEvidenceAccordion,
} from './evidence/evidence-renderer.js';

function resolveForTutor(questionId) {
  const original = getQuestionById(state.questions, questionId);
  return original ? questionResolver(original) : null;
}

const state = {
  questions: [],
  patterns: [],
  statistics: [],
  entries: [],
  selectedQuestionId: null,
  selectedWrongChoice: null,
  aiLevel: 'beginner',
  lessonToken: 0,
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

async function runTutorLesson() {
  const question = resolveForTutor(state.selectedQuestionId);
  if (!question || !state.selectedWrongChoice) return;

  const pattern = getPatternById(state.patterns, question.patternId);
  const stats = getStatisticsForPattern(state.statistics, question.patternId);
  const correct = Number(question.answer);
  const token = ++state.lessonToken;

  const result = {
    correct: false,
    selectedAnswer: state.selectedWrongChoice,
    correctAnswer: correct,
  };

  let learningContext = null;
  let evidenceContext = null;
  try {
    learningContext = getTutorContext(question.questionId, question.patternId);
  } catch (_) { /* non-critical */ }
  try {
    evidenceContext = buildTutorEvidenceContext(
      question.questionId,
      question.patternId,
      state.questions || [],
    );
    if (learningContext) {
      learningContext.evidence = evidenceContext;
    } else {
      learningContext = { evidence: evidenceContext };
    }
  } catch (_) { /* Evidence non-critical */ }

  /* Sprint-16B — attach exam goal context only; do not change tutor generation */
  try {
    const examCtx = buildExamTutorContext({
      questions: state.questions || [],
      patterns: state.patterns || [],
    });
    if (learningContext) {
      learningContext.examGoal = examCtx.examGoal;
      learningContext.examPhase = examCtx.examPhase;
      learningContext.riskPatterns = examCtx.riskPatterns;
      learningContext.todayTasks = examCtx.todayTasks;
    } else {
      learningContext = examCtx;
    }
  } catch (_) { /* Exam Goal non-critical */ }

  const out = $('ai-explanation-output');
  if (out) {
    out.hidden = false;
    out.setAttribute('aria-busy', 'true');
    out.innerHTML = '<p class="ll-hint">AI 과외 생성 중… Runtime 우선</p>';
  }
  updateProviderBadge('…');

  let lesson;
  try {
    /* Sprint-17D.5 — Professor Runtime Adapter (Gemini Runtime → LOCAL fallback) */
    lesson = await generateTutorLessonWithRuntime({
      question,
      pattern,
      result,
      statistics: stats,
      allQuestions: state.questions,
      allPatterns: state.patterns,
      level: state.aiLevel,
      learningContext,
    });
  } catch (err) {
    console.warn('[ai-tutor] runtime adapter failed — local lesson', err);
    lesson = generateTutorLesson({
      question,
      pattern,
      result,
      statistics: stats,
      allQuestions: state.questions,
      allPatterns: state.patterns,
      level: state.aiLevel,
      learningContext,
    });
    lesson.provider = 'LOCAL_PROFESSOR';
  }

  if (token !== state.lessonToken) return;

  updateProviderBadge(lesson.provider || 'LOCAL_PROFESSOR');
  renderTutorLesson(lesson, out);
  if (out) out.setAttribute('aria-busy', 'false');
  if (out && evidenceContext?.evidence) {
    const host = document.createElement('div');
    host.className = 'ev-tutor-host';
    host.innerHTML = renderEvidenceDetail(
      evidenceContext.evidence,
      evidenceContext.summary,
      { expanded: true },
    );
    out.appendChild(host);
    bindEvidenceAccordion(host);
  }
  show(out);
}

function updateProviderBadge(provider) {
  const el = $('ai-tutor-provider');
  if (!el) return;
  const label = String(provider || 'LOCAL_PROFESSOR');
  el.textContent = `provider: ${label}`;
  el.dataset.provider = label;
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
      runTutorLesson();
    });

    label.append(input, document.createTextNode(` ${getChoiceLabel(num)} ${text}`));
    li.appendChild(label);
    list.appendChild(li);
  });

  state.selectedWrongChoice = selected;
}

function selectQuestion(questionId) {
  state.selectedQuestionId = questionId;
  const question = resolveForTutor(questionId);
  if (!question) return;

  document.querySelectorAll('.ai-wrong-item-btn').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.questionId === questionId);
  });

  const pattern = getPatternById(state.patterns, question.patternId);
  $('ai-workspace-heading').textContent = question.title || question.questionId;
  $('ai-question-meta').textContent = `${question.questionId} · ${pattern?.name || question.patternId} · ${question.year || '-'}년`;
  $('ai-question-stem').textContent = question.question;
  $('ai-retry-link').href = buildRetryUrl(questionId);

  renderChoices(question);
  hide($('ai-empty-workspace'));
  show($('ai-workspace'));
  hide($('ai-explanation-output'));
  $('ai-explanation-output').innerHTML = '';
  runTutorLesson();

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
      if (state.selectedQuestionId) {
        runTutorLesson();
      }
    });
  });
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

    state.questions = db.questions.map((q) => questionResolver(q));
    state.patterns = db.patterns;
    state.statistics = db.statistics;
    state.entries = getWrongAnswerEntries(state.questions, db.patterns);

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

    const targetId = urlId && resolveForTutor(urlId) ? urlId : state.entries[0].questionId;
    if (urlSelected) {
      state.selectedWrongChoice = Number(urlSelected);
    }
    selectQuestion(targetId);
  } catch (err) {
    showError(err.message || '알 수 없는 오류');
  }
}

init();
