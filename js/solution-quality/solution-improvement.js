/**
 * Sprint-15C — Solution Improvement Suggestion Engine
 */

import { persistSolutionImprovement } from './solution-storage.js';

const SUGGESTION_COPY = {
  problemApproach: '문제 유형·풀이 방향(접근) 설명을 한 줄로 추가하세요',
  conceptExplanation: '핵심 회계 개념과 공식 선택 이유를 보강하세요',
  calculationSteps: '계산 과정을 단계별 표·식으로 추가하세요',
  mistakeDiagnosis: '학생 답안 기준 오답 원인·흔한 함정을 추가하세요',
  examTip: '시험장에서 빠르게 판단하는 기준·암기 문장을 추가하세요',
};

/**
 * @param {{ total: number, missingItems?: string[] }} scoreResult
 */
export function buildImprovementSuggestion(scoreResult = {}) {
  const missing = Array.isArray(scoreResult.missingItems)
    ? scoreResult.missingItems
    : [];
  const suggestion = missing.map((m) => SUGGESTION_COPY[m] || `${m} 항목을 보강하세요`);

  const improvement = {
    score: scoreResult.total ?? scoreResult.qualityScore?.total ?? null,
    missing,
    suggestion,
    reviewRequired: Boolean(scoreResult.reviewRequired) || (scoreResult.total ?? 100) < 70,
    generatedAt: new Date().toISOString(),
  };

  return improvement;
}

/**
 * Build override patch text for "AI 개선 적용" (manual approve still required).
 */
export function buildImprovedSolutionText(blueprint, improvement) {
  const lines = [];
  lines.push('[AI 개선 초안 — Reviewer 승인 필요]');
  if (blueprint?.solvingFramework?.length) {
    lines.push('', '■ 문제 접근');
    blueprint.solvingFramework.forEach((s) => lines.push(`- ${s}`));
  }
  if (blueprint?.requiredSteps?.length) {
    lines.push('', '■ 계산·풀이 단계');
    blueprint.requiredSteps.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
  }
  if (blueprint?.requiredFormula?.length) {
    lines.push('', '■ 공식');
    blueprint.requiredFormula.forEach((s) => lines.push(`- ${s}`));
  }
  if (blueprint?.commonMistakes?.length) {
    lines.push('', '■ 오답·함정');
    blueprint.commonMistakes.forEach((s) => lines.push(`- ${s}`));
  }
  if (blueprint?.examStrategy) {
    lines.push('', '■ 시험 전략', blueprint.examStrategy);
  }
  if (improvement?.suggestion?.length) {
    lines.push('', '■ 보완 포인트');
    improvement.suggestion.forEach((s) => lines.push(`- ${s}`));
  }
  return lines.join('\n');
}

export function saveImprovement(questionId, improvement) {
  if (!questionId) return null;
  return persistSolutionImprovement(questionId, improvement);
}

export default {
  SUGGESTION_COPY,
  buildImprovementSuggestion,
  buildImprovedSolutionText,
  saveImprovement,
};
