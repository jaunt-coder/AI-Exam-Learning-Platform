/**
 * Sprint-19A — Subject Router
 * switchSubject / route helpers. Does not mutate Learning Engine formulas.
 */

import { normalizeSubjectId, SUBJECT_LABELS } from './subject-config.js';
import { ensureBuiltinSubjectsRegistered, getRegisteredSubject } from './subject-registry.js';
import { loadSubject } from './subject-loader.js';
import {
  getCurrentSubjectId,
  setCurrentSubjectId,
  buildSubjectContext,
} from './subject-context.js';

const listeners = new Set();

/**
 * Subscribe to subject switch events.
 * @param {(evt: { from: string, to: string, context: object }) => void} fn
 */
export function onSubjectChange(fn) {
  if (typeof fn === 'function') listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(evt) {
  for (const fn of listeners) {
    try {
      fn(evt);
    } catch (_e) {
      /* ignore listener errors */
    }
  }
}

/**
 * Switch active subject plugin.
 * @param {string} subjectId
 * @param {{ silent?: boolean }} [opts]
 */
export async function switchSubject(subjectId, opts = {}) {
  ensureBuiltinSubjectsRegistered();
  const from = getCurrentSubjectId();
  const to = normalizeSubjectId(subjectId);
  const meta = getRegisteredSubject(to);
  if (!meta || meta.enabled === false) {
    return {
      ok: false,
      reason: 'subject-disabled',
      from,
      to,
    };
  }

  await loadSubject(to, { force: false });
  setCurrentSubjectId(to);
  const context = buildSubjectContext({ subjectId: to });

  if (!opts.silent) {
    emit({ from, to, context, label: SUBJECT_LABELS[to] || to });
  }

  return {
    ok: true,
    from,
    to,
    context,
    label: SUBJECT_LABELS[to] || to,
  };
}

/**
 * Sync switch (uses cached/builtin plugin; no await fetch).
 * @param {string} subjectId
 */
export function switchSubjectSync(subjectId) {
  ensureBuiltinSubjectsRegistered();
  const from = getCurrentSubjectId();
  const to = normalizeSubjectId(subjectId);
  setCurrentSubjectId(to);
  const context = buildSubjectContext({ subjectId: to });
  emit({ from, to, context, label: SUBJECT_LABELS[to] || to });
  return { ok: true, from, to, context };
}

/**
 * Resolve subjectId for a question (ACC_* → accounting, else current).
 * @param {object} question
 */
export function resolveSubjectIdForQuestion(question = {}) {
  if (question.subjectPluginId) return normalizeSubjectId(question.subjectPluginId);
  const sid = String(question.subjectId || '').toUpperCase();
  if (sid === 'ACC' || sid === 'ACCOUNTING' || sid.startsWith('ACC')) {
    return 'accounting';
  }
  if (sid === 'ECO' || sid === 'ECONOMICS') return 'economics';
  if (sid === 'CIV' || sid === 'CIVIL') return 'civil';
  if (sid === 'REA' || sid === 'REALESTATE' || sid === 'RE') return 'realestate';
  if (sid === 'LAW') return 'law';
  const patternId = String(question.patternId || '');
  if (patternId.startsWith('ACC_')) return 'accounting';
  return getCurrentSubjectId();
}

export default {
  switchSubject,
  switchSubjectSync,
  onSubjectChange,
  resolveSubjectIdForQuestion,
};
