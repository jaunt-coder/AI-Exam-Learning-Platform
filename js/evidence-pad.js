/**
 * M2.7 Evidence Pad — Student learning reflection card.
 * Review → Evidence → Closing. No scoring / AI / mastery.
 */

import {
  appendEvidence,
  listEvidence,
  getSessionProgress,
  getEvidenceCounts,
  saveEvidenceDraft,
  loadEvidenceDraft,
  buildSessionExportPackage,
  evidenceToJson,
  evidenceToMarkdown,
  downloadTextFile,
  sessionFileStamp,
  EVIDENCE_TARGET_DEFAULT,
  PATTERN_TARGET_DEFAULT,
} from '../runtime/evidence-service.js';
import { markSourceReviewNeeded } from './source-viewer.js';

const UNDERSTANDING = [
  { value: 'understood', label: '이해했다', tone: 'ok' },
  { value: 'unclear', label: '애매하다', tone: 'mid' },
  { value: 'not_understood', label: '모르겠다', tone: 'bad' },
];

const EXAM_RETRY = [
  { value: 'can', label: '맞힐 수 있다', tone: 'ok' },
  { value: 'maybe', label: '반반', tone: 'mid' },
  { value: 'cannot', label: '자신 없다', tone: 'bad' },
];

const EXPLAIN = [
  { value: 'can', label: '가능', tone: 'ok' },
  { value: 'maybe', label: '애매', tone: 'mid' },
  { value: 'cannot', label: '불가능', tone: 'bad' },
];

const DIFFICULTY = [
  { value: 'calc', label: '계산' },
  { value: 'concept', label: '개념' },
  { value: 'interpretation', label: '문제 해석' },
  { value: 'trap', label: '함정' },
  { value: 'time', label: '시간 부족' },
  { value: 'focus', label: '집중력' },
];

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toneClass(tone) {
  if (tone === 'ok') return 'ep-choice--ok';
  if (tone === 'mid') return 'ep-choice--mid';
  if (tone === 'bad') return 'ep-choice--bad';
  return '';
}

function choiceGroup(name, options, selected) {
  return options
    .map((o) => {
      const checked = selected === o.value ? 'aria-checked="true"' : 'aria-checked="false"';
      const pressed = selected === o.value ? 'ep-choice--selected' : '';
      return `<button type="button" class="ep-choice ${toneClass(o.tone)} ${pressed}"
        role="radio" ${checked} data-group="${escapeHtml(name)}" data-value="${escapeHtml(o.value)}"
        id="ep-${escapeHtml(name)}-${escapeHtml(o.value)}">
        <span class="ep-choice__dot" aria-hidden="true"></span>
        <span class="ep-choice__label">${escapeHtml(o.label)}</span>
      </button>`;
    })
    .join('');
}

/**
 * @param {HTMLElement} host
 * @param {object} options
 */
