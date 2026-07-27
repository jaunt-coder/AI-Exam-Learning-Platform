/**
 * Sprint-12A — Pattern Override Editor (request + memo). Does not mutate Pattern DB.
 */

import { saveOverride, getOverride } from './override-service.js';

/**
 * @param {string} questionId
 * @param {{
 *   patternId?: string,
 *   patternMemo?: string,
 *   patternChangeRequest?: string,
 *   reviewer?: string,
 * }} patch
 */
export function savePatternOverride(questionId, patch = {}) {
  const existing = getOverride(questionId);
  const flags = Array.isArray(existing?.override?.reviewFlags)
    ? existing.override.reviewFlags.slice()
    : [];
  if (!flags.includes('PATTERN_FIXED') && patch.patternId) {
    flags.push('PATTERN_FIXED');
  }
  return saveOverride(
    questionId,
    {
      patternId: patch.patternId,
      patternMemo: patch.patternMemo || '',
      patternChangeRequest: patch.patternChangeRequest || '',
      reviewFlags: flags,
    },
    {
      reviewer: patch.reviewer || 'local',
      changedFields: ['patternId', 'patternMemo', 'patternChangeRequest'].filter(
        (k) => patch[k] !== undefined,
      ),
    },
  );
}

/**
 * @param {{
 *   questionId: string,
 *   currentPatternId?: string,
 *   onChange?: (payload: object) => void,
 * }} options
 */
export function createPatternEditor(options = {}) {
  const ov = getOverride(options.questionId);
  let state = {
    patternId: ov?.override?.patternId || options.currentPatternId || '',
    patternMemo: ov?.override?.patternMemo || '',
    patternChangeRequest: ov?.override?.patternChangeRequest || '',
  };

  return {
    getState: () => ({ ...state }),

    /**
     * @param {HTMLElement} container
     */
    mount(container) {
      if (!container) return;
      container.innerHTML = `
        <label class="rv-field">
          <span>Pattern Override</span>
          <input type="text" data-f="patternId" value="${escapeAttr(state.patternId)}" placeholder="예: COST_PROCESS_001">
        </label>
        <label class="rv-field">
          <span>Pattern 변경 요청</span>
          <input type="text" data-f="patternChangeRequest" value="${escapeAttr(state.patternChangeRequest)}" placeholder="변경 요청 요약">
        </label>
        <label class="rv-field">
          <span>Pattern 메모</span>
          <textarea data-f="patternMemo" rows="3" placeholder="Pattern 메모">${escapeHtml(state.patternMemo)}</textarea>
        </label>
      `;
      container.querySelectorAll('[data-f]').forEach((el) => {
        const apply = () => {
          state[el.dataset.f] = el.value;
          if (typeof options.onChange === 'function') {
            options.onChange({ ...state });
          }
        };
        el.addEventListener('change', apply);
        el.addEventListener('input', apply);
      });
    },

    persist(reviewer = 'local') {
      return savePatternOverride(options.questionId, {
        ...state,
        reviewer,
      });
    },
  };
}

function escapeAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export default {
  savePatternOverride,
  createPatternEditor,
};
