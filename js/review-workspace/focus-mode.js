/**
 * Sprint-12E — Focus Mode (hide non-review chrome)
 */

import {
  loadFocusModeDoc,
  saveFocusModeDoc,
} from './workspace-storage.js';

/**
 * @param {boolean} enabled
 */
export function setFocusMode(enabled) {
  const doc = loadFocusModeDoc();
  doc.enabled = Boolean(enabled);
  saveFocusModeDoc(doc);
  applyFocusModeToDocument(doc.enabled);
  return doc;
}

export function toggleFocusMode() {
  const doc = loadFocusModeDoc();
  return setFocusMode(!doc.enabled);
}

export function isFocusModeEnabled() {
  return Boolean(loadFocusModeDoc().enabled);
}

/**
 * Hide global nav destinations while focusing on review.
 * @param {boolean} enabled
 */
export function applyFocusModeToDocument(enabled) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('rw-focus-mode', Boolean(enabled));
  const nav = document.querySelector('.header-nav');
  if (!nav) return;
  nav.querySelectorAll('a').forEach((a) => {
    const href = a.getAttribute('href') || '';
    const keep =
      href.includes('review-workspace') ||
      href.includes('review.html') ||
      href === '#' ||
      a.getAttribute('data-focus-keep') === 'true';
    if (enabled && !keep) {
      a.setAttribute('hidden', 'true');
      a.setAttribute('aria-hidden', 'true');
    } else {
      a.removeAttribute('hidden');
      a.removeAttribute('aria-hidden');
    }
  });
}

export default {
  setFocusMode,
  toggleFocusMode,
  isFocusModeEnabled,
  applyFocusModeToDocument,
};
