/**
 * Sprint-12D — Review Export (CSV / JSON / Report)
 */

import { getReviewQueue } from './review-queue.js';
import {
  loadWorkflowDoc,
  loadDecisionDoc,
  loadWorkflowHistoryDoc,
} from './review-state.js';

/**
 * Build review report payload.
 */
export function buildReviewReport() {
  const queue = getReviewQueue();
  const workflow = loadWorkflowDoc();
  const decisions = loadDecisionDoc();
  const history = loadWorkflowHistoryDoc();

  return {
    schemaVersion: 'v1',
    sprint: 'Sprint-12D',
    generatedAt: new Date().toISOString(),
    stats: workflow.stats || {},
    queue,
    workflowByQuestion: workflow.byQuestion || {},
    decisionsByQuestion: decisions.byQuestion || {},
    history: history.events || [],
  };
}

export function exportReviewReportJson(report) {
  return JSON.stringify(report || buildReviewReport(), null, 2);
}

export function exportReviewReportCsv(report) {
  const r = report || buildReviewReport();
  const header = [
    'questionId',
    'patternId',
    'year',
    'qualityScore',
    'priority',
    'status',
    'reasons',
    'confidence',
  ];
  const lines = [header.join(',')];
  for (const item of r.queue || []) {
    lines.push(
      [
        item.questionId,
        item.patternId || '',
        item.year || '',
        item.qualityScore ?? '',
        item.priority ?? '',
        item.status || '',
        (item.reasons || []).join('|'),
        item.confidence ?? '',
      ]
        .map(csvEscape)
        .join(','),
    );
  }
  return `${lines.join('\n')}\n`;
}

function csvEscape(value) {
  const s = String(value ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function downloadTextFile(filename, content, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default {
  buildReviewReport,
  exportReviewReportJson,
  exportReviewReportCsv,
  downloadTextFile,
};
