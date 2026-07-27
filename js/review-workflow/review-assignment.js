/**
 * Sprint-12D — Review Assignment
 */

import {
  loadWorkflowDoc,
  saveWorkflowDoc,
  WORKFLOW_STATUSES,
} from './review-state.js';
import { appendWorkflowHistory } from './review-history.js';

/**
 * @param {string} questionId
 * @param {{
 *   reviewerName?: string,
 *   estimatedMinutes?: number,
 *   status?: string,
 * }} assignment
 */
export function assignReview(questionId, assignment = {}) {
  const id = String(questionId || '');
  if (!id) return { ok: false, error: 'missing_questionId' };

  const doc = loadWorkflowDoc();
  const prev = doc.byQuestion[id] || { questionId: id, status: 'NEEDS_REVIEW' };
  let status = assignment.status || 'IN_PROGRESS';
  if (!WORKFLOW_STATUSES.includes(status)) status = 'IN_PROGRESS';

  const record = {
    ...prev,
    questionId: id,
    status,
    assignment: {
      reviewerName: assignment.reviewerName || 'local',
      reviewDate: new Date().toISOString(),
      estimatedMinutes:
        Number.isFinite(Number(assignment.estimatedMinutes))
          ? Number(assignment.estimatedMinutes)
          : 10,
      status,
    },
    updatedAt: new Date().toISOString(),
  };
  doc.byQuestion[id] = record;
  saveWorkflowDoc(doc);

  appendWorkflowHistory({
    questionId: id,
    reviewer: record.assignment.reviewerName,
    decision: 'ASSIGN',
    status,
    comment: `Assigned to ${record.assignment.reviewerName}`,
  });

  return { ok: true, record };
}

/**
 * @param {string} questionId
 */
export function getAssignment(questionId) {
  const doc = loadWorkflowDoc();
  return doc.byQuestion?.[questionId]?.assignment || null;
}

export default {
  assignReview,
  getAssignment,
};
