/**
 * Sprint-14B — Progress bar / circular progress markup
 */
import { clamp, escapeHtml } from '../../dashboard/dashboard-utils.js';
import { animateProgress } from '../../dashboard/dashboard-animation.js';

export function renderBar(label, value, options = {}) {
  const pct = clamp(value, 0, 100);
  return `
    <div class="ld-progress-block">
      <p class="ld-progress-label">${escapeHtml(label)} · <strong>${pct}%</strong></p>
      <div class="ld-progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100"
           aria-valuenow="${pct}" aria-label="${escapeHtml(label)}">
        <span class="ld-progress-fill" style="width:0%"></span>
      </div>
      ${options.caption ? `<p class="ld-card-desc">${escapeHtml(options.caption)}</p>` : ''}
    </div>
  `;
}

export function mountAnimatedBars(root) {
  if (!root) return;
  root.querySelectorAll('.ld-progress-bar').forEach((bar) => {
    const target = Number(bar.getAttribute('aria-valuenow')) || 0;
    animateProgress(bar, target);
  });
}

export function renderTodayStudyCards(today) {
  const t = today || {};
  return `
    <div class="ld-metric-grid" role="list">
      <div class="ld-metric" role="listitem"><span class="ld-metric__label">Review</span><strong class="ld-metric__value">${Number(t.reviewCount) || 0}문항</strong></div>
      <div class="ld-metric" role="listitem"><span class="ld-metric__label">Recommendation</span><strong class="ld-metric__value">${Number(t.recommendationCount) || 0}문항</strong></div>
      <div class="ld-metric" role="listitem"><span class="ld-metric__label">Exam</span><strong class="ld-metric__value">${Number(t.examCount) || 0}문항</strong></div>
      <div class="ld-metric" role="listitem"><span class="ld-metric__label">Goal</span><strong class="ld-metric__value">${Number(t.goalDone) || 0} / ${Number(t.goalTarget) || 30}</strong></div>
    </div>
    ${renderBar('오늘 달성률', t.progressPct || 0)}
  `;
}

export default { renderBar, mountAnimatedBars, renderTodayStudyCards };
