/**
 * Sprint-12E — Bulk Review actions on selected queue items
 */

import { decide } from '../review-workflow/workflow-service.js';
import {
  buildReviewReport,
  exportReviewReportCsv,
  exportReviewReportJson,
  downloadTextFile,
} from '../review-workflow/review-export.js';
import { recordSessionAction } from './review-session.js';
import {
  loadWorkspaceDoc,
  saveWorkspaceDoc,
} from './workspace-storage.js';

/**
 * @param {string[]} ids
 */
export function setSelectedQuestionIds(ids = []) {
  const doc = loadWorkspaceDoc();
  doc.selectedIds = [...new Set((ids || []).map(String))].slice(0, 50);
  saveWorkspaceDoc(doc);
  return doc.selectedIds;
}

export function getSelectedQuestionIds() {
  return loadWorkspaceDoc().selectedIds.slice();
}

/**
 * @param {'APPROVE_AI'|'REJECT_AI'|'SKIP'|'KEEP_ORIGINAL'} decision
 * @param {{ reviewer?: string, ids?: string[] }} [meta]
 */
export function bulkDecide(decision, meta = {}) {
  const ids = meta.ids || getSelectedQuestionIds();
  const results = [];
  for (const id of ids.slice(0, 10)) {
    const r = decide(id, decision, {
      reviewer: meta.reviewer || 'local',
      comment: `Bulk ${decision}`,
    });
    results.push({ questionId: id, ...r });
    if (r.ok) {
      if (decision.startsWith('APPROVE')) recordSessionAction('approved');
      else if (decision.startsWith('REJECT') || decision === 'KEEP_ORIGINAL') {
        recordSessionAction('rejected');
      } else if (decision === 'SKIP') recordSessionAction('skipped');
    }
  }
  return { ok: true, count: results.length, results };
}

export function bulkExport(format = 'json') {
  const report = buildReviewReport();
  const selected = new Set(getSelectedQuestionIds());
  if (selected.size) {
    report.queue = (report.queue || []).filter((i) =>
      selected.has(i.questionId),
    );
  }
  if (format === 'csv') {
    downloadTextFile(
      'bulk-review.csv',
      exportReviewReportCsv(report),
      'text/csv',
    );
  } else if (format === 'md' || format === 'markdown') {
    const lines = [
      '# Bulk Review Export',
      '',
      `Generated: ${report.generatedAt}`,
      '',
      ...(report.queue || []).map(
        (i) =>
          `- **${i.questionId}** · ${i.status} · Q${i.qualityScore} · ${(i.reasons || []).join(', ')}`,
      ),
    ];
    downloadTextFile('bulk-review.md', `${lines.join('\n')}\n`, 'text/markdown');
  } else {
    downloadTextFile(
      'bulk-review.json',
      exportReviewReportJson(report),
      'application/json',
    );
  }
  return report;
}

export default {
  setSelectedQuestionIds,
  getSelectedQuestionIds,
  bulkDecide,
  bulkExport,
};
