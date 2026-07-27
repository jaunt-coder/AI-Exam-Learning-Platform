/**
 * Sprint-16B — Exam Phase Engine
 * D-60+ Foundation · D-30 Weakness Removal · D-7 Final Stabilization · D-1 Exam Ready
 * Consumes daysRemaining only — does not change Strategy/LE formulas.
 */

import { persistExamPhase } from './exam-goal-storage.js';
import { calculateDaysRemaining } from './exam-goal-calculator.js';

export const GOAL_PHASES = Object.freeze({
  FOUNDATION: 'FOUNDATION',
  WEAKNESS_REMOVAL: 'WEAKNESS_REMOVAL',
  FINAL_STABILIZATION: 'FINAL_STABILIZATION',
  EXAM_READY: 'EXAM_READY',
});

/** Display aliases used in getExamModeStrategy (D-60 / D-30 / D-7 / D-1) */
export const PHASE_DISPLAY = Object.freeze({
  FOUNDATION: 'D-60',
  WEAKNESS_REMOVAL: 'D-30',
  FINAL_STABILIZATION: 'D-7',
  EXAM_READY: 'D-1',
});

const PHASE_META = {
  FOUNDATION: {
    label: 'Foundation',
    priority: 'Pattern 이해',
    recommendations: ['Pattern 이해', '기본 문제'],
    forbiddenActions: [],
  },
  WEAKNESS_REMOVAL: {
    label: 'Weakness Removal',
    priority: 'Risk HIGH Pattern 제거',
    recommendations: ['Risk HIGH Pattern 제거', '반복 오답 재풀이'],
    forbiddenActions: ['신규 과목 확장 학습'],
  },
  FINAL_STABILIZATION: {
    label: 'Final Stabilization',
    priority: '오답 제거',
    recommendations: ['오답', '공식', '암기'],
    forbiddenActions: ['새로운 어려운 Pattern 학습'],
  },
  EXAM_READY: {
    label: 'Exam Ready',
    priority: '실수 방지',
    recommendations: ['암기 카드', '공식', '실수 목록'],
    forbiddenActions: ['새 문제 학습', '어려운 Pattern 도전'],
  },
};

/**
 * Resolve phase from days remaining.
 * D-60+ → Foundation
 * D-30 (≤30, >7) → Weakness Removal
 * D-7 (≤7, >1) → Final Stabilization
 * D-1 (≤1) → Exam Ready
 */
export function resolveGoalPhase(daysRemaining) {
  if (daysRemaining == null) return GOAL_PHASES.FOUNDATION;
  if (daysRemaining <= 1) return GOAL_PHASES.EXAM_READY;
  if (daysRemaining <= 7) return GOAL_PHASES.FINAL_STABILIZATION;
  if (daysRemaining <= 30) return GOAL_PHASES.WEAKNESS_REMOVAL;
  return GOAL_PHASES.FOUNDATION;
}

/**
 * Build + persist phase snapshot.
 */
export function evaluateExamPhase(examDate) {
  const daysRemaining = calculateDaysRemaining(examDate);
  const phase = resolveGoalPhase(daysRemaining);
  const meta = PHASE_META[phase] || PHASE_META.FOUNDATION;
  const payload = {
    phase,
    displayPhase: PHASE_DISPLAY[phase],
    daysRemaining,
    label: meta.label,
    priority: meta.priority,
    recommendation: meta.recommendations,
    forbiddenActions: meta.forbiddenActions,
    source: 'exam-goal/exam-phase-engine',
  };
  persistExamPhase(payload);
  return payload;
}

export function getPhaseMeta(phase) {
  return PHASE_META[phase] || PHASE_META.FOUNDATION;
}

export default {
  GOAL_PHASES,
  PHASE_DISPLAY,
  resolveGoalPhase,
  evaluateExamPhase,
  getPhaseMeta,
};
