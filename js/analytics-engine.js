/**
 * AI Exam Learning Platform v2
 * Analytics Engine — 학습 데이터 시각화 (Phase 7.1 + 7.2)
 *
 * 입력: LocalStorage progress / wrongAnswers / recentStudy / learningEvents + Recommendation 결과
 * data/*.json 읽기 전용 · 기존 엔진 변경 최소화
 */

import { getItem, STORAGE_KEYS } from './storage.js';
import { loadProgress, loadWrongAnswers } from './question-engine.js';
import {
  getPatternProgress,
  aggregateWrongByPattern,
  sortPatterns,
} from './pattern-engine.js';
import { loadExamHistory } from './exam-engine.js';
import {
  buildFullRecommendationReport,
  buildPatternUrl,
} from './recommendation-engine.js';
import { getWeaknessScore, getTodayDateKey } from './recommendation-rules.js';
import { PATTERN_NAMES } from './ai-tutor-content/pattern-profiles.js';
import {
  renderGrowthChart,
  renderWeaknessChart,
  observeChartResize,
} from './chart-engine.js';
import {
  loadLearningEvents,
  computeTotalDurationMinutes,
  EVENT_TYPES,
} from './learning-event.js';

/** 문항당 평균 학습 시간 추정 (분) — learningEvents·recentStudy 미기록 시 fallback */
const AVG_MINUTES_PER_QUESTION = 2.5;

let chartDisconnectors = [];

/**
 * recentStudy LocalStorage 읽기 (유연한 스키마)
 * @returns {{ sessions: array, totalMinutes: number }}
 */
export function loadRecentStudy() {
  const raw = getItem(STORAGE_KEYS.RECENT_STUDY, null);
  if (!raw) {
    return { sessions: [], totalMinutes: 0 };
  }

  if (Array.isArray(raw)) {
    const sessions = raw.filter((s) => s && typeof s === 'object');
    const totalMinutes = sessions.reduce(
      (sum, s) => sum + (Number(s.durationMinutes) || 0),
      0,
    );
    return { sessions, totalMinutes };
  }

  if (typeof raw === 'object') {
    if (typeof raw.totalMinutes === 'number') {
      return { sessions: raw.sessions || [], totalMinutes: raw.totalMinutes };
    }
    if (Array.isArray(raw.sessions)) {
      const totalMinutes = raw.sessions.reduce(
        (sum, s) => sum + (Number(s.durationMinutes) || 0),
        0,
      );
      return { sessions: raw.sessions, totalMinutes };
    }
  }

  return { sessions: [], totalMinutes: 0 };
}

/**
 * ISO → YYYY-MM-DD (로컬)
 * @param {string} iso
 */
export function toDateKey(iso) {
  if (!iso) return null;
  try {
    return getTodayDateKey(new Date(iso));
  } catch {
    return null;
  }
}

/**
 * 학습 시간(분) 산출 — learningEvents 우선, recentStudy·추정 fallback
 * @param {object} progress
 * @param {object} recentStudy
 * @param {object} examHistory
 * @param {object} [learningEventsStore]
 */
export function computeStudyTimeMinutes(progress, recentStudy, examHistory, learningEventsStore) {
  const eventsStore = learningEventsStore ?? loadLearningEvents();
  const eventMinutes = computeTotalDurationMinutes(eventsStore.events);

  if (eventMinutes > 0) {
    return eventMinutes;
  }

  const examMinutes = (examHistory.records || []).reduce(
    (sum, r) => sum + (Number(r.elapsedSeconds) || 0) / 60,
    0,
  );

  if (recentStudy.totalMinutes > 0) {
    return Math.round(recentStudy.totalMinutes + examMinutes);
  }

  const answeredCount = Object.keys(progress.answered || {}).length;
  const estimated = Math.round(answeredCount * AVG_MINUTES_PER_QUESTION + examMinutes);
  return estimated;
}

/**
 * @param {number} minutes
 */
