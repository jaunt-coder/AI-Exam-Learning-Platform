/**
 * Sprint-12D — Human Review Workflow Service
 * Orchestrates Queue + Assignment + Decision on top of 12A/12B/12C.
 */

import { getOverride } from '../reviewer/override-service.js';
import { resolveQuestion } from '../reviewer/override-service.js';
import { getSuggestionPack } from '../recovery/ai-recovery-service.js';
import { buildChangeDiff } from '../recovery/diff-engine.js';
import {
  loadQualityDoc,
  loadQualityHistoryDoc,
} from '../quality/quality-storage.js';
import {
  buildReviewQueueFromQuality,
  getReviewQueue,
  updateQueueItemStatus,
} from './review-queue.js';
import { assignReview, getAssignment } from './review-assignment.js';
import {
  applyReviewDecision,
  getDecisions,
  DECISION_TYPES,
} from './review-decision.js';
import { getWorkflowHistory } from './review-history.js';
import {
  loadWorkflowDoc,
  WORKFLOW_STATUSES,
} from './review-state.js';
import {
  buildReviewReport,
  exportReviewReportCsv,
  exportReviewReportJson,
  downloadTextFile,
} from './review-export.js';

/**
 * Sync queue from cached 12C quality scores (or provided rows).
 * @param {object[]} [qualityRows]
 */
export function syncReviewQueueFromQuality(qualityRows) {
  let rows = qualityRows;
  if (!Array.isArray(rows) || !rows.length) {
    const doc = loadQualityDoc();
    rows = Object.values(doc.byQuestion || {});
  }
  /* attach year if present on cached rows */
  return buildReviewQueueFromQuality(rows, { replace: false, limit: 120 });
}

/**
 * Build reviewer workspace payload for one question.
 * @param {object} originalQuestion — DB question (read-only)
 */
export function buildReviewWorkspace(originalQuestion = {}) {
  const qid = originalQuestion.questionId || originalQuestion.id;
  const override = getOverride(qid);
  const resolved = resolveQuestion(originalQuestion);
  const suggestion = getSuggestionPack(qid);
  const quality = loadQualityDoc().byQuestion?.[qid] || null;
  const workflow = loadWorkflowDoc().byQuestion?.[qid] || null;
  const assignment = getAssignment(qid);
  const decisions = getDecisions(qid);
  const history = getWorkflowHistory(qid);

  const diffs = (suggestion?.changes || []).map((c) =>
    buildChangeDiff(c, originalQuestion),
  );

  return {
    questionId: qid,
    year: originalQuestion.year || originalQuestion.source?.year || null,
    patternId: originalQuestion.patternId || null,
    qualityScore: quality?.score ?? workflow?.qualityScore ?? null,
    qualityStatus: quality?.status ?? null,
    workflowStatus: workflow?.status || 'NEW',
    original: {
      question: originalQuestion.question || originalQuestion.originalQuestion,
      table: originalQuestion.table || null,
      choices: originalQuestion.choices || [],
      patternId: originalQuestion.patternId,
    },
    override: override?.override || null,
    resolved,
    aiSuggestion: suggestion,
    diffs,
    assignment,
    decisions,
    history,
  };
}

/**
 * High-level actions for UI.
 */
export function startReview(questionId, reviewerName = 'local') {
  updateQueueItemStatus(questionId, 'IN_PROGRESS');
  return assignReview(questionId, {
    reviewerName,
    status: 'IN_PROGRESS',
    estimatedMinutes: 10,
  });
}

export function decide(questionId, decision, meta = {}) {
  const result = applyReviewDecision(questionId, decision, meta);
  if (result.ok) {
    const status = result.decision?.workflowStatus || 'NEEDS_REVIEW';
    updateQueueItemStatus(questionId, status);
  }
  return result;
}

export function getWorkflowSummary() {
  const queue = getReviewQueue();
  const workflow = loadWorkflowDoc();
  const byStatus = {};
  for (const s of WORKFLOW_STATUSES) byStatus[s] = 0;
  for (const item of queue) {
    const st = item.status || 'NEEDS_REVIEW';
    byStatus[st] = (byStatus[st] || 0) + 1;
  }
  return {
    queueCount: queue.length,
    byStatus,
    stats: workflow.stats || {},
    decisionTypes: DECISION_TYPES,
    storageKeys: [
      'learning.review-workflow.v1',
      'learning.review-queue.v1',
      'learning.review-history.v1',
      'learning.review-decision.v1',
    ],
  };
}

export function exportWorkflow(format = 'json') {
  const report = buildReviewReport();
  if (format === 'csv') {
    downloadTextFile(
      'review-workflow-report.csv',
      exportReviewReportCsv(report),
      'text/csv',
    );
  } else {
    downloadTextFile(
      'review-workflow-report.json',
      exportReviewReportJson(report),
      'application/json',
    );
  }
  return report;
}

export {
  getReviewQueue,
  syncReviewQueueFromQuality as rebuildQueue,
  WORKFLOW_STATUSES,
  DECISION_TYPES,
};

export default {
  syncReviewQueueFromQuality,
  buildReviewWorkspace,
  startReview,
  decide,
  getWorkflowSummary,
  exportWorkflow,
  getReviewQueue,
  WORKFLOW_STATUSES,
  DECISION_TYPES,
};
