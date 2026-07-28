/**
 * Sprint-19C — Pattern Intelligence Map Engine (facade)
 * Pattern First · ROI First — never writes product DBs / LE formulas.
 */

import { getCurrentSubjectId, SUBJECT_FULL_NAMES } from '../subject/subject-adapter.js';
import { buildRoiRanking, buildTodayRoiMission, buildWeekRoiMission, getRoiDashboardCard } from './roi-engine.js';
import { buildPass60Plan, getPass60DashboardCard, PASS60_TARGET } from './pass60-engine.js';
import { buildWeaknessHeatmap, buildRoiHeatmap } from './pattern-heatmap.js';
import {
  buildPatternGraph,
  buildDdayRoiPlan,
  resolveExamDate,
  buildPatternDetailLinks,
} from './pattern-graph.js';
import { loadPatternMapDoc, savePatternMapDoc } from './roi-storage.js';
import { PATTERN_SEEDS } from '../import-engine/pattern-builder.js';

export const PATTERN_MAP_ENGINE_VERSION = '19C';

/** Fallback catalog when subject candidate JSON is unavailable */
function builtinPatterns(subjectId) {
  const seeds = PATTERN_SEEDS[subjectId] || PATTERN_SEEDS.accounting || [];
  return seeds.map((s, i) => ({
    patternId: s.id,
    patternCandidateId: `${s.id}_CAND`,
    name: s.name,
    subjectId,
    keywords: s.keywords,
    // Synthetic frequency for ranking demos (descending)
    frequency: Math.max(3, 14 - i * 2),
    questionIds: [],
    hitCount: Math.max(3, 14 - i * 2),
  }));
}

/** Extra economics demo rows matching Sprint copy */
function economicsDemoExtras() {
  return [
    {
      patternId: 'ECO_ELA',
      name: '가격탄력성',
      subjectId: 'economics',
      frequency: 11,
      questionIds: [],
      hitCount: 11,
    },
    {
      patternId: 'ECO_EQ',
      name: '시장균형',
      subjectId: 'economics',
      frequency: 9,
      questionIds: [],
      hitCount: 9,
    },
    {
      patternId: 'ECO_DS',
      name: '수요공급',
      subjectId: 'economics',
      frequency: 10,
      questionIds: [],
      hitCount: 10,
    },
    {
      patternId: 'ECO_NI',
      name: '국민소득',
      subjectId: 'economics',
      frequency: 7,
      questionIds: [],
      hitCount: 7,
    },
    {
      patternId: 'ECO_ISLM',
      name: 'IS-LM',
      subjectId: 'economics',
      frequency: 3,
      questionIds: [],
      hitCount: 3,
    },
  ];
}

/**
 * Load pattern candidates for a subject (fetch or builtin).
 * @param {string} subjectId
 */
export async function loadSubjectPatternCatalog(subjectId) {
  const id = subjectId || getCurrentSubjectId();
  try {
    const res = await fetch(`subjects/${id}/pattern-candidate.json`, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      let patterns = Array.isArray(json.patterns) ? json.patterns.map((p) => ({
        patternId: p.patternCandidateId || p.patternId || p.name,
        patternCandidateId: p.patternCandidateId,
        name: p.name,
        subjectId: p.subjectId || id,
        keywords: p.keywords,
        frequency: p.hitCount || (p.questionIds || []).length,
        hitCount: p.hitCount || (p.questionIds || []).length,
        questionIds: p.questionIds || [],
      })) : [];
      if (id === 'economics') {
        // Merge demo names used in Sprint storyboard if missing
        const names = new Set(patterns.map((p) => p.name));
        for (const extra of economicsDemoExtras()) {
          if (!names.has(extra.name)) patterns.push(extra);
        }
      }
      if (patterns.length) return patterns;
    }
  } catch (_e) {
    /* fall through */
  }
  let patterns = builtinPatterns(id);
  if (id === 'economics') patterns = [...economicsDemoExtras(), ...patterns];
  return patterns;
}

/**
 * Full Pattern Intelligence build for one subject.
 */