export function formatStudyTime(minutes) {
  if (minutes < 1) return '0분';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

/**
 * progress.answered → 날짜별 추이
 * @param {object} progress
 * @param {number} [maxDays]
 */
export function buildDailyTrend(progress, maxDays = 14) {
  const byDate = {};

  Object.values(progress.answered || {}).forEach((entry) => {
    const key = toDateKey(entry.answeredAt);
    if (!key) return;

    if (!byDate[key]) {
      byDate[key] = { date: key, answered: 0, correct: 0, accuracy: 0 };
    }
    byDate[key].answered += 1;
    if (entry.correct) byDate[key].correct += 1;
  });

  const sorted = Object.values(byDate)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-maxDays);

  sorted.forEach((row) => {
    row.accuracy = row.answered
      ? Math.round((row.correct / row.answered) * 100)
      : 0;
  });

  return sorted;
}

/**
 * 취약도 등급
 * @param {number} score
 */
export function toWeaknessLevel(score) {
  if (score >= 60) return 'HIGH';
  if (score >= 35) return 'MEDIUM';
  return 'LOW';
}

/**
 * Pattern별 분석
 * @param {array} patterns
 * @param {array} questions
 * @param {object} progress
 * @param {object} wrongByPattern
 */
export function buildPatternAnalytics(patterns, questions, progress, wrongByPattern) {
  return sortPatterns(patterns).map((pattern) => {
    const patternId = pattern.patternId;
    const prog = getPatternProgress(patternId, questions, progress);
    const wrong = wrongByPattern[patternId];

    let lastStudyAt = null;
    questions
      .filter((q) => q.patternId === patternId)
      .forEach((q) => {
        const answered = progress.answered[q.questionId];
        if (answered?.answeredAt) {
          if (!lastStudyAt || answered.answeredAt > lastStudyAt) {
            lastStudyAt = answered.answeredAt;
          }
        }
      });

    const weaknessScore = getWeaknessScore({
      correctPercent: prog.correctPercent,
      totalWrongCount: wrong?.totalWrongCount ?? 0,
      questionWrongCount: wrong?.questionCount ?? 0,
      answeredCount: prog.answered,
      totalQuestions: prog.total,
    });

    return {
      patternId,
      name: pattern.name || PATTERN_NAMES[patternId] || patternId,
      grade: pattern.grade,
      attemptCount: prog.answered,
      totalQuestions: prog.total,
      correctCount: prog.correct,
      correctPercent: prog.correctPercent,
      lastStudyDate: lastStudyAt ? toDateKey(lastStudyAt) : null,
      lastStudyAt,
      weaknessScore,
      weaknessLevel: toWeaknessLevel(weaknessScore),
      wrongCount: wrong?.totalWrongCount ?? 0,
    };
  });
}

/**
 * 취약 Pattern TOP N
 * @param {array} patternAnalytics
 * @param {number} limit
 */
export function buildWeakPatternsTop(patternAnalytics, limit = 3) {
  const studied = patternAnalytics.filter((p) => p.attemptCount > 0 || p.wrongCount > 0);

  return [...studied]
    .sort((a, b) => {
      if (b.weaknessScore !== a.weaknessScore) {
        return b.weaknessScore - a.weaknessScore;
      }
      return b.wrongCount - a.wrongCount;
    })
    .slice(0, limit);
}

/**
 * 전체 학습 현황
 * @param {object} progress
 * @param {object} wrongStore
 * @param {object} recentStudy
 * @param {object} examHistory
 * @param {array} patterns
 * @param {array} patternAnalytics
 * @param {object} [learningEventsStore]
 */
export function buildOverallStats(
  progress,
  wrongStore,
  recentStudy,
  examHistory,
  patterns,
  patternAnalytics,
  learningEventsStore,
) {
  const { totalAnswered, totalCorrect } = progress.stats;
  const accuracyPercent =
    totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
  const wrongRatePercent = totalAnswered > 0 ? 100 - accuracyPercent : 0;
  const studyTimeMinutes = computeStudyTimeMinutes(
    progress,
    recentStudy,
    examHistory,
    learningEventsStore,
  );
  const studiedPatterns = patternAnalytics.filter((p) => p.attemptCount > 0).length;
  const totalWrongQuestions = Object.keys(wrongStore.items || {}).length;

  return {
    totalAnswered,
    totalCorrect,
    accuracyPercent,
    wrongRatePercent,
    studyTimeMinutes,
    studyTimeFormatted: formatStudyTime(studyTimeMinutes),
    studiedPatterns,
    totalPatterns: patterns.length,
    totalWrongQuestions,
    date: getTodayDateKey(),
  };
}