export function mountEvidencePad(host, options = {}) {
  if (!host) return { destroy() {} };

  const state = {
    open: false,
    context: null,
    form: emptyForm(),
    sessionStartedAt: options.sessionStartedAt || new Date().toISOString(),
    getSessionId: options.getSessionId || (() => null),
    getAttempts: options.getAttempts || (() => []),
    getPatternsLearned: options.getPatternsLearned || (() => []),
    getPatternsReviewed: options.getPatternsReviewed || (() => []),
    getStudyMode: options.getStudyMode || (() => null),
    getRetrievals: options.getRetrievals || (() => []),
    onSaved: typeof options.onSaved === 'function' ? options.onSaved : null,
    draftTimer: null,
  };

  host.classList.add('evidence-pad-root');
  host.innerHTML = shellHtml();

  const els = {
    panel: host.querySelector('[data-ep-panel]'),
    backdrop: host.querySelector('[data-ep-backdrop]'),
    openBtn: host.querySelector('[data-ep-open]'),
    closeBtn: host.querySelector('[data-ep-close]'),
    form: host.querySelector('[data-ep-form]'),
    status: host.querySelector('[data-ep-status]'),
    progressEv: host.querySelector('[data-ep-progress-ev]'),
    progressPat: host.querySelector('[data-ep-progress-pat]'),
    hint: host.querySelector('[data-ep-hint]'),
    exportJson: host.querySelector('[data-ep-export-json]'),
    exportMd: host.querySelector('[data-ep-export-md]'),
  };

  function emptyForm() {
    return {
      pattern_understanding: '',
      difficulty_reasons: [],
      exam_retry: '',
      explain_friend: '',
      want_retry: false,
      source_review_needed: false,
      memo: '',
    };
  }

  function refreshProgress() {
    const prog = getSessionProgress({
      sinceIso: state.sessionStartedAt,
      sessionId: state.getSessionId(),
      evidenceTarget: EVIDENCE_TARGET_DEFAULT,
      patternTarget: PATTERN_TARGET_DEFAULT,
    });
    if (els.progressEv) els.progressEv.textContent = prog.evidenceLabel;
    if (els.progressPat) els.progressPat.textContent = prog.patternLabel;
  }

  function setStatus(msg, kind = '') {
    if (!els.status) return;
    els.status.textContent = msg || '';
    els.status.dataset.kind = kind;
  }

  function renderChoices() {
    const und = host.querySelector('[data-ep-group="pattern_understanding"]');
    const exam = host.querySelector('[data-ep-group="exam_retry"]');
    const exp = host.querySelector('[data-ep-group="explain_friend"]');
    if (und) {
      und.innerHTML = choiceGroup(
        'pattern_understanding',
        UNDERSTANDING,
        state.form.pattern_understanding
      );
    }
    if (exam) {
      exam.innerHTML = choiceGroup('exam_retry', EXAM_RETRY, state.form.exam_retry);
    }
    if (exp) {
      exp.innerHTML = choiceGroup('explain_friend', EXPLAIN, state.form.explain_friend);
    }

    DIFFICULTY.forEach((d) => {
      const cb = host.querySelector(`#ep-diff-${d.value}`);
      if (cb) cb.checked = state.form.difficulty_reasons.includes(d.value);
    });
    const retry = host.querySelector('#ep-want-retry');
    if (retry) retry.checked = Boolean(state.form.want_retry);
    const srcReview = host.querySelector('#ep-source-review');
    if (srcReview) {
      srcReview.checked = Boolean(state.form.source_review_needed);
    }
    const memo = host.querySelector('#ep-memo');
    if (memo) memo.value = state.form.memo || '';
  }

  function scheduleDraft() {
    clearTimeout(state.draftTimer);
    state.draftTimer = setTimeout(() => {
      const qid = state.context?.question_id;
      if (qid) saveEvidenceDraft(qid, state.form);
    }, 200);
  }

  function readFormFromDom() {
    const reasons = [];
    DIFFICULTY.forEach((d) => {
      const cb = host.querySelector(`#ep-diff-${d.value}`);
      if (cb?.checked) reasons.push(d.value);
    });
    state.form.difficulty_reasons = reasons;
    state.form.want_retry = Boolean(host.querySelector('#ep-want-retry')?.checked);
    state.form.source_review_needed = Boolean(
      host.querySelector('#ep-source-review')?.checked
    );
    state.form.memo = host.querySelector('#ep-memo')?.value || '';
  }

  function open(context) {
    state.context = context || state.context;
    if (!state.context?.question_id) {
      setStatus('문제를 먼저 제출한 뒤 기록할 수 있어요.', 'warn');
      return;
    }

    const draft = loadEvidenceDraft(state.context.question_id);
    if (draft) {
      state.form = {
        pattern_understanding: draft.pattern_understanding || '',
        difficulty_reasons: Array.isArray(draft.difficulty_reasons)
          ? draft.difficulty_reasons
          : [],
        exam_retry: draft.exam_retry || '',
        explain_friend: draft.explain_friend || '',
        want_retry: Boolean(draft.want_retry),
        source_review_needed: Boolean(draft.source_review_needed),
        memo: draft.memo || '',
      };
    } else {
      state.form = emptyForm();
    }

    state.open = true;
    host.classList.add('is-open');
    els.panel?.setAttribute('aria-hidden', 'false');
    renderChoices();
    refreshProgress();
    setStatus('Review를 읽은 뒤, 이번 문제를 짧게 기록하세요.', '');
    if (els.hint) {
      els.hint.textContent =
        '목표: 약 20초 · Tab / Space / Enter로 빠르게 입력';
    }
    queueMicrotask(() => {
      host.querySelector('.ep-choice')?.focus();
    });
  }

  function close() {
    readFormFromDom();
    if (state.context?.question_id) {
      saveEvidenceDraft(state.context.question_id, state.form);
    }
    state.open = false;
    host.classList.remove('is-open');
    els.panel?.setAttribute('aria-hidden', 'true');
  }

  function setChoice(group, value) {
    state.form[group] = value;
    renderChoices();
    scheduleDraft();
    const next = host.querySelector(
      `[data-group="${group}"][data-value="${value}"]`
    );
    next?.focus();
  }

  function save() {
    readFormFromDom();
    if (!state.context?.question_id || !state.context?.pattern_id) {
      setStatus('문제 정보가 없어 저장할 수 없어요.', 'err');
      return;
    }
    if (
      !state.form.pattern_understanding ||
      !state.form.exam_retry ||
      !state.form.explain_friend
    ) {
      setStatus('초록·노랑·빨강 세 칸을 모두 골라 주세요.', 'warn');
      return;
    }

    const payload = {
      question_id: state.context.question_id,
      pattern_id: state.context.pattern_id,
      attempt_id: state.context.attempt_id ?? null,
      session_id: state.getSessionId() || state.context.session_id || null,
      student_answer: state.context.student_answer ?? null,
      correct_answer: state.context.correct_answer ?? null,
      is_correct:
        typeof state.context.is_correct === 'boolean'
          ? state.context.is_correct
          : null,
      correct:
        typeof state.context.is_correct === 'boolean'
          ? state.context.is_correct
          : null,
      study_mode:
        state.getStudyMode() || state.context.study_mode || null,
      timestamp: new Date().toISOString(),
      pattern_understanding: state.form.pattern_understanding,
      difficulty_reasons: state.form.difficulty_reasons,
      exam_retry: state.form.exam_retry,
      explain_friend: state.form.explain_friend,
      want_retry: state.form.want_retry,
      memo: state.form.memo,
    };

    const result = appendEvidence(payload);
    if (!result.ok) {
      setStatus(`저장 실패: ${result.error}`, 'err');
      return;
    }

    /* WP-05: flag only — no analysis */
    if (state.form.source_review_needed) {
      markSourceReviewNeeded(state.context.question_id, {
        session_id: payload.session_id,
      });
    }

    state.form = emptyForm();
    renderChoices();
    refreshProgress();
    setStatus('기록했어요. 다음 문제로 가도 좋습니다.', 'ok');
    if (state.onSaved) state.onSaved(result.record, result.total);
  }

  function exportSession(format) {
    const sid =
      state.getSessionId() || sessionFileStamp(null);
    const pkg = buildSessionExportPackage({
      sinceIso: state.sessionStartedAt,
      sessionId: state.getSessionId(),
      attempts: state.getAttempts(),
      retrievals: state.getRetrievals(),
      patternsLearned: state.getPatternsLearned(),
      patternsReviewed: state.getPatternsReviewed(),
      studyMode: state.getStudyMode(),
    });
    pkg.session_id = sid.startsWith('session-') ? sid : `session-${sid}`;
    const stamp = sessionFileStamp(pkg.session_id);
    if (format === 'json') {
      downloadTextFile(
        `${stamp}.json`,
        evidenceToJson(pkg),
        'application/json;charset=utf-8'
      );
      setStatus(`${stamp}.json 내려받기 완료`, 'ok');
    } else {
      downloadTextFile(
        `${stamp}.md`,
        evidenceToMarkdown(pkg, { title: `Session ${stamp}` }),
        'text/markdown;charset=utf-8'
      );
      setStatus(`${stamp}.md 내려받기 완료`, 'ok');
    }
  }

  host.addEventListener('click', (ev) => {
    const t = ev.target;
    if (!(t instanceof Element)) return;

    if (t.closest('[data-ep-open]')) {
      open(state.context);
      return;
    }
    if (t.closest('[data-ep-close]') || t.closest('[data-ep-backdrop]')) {
      close();
      return;
    }
    if (t.closest('[data-ep-save]')) {
      save();
      return;
    }

    const choice = t.closest('.ep-choice');
    if (choice) {
      const group = choice.getAttribute('data-group');
      const value = choice.getAttribute('data-value');
      if (group && value) setChoice(group, value);
    }
  });

  host.addEventListener('keydown', (ev) => {
    const choice = ev.target?.closest?.('.ep-choice');
    if (choice && (ev.key === ' ' || ev.key === 'Enter')) {
      ev.preventDefault();
      const group = choice.getAttribute('data-group');
      const value = choice.getAttribute('data-value');
      if (group && value) setChoice(group, value);
      return;
    }
    if (ev.key === 'Escape' && state.open) {
      close();
    }
  });

  host.addEventListener('change', (ev) => {
    if (ev.target?.matches?.('input[type="checkbox"], #ep-memo, textarea')) {
      readFormFromDom();
      scheduleDraft();
    }
  });

  host.addEventListener('input', (ev) => {
    if (ev.target?.id === 'ep-memo') {
      readFormFromDom();
      scheduleDraft();
    }
  });

  refreshProgress();

  return {
    open,
    close,
    setContext(ctx) {
      state.context = ctx;
    },
    refreshProgress,
    exportSession,
    isOpen: () => state.open,
    destroy() {
      clearTimeout(state.draftTimer);
      host.innerHTML = '';
    },
  };
}

