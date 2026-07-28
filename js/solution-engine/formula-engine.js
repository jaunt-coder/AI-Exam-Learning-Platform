/**
 * Sprint-15A+ — Formula Engine
 * Sprint-19A — formulas load from Subject Plugin formula-db.json (auto by subjectId).
 * Generates core formulas for the current Pattern / question (student screen only).
 */

import {
  PATTERN_NAMES,
  PATTERN_TUTOR_PROFILES,
} from '../ai-tutor-content/pattern-profiles.js';
import {
  CALCULATION_TEMPLATES,
  getCalculationTemplate,
} from '../ai-tutor-content/calculation-templates.js';
import {
  getSubjectFormulas,
  getSubjectFormulaExtras,
  resolveSubjectIdForQuestion,
  getCurrentSubjectId,
} from '../subject/subject-adapter.js';

/** @deprecated Prefer Subject Plugin formula-db; kept as offline mirror for accounting. */
export const FALLBACK_FORMULAS = {
  ACC_INV_001: {
    name: '기말재고 포함 여부',
    formula: '기말재고 = 실사액 ± 소유권 조정(FOB·위탁·적송·시송)',
    when: '기말 현재 소유권이 누구에게 있는지 판단할 때',
  },
  ACC_INV_003: {
    name: '재고 취득원가',
    formula: '재고원가 = 매입가 + 정상 취득·완성 원가 − 비정상낭비·판매비',
    when: '원가 포함/제외 항목을 구분할 때',
  },
  ACC_INV_004: {
    name: '재고 항등식',
    formula: '기초재고 + 당기매입 − 기말재고 = 매출원가',
    when: '매출원가·기말재고·추정 문제를 풀 때',
  },
  ACC_INV_005: {
    name: 'PER vs PR',
    formula: '감모수량 = 장부수량 − 실사수량 · 매출원가(PER) = 판매가능 − 실사기말',
    when: '계속기록법과 실지재고조사법을 비교할 때',
  },
  ACC_INV_006: {
    name: '총평균법 평균단가',
    formula: '평균단가 = (기초원가 + 매입원가) ÷ (기초수량 + 매입수량)',
    when: 'FIFO와 총평균법 매출원가·기말재고를 계산할 때',
  },
  ACC_INV_007: {
    name: '저가법(LCM)',
    formula: '평가액 = min(취득원가, NRV) · NRV = 예상판매가 − 추가비용',
    when: '기말재고를 저가법·소매재고법으로 평가할 때',
  },
};

/**
 * @param {object} question
 * @param {object|null} pattern
 * @returns {{ name: string, formula: string, when: string, patternId: string, templateId: string|null }[]}
 */
export function generateFormulas(question = {}, pattern = null) {
  const patternId = question.patternId || pattern?.patternId || '';
  const subjectId =
    question.subjectPluginId
    || resolveSubjectIdForQuestion(question)
    || getCurrentSubjectId();
  const subjectFormulas = getSubjectFormulas(subjectId);
  const profile = PATTERN_TUTOR_PROFILES[patternId] || null;
  const templateId = profile?.defaultTemplateId || null;
  const template = templateId ? getCalculationTemplate(templateId) : null;
  const fallback =
    subjectFormulas[patternId]
    || FALLBACK_FORMULAS[patternId]
    || null;
  const patternName = pattern?.name || PATTERN_NAMES[patternId] || patternId || '재고자산';

  const list = [];

  if (template) {
    list.push({
      name: template.title,
      formula: template.formula,
      when: `${patternName} Pattern에서 ${template.title}을(를) 적용할 때`,
      patternId,
      templateId: template.id,
      subjectId,
    });
  }

  if (fallback && (!template || fallback.formula !== template.formula)) {
    list.push({
      name: fallback.name,
      formula: fallback.formula,
      when: fallback.when,
      patternId,
      templateId: templateId || null,
      subjectId,
    });
  }

  const extras = getSubjectFormulaExtras(patternId, subjectId);
  for (const extra of extras) {
    if (list.some((x) => x.formula === extra.formula)) continue;
    list.push({
      name: extra.name,
      formula: extra.formula,
      when: extra.when,
      patternId,
      templateId: extra.templateId || templateId || null,
      subjectId,
    });
  }

  if (!list.length) {
    list.push({
      name: `${patternName} 핵심 공식`,
      formula: profile?.solvingAlgorithm?.[0] || 'Pattern 풀이 알고리즘을 단계별로 적용한다.',
      when: '해당 Pattern 문항을 풀 때',
      patternId,
      templateId: null,
      subjectId,
    });
  }

  return list;
}

export function listKnownTemplates() {
  return Object.keys(CALCULATION_TEMPLATES);
}

export default {
  generateFormulas,
  listKnownTemplates,
  FALLBACK_FORMULAS,
};
