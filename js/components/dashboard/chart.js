/**
 * Sprint-14B — Chart widgets (growth line + weekly radar)
 */
import { escapeHtml } from '../../dashboard/dashboard-utils.js';
import { drawLineChart, drawRadarChart } from '../../dashboard/dashboard-chart.js';
import { setGrowthMetric } from '../../dashboard/dashboard-filter.js';

export function renderRecentGrowth(el, view) {
  if (!el) return;
  const metric = view.growthMetric || 'accuracy';
  el.innerHTML = `
    <div class="ld-chart-toolbar" role="toolbar" aria-label="성장 지표 선택">
      <button type="button" class="button button--ghost ld-btn" data-metric="accuracy" aria-pressed="${metric === 'accuracy'}">Accuracy</button>
      <button type="button" class="button button--ghost ld-btn" data-metric="mastery" aria-pressed="${metric === 'mastery'}">Mastery</button>
      <button type="button" class="button button--ghost ld-btn" data-metric="studyTime" aria-pressed="${metric === 'studyTime'}">Study Time</button>
    </div>
    <canvas id="growth-line-chart" width="640" height="180" aria-label="Recent Growth Line Chart"></canvas>
  `;
  drawLineChart(el.querySelector('#growth-line-chart'), view.growthSeries || []);

  el.querySelectorAll('[data-metric]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = setGrowthMetric(btn.dataset.metric);
      const series = (view.learningEngine?.progress?.daily || [])
        .slice(-30)
        .map((d) => {
          let value = 0;
          if (next.growthMetric === 'studyTime') value = (Number(d.attempts) || 0) * 3;
          else {
            value = d.attempts
              ? Math.round(((Number(d.correct) || 0) / d.attempts) * 100)
              : 0;
          }
          return { date: d.date, value };
        });
      drawLineChart(el.querySelector('#growth-line-chart'), series);
      el.querySelectorAll('[data-metric]').forEach((b) => {
        b.setAttribute('aria-pressed', String(b.dataset.metric === next.growthMetric));
      });
    });
  });
}

export function renderWeeklyStats(el, weekly) {
  if (!el) return;
  const w = weekly || { attempts: 0, minutes: 0, accuracy: 0, radarLabels: [], radarValues: [] };
  el.innerHTML = `
    <dl class="ld-dl">
      <div><dt>이번 주 문항</dt><dd>${escapeHtml(w.attempts)}</dd></div>
      <div><dt>학습 시간</dt><dd>${escapeHtml(w.minutes)}분</dd></div>
      <div><dt>정답률</dt><dd>${escapeHtml(w.accuracy)}%</dd></div>
    </dl>
    <canvas id="weekly-radar-chart" width="420" height="220" aria-label="Weekly Pattern Radar"></canvas>
  `;
  drawRadarChart(
    el.querySelector('#weekly-radar-chart'),
    w.radarLabels?.length ? w.radarLabels : ['P1', 'P2', 'P3'],
    w.radarValues?.length ? w.radarValues : [0, 0, 0],
  );
}

export default { renderRecentGrowth, renderWeeklyStats };
