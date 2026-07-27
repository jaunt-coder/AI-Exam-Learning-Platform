/**
 * Sprint-15A+ — Explanation Generator
 * Step-by-step AI solution (student screen only, not persisted to DB).
 */

import {
  PATTERN_NAMES,
  PATTERN_TUTOR_PROFILES,
} from '../ai-tutor-content/pattern-profiles.js';
import { getCalculationTemplate } from '../ai-tutor-content/calculation-templates.js';

const CHOICE_LABELS = ['①', '②', '③', '④', '⑤'];

function labelOf(n) {
  const i = Number(n) - 1;
  return CHOICE_LABELS[i] || String(n);
}

/**
 * @returns {{ steps: { order: number, title: string, body: string }[], markdown?: string, source: string }}
 */
export function generateExplanation(question = {}, pattern = null, grade = null) {
  const patternId = question.patternId || pattern?.patternId || '';
  const profile = PATTERN_TUTOR_PROFILES[patternId] || null;
  const patternName = pattern?.name || PATTERN_NAMES[patternId] || patternId || '재고자산';
  const template = profile?.defaultTemplateId
    ? getCalculationTemplate(profile.defaultTemplateId)
    : null;
  const correct = Number(question.answer);
  const selected = grade?.selected ?? grade?.selectedAnswer ?? null;
  const isCorrect = grade?.result === 'correct' || Number(selected) === correct;

  const algo = Array.isArray(profile?.solvingAlgorithm) ? profile.solvingAlgorithm : [];
  const templateSteps = Array.isArray(template?.steps) ? template.steps : [];
  const merged = [];
  for (const s of templateSteps) merged.push(s);
  for (const s of algo) {
    if (!merged.includes(s)) merged.push(s);
  }
  if (!merged.length) {
    merged.push(
      '지문에서 묻는 대상(금액·개념·비교)을 확인한다.',
      `${patternName} Pattern의 핵심 판단 기준을 적용한다.`,
      '보기를 하나씩 검증해 정답을 고른다.',
    );
  }

  const steps = [
    {
      order: 1,
      title: 'Step1 · 문제 파악',
      body: `이 문항은 「${patternName}」(${patternId || '—'}) Pattern입니다. ${
        profile?.examinerIntent || '출제 의도에 맞는 판단을 확인합니다.'
      }`,
    },
    {
      order: 2,
      title: 'Step2 · 풀이 준비',
      body: template
        ? `[${template.title}] ${template.formula}`
        : (profile?.explanation || 'Pattern 핵심 개념을 먼저 떠올립니다.'),
    },
  ];

  merged.slice(0, 4).forEach((line, idx) => {
    steps.push({
      order: steps.length + 1,
      title: `Step${steps.length + 1} · 풀이`,
      body: line,
    });
  });

  steps.push({
    order: steps.length + 1,
    title: `Step${steps.length + 1} · 정답 확정`,
    body: `정답은 ${labelOf(correct)} (${correct})입니다.${
      selected == null
        ? ''
        : isCorrect
          ? ' 선택한 답과 일치합니다.'
          : ` 학생 선택 ${labelOf(selected)} (${selected})과 다릅니다.`
    } ${question.solution ? `참고: ${String(question.solution).slice(0, 180)}` : ''}`.trim(),
  });

  const markdown = steps
    .map((s) => `### ${s.title}\n\n${s.body}`)
    .join('\n\n');

  return {
    steps,
    markdown,
    patternId,
    patternName,
    source: 'solution-engine/rule',
    generatedAt: new Date().toISOString(),
  };
}

/**
 * 3-line key takeaway for the question.
 */
export function generateKeyTakeaway(question = {}, pattern = null) {
  const patternId = question.patternId || pattern?.patternId || '';
  const profile = PATTERN_TUTOR_PROFILES[patternId] || null;
  const name = pattern?.name || PATTERN_NAMES[patternId] || patternId;

  const lines = [
    `이 문제는 「${name}」 Pattern의 핵심을 묻습니다.`,
    profile?.examThinking?.[0]
      || profile?.solvingAlgorithm?.[0]
      || '조건·방법을 먼저 확인한 뒤 공식을 적용하세요.',
    profile?.memoryTip
      ? String(profile.memoryTip).split('\n')[0]
      : '정답 번호만 외우지 말고 Pattern 구조를 복습하세요.',
  ];

  if (patternId === 'ACC_INV_006') {
    return [
      '이 문제는 FIFO와 총평균법의 차이를 묻습니다.',
      'FIFO는 먼저 들어온 원가부터 출고하고, 총평균은 가중평균 단가를 씁니다.',
      '물가 상승 시 이익은 보통 FIFO > 이동평균 > 총평균 순입니다.',
    ];
  }

  return lines.slice(0, 3);
}

export default {
  generateExplanation,
  generateKeyTakeaway,
};
