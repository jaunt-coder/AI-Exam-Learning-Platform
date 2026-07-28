/**
 * Sprint-19C — Pass60 Engine
 * "가장 적은 시간으로 60점을 넘는" 핵심 Pattern 집합.
 */

import { loadPass60Doc, savePass60Doc } from './roi-storage.js';
import { getCurrentSubjectId } from '../subject/subject-adapter.js';

export const PASS60_ENGINE_VERSION = '19C';
export const PASS60_TARGET = 60;

/**
 * Select minimal high-ROI patterns to reach target score.
 * @param {object[]} ranked — ROI/priority ranked patterns
 * @param {{
 *   subjectId?: string,
 *   currentScore?: number,
 *   targetScore?: number,
 *   masteryThreshold?: number,
 * }} [opts]
 */
export function buildPass60Plan(ranked = [], opts = {}) {
  const subjectId = opts.subjectId || getCurrentSubjectId();
  const target = Number(opts.targetScore) || PASS60_TARGET;
  const masteryThreshold = Number(opts.masteryThreshold) || 70;
  const list = Array.isArray(ranked) ? ranked : [];

  const allCount = list.length;
  // Core = high ROI / high frequency slice (top ~35% or min 8 max 20)
  const coreSize = Math.min(20, Math.max(8, Math.ceil(allCount * 0.35)));
  const core = list.slice(0, coreSize);

  const mastered = core.filter((p) => (Number(p.mastery) || 0) >= masteryThreshold);
  const remaining = core.filter((p) => (Number(p.mastery) || 0) < masteryThreshold);

  // Baseline from mastered core contribution
  let expected = Number(opts.currentScore);
  if (!Number.isFinite(expected)) {
    expected = mastered.reduce((s, p) => s + (Number(p.expectedScoreGain) || 0) * 0.55, 28);
  }

  const selected = [];
  let projected = expected;
  for (const p of remaining) {
    selected.push(p);
    projected += Number(p.expectedScoreGain) || 0;
    if (projected >= target) break;
  }

  // If still short, pull extra from outside core by ROI
  if (projected < target) {
    for (const p of list) {
      if (core.some((c) => c.patternId === p.patternId)) continue;
      if (selected.some((c) => c.patternId === p.patternId)) continue;
      selected.push(p);
      projected += Number(p.expectedScoreGain) || 0;
      if (projected >= target) break;
    }
  }

  const low = Math.max(target - 2, Math.round(projected - 1.5));
  const high = Math.round(projected + 1.5);
  const advice = [
    `${allCount}개를 전부 공부하지 마세요.`,
    `ROI가 높은 ${selected.length}개 Pattern만 먼저 끝내면`,
    `최근 기출 기준 ${low}~${high}점을 기대할 수 있습니다.`,
  ].join(' ');

  const plan = {
    subjectId,
    targetScore: target,
    totalPatterns: allCount,
    corePatterns: core.length,
    masteredCore: mastered.length,
    remainingPatterns: selected.length,
    remainingList: selected.map((p) => ({
      patternId: p.patternId,
      name: p.name,
      roi: p.roi,
      mastery: p.mastery,
      expectedScoreGain: p.expectedScoreGain,
      estimatedMinutes: p.estimatedMinutes,
      starsLabel: p.starsLabel,
    })),
    expectedScore: Math.round(projected * 10) / 10,
    expectedRange: [low, high],
    advice,
    version: PASS60_ENGINE_VERSION,
  };

  const doc = loadPass60Doc();
  if (!doc.bySubject) doc.bySubject = {};
  doc.bySubject[subjectId] = plan;
  savePass60Doc(doc);
  return plan;
}

export function getPass60DashboardCard(subjectId) {
  const doc = loadPass60Doc();
  const sid = subjectId || getCurrentSubjectId();
  const plan = doc.bySubject?.[sid] || null;
  return {
    id: 'pass60',
    title: 'Pass60',
    subjectId: sid,
    totalPatterns: plan?.totalPatterns ?? 0,
    corePatterns: plan?.corePatterns ?? 0,
    masteredCore: plan?.masteredCore ?? 0,
    remainingPatterns: plan?.remainingPatterns ?? 0,
    expectedScore: plan?.expectedScore ?? 0,
    advice: plan?.advice || 'Pass60 분석을 실행하세요.',
    plan,
  };
}

export default {
  PASS60_ENGINE_VERSION,
  PASS60_TARGET,
  buildPass60Plan,
  getPass60DashboardCard,
};
