/**
 * Sprint-08 Session UX Refactor — Learning Flow First
 * Presentation layer only. No Runtime / Storage / DB / AI changes.
 */

import { runLearningLoopCycle } from '../runtime/learning-loop.js';
import {
  createEmptyLearningState,
  loadLearningState,
  saveLearningState,
} from '../runtime/state-update.js';
import { getItem, removeItem, setItem, STORAGE_KEYS } from './storage.js';
import { renderQuestionStemHtml } from './stem-renderer.js';
import { choiceLabel, loadStudyBundle } from './study-data-loader.js';
import { listStudyPatterns } from './pattern-lesson.js';
import { mountEvidencePad } from './evidence-pad.js';
import { mountRetrievalPrompt, renderRecallTimeline } from './retrieval-timeline.js';
import { loadAttemptLog } from '../runtime/attempt-service.js';
import {
  EVIDENCE_DRAFT_KEY,
  listEvidence,
} from '../runtime/evidence-service.js';
import {
  listRetrievals,
  RETRIEVAL_DRAFT_KEY,
  DEFAULT_RETRIEVAL_PROMPT,
} from '../runtime/retrieval-service.js';
import { exportSessionV3 } from './session-export-v3.js';
import {
  ensureProgress,
  touchLocal,
  getSyncStatus,
  setAdapter,
} from '../runtime/sync-service.js';
import { createLocalStorageAdapter } from '../runtime/local-storage-adapter.js';
import {
  persistResumeSnapshot,
  discardResume,
  mountResumePrompt,
} from './session-resume.js';
import { exportSyncStateV4 } from './import-export-v4.js';
import {
  mountReviewEntry,
  applyResolvedToStudyQuestion,
  toReviewOriginal,
} from './reviewer/review-entry.js';
import { studentQuestionForDisplay } from './student/student-workspace.js';
import {
  enrichStudyQuestionsWithApproved,
  getApprovedSolution,
  loadSolutionOverlay,
  resolveOverlayQuestionId,
} from './solution-overlay.js';

const STUDENT_ID = 'm1_demo_student';
const KEY_MODE = 'learning.studyMode.v1';
const KEY_VIEW = 'learning.viewMode.v1';
const KEY_SESSION = 'learning.session.v1';
const KEY_TODAY_PATTERN = 'learning.todayPattern.v1';

const MASTER_STAGES = [
  'preview',
  'intro',
  'algorithm',
  'knowhow',
  'checklist',
  'question',
  'result',
  'review',
  'retrieval',
];

const EXAM_STAGES = ['question', 'result', 'review', 'retrieval'];

const STAGE_LABELS = {
  preview: 'Pattern Preview',
  intro: 'Pattern 소개',
  algorithm: '풀이 알고리즘',
  knowhow: '시험장 Know-how',
  checklist: 'Checklist',
  question: '문제 적용',
  result: '제출 결과',
  review: 'Pattern Review',
  retrieval: '스스로 회상',
};

/** Fixed copy — not Recommendation Engine */
const NEXT_REVIEW_COPY =
  '내일 같은 Pattern을 Exam Mode로 1문항만 다시 풀어 보세요.';

const els = {
  screenHome: document.getElementById('screen-home'),
  screenPick: document.getElementById('screen-pattern-pick'),
  screenFlow: document.getElementById('screen-flow'),
  screenClosing: document.getElementById('screen-closing'),
  screenSummary: document.getElementById('screen-session-summary'),
  pickList: document.getElementById('pattern-pick-list'),
  todayName: document.getElementById('today-pattern-name'),
  todayWhy: document.getElementById('today-why'),
  todayWhen: document.getElementById('today-when'),
  todayTime: document.getElementById('today-time'),
  todayQcount: document.getElementById('today-qcount'),
  todayGoal: document.getElementById('today-goal'),
  homeStatus: document.getElementById('home-status'),
  homeSessionHint: document.getElementById('home-session-hint'),
  sessionProgressHome: document.getElementById('session-progress-home'),
  closingBody: document.getElementById('closing-body'),
  summaryBody: document.getElementById('session-summary-body'),
  summaryLead: document.getElementById('summary-lead'),
  sessionExportSlot: document.getElementById('session-export-slot'),
  stageLabel: document.getElementById('stage-label'),
  progressPattern: document.getElementById('study-progress-pattern'),
  progressQuestion: document.getElementById('study-progress-question'),
  stageDots: document.getElementById('stage-dots'),
  flowActions: document.getElementById('flow-actions'),
  dashPanel: document.getElementById('dash-panel'),
  dashBody: document.getElementById('dashboard-body'),
  btnDashToggle: document.getElementById('btn-dash-toggle'),
  studySideCol: document.getElementById('study-side-col'),
  panels: {
    preview: document.getElementById('panel-preview'),
    intro: document.getElementById('panel-intro'),
    algorithm: document.getElementById('panel-algorithm'),
    knowhow: document.getElementById('panel-knowhow'),
    checklist: document.getElementById('panel-checklist'),
    question: document.getElementById('panel-question'),
    result: document.getElementById('panel-result'),
    review: document.getElementById('panel-review'),
    retrieval: document.getElementById('panel-retrieval'),
  },
  questionMeta: document.getElementById('question-meta'),
  questionStem: document.getElementById('question-stem'),
  questionChoices: document.getElementById('question-choices'),
  btnSubmit: document.getElementById('btn-submit'),
  btnStartToday: document.getElementById('btn-start-today'),
  btnPickPattern: document.getElementById('btn-pick-pattern'),
  btnBackHome: document.getElementById('btn-back-home'),
  btnPrev: document.getElementById('btn-prev-stage'),
  btnNext: document.getElementById('btn-next-stage'),
  btnChangePattern: document.getElementById('btn-change-pattern'),
  btnReset: document.getElementById('btn-reset-demo'),
  btnDev: document.getElementById('btn-toggle-dev'),
  btnContinueLearning: document.getElementById('btn-continue-learning'),
  btnFinishToday: document.getElementById('btn-finish-today'),
  btnSummaryHome: document.getElementById('btn-summary-home'),
  rCorrect: document.getElementById('r-correct'),
  rSelected: document.getElementById('r-selected'),
  rOutcome: document.getElementById('r-outcome'),
  rPattern: document.getElementById('r-pattern'),
  dPatternsLearned: document.getElementById('d-patterns-learned'),
  dQuestions: document.getElementById('d-questions'),
  dPatternsReviewed: document.getElementById('d-patterns-reviewed'),
  dEvidence: document.getElementById('d-evidence'),
  dRetrieval: document.getElementById('d-retrieval'),
  dTime: document.getElementById('d-time'),
  dPattern: document.getElementById('d-pattern'),
  dMastery: document.getElementById('d-mastery'),
  dReco: document.getElementById('d-reco'),
  status: document.getElementById('loop-status'),
  evidenceRoot: document.getElementById('evidence-pad-root'),
  betaScopeNotice: document.getElementById('beta-scope-notice'),
  resumeHost: document.getElementById('resume-host'),
  homeSyncBadge: document.getElementById('home-sync-badge'),
};

/** @type {any} */
let bundle = null;
/** @type {ReturnType<typeof listStudyPatterns>} */
let studyPatterns = [];
/** @type {'pattern_master'|'exam'} */
let studyMode = 'pattern_master';
/** @type {'learner'|'developer'} */
let viewMode = 'learner';
let patternIndex = 0;
let questionIndex = 0;
let stageIndex = 0;
/** @type {any} */
let lesson = null;
/** @type {any} */
let currentQuestion = null;
let submitted = false;
let lastGradeResult = null;
/** @type {object|null} */
let lastAttemptEvent = null;
let sessionStartedAt = Date.now();
/** @type {ReturnType<typeof mountEvidencePad>|null} */
let evidencePad = null;
/** @type {ReturnType<typeof mountRetrievalPrompt>|null} */
let retrievalMount = null;
let retrievalSavedForQuestion = false;
let evidenceSavedForQuestion = false;
/** Dashboard open state — desktop default open, tablet/mobile start collapsed */
let dashExpanded = null;

function sessionIdForExport() {
  const d = new Date(sessionStartedAt || Date.now());
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `session-${y}${m}${day}`;
}

function buildEvidenceContext() {
  if (!currentQuestion || !lesson) return null;
  const selected = selectedAnswer();
  const grade = lastGradeResult;
  const evt = lastAttemptEvent;
  return {
    question_id: currentQuestion.questionId,
    pattern_id: lesson.pattern_id,
    attempt_id: evt?.event_id || null,
    session_id: sessionIdForExport(),
    student_answer:
      evt?.selected_answer ?? selected ?? grade?.selectedAnswer ?? null,
    correct_answer: currentQuestion.answer,
    is_correct:
      grade?.result === 'correct'
        ? true
        : grade?.result === 'wrong'
          ? false
          : null,
    study_mode: studyMode,
  };
}

