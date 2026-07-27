/**
 * Sprint-12C — Quality Report export (JSON / CSV)
 */

import {
  loadQualityDoc,
  loadQualityHistoryDoc,
  saveQualityReportDoc,
} from './quality-storage.js';

/**
 * Build exportable report from latest snapshot / cache.
 * @param {object} [snapshot]
 */
export function buildQualityReport(snapshot = null) {
  const doc = loadQualityDoc();
  const history = loadQualityHistoryDoc();
  const aggregate = snapshot
    ? {
        averageScore: snapshot.averageScore,
        totalQuestions: snapshot.totalQuestions,
        statistics: snapshot.statistics,
        cards: snapshot.cards,
        generatedAt: snapshot.generatedAt,
      }
    : doc.aggregate;

  const rows = snapshot?.rows || Object.values(doc.byQuestion || {});

  const report = {
    schemaVersion: 'v1',
    sprint: 'Sprint-12C',
    generatedAt: new Date().toISOString(),
    aggregate,
    statistics: aggregate?.statistics || null,
    cards: aggregate?.cards || null,
    trends: {
      daily: history.daily,
      weekly: history.weekly,
      monthly: history.monthly,
    },
    questions: rows.map((r) => ({
      questionId: r.questionId,
      patternId: r.patternId,
      score: r.score,
      status: r.status,
      confidence: r.confidence,
      hasOverride: r.hasOverride,
      reviewStatus: r.reviewStatus,
      ocrError: r.flags?.ocrError,
      tableMissing: r.flags?.tableMissing,
      patternMismatch: r.flags?.patternMismatch,
      solutionOk: r.flags?.solutionOk,
    })),
  };

  saveQualityReportDoc({ report });
  return report;
}

/**
 * @param {object} report
 * @returns {string}
 */
export function exportQualityReportJson(report) {
  return JSON.stringify(report || buildQualityReport(), null, 2);
}

/**
 * @param {object} report
 * @returns {string}
 */
export function exportQualityReportCsv(report) {
  const r = report || buildQualityReport();
  const header = [
    'questionId',
    'patternId',
    'score',
    'status',
    'confidence',
    'hasOverride',
    'reviewStatus',
    'ocrError',
    'tableMissing',
    'patternMismatch',
    'solutionOk',
  ];
  const lines = [header.join(',')];
  for (const q of r.questions || []) {
    lines.push(
      [
        q.questionId,
        q.patternId,
        q.score,
        q.status,
        q.confidence ?? '',
        q.hasOverride,
        q.reviewStatus,
        q.ocrError,
        q.tableMissing,
        q.patternMismatch,
        q.solutionOk,
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

/**
 * Trigger browser download.
 * @param {string} filename
 * @param {string} content
 * @param {string} mime
 */
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
  buildQualityReport,
  exportQualityReportJson,
  exportQualityReportCsv,
  downloadTextFile,
};
