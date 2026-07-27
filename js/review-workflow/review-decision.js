/**
 * Sprint-12D — Review Decision Engine
 * Decisions apply Override Layer only (12A APIs). Never touches Question DB.
 */

import { saveOverride, clearOverride, getOverride } from '../reviewer/override-service.js';
import { getSuggestionPack } from '../recovery/ai-recovery-service.js';
import { approveAll, rejectChanges } from '../recovery/approval-engine.js';
import {
  loadDecisionDoc,
  saveDecisionDoc,
  loadWorkflowDoc,
  saveWorkflowDoc,
  WORKFLOW_STATUSES,
} from './review-state.js';
import { appendWorkflowHistory } from './review-history.js';

export const DECISION_TYPES = Object.freeze([
  'APPROVE_OVERRIDE',
  'REJECT_OVERRIDE',
  'APPROVE_AI',
  'REJECT_AI',
  'KEEP_ORIGINAL',
  'NEED_MANUAL_FIX',
  'SKIP',
]);

/**
 * @param {string} questionId
 * @param {string} decision
 * @param {{
 *   reviewer?: string,
 *   comment?: string,
 *   originalQuestion?: object,
 * }} [meta]
 */
export function applyReviewDecision(questionId, decision, meta = {}) {
  const id = String(questionId || '');
  const type = String(decision || '').toUpperCase();
  if (!id) return { ok: false, error: 'missing_questionId' };
  if (!DECISION_TYPES.includes(type)) {
    return { ok: false, error: 'invalid_decision' };
  }

  let workflowStatus = 'WAITING_HUMAN';
  let result = { ok: true };

  if (type === 'APPROVE_OVERRIDE') {
    const ov = getOverride(id);
    if (!ov?.override) {
      return { ok: false, error: 'no_override' };
    }
    result = saveOverride(
      id,
      {
        ...ov.override,
        reviewed: true,
        reviewer: meta.reviewer || 'local',
      },
      {
        status: 'APPROVED',
        reviewer: meta.reviewer || 'local',
        changedFields: ['workflow_approve_override'],
      },
    );
    workflowStatus = 'APPROVED';
  } else if (type === 'REJECT_OVERRIDE') {
    result = clearOverride(id);
    workflowStatus = 'REJECTED';
  } else if (type === 'APPROVE_AI') {
    const pack = getSuggestionPack(id);
    if (!pack?.changes?.length) {
      return { ok: false, error: 'no_ai_suggestion' };
    }
    result = approveAll(id, pack, pack.confidence);
    workflowStatus = 'APPROVED';
  } else if (type === 'REJECT_AI') {
    result = rejectChanges({
      questionId: id,
      confidence: getSuggestionPack(id)?.confidence,
      reviewer: meta.reviewer || 'local',
    });
    workflowStatus = 'REJECTED';
  } else if (type === 'KEEP_ORIGINAL') {
    clearOverride(id);
    rejectChanges({
      questionId: id,
      reviewer: meta.reviewer || 'local',
    });
    workflowStatus = 'COMPLETED';
  } else if (type === 'NEED_MANUAL_FIX') {
    workflowStatus = 'WAITING_HUMAN';
    const wdoc = loadWorkflowDoc();
    const prev = wdoc.byQuestion[id] || { questionId: id };
    wdoc.byQuestion[id] = {
      ...prev,
      status: 'WAITING_HUMAN',
      needsManualFix: true,
      updatedAt: new Date().toISOString(),
    };
    saveWorkflowDoc(wdoc);
  } else if (type === 'SKIP') {
    workflowStatus = 'SKIPPED';
  }

  if (!WORKFLOW_STATUSES.includes(workflowStatus)) {
    workflowStatus = 'NEEDS_REVIEW';
  }

  const decisionDoc = loadDecisionDoc();
  const record = {
    questionId: id,
    decision: type,
    reviewer: meta.reviewer || 'local',
    comment: meta.comment || '',
    timestamp: new Date().toISOString(),
    workflowStatus,
  };
  const prevList = Array.isArray(decisionDoc.byQuestion[id])
    ? decisionDoc.byQuestion[id]
    : [];
  decisionDoc.byQuestion[id] = [...prevList, record];
  saveDecisionDoc(decisionDoc);

  const wdoc = loadWorkflowDoc();
  const prev = wdoc.byQuestion[id] || { questionId: id };
  wdoc.byQuestion[id] = {
    ...prev,
    questionId: id,
    status: workflowStatus,
    lastDecision: type,
    updatedAt: new Date().toISOString(),
  };
  if (workflowStatus === 'APPROVED' || workflowStatus === 'COMPLETED') {
    wdoc.stats = {
      ...(wdoc.stats || {}),
      approved: (wdoc.stats?.approved || 0) + (workflowStatus === 'APPROVED' ? 1 : 0),
      completed: (wdoc.stats?.completed || 0) + 1,
    };
  }
  if (workflowStatus === 'REJECTED') {
    wdoc.stats = {
      ...(wdoc.stats || {}),
      rejected: (wdoc.stats?.rejected || 0) + 1,
    };
  }
  if (workflowStatus === 'SKIPPED') {
    wdoc.stats = {
      ...(wdoc.stats || {}),
      skipped: (wdoc.stats?.skipped || 0) + 1,
    };
  }
  saveWorkflowDoc(wdoc);

  appendWorkflowHistory({
    questionId: id,
    reviewer: meta.reviewer || 'local',
    decision: type,
    comment: meta.comment || '',
    status: workflowStatus,
  });

  return { ok: true, decision: record, result };
}

/**
 * @param {string} questionId
 */
export function getDecisions(questionId) {
  const doc = loadDecisionDoc();
  return Array.isArray(doc.byQuestion?.[questionId])
    ? doc.byQuestion[questionId]
    : [];
}

export default {
  DECISION_TYPES,
  applyReviewDecision,
  getDecisions,
};
