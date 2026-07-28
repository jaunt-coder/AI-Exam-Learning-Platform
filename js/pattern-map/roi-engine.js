/**
 * Sprint-19C — ROI Engine
 */

import { buildFrequencyMap } from './pattern-frequency.js';
import { buildPatternScore } from './pattern-score.js';
import { rankByPriority, persistPriority } from './pattern-priority.js';
import { formatStars } from './roi-calculator.js';
import { loadRoiDoc, saveRoiDoc } from './roi-storage.js';
import { getCurrentSubjectId } from '../subject/subject-adapter.js';

export const ROI_ENGINE_VERSION = '19C';

/**
 * Build ROI ranking for a subject pattern list.
 * @param {object[]} patterns
 * @param {{ subjectId?: string, subjectPoints?: number }} [opts]
 */
export function buildRoiRanking(patterns = [], opts = {}) {
  const subjectId = opts.subjectId || getCurrentSubjectId();
  const freq = buildFrequencyMap(
    (patterns || []).map((p) => ({ ...p, subjectId: p.subjectId || subjectId })),
  );
  const scores = freq.patterns.map((p) => buildPatternScore(p, {
    subjectId,
    totalFrequency: freq.totalFrequency,
    subjectPoints: opts.subjectPoints ?? 100,
  }));
  const ranked = rankByPriority(scores);
  const top10 = ranked.slice(0, 10).map((r) => ({
    ...r,
    starsLabel: formatStars(r.stars),
  }));

  persistPriority(subjectId, ranked);

  const doc = loadRoiDoc();
  if (!doc.bySubject) doc.bySubject = {};
  doc.bySubject[subjectId] = {
    subjectId,
    at: new Date().toISOString(),
    top10,
    all: ranked,
  };
  doc.top10 = top10;
  saveRoiDoc(doc);

  return {
    subjectId,
    totalPatterns: ranked.length,
    top10,
    ranked,
    version: ROI_ENGINE_VERSION,
  };
}

/**
 * Today mission: fill available minutes with TOP ROI patterns.
 * @param {object[]} ranked
 * @param {number} availableMinutes
 */
export function buildTodayRoiMission(ranked = [], availableMinutes = 180) {
  const budget = Math.max(20, Number(availableMinutes) || 180);
  const picks = [];
  let used = 0;
  let gain = 0;
  for (const row of ranked) {
    if (picks.length >= 3) break;
    const mins = Number(row.estimatedMinutes) || 30;
    if (used + mins > budget && picks.length > 0) continue;
    picks.push({
      patternId: row.patternId,
      name: row.name,
      minutes: mins,
      expectedScoreGain: row.expectedScoreGain,
      roi: row.roi,
      starsLabel: row.starsLabel || formatStars(row.stars),
    });
    used += mins;
    gain += Number(row.expectedScoreGain) || 0;
    if (used >= budget) break;
  }

  const mission = {
    availableMinutes: budget,
    usedMinutes: used,
    expectedScoreGain: Math.round(gain * 10) / 10,
    patterns: picks,
    message: picks.length
      ? `오늘 ${used}분 · ROI TOP${picks.length} Pattern · 예상 +${Math.round(gain * 10) / 10}점`
      : '추천 Pattern이 없습니다.',
  };

  const doc = loadRoiDoc();
  doc.todayMission = mission;
  saveRoiDoc(doc);
  return mission;
}

/**
 * Weekly ROI mission aggregate.
 */
export function buildWeekRoiMission(ranked = []) {
  const top = (ranked || []).slice(0, 8);
  const gain = top.reduce((s, r) => s + (Number(r.expectedScoreGain) || 0), 0);
  const minutes = top.reduce((s, r) => s + (Number(r.estimatedMinutes) || 0), 0);
  const mission = {
    patternCount: top.length,
    estimatedMinutes: minutes,
    expectedScoreGain: Math.round(gain * 10) / 10,
    message: `이번주 ROI Mission · 예상 점수 +${Math.round(gain * 10) / 10}`,
    patterns: top.map((r) => ({
      patternId: r.patternId,
      name: r.name,
      roi: r.roi,
      expectedScoreGain: r.expectedScoreGain,
    })),
  };
  const doc = loadRoiDoc();
  doc.weekMission = mission;
  saveRoiDoc(doc);
  return mission;
}

export function getRoiDashboardCard(subjectId) {
  const doc = loadRoiDoc();
  const sid = subjectId || getCurrentSubjectId();
  const pack = doc.bySubject?.[sid] || {};
  const top = pack.top10?.[0] || doc.top10?.[0] || null;
  return {
    id: 'roiGauge',
    title: 'ROI Gauge',
    subjectId: sid,
    topPattern: top?.name || '—',
    topRoi: top?.roi ?? 0,
    expectedGain: doc.todayMission?.expectedScoreGain ?? top?.expectedScoreGain ?? 0,
    studyTime: doc.todayMission?.usedMinutes ?? top?.estimatedMinutes ?? 0,
    todayMission: doc.todayMission,
    weekMission: doc.weekMission,
  };
}

export default {
  ROI_ENGINE_VERSION,
  buildRoiRanking,
  buildTodayRoiMission,
  buildWeekRoiMission,
  getRoiDashboardCard,
};