function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function assetOr(value, fallback) {
  const v = String(value ?? '').trim();
  return v || fallback;
}

function stages() {
  return studyMode === 'exam' ? EXAM_STAGES : MASTER_STAGES;
}

function currentStage() {
  return stages()[stageIndex];
}

function emptySession(startedAt = Date.now()) {
  return {
    startedAt,
    patternsLearned: [],
    patternsReviewed: [],
    finishedAt: null,
    exportedAt: null,
  };
}

function loadPrefs() {
  studyMode = getItem(KEY_MODE, 'pattern_master') || 'pattern_master';
  viewMode = getItem(KEY_VIEW, 'learner') || 'learner';
  const session = getItem(KEY_SESSION, null);
  if (session?.startedAt) sessionStartedAt = session.startedAt;
  else {
    sessionStartedAt = Date.now();
    setItem(KEY_SESSION, emptySession(sessionStartedAt));
  }
}

function getSession() {
  return getItem(KEY_SESSION, emptySession(sessionStartedAt));
}

function saveSessionPatch(patch) {
  const cur = getSession();
  setItem(KEY_SESSION, { ...cur, ...patch });
  touchLocal();
}

function sessionAttempts() {
  const since = sessionStartedAt;
  return loadAttemptLog().filter((e) => {
    const t = Date.parse(e.timestamp || e.created_at || '');
    return !Number.isNaN(t) && t >= since;
  });
}

function sessionRetrievals() {
  return listRetrievals({
    sinceIso: new Date(sessionStartedAt).toISOString(),
  });
}

function sessionMetrics() {
  const session = getSession();
  const sinceIso = new Date(session.startedAt || sessionStartedAt).toISOString();
  const learned = session.patternsLearned || [];
  const patternTotal = Math.max(1, studyPatterns.length);
  const patternDone = learned.length;
  const qTotal = studyPatterns.reduce(
    (n, sp) => n + (sp.questions?.length || 0),
    0
  );
  const attempts = sessionAttempts();
  const qDone = new Set(
    attempts.map((a) => a.question_id || a.questionId).filter(Boolean)
  ).size;
  const evidenceCount = listEvidence({ sinceIso }).length;
  const retrievalCount = sessionRetrievals().length;
  const endMs = session.finishedAt || Date.now();
  const mins = Math.max(
    0,
    Math.round((endMs - (session.startedAt || sessionStartedAt)) / 60000)
  );
  const remaining = Math.max(0, patternTotal - patternDone);
  const pct = Math.min(
    100,
    Math.round((patternDone / patternTotal) * 100)
  );
  return {
    session,
    patternDone,
    patternTotal,
    qDone,
    qTotal: Math.max(1, qTotal),
    evidenceCount,
    retrievalCount,
    mins,
    remaining,
    pct,
    learned,
  };
}

function markPatternLearned(pid) {
  const cur = getItem(KEY_SESSION, { patternsLearned: [], patternsReviewed: [] });
  const set = new Set(cur.patternsLearned || []);
  set.add(pid);
  saveSessionPatch({ patternsLearned: [...set] });
}

function markPatternReviewed(pid) {
  const cur = getItem(KEY_SESSION, { patternsLearned: [], patternsReviewed: [] });
  const set = new Set(cur.patternsReviewed || []);
  set.add(pid);
  saveSessionPatch({ patternsReviewed: [...set] });
}

function applyViewMode() {
  document.body.classList.toggle('is-developer', viewMode === 'developer');
  document.body.classList.toggle('is-learner', viewMode === 'learner');
  if (els.btnDev) {
    els.btnDev.setAttribute('aria-pressed', String(viewMode === 'developer'));
    els.btnDev.setAttribute(
      'aria-label',
      viewMode === 'developer' ? '개발자 보기 켜짐' : '개발자 보기'
    );
    els.btnDev.title =
      viewMode === 'developer' ? '학습자 보기로' : '개발자 보기';
  }
}

function showScreen(name) {
  els.screenHome.hidden = name !== 'home';
  els.screenPick.hidden = name !== 'pick';
  els.screenFlow.hidden = name !== 'flow';
  els.screenClosing.hidden = name !== 'closing';
  if (els.screenSummary) els.screenSummary.hidden = name !== 'summary';
  if (els.evidenceRoot) {
    els.evidenceRoot.hidden = name !== 'flow';
  }
  if (name === 'flow') evidencePad?.refreshProgress?.();
}

function setLearnerStatus(msg) {
  if (els.status) els.status.textContent = msg;
  if (els.homeStatus && !els.screenHome.hidden) els.homeStatus.textContent = msg;
}

/** Single Session Progress data source (WP-07) */
function applySessionProgress(m) {
  const root = els.sessionProgressHome;
  if (root) {
    const set = (key, val) => {
      const el = root.querySelector(`[data-sp="${key}"]`);
      if (el) el.textContent = val;
    };
    set('pattern', `${m.patternDone} / ${m.patternTotal}`);
    set('question', `${m.qDone} / ${m.qTotal}`);
    set('evidence', String(m.evidenceCount));
    set('retrieval', String(m.retrievalCount));
  }
  if (els.dPatternsLearned) {
    els.dPatternsLearned.textContent = `${m.patternDone} / ${m.patternTotal}`;
  }
  if (els.dQuestions) {
    els.dQuestions.textContent = `${m.qDone} / ${m.qTotal}`;
  }
  if (els.dEvidence) els.dEvidence.textContent = String(m.evidenceCount);
  if (els.dRetrieval) els.dRetrieval.textContent = String(m.retrievalCount);
  if (els.dPatternsReviewed) {
    els.dPatternsReviewed.textContent = String(
      (m.session.patternsReviewed || []).length
    );
  }
  if (els.dTime) els.dTime.textContent = `${m.mins}분`;
  if (els.dPattern) els.dPattern.textContent = lesson?.name || '—';
  if (els.dMastery) els.dMastery.textContent = 'unknown';
  if (els.dReco) els.dReco.textContent = 'absent';

  if (els.homeSessionHint) {
    if (m.patternDone === 0) {
      els.homeSessionHint.textContent =
        '아직 오늘 공부를 시작하지 않았습니다.';
    } else if (m.session.finishedAt) {
      els.homeSessionHint.textContent = `오늘 Pattern ${m.patternDone}개를 익혔습니다.`;
    } else {
      els.homeSessionHint.textContent = `Session 진행 중 · Pattern ${m.patternDone} / ${m.patternTotal}`;
    }
  }
}

function refreshDashboard() {
  applySessionProgress(sessionMetrics());
}

function preferredDashExpanded() {
  if (typeof window === 'undefined') return true;
  const w = window.innerWidth;
  if (w <= 768) return false; /* mobile: hidden/collapsed */
  if (w <= 1024) return false; /* tablet: default collapse */
  return true; /* desktop: open, collapsible */
}

function applyDashExpanded(expanded) {
  dashExpanded = expanded;
  const panel = els.dashPanel;
  const body = els.dashBody;
  const btn = els.btnDashToggle;
  const side = els.studySideCol;
  if (panel) panel.classList.toggle('is-collapsed', !expanded);
  if (body) body.hidden = !expanded;
  if (btn) {
    btn.setAttribute('aria-expanded', String(expanded));
    btn.textContent = expanded ? '접기' : '펼치기';
  }
  /* Mobile: hide side column when collapsed */
  if (side && window.innerWidth <= 768) {
    side.classList.toggle('is-mobile-hidden', !expanded);
  } else if (side) {
    side.classList.remove('is-mobile-hidden');
  }
}

function initDashboardCollapse() {
  applyDashExpanded(preferredDashExpanded());
  els.btnDashToggle?.addEventListener('click', () => {
    applyDashExpanded(!dashExpanded);
  });
  window.addEventListener('resize', () => {
    /* Only auto-adjust when user hasn't forced open on mobile via toggle mid-session —
       keep current if already set; on first paint use preferred. */
    if (dashExpanded === null) applyDashExpanded(preferredDashExpanded());
    else if (window.innerWidth > 768 && els.studySideCol) {
      els.studySideCol.classList.remove('is-mobile-hidden');
    } else if (!dashExpanded) {
      applyDashExpanded(false);
    }
  });
}

