/**
 * Sprint-16A — Exam Strategy Engine (Orchestrator)
 * Student state → strategy → daily plan → weakness removal.
 * Never mutates Learning Engine / Recommendation Engine / DB / Override.
 */

import { computeExamReadinessScore } from './readiness-score.js';
import {
  buildPatternRiskMap,
  prioritizeWeaknesses,
  buildMasteryMap,
} from './weakness-priority.js';
import {
  generateDailyPlan,
  buildActionSchedule,
} from './daily-plan-generator.js';
import {
  getExamMode,
  setExamMode,
  buildExamAdvice,
  explainRecommendationWhy,
} from './exam-advice.js';
import { persistStrategyState } from './strategy-storage.js';

export const EXAM_STRATEGY_VERSION = '16A';

/**
 * Full strategy pack for Dashboard / Result.
 * @param {{
 *   questions?: object[],
 *   patterns?: object[],
 *   examDate?: string|null,
 *   enableExamMode?: boolean,
 * }} input
 */
export function generateExamStrategy(input = {}) {
  const questions = Array.isArray(input.questions) ? input.questions : [];
  const patterns = Array.isArray(input.patterns) ? input.patterns : [];

  if (input.enableExamMode || input.examDate) {
    setExamMode({
      enabled: input.enableExamMode !== false,
      examDate: input.examDate || null,
    });
  }

  const examMode = getExamMode();
  const readiness = computeExamReadinessScore({ questions });
  const riskMap = buildPatternRiskMap(questions, patterns);
  const weaknesses = prioritizeWeaknesses(riskMap, 5);
  const masteryMap = buildMasteryMap(questions, patterns);
  const actions = buildActionSchedule(weaknesses, examMode);
  const dailyPlan = generateDailyPlan({
    weaknesses,
    readiness,
    examMode,
  });
  const advice = buildExamAdvice({
    readiness,
    weaknesses,
    examMode,
    actions,
  });

  const strategy = {
    schemaVersion: 'v1',
    engineVersion: EXAM_STRATEGY_VERSION,
    title: '현재 상태 분석',
    passProbability: readiness.passProbability,
    readiness,
    masteryMap,
    riskMap,
    dangerTop5: riskMap.dangerTop5,
    weaknesses,
    topWeakness: weaknesses[0] || null,
    dailyPlan,
    actions,
    advice,
    examMode,
    learningEngineFormulasUnchanged: true,
    recommendationEngineUnchanged: true,
    generatedAt: new Date().toISOString(),
  };

  persistStrategyState(strategy);
  return strategy;
}

/**
 * Attach recommendation explainability onto next-problem items.
 */
export function enrichNextProblemsWithStrategy(nextProblems, strategy) {
  const items = Array.isArray(nextProblems?.items) ? nextProblems.items : [];
  const weaknesses = strategy?.weaknesses || [];
  const readiness = strategy?.readiness || null;
  const riskMap = strategy?.riskMap || null;

  const enriched = items.map((item, index) => {
    const why = explainRecommendationWhy({
      nextItem: item,
      weaknesses: index === 0 ? weaknesses : weaknesses.slice(index, index + 1).concat(weaknesses),
      readiness,
      riskMap,
    });
    return {
      ...item,
      why,
      reason: why.purpose,
      weaknessLabel: why.currentWeakness,
      expectedEffect: why.expectedEffect,
    };
  });

  return {
    ...nextProblems,
    items: enriched,
    strategyExplain: enriched[0]?.why || null,
  };
}

export function getExamStrategy(input = {}) {
  return generateExamStrategy(input);
}

export default {
  EXAM_STRATEGY_VERSION,
  generateExamStrategy,
  getExamStrategy,
  enrichNextProblemsWithStrategy,
};
