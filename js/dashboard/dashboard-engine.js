/**
 * Sprint-14B — Dashboard Engine (UI projection only)
 * Consumes Learning Engine output. Does not recompute Mastery/Recommendation.
 */

import { getItem, setItem, STORAGE_KEYS } from '../storage.js';
import { buildLearningDashboard } from '../learning-engine/learning-engine.js';
import { getProgressSummary } from '../learning-engine/mastery-engine.js';
import { loadProgressDoc } from '../learning-engine/learning-storage.js';
import { getDueReviews, getUpcomingReviews, getReviewSummary } from '../learning-engine/review-engine.js';
import { loadRecommendations } from '../recommendation-service.js';
import { dayKey, daysAgo, pct, clamp } from './dashboard-utils.js';
import { saveDashboardCache, loadDashboardCache } from './dashboard-cache.js';
import { loadDashboardFilter } from './dashboard-filter.js';
import { getDashboardMistakeData } from '../solution-engine/solution-engine.js';
import { getGeminiDashboardStats } from '../gemini-solver/gemini-orchestrator.js';
import { getVisionDashboardStats } from '../gemini-vision/vision-recovery.js';
import { getAiConnectionStatus } from '../llm/ai-config.js';
import { getAiRuntimeDashboardStats } from '../llm/runtime/responses-runtime.js';
import { getProfessorDashboardStats } from '../professor-explanation/professor-cache.js';

export const DASHBOARD_STATE_KEY =
  STORAGE_KEYS.LEARNING_DASHBOARD_STATE_V1 || 'learning.dashboard-state.v1';

function emptyTodayStudy() {
  return {
    reviewCount: 0,
    recommendationCount: 0,
    examCount: 20,
    goalDone: 0,
    goalTarget: 30,
    progressPct: 0,
  };
}

function buildTodayStudy(le) {
  const reviewCount = Number(le?.review?.dueToday) || (le?.review?.todaysDue || []).length || 0;
  const recommendationCount = (le?.recommendations || []).length;
  const progress = le?.progress || getProgressSummary();
  const today = dayKey();
  const todayRow = (progress.daily || []).find((d) => d.date === today);
  const goalDone = Number(todayRow?.attempts) || 0;
  const goalTarget = 30;
  return {
    reviewCount,
    recommendationCount,
    examCount: 20,
    goalDone,
    goalTarget,
    progressPct: pct(goalDone, goalTarget),
  };
}

function buildMasterySummary(le) {
  const heatmap = Array.isArray(le?.heatmap) ? le.heatmap : [];
  const patternAvg = heatmap.length
    ? Math.round(heatmap.reduce((s, h) => s + (Number(h.score) || 0), 0) / heatmap.length)
    : 0;
  const progress = le?.progress || {};
  const accuracy = Math.round((Number(progress.accuracy) || 0) * 100);
  const chapterAvg = Math.round((patternAvg * 0.85 + accuracy * 0.15));
  return {
    question: clamp(accuracy || patternAvg, 0, 100),
    pattern: clamp(patternAvg, 0, 100),
    chapter: clamp(chapterAvg, 0, 100),
  };
}

function buildWeakPatterns(le, limit = 10) {
  return (le?.weakPatterns || []).slice(0, limit).map((wp) => ({
    patternId: wp.patternId,
    mastery: Number(wp.mastery?.score) || 0,
    wrongCount: (wp.signals || []).reduce((s, sig) => s + (Number(sig.count) || 0), 0),
    lastAttempt: wp.mastery?.lastAttemptAt || '—',
    signals: wp.signals || [],
  }));
}

function buildRecommendations(le) {
  const list = Array.isArray(le?.recommendations) ? le.recommendations : [];
  if (list.length) {
    return list.map((r) => ({
      id: r.recommendationId,
      patternId: r.patternId || null,
      questionId: r.questionId || null,
      priority: Number(r.priority) || 99,
      reason: r.reason || '',
      reasonCode: r.reasonCode || '',
      mastery: null,
      confidence: r.reasonCode === 'LOW_CONFIDENCE' ? 'Low' : 'Normal',
      estimatedMinutes: Number(r.estimatedMinutes) || 5,
    }));
  }
  const fallback = loadRecommendations().recommendations || [];
  return fallback
    .filter((r) => r.status === 'ACTIVE')
    .slice(0, 10)
    .map((r) => ({
      id: r.recommendationId,
      patternId: r.patternId || null,
      questionId: r.questionId || null,
      priority: Number(r.priority) || 99,
      reason: r.reason || '',
      reasonCode: r.reasonCode || '',
      mastery: null,
      confidence: 'Normal',
      estimatedMinutes: Number(r.estimatedMinutes) || 5,
    }));
}

function buildReviewBoard() {
  const due = getDueReviews();
  const upcoming = getUpcomingReviews(7);
  const summary = getReviewSummary();
  const now = new Date().toISOString();
  const overdue = due.filter((r) => r.nextReviewAt && r.nextReviewAt < now.slice(0, 10));
  return {
    today: due.slice(0, 20),
    overdue: overdue.slice(0, 20),
    upcoming: upcoming.filter((r) => !due.find((d) => d.questionId === r.questionId)).slice(0, 20),
    past: [],
    summary,
  };
}

