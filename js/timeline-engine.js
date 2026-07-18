/**
 * AI Exam Learning Platform v2
 * Timeline Engine — learningEvents 기반 Timeline Dashboard (Phase 7.3)
 *
 * Canvas 차트 · GitHub Pages 호환 · 외부 라이브러리 없음
 */

import { getItem, STORAGE_KEYS } from './storage.js';
import {
  buildTimelineReport,
} from './analytics-engine.js';
import { buildPatternUrl } from './recommendation-engine.js';
import { observeChartResize } from './chart-engine.js';

let chartDisconnectors = [];

function cssVar(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function setupCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width: rect.width, height: rect.height };
}

function drawEmptyChart(ctx, width, height, label) {
  ctx.fillStyle = cssVar('--color-text-muted', '#64748b');
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label || '학습 이벤트가 없습니다', width / 2, height / 2);
}

/**
 * Daily Study Timeline — 학습 시간(막대) + 풀이량(선)
 * @param {HTMLCanvasElement} canvas
 * @param {array} dailyTimeline
 * @param {object} [options]
 */
export function renderDailyTimelineChart(canvas, dailyTimeline, options = {}) {
  if (!canvas) return;

  const { ctx, width, height } = setupCanvas(canvas);
  const padding = { top: 28, right: 48, bottom: 40, left: 48 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = cssVar('--color-surface', '#ffffff');
  ctx.fillRect(0, 0, width, height);

  const hasData = dailyTimeline?.some((d) => d.studyMinutes > 0 || d.answered > 0);
  if (!hasData) {
    drawEmptyChart(ctx, width, height, options.emptyLabel);
    return;
  }

  const maxMinutes = Math.max(1, ...dailyTimeline.map((d) => d.studyMinutes));
  const maxAnswered = Math.max(1, ...dailyTimeline.map((d) => d.answered));
  const gap = chartW / dailyTimeline.length;
  const barWidth = Math.min(36, gap * 0.45);

  const primary = cssVar('--color-primary', '#2563eb');
  const accent = cssVar('--color-success', '#16a34a');
  const muted = cssVar('--color-text-muted', '#64748b');
  const text = cssVar('--color-text', '#1e293b');

  ctx.fillStyle = text;
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(options.title || 'Daily Study Timeline (14일)', padding.left, 16);

  const linePoints = [];

  dailyTimeline.forEach((point, index) => {
    const cx = padding.left + gap * index + gap / 2;
    const barH = (point.studyMinutes / maxMinutes) * chartH;
    const barX = cx - barWidth / 2;
    const barY = padding.top + chartH - barH;

    ctx.fillStyle = primary;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(barX, barY, barWidth, barH);
    ctx.globalAlpha = 1;

    const answerY = padding.top + chartH - (point.answered / maxAnswered) * chartH;
    linePoints.push({ x: cx, y: answerY });

    ctx.fillStyle = muted;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(point.date.slice(5), cx, height - padding.bottom + 16);
  });

  if (linePoints.length > 1) {
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    linePoints.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    linePoints.forEach((p) => {
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  ctx.fillStyle = primary;
  ctx.fillRect(padding.left, height - 12, 10, 10);
  ctx.fillStyle = muted;
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('학습 시간(분)', padding.left + 14, height - 3);

  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(padding.left + 108, height - 7, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = muted;
  ctx.fillText('풀이량', padding.left + 116, height - 3);
}

/**
 * Accuracy Growth — 정답률 + 이동 평균
 * @param {HTMLCanvasElement} canvas
 * @param {array} accuracyTrend
 * @param {object} [options]
 */
export function renderAccuracyGrowthChart(canvas, accuracyTrend, options = {}) {
  if (!canvas) return;

  const { ctx, width, height } = setupCanvas(canvas);
  const padding = { top: 28, right: 24, bottom: 40, left: 48 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = cssVar('--color-surface', '#ffffff');
  ctx.fillRect(0, 0, width, height);

  const points = (accuracyTrend || []).filter((row) => row.accuracy !== null);
  if (points.length === 0) {
    drawEmptyChart(ctx, width, height, options.emptyLabel);
    return;
  }

  const gap = chartW / accuracyTrend.length;
  const primary = cssVar('--color-primary', '#2563eb');
  const warn = '#ea580c';
  const muted = cssVar('--color-text-muted', '#64748b');
  const text = cssVar('--color-text', '#1e293b');

  ctx.fillStyle = text;
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(options.title || 'Accuracy Growth', padding.left, 16);

  ctx.strokeStyle = cssVar('--color-border', '#e2e8f0');
  ctx.setLineDash([4, 4]);
  for (let i = 0; i <= 4; i += 1) {
    const y = padding.top + (chartH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  const accPoints = [];
  const maPoints = [];

  accuracyTrend.forEach((row, index) => {
    const cx = padding.left + gap * index + gap / 2;

    if (row.accuracy !== null) {
      accPoints.push({
        x: cx,
        y: padding.top + chartH - (row.accuracy / 100) * chartH,
      });
    }

    if (row.movingAverage !== null && row.movingAverage !== undefined) {
      maPoints.push({
        x: cx,
        y: padding.top + chartH - (row.movingAverage / 100) * chartH,
      });
    }

    ctx.fillStyle = muted;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(row.date.slice(5), cx, height - padding.bottom + 16);
  });

  function drawLine(linePoints, color, widthPx) {
    if (linePoints.length < 2) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = widthPx;
    ctx.beginPath();
    linePoints.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
  }

  drawLine(accPoints, primary, 2);
  drawLine(maPoints, warn, 2);

  accPoints.forEach((p) => {
    ctx.fillStyle = primary;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = primary;
  ctx.fillRect(padding.left, height - 12, 10, 10);
  ctx.fillStyle = muted;
  ctx.font = '11px sans-serif';
  ctx.fillText('일별 정답률', padding.left + 14, height - 3);

  ctx.strokeStyle = warn;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding.left + 88, height - 10);
  ctx.lineTo(padding.left + 108, height - 10);
  ctx.stroke();
  ctx.fillStyle = muted;
  ctx.fillText('이동 평균', padding.left + 112, height - 3);
}

/**
 * Tutor Usage — 일별 tutor_view + 활용 비율 요약
 * @param {HTMLCanvasElement} canvas
 * @param {object} tutorAnalytics
 * @param {object} [options]
 */
export function renderTutorUsageChart(canvas, tutorAnalytics, options = {}) {
  if (!canvas) return;

  const { ctx, width, height } = setupCanvas(canvas);
  const padding = { top: 28, right: 24, bottom: 40, left: 48 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = cssVar('--color-surface', '#ffffff');
  ctx.fillRect(0, 0, width, height);

  const dailyViews = tutorAnalytics?.dailyViews || [];
  const hasData = dailyViews.some((d) => d.count > 0) || tutorAnalytics?.tutorViewCount > 0;

  if (!hasData) {
    drawEmptyChart(ctx, width, height, options.emptyLabel);
    return;
  }

  const maxCount = Math.max(1, ...dailyViews.map((d) => d.count));
  const gap = chartW / dailyViews.length;
  const barWidth = Math.min(32, gap * 0.5);
  const tutorColor = '#7c3aed';
  const muted = cssVar('--color-text-muted', '#64748b');
  const text = cssVar('--color-text', '#1e293b');

  ctx.fillStyle = text;
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(options.title || 'Tutor Usage Analytics', padding.left, 16);

  dailyViews.forEach((point, index) => {
    const cx = padding.left + gap * index + gap / 2;
    const barH = (point.count / maxCount) * chartH;
    const barX = cx - barWidth / 2;
    const barY = padding.top + chartH - barH;

    ctx.fillStyle = tutorColor;
    ctx.globalAlpha = 0.88;
    ctx.fillRect(barX, barY, barWidth, barH);
    ctx.globalAlpha = 1;

    ctx.fillStyle = muted;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(point.date.slice(5), cx, height - padding.bottom + 16);
  });

  ctx.fillStyle = muted;
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(
    `활용 ${tutorAnalytics.usageRatio}% · 조회 ${tutorAnalytics.viewRatio}%`,
    width - padding.right,
    16,
  );
}

/**
 * 시간대별 학습 분포
 * @param {HTMLCanvasElement} canvas
 * @param {array} hourDistribution
 * @param {object} [options]
 */
export function renderHourlyHabitChart(canvas, hourDistribution, options = {}) {
  if (!canvas) return;

  const { ctx, width, height } = setupCanvas(canvas);
  const padding = { top: 28, right: 16, bottom: 36, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = cssVar('--color-surface', '#ffffff');
  ctx.fillRect(0, 0, width, height);

  const rows = hourDistribution || [];
  const maxCount = Math.max(1, ...rows.map((r) => r.count));
  const hasData = rows.some((r) => r.count > 0);

  if (!hasData) {
    drawEmptyChart(ctx, width, height, options.emptyLabel);
    return;
  }

  const gap = chartW / 24;
  const barWidth = Math.max(4, gap * 0.65);
  const primary = cssVar('--color-primary', '#2563eb');
  const muted = cssVar('--color-text-muted', '#64748b');
  const text = cssVar('--color-text', '#1e293b');

  ctx.fillStyle = text;
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(options.title || '시간대별 학습 분포', padding.left, 16);

  rows.forEach((row, index) => {
    const cx = padding.left + gap * index + gap / 2;
    const barH = (row.count / maxCount) * chartH;
    const barX = cx - barWidth / 2;
    const barY = padding.top + chartH - barH;

    ctx.fillStyle = primary;
    ctx.globalAlpha = row.count > 0 ? 0.85 : 0.15;
    ctx.fillRect(barX, barY, barWidth, barH);
    ctx.globalAlpha = 1;

    if (index % 3 === 0) {
      ctx.fillStyle = muted;
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(row.hour), cx, height - padding.bottom + 14);
    }
  });
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

function formatHourLabel(hour) {
  if (hour === null || hour === undefined) return '—';
  return `${String(hour).padStart(2, '0')}:00 ~ ${String(hour).padStart(2, '0')}:59`;
}

function renderSummary(summary) {
  const el = document.getElementById('timeline-summary');
  if (!el) return;

  el.innerHTML = `
    <div class="summary-item">
      <span class="summary-item__value">${summary.totalStudyFormatted}</span>
      <span class="summary-item__label">14일 학습 시간</span>
    </div>
    <div class="summary-item">
      <span class="summary-item__value">${summary.totalAnswered}</span>
      <span class="summary-item__label">풀이 문항</span>
    </div>
    <div class="summary-item">
      <span class="summary-item__value summary-item__value--success">${summary.avgAccuracy}%</span>
      <span class="summary-item__label">평균 정답률</span>
    </div>
    <div class="summary-item">
      <span class="summary-item__value summary-item__value--tutor">${summary.tutorUsageRatio}%</span>
      <span class="summary-item__label">AI Tutor 활용</span>
    </div>
  `;
}

function renderHabitCards(habits) {
  const peakEl = document.getElementById('habit-peak-hour');
  const patternEl = document.getElementById('habit-top-pattern');
  const weakEl = document.getElementById('habit-weak-changes');

  if (peakEl) {
    peakEl.innerHTML = habits.peakHour !== null
      ? `<strong>${formatHourLabel(habits.peakHour)}</strong>
         <p class="habit-meta">활동 ${habits.peakHourCount}회 · question_start/answer 기준</p>`
      : '<p class="habit-meta">아직 시간대 데이터가 없습니다.</p>';
  }

  if (patternEl) {
    patternEl.innerHTML = habits.topPattern
      ? `<strong>${escapeHtml(habits.topPattern.name)}</strong>
         <p class="habit-meta">학습 ${habits.topPattern.count}회</p>
         <a href="${buildPatternUrl(habits.topPattern.patternId)}" class="button button--ghost button--sm">Pattern 보기</a>`
      : '<p class="habit-meta">Pattern 학습 기록이 없습니다.</p>';
  }

  if (weakEl) {
    if (!habits.weakPatternChanges.length) {
      weakEl.innerHTML = '<li><p class="habit-meta">최근 14일 취약 Pattern 변화가 없습니다.</p></li>';
      return;
    }

    weakEl.innerHTML = habits.weakPatternChanges
      .map(
        (item) => `
      <li class="weak-change-card">
        <div class="weak-change-body">
          <h4>${escapeHtml(item.name)}</h4>
          <p class="habit-meta">
            ${item.earlyAccuracy}% → ${item.lateAccuracy}%
            <span class="weak-change-delta">${item.change}%</span>
          </p>
        </div>
        <a href="${buildPatternUrl(item.patternId)}" class="button button--danger button--sm">복습</a>
      </li>
    `,
      )
      .join('');
  }
}

function mountTimelineCharts(report) {
  chartDisconnectors.forEach((fn) => fn());
  chartDisconnectors = [];

  const dailyCanvas = document.getElementById('daily-timeline-chart');
  const accuracyCanvas = document.getElementById('accuracy-growth-chart');
  const tutorCanvas = document.getElementById('tutor-usage-chart');
  const hourlyCanvas = document.getElementById('hourly-habit-chart');

  if (dailyCanvas) {
    const render = () =>
      renderDailyTimelineChart(dailyCanvas, report.dailyTimeline, {
        title: 'Daily Study Timeline — 최근 14일',
        emptyLabel: '최근 14일 학습 이벤트가 없습니다.',
      });
    chartDisconnectors.push(observeChartResize(dailyCanvas, render));
  }

  if (accuracyCanvas) {
    const render = () =>
      renderAccuracyGrowthChart(accuracyCanvas, report.accuracyTrend, {
        title: 'Accuracy Growth — 정답률 · 3일 이동 평균',
        emptyLabel: '정답률 데이터가 없습니다. 문제를 풀어 보세요.',
      });
    chartDisconnectors.push(observeChartResize(accuracyCanvas, render));
  }

  if (tutorCanvas) {
    const render = () =>
      renderTutorUsageChart(tutorCanvas, report.tutorAnalytics, {
        title: 'Tutor Usage — 일별 AI Tutor 조회',
        emptyLabel: 'AI Tutor 사용 기록이 없습니다.',
      });
    chartDisconnectors.push(observeChartResize(tutorCanvas, render));
  }

  if (hourlyCanvas) {
    const render = () =>
      renderHourlyHabitChart(hourlyCanvas, report.habits.hourDistribution, {
        title: 'Learning Habit — 시간대별 활동',
        emptyLabel: '시간대별 학습 데이터가 없습니다.',
      });
    chartDisconnectors.push(observeChartResize(hourlyCanvas, render));
  }
}

function renderTimelinePage(report) {
  renderSummary(report.summary);

  const meta = document.getElementById('timeline-meta');
  if (meta) {
    meta.textContent =
      `${report.date} 기준 · 최근 ${report.maxDays}일 · 이벤트 ${report.eventCount}건 · 활동 ${report.summary.daysActive}일`;
  }

  renderHabitCards(report.habits);
  mountTimelineCharts(report);
}

/**
 * Timeline Dashboard 페이지 초기화
 */
export async function initTimelinePage() {
  applyTheme();

  const loadingEl = document.getElementById('loading-state');
  const errorEl = document.getElementById('error-state');
  const sectionEl = document.getElementById('timeline-section');
  const emptyEl = document.getElementById('empty-state');

  try {
    const { loadPhase1Database } = await import('./data-loader.js');
    const db = await loadPhase1Database();

    if (!db.valid) {
      throw new Error(`Database 검증 실패: ${db.errors.join(', ')}`);
    }

    const report = buildTimelineReport(db.patterns, db.questions);

    if (loadingEl) loadingEl.hidden = true;

    const hasEvents = report.eventCount > 0
      && (report.summary.totalAnswered > 0 || report.summary.totalStudyMinutes > 0);

    if (!hasEvents) {
      if (emptyEl) emptyEl.hidden = false;
      return;
    }

    if (sectionEl) sectionEl.hidden = false;
    renderTimelinePage(report);
  } catch (error) {
    if (loadingEl) loadingEl.hidden = true;
    if (errorEl) {
      errorEl.hidden = false;
      const msg = document.getElementById('error-message');
      if (msg) msg.textContent = error.message || 'Timeline 데이터를 불러올 수 없습니다.';
    }
    console.error('[Timeline]', error);
  }
}