function shellHtml() {
  const diffChecks = DIFFICULTY.map(
    (d) => `
    <label class="ep-check">
      <input type="checkbox" id="ep-diff-${escapeHtml(d.value)}" value="${escapeHtml(d.value)}" />
      <span>${escapeHtml(d.label)}</span>
    </label>`
  ).join('');

  return `
  <aside class="ep-rail" aria-label="이번 학습 기록">
    <div class="ep-rail__progress">
      <div class="ep-rail__row">
        <span class="ep-rail__k">Evidence</span>
        <span class="ep-rail__v" data-ep-progress-ev>0 / ${EVIDENCE_TARGET_DEFAULT}</span>
      </div>
      <div class="ep-rail__row">
        <span class="ep-rail__k">Pattern</span>
        <span class="ep-rail__v" data-ep-progress-pat>0 / ${PATTERN_TARGET_DEFAULT}</span>
      </div>
    </div>
    <button type="button" class="ep-rail__open" data-ep-open>이번 문제 기록</button>
    <p class="ep-rail__note">Export는 오늘 공부 종료 시에만</p>
  </aside>

  <div class="ep-backdrop" data-ep-backdrop></div>
  <div class="ep-panel" data-ep-panel aria-hidden="true" role="dialog" aria-labelledby="ep-title" aria-modal="true">
    <header class="ep-panel__head">
      <h2 id="ep-title" class="ep-title">이번 문제 기록</h2>
      <button type="button" class="ep-icon-btn" data-ep-close aria-label="닫기">×</button>
    </header>
    <p class="ep-hint" data-ep-hint></p>
    <p class="ep-status" data-ep-status role="status"></p>

    <form class="ep-card" data-ep-form onsubmit="return false;">
      <section class="ep-section">
        <h3 class="ep-section__title">Pattern 이해</h3>
        <div class="ep-choice-row" role="radiogroup" aria-label="Pattern 이해"
          data-ep-group="pattern_understanding"></div>
      </section>

      <section class="ep-section">
        <h3 class="ep-section__title">어려웠던 이유</h3>
        <div class="ep-check-grid">${diffChecks}</div>
      </section>

      <section class="ep-section">
        <h3 class="ep-section__title">시험장에서 다시 나오면?</h3>
        <div class="ep-choice-row" role="radiogroup" aria-label="시험장 재출"
          data-ep-group="exam_retry"></div>
      </section>

      <section class="ep-section">
        <h3 class="ep-section__title">친구에게 30초 설명할 수 있다</h3>
        <div class="ep-choice-row" role="radiogroup" aria-label="친구 설명"
          data-ep-group="explain_friend"></div>
      </section>

      <section class="ep-section">
        <h3 class="ep-section__title">다시 풀고 싶다</h3>
        <label class="ep-check ep-check--solo">
          <input type="checkbox" id="ep-want-retry" />
          <span>YES</span>
        </label>
      </section>

      <section class="ep-section">
        <h3 class="ep-section__title">QA</h3>
        <label class="ep-check ep-check--solo">
          <input type="checkbox" id="ep-source-review" />
          <span>원본 확인 필요</span>
        </label>
        <p class="ep-hint">체크 시 questionId만 저장합니다. 분석·채점 없음.</p>
      </section>

      <section class="ep-section">
        <h3 class="ep-section__title">한 줄 메모</h3>
        <input type="text" id="ep-memo" class="ep-memo" maxlength="200"
          placeholder="짧게 적어 두세요" autocomplete="off" />
      </section>

      <div class="ep-actions">
        <button type="button" class="ep-btn ep-btn--primary" data-ep-save>Save Evidence</button>
      </div>
    </form>
  </div>`;
}

/**
 * @deprecated Sprint-06 — Session Export is owned by Session Summary (v3).
 * Kept for compatibility; Prefer `js/session-export-v3.js`.
 */
export function createClosingExportBar(container, api) {
  if (!container || !api) return;
  container.innerHTML = `
    <div class="ep-closing-export">
      <p class="ep-closing-export__title">세션 기록 내보내기</p>
      <p class="ep-closing-export__desc">연구용으로 JSON / Markdown을 저장하세요. (레거시 v2.1)</p>
      <div class="ep-closing-export__actions">
        <button type="button" class="ep-btn ep-btn--primary" data-close-export-json>session JSON</button>
        <button type="button" class="ep-btn ep-btn--ghost" data-close-export-md>session Markdown</button>
      </div>
    </div>`;
  container.querySelector('[data-close-export-json]')?.addEventListener('click', () => {
    api.exportSession('json');
  });
  container.querySelector('[data-close-export-md]')?.addEventListener('click', () => {
    api.exportSession('md');
  });
}

export default { mountEvidencePad, createClosingExportBar };