function buildHeatmapDays(le) {
  const daily = le?.progress?.daily || getProgressSummary().daily || [];
  const byDate = new Map(daily.map((d) => [d.date, d]));
  const days = [];
  for (let i = 364; i >= 0; i -= 1) {
    const key = daysAgo(i);
    const row = byDate.get(key);
    days.push({
      date: key,
      solved: Number(row?.attempts) || 0,
      correct: Number(row?.correct) || 0,
    });
  }
  return days;
}

function buildGrowthSeries(le, metric) {
  const daily = (le?.progress?.daily || getProgressSummary().daily || []).slice(-30);
  return daily.map((d) => {
    let value = 0;
    if (metric === 'studyTime') value = (Number(d.attempts) || 0) * 3;
    else if (metric === 'mastery') {
      const acc = d.attempts ? (Number(d.correct) || 0) / d.attempts : 0;
      value = Math.round(acc * 100);
    } else {
      value = d.attempts ? Math.round(((Number(d.correct) || 0) / d.attempts) * 100) : 0;
    }
    return { date: d.date, value };
  });
}

function buildWeeklyStats(le) {
  const daily = (le?.progress?.daily || []).slice(-7);
  const attempts = daily.reduce((s, d) => s + (Number(d.attempts) || 0), 0);
  const correct = daily.reduce((s, d) => s + (Number(d.correct) || 0), 0);
  const minutes = attempts * 3;
  const accuracy = attempts ? Math.round((correct / attempts) * 100) : 0;
  const heatmap = (le?.heatmap || []).slice(0, 6);
  return {
    attempts,
    minutes,
    accuracy,
    radarLabels: heatmap.map((h) => h.patternId || 'P'),
    radarValues: heatmap.map((h) => Number(h.score) || 0),
  };
}

function buildRecentActivity(le) {
  const progressDoc = loadProgressDoc();
  const byQ = progressDoc.byQuestion || le?.progress?.byQuestion || {};
  return Object.entries(byQ)
    .map(([questionId, row]) => ({
      questionId,
      correct: Number(row.correct) || 0,
      incorrect: Number(row.incorrect) || 0,
      result: (Number(row.incorrect) || 0) > (Number(row.correct) || 0) ? 'WRONG' : 'OK',
      time: row.lastAttemptAt || '—',
      reviewed: Boolean(row.reviewStage),
    }))
    .sort((a, b) => String(b.time).localeCompare(String(a.time)))
    .slice(0, 12);
}

/**
 * Build Student Dashboard view-model from Learning Engine (read-only consume).
 */
export function buildStudentDashboardView(questions = [], patterns = []) {
  const filter = loadDashboardFilter();
  let le = null;
  try {
    le = buildLearningDashboard(questions, patterns);
  } catch (_e) {
    le = loadDashboardCache().payload?.learningEngine || null;
  }

  const view = {
    schemaVersion: 'v1',
    sprint: 'Sprint-14B',
    generatedAt: new Date().toISOString(),
    todayStudy: le ? buildTodayStudy(le) : emptyTodayStudy(),
    masterySummary: le ? buildMasterySummary(le) : { question: 0, pattern: 0, chapter: 0 },
    weakPatterns: le ? buildWeakPatterns(le, filter.weakLimit) : [],
    recommendations: le ? buildRecommendations(le) : [],
    reviewBoard: buildReviewBoard(),
    heatmapDays: buildHeatmapDays(le),
    growthSeries: buildGrowthSeries(le, filter.growthMetric),
    growthMetric: filter.growthMetric,
    weeklyStats: buildWeeklyStats(le || {}),
    recentActivity: buildRecentActivity(le || {}),
    learningEngine: le,
    /* Sprint-15A+ — Mistake Profile heatmap (storage only; LE formulas untouched) */
    mistakeHeatmap: getDashboardMistakeData(),
    /* Sprint-17A — Gemini Native Problem Solver metrics */
    geminiSolver: getGeminiDashboardStats(),
    /* Sprint-17D.3 — AI connection status card */
    aiStatus: (() => {
      const status = getAiConnectionStatus();
      const gem = getGeminiDashboardStats();
      const prof = getProfessorDashboardStats();
      return {
        ...status,
        cacheHit: (gem.cacheHit || 0) + (prof.cacheHit || 0),
        cacheMiss: (gem.cacheMiss || 0) + (prof.cacheMiss || 0),
        lastApi: status.lastApiAt || status.lastConnectedAt || null,
      };
    })(),
    aiRuntime: getAiRuntimeDashboardStats(),
    /* Sprint-17B — Vision OCR Recovery metrics */
    visionOcr: getVisionDashboardStats(),
  };

  saveDashboardCache(view);
  setItem(DASHBOARD_STATE_KEY, {
    schemaVersion: 'v1',
    lastRenderedAt: view.generatedAt,
    widgetCount: 10,
  });

  return view;
}

export default { buildStudentDashboardView, DASHBOARD_STATE_KEY };
