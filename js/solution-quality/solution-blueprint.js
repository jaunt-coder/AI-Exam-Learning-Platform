/**
 * Sprint-15C — Solution Blueprint
 * Pattern/question explanation structure (storage only — no DB write).
 */

import {
  PATTERN_NAMES,
  PATTERN_TUTOR_PROFILES,
} from '../ai-tutor-content/pattern-profiles.js';
import { getCalculationTemplate } from '../ai-tutor-content/calculation-templates.js';
import { persistSolutionBlueprint } from './solution-storage.js';
import { validateBlueprint } from './solution-validator.js';

/**
 * Build blueprint from official profile data only (no guessing beyond profiles).
 */
export function buildSolutionBlueprint(question = {}, pattern = null) {
  const patternId = question.patternId || pattern?.patternId || '';
  const profile = PATTERN_TUTOR_PROFILES[patternId] || null;
  const patternName = pattern?.name || PATTERN_NAMES[patternId] || patternId;
  const template = profile?.defaultTemplateId
    ? getCalculationTemplate(profile.defaultTemplateId)
    : null;

  const solvingFramework = [
    patternName ? `${patternName} Pattern` : 'Pattern 문제',
    profile?.examinerIntent
      ? String(profile.examinerIntent).slice(0, 80)
      : '핵심 개념 확인',
  ];

  const requiredFormula = [];
  if (template?.formula) requiredFormula.push(template.formula);
  if (patternId === 'ACC_INV_006') {
    requiredFormula.push('FIFO 기말 = 최근 매입분', '총평균단가 = (기초+매입)÷(수량)');
  }

  const requiredSteps =
    (Array.isArray(template?.steps) && template.steps.length
      ? template.steps.slice(0, 5)
      : null)
    || (Array.isArray(profile?.solvingAlgorithm)
      ? profile.solvingAlgorithm.slice(0, 5)
      : ['조건 확인', '공식 적용', '보기 검증']);

  const commonMistakes = [];
  if (profile?.wrongReasons) {
    Object.values(profile.wrongReasons).forEach((v) => {
      if (v) commonMistakes.push(String(v).slice(0, 60));
    });
  }
  if (profile?.similarTrap) commonMistakes.push(String(profile.similarTrap).slice(0, 60));
  if (!commonMistakes.length) commonMistakes.push('조건·방법 혼동');

  const examStrategy =
    (Array.isArray(profile?.examThinking) && profile.examThinking[0])
    || profile?.memoryTip?.split('\n')[0]
    || template?.memoryHook
    || '시험장에서 Pattern을 먼저 확정한 뒤 공식을 적용한다.';

  const blueprint = {
    questionId: question.questionId || null,
    patternId,
    solvingFramework,
    requiredFormula,
    requiredSteps: requiredSteps.map((s) => String(s)),
    commonMistakes: commonMistakes.slice(0, 5),
    examStrategy: String(examStrategy).slice(0, 160),
    source: 'solution-quality/blueprint',
  };

  const checked = validateBlueprint(blueprint);
  if (checked.ok && blueprint.questionId) {
    persistSolutionBlueprint(blueprint.questionId, blueprint);
  }

  return { ...blueprint, valid: checked.ok, errors: checked.errors };
}

export default {
  buildSolutionBlueprint,
};
