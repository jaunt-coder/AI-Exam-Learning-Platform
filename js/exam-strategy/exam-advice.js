/**
 * Sprint-16A — Exam Mode + Exam Advice
 * D-30 / D-7 / D-1 focus shifts. Does not change Learning Engine.
 */

import { loadExamModeDoc, persistExamMode } from './strategy-storage.js';

export const EXAM_PHASES = Object.freeze({
  NORMAL: 'NORMAL',
  D30: 'D30',
  D7: 'D7',
  D1: 'D1',
});

const PHASE_FOCUS = {
  NORMAL: {
    label: '일반 학습',
    newLearning: '균형',
    weaknessRemoval: '균형',
    advice: 'Pattern 학습과 약점 보완을 병행하세요.',
  },
  D30: {
    label: '시험 D-30',
    newLearning: '↓ 축소',
    weaknessRemoval: '↑ 강화',
    advice: '새로운 문제 학습을 줄이고 약점 제거에 집중하세요.',
  },
  D7: {
    label: '시험 D-7',
    newLearning: '↓↓ 최소',
    weaknessRemoval: '↑↑ 고위험 집중',
    advice: '고위험 Pattern만 집중 반복하세요.',
  },
  D1: {
    label: '시험 D-1',
    newLearning: '중단',
    weaknessRemoval: '암기 카드 · 공식 · 실수 목록',
    advice: '암기 카드, 공식, 실수 목록만 확인하세요.',
  },
};

function daysBetween(examDateIso) {
  if (!examDateIso) return null;
  const exam = new Date(examDateIso);
  if (Number.isNaN(exam.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  exam.setHours(0, 0, 0, 0);
  return Math.round((exam.getTime() - today.getTime()) / 86400000);
}

export function resolveExamPhase(daysRemaining) {
  if (daysRemaining == null) return EXAM_PHASES.NORMAL;
  if (daysRemaining <= 1) return EXAM_PHASES.D1;
  if (daysRemaining <= 7) return EXAM_PHASES.D7;
  if (daysRemaining <= 30) return EXAM_PHASES.D30;
  return EXAM_PHASES.NORMAL;
}

/**
 * Enable / update Exam Mode.
 * @param {{ examDate?: string|null, enabled?: boolean }} options
 */
export function setExamMode(options = {}) {
  const enabled = options.enabled !== false;
  const examDate = options.examDate || null;
  const daysRemaining = daysBetween(examDate);
  const phase = enabled ? resolveExamPhase(daysRemaining) : EXAM_PHASES.NORMAL;
  const focus = PHASE_FOCUS[phase] || PHASE_FOCUS.NORMAL;

  return persistExamMode({
    enabled,
    examDate,
    daysRemaining,
    phase,
    focus,
  });
}

export function getExamMode() {
  const doc = loadExamModeDoc();
  if (doc.enabled && doc.examDate) {
    const daysRemaining = daysBetween(doc.examDate);
    const phase = resolveExamPhase(daysRemaining);
    return persistExamMode({
      ...doc,
      daysRemaining,
      phase,
      focus: PHASE_FOCUS[phase],
    });
  }
  return {
    ...doc,
    focus: PHASE_FOCUS[doc.phase] || PHASE_FOCUS.NORMAL,
  };
}

/**
 * Human-readable exam advice block.
 */
export function buildExamAdvice({ readiness, weaknesses, examMode, actions } = {}) {
  const mode = examMode || getExamMode();
  const focus = mode.focus || PHASE_FOCUS[mode.phase] || PHASE_FOCUS.NORMAL;
  const top = weaknesses?.[0] || null;

  return {
    title: 'AI 시험 전략',
    phaseLabel: focus.label,
    newLearning: focus.newLearning,
    weaknessRemoval: focus.weaknessRemoval,
    advice: focus.advice,
    passProbability: readiness?.passProbability ?? readiness?.score ?? null,
    readinessScore: readiness?.score ?? null,
    readinessLevel: readiness?.level ?? null,
    topWeakness: top
      ? {
          rank: 1,
          label: top.label,
          reason: top.reason,
          patternId: top.patternId,
        }
      : null,
    actions: actions || [],
    daysRemaining: mode.daysRemaining,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Why this next problem was recommended (Result screen).
 */
export function explainRecommendationWhy({
  nextItem,
  weaknesses,
  readiness,
  riskMap,
} = {}) {
  const top = weaknesses?.[0] || null;
  const patternId =
    nextItem?.patternId
    || top?.patternId
    || null;

  const risk = patternId ? riskMap?.byPattern?.[patternId] : null;
  const weakLabel = top?.label || risk?.shortName || '약점 Pattern';
  const purpose =
    /FIFO|ACC_INV_006/i.test(`${patternId} ${weakLabel}`)
      ? 'FIFO 계산 오류 제거'
      : `${weakLabel} 약점 제거`;

  const masteryNow = Number(risk?.mastery ?? top?.mastery ?? 50);
  const expectedGain = Math.max(2, Math.min(8, Math.round((100 - masteryNow) * 0.08) || 3));

  return {
    title: '왜 이 문제를 추천했는가?',
    currentWeakness: weakLabel,
    patternId,
    purpose,
    expectedEffect: `Mastery +${expectedGain}%`,
    expectedGain,
    readinessScore: readiness?.score ?? null,
    questionId: nextItem?.questionId || nextItem?.id || null,
  };
}

export default {
  EXAM_PHASES,
  setExamMode,
  getExamMode,
  resolveExamPhase,
  buildExamAdvice,
  explainRecommendationWhy,
};
