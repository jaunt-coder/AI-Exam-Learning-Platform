/**
 * Sprint-12E — Reviewer Workspace orchestration
 * Integrates Queue (12D) + Override (12A) + AI Recovery (12B) + Quality (12C)
 * Never writes Question / Pattern / Master DB.
 */

import {
  getReviewQueue,
  decide,
  syncReviewQueueFromQuality,
  getWorkflowSummary,
  startReview,
} from '../review-workflow/workflow-service.js';
import { resolveQuestion, getOverride } from '../reviewer/override-service.js';
import { runAiRecovery } from '../recovery/ai-recovery-service.js';
import { scoreQuestion } from '../quality/quality-engine.js';
import {
  loadQualityDoc,
  saveQualityDoc,
  loadQualityHistoryDoc,
  saveQualityHistoryDoc,
} from '../quality/quality-storage.js';
import {
  applyQuickFix,
  quickApproveAllAi,
  getQuickFixHistory,
} from './quick-fix.js';
import {
  recordSessionAction,
  setSessionRemaining,
  getSessionSummary,
} from './review-session.js';
import {
  loadWorkspaceDoc,
  saveWorkspaceDoc,
} from './workspace-storage.js';
import {
  setSelectedQuestionIds,
  getSelectedQuestionIds,
  bulkDecide,
  bulkExport,
} from './bulk-review.js';
import {
  setFocusMode,
  toggleFocusMode,
  isFocusModeEnabled,
  applyFocusModeToDocument,
} from './focus-mode.js';

const CLOSED = new Set(['APPROVED', 'REJECTED', 'SKIPPED', 'COMPLETED']);

function isOpenItem(item) {
  return item && !CLOSED.has(String(item.status || ''));
}

/**
 * Recompute quality for one question and persist (dashboard refresh + history).
 */
export function refreshQualityForQuestion(originalQuestion, ctx = {}) {
  if (!originalQuestion) return null;
  const quality = scoreQuestion(originalQuestion, ctx);
  const qid = quality.questionId;
  const doc = loadQualityDoc();
  doc.byQuestion[qid] = quality;
  const scores = Object.values(doc.byQuestion).map((r) => r.score || 0);
  const avg = scores.length
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
    : 0;
  doc.aggregate = {
    ...(doc.aggregate || {}),
    averageScore: avg,
    totalQuestions: scores.length,
    generatedAt: new Date().toISOString(),
    lastWorkspaceRefresh: qid,
  };
  saveQualityDoc(doc);

  const hist = loadQualityHistoryDoc();
  const day = new Date().toISOString().slice(0, 10);
  hist.daily = [
    ...(hist.daily || []).filter((d) => d.date !== day),
    {
      date: day,
      averageScore: avg,
      source: 'review-workspace',
      questionId: qid,
    },
  ].slice(-90);
  saveQualityHistoryDoc(hist);
  return quality;
}

export function getQueueItem(questionId) {
  return getReviewQueue().find((i) => i.questionId === questionId) || null;
}

/**
 * Ensure queue exists, then return ordered items.
 */
export function ensureWorkspaceQueue() {
  let items = getReviewQueue();
  if (!items.length) {
    syncReviewQueueFromQuality();
    items = getReviewQueue();
  }
  setSessionRemaining(items.filter(isOpenItem).length);
  return items;
}

export function getCurrentQuestionId() {
  const doc = loadWorkspaceDoc();
  if (doc.currentQuestionId) return doc.currentQuestionId;
  const open = ensureWorkspaceQueue().find(isOpenItem);
  return open?.questionId || ensureWorkspaceQueue()[0]?.questionId || null;
}

export function setCurrentQuestionId(questionId) {
  const doc = loadWorkspaceDoc();
  doc.currentQuestionId = questionId || null;
  doc.lastAction = 'navigate';
  saveWorkspaceDoc(doc);
  return doc.currentQuestionId;
}

export function navigateRelative(delta) {
  const items = ensureWorkspaceQueue();
  if (!items.length) return null;
  const cur = getCurrentQuestionId();
  let idx = items.findIndex((i) => i.questionId === cur);
  if (idx < 0) idx = 0;
  idx = Math.max(0, Math.min(items.length - 1, idx + delta));
  return setCurrentQuestionId(items[idx].questionId);
}

/**
 * Build full workspace view-model for one question.
 * @param {object} originalQuestion — from Question DB (read-only)
 * @param {string} [questionId]
 */
