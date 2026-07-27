/**
 * Sprint-16A — Daily Plan Generator
 * Builds today's study plan from weakness priority + exam mode.
 */

import { persistDailyPlan } from './strategy-storage.js';
import { loadExamModeDoc } from './strategy-storage.js';

function stars(priority) {
  const n = Math.max(1, Math.min(5, Number(priority) || 3));
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

/**
 * @param {{
 *   weaknesses?: object[],
 *   readiness?: object,
 *   examMode?: object,
 *   date?: string,
 * }} input
 */
export function generateDailyPlan(input = {}) {
  const weaknesses = Array.isArray(input.weaknesses) ? input.weaknesses : [];
  const examMode = input.examMode || loadExamModeDoc();
  const date = input.date || new Date().toISOString().slice(0, 10);
  const phase = examMode?.phase || 'NORMAL';

  const items = [];

  const top = weaknesses[0];
  if (top) {
    const isFifo = /FIFO|ACC_INV_006/i.test(`${top.patternId} ${top.label}`);
    items.push({
      id: 'plan_focus',
      title: isFifo ? 'FIFO 복습' : `${top.label} 복습`,
      stars: stars(5),
      priority: 5,
      estimatedMinutes: phase === 'D7' || phase === 'D1' ? 25 : 20,
      count: phase === 'D30' ? 2 : 3,
      unit: '문제',
      patternId: top.patternId,
      href: top.patternId
        ? `question.html?pattern=${encodeURIComponent(top.patternId)}`
        : 'learning-loop.html',
      reason: top.reason || '최우선 약점',
    });
  }

  const second = weaknesses[1];
  if (second) {
    items.push({
      id: 'plan_secondary',
      title: /평균|ACC_INV_006/i.test(`${second.label}`)
        ? '평균법 문제'
        : `${second.label} 문제`,
      stars: stars(4),
      priority: 4,
      estimatedMinutes: 30,
      count: 2,
      unit: '문제',
      patternId: second.patternId,
      href: second.patternId
        ? `question.html?pattern=${encodeURIComponent(second.patternId)}`
        : 'question.html',
      reason: second.reason || '차순위 약점',
    });
  } else if (top) {
    items.push({
      id: 'plan_compare',
      title: '평균법 비교',
      stars: stars(4),
      priority: 4,
      estimatedMinutes: 30,
      count: 2,
      unit: '문제',
      patternId: top.patternId,
      href: 'question.html?pattern=ACC_INV_006',
      reason: '유사 Pattern 비교 학습',
    });
  }

  items.push({
    id: 'plan_wrong_note',
    title: '오답노트 확인',
    stars: stars(3),
    priority: 3,
    estimatedMinutes: 10,
    count: 1,
    unit: '세트',
    href: 'wrong-note.html',
    reason: '반복 오답 제거',
  });

  if (phase === 'D1') {
    items.unshift({
      id: 'plan_memory',
      title: '암기 카드 · 공식 · 실수 목록',
      stars: stars(5),
      priority: 5,
      estimatedMinutes: 15,
      count: 1,
      unit: '세트',
      href: 'learning-loop.html',
      reason: '시험 D-1 암기 모드',
    });
  } else if (phase === 'D7') {
    items[0] = {
      ...(items[0] || {}),
      id: 'plan_high_risk',
      title: items[0]?.title || '고위험 Pattern 집중',
      stars: stars(5),
      priority: 5,
      estimatedMinutes: 35,
      reason: '시험 D-7 고위험 집중',
    };
  }

  const totalMinutes = items.reduce(
    (s, it) => s + (Number(it.estimatedMinutes) || 0),
    0,
  );

  const plan = {
    title: '오늘 해야 할 공부',
    date,
    phase,
    items,
    totalMinutes,
    itemCount: items.length,
    generatedAt: new Date().toISOString(),
    source: 'exam-strategy/daily-plan-generator',
  };

  persistDailyPlan(plan);
  return plan;
}

/**
 * Multi-day action schedule for strategy output.
 */
export function buildActionSchedule(weaknesses = [], examMode = null) {
  const top = weaknesses[0];
  const second = weaknesses[1];
  const label = top?.label || '약점 Pattern';
  const isFifo = /FIFO|ACC_INV_006/i.test(`${top?.patternId} ${label}`);

  return [
    {
      when: '오늘',
      action: isFifo ? 'FIFO 3문제' : `${label} 3문제`,
      patternId: top?.patternId || null,
    },
    {
      when: '내일',
      action: second
        ? `${second.label} 2문제`
        : '평균법 비교 2문제',
      patternId: second?.patternId || top?.patternId || null,
    },
    {
      when: '3일 후',
      action: examMode?.phase === 'D7' || examMode?.phase === 'D1'
        ? '고위험 Pattern 실전 테스트'
        : '실전 테스트',
      patternId: null,
    },
  ];
}

export default {
  generateDailyPlan,
  buildActionSchedule,
  stars,
};
