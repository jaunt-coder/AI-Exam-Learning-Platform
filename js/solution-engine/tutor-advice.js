/**
 * Sprint-15A+ — AI Tutor Advice
 * Next-exam checklist for the same Pattern.
 */

import {
  PATTERN_NAMES,
  PATTERN_TUTOR_PROFILES,
} from '../ai-tutor-content/pattern-profiles.js';
import { getCalculationTemplate } from '../ai-tutor-content/calculation-templates.js';

const DEFAULT_CHECKS = [
  '묻는 대상(금액·개념·비교)을 밑줄 친다',
  'Pattern 방법을 확인한다',
  '공식을 한 줄로 적는다',
  '보기를 하나씩 검증한다',
];

/**
 * @returns {{ title: string, advice: string, checklist: { id: string, label: string, done: boolean }[], patternId: string }}
 */
export function generateTutorAdvice(question = {}, pattern = null, diagnosis = null) {
  const patternId = question.patternId || pattern?.patternId || '';
  const profile = PATTERN_TUTOR_PROFILES[patternId] || null;
  const name = pattern?.name || PATTERN_NAMES[patternId] || patternId;
  const template = profile?.defaultTemplateId
    ? getCalculationTemplate(profile.defaultTemplateId)
    : null;

  let checklistLabels = [];

  if (patternId === 'ACC_INV_006') {
    checklistLabels = [
      '재고흐름(기초·매입·매출) 확인',
      '평균단가 계산 (총평균)',
      'FIFO 출고 순서 확인',
      '기말재고 계산',
      '매출원가 계산',
    ];
  } else if (patternId === 'ACC_INV_001') {
    checklistLabels = [
      'FOB·위탁·적송·시송 표시',
      '소유권 이전 시점 판단',
      '포함/제외 목록 작성',
      '실사액 ± 조정',
    ];
  } else if (Array.isArray(profile?.examThinking) && profile.examThinking.length) {
    checklistLabels = profile.examThinking.map((t) =>
      String(t).replace(/^시험장\s*\d*초?:\s*/i, '').slice(0, 48),
    );
  } else if (template?.steps?.length) {
    checklistLabels = template.steps.map((s) => String(s).slice(0, 48));
  } else {
    checklistLabels = DEFAULT_CHECKS;
  }

  const advice = diagnosis?.isCorrect
    ? `다음 시험에서도 「${name}」은 같은 체크리스트로 검증하세요.`
    : `다음 시험에서는 「${name}」을 풀 때 아래 체크리스트를 순서대로 확인하세요.`;

  return {
    title: 'AI Tutor',
    advice,
    checklist: checklistLabels.slice(0, 6).map((label, i) => ({
      id: `tutor_${patternId || 'x'}_${i + 1}`,
      label,
      done: false,
    })),
    patternId,
  };
}

export default {
  generateTutorAdvice,
};