/**
 * 전체 Analytics 리포트
 * @param {array} patterns
 * @param {array} questions
 * @param {array} statistics
 * @param {object} [options]
 */
export function buildAnalyticsReport(patterns, questions, statistics, options = {}) {
  const progress = options.progress ?? loadProgress();
  const wrongStore = options.wrongStore ?? loadWrongAnswers();
  const recentStudy = options.recentStudy ?? loadRecentStudy();
  const examHistory = options.examHistory ?? loadExamHistory();
  const learningEventsStore = options.learningEvents ?? loadLearningEvents();
  const wrongByPattern = aggregateWrongByPattern(wrongStore);

  const patternAnalytics = buildPatternAnalytics(
    patterns,
    questions,
    progress,
    wrongByPattern,
  );

  const overall = buildOverallStats(
    progress,
    wrongStore,
    recentStudy,
    examHistory,
    patterns,
    patternAnalytics,
    learningEventsStore,
  );

  const dailyTrend = buildDailyTrend(progress, options.trendDays ?? 14);
  const weakPatternsTop = buildWeakPatternsTop(
    patternAnalytics,
    options.weakLimit ?? 3,
  );

  const recommendation = buildFullRecommendationReport(
    patterns,
    questions,
    statistics,
    {
      progress,
      wrongStore,
      dailyLimit: options.dailyLimit ?? 3,
    },
  );

  return {
    generatedAt: new Date().toISOString(),
    overall,
    patternAnalytics,
    dailyTrend,
    weakPatternsTop,
    recommendation,
  };
}

/** Timeline 분석 기본 일수 */
export const TIMELINE_DAYS = 14;

/**
 * 최근 N일 날짜 키 배열 (오늘 포함, 오름차순)
 * @param {number} [maxDays]
 * @param {Date} [anchor]
 */
export function buildDateRange(maxDays = TIMELINE_DAYS, anchor = new Date()) {
  const keys = [];
  for (let i = maxDays - 1; i >= 0; i -= 1) {
    const d = new Date(anchor);
    d.setDate(d.getDate() - i);
    keys.push(getTodayDateKey(d));
  }
  return keys;
}

/**
 * learningEvents → 날짜별 학습 시간·풀이량
 * @param {array} events
 * @param {number} [maxDays]
 */
export function buildEventDailyTimeline(events, maxDays = TIMELINE_DAYS) {
  const dateKeys = buildDateRange(maxDays);
  const byDate = Object.fromEntries(
    dateKeys.map((date) => [
      date,
      { date, studyMinutes: 0, answered: 0, tutorViews: 0 },
    ]),
  );

  (events || []).forEach((event) => {
    if (!event?.date || !byDate[event.date]) return;

    const seconds = Number(event.duration) || 0;
    if (seconds > 0) {
      byDate[event.date].studyMinutes += seconds / 60;
    }

    if (event.type === EVENT_TYPES.QUESTION_ANSWER) {
      byDate[event.date].answered += 1;
    }

    if (event.type === EVENT_TYPES.TUTOR_VIEW) {
      byDate[event.date].tutorViews += 1;
    }
  });

  return dateKeys.map((date) => {
    const row = byDate[date];
    return {
      ...row,
      studyMinutes: Math.round(row.studyMinutes * 10) / 10,
    };
  });
}

/**
 * @param {number[]} values
 * @param {number} windowSize
 */
