/**
 * Sprint-15B — Weak Point Memory
 * Same mistake × 3 → pre-question warning banner.
 * Storage: learning.weak-memory.v1
 */

import { loadWeakMemoryDoc, saveWeakMemoryDoc } from './cache.js';
import {
  PATTERN_NAMES,
  PATTERN_TUTOR_PROFILES,
} from '../ai-tutor-content/pattern-profiles.js';
import { resolveMemoryMessage } from '../subject/subject-adapter.js';

export const WEAK_MEMORY_THRESHOLD = 3;

function memoryKey(patternId, mistakeCode) {
  return `${patternId || 'na'}::${mistakeCode || 'na'}`;
}

function defaultBannerMessage(patternId, mistakeCode, label) {
  const name = PATTERN_NAMES[patternId] || patternId || '이 Pattern';
  const viaSubject = resolveMemoryMessage({
    patternId,
    mistakeCode,
    label,
    patternName: name,
  });
  if (viaSubject) return viaSubject;

  const profile = PATTERN_TUTOR_PROFILES[patternId] || null;
  if (profile?.frequentlyConfusedWith) {
    const tip = String(profile.frequentlyConfusedWith).split(/[.—]/)[0].trim();
    if (tip) return `${tip}와(과) 자주 혼동합니다.`;
  }
  return `${name}에서 「${label || mistakeCode || '동일 실수'}」를 반복하고 있습니다.`;
}

/**
 * Record a mistake hit for weak-memory counting.
 * @param {{ patternId?: string, code?: string, label?: string, questionId?: string }} hit
 */
export function recordWeakMistake(hit = {}) {
  const patternId = hit.patternId || '';
  const code = hit.code || 'UNKNOWN';
  if (!patternId || code === 'NONE') {
    return { ok: false, activated: false };
  }

  const doc = loadWeakMemoryDoc();
  if (!doc.byKey) doc.byKey = {};
  if (!doc.banners) doc.banners = {};

  const key = memoryKey(patternId, code);
  if (!doc.byKey[key]) {
    doc.byKey[key] = {
      patternId,
      code,
      label: hit.label || code,
      count: 0,
      questionIds: [],
    };
  }
  const row = doc.byKey[key];
  row.count = (Number(row.count) || 0) + 1;
  if (hit.label) row.label = hit.label;
  if (hit.questionId && !row.questionIds.includes(hit.questionId)) {
    row.questionIds.push(hit.questionId);
  }
  row.updatedAt = new Date().toISOString();

  let activated = false;
  if (row.count >= WEAK_MEMORY_THRESHOLD) {
    activated = true;
    doc.banners[patternId] = {
      patternId,
      code,
      label: row.label,
      count: row.count,
      message: defaultBannerMessage(patternId, code, row.label),
      active: true,
      activatedAt: doc.banners[patternId]?.activatedAt || new Date().toISOString(),
    };
  }

  saveWeakMemoryDoc(doc);
  return { ok: true, count: row.count, activated, banner: doc.banners[patternId] || null };
}

/**
 * Active weak banner for a Pattern (shown before question starts).
 */
export function getWeakBanner(patternId) {
  if (!patternId) return null;
  const doc = loadWeakMemoryDoc();
  const banner = doc.banners?.[patternId];
  if (!banner || banner.active === false) return null;
  return banner;
}

/**
 * Render warning banner HTML.
 */
export function renderWeakBannerHtml(banner, esc) {
  if (!banner) return '';
  const e = esc || ((s) => String(s ?? ''));
  return `
    <aside class="st-weak-banner" role="status" aria-live="polite" data-weak-memory="1">
      <p class="st-weak-banner__kicker">주의</p>
      <p class="st-weak-banner__message">${e(banner.message)}</p>
      <p class="st-weak-banner__meta">${e(banner.label || '')} · ${e(banner.count)}회 반복</p>
    </aside>`;
}

/**
 * Mount banner into host element (clears if none).
 */
export function mountWeakBanner(host, patternId) {
  if (!host) return null;
  const banner = getWeakBanner(patternId);
  if (!banner) {
    host.innerHTML = '';
    host.hidden = true;
    return null;
  }
  host.innerHTML = renderWeakBannerHtml(banner);
  host.hidden = false;
  return banner;
}

export default {
  WEAK_MEMORY_THRESHOLD,
  recordWeakMistake,
  getWeakBanner,
  renderWeakBannerHtml,
  mountWeakBanner,
};
