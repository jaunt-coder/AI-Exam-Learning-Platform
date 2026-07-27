/**
 * Sprint-14C — Evidence Engine (orchestrator)
 * Explainability only. Does not change recommendation ranking.
 */

import { loadRecommendations } from '../recommendation-service.js';
import { buildEvidenceForRecommendation, EVIDENCE_TYPE_COUNT } from './evidence-builder.js';
import { buildEvidenceSummary, persistEvidenceSummary } from './evidence-summary.js';
import { getCachedEvidence, setCachedEvidence } from './evidence-cache.js';
import {
  loadEvidenceHistory,
  saveEvidenceHistory,
} from './evidence-storage.js';

/**
 * Build (or reuse cached) evidence for one recommendation.
 */
export function explainRecommendation(rec, questions = []) {
  if (!rec) return null;
  const cacheKey = `rec:${rec.recommendationId || rec.questionId || rec.patternId || 'na'}`;
  const cached = getCachedEvidence(cacheKey);
  if (cached?.evidence) return cached;

  const evidence = buildEvidenceForRecommendation(rec, questions);
  const summary = buildEvidenceSummary(evidence);
  persistEvidenceSummary(evidence.evidenceId, summary, {
    recommendationId: evidence.recommendationId,
    questionId: evidence.questionId,
    patternId: evidence.patternId,
    score: evidence.score?.total,
  });

  const history = loadEvidenceHistory();
  history.byRecommendation[evidence.recommendationId || evidence.evidenceId] = {
    evidenceId: evidence.evidenceId,
    score: evidence.score,
    checklist: evidence.checklist,
    generatedAt: evidence.generatedAt,
  };
  saveEvidenceHistory(history);

  const pack = { evidence, summary };
  setCachedEvidence(cacheKey, pack);
  return pack;
}

/**
 * Attach evidence packs to recommendation list (ranking unchanged).
 */
export function attachEvidenceToRecommendations(recommendations = [], questions = []) {
  return (recommendations || []).map((rec) => {
    const pack = explainRecommendation(rec, questions);
    return {
      ...rec,
      evidence: pack?.evidence || null,
      evidenceSummary: pack?.summary || '',
    };
  });
}

/**
 * Explain active recommendations from storage (read-only consume).
 */
export function explainActiveRecommendations(questions = []) {
  const list = (loadRecommendations().recommendations || []).filter(
    (r) => r && r.status === 'ACTIVE',
  );
  return attachEvidenceToRecommendations(list, questions);
}

/**
 * Tutor context enrichment — explainability fields only.
 */
export function buildTutorEvidenceContext(questionId, patternId, questions = []) {
  const rec = {
    recommendationId: `tutor_${questionId || patternId || 'na'}`,
    questionId,
    patternId,
    reasonCode: 'PRIORITY',
    reason: 'AI Tutor 학습 맥락',
    priority: 3,
  };
  const pack = explainRecommendation(rec, questions);
  return {
    evidence: pack?.evidence || null,
    summary: pack?.summary || '',
    whyRecommended: pack?.evidence?.checklist?.map((c) => c.text) || [],
    weakPattern: pack?.evidence?.patternId || patternId || null,
    confidence: pack?.evidence?.types?.confidence?.level || null,
    reviewDue: Boolean(pack?.evidence?.types?.reviewCycle?.due),
    growthStalled: (Number(pack?.evidence?.types?.mastery?.question) || 0) < 50,
  };
}

/**
 * Student "Why Recommended?" for a question.
 */
export function explainQuestionRecommendation(questionId, questions = []) {
  const active = explainActiveRecommendations(questions);
  const hit =
    active.find((r) => r.questionId === questionId)
    || active.find((r) => {
      const pid = questions.find((q) => q.questionId === questionId)?.patternId;
      return pid && r.patternId === pid;
    });
  if (hit) return { evidence: hit.evidence, summary: hit.evidenceSummary };
  return explainRecommendation(
    {
      recommendationId: `q_${questionId}`,
      questionId,
      reasonCode: 'PRIORITY',
      reason: '현재 학습 문항',
      priority: 5,
    },
    questions,
  );
}

/**
 * Record Approve/Reject decision WITH evidence snapshot.
 * Additive API — does not modify Reviewer Logic modules.
 */
export function recordEvidenceDecision({ evidenceId, decision, note } = {}) {
  if (!evidenceId || !decision) return { ok: false, error: 'missing_fields' };
  const history = loadEvidenceHistory();
  history.decisions.push({
    evidenceId,
    decision: String(decision).toUpperCase(),
    note: note || '',
    at: new Date().toISOString(),
  });
  if (history.decisions.length > 500) {
    history.decisions = history.decisions.slice(-500);
  }
  const saved = saveEvidenceHistory(history);
  return { ok: Boolean(saved), decision: history.decisions[history.decisions.length - 1] };
}

export { EVIDENCE_TYPE_COUNT };

export default {
  explainRecommendation,
  attachEvidenceToRecommendations,
  explainActiveRecommendations,
  buildTutorEvidenceContext,
  explainQuestionRecommendation,
  recordEvidenceDecision,
  EVIDENCE_TYPE_COUNT,
};