export function computeMovingAverage(values, windowSize = 3) {
  if (!Array.isArray(values) || values.length === 0) return [];

  return values.map((_, index) => {
    const start = Math.max(0, index - windowSize + 1);
    const slice = values.slice(start, index + 1).filter((v) => v !== null && v !== undefined);
    if (slice.length === 0) return null;
    const sum = slice.reduce((acc, v) => acc + v, 0);
    return Math.round((sum / slice.length) * 10) / 10;
  });
}

/**
 * learningEvents → 날짜별 정답률 + 이동 평균
 * @param {array} events
 * @param {number} [maxDays]
 * @param {number} [windowSize]
 */
export function buildEventAccuracyTrend(events, maxDays = TIMELINE_DAYS, windowSize = 3) {
  const dateKeys = buildDateRange(maxDays);
  const byDate = Object.fromEntries(
    dateKeys.map((date) => [date, { date, answered: 0, correct: 0, accuracy: null }]),
  );

  (events || []).forEach((event) => {
    if (event?.type !== EVENT_TYPES.QUESTION_ANSWER || !event.date || !byDate[event.date]) {
      return;
    }
    if (event.correct === null || event.correct === undefined) return;

    byDate[event.date].answered += 1;
    if (event.correct) byDate[event.date].correct += 1;
  });

  const rows = dateKeys.map((date) => {
    const row = byDate[date];
    row.accuracy = row.answered
      ? Math.round((row.correct / row.answered) * 100)
      : null;
    return row;
  });

  const accuracySeries = rows.map((r) => r.accuracy);
  const movingAverage = computeMovingAverage(
    accuracySeries.map((v) => (v === null ? null : v)),
    windowSize,
  );

  rows.forEach((row, index) => {
    row.movingAverage = movingAverage[index];
  });

  return rows;
}

/**
 * AI Tutor 활용 분석
 * @param {array} events
 */
export function buildTutorAnalytics(events) {
  const answerEvents = (events || []).filter((e) => e?.type === EVENT_TYPES.QUESTION_ANSWER);
  const tutorViews = (events || []).filter((e) => e?.type === EVENT_TYPES.TUTOR_VIEW);
  const tutorUsedAnswers = answerEvents.filter((e) => e.usedTutor);

  const totalAnswered = answerEvents.length;
  const tutorViewCount = tutorViews.length;
  const tutorUsedCount = tutorUsedAnswers.length;

  const usageRatio = totalAnswered
    ? Math.round((tutorUsedCount / totalAnswered) * 100)
    : 0;
  const viewRatio = totalAnswered
    ? Math.round((tutorViewCount / totalAnswered) * 100)
    : 0;

  const dailyMap = {};
  tutorViews.forEach((event) => {
    if (!event.date) return;
    dailyMap[event.date] = (dailyMap[event.date] || 0) + 1;
  });

  const dailyViews = buildDateRange(TIMELINE_DAYS).map((date) => ({
    date,
    count: dailyMap[date] || 0,
  }));

  return {
    totalAnswered,
    tutorViewCount,
    tutorUsedCount,
    usageRatio,
    viewRatio,
    dailyViews,
  };
}

/**
 * Pattern별 기간 내 정답률
 * @param {array} events
 * @param {Set<string>} dateSet
 */
function patternAccuracyInPeriod(events, dateSet) {
  const stats = {};

  (events || []).forEach((event) => {
    if (event?.type !== EVENT_TYPES.QUESTION_ANSWER || !event.patternId) return;
    if (!dateSet.has(event.date)) return;
    if (event.correct === null || event.correct === undefined) return;

    if (!stats[event.patternId]) {
      stats[event.patternId] = { answered: 0, correct: 0 };
    }
    stats[event.patternId].answered += 1;
    if (event.correct) stats[event.patternId].correct += 1;
  });

  Object.keys(stats).forEach((patternId) => {
    const row = stats[patternId];
    row.accuracy = row.answered
      ? Math.round((row.correct / row.answered) * 100)
      : null;
  });

  return stats;
}

/**
 * 학습 습관 분석 — 시간대·Pattern·취약 변화
 * @param {array} events
 * @param {array} patterns
 * @param {number} [maxDays]
 */