function refreshSyncBadge() {
  const st = getSyncStatus();
  if (els.homeSyncBadge) {
    els.homeSyncBadge.textContent = st.label;
    els.homeSyncBadge.setAttribute('data-status', st.status);
  }
}

function captureResumeSnapshot() {
  if (!lesson?.pattern_id) return;
  if (els.screenFlow?.hidden) return;
  persistResumeSnapshot({
    pattern_id: lesson.pattern_id,
    pattern_name: lesson.name,
    pattern_index: patternIndex,
    question_index: questionIndex,
    stage_index: stageIndex,
    study_mode: studyMode,
    screen: 'flow',
  });
}

function applyResumeSnapshot(snap) {
  if (!snap) return false;
  const idx =
    typeof snap.pattern_index === 'number'
      ? snap.pattern_index
      : studyPatterns.findIndex(
          (sp) => sp.lesson?.pattern_id === snap.pattern_id
        );
  if (idx < 0 || !studyPatterns[idx]?.lesson) {
    setLearnerStatus('이어서 할 Pattern을 찾을 수 없습니다. Restart를 선택하세요.');
    return false;
  }
  patternIndex = idx;
  studyMode = snap.study_mode === 'exam' ? 'exam' : 'pattern_master';
  setItem(KEY_MODE, studyMode);
  const radio = document.querySelector(
    `input[name="study-mode"][value="${studyMode}"]`
  );
  if (radio) {
    radio.checked = true;
    document.querySelectorAll('.mode-option').forEach((lab) => {
      lab.classList.toggle('is-selected', lab.querySelector('input')?.checked);
    });
  }

  const pack = studyPatterns[patternIndex];
  lesson = pack.lesson;
  const qMax = Math.max(0, (pack.questions?.length || 1) - 1);
  questionIndex = Math.min(Math.max(0, snap.question_index || 0), qMax);
  currentQuestion = pack.questions[questionIndex];
  submitted = false;
  lastGradeResult = null;
  lastAttemptEvent = null;
  retrievalSavedForQuestion = false;
  evidenceSavedForQuestion = false;
  const list = stages();
  stageIndex = Math.min(
    Math.max(0, snap.stage_index || 0),
    list.length - 1
  );
  /* Avoid landing on result without a fresh submit */
  if (list[stageIndex] === 'result') {
    stageIndex = list.indexOf('question');
  }
  /* Skip pre-question lesson stages on resume (Preview is on home) */
  const qIdx = list.indexOf('question');
  if (qIdx >= 0 && stageIndex < qIdx) stageIndex = qIdx;
  evidencePad?.close();
  retrievalMount?.destroy?.();
  retrievalMount = null;
  showScreen('flow');
  applyDashExpanded(preferredDashExpanded());
  setActiveStage();
  setLearnerStatus('이전 학습을 이어서 시작합니다.');
  return true;
}

function renderStageDots() {
  const list = stages();
  els.stageDots.innerHTML = list
    .map((s, i) => {
      const cls =
        i === stageIndex ? 'is-active' : i < stageIndex ? 'is-done' : '';
      return `<li class="${cls}" title="${escapeHtml(STAGE_LABELS[s])}"></li>`;
    })
    .join('');
}

function hideAllPanels() {
  Object.values(els.panels).forEach((p) => {
    if (p) p.hidden = true;
  });
}

function updateProgressDisplay() {
  const pack = studyPatterns[patternIndex];
  const qCount = pack?.questions?.length || 1;
  const pTotal = studyPatterns.length || 1;
  els.progressPattern.textContent = `Pattern ${patternIndex + 1} / ${pTotal}`;
  els.progressQuestion.textContent = `Question ${questionIndex + 1} / ${qCount}`;
}

function memoryOneLiner(L) {
  return assetOr(
    L.knowhow?.memory,
    assetOr(L.preview?.expected_thinking, L.preview?.learning_goal || '—')
  );
}

function completionCriteriaHtml(L) {
  const goal = L.preview?.learning_goal;
  const checks = (L.checklist || []).slice(0, 5);
  const items = checks
    .map((c) => `<li>${escapeHtml(c.label)}</li>`)
    .join('');
  return `
    ${goal ? `<p>${escapeHtml(goal)}</p>` : ''}
    ${
      items
        ? `<ul class="completion-list">${items}</ul>`
        : '<p class="ll-hint">자산이 없습니다.</p>'
    }
  `;
}

/** WP-02 Pattern Preview Polish */
function renderPreview(panel, L) {
  const I = L.introduction || {};
  const why = assetOr(I.summary || L.preview.overview, '자산이 없습니다.');
  const whenParts = [];
  if (I.when_appears) whenParts.push(I.when_appears);
  if ((L.preview.keywords || []).length) {
    whenParts.push((L.preview.keywords || []).join(' · '));
  }
  const when = whenParts.length
    ? whenParts.join(' · ')
    : '자산이 없습니다.';
  const intent = assetOr(
    I.examiner_intent || I.why_tested,
    '자산이 없습니다.'
  );
  const trap = assetOr(
    I.common_misconception || (L.knowhow?.traps || [])[0],
    '자산이 없습니다.'
  );

  panel.innerHTML = `
    <h2 class="study-card__title edu-hero-title">${escapeHtml(L.name)}</h2>
    <p class="edu-kicker">Pattern Preview</p>
    <dl class="edu-facts">
      <div><dt>중요도</dt><dd>${escapeHtml(L.grade || '—')}</dd></div>
      <div><dt>빈도</dt><dd>${escapeHtml(L.frequency ?? '—')}</dd></div>
      <div><dt>예상 학습 시간</dt><dd>${escapeHtml(L.preview.estimated_time || '—')}</dd></div>
    </dl>
    <div class="edu-block">
      <h3>왜 배우는 Pattern인가</h3>
      <p>${escapeHtml(why)}</p>
    </div>
    <div class="edu-block">
      <h3>시험장에서 언제 등장하는가</h3>
      <p>${escapeHtml(when)}</p>
    </div>
    <div class="edu-block">
      <h3>출제 의도</h3>
      <p>${escapeHtml(intent)}</p>
    </div>
    <div class="edu-block">
      <h3>대표 함정</h3>
      <p>${escapeHtml(trap)}</p>
    </div>
    <div class="edu-block">
      <h3>학습 완료 기준</h3>
      ${completionCriteriaHtml(L)}
    </div>
    <div class="edu-block">
      <h3>핵심 키워드</h3>
      <ul class="keyword-chips">${(L.preview.keywords || [])
        .map((k) => `<li>${escapeHtml(k)}</li>`)
        .join('') || '<li>—</li>'}</ul>
    </div>
    <p class="dev-only ll-hint"><code>${escapeHtml(L.pattern_id)}</code> · ${escapeHtml(L.validation_status)}</p>
  `;
}

/** WP-03 Pattern Lesson Polish — readable layout, no new knowledge */
function renderIntro(panel, L) {
  const I = L.introduction;
  panel.innerHTML = `
    <header class="lesson-header">
      <p class="edu-kicker">Step 1 · 소개</p>
      <h2 class="study-card__title">${escapeHtml(L.name)}</h2>
    </header>
    <div class="lesson-stack">
      <div class="edu-block lesson-block">
        <h3>이 Pattern은?</h3>
        <p>${escapeHtml(assetOr(I.summary, '자산이 없습니다.'))}</p>
      </div>
      <div class="edu-block lesson-block">
        <h3>출제 의도</h3>
        <p>${escapeHtml(assetOr(I.why_tested || I.examiner_intent, '자산이 없습니다.'))}</p>
      </div>
      <div class="edu-block lesson-block">
        <h3>흔한 착각</h3>
        <p>${escapeHtml(assetOr(I.common_misconception, '자산이 없습니다.'))}</p>
      </div>
      <div class="edu-block lesson-block">
        <h3>등장 시점</h3>
        <p>${escapeHtml(assetOr(I.when_appears, '—'))}</p>
      </div>
    </div>
  `;
}

