/**
 * Sprint-15C — Solution Quality Engine (Orchestrator)
 * Evaluate AI solution packs → missing → suggestion → reviewer loop.
 * Does NOT mutate Solution Engine results / LE / DB.
 */

import { computeSolutionQualityScore } from './solution-quality-score.js';
import { buildSolutionBlueprint } from './solution-blueprint.js';
import {
  buildImprovementSuggestion,
  buildImprovedSolutionText,
  saveImprovement,
} from './solution-improvement.js';
import { validateQualityReport } from './solution-validator.js';
import {
  persistSolutionQuality,
  persistSolutionReview,
  getQualityAggregate,
  loadSolutionQualityDoc,
} from './solution-storage.js';
import {
  renderStudentQualityCard,
  renderReviewerQualityPanel,
  renderDashboardQualityCard,
} from './solution-template.js';
import { saveOverride } from '../reviewer/override-service.js';

export const SOLUTION_QUALITY_VERSION = '15C';

/**
 * Evaluate a generated solution pack.
 * @param {{
 *   questionId?: string,
 *   resolvedQuestion?: object,
 *   question?: object,
 *   solutionResult?: object,
 *   pack?: object,
 *   studentAnswer?: *,
 *   correctAnswer?: *,
 *   patternId?: string,
 *   pattern?: object,
 * }} input
 */
export function evaluateSolutionQuality(input = {}) {
  const question = input.resolvedQuestion || input.question || {};
  const pack = input.solutionResult || input.pack || {};
  const questionId = input.questionId || question.questionId || pack.questionId || null;
  const patternId =
    input.patternId || question.patternId || pack.result?.patternId || null;
  const pattern = input.pattern || { patternId, name: pack.result?.patternName };

  const scored = computeSolutionQualityScore(pack, { ...question, patternId });
  const blueprint = buildSolutionBlueprint(
    { ...question, questionId, patternId },
    pattern,
  );
  const improvement = buildImprovementSuggestion(scored);
  saveImprovement(questionId, improvement);

  const report = {
    schemaVersion: 'v1',
    engineVersion: SOLUTION_QUALITY_VERSION,
    questionId,
    patternId,
    qualityScore: {
      approach: scored.approach,
      concept: scored.concept,
      calculation: scored.calculation,
      diagnosis: scored.diagnosis,
      examTip: scored.examTip,
      total: scored.total,
      marks: scored.marks,
    },
    missingItems: scored.missingItems,
    improvementSuggestion: improvement.suggestion,
    suggestion: improvement.suggestion,
    reviewRequired: scored.reviewRequired,
    blueprint,
    studentAnswer: input.studentAnswer ?? pack.result?.selectedAnswer ?? null,
    correctAnswer: input.correctAnswer ?? pack.result?.correctAnswer ?? null,
    solutionEngineUnchanged: true,
    generatedAt: new Date().toISOString(),
  };

  const checked = validateQualityReport(report);
  report.valid = checked.ok;
  report.errors = checked.errors;

  if (questionId) {
    persistSolutionQuality(questionId, report);
  }

  return report;
}

/**
 * Apply AI improvement draft into Override Layer (not DB).
 * Auto-approve forbidden — status stays NEEDS_VERIFY unless caller approves.
 */
export function applyAiImprovementToOverride(questionId, report, meta = {}) {
  if (!questionId || !report) {
    return { ok: false, error: 'missing_input', autoApprove: false };
  }
  const text = buildImprovedSolutionText(report.blueprint, {
    suggestion: report.improvementSuggestion || report.suggestion,
  });
  saveOverride(
    questionId,
    {
      solution: {
        detailedExplanation: text,
        aiQualityImproved: true,
        qualityScore: report.qualityScore?.total ?? null,
      },
      reviewerNote: `Sprint-15C AI 개선 초안 적용 (점수 ${report.qualityScore?.total ?? '—'})`,
    },
    {
      status: meta.status || 'NEEDS_VERIFY',
      reviewer: meta.reviewer || 'solution-quality',
      changedFields: ['solution', 'reviewerNote'],
    },
  );
  persistSolutionReview(questionId, {
    action: 'APPLY_AI_IMPROVEMENT',
    status: meta.status || 'NEEDS_VERIFY',
    autoApprove: false,
    qualityScore: report.qualityScore?.total ?? null,
  });
  return { ok: true, autoApprove: false, action: 'APPLY_AI_IMPROVEMENT' };
}

/**
 * Reviewer approve — Override only, never auto without explicit call.
 */
export function approveSolutionQuality(questionId, report, meta = {}) {
  if (!questionId) return { ok: false, error: 'missing_questionId', autoApprove: false };
  const text = buildImprovedSolutionText(report?.blueprint, {
    suggestion: report?.improvementSuggestion || report?.suggestion,
  });
  saveOverride(
    questionId,
    {
      solution: {
        detailedExplanation: text,
        aiQualityApproved: true,
        qualityScore: report?.qualityScore?.total ?? null,
      },
      reviewerNote: meta.note || 'Sprint-15C Solution Quality 승인',
    },
    {
      status: 'APPROVED',
      reviewer: meta.reviewer || 'reviewer',
      changedFields: ['solution', 'reviewerNote', 'reviewStatus'],
    },
  );
  persistSolutionReview(questionId, {
    action: 'APPROVE',
    status: 'APPROVED',
    autoApprove: false,
    qualityScore: report?.qualityScore?.total ?? null,
  });
  return { ok: true, autoApprove: false, action: 'APPROVE' };
}

export function getDashboardSolutionQuality() {
  const aggregate = getQualityAggregate();
  const doc = loadSolutionQualityDoc();
  return {
    aggregate,
    count: doc.aggregate?.count || 0,
    average: doc.aggregate?.average || 0,
    needsImprove: doc.aggregate?.needsImprove || [],
  };
}

export {
  renderStudentQualityCard,
  renderReviewerQualityPanel,
  renderDashboardQualityCard,
  computeSolutionQualityScore,
  buildSolutionBlueprint,
  buildImprovementSuggestion,
};

export default {
  SOLUTION_QUALITY_VERSION,
  evaluateSolutionQuality,
  applyAiImprovementToOverride,
  approveSolutionQuality,
  getDashboardSolutionQuality,
  renderStudentQualityCard,
  renderReviewerQualityPanel,
  renderDashboardQualityCard,
};