export function buildLearningHabits(events, patterns, maxDays = TIMELINE_DAYS) {
  const dateKeys = buildDateRange(maxDays);
  const hourCounts = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
  const patternCounts = {};

  (events || []).forEach((event) => {
    if (!dateKeys.includes(event?.date)) return;

    if (
      event.type === EVENT_TYPES.QUESTION_ANSWER
      || event.type === EVENT_TYPES.QUESTION_START
    ) {
      if (event.timestamp) {
        const hour = new Date(event.timestamp).getHours();
        if (hour >= 0 && hour <= 23) {
          hourCounts[hour].count += 1;
        }
      }

      if (event.patternId) {
        patternCounts[event.patternId] = (patternCounts[event.patternId] || 0) + 1;
      }
    }
  });

  const peakHourRow = hourCounts.reduce(
    (best, row) => (row.count > best.count ? row : best),
    { hour: 0, count: 0 },
  );

  const patternNameMap = Object.fromEntries(
    (patterns || []).map((p) => [p.patternId, p.name || PATTERN_NAMES[p.patternId] || p.patternId]),
  );

  const topPatternEntry = Object.entries(patternCounts).sort((a, b) => b[1] - a[1])[0];
  const topPattern = topPatternEntry
    ? {
        patternId: topPatternEntry[0],
        name: patternNameMap[topPatternEntry[0]] || topPatternEntry[0],
        count: topPatternEntry[1],
      }
    : null;

  const mid = Math.floor(dateKeys.length / 2);
  const firstHalfDates = new Set(dateKeys.slice(0, mid));
  const secondHalfDates = new Set(dateKeys.slice(mid));

  const firstStats = patternAccuracyInPeriod(events, firstHalfDates);
  const secondStats = patternAccuracyInPeriod(events, secondHalfDates);

  const weakChanges = [];
  Object.keys(secondStats).forEach((patternId) => {
    const early = firstStats[patternId];
    const late = secondStats[patternId];
    if (!early?.accuracy || !late?.accuracy) return;
    if (late.accuracy >= early.accuracy) return;

    weakChanges.push({
      patternId,
      name: patternNameMap[patternId] || patternId,
      earlyAccuracy: early.accuracy,
      lateAccuracy: late.accuracy,
      change: late.accuracy - early.accuracy,
      lateAnswered: late.answered,
    });
  });

  weakChanges.sort((a, b) => a.change - b.change);

  return {
    peakHour: peakHourRow.count > 0 ? peakHourRow.hour : null,
    peakHourCount: peakHourRow.count,
    hourDistribution: hourCounts,
    topPattern,
    weakPatternChanges: weakChanges.slice(0, 5),
  };
}

/**
 * Timeline Analytics 전체 리포트 (learningEvents 기반)
 * @param {array} patterns
 * @param {array} questions
 * @param {object} [options]
 */
export function buildTimelineReport(patterns, questions, options = {}) {
  const learningEventsStore = options.learningEvents ?? loadLearningEvents();
  const events = learningEventsStore.events || [];
  const maxDays = options.timelineDays ?? TIMELINE_DAYS;
  const movingWindow = options.movingWindow ?? 3;

  const dailyTimeline = buildEventDailyTimeline(events, maxDays);
  const accuracyTrend = buildEventAccuracyTrend(events, maxDays, movingWindow);
  const tutorAnalytics = buildTutorAnalytics(events);
  const habits = buildLearningHabits(events, patterns, maxDays);

  const totalStudyMinutes = Math.round(
    dailyTimeline.reduce((sum, row) => sum + row.studyMinutes, 0),
  );
  const totalAnswered = dailyTimeline.reduce((sum, row) => sum + row.answered, 0);
  const daysActive = dailyTimeline.filter(
    (row) => row.studyMinutes > 0 || row.answered > 0,
  ).length;

  const accuracyRows = accuracyTrend.filter((row) => row.accuracy !== null);
  const avgAccuracy = accuracyRows.length
    ? Math.round(
        accuracyRows.reduce((sum, row) => sum + row.accuracy, 0) / accuracyRows.length,
      )
    : 0;

  return {
    generatedAt: new Date().toISOString(),
    date: getTodayDateKey(),
    maxDays,
    eventCount: events.length,
    summary: {
      totalStudyMinutes,
      totalStudyFormatted: formatStudyTime(totalStudyMinutes),
      totalAnswered,
      daysActive,
      avgAccuracy,
      tutorUsageRatio: tutorAnalytics.usageRatio,
    },
    dailyTimeline,
    accuracyTrend,
    tutorAnalytics,
    habits,
  };
}