function renderAlgorithm(panel, L) {
  const A = L.algorithm;
  const CIRCLE = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];
  const steps = (A.steps || [])
    .map(
      (s, i) => `
      ${i ? '<div class="algo-arrow" aria-hidden="true">↓</div>' : ''}
      <div class="algo-step decision-node">
        <span class="algo-step-label">${CIRCLE[i] || `Step ${i + 1}`}</span>
        <p>${escapeHtml(s)}</p>
      </div>`
    )
    .join('');

  const tree = (A.decision_tree || [])
    .map(
      (n) => `
      <div class="decision-card">
        <strong>${escapeHtml(n.keyword)}</strong>
        <p class="decision-q">Q. ${escapeHtml(n.criterion)}</p>
        <p class="decision-a">→ ${escapeHtml(n.conclusion)}</p>
      </div>`
    )
    .join('');

  panel.innerHTML = `
    <header class="lesson-header">
      <p class="edu-kicker">Step 2 · 기계적 알고리즘</p>
      <h2 class="study-card__title">풀이 알고리즘</h2>
      <p class="section-desc">${escapeHtml(A.title || '')}</p>
    </header>
    ${A.formula ? `<p class="edu-formula"><code>${escapeHtml(A.formula)}</code></p>` : ''}
    <div class="algo-steps">${steps || '<p class="ll-hint">검증된 풀이 알고리즘이 아직 준비되지 않았습니다.</p>'}</div>
    ${
      tree
        ? `<div class="edu-block lesson-block"><h3>판단 트리</h3><div class="decision-grid">${tree}</div></div>`
        : ''
    }
    <p class="dev-only ll-hint">source: ${escapeHtml(A.source)}</p>
  `;
}

function renderKnowhow(panel, L) {
  const K = L.knowhow;
  const first = (K.exam_first || [])
    .map((t) => `<li>${escapeHtml(t)}</li>`)
    .join('');
  const traps = (K.traps || []).map((t) => `<li>${escapeHtml(t)}</li>`).join('');
  const checks = (K.checkpoints || [])
    .map((t) => `<li>${escapeHtml(t)}</li>`)
    .join('');

  panel.innerHTML = `
    <header class="lesson-header">
      <p class="edu-kicker">Step 3 · 시험장 Know-how</p>
      <h2 class="study-card__title">시험장에서 쓰는 방법</h2>
    </header>
    <div class="lesson-stack lesson-stack--2">
      <div class="edu-block lesson-block">
        <h3>가장 먼저 볼 것</h3>
        ${first ? `<ul>${first}</ul>` : '<p class="ll-hint">자산이 없습니다.</p>'}
      </div>
      <div class="edu-block lesson-block">
        <h3>암기 한 줄</h3>
        <p class="memory-line" style="white-space:pre-wrap">${escapeHtml(assetOr(K.memory, '자산이 없습니다.'))}</p>
      </div>
      <div class="edu-block lesson-block">
        <h3>함정</h3>
        ${traps ? `<ul>${traps}</ul>` : '<p class="ll-hint">자산이 없습니다.</p>'}
      </div>
      <div class="edu-block lesson-block">
        <h3>체크 포인트</h3>
        ${checks ? `<ul>${checks}</ul>` : '<p class="ll-hint">자산이 없습니다.</p>'}
      </div>
    </div>
  `;
}

function renderChecklist(panel, L) {
  const items = (L.checklist || [])
    .map(
      (c) => `
      <label class="check-item">
        <input type="checkbox" data-check-id="${escapeHtml(c.id)}">
        <span>
          <strong>${escapeHtml(c.label)}</strong>
          ${c.hint ? `<small>${escapeHtml(c.hint)}</small>` : ''}
        </span>
      </label>`
    )
    .join('');

  panel.innerHTML = `
    <header class="lesson-header">
      <p class="edu-kicker">Step 4 · Checklist</p>
      <h2 class="study-card__title">문제 읽기 전 확인</h2>
      <p class="section-desc">체크하며 Pattern 트리거를 떠올리세요. (브라우저에만 저장)</p>
    </header>
    <div class="checklist-box">${items || '<p class="ll-hint">체크리스트 자산이 없습니다.</p>'}</div>
  `;
}

function renderQuestionPanel() {
  const q = currentQuestion;
  if (!q) return;

  /* Sprint-12F — Student always sees Resolved Question (Override applied) */
  const original = toReviewOriginal(q);
  const resolved = studentQuestionForDisplay(original);
  const display = applyResolvedToStudyQuestion(q, resolved);
  const pack = studyPatterns[patternIndex];

  els.questionMeta.textContent =
    viewMode === 'developer'
      ? `${display.questionId} · ${lesson.pattern_id}`
      : `「${lesson.name}」 Pattern 적용`;

  mountReviewEntry({
    toolbarHost: document.getElementById('review-entry-toolbar'),
    getOriginal: () => toReviewOriginal(currentQuestion),
    onResolved: (student) => {
      currentQuestion = applyResolvedToStudyQuestion(currentQuestion, student);
      if (pack?.questions && questionIndex >= 0) {
        pack.questions[questionIndex] = currentQuestion;
      }
      renderQuestionPanel();
    },
    onApprove: (student) => {
      currentQuestion = applyResolvedToStudyQuestion(currentQuestion, student);
      if (pack?.questions && questionIndex >= 0) {
        pack.questions[questionIndex] = currentQuestion;
      }
      renderQuestionPanel();
    },
    onSkip: () => {},
    onNext: () => {
      if (pack?.questions && questionIndex < pack.questions.length - 1) {
        questionIndex += 1;
        currentQuestion = pack.questions[questionIndex];
        renderQuestionPanel();
        updateProgressDisplay();
      }
    },
  });

  const legacyHost = document.getElementById('loop-source-viewer-host');
  if (legacyHost) legacyHost.innerHTML = '';

  els.questionStem.innerHTML = renderQuestionStemHtml(display.stem);
  els.questionChoices.innerHTML = '';
  (display.choices || []).forEach((text, idx) => {
    const value = idx + 1;
    const id = `choice-${value}`;
    const label = document.createElement('label');
    label.className = 'll-choice';
    label.htmlFor = id;
    label.innerHTML = `
      <input type="radio" name="ll-answer" id="${id}" value="${value}">
      <span><strong>${choiceLabel(value)}</strong> ${escapeHtml(text)}</span>`;
    els.questionChoices.appendChild(label);
  });
}

/**
 * Approved Solution Layer block (09H-4).
 * @param {object} sol
 * @param {string} questionId
 */
function renderApprovedSolutionHtml(sol, questionId) {
  const overlayId = resolveOverlayQuestionId(questionId) || questionId;
  const steps = (sol.steps || [])
    .map((s) => {
      const title = s.title || `Step ${s.order || ''}`;
      const body = s.explanation || '';
      return `<li class="solution-approved__step">
        <strong>${escapeHtml(String(s.order ?? ''))}. ${escapeHtml(title)}</strong>
        <p>${escapeHtml(body)}</p>
      </li>`;
    })
    .join('');

  return `
    <article class="edu-block lesson-block solution-approved" aria-label="Approved Solution">
      <header class="solution-approved__head">
        <p class="edu-kicker">Approved Solution</p>
        <h3>문항 Solution</h3>
        <p class="ll-hint">승인된 Learning Content Layer · Pattern Algorithm 대체 표시</p>
        <p class="dev-only"><code>${escapeHtml(overlayId || '')}</code>
          ${sol.version ? ` · v${escapeHtml(String(sol.version))}` : ''}</p>
      </header>
      <section class="solution-approved__section">
        <h4>Diagnosis</h4>
        <p>${escapeHtml(sol.diagnosis || '—')}</p>
      </section>
      <section class="solution-approved__section">
        <h4>Steps</h4>
        ${steps ? `<ol class="solution-approved__steps">${steps}</ol>` : '<p class="ll-hint">—</p>'}
      </section>
      <section class="solution-approved__section">
        <h4>Exam Trap</h4>
        <p>${escapeHtml(sol.examTrap || '—')}</p>
      </section>
      <section class="solution-approved__section">
        <h4>Takeaway</h4>
        <p>${escapeHtml(sol.takeaway || '—')}</p>
      </section>
    </article>`;
}

