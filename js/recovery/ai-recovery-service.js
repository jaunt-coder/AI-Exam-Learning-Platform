/**
 * Sprint-12B — AI Recovery Service
 * Reviewer Mode 위 Suggestion Layer. Question DB 미수정.
 */

import { getOverride } from '../reviewer/override-service.js';
import { buildPdfUrl } from '../source-viewer.js';
import { generateRecoverySuggestions } from './suggestion-engine.js';
import { computeConfidence } from './confidence-engine.js';
import { buildChangeDiff } from './diff-engine.js';
import {
  approveChanges,
  approveByField,
  approveAll,
  rejectChanges,
  skipChanges,
  getApprovalSummary,
} from './approval-engine.js';
import {
  loadSuggestionDoc,
  saveSuggestionDoc,
  loadConfidenceDoc,
  saveConfidenceDoc,
  loadRecoveryDoc,
  saveRecoveryDoc,
  appendRecoveryHistory,
  exportSuggestionsJson,
  importSuggestionsJson,
} from './recovery-cache.js';
import {
  scoreQuestion,
  getCachedQualityScore,
} from '../quality/quality-engine.js';

/**
 * Build PDF compare metadata (open link only — no DB write).
 * @param {object} question
 */
export function buildPdfCompareMeta(question = {}) {
  const source = question.source || {};
  const pdfPath = source.sourceFile
    ? String(source.sourceFile).replace(/\\/g, '/')
    : source.year
      ? `source/original-exams/${source.year}.pdf`
      : null;
  const page = Number(source.page) || null;
  const pdfUrl = pdfPath ? buildPdfUrl({ pdf: pdfPath, page }) : null;
  return {
    page,
    questionNumber: source.questionNumber ?? null,
    year: source.year || question.year || null,
    sourceFile: pdfPath,
    pdfUrl,
    available: Boolean(pdfUrl),
  };
}

/**
 * Run AI Recovery and cache suggestion pack.
 * @param {object} question — original DB question (read-only)
 */
export function runAiRecovery(question = {}) {
  const qid = question.questionId || question.id;
  const override = getOverride(qid);
  const pdfMeta = buildPdfCompareMeta(question);
  const generated = generateRecoverySuggestions(question, {
    override,
    pdfMeta,
  });
  const conf = computeConfidence(generated.changes, {
    detections: generated.detections,
  });

  /* Sprint-12C — Quality Score 참고 (Coach 파일 미수정) */
  const quality =
    getCachedQualityScore(qid) || scoreQuestion(question, {});

  const pack = {
    questionId: generated.questionId,
    confidence: conf.confidence,
    level: conf.level,
    changes: conf.changes,
    detections: generated.detections,
    explains: conf.changes.map((c) => c.explain).filter(Boolean),
    diffs: conf.changes.map((c) => buildChangeDiff(c, question)),
    pdfMeta,
    qualityScore: quality?.score ?? null,
    qualityStatus: quality?.status ?? null,
    generatedAt: generated.generatedAt,
    engine: generated.engine,
    status: 'PENDING',
  };

  const sDoc = loadSuggestionDoc();
  sDoc.byQuestion[pack.questionId] = pack;
  saveSuggestionDoc(sDoc);

  const cDoc = loadConfidenceDoc();
  cDoc.byQuestion[pack.questionId] = {
    questionId: pack.questionId,
    confidence: pack.confidence,
    level: pack.level,
    updatedAt: new Date().toISOString(),
  };
  const scores = Object.values(cDoc.byQuestion).map((r) => Number(r.confidence) || 0);
  cDoc.aggregate = {
    averageConfidence:
      scores.length === 0
        ? 0
        : Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10000) /
          10000,
    totalChecked: scores.length,
  };
  saveConfidenceDoc(cDoc);

  const rDoc = loadRecoveryDoc();
  if (!rDoc.byQuestion[pack.questionId]) {
    rDoc.stats.pending = (rDoc.stats.pending || 0) + 1;
  }
  rDoc.byQuestion[pack.questionId] = {
    ...(rDoc.byQuestion[pack.questionId] || {}),
    status: 'PENDING',
    updatedAt: new Date().toISOString(),
    confidence: pack.confidence,
  };
  saveRecoveryDoc(rDoc);

  appendRecoveryHistory('suggestion', {
    questionId: pack.questionId,
    confidence: pack.confidence,
    changeCount: pack.changes.length,
  });
  appendRecoveryHistory('confidence', {
    questionId: pack.questionId,
    confidence: pack.confidence,
    level: pack.level,
  });

  return pack;
}

export function getSuggestionPack(questionId) {
  return loadSuggestionDoc().byQuestion?.[questionId] || null;
}

/**
 * Dashboard Recovery Summary card.
 */
export function buildRecoveryDashboardCard() {
  const sDoc = loadSuggestionDoc();
  const cDoc = loadConfidenceDoc();
  const approval = getApprovalSummary();
  const packs = Object.values(sDoc.byQuestion || {});
  const today = new Date().toISOString().slice(0, 10);
  const todays = packs.filter((p) =>
    String(p.generatedAt || '').startsWith(today),
  );

  return {
    enabled: true,
    connected: true,
    todaysSuggestions: todays.length,
    pending: approval.pending,
    approved: approval.approved,
    rejected: approval.rejected,
    averageConfidence: cDoc.aggregate?.averageConfidence || 0,
    totalPacks: packs.length,
    storageKeys: [
      'learning.recovery.v1',
      'learning.suggestion.v1',
      'learning.confidence.v1',
    ],
  };
}

export {
  approveChanges,
  approveByField,
  approveAll,
  rejectChanges,
  skipChanges,
  exportSuggestionsJson,
  importSuggestionsJson,
};

export default {
  runAiRecovery,
  getSuggestionPack,
  buildPdfCompareMeta,
  buildRecoveryDashboardCard,
  approveChanges,
  approveByField,
  approveAll,
  rejectChanges,
  skipChanges,
  exportSuggestionsJson,
  importSuggestionsJson,
};
