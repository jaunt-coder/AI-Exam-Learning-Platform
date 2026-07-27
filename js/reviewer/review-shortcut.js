/**
 * Sprint-12F — Review Entry Keyboard Shortcuts
 * Ctrl+S Save · Ctrl+Enter Approve · Esc Close · Tab navigation (native)
 */

import { getItem, setItem, STORAGE_KEYS } from '../storage.js';

const UI_KEY = STORAGE_KEYS.LEARNING_REVIEW_UI_V1 || 'learning.review-ui.v1';
const SHORTCUT_KEY =
  STORAGE_KEYS.LEARNING_REVIEW_SHORTCUT_V1 || 'learning.review-shortcut.v1';

const DEFAULT_SHORTCUTS = Object.freeze({
  save: 'Ctrl+S',
  approve: 'Ctrl+Enter',
  close: 'Escape',
});

let boundHandler = null;
let activeHandlers = null;

/**
 * @returns {object}
 */
export function loadShortcutPrefs() {
  try {
    const doc = getItem(SHORTCUT_KEY, null);
    if (!doc || typeof doc !== 'object') {
      return { schemaVersion: 'v1', shortcuts: { ...DEFAULT_SHORTCUTS } };
    }
    return {
      schemaVersion: 'v1',
      shortcuts: { ...DEFAULT_SHORTCUTS, ...(doc.shortcuts || {}) },
      updatedAt: doc.updatedAt || null,
    };
  } catch (_err) {
    return { schemaVersion: 'v1', shortcuts: { ...DEFAULT_SHORTCUTS } };
  }
}

/**
 * @param {object} prefs
 * @returns {boolean}
 */
export function saveShortcutPrefs(prefs = {}) {
  try {
    return setItem(SHORTCUT_KEY, {
      schemaVersion: 'v1',
      shortcuts: { ...DEFAULT_SHORTCUTS, ...(prefs.shortcuts || {}) },
      updatedAt: new Date().toISOString(),
    });
  } catch (_err) {
    return false;
  }
}

/**
 * Persist lightweight UI prefs (modal open state etc.).
 * @param {object} state
 */
export function saveReviewUiState(state = {}) {
  try {
    return setItem(UI_KEY, {
      schemaVersion: 'v1',
      ...state,
      updatedAt: new Date().toISOString(),
    });
  } catch (_err) {
    return false;
  }
}

/**
 * @returns {object}
 */
export function loadReviewUiState() {
  try {
    const doc = getItem(UI_KEY, null);
    return doc && typeof doc === 'object' ? doc : { schemaVersion: 'v1' };
  } catch (_err) {
    return { schemaVersion: 'v1' };
  }
}

function isEditableTarget(el) {
  if (!el) return false;
  const tag = String(el.tagName || '').toLowerCase();
  return (
    tag === 'textarea' ||
    tag === 'input' ||
    tag === 'select' ||
    el.isContentEditable
  );
}

/**
 * @param {{
 *   onSave?: () => void,
 *   onApprove?: () => void,
 *   onClose?: () => void,
 *   root?: HTMLElement|Document,
 * }} handlers
 */
export function bindReviewShortcuts(handlers = {}) {
  unbindReviewShortcuts();
  activeHandlers = handlers;
  const root = handlers.root || document;

  boundHandler = (event) => {
    if (!activeHandlers) return;
    const key = event.key;
    const ctrl = event.ctrlKey || event.metaKey;

    if (ctrl && (key === 's' || key === 'S')) {
      event.preventDefault();
      activeHandlers.onSave?.();
      return;
    }
    if (ctrl && key === 'Enter') {
      event.preventDefault();
      activeHandlers.onApprove?.();
      return;
    }
    if (key === 'Escape') {
      /* allow Esc even from inputs */
      event.preventDefault();
      activeHandlers.onClose?.();
      return;
    }

    /* Tab / Shift+Tab: native focus order inside modal — do not intercept */
    if (key === 'Tab' && isEditableTarget(event.target)) {
      return;
    }
  };

  root.addEventListener('keydown', boundHandler, true);
}

export function unbindReviewShortcuts() {
  if (boundHandler) {
    document.removeEventListener('keydown', boundHandler, true);
    boundHandler = null;
  }
  activeHandlers = null;
}

export { DEFAULT_SHORTCUTS };

export default {
  loadShortcutPrefs,
  saveShortcutPrefs,
  saveReviewUiState,
  loadReviewUiState,
  bindReviewShortcuts,
  unbindReviewShortcuts,
  DEFAULT_SHORTCUTS,
};