/** WP-01~04 Review Why Lens + Pattern Card + Takeaway + Mistake Replay */
function renderReview(panel, L, gradeResult, approvedSolution = null) {
  const isCorrect = gradeResult?.result === 'correct';
  const isWrong = gradeResult?.result === 'wrong';
  const judgments = L.algorithm?.decision_tree || [];
  const judgmentHtml = judgments
    .map(
      (n) => `
      <li>
        <strong>${escapeHtml(n.keyword)}</strong>
        — ${escapeHtml(n.criterion)}
        → ${escapeHtml(n.conclusion)}
      </li>`
    )
    .join('');
  const firstJudge = judgments[0];
  const examFirst = (L.knowhow?.exam_first || [])[0] || firstJudge?.criterion || '';
  const whyPattern = assetOr(
    L.introduction?.examiner_intent || L.introduction?.why_tested || L.concept,
    '자산이 없습니다.'
  );
  const steps = (L.algorithm.steps || [])
    .map((s, i) => `<li><strong>${i + 1}.</strong> ${escapeHtml(s)}</li>`)
    .join('');
  const checks = (L.checklist || [])
    .map(
      (c) => `
      <li class="review-check-item">
        <strong>${escapeHtml(c.label)}</strong>
        ${c.hint ? `<small>${escapeHtml(c.hint)}</small>` : ''}
      </li>`
    )
    .join('');
  const mistakes = (L.verified_mistakes || L.knowhow?.traps || [])
    .map((t) => `<li>${escapeHtml(t)}</li>`)
    .join('');
  const takeaway = (L.exam_takeaway || [])
    .map((t, i) => `<li><span class="takeaway-num">${i + 1}</span> ${escapeHtml(t)}</li>`)
    .join('');
  const cardChecks = (L.checklist || [])
    .map(
      (c) => `
      <label class="check-item check-item--readonly">
        <input type="checkbox" disabled>
        <span><strong>${escapeHtml(c.label)}</strong></span>
      </label>`
    )
    .join('');

  /* 09H-4: Approved overlay wins; else Pattern Algorithm fallback (unchanged) */
  if (approvedSolution) {
    const outcomeLine = isCorrect
      ? '정답입니다. 아래 승인 Solution으로 판단 과정을 복습하세요.'
      : isWrong
        ? '오답입니다. 아래 승인 Solution으로 판단 과정을 다시 확인하세요.'
        : '제출 후 승인 Solution으로 복습할 수 있습니다.';

    panel.innerHTML = `
      <header class="lesson-header">
        <p class="edu-kicker">Pattern Review</p>
        <h2 class="study-card__title">「${escapeHtml(L.name)}」을 검증했습니다</h2>
        <p class="section-desc">${escapeHtml(outcomeLine)}</p>
      </header>

      ${renderApprovedSolutionHtml(approvedSolution, currentQuestion?.questionId)}

      <div class="edu-block lesson-block evidence-nudge" role="note">
        <h3>다음: 스스로 회상 → 이번 문제 기록</h3>
        <p>Review를 읽었다면 <strong>다음</strong>을 눌러 회상(Retrieval)을 남기고, 이어서 Evidence를 기록하세요.</p>
      </div>
    `;
    return;
  }

  const whyBlock = isCorrect
    ? `
    <div class="edu-block lesson-block why-lens why-lens--ok">
      <h3>왜 정답인가 (Pattern 관점)</h3>
      <p>이 문항은 「${escapeHtml(L.name)}」 Pattern의 판단 기준을 적용한 결과입니다. (문항별 신규 해설 생성 없음)</p>
      <h4>핵심 판단 기준</h4>
      ${judgmentHtml ? `<ul class="why-list">${judgmentHtml}</ul>` : '<p class="ll-hint">자산이 없습니다.</p>'}
      <h4>시험장에서 무엇을 먼저 판단해야 하는가</h4>
      <p>${escapeHtml(assetOr(examFirst, '자산이 없습니다.'))}</p>
      <h4>이번 문제는 왜 이 Pattern에 속하는가</h4>
      <p>${escapeHtml(whyPattern)}</p>
    </div>`
    : isWrong
      ? `
    <div class="edu-block lesson-block why-lens why-lens--bad">
      <h3>왜 오답인가 (Pattern 관점)</h3>
      <p>문항별 원인 추정은 하지 않습니다. 아래는 이 Pattern의 <strong>검증된</strong> 판단·함정 자산입니다.</p>
      <h4>핵심 판단 기준 (다시 확인)</h4>
      ${judgmentHtml ? `<ul class="why-list">${judgmentHtml}</ul>` : '<p class="ll-hint">자산이 없습니다.</p>'}
      <h4>시험장에서 무엇을 먼저 판단해야 하는가</h4>
      <p>${escapeHtml(assetOr(examFirst, '자산이 없습니다.'))}</p>
      <h4>이번 문제는 왜 이 Pattern에 속하는가</h4>
      <p>${escapeHtml(whyPattern)}</p>
    </div>
    <div class="edu-block lesson-block mistake-replay">
      <h3>Mistake Replay — 어디서 판단을 놓쳤는지 (Pattern 재확인)</h3>
      <p class="ll-hint">Error Taxonomy 기반 추론 없음 · Algorithm · Checklist · 검증 함정만 재노출</p>
      <h4>자주 하는 실수 (verified)</h4>
      ${mistakes ? `<ul>${mistakes}</ul>` : '<p class="ll-hint">검증된 실수 자산이 없습니다.</p>'}
      <h4>Algorithm 재확인</h4>
      <ol>${steps || '<li>—</li>'}</ol>
      <h4>Checklist 재확인</h4>
      ${checks ? `<ul class="review-checklist">${checks}</ul>` : '<p class="ll-hint">자산이 없습니다.</p>'}
    </div>`
      : `
    <div class="edu-block lesson-block">
      <p>제출 후 Pattern 관점으로 복습할 수 있습니다.</p>
    </div>`;

  panel.innerHTML = `
    <header class="lesson-header">
      <p class="edu-kicker">Pattern Review</p>
      <h2 class="study-card__title">「${escapeHtml(L.name)}」을 검증했습니다</h2>
    </header>

    ${whyBlock}

    <article class="pattern-review-card" aria-label="Pattern Review Card">
      <header class="pattern-review-card__head">
        <p class="edu-kicker">Pattern Review Card</p>
        <h3>${escapeHtml(L.name)}</h3>
        <p class="dev-only"><code>${escapeHtml(L.pattern_id)}</code></p>
      </header>
      <div class="edu-block">
        <h4>핵심 개념</h4>
        <p>${escapeHtml(assetOr(L.concept || L.preview.overview, '—'))}</p>
      </div>
      <div class="edu-block">
        <h4>시험장에서 가장 먼저 확인</h4>
        <p>${escapeHtml(assetOr(examFirst, '자산이 없습니다.'))}</p>
      </div>
      <div class="edu-block">
        <h4>자주 하는 실수 (verified만)</h4>
        ${mistakes ? `<ul>${mistakes}</ul>` : '<p class="ll-hint">자산이 없습니다.</p>'}
      </div>
      <div class="edu-block">
        <h4>Pattern Checklist</h4>
        <div class="checklist-box">${cardChecks || '<p class="ll-hint">자산이 없습니다.</p>'}</div>
      </div>
    </article>

    <div class="edu-block lesson-block exam-takeaway">
      <h3>시험장 Takeaway (3줄)</h3>
      <p class="ll-hint">기존 Know-how · Trigger · 판단 기준 재배치 · 신규 작성 없음</p>
      ${takeaway ? `<ol class="takeaway-list">${takeaway}</ol>` : '<p class="ll-hint">자산이 없습니다.</p>'}
    </div>

    <div class="edu-block lesson-block evidence-nudge" role="note">
      <h3>다음: 스스로 회상 → 이번 문제 기록</h3>
      <p>Review를 읽었다면 <strong>다음</strong>을 눌러 회상(Retrieval)을 남기고, 이어서 Evidence를 기록하세요.</p>
    </div>
  `;
}

/** Pattern Closing — choice only, no Export (Sprint-06) */
function renderClosing() {
  const L = lesson;
  const m = sessionMetrics();
  const examFirst = (L?.knowhow?.exam_first || [])[0] || '';
  const takeaway = (L?.exam_takeaway || [])
    .map((t, i) => `<li><span class="takeaway-num">${i + 1}</span> ${escapeHtml(t)}</li>`)
    .join('');
  const core = assetOr(
    L?.concept || L?.preview?.overview || L?.preview?.learning_goal,
    '자산이 없습니다.'
  );

  els.closingBody.innerHTML = `
    <div class="edu-block lesson-block closing-pattern-hero">
      <h3>방금 익힌 Pattern</h3>
      <p class="review-pattern-name"><strong>${escapeHtml(L?.name || '—')}</strong></p>
      <p class="dev-only"><code>${escapeHtml(L?.pattern_id || '')}</code></p>
    </div>
    <div class="edu-block lesson-block">
      <h3>핵심</h3>
      <p>${escapeHtml(core)}</p>
    </div>
    <div class="edu-block lesson-block">
      <h3>시험장</h3>
      <p>${escapeHtml(assetOr(examFirst || memoryOneLiner(L), '—'))}</p>
      ${takeaway ? `<ol class="takeaway-list">${takeaway}</ol>` : ''}
    </div>
    <div class="edu-block lesson-block">
      <h3>Session Progress</h3>
      <dl class="edu-facts">
        <div><dt>Pattern</dt><dd>${m.patternDone} / ${m.patternTotal}</dd></div>
        <div><dt>Question</dt><dd>${m.qDone} / ${m.qTotal}</dd></div>
        <div><dt>Evidence</dt><dd>${m.evidenceCount}</dd></div>
        <div><dt>Retrieval</dt><dd>${m.retrievalCount}</dd></div>
      </dl>
      <p class="ll-hint">Export는 하지 않습니다. 다음 Pattern을 이어가거나 오늘 공부를 종료하세요.</p>
    </div>
  `;
}