export function buildWorkspaceView(originalQuestion, questionId) {
  const qid =
    questionId ||
    originalQuestion?.questionId ||
    originalQuestion?.id ||
    getCurrentQuestionId();
  const queue = ensureWorkspaceQueue();
  const queueItem = getQueueItem(qid) || null;
  const resolved = originalQuestion
    ? resolveQuestion(originalQuestion)
    : null;
  let recovery = null;
  try {
    recovery = originalQuestion ? runAiRecovery(originalQuestion) : null;
  } catch (_err) {
    recovery = null;
  }
  let quality = null;
  try {
    quality = originalQuestion
      ? scoreQuestion(originalQuestion, {
          hasOverride: Boolean(getOverride(qid)),
          hasRecoverySuggestion: Boolean(recovery?.changes?.length),
        })
      : null;
  } catch (_err) {
    quality = null;
  }

  const idx = queue.findIndex((i) => i.questionId === qid);
  const nextItem = idx >= 0 && idx < queue.length - 1 ? queue[idx + 1] : null;
  const prevItem = idx > 0 ? queue[idx - 1] : null;

  return {
    questionId: qid,
    queue,
    queueItem,
    nextQuestionId: nextItem?.questionId || null,
    prevQuestionId: prevItem?.questionId || null,
    original: originalQuestion || null,
    resolved: resolved?.question || null,
    hasOverride: Boolean(resolved?.hasOverride),
    override: getOverride(qid),
    recovery,
    quality,
    qualitySnapshot: loadQualityDoc(),
    quickHistory: getQuickFixHistory(qid),
    session: getSessionSummary(),
    workflow: getWorkflowSummary(),
    selectedIds: getSelectedQuestionIds(),
    focusMode: isFocusModeEnabled(),
  };
}

/**
 * One-click fix then optional quality refresh callback data.
 */
export function oneClickFix(originalQuestion, type, meta = {}) {
  const started = Date.now();
  const result = applyQuickFix(originalQuestion, type, meta);
  const doc = loadWorkspaceDoc();
  doc.lastAction = `fix:${type}`;
  saveWorkspaceDoc(doc);
  return { ...result, elapsedMs: Date.now() - started };
}

export function oneClickApproveAi(originalQuestion, meta = {}) {
  const started = Date.now();
  const ai = quickApproveAllAi(originalQuestion, meta);
  const qid = originalQuestion?.questionId || originalQuestion?.id;
  const decision = decide(qid, 'APPROVE_AI', {
    reviewer: meta.reviewer || 'local',
    comment: meta.comment || 'Workspace Approve AI',
  });
  recordSessionAction('approved', Date.now() - started);
  setSessionRemaining(ensureWorkspaceQueue().filter(isOpenItem).length);
  let quality = null;
  try {
    quality = refreshQualityForQuestion(originalQuestion, {
      hasOverride: true,
      hasRecoverySuggestion: true,
    });
  } catch (_err) {
    quality = null;
  }
  return { ok: true, ai, decision, quality, elapsedMs: Date.now() - started };
}

export function oneClickApproveOverride(originalQuestion, meta = {}) {
  const started = Date.now();
  const qid = originalQuestion?.questionId || originalQuestion?.id;
  const decision = decide(qid, 'APPROVE_OVERRIDE', {
    reviewer: meta.reviewer || 'local',
    comment: meta.comment || 'Workspace Approve Override',
  });
  recordSessionAction('approved', Date.now() - started);
  setSessionRemaining(ensureWorkspaceQueue().filter(isOpenItem).length);
  let quality = null;
  try {
    quality = refreshQualityForQuestion(originalQuestion, {
      hasOverride: Boolean(getOverride(qid)),
    });
  } catch (_err) {
    quality = null;
  }
  return { ok: true, decision, quality, elapsedMs: Date.now() - started };
}

export function oneClickReject(originalQuestion, meta = {}) {
  const started = Date.now();
  const qid = originalQuestion?.questionId || originalQuestion?.id;
  const decision = decide(qid, 'REJECT_AI', {
    reviewer: meta.reviewer || 'local',
    comment: meta.comment || 'Workspace Reject',
  });
  recordSessionAction('rejected', Date.now() - started);
  setSessionRemaining(ensureWorkspaceQueue().filter(isOpenItem).length);
  return { ok: true, decision, elapsedMs: Date.now() - started };
}

export function oneClickSkip(originalQuestion, meta = {}) {
  const started = Date.now();
  const qid = originalQuestion?.questionId || originalQuestion?.id;
  const decision = decide(qid, 'SKIP', {
    reviewer: meta.reviewer || 'local',
    comment: meta.comment || 'Workspace Skip',
  });
  recordSessionAction('skipped', Date.now() - started);
  setSessionRemaining(ensureWorkspaceQueue().filter(isOpenItem).length);
  return { ok: true, decision, elapsedMs: Date.now() - started };
}

export { startReview, getQueueItem };

export function oneClickNext() {
  return navigateRelative(1);
}

export function oneClickPrevious() {
  return navigateRelative(-1);
}

export {
  setSelectedQuestionIds,
  getSelectedQuestionIds,
  bulkDecide,
  bulkExport,
  setFocusMode,
  toggleFocusMode,
  isFocusModeEnabled,
  applyFocusModeToDocument,
  getSessionSummary,
};

export default {
  ensureWorkspaceQueue,
  getCurrentQuestionId,
  setCurrentQuestionId,
  navigateRelative,
  buildWorkspaceView,
  oneClickFix,
  oneClickApproveAi,
  oneClickApproveOverride,
  oneClickReject,
  oneClickSkip,
  oneClickNext,
  oneClickPrevious,
  setSelectedQuestionIds,
  getSelectedQuestionIds,
  bulkDecide,
  bulkExport,
  setFocusMode,
  toggleFocusMode,
  isFocusModeEnabled,
  applyFocusModeToDocument,
  getSessionSummary,
};