function applyTheme() {
  document.documentElement.setAttribute(
    'data-theme',
    getItem(STORAGE_KEYS.THEME, 'light'),
  );
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function weaknessBadgeClass(level) {
  return `vuln-badge vuln-badge--${level.toLowerCase()}`;
}

function weaknessLabel(level) {
  if (level === 'HIGH') return '취약';
  if (level === 'MEDIUM') return '주의';
  return '양호';
}

function renderOverallStats(overall) {
  const el = document.getElementById('analytics-summary');
  if (!el) return;

  el.innerHTML = `
    <div class="summary-item">
      <span class="summary-item__value">${overall.totalAnswered}</span>
      <span class="summary-item__label">풀이 문항</span>
    </div>
    <div class="summary-item">
      <span class="summary-item__value summary-item__value--success">${overall.accuracyPercent}%</span>
      <span class="summary-item__label">정답률</span>
    </div>
    <div class="summary-item">
      <span class="summary-item__value summary-item__value--warn">${overall.wrongRatePercent}%</span>
      <span class="summary-item__label">오답률</span>
    </div>
    <div class="summary-item">
      <span class="summary-item__value">${overall.studyTimeFormatted}</span>
      <span class="summary-item__label">학습 시간</span>
    </div>
  `;

  const meta = document.getElementById('analytics-meta');
  if (meta) {
    meta.textContent = `${overall.date} 기준 · Pattern ${overall.studiedPatterns}/${overall.totalPatterns} 학습 · 오답 ${overall.totalWrongQuestions}문항`;
  }
}

function renderPatternTable(patternAnalytics) {
  const tbody = document.getElementById('pattern-table-body');
  if (!tbody) return;

  const studied = patternAnalytics.filter((p) => p.attemptCount > 0);

  if (studied.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="table-empty">아직 Pattern 학습 기록이 없습니다.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = studied
    .map(
      (p) => `
    <tr>
      <td>
        <a href="${buildPatternUrl(p.patternId)}" class="pattern-link">${escapeHtml(p.name)}</a>
        <span class="pattern-grade">${escapeHtml(p.grade)}</span>
      </td>
      <td>${p.correctPercent}%</td>
      <td>${p.attemptCount} / ${p.totalQuestions}</td>
      <td>${p.lastStudyDate || '—'}</td>
      <td><span class="${weaknessBadgeClass(p.weaknessLevel)}">${weaknessLabel(p.weaknessLevel)}</span> ${p.weaknessScore}</td>
      <td>
        <a href="question.html?pattern=${encodeURIComponent(p.patternId)}" class="button button--ghost button--sm">풀이</a>
      </td>
    </tr>
  `,
    )
    .join('');
}

function renderWeakTop(weakPatternsTop) {
  const listEl = document.getElementById('weak-top-list');
  if (!listEl) return;

  if (weakPatternsTop.length === 0) {
    listEl.innerHTML =
      '<li><p class="section-desc">취약 Pattern이 없습니다. 학습을 시작해 보세요.</p></li>';
    return;
  }

  listEl.innerHTML = weakPatternsTop
    .map(
      (p, index) => `
    <li class="weak-top-card">
      <span class="weak-top-rank">#${index + 1}</span>
      <div class="weak-top-body">
        <h4>${escapeHtml(p.name)}</h4>
        <p class="weak-top-meta">정답률 ${p.correctPercent}% · 시도 ${p.attemptCount}회 · 오답 ${p.wrongCount}회</p>
        <span class="${weaknessBadgeClass(p.weaknessLevel)}">${weaknessLabel(p.weaknessLevel)}</span>
      </div>
      <a href="${buildPatternUrl(p.patternId)}" class="button button--danger button--sm">복습</a>
    </li>
  `,
    )
    .join('');
}

function renderDailyRecommendations(dailyItems) {
  const listEl = document.getElementById('recommend-quick-list');
  if (!listEl) return;

  if (!dailyItems || dailyItems.length === 0) {
    listEl.innerHTML =
      '<li><p class="section-desc">추천 데이터가 없습니다. 문제를 풀면 맞춤 추천이 생성됩니다.</p></li>';
    return;
  }

  listEl.innerHTML = dailyItems
    .map(
      (item) => `
    <li class="recommend-quick-card">
      <span class="recommend-badge">#${item.priority}</span>
      <h4>${escapeHtml(item.title)}</h4>
      <p class="recommend-quick-score">${item.score}점</p>
      <div class="recommend-actions">
        <a href="${item.links.pattern}" class="button button--primary button--sm">Pattern 학습</a>
        <a href="${item.links.question}" class="button button--secondary button--sm">문제 풀이</a>
      </div>
    </li>
  `,
    )
    .join('');
}

function mountCharts(report) {
  chartDisconnectors.forEach((fn) => fn());
  chartDisconnectors = [];

  const growthCanvas = document.getElementById('growth-chart');
  const weakCanvas = document.getElementById('weakness-chart');

  if (growthCanvas) {
    const renderGrowth = () =>
      renderGrowthChart(growthCanvas, report.dailyTrend, {
        title: '날짜별 풀이량 · 정답률',
        emptyLabel: '날짜별 학습 기록이 없습니다. 문제를 풀어 보세요.',
      });
    chartDisconnectors.push(observeChartResize(growthCanvas, renderGrowth));
  }

  if (weakCanvas) {
    const weakItems = report.weakPatternsTop.map((p) => ({
      label: p.name,
      value: p.weaknessScore,
      sublabel: `정답률 ${p.correctPercent}% · 오답 ${p.wrongCount}회`,
    }));

    const renderWeak = () =>
      renderWeaknessChart(weakCanvas, weakItems, {
        title: '취약 Pattern TOP 3',
        emptyLabel: '취약 Pattern 데이터가 없습니다.',
      });
    chartDisconnectors.push(observeChartResize(weakCanvas, renderWeak));
  }
}

function renderAnalyticsPage(report) {
  renderOverallStats(report.overall);
  renderPatternTable(report.patternAnalytics);
  renderWeakTop(report.weakPatternsTop);
  renderDailyRecommendations(report.recommendation.daily);
  mountCharts(report);
}

/**
 * Analytics Dashboard 페이지 초기화
 */
export async function initAnalyticsPage() {
  applyTheme();

  const loadingEl = document.getElementById('loading-state');
  const errorEl = document.getElementById('error-state');
  const sectionEl = document.getElementById('analytics-section');
  const emptyEl = document.getElementById('empty-state');

  try {
    const { loadPhase1Database } = await import('./data-loader.js');
    const db = await loadPhase1Database();

    if (!db.valid) {
      throw new Error(`Database 검증 실패: ${db.errors.join(', ')}`);
    }

    const report = buildAnalyticsReport(db.patterns, db.questions, db.statistics);

    if (loadingEl) loadingEl.hidden = true;

    const hasActivity = report.overall.totalAnswered > 0;

    if (!hasActivity) {
      if (emptyEl) emptyEl.hidden = false;
      return;
    }

    if (sectionEl) sectionEl.hidden = false;
    renderAnalyticsPage(report);
  } catch (error) {
    if (loadingEl) loadingEl.hidden = true;
    if (errorEl) {
      errorEl.hidden = false;
      const msg = document.getElementById('error-message');
      if (msg) msg.textContent = error.message || 'Analytics 데이터를 불러올 수 없습니다.';
    }
    console.error('[Analytics]', error);
  }
}