/** Session Summary — Finish path only + Export v3 */
function renderSessionSummary() {
  const m = sessionMetrics();
  const patternList = (m.learned || [])
    .map((pid) => {
      const sp = studyPatterns.find((p) => p.lesson?.pattern_id === pid);
      const name = sp?.lesson?.name || pid;
      return `<li class="session-learned-item"><span class="session-check" aria-hidden="true">✓</span> ${escapeHtml(name)}</li>`;
    })
    .join('');

  if (els.summaryLead) {
    els.summaryLead.textContent =
      m.patternDone > 0
        ? `오늘 Pattern ${m.patternDone}개를 익혔습니다.`
        : '오늘 익힌 Pattern이 없습니다.';
  }

  if (els.summaryBody) {
    els.summaryBody.innerHTML = `
      <div class="edu-block lesson-block growth-summary" aria-label="오늘 공부 집계">
        <h3>오늘 학습</h3>
        <p class="ll-hint">집계만 표시합니다. AI 분석·평가 없음.</p>
        <dl class="edu-facts">
          <div><dt>Pattern</dt><dd>${m.patternDone}</dd></div>
          <div><dt>문제</dt><dd>${m.qDone}</dd></div>
          <div><dt>Evidence</dt><dd>${m.evidenceCount}</dd></div>
          <div><dt>Retrieval</dt><dd>${m.retrievalCount}</dd></div>
          <div><dt>공부시간</dt><dd>${m.mins}분</dd></div>
        </dl>
      </div>
      <div class="edu-block lesson-block" aria-label="오늘 익힌 Pattern">
        <h3>오늘 익힌 Pattern</h3>
        ${
          patternList
            ? `<ul class="session-learned-list">${patternList}</ul>`
            : '<p class="ll-hint">—</p>'
        }
      </div>
      <div class="edu-block lesson-block closing-next">
        <h3>내일은</h3>
        <p>${escapeHtml(NEXT_REVIEW_COPY)}</p>
        <p class="ll-hint">고정 문구입니다. Recommendation이 아닙니다.</p>
      </div>
    `;
  }

  renderSessionExportBar();
}

function renderSessionExportBar() {
  const slot = els.sessionExportSlot;
  if (!slot) return;
  const already = Boolean(getSession().exportedAt);
  slot.innerHTML = `
    <div class="ep-closing-export">
      <p class="ep-closing-export__title">세션 기록 내보내기</p>
      <p class="ep-closing-export__desc">오늘 Session 전체를 JSON / Markdown으로 저장합니다. ${
        already ? '(이미 1회 내보냈습니다. 다시 받을 수 있습니다.)' : 'Session 종료 시 1회 권장.'
      }</p>
      <div class="ep-closing-export__actions">
        <button type="button" class="ep-btn ep-btn--primary" id="btn-export-json">session JSON</button>
        <button type="button" class="ep-btn ep-btn--ghost" id="btn-export-md">session Markdown</button>
        <button type="button" class="ep-btn ep-btn--ghost" id="btn-export-sync">sync-state.json (v4)</button>
      </div>
      <p class="ll-hint">sync-state.json은 다른 기기 Import용 Study State입니다. SoT DB는 포함되지 않습니다.</p>
    </div>`;
  slot.querySelector('#btn-export-json')?.addEventListener('click', () => {
    runSessionExport('json');
  });
  slot.querySelector('#btn-export-md')?.addEventListener('click', () => {
    runSessionExport('md');
  });
  slot.querySelector('#btn-export-sync')?.addEventListener('click', async () => {
    const r = await exportSyncStateV4();
    setLearnerStatus(
      r.ok ? `${r.filename} 내려받기 완료` : `Export 실패: ${r.error}`
    );
    refreshSyncBadge();
  });
}

function runSessionExport(format) {
  const session = getSession();
  const patternMeta = studyPatterns
    .map((sp) =>
      sp.lesson
        ? { pattern_id: sp.lesson.pattern_id, name: sp.lesson.name }
        : null
    )
    .filter(Boolean);

  exportSessionV3(format, {
    sessionId: sessionIdForExport(),
    startedAt: session.startedAt || sessionStartedAt,
    finishedAt: session.finishedAt || Date.now(),
    patternsLearned: session.patternsLearned || [],
    patternsReviewed: session.patternsReviewed || [],
    patternMeta,
    attempts: sessionAttempts(),
    retrievals: sessionRetrievals(),
    studyMode,
  });

  if (!session.exportedAt) {
    saveSessionPatch({ exportedAt: Date.now() });
  }
  setLearnerStatus(
    format === 'json'
      ? 'Session JSON을 내보냈습니다.'
      : 'Session Markdown을 내보냈습니다.'
  );
  renderSessionExportBar();
}

function setActiveStage() {
  hideAllPanels();
  const stage = currentStage();
  els.stageLabel.textContent = STAGE_LABELS[stage] || stage;
  updateProgressDisplay();
  renderStageDots();

  const panel = els.panels[stage];
  if (!panel) return;
  panel.hidden = false;

  if (stage === 'preview') renderPreview(panel, lesson);
  if (stage === 'intro') renderIntro(panel, lesson);
  if (stage === 'algorithm') {
    renderAlgorithm(panel, lesson);
    markPatternLearned(lesson.pattern_id);
  }
  if (stage === 'knowhow') renderKnowhow(panel, lesson);
  if (stage === 'checklist') renderChecklist(panel, lesson);
  if (stage === 'question') renderQuestionPanel();
  if (stage === 'review') {
    const approved = getApprovedSolution(currentQuestion?.questionId);
    renderReview(panel, lesson, lastGradeResult, approved);
    markPatternReviewed(lesson.pattern_id);
    evidencePad?.close();
    evidencePad?.setContext(buildEvidenceContext());
    setLearnerStatus(
      approved
        ? '승인 Solution을 확인한 뒤, 다음에서 스스로 회상하세요.'
        : 'Pattern Review를 읽은 뒤, 다음에서 스스로 회상하세요.'
    );
  }
  if (stage === 'retrieval') {
    retrievalMount?.destroy?.();
    retrievalMount = mountRetrievalPrompt(panel, {
      pattern_id: lesson?.pattern_id,
      question_id: currentQuestion?.questionId,
      attempt_id: lastAttemptEvent?.event_id || null,
      session_id: sessionIdForExport(),
      study_mode: studyMode,
      prompt: DEFAULT_RETRIEVAL_PROMPT,
      onSaved: () => {
        retrievalSavedForQuestion = true;
        evidencePad?.setContext(buildEvidenceContext());
        evidencePad?.open(buildEvidenceContext());
        setLearnerStatus(
          '회상 저장 완료 · 오른쪽에서 이번 문제 기록을 남겨 주세요.'
        );
      },
    });
    if (retrievalSavedForQuestion && !evidenceSavedForQuestion) {
      evidencePad?.open(buildEvidenceContext());
    }
  } else if (stage !== 'result' && stage !== 'retrieval') {
    evidencePad?.close();
  }

  const atQuestion = stage === 'question';
  const atResult = stage === 'result';
  const atRetrieval = stage === 'retrieval';
  const atReview = stage === 'review';
  const studyActive =
    atQuestion || atResult || atReview || atRetrieval;

  /* WP-05: no Prev/Next/Other Pattern before study (Preview/Lesson) */
  if (els.flowActions) els.flowActions.hidden = !studyActive;

  els.btnSubmit.hidden = !atQuestion;
  if (els.btnNext) {
    els.btnNext.disabled = atQuestion && !submitted;
    if (atResult) els.btnNext.disabled = false;
    if (atReview) {
      els.btnNext.textContent = '회상으로';
    } else if (atRetrieval) {
      const pack = studyPatterns[patternIndex];
      const qCount = pack?.questions?.length || 1;
      els.btnNext.textContent =
        questionIndex < qCount - 1 ? '다음 문제' : 'Pattern 완료';
    } else if (atQuestion) {
      els.btnNext.textContent = '결과로';
    } else {
      els.btnNext.textContent = '다음';
    }
  }

  if (els.btnPrev) {
    /* Do not walk back into Preview/Lesson stages from Question */
    const qIdx = stages().indexOf('question');
    els.btnPrev.disabled = stageIndex <= qIdx;
  }
  refreshDashboard();
  captureResumeSnapshot();
  refreshSyncBadge();
}

