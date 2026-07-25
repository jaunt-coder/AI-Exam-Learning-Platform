/**
 * M2.7 Retrieval Prompt + Recall Timeline UI
 * Student writes recall. No AI grading / answer comparison / coaching.
 */

import {
  appendRetrieval,
  getRecallTimeline,
  getPreviousRecall,
  saveRetrievalDraft,
  loadRetrievalDraft,
  DEFAULT_RETRIEVAL_PROMPT,
} from '../runtime/retrieval-service.js';

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Render full recall history for a pattern (WP-13).
 * @param {HTMLElement} host
 * @param {string} patternId
 * @param {object} [opts]
 */
export function renderRecallTimeline(host, patternId, opts = {}) {
  if (!host) return;
  const timeline = getRecallTimeline(patternId);
  const title = opts.title || '이전 회상 기록';
  const history = timeline.history || [];

  if (!history.length) {
    host.innerHTML = `
      <div class="rt-timeline" data-rt-timeline>
        <h3 class="rt-timeline__title">${escapeHtml(title)}</h3>
        <p class="rt-timeline__empty">아직 이 Pattern에 남긴 회상이 없습니다.</p>
      </div>`;
    return;
  }

  const items = history
    .map((h, i) => {
      const n = i + 1;
      const arrow =
        i < history.length - 1
          ? '<div class="rt-timeline__arrow" aria-hidden="true">↓</div>'
          : '';
      return `
        <div class="rt-timeline__item">
          <p class="rt-timeline__ord">${n}차</p>
          <blockquote class="rt-timeline__quote">${escapeHtml(h.student_response)}</blockquote>
          <p class="rt-timeline__meta">${escapeHtml(
            (h.created_at || '').slice(0, 16).replace('T', ' ')
          )}</p>
        </div>
        ${arrow}`;
    })
    .join('');

  host.innerHTML = `
    <div class="rt-timeline" data-rt-timeline>
      <h3 class="rt-timeline__title">${escapeHtml(title)}</h3>
      <p class="rt-timeline__note">자신의 회상 변화만 확인합니다. 평가하지 않습니다.</p>
      <div class="rt-timeline__list">${items}</div>
    </div>`;
}

/**
 * Mount Retrieval Prompt stage panel (WP-11 + WP-12).
 * @param {HTMLElement} panel
 * @param {object} ctx
 * @returns {{ getSaved: Function, destroy: Function }}
 */
export function mountRetrievalPrompt(panel, ctx = {}) {
  if (!panel) return { getSaved: () => null, destroy() {} };

  const patternId = ctx.pattern_id || '';
  const questionId = ctx.question_id || '';
  const attemptId = ctx.attempt_id || null;
  const sessionId = ctx.session_id || null;
  const studyMode = ctx.study_mode || null;
  const promptText = ctx.prompt || DEFAULT_RETRIEVAL_PROMPT;
  const previous = getPreviousRecall(patternId, {
    excludeAttemptId: attemptId,
  });
  const draft = questionId ? loadRetrievalDraft(questionId) : null;
  let savedRecord = null;
  let draftTimer = null;

  const previousBlock = previous
    ? `
    <div class="rt-previous" role="note">
      <h3 class="rt-previous__title">지난번 회상</h3>
      <blockquote class="rt-previous__quote">“${escapeHtml(
        previous.student_response
      )}”</blockquote>
      <p class="rt-previous__ask">이번에는 어떻게 설명하겠습니까?</p>
    </div>`
    : `
    <div class="rt-previous rt-previous--empty" role="note">
      <p>이 Pattern의 첫 회상입니다. 시험장에서 가장 먼저 확인할 것을 적어 보세요.</p>
    </div>`;

  panel.innerHTML = `
    <article class="rt-card" aria-labelledby="rt-heading">
      <header class="rt-card__head">
        <p class="edu-kicker">Retrieval</p>
        <h2 id="rt-heading" class="study-card__title">스스로 회상하기</h2>
        <p class="rt-card__lead">정답을 맞히는 단계가 아닙니다. 떠오르는 것을 적어 두세요.</p>
      </header>

      ${previousBlock}

      <div class="rt-prompt">
        <label class="rt-prompt__label" for="rt-response">${escapeHtml(
          promptText
        )}</label>
        <textarea id="rt-response" class="rt-prompt__input" rows="4"
          maxlength="500" placeholder="직접 작성 · AI 채점 없음"
          autocomplete="off">${escapeHtml(draft?.student_response || '')}</textarea>
        <p class="rt-prompt__hint">저장만 합니다. 자동 평가·정답 비교 없음.</p>
      </div>

      <div class="rt-actions">
        <button type="button" class="button button--primary" data-rt-save>회상 저장</button>
      </div>
      <p class="rt-status" data-rt-status role="status"></p>

      <div data-rt-history-host class="rt-history-host"></div>
    </article>
  `;

  const historyHost = panel.querySelector('[data-rt-history-host]');
  if (historyHost && patternId) {
    renderRecallTimeline(historyHost, patternId, {
      title: '이 Pattern 회상 Timeline',
    });
  }

  const textarea = panel.querySelector('#rt-response');
  const statusEl = panel.querySelector('[data-rt-status]');

  function setStatus(msg, kind = '') {
    if (!statusEl) return;
    statusEl.textContent = msg || '';
    statusEl.dataset.kind = kind;
  }

  function scheduleDraft() {
    if (!questionId) return;
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => {
      saveRetrievalDraft(questionId, {
        student_response: textarea?.value || '',
        retrieval_prompt: promptText,
      });
    }, 200);
  }

  textarea?.addEventListener('input', scheduleDraft);

  panel.querySelector('[data-rt-save]')?.addEventListener('click', () => {
    const response = (textarea?.value || '').trim();
    if (!response) {
      setStatus('한 줄이라도 회상을 적은 뒤 저장해 주세요.', 'warn');
      textarea?.focus();
      return;
    }
    if (!patternId) {
      setStatus('Pattern 정보가 없어 저장할 수 없어요.', 'err');
      return;
    }

    const result = appendRetrieval({
      pattern_id: patternId,
      question_id: questionId,
      attempt_id: attemptId,
      session_id: sessionId,
      retrieval_prompt: promptText,
      question: promptText,
      student_response: response,
      study_mode: studyMode,
    });

    if (!result.ok) {
      setStatus(`저장 실패: ${result.error}`, 'err');
      return;
    }

    savedRecord = result.record;
    setStatus('회상을 저장했습니다. 이어서 이번 문제 기록을 남기세요.', 'ok');
    if (historyHost) {
      renderRecallTimeline(historyHost, patternId, {
        title: '이 Pattern 회상 Timeline',
      });
    }
    if (typeof ctx.onSaved === 'function') {
      ctx.onSaved(result.record);
    }
  });

  queueMicrotask(() => textarea?.focus());

  return {
    getSaved: () => savedRecord,
    isSaved: () => Boolean(savedRecord),
    destroy() {
      clearTimeout(draftTimer);
    },
  };
}

export default { renderRecallTimeline, mountRetrievalPrompt };