export async function buildPatternIntelligence(opts = {}) {
  const subjectId = opts.subjectId || getCurrentSubjectId();
  const patterns = opts.patterns || await loadSubjectPatternCatalog(subjectId);
  const availableMinutes = opts.availableMinutes ?? 180;

  const roi = buildRoiRanking(patterns, {
    subjectId,
    subjectPoints: opts.subjectPoints ?? 100,
  });
  const pass60 = buildPass60Plan(roi.ranked, {
    subjectId,
    targetScore: opts.targetScore ?? PASS60_TARGET,
    currentScore: opts.currentScore,
  });
  const today = buildTodayRoiMission(roi.ranked, availableMinutes);
  const week = buildWeekRoiMission(roi.ranked);
  const weaknessHeatmap = buildWeaknessHeatmap(roi.ranked);
  const roiHeatmap = buildRoiHeatmap(roi.ranked);
  const graph = buildPatternGraph(roi.ranked);
  const dday = buildDdayRoiPlan(resolveExamDate(opts.examDate), roi.ranked);

  const snapshot = {
    subjectId,
    subjectName: SUBJECT_FULL_NAMES[subjectId] || subjectId,
    generatedAt: new Date().toISOString(),
    totalPatterns: roi.totalPatterns,
    top10: roi.top10,
    ranked: roi.ranked,
    pass60,
    todayMission: today,
    weekMission: week,
    weaknessHeatmap,
    roiHeatmap,
    graph,
    dday,
    version: PATTERN_MAP_ENGINE_VERSION,
  };

  const doc = loadPatternMapDoc();
  if (!doc.bySubject) doc.bySubject = {};
  doc.bySubject[subjectId] = {
    subjectId,
    at: snapshot.generatedAt,
    totalPatterns: snapshot.totalPatterns,
    top10: snapshot.top10,
    pass60Summary: {
      remainingPatterns: pass60.remainingPatterns,
      expectedScore: pass60.expectedScore,
      advice: pass60.advice,
    },
  };
  doc.heatmap = { weakness: weaknessHeatmap, roi: roiHeatmap };
  savePatternMapDoc(doc);

  return snapshot;
}

/**
 * Export reports (PDF via print HTML, Markdown, HTML).
 */
export function exportPass60Report(plan, format = 'markdown') {
  const p = plan || {};
  const title = `Pass60 Report — ${p.subjectId || ''}`;
  const md = [
    `# ${title}`,
    '',
    `- 전체 Pattern: ${p.totalPatterns ?? 0}`,
    `- 합격 핵심 Pattern: ${p.corePatterns ?? 0}`,
    `- 현재 Master: ${p.masteredCore ?? 0}`,
    `- 남은 Pattern: ${p.remainingPatterns ?? 0}`,
    `- 예상 점수: ${p.expectedScore ?? 0}`,
    '',
    p.advice || '',
    '',
    '## Remaining Patterns',
    ...(p.remainingList || []).map(
      (r, i) => `${i + 1}. ${r.name} · ROI ${r.roi} · Mastery ${r.mastery}% · +${r.expectedScoreGain}`,
    ),
  ].join('\n');

  if (format === 'html') {
    return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>${title}</title></head><body><pre>${escapeHtml(md)}</pre></body></html>`;
  }
  if (format === 'pdf') {
    // Caller prints HTML; return HTML body for window.print
    return exportPass60Report(plan, 'html');
  }
  return md;
}

export function exportRoiReport(roiPack, format = 'markdown') {
  const top = roiPack?.top10 || roiPack?.ranked?.slice(0, 10) || [];
  const title = `ROI Report — ${roiPack?.subjectId || ''}`;
  const md = [
    `# ${title}`,
    '',
    '## ROI TOP10',
    ...top.map((r, i) => `${i + 1}. ${r.name} ${r.starsLabel || ''} ROI ${r.roi} · +${r.expectedScoreGain} / ${r.estimatedMinutes}분`),
  ].join('\n');
  if (format === 'html' || format === 'pdf') {
    return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>${title}</title></head><body><pre>${escapeHtml(md)}</pre></body></html>`;
  }
  return md;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function downloadText(filename, content, mime = 'text/plain') {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function getPatternMapDashboardCards(subjectId) {
  const sid = subjectId || getCurrentSubjectId();
  return {
    pass60: getPass60DashboardCard(sid),
    roi: getRoiDashboardCard(sid),
  };
}

export {
  buildPatternDetailLinks,
  getPass60DashboardCard,
  getRoiDashboardCard,
  buildRoiRanking,
  buildPass60Plan,
  buildTodayRoiMission,
  buildWeekRoiMission,
};

export default {
  PATTERN_MAP_ENGINE_VERSION,
  buildPatternIntelligence,
  loadSubjectPatternCatalog,
  exportPass60Report,
  exportRoiReport,
  downloadText,
  getPatternMapDashboardCards,
  buildPatternDetailLinks,
};
