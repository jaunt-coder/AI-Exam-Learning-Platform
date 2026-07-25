/**
 * Sprint-07 Session Resume — Resume Study? Continue / Restart
 * Presentation helper. Persists snapshot via sync-service progress.
 */

import {
  getProgress,
  saveProgressResume,
  clearProgressResume,
} from '../runtime/sync-service.js';

/**
 * @typedef {object} ResumeSnapshot
 * @property {string} pattern_id
 * @property {number} pattern_index
 * @property {number} question_index
 * @property {number} stage_index
 * @property {'pattern_master'|'exam'} study_mode
 * @property {string} screen
 * @property {number} saved_at
 * @property {string} [pattern_name]
 */

/**
 * @param {Partial<ResumeSnapshot>} snapshot
 */
export function persistResumeSnapshot(snapshot) {
  if (!snapshot || snapshot.pattern_id == null) {
    clearProgressResume();
    return null;
  }
  const resume = {
    pattern_id: snapshot.pattern_id,
    pattern_index: Number(snapshot.pattern_index) || 0,
    question_index: Number(snapshot.question_index) || 0,
    stage_index: Number(snapshot.stage_index) || 0,
    study_mode:
      snapshot.study_mode === 'exam' ? 'exam' : 'pattern_master',
    screen: snapshot.screen || 'flow',
    saved_at: Date.now(),
    pattern_name: snapshot.pattern_name || snapshot.pattern_id,
  };
  saveProgressResume(resume);
  return resume;
}

export function readResumeSnapshot() {
  const progress = getProgress();
  const resume = progress?.resume;
  if (!resume || !resume.pattern_id) return null;
  /* Stale after 7 days → ignore */
  const age = Date.now() - (resume.saved_at || 0);
  if (age > 7 * 24 * 60 * 60 * 1000) return null;
  return resume;
}

export function discardResume() {
  clearProgressResume();
}

/**
 * Mount Resume Study dialog if a snapshot exists.
 * @param {HTMLElement} host
 * @param {{ onContinue: (snap: ResumeSnapshot) => void, onRestart: () => void }} handlers
 * @returns {{ shown: boolean, destroy: () => void }}
 */
export function mountResumePrompt(host, handlers = {}) {
  if (!host) return { shown: false, destroy() {} };
  const snap = readResumeSnapshot();
  if (!snap) {
    host.hidden = true;
    host.innerHTML = '';
    return { shown: false, destroy() {} };
  }

  host.hidden = false;
  host.innerHTML = `
    <div class="resume-card" role="dialog" aria-labelledby="resume-title" aria-modal="false">
      <p class="edu-kicker">Session Resume</p>
      <h2 id="resume-title" class="resume-card__title">Resume Study?</h2>
      <p class="resume-card__desc">
        이전에 학습하던 Pattern이 있습니다.
        <strong>${escapeHtml(snap.pattern_name || snap.pattern_id)}</strong>
      </p>
      <dl class="edu-facts resume-card__facts">
        <div><dt>모드</dt><dd>${
          snap.study_mode === 'exam' ? 'Exam Mode' : 'Pattern Master'
        }</dd></div>
        <div><dt>문제</dt><dd>${(snap.question_index || 0) + 1}</dd></div>
        <div><dt>단계</dt><dd>${snap.stage_index ?? 0}</dd></div>
      </dl>
      <div class="ll-actions resume-card__actions">
        <button type="button" class="button button--primary" data-resume-continue>Continue</button>
        <button type="button" class="button button--ghost" data-resume-restart>Restart</button>
      </div>
      <p class="ll-hint">Continue는 이어서, Restart는 이 Pattern을 처음부터 시작합니다. 학습 기록(Attempt/Evidence)은 삭제되지 않습니다.</p>
    </div>
  `;

  const onContinue = () => {
    handlers.onContinue?.(snap);
  };
  const onRestart = () => {
    discardResume();
    host.hidden = true;
    host.innerHTML = '';
    handlers.onRestart?.();
  };

  host.querySelector('[data-resume-continue]')?.addEventListener('click', onContinue);
  host.querySelector('[data-resume-restart]')?.addEventListener('click', onRestart);

  return {
    shown: true,
    destroy() {
      host.hidden = true;
      host.innerHTML = '';
    },
  };
}

function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export default {
  persistResumeSnapshot,
  readResumeSnapshot,
  discardResume,
  mountResumePrompt,
};
