/**
 * Sprint-12C — Data Quality Engine
 * Aggregates scores, filters, auto-priority, statistics, trends.
 */

import {
  computeQualityScore,
  resolveQualityStatus,
  LOW_QUALITY_THRESHOLD,
} from './quality-score.js';
import { analyzeQuestionQuality } from './quality-analyzer.js';
import {
  loadQualityDoc,
  saveQualityDoc,
  loadQualityHistoryDoc,
  saveQualityHistoryDoc,
} from './quality-storage.js';
import { loadRecoveryDoc } from '../recovery/recovery-cache.js';
import {
  loadReviewDoc,
  loadOverridesDoc,
} from '../reviewer/review-storage.js';

/**
 * Load integrity mismatch ids (optional fetch).
 * @returns {Promise<Set<string>>}
 */
export async function loadIntegrityMismatchIds() {
  try {
    const res = await fetch('data/question-integrity-report.json', {
      cache: 'no-store',
    });
    if (!res.ok) return new Set();
    const report = await res.json();
    const ids = new Set();
    for (const row of [
      ...(report.highRiskQuestions || []),
      ...(report.reviewRequired || []),
    ]) {
      if (row?.questionId) ids.add(row.questionId);
      if (Array.isArray(row?.flags) && row.flags.includes('PATTERN_MISMATCH')) {
        ids.add(row.questionId);
      }
    }
    return ids;
  } catch (_err) {
    return new Set();
  }
}

/**
 * Score a single question.
 * @param {object} question
 * @param {{ mismatchIds?: Set<string> }} [ctx]
 */
export function scoreQuestion(question, ctx = {}) {
  const flags = analyzeQuestionQuality(question, ctx);
  const score = computeQualityScore(flags);
  const status = resolveQualityStatus(flags);
  return {
    questionId: flags.questionId,
    patternId: flags.patternId,
    score,
    status,
    confidence: flags.confidence,
    hasOverride: flags.hasOverride,
    reviewStatus: flags.reviewStatus,
    recoveryStatus: flags.recoveryStatus,
    flags: {
      ocrError: flags.ocrError,
      tableMissing: flags.tableMissing,
      patternMismatch: flags.patternMismatch,
      solutionOk: flags.solutionOk,
      aiSuggestionPending: flags.aiSuggestionPending,
      broken: flags.broken,
      verifyRequired: flags.verifyRequired,
    },
    scoredAt: new Date().toISOString(),
  };
}

/**
 * Build full quality snapshot for a question list.
 * @param {object[]} questions
 * @param {{ mismatchIds?: Set<string>, persist?: boolean }} [options]
 */
export function buildQualitySnapshot(questions = [], options = {}) {
  const list = Array.isArray(questions) ? questions : [];
  const mismatchIds = options.mismatchIds || new Set();
  const rows = list.map((q) => scoreQuestion(q, { mismatchIds }));

  const average =
    rows.length === 0
      ? 0
      : Math.round(
          (rows.reduce((a, r) => a + r.score, 0) / rows.length) * 10,
        ) / 10;

  const stats = buildStatistics(rows, list.length);
  const cards = buildQualityCards(rows);
  const priority = buildAutoPriority(rows);
  const filters = {
    ocrError: rows.filter((r) => r.flags.ocrError),
    tableMissing: rows.filter((r) => r.flags.tableMissing),
    patternMismatch: rows.filter((r) => r.flags.patternMismatch),
    noSolution: rows.filter((r) => !r.flags.solutionOk),
    pendingReview: rows.filter(
      (r) =>
        r.status === 'VERIFY_REQUIRED' ||
        r.reviewStatus === 'NOT_REVIEWED' ||
        r.reviewStatus === 'NEEDS_VERIFY',
    ),
    aiSuggestion: rows.filter((r) => r.flags.aiSuggestionPending),
    lowQuality: rows.filter((r) => r.score <= LOW_QUALITY_THRESHOLD),
  };

  const snapshot = {
    schemaVersion: 'v1',
    sprint: 'Sprint-12C',
    generatedAt: new Date().toISOString(),
    totalQuestions: list.length,
    averageScore: average,
    rows,
    cards,
    statistics: stats,
    priority,
    filterCounts: Object.fromEntries(
      Object.entries(filters).map(([k, v]) => [k, v.length]),
    ),
  };

  if (options.persist !== false) {
    persistSnapshot(snapshot);
  }
  return snapshot;
}

export function buildQualityCards(rows = []) {
  const recovery = loadRecoveryDoc();
  const reviewDoc = loadReviewDoc();
  const overrides = loadOverridesDoc();

  const today = new Date().toISOString().slice(0, 10);
  const reviewRows = Object.values(reviewDoc.byQuestion || {});
  const todayReviews = reviewRows.filter((r) =>
    String(r.updatedAt || '').startsWith(today),
  );
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const weekReviews = reviewRows.filter((r) => {
    const t = Date.parse(r.updatedAt || '');
    return Number.isFinite(t) && t >= weekAgo;
  });

  return {
    overall: {
      averageScore:
        rows.length === 0
          ? 0
          : Math.round(
              (rows.reduce((a, r) => a + r.score, 0) / rows.length) * 10,
            ) / 10,
    },
    ocr: { errorCount: rows.filter((r) => r.flags.ocrError).length },
    table: { missingCount: rows.filter((r) => r.flags.tableMissing).length },
    pattern: {
      mismatchCount: rows.filter((r) => r.flags.patternMismatch).length,
    },
    solution: {
      missingCount: rows.filter((r) => !r.flags.solutionOk).length,
    },
    override: {
      appliedCount: Object.keys(overrides.overrides || {}).length,
    },
    aiRecovery: {
      pending: recovery.stats?.pending || 0,
      approved: recovery.stats?.approved || 0,
      rejected: recovery.stats?.rejected || 0,
    },
    reviewer: {
      today: todayReviews.length,
      week: weekReviews.length,
      total: reviewRows.length,
    },
  };
}