function bindModeOptions() {
  document.querySelectorAll('input[name="study-mode"]').forEach((input) => {
    input.addEventListener('change', () => {
      document.querySelectorAll('.mode-option').forEach((lab) => {
        lab.classList.toggle(
          'is-selected',
          lab.querySelector('input')?.checked
        );
      });
    });
  });
}

function renderTodayHome() {
  const pack = studyPatterns[patternIndex];
  const available = studyPatterns.length;
  const verifiedMaster = countVerifiedMaster();
  const plannedOpen = Math.max(0, verifiedMaster - available);

  if (els.betaScopeNotice) {
    els.betaScopeNotice.innerHTML = `
      <p><strong>Beta 범위 안내</strong> — 현재 Beta에서는 <strong>검증 완료된 Pattern만</strong> 학습할 수 있습니다.</p>
      <p>학습 가능 <strong>${available}</strong>개 · 나머지 <strong>${plannedOpen}</strong>개는 검증 후 개방 예정입니다.</p>
    `;
  }

  refreshDashboard();

  if (!pack?.lesson) {
    if (els.todayName) els.todayName.textContent = '학습 가능한 Pattern이 없습니다';
    if (els.todayWhy) els.todayWhy.textContent = '—';
    if (els.todayWhen) els.todayWhen.textContent = '—';
    if (els.todayTime) els.todayTime.textContent = '—';
    if (els.todayQcount) els.todayQcount.textContent = '—';
    if (els.todayGoal) {
      els.todayGoal.textContent = '검증된 Pattern 매핑을 확인하세요.';
    }
    if (els.btnStartToday) els.btnStartToday.disabled = true;
    return;
  }

  const L = pack.lesson;
  const I = L.introduction || {};
  const why = assetOr(
    I.summary || L.preview?.overview,
    '자산이 없습니다.'
  );
  const whenParts = [];
  if (I.when_appears) whenParts.push(I.when_appears);
  if ((L.preview?.keywords || []).length) {
    whenParts.push((L.preview.keywords || []).join(' · '));
  }
  const when = whenParts.length ? whenParts.join(' · ') : '자산이 없습니다.';

  if (els.todayName) els.todayName.textContent = L.name;
  if (els.todayWhy) els.todayWhy.textContent = why;
  if (els.todayWhen) els.todayWhen.textContent = when;
  if (els.todayTime) {
    els.todayTime.textContent = L.preview?.estimated_time || '—';
  }
  if (els.todayQcount) {
    els.todayQcount.textContent = `${pack.questions.length}문항`;
  }
  if (els.todayGoal) {
    els.todayGoal.textContent = assetOr(
      L.preview?.learning_goal,
      '자산이 없습니다.'
    );
  }
  if (els.btnStartToday) els.btnStartToday.disabled = false;
  setItem(KEY_TODAY_PATTERN, L.pattern_id);
}

function countVerifiedMaster() {
  if (!bundle?.masterById) return studyPatterns.length;
  let n = 0;
  for (const p of bundle.masterById.values()) {
    if (p?.validation_status === 'verified') n += 1;
  }
  return n;
}

function renderPatternPicker() {
  els.pickList.innerHTML = studyPatterns
    .map((sp, i) => {
      const L = sp.lesson;
      if (!L) return '';
      const selected = i === patternIndex ? ' is-selected' : '';
      return `
        <div class="pattern-pick-wrap">
          <button type="button" class="pattern-pick-card${selected}" data-index="${i}">
            <strong>${escapeHtml(L.name)}</strong>
            <span>중요도 ${escapeHtml(L.grade || '—')} · ${sp.questions.length}문항 · ${escapeHtml(L.preview.estimated_time || '—')}</span>
            <small class="dev-only">${escapeHtml(L.pattern_id)}</small>
          </button>
          <button type="button" class="button button--ghost pattern-recall-toggle"
            data-recall-pid="${escapeHtml(L.pattern_id)}">회상 기록 보기</button>
          <div class="pattern-recall-slot" data-recall-slot="${escapeHtml(
            L.pattern_id
          )}" hidden></div>
        </div>`;
    })
    .join('');

  els.pickList.querySelectorAll('.pattern-pick-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      patternIndex = Number(btn.getAttribute('data-index'));
      renderTodayHome();
      showScreen('home');
      setLearnerStatus('오늘의 Pattern이 갱신되었습니다. 학습을 시작하세요.');
    });
  });

  els.pickList.querySelectorAll('.pattern-recall-toggle').forEach((btn) => {
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const pid = btn.getAttribute('data-recall-pid');
      const slot = els.pickList.querySelector(
        `[data-recall-slot="${pid}"]`
      );
      if (!slot) return;
      const open = slot.hidden;
      slot.hidden = !open;
      if (open) {
        renderRecallTimeline(slot, pid, { title: '이전 회상 Timeline' });
        btn.textContent = '회상 기록 닫기';
      } else {
        btn.textContent = '회상 기록 보기';
      }
    });
  });
}

function startPatternFlow() {
  const pack = studyPatterns[patternIndex];
  if (!pack?.lesson) return;
  /* Re-open active session if student continues after Finish */
  const session = getSession();
  if (session.finishedAt) {
    saveSessionPatch({ finishedAt: null, exportedAt: null });
  }
  lesson = pack.lesson;
  questionIndex = 0;
  currentQuestion = pack.questions[questionIndex];
  submitted = false;
  lastGradeResult = null;
  lastAttemptEvent = null;
  retrievalSavedForQuestion = false;
  evidenceSavedForQuestion = false;
  /* WP-08: Start → Question (Preview already shown on Today's Study) */
  const list = stages();
  const qIdx = list.indexOf('question');
  stageIndex = qIdx >= 0 ? qIdx : 0;
  if (lesson.pattern_id) markPatternLearned(lesson.pattern_id);
  evidencePad?.close();
  retrievalMount?.destroy?.();
  retrievalMount = null;
  showScreen('flow');
  /* Ensure dashboard available during study */
  if (dashExpanded === null) applyDashExpanded(preferredDashExpanded());
  else applyDashExpanded(dashExpanded);
  setActiveStage();
  setLearnerStatus(
    studyMode === 'pattern_master'
      ? 'Preview를 확인했습니다. 문제에 Pattern을 적용하세요.'
      : 'Exam Mode — 제출 후 Pattern Review로 강화합니다.'
  );
  captureResumeSnapshot();
  touchLocal();
  refreshSyncBadge();
}

function onStartToday() {
  const selected = document.querySelector('input[name="study-mode"]:checked');
  studyMode = selected?.value === 'exam' ? 'exam' : 'pattern_master';
  setItem(KEY_MODE, studyMode);
  if (!studyPatterns.length) {
    setLearnerStatus('검증된 Pattern 매핑이 없습니다.');
    return;
  }
  startPatternFlow();
}

function selectedAnswer() {
  const checked = document.querySelector('input[name="ll-answer"]:checked');
  return checked ? Number(checked.value) : null;
}

function onSubmit() {
  const q = currentQuestion;
  if (!q || !lesson) return;
  const selected = selectedAnswer();
  if (selected === null) {
    setLearnerStatus('선지를 선택한 뒤 제출하세요.');
    return;
  }

  const result = runLearningLoopCycle({
    studentId: STUDENT_ID,
    questionId: q.questionId,
    patternId: lesson.pattern_id,
    selectedAnswer: selected,
    correctAnswer: q.answer,
    correctAnswerReference: {
      source: q.sourcePath,
      question_id: q.questionId,
      field: 'answer',
    },
  });

  if (!result.ok) {
    setLearnerStatus(`루프 실패: ${result.error}`);
    return;
  }

  submitted = true;
  lastGradeResult = result.grade;
  lastAttemptEvent = result.event || null;
  els.panels.result.hidden = false;
  els.rCorrect.textContent = `${choiceLabel(q.answer)} (${q.answer})`;
  els.rSelected.textContent = `${choiceLabel(selected)} (${selected})`;
  els.rOutcome.textContent =
    result.grade.result === 'correct' ? '정답' : '오답';
  els.rOutcome.className =
    result.grade.result === 'correct' ? 'is-ok' : 'is-bad';
  els.rPattern.textContent = lesson.name;

  const idx = stages().indexOf('result');
  if (idx >= 0) stageIndex = idx;
  setActiveStage();
  /* WP-03: do not open Evidence on submit — wait for Review → Retrieval */
  evidencePad?.setContext(buildEvidenceContext());
  retrievalSavedForQuestion = false;
  evidenceSavedForQuestion = false;
  setLearnerStatus(
    '제출 완료 · Review → 회상 → Evidence 순서로 진행하세요.'
  );
  touchLocal();
  captureResumeSnapshot();
  refreshDashboard();
  refreshSyncBadge();
}

