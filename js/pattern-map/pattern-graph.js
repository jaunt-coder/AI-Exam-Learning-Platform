/**
 * Sprint-19C — Pattern Graph + D-Day ROI strategy
 */

import { calculateDaysRemaining } from '../exam-goal/exam-goal-calculator.js';
import { getExamGoal } from '../exam-goal/exam-goal-engine.js';

export const PATTERN_GRAPH_VERSION = '19C';

/**
 * Build simple nodes/edges for Pattern Intelligence graph.
 * @param {object[]} ranked
 */
export function buildPatternGraph(ranked = []) {
  const nodes = (ranked || []).slice(0, 24).map((r) => ({
    id: r.patternId,
    label: r.name,
    roi: r.roi,
    mastery: r.mastery,
    priority: r.priority,
    group: r.band || 'B',
  }));
  const edges = [];
  for (let i = 0; i < Math.min(nodes.length - 1, 12); i += 1) {
    edges.push({
      from: nodes[i].id,
      to: nodes[i + 1].id,
      relation: 'roi-next',
    });
  }
  return {
    version: PATTERN_GRAPH_VERSION,
    nodes,
    edges,
  };
}

/**
 * D-Day phase guidance for ROI focus.
 * D30 ROI 확대 · D14 Weak · D7 Formula · D3 Final Book · D1 Memory Sheet
 */
export function buildDdayRoiPlan(examDate, ranked = []) {
  const days = calculateDaysRemaining(examDate);
  let phase = 'D30';
  let focus = 'ROI 높은 Pattern 확대';
  let actions = ['ROI TOP Pattern 학습', 'Priority 상위 복습'];

  if (days != null) {
    if (days <= 1) {
      phase = 'D1';
      focus = 'Memory Sheet';
      actions = ['30초 암기 Sheet', '실수 목록 점검'];
    } else if (days <= 3) {
      phase = 'D3';
      focus = 'Final Book';
      actions = ['Final Revision Book', 'Quick Review'];
    } else if (days <= 7) {
      phase = 'D7';
      focus = 'ROI 높은 Formula';
      actions = ['Formula Card', '공식 암기'];
    } else if (days <= 14) {
      phase = 'D14';
      focus = 'Weak Pattern 집중';
      actions = ['오답 Pattern', 'Weak Memory'];
    } else if (days <= 30) {
      phase = 'D30';
      focus = 'ROI 높은 Pattern 확대';
      actions = ['ROI TOP10', 'Pass60 남은 Pattern'];
    } else {
      phase = 'D60+';
      focus = '기초 Pattern + ROI 탐색';
      actions = ['Pattern 이해', 'ROI 맵 확인'];
    }
  }

  const top = (ranked || []).slice(0, 5);
  return {
    daysRemaining: days,
    phase,
    focus,
    actions,
    recommendPatterns: top.map((r) => ({
      patternId: r.patternId,
      name: r.name,
      roi: r.roi,
    })),
    version: PATTERN_GRAPH_VERSION,
  };
}

/**
 * Resolve exam date from goal storage when not provided.
 */
export function resolveExamDate(explicit) {
  if (explicit) return explicit;
  try {
    return getExamGoal()?.examDate || null;
  } catch (_e) {
    return null;
  }
}

/**
 * Pattern detail deep-links (existing features — no solver changes).
 */
export function buildPatternDetailLinks(patternId) {
  const q = encodeURIComponent(patternId || '');
  return {
    patternId,
    links: [
      { id: 'question', label: '대표문제', href: `question.html?patternId=${q}` },
      { id: 'gemini', label: 'Gemini 풀이', href: `question.html?patternId=${q}&tutor=gemini` },
      { id: 'tutor', label: 'AI Tutor', href: `learning-loop.html?patternId=${q}` },
      { id: 'memory', label: '30초 암기', href: `learning-loop.html?patternId=${q}&view=memory` },
      { id: 'textbook', label: 'Personal Textbook', href: `textbook.html?patternId=${q}` },
      { id: 'final', label: 'Final Book', href: `textbook.html#fb-heading` },
      { id: 'weak', label: 'Weak Memory', href: `dashboard.html#widget-weak-pattern` },
      { id: 'history', label: 'Pattern History', href: `pattern.html?patternId=${q}` },
    ],
  };
}

export default {
  PATTERN_GRAPH_VERSION,
  buildPatternGraph,
  buildDdayRoiPlan,
  resolveExamDate,
  buildPatternDetailLinks,
};