export function buildStatistics(rows = [], totalQuestions = 0) {
  const total = totalQuestions || rows.length;
  const reviewed = rows.filter((r) =>
    ['REVIEWED', 'APPROVED'].includes(r.status),
  ).length;
  const withOverride = rows.filter((r) => r.hasOverride).length;
  const tableIssues = rows.filter((r) => r.flags.tableMissing).length;
  const tableOk = Math.max(0, total - tableIssues);
  const ocrIssues = rows.filter((r) => r.flags.ocrError).length;
  const ocrOk = Math.max(0, total - ocrIssues);
  const patternOk = rows.filter((r) => !r.flags.patternMismatch).length;
  const solutionOk = rows.filter((r) => r.flags.solutionOk).length;
  const recovery = loadRecoveryDoc();
  const approved = recovery.stats?.approved || 0;
  const pending = recovery.stats?.pending || 0;
  const aiTotal = approved + pending + (recovery.stats?.rejected || 0);

  const pct = (n, d) => (d ? Math.round((n / d) * 1000) / 10 : 0);

  return {
    totalQuestions: total,
    reviewRate: pct(reviewed, total),
    tableRestoreRate: pct(tableOk, total),
    ocrCompletionRate: pct(ocrOk, total),
    overrideApplyRate: pct(withOverride, total),
    aiApprovalRate: pct(approved, aiTotal || 1),
    patternAccuracy: pct(patternOk, total),
    solutionWriteRate: pct(solutionOk, total),
  };
}

/**
 * Top 10 lowest quality for Today Review.
 * @param {object[]} rows
 */
export function buildAutoPriority(rows = []) {
  const sorted = rows
    .slice()
    .sort((a, b) => a.score - b.score || String(a.questionId).localeCompare(String(b.questionId)));
  return {
    top10: sorted.slice(0, 10),
    todayReview: sorted
      .filter(
        (r) =>
          r.score <= LOW_QUALITY_THRESHOLD ||
          r.status === 'VERIFY_REQUIRED' ||
          r.flags.aiSuggestionPending,
      )
      .slice(0, 10),
  };
}

/**
 * Filter rows by named filter.
 * @param {object[]} rows
 * @param {string} filterId
 */
export function filterQualityRows(rows = [], filterId = '') {
  const id = String(filterId || '');
  if (!id || id === 'all') return rows.slice();
  if (id === 'ocr') return rows.filter((r) => r.flags.ocrError);
  if (id === 'table') return rows.filter((r) => r.flags.tableMissing);
  if (id === 'pattern') return rows.filter((r) => r.flags.patternMismatch);
  if (id === 'solution') return rows.filter((r) => !r.flags.solutionOk);
  if (id === 'pending') {
    return rows.filter(
      (r) =>
        r.status === 'VERIFY_REQUIRED' ||
        r.reviewStatus === 'NEEDS_VERIFY' ||
        r.reviewStatus === 'NOT_REVIEWED',
    );
  }
  if (id === 'ai') return rows.filter((r) => r.flags.aiSuggestionPending);
  if (id === 'low') return rows.filter((r) => r.score <= LOW_QUALITY_THRESHOLD);
  return rows.slice();
}

function persistSnapshot(snapshot) {
  const doc = loadQualityDoc();
  const byQuestion = {};
  for (const row of snapshot.rows) {
    byQuestion[row.questionId] = row;
  }
  doc.byQuestion = byQuestion;
  doc.aggregate = {
    averageScore: snapshot.averageScore,
    totalQuestions: snapshot.totalQuestions,
    statistics: snapshot.statistics,
    cards: snapshot.cards,
    generatedAt: snapshot.generatedAt,
  };
  saveQualityDoc(doc);

  const hist = loadQualityHistoryDoc();
  const day = snapshot.generatedAt.slice(0, 10);
  const point = {
    date: day,
    averageScore: snapshot.averageScore,
    reviewRate: snapshot.statistics.reviewRate,
    ocrCompletionRate: snapshot.statistics.ocrCompletionRate,
  };
  hist.daily = upsertTrend(hist.daily, 'date', point, 90);
  hist.weekly = upsertTrend(
    hist.weekly,
    'date',
    { ...point, date: weekKey(day) },
    52,
  );
  hist.monthly = upsertTrend(
    hist.monthly,
    'date',
    { ...point, date: day.slice(0, 7) },
    36,
  );
  saveQualityHistoryDoc(hist);
}

function upsertTrend(list, key, point, max) {
  const arr = Array.isArray(list) ? list.slice() : [];
  const idx = arr.findIndex((p) => p[key] === point[key]);
  if (idx >= 0) arr[idx] = point;
  else arr.push(point);
  return arr.slice(-max);
}

function weekKey(isoDay) {
  const d = new Date(`${isoDay}T00:00:00Z`);
  const onejan = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - onejan) / 86400000 + onejan.getUTCDay() + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/**
 * Read cached score for tutors / recovery (no recompute).
 * @param {string} questionId
 */
export function getCachedQualityScore(questionId) {
  if (!questionId) return null;
  const doc = loadQualityDoc();
  return doc.byQuestion?.[questionId] || null;
}

export default {
  loadIntegrityMismatchIds,
  scoreQuestion,
  buildQualitySnapshot,
  buildQualityCards,
  buildStatistics,
  buildAutoPriority,
  filterQualityRows,
  getCachedQualityScore,
  LOW_QUALITY_THRESHOLD,
};