function openClosing() {
  if (lesson?.pattern_id) markPatternLearned(lesson.pattern_id);
  discardResume();
  touchLocal();
  renderClosing();
  evidencePad?.close();
  showScreen('closing');
  setLearnerStatus(
    '이 Pattern을 익혔습니다. 다음 Pattern을 이어가거나 오늘 공부를 종료하세요.'
  );
  refreshDashboard();
  refreshSyncBadge();
}

function onContinueLearning() {
  discardResume();
  renderTodayHome();
  showScreen('home');
  setLearnerStatus(
    'Next Pattern — Preview를 확인한 뒤 Start로 문제를 시작하세요.'
  );
  refreshDashboard();
  refreshSyncBadge();
}

function onFinishToday() {
  const finishedAt = Date.now();
  saveSessionPatch({ finishedAt });
  discardResume();
  touchLocal();
  evidencePad?.close();
  renderSessionSummary();
  showScreen('summary');
  setLearnerStatus(
    '오늘 공부를 종료했습니다. Session Export와 sync-state.json을 저장할 수 있습니다.'
  );
  refreshDashboard();
  refreshSyncBadge();
}

function onNext() {
  const list = stages();
  const stage = currentStage();
  const pack = studyPatterns[patternIndex];

  if (stage === 'question' && !submitted) {
    setLearnerStatus('먼저 답을 제출하세요.');
    return;
  }

  if (stage === 'retrieval') {
    if (!retrievalSavedForQuestion && !retrievalMount?.isSaved?.()) {
      setLearnerStatus('회상을 저장한 뒤 다음으로 이동하세요.');
      return;
    }
    if (!evidenceSavedForQuestion) {
      evidencePad?.setContext(buildEvidenceContext());
      evidencePad?.open(buildEvidenceContext());
      setLearnerStatus(
        '이번 문제 기록을 남긴 뒤 다음으로 이동하세요. (약 20초)'
      );
      return;
    }

    if (questionIndex < pack.questions.length - 1) {
      questionIndex += 1;
      currentQuestion = pack.questions[questionIndex];
      submitted = false;
      lastGradeResult = null;
      lastAttemptEvent = null;
      retrievalSavedForQuestion = false;
      evidenceSavedForQuestion = false;
      retrievalMount?.destroy?.();
      retrievalMount = null;
      evidencePad?.close();
      stageIndex = list.indexOf('question');
      if (studyMode === 'pattern_master') {
        stageIndex = list.indexOf('checklist');
      }
      setActiveStage();
      return;
    }
    openClosing();
    return;
  }

  /* review no longer jumps to next question — goes to retrieval via stage++ */
  if (stageIndex < list.length - 1) {
    stageIndex += 1;
    if (list[stageIndex] === 'result' && !submitted) {
      stageIndex = list.indexOf('question');
    }
    setActiveStage();
  }
}

function onPrev() {
  const qIdx = stages().indexOf('question');
  if (stageIndex <= Math.max(0, qIdx)) return;
  stageIndex -= 1;
  if (stages()[stageIndex] === 'result' && !submitted) {
    stageIndex -= 1;
  }
  if (stageIndex < qIdx) stageIndex = qIdx;
  setActiveStage();
}

function onReset() {
  removeItem(STORAGE_KEYS.LEARNING_ATTEMPTS_V1);
  removeItem(STORAGE_KEYS.LEARNING_STATE_V1);
  removeItem(KEY_SESSION);
  removeItem(EVIDENCE_DRAFT_KEY);
  removeItem(RETRIEVAL_DRAFT_KEY);
  saveLearningState(createEmptyLearningState(STUDENT_ID));
  sessionStartedAt = Date.now();
  setItem(KEY_SESSION, emptySession(sessionStartedAt));
  submitted = false;
  lastGradeResult = null;
  lastAttemptEvent = null;
  retrievalSavedForQuestion = false;
  evidenceSavedForQuestion = false;
  evidencePad?.refreshProgress?.();
  refreshDashboard();
  setLearnerStatus('학습 기록을 초기화했습니다.');
  if (!els.screenFlow.hidden) setActiveStage();
}

function restorePatternIndex() {
  const saved = getItem(KEY_TODAY_PATTERN, null);
  if (!saved) return;
  const idx = studyPatterns.findIndex((sp) => sp.lesson?.pattern_id === saved);
  if (idx >= 0) patternIndex = idx;
}

async function init() {
  setAdapter(createLocalStorageAdapter());
  ensureProgress();
  loadPrefs();
  applyViewMode();
  bindModeOptions();
  initDashboardCollapse();
  saveLearningState(loadLearningState(STUDENT_ID));

  const radio = document.querySelector(
    `input[name="study-mode"][value="${studyMode}"]`
  );
  if (radio) {
    radio.checked = true;
    document.querySelectorAll('.mode-option').forEach((lab) => {
      lab.classList.toggle('is-selected', lab.querySelector('input')?.checked);
    });
  }

  bundle = await loadStudyBundle();
  await loadSolutionOverlay();
  const studyQuestions = await enrichStudyQuestionsWithApproved(
    bundle.questions || []
  );
  bundle = { ...bundle, questions: studyQuestions };
  studyPatterns = listStudyPatterns(
    studyQuestions,
    bundle.masterById,
    bundle.metaById
  ).filter((sp) => sp.lesson);

  restorePatternIndex();
  renderTodayHome();
  showScreen('home');
  setLearnerStatus(
    studyPatterns.length
      ? '오늘의 Pattern을 확인하고 학습을 시작하세요.'
      : '학습 가능한 Pattern이 없습니다.'
  );
  refreshDashboard();
  refreshSyncBadge();

  mountResumePrompt(els.resumeHost, {
    onContinue(snap) {
      const ok = applyResumeSnapshot(snap);
      if (ok && els.resumeHost) {
        els.resumeHost.hidden = true;
        els.resumeHost.innerHTML = '';
      }
    },
    onRestart() {
      setLearnerStatus('처음부터 시작합니다. Pattern을 선택해 학습하세요.');
      refreshSyncBadge();
    },
  });

  window.addEventListener('online', refreshSyncBadge);
  window.addEventListener('offline', refreshSyncBadge);

  evidencePad = mountEvidencePad(els.evidenceRoot, {
    sessionStartedAt: new Date(sessionStartedAt).toISOString(),
    getSessionId: () => sessionIdForExport(),
    getStudyMode: () => studyMode,
    getAttempts: () => sessionAttempts(),
    getRetrievals: () => sessionRetrievals(),
    getPatternsLearned: () => getSession().patternsLearned || [],
    getPatternsReviewed: () => getSession().patternsReviewed || [],
    onSaved: () => {
      evidenceSavedForQuestion = true;
      evidencePad?.refreshProgress?.();
      touchLocal();
      captureResumeSnapshot();
      setLearnerStatus(
        '기록 저장 완료 · 다음 문제로 가도 좋습니다.'
      );
      refreshDashboard();
      refreshSyncBadge();
    },
  });

  els.btnStartToday.addEventListener('click', onStartToday);
  els.btnPickPattern.addEventListener('click', () => {
    showScreen('pick');
    renderPatternPicker();
  });
  els.btnBackHome.addEventListener('click', () => {
    renderTodayHome();
    showScreen('home');
  });
  els.btnSubmit.addEventListener('click', onSubmit);
  els.btnNext.addEventListener('click', onNext);
  els.btnPrev.addEventListener('click', onPrev);
  els.btnChangePattern.addEventListener('click', () => {
    showScreen('pick');
    renderPatternPicker();
  });
  els.btnReset?.addEventListener('click', onReset);
  els.btnContinueLearning?.addEventListener('click', onContinueLearning);
  els.btnFinishToday?.addEventListener('click', onFinishToday);
  els.btnSummaryHome?.addEventListener('click', () => {
    renderTodayHome();
    showScreen('home');
    setLearnerStatus(
      '오늘 공부를 마쳤습니다. 필요하면 이어서 다른 Pattern을 시작할 수 있습니다.'
    );
    refreshDashboard();
  });
  els.btnDev?.addEventListener('click', () => {
    viewMode = viewMode === 'learner' ? 'developer' : 'learner';
    setItem(KEY_VIEW, viewMode);
    applyViewMode();
    if (!els.screenFlow.hidden) setActiveStage();
  });
}

init().catch((err) => {
  setLearnerStatus(`로드 실패: ${err.message}`);
});
