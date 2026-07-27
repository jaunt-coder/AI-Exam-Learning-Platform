/**
 * Sprint-15A+ — Learning Prescription
 * Connects diagnosis → Learning Engine recommendation context (read-only consume).
 * Does NOT change Learning Engine formulas.
 */

import { loadRecommendations } from '../recommendation-service.js';
import { PATTERN_NAMES } from '../ai-tutor-content/pattern-profiles.js';

/**
 * Build automatic learning prescription from diagnosis + existing recommendations.
 * @param {object} question
 * @param {object|null} diagnosis
 * @param {object[]} [questions]
 * @param {object|null} [pattern]
 */
export function buildLearningPrescription(
  question = {},
  diagnosis = null,
  questions = [],
  pattern = null,
) {
  const patternId = question.patternId || pattern?.patternId || '';
  const patternName = pattern?.name || PATTERN_NAMES[patternId] || patternId;
  const primaryCode = diagnosis?.primary?.code || 'CONCEPT_GAP';
  const isCorrect = Boolean(diagnosis?.isCorrect);

  const items = [];

  if (!isCorrect) {
    if (primaryCode === 'FIFO_ERROR' || patternId === 'ACC_INV_006') {
      items.push({
        type: 'QUESTION_SET',
        label: 'FIFO 문제',
        count: 3,
        reason: 'FIFO 적용 오류 보완',
        patternId: 'ACC_INV_006',
      });
    }
    if (primaryCode === 'AVG_COST_ERROR' || patternId === 'ACC_INV_006') {
      items.push({
        type: 'QUESTION_SET',
        label: '평균단가 문제',
        count: 2,
        reason: '평균단가 계산 강화',
        patternId: 'ACC_INV_006',
      });
    }
    if (primaryCode === 'CALC_ERROR') {
      items.push({
        type: 'QUESTION_SET',
        label: '계산형 연습',
        count: 3,
        reason: '계산 실수 감소',
        patternId,
      });
    }
    if (primaryCode === 'CONDITION_MISS') {
      items.push({
        type: 'QUESTION_SET',
        label: '조건 분류 연습',
        count: 2,
        reason: '조건 누락 보완',
        patternId,
      });
    }

    items.push({
      type: 'PATTERN',
      label: `Pattern ${patternId}`,
      count: 1,
      reason: `${patternName} 집중 복습`,
      patternId,
    });
  } else {
    items.push({
      type: 'PATTERN',
      label: `Pattern ${patternId}`,
      count: 1,
      reason: '정답 — 변형 문제로 유지 학습',
      patternId,
    });
  }

  /* Attach active Learning Engine / 10G recommendations (unchanged ranking) */
  const recoDoc = loadRecommendations();
  const active = (recoDoc.recommendations || []).filter((r) => r && r.status === 'ACTIVE');
  const linked = active
    .filter((r) => !patternId || r.patternId === patternId || !r.patternId)
    .slice(0, 5)
    .map((r) => ({
      type: 'RECOMMENDATION',
      label: r.questionId || r.patternId || r.recommendationId,
      count: 1,
      reason: r.reason || r.reasonCode || 'Learning Engine 추천',
      recommendationId: r.recommendationId,
      questionId: r.questionId || null,
      patternId: r.patternId || patternId,
      priority: r.priority,
    }));

  /* Suggest related questions from same pattern in DB (read-only) */
  const samePattern = (questions || [])
    .filter((q) => q.patternId === patternId && q.questionId !== question.questionId)
    .slice(0, 3)
    .map((q) => ({
      type: 'RELATED_QUESTION',
      label: q.questionId,
      count: 1,
      reason: '동일 Pattern 유사 문항',
      questionId: q.questionId,
      patternId,
    }));

  const deduped = [];
  const seen = new Set();
  for (const it of [...items, ...linked, ...samePattern]) {
    const key = `${it.type}:${it.label}:${it.questionId || ''}:${it.patternId || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(it);
  }

  return {
    schemaVersion: 'v1',
    questionId: question.questionId || null,
    patternId,
    primaryCode,
    isCorrect,
    items: deduped,
    summary: isCorrect
      ? '정답 — 유지 학습 처방을 제공합니다.'
      : `오답 처방: ${deduped
          .filter((i) => i.type !== 'RECOMMENDATION')
          .slice(0, 3)
          .map((i) => `${i.label}${i.count > 1 ? ` ${i.count}문제` : ''}`)
          .join(' · ')}`,
    generatedAt: new Date().toISOString(),
  };
}

export default {
  buildLearningPrescription,
};
